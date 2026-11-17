import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const headers = { 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

const parse = (sender: string, subject: string, body: string) => {
  const value = `${subject}\n${body}`
  const role = value.match(/(?:role|position|job title)\s*[-:]\s*([^\n]+)/i)?.[1] || value.match(/(?:application received|thank you for applying|applied for|application for)\s*[-:]?\s*["“]?([^"\n“”]+?)(?:["”]?\s+(?:at|with)\s+([A-Z][^\n,.]+))?(?:[.\n]|$)/i)?.[1] || ''
  const company = value.match(/(?:company|employer)\s*[-:]\s*([^\n]+)/i)?.[1] || sender.match(/@([a-z0-9.-]+)/i)?.[1]?.split('.')[0] || ''
  const sourceUrl = value.match(/https?:\/\/[^\s<>"')]+/i)?.[0] || null
  const status = /interview|next steps|phone screen/i.test(value) ? 'interview' : /offer|congratulations/i.test(value) ? 'offer' : /not moving forward|rejection|unsuccessful|regret to inform/i.test(value) ? 'rejected' : 'applied'
  return { title: role.trim().slice(0, 120), company: company.trim().slice(0, 120), sourceUrl, status }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)
  try {
    const body = await request.json()
    const token = text(body.token, 256)
    const messageId = text(body.messageId, 512)
    const sender = text(body.sender, 320)
    const subject = text(body.subject, 500)
    const bodyText = text(body.bodyText, 50000)
    if (!token || !messageId || !sender || !subject || !bodyText) return json({ error: 'token, messageId, sender, subject, and bodyText are required.' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const tokenResult = await admin.from('email_capture_tokens').select('user_id').eq('token_hash', await hash(token)).eq('active', true).maybeSingle()
    if (tokenResult.error || !tokenResult.data) return json({ error: 'Invalid ingest token.' }, 401)
    const userId = tokenResult.data.user_id
    const parsed = parse(sender, subject, bodyText)
    const urlMatch = parsed.sourceUrl ? await admin.from('jobs').select('id').eq('user_id', userId).eq('canonical_url', parsed.sourceUrl).is('deleted_at', null).maybeSingle() : { data: null, error: null }
    const titleMatch = !urlMatch.data && parsed.title && parsed.company ? await admin.from('jobs').select('id').eq('user_id', userId).ilike('title', parsed.title).ilike('company', parsed.company).is('deleted_at', null).order('updated_at', { ascending: false }).limit(1).maybeSingle() : { data: null, error: null }
    const matchedJobId = urlMatch.data?.id || titleMatch.data?.id || null
    const capture = await admin.from('email_captures').upsert({
      user_id: userId,
      message_id: messageId,
      sender,
      subject,
      received_at: body.receivedAt || null,
      body_text: bodyText,
      status: matchedJobId ? 'matched' : 'needs_review',
      matched_job_id: matchedJobId,
      parsed,
    }, { onConflict: 'user_id,message_id' }).select('id').single()
    if (capture.error) return json({ error: capture.error.message }, 500)
    if (matchedJobId) {
      await admin.from('jobs').update({ status: parsed.status }).eq('id', matchedJobId).eq('user_id', userId)
      await admin.from('job_events').insert({ job_id: matchedJobId, user_id: userId, event_type: 'email_status_update', payload: { to: parsed.status, note: `Status update from ${sender}` } })
    }
    return json({ id: capture.data.id, matchedJobId, status: matchedJobId ? 'matched' : 'needs_review' })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to ingest email.' }, 500)
  }
})
