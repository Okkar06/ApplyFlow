const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const isAllowedUrl = (value: string) => {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    const host = url.hostname.toLowerCase()
    return !['localhost', '127.0.0.1', '::1'].includes(host) && !host.endsWith('.local')
  } catch {
    return false
  }
}

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await request.json() as { url?: string }
    if (!body.url || !isAllowedUrl(body.url)) return new Response(JSON.stringify({ error: 'Only public http(s) URLs are supported.' }), { status: 400, headers: corsHeaders })
    const response = await fetch(body.url, { headers: { 'User-Agent': 'JobTrail/1.0 job parser' } })
    if (!response.ok) return new Response(JSON.stringify({ error: `Remote page returned ${response.status}.` }), { status: 502, headers: corsHeaders })
    const html = (await response.text()).slice(0, 2_000_000)
    const job = extractJsonLd(html)
    if (!job) return new Response(JSON.stringify({ error: 'No JobPosting structured data found.' }), { status: 422, headers: corsHeaders })
    const skills = Array.isArray(job.skills) ? job.skills.map(text).filter(Boolean) : text(job.skills).split(/[,;|]/).map((value) => value.trim()).filter(Boolean)
    const result = {
      company: text(job.hiringOrganization?.name),
      title: text(job.title),
      location: text(job.jobLocation?.address?.addressLocality || job.jobLocation?.address?.addressRegion),
      jobDescription: text(job.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 50000),
      sourceUrl: body.url,
      skills,
      requirements: skills,
      importStatus: 'needs_review',
      needsReview: true,
      fieldProvenance: { title: { source: 'ai', confidence: 0.9 }, company: { source: 'ai', confidence: 0.9 }, jobDescription: { source: 'ai', confidence: 0.8 }, skills: { source: 'ai', confidence: 0.7 } },
      rawExtraction: { source: 'json-ld', type: 'JobPosting' },
    }
    return new Response(JSON.stringify(result), { headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to parse job page.' }), { status: 500, headers: corsHeaders })
  }
})
