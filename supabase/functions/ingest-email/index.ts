import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MAX_REQUEST_BYTES, nextJobStatus, normalizePayload, parseEmail, sha256Hex, webhookAuthorized, type JobStatus } from './logic.ts'

// Receives forwarded emails from an inbound provider (Postmark format, or the
// generic JSON format in README.md). Two secrets protect it:
//   INGEST_WEBHOOK_SECRET   -> x-ingest-secret header or Basic-auth password (proves the caller is your provider)
//   token / plus-address    -> a per-user token, stored only as a SHA-256 hash
// No mailbox access is ever granted.
// Permanent failures return 403, which tells Postmark to stop retrying.

const headers = { 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)

  const webhookSecret = Deno.env.get('INGEST_WEBHOOK_SECRET') ?? ''
  if (webhookSecret.length < 32) return json({ error: 'Email ingest is not configured.' }, 503)
  if (!webhookAuthorized(request.headers, webhookSecret)) return json({ error: 'Unauthorized.' }, 403)

  try {
    const raw = await request.text()
    if (raw.length > MAX_REQUEST_BYTES) return json({ error: 'Payload too large.' }, 403)
    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ error: 'Invalid JSON.' }, 403)
    }
    const email = normalizePayload(body)
    if (!email.token || !email.messageId || !email.sender || !email.subject || !email.bodyText) {
      return json({ error: 'token (or plus-address recipient), messageId, sender, subject and bodyText/bodyHtml are required.' }, 403)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const tokenRow = await admin.from('email_capture_tokens').select('id, user_id').eq('token_hash', await sha256Hex(email.token)).eq('active', true).maybeSingle()
    if (tokenRow.error) throw tokenRow.error
    if (!tokenRow.data) return json({ error: 'Invalid ingest token.' }, 403)
    const userId = tokenRow.data.user_id
    await admin.from('email_capture_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenRow.data.id)

    // Providers retry webhooks: a message we already stored is a no-op.
    const existing = await admin.from('email_captures').select('id, status, matched_job_id').eq('user_id', userId).eq('message_id', email.messageId).maybeSingle()
    if (existing.data) return json({ id: existing.data.id, matchedJobId: existing.data.matched_job_id, status: existing.data.status, duplicate: true })

    const parsed = parseEmail(email.sender, email.subject, email.bodyText)
    const byUrl = parsed.sourceUrl
      ? await admin.from('jobs').select('id, status').eq('user_id', userId).eq('canonical_url', parsed.sourceUrl).is('deleted_at', null).maybeSingle()
      : { data: null }
    const byTitle = !byUrl.data && parsed.title && parsed.company
      ? await admin.from('jobs').select('id, status').eq('user_id', userId).ilike('title', parsed.title).ilike('company', parsed.company).is('deleted_at', null).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null }
    const match = byUrl.data ?? byTitle.data ?? null

    const capture = await admin.from('email_captures').insert({
      user_id: userId,
      message_id: email.messageId,
      sender: email.sender,
      subject: email.subject,
      received_at: email.receivedAt,
      body_text: email.bodyText,
      status: match ? 'matched' : 'needs_review',
      matched_job_id: match?.id ?? null,
      parsed,
    }).select('id').single()
    if (capture.error) {
      if (capture.error.code === '23505') return json({ duplicate: true })
      throw capture.error
    }

    let statusChange: JobStatus | null = null
    if (match) {
      statusChange = nextJobStatus(match.status as JobStatus, parsed.status)
      // the jobs_status_timeline trigger records the status change event
      if (statusChange) await admin.from('jobs').update({ status: statusChange }).eq('id', match.id).eq('user_id', userId)
      await admin.from('job_events').insert({ job_id: match.id, user_id: userId, event_type: 'email_received', payload: { subject: email.subject, sender: email.sender, captureId: capture.data.id } })
    }
    return json({ id: capture.data.id, matchedJobId: match?.id ?? null, status: match ? 'matched' : 'needs_review', statusChange })
  } catch (error) {
    console.error('ingest-email failed', error)
    return json({ error: 'Unable to ingest email.' }, 500)
  }
})
