// Pure, runtime-agnostic guards for parse-job. No Deno globals here so the
// rules can be unit-tested with Vitest.

export const MAX_HTML_BYTES = 2_000_000
export const MAX_URL_LENGTH = 1024

const BLOCKED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet']

const ipv4Parts = (value: string): number[] | null => {
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN))
  return nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? nums : null
}

export const isPrivateIPv4 = (value: string): boolean => {
  const p = ipv4Parts(value)
  if (!p) return true // not a well-formed IPv4: treat as unsafe
  const [a, b, c] = p
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast, reserved, broadcast
  )
}

const expandIPv6 = (value: string): number[] | null => {
  let v = value.toLowerCase().replace(/^\[|\]$/g, '')
  if (v.includes('%')) return null // zone ids are never public
  // Embedded IPv4 tail, e.g. ::ffff:127.0.0.1
  const v4 = v.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (v4) {
    const p = ipv4Parts(v4[1])
    if (!p) return null
    v = v.slice(0, -v4[1].length) + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16)
  }
  const halves = v.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail]
  const nums = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN))
  return nums.length === 8 && nums.every((n) => !Number.isNaN(n)) ? nums : null
}

export const isPrivateIPv6 = (value: string): boolean => {
  const g = expandIPv6(value)
  if (!g) return true
  if (g.every((n) => n === 0)) return true // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true // ::1
  const embeddedV4 = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) return isPrivateIPv4(embeddedV4) // IPv4-mapped
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((n) => n === 0)) return isPrivateIPv4(embeddedV4) // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true // link-local fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
  return false
}

export const isPrivateAddress = (address: string): boolean => (address.includes(':') ? isPrivateIPv6(address) : isPrivateIPv4(address))

const isIpLiteral = (host: string) => host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string }

/**
 * Static checks on a URL before any DNS lookup. DNS answers must still be
 * checked with isPrivateAddress, and every redirect hop re-checked.
 */
export const checkPublicUrl = (raw: unknown): UrlCheck => {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > MAX_URL_LENGTH) return { ok: false, reason: 'invalid_url' }
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, reason: 'invalid_url' }
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'https_only' }
  if (url.username || url.password) return { ok: false, reason: 'credentials_in_url' }
  if (url.port && url.port !== '443') return { ok: false, reason: 'port_not_allowed' }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (isIpLiteral(host)) {
    return isPrivateAddress(host) ? { ok: false, reason: 'private_address' } : { ok: true, url }
  }
  if (!host.includes('.') || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: 'private_host' }
  }
  return { ok: true, url }
}

/** Reads at most maxBytes from a response body, cancelling the rest. */
export const readCapped = async (body: ReadableStream<Uint8Array> | null, maxBytes = MAX_HTML_BYTES): Promise<string> => {
  if (!body) return ''
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < maxBytes) {
    const { done, value } = await reader.read()
    if (done) break
    const room = maxBytes - total
    chunks.push(value.byteLength > room ? value.slice(0, room) : value)
    total += Math.min(value.byteLength, room)
  }
  await reader.cancel().catch(() => undefined)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

export const corsHeadersFor = (origin: string | null, allowedOrigins: string[]): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type'
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  }
  return headers
}
