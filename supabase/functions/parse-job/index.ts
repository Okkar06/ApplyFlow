import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkPublicUrl, corsHeadersFor, isPrivateAddress, MAX_HTML_BYTES, readCapped } from './guards.ts'

// Server-side job page parser. Disabled unless FEATURE_AI_IMPORT=true is set as
// a function secret. Only signed-in users can call it, only from ALLOWED_ORIGINS.

const FETCH_TIMEOUT_MS = 8000
const MAX_REDIRECTS = 3
const MAX_REQUEST_BYTES = 4096

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean)

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const stripTags = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()

const extractJsonLd = (html: string) => {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1])
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [])]
      const job = candidates.find((candidate) => candidate?.['@type'] === 'JobPosting' || candidate?.['@type']?.includes?.('JobPosting'))
      if (job) return job
    } catch {
      continue
    }
  }
  return undefined
}

/** Every A/AAAA answer must be public; otherwise refuse the host. */
const resolvesPublicly = async (hostname: string) => {
  if (hostname.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true // literal already checked
  const answers: string[] = []
  for (const type of ['A', 'AAAA'] as const) {
    try {
      answers.push(...(await Deno.resolveDns(hostname, type)))
    } catch {
      // no records of this type
    }
  }
  return answers.length > 0 && answers.every((address) => !isPrivateAddress(address))
}

/** Fetches with manual redirects so every hop is re-validated. */
const safeFetch = async (start: URL) => {
  let current = start
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!(await resolvesPublicly(current.hostname))) throw new PublicError('Only public job pages can be imported.', 400)
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'JobTrail/1.0 job parser', Accept: 'text/html,application/xhtml+xml' },
    })
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel()
      const next = checkPublicUrl(new URL(response.headers.get('location') ?? '', current).toString())
      if (!next.ok) throw new PublicError('The job page redirected somewhere that cannot be imported.', 400)
      current = next.url
      continue
    }
    return { response, finalUrl: current }
  }
  throw new PublicError('Too many redirects.', 400)
}

class PublicError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

Deno.serve(async (request) => {
  const cors = corsHeadersFor(request.headers.get('origin'), allowedOrigins)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

  if (Deno.env.get('FEATURE_AI_IMPORT') !== 'true') return json({ error: 'Not found.' }, 404)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)

  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Sign in required.' }, 401)
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Sign in required.' }, 401)

  try {
    const raw = await request.text()
    if (raw.length > MAX_REQUEST_BYTES) return json({ error: 'Request too large.' }, 413)
    let body: { url?: unknown }
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ error: 'Invalid JSON.' }, 400)
    }
    const checked = checkPublicUrl(body.url)
    if (!checked.ok) return json({ error: 'Only public https job page URLs are supported.', reason: checked.reason }, 400)

    const { response, finalUrl } = await safeFetch(checked.url)
    if (!response.ok) {
      await response.body?.cancel()
      return json({ error: `The job page returned ${response.status}.` }, 502)
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      await response.body?.cancel()
      return json({ error: 'The link is not an HTML job page.' }, 415)
    }

    const html = await readCapped(response.body, MAX_HTML_BYTES)
    const job = extractJsonLd(html)
    if (!job) return json({ error: 'No JobPosting structured data found.' }, 422)

    const skills = (Array.isArray(job.skills) ? job.skills.map((value: unknown) => text(value, 40)) : text(job.skills, 2000).split(/[,;|]/).map((value) => value.trim().slice(0, 40))).filter(Boolean).slice(0, 50)
    const result = {
      company: text(job.hiringOrganization?.name, 120),
      title: text(job.title, 120),
      location: text(job.jobLocation?.address?.addressLocality || job.jobLocation?.address?.addressRegion, 120),
      jobDescription: stripTags(text(job.description, 200_000)).slice(0, 50_000),
      sourceUrl: finalUrl.toString(),
      skills,
      importStatus: 'needs_review',
      needsReview: true,
      fieldProvenance: {
        title: { source: 'structured_data', confidence: 0.9 },
        company: { source: 'structured_data', confidence: 0.9 },
        jobDescription: { source: 'structured_data', confidence: 0.8 },
        skills: { source: 'structured_data', confidence: 0.7 },
      },
      rawExtraction: { source: 'json-ld', type: 'JobPosting' },
    }
    // The client must still validate this with the shared JobInput schema before saving.
    return json(result)
  } catch (error) {
    if (error instanceof PublicError) return json({ error: error.message }, error.status)
    if (error instanceof DOMException && error.name === 'TimeoutError') return json({ error: 'The job page took too long to respond.' }, 504)
    console.error('parse-job failed', error)
    return json({ error: 'Unable to parse job page.' }, 500)
  }
})
