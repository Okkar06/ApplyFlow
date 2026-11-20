// Pure helpers for ingest-email (no Deno globals, unit-tested with Vitest).

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'ghosted'
export type EmailStatus = 'applied' | 'interview' | 'offer' | 'rejected' | null

// Postmark sends attachments base64-encoded inside the JSON; we ignore them, but
// the request still has to fit. Bigger emails are refused (403, no retries).
export const MAX_REQUEST_BYTES = 5_000_000

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export const stripHtml = (value: string) =>
  value
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** Token from the payload, or from a plus-address like jobs+TOKEN@example.com */
export const extractToken = (body: { token?: unknown; recipient?: unknown }) => {
  const direct = text(body.token, 256)
  if (direct) return direct
  const recipient = text(body.recipient, 320).toLowerCase()
  return recipient.match(/^[^+@\s]+\+([a-z0-9_-]{16,128})@/)?.[1] ?? ''
}

/** Postmark inbound webhook -> our generic payload. Other shapes pass through. */
export const fromProviderPayload = (body: Record<string, unknown>): Record<string, unknown> => {
  const isPostmark = typeof body.MessageID === 'string' && ('FromFull' in body || 'From' in body)
  if (!isPostmark) return body
  const fromFull = (body.FromFull ?? {}) as { Email?: unknown }
  const toFull = Array.isArray(body.ToFull) ? (body.ToFull as Array<{ Email?: unknown; MailboxHash?: unknown }>) : []
  return {
    token: text(body.MailboxHash, 256) || text(toFull.find((item) => text(item.MailboxHash, 256))?.MailboxHash, 256),
    recipient: text(body.OriginalRecipient, 320) || text(toFull[0]?.Email, 320) || text(body.To, 320),
    messageId: text(body.MessageID, 512),
    sender: text(fromFull.Email, 320) || text(body.From, 320),
    subject: text(body.Subject, 500),
    bodyText: text(body.TextBody, 50_000),
    bodyHtml: text(body.HtmlBody, 200_000),
    receivedAt: body.Date,
  }
}

/** When the user forwards an email, recover the original sender from the quoted header. */
export const originalSender = (bodyText: string) => {
  const forwarded = bodyText.match(/(?:-{2,}\s*Forwarded message\s*-{2,}|Begin forwarded message:|-{2,}\s*Original Message\s*-{2,})([\s\S]{0,2000})/i)?.[1]
  if (!forwarded) return ''
  const from = forwarded.match(/^\s*\*?From:?\*?\s*:?\s*(.+)$/im)?.[1] ?? ''
  return from.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? ''
}

export const stripForwardPrefix = (subject: string) => subject.replace(/^(?:\s*(?:fwd?|fw)\s*:\s*)+/i, '').trim()

export const normalizePayload = (raw: Record<string, unknown>) => {
  const body = fromProviderPayload(raw)
  const html = text(body.bodyHtml, 200_000)
  const plain = (text(body.bodyText, 50_000) || stripHtml(html)).slice(0, 50_000)
  const forwardedBy = text(body.sender, 320)
  return {
    token: extractToken(body),
    messageId: text(body.messageId, 512),
    sender: originalSender(plain) || forwardedBy,
    forwardedBy,
    subject: stripForwardPrefix(text(body.subject, 500)) || text(body.subject, 500),
    bodyText: plain,
    receivedAt: typeof body.receivedAt === 'string' && !Number.isNaN(Date.parse(body.receivedAt)) ? new Date(body.receivedAt).toISOString() : null,
  }
}

/**
 * The provider proves it is the caller with the shared secret, either as an
 * x-ingest-secret header or as the password of HTTP Basic auth
 * (https://user:SECRET@.../ingest-email), which is what Postmark supports.
 */
export const webhookAuthorized = (headers: { get(name: string): string | null }, secret: string) => {
  if (secret.length < 32) return false
  const header = headers.get('x-ingest-secret')
  if (header) return safeEqual(header, secret)
  const auth = headers.get('authorization') ?? ''
  if (!/^basic /i.test(auth)) return false
  try {
    const decoded = atob(auth.slice(6).trim())
    const password = decoded.slice(decoded.indexOf(':') + 1)
    return decoded.includes(':') && safeEqual(password, secret)
  } catch {
    return false
  }
}

export const parseEmail = (sender: string, subject: string, body: string) => {
  const value = `${subject}\n${body}`
  const role = value.match(/(?:role|position|job title)\s*[-:]\s*([^\n]+)/i)?.[1] || value.match(/(?:application received|thank you for applying|applied for|application for)\s*[-:]?\s*["“]?([^"\n“”]+?)(?:["”]?\s+(?:at|with)\s+([A-Z][^\n,.]+))?(?:[.\n]|$)/i)?.[1] || ''
  const company = value.match(/(?:company|employer)\s*[-:]\s*([^\n]+)/i)?.[1] || sender.match(/@([a-z0-9.-]+)/i)?.[1]?.split('.')[0] || ''
  const sourceUrl = value.match(/https?:\/\/[^\s<>"')]+/i)?.[0] || null
  let status: EmailStatus = null
  if (/not moving forward|unfortunately|unsuccessful|regret to inform|other candidates/i.test(value)) status = 'rejected'
  else if (/\boffer\b|congratulations/i.test(value)) status = 'offer'
  else if (/interview|next steps|phone screen|schedule a (call|chat)/i.test(value)) status = 'interview'
  else if (/application (received|submitted)|thank you for applying|thanks for applying/i.test(value)) status = 'applied'
  return { title: role.trim().slice(0, 120), company: company.trim().slice(0, 120), sourceUrl, status }
}

const RANK: Record<JobStatus, number> = { saved: 0, applied: 1, ghosted: 1, interview: 2, offer: 3, rejected: 4 }

/**
 * Only move a job forward. Never auto-change a rejected job, never move an
 * offer back to interview, and ignore emails with no clear status.
 */
export const nextJobStatus = (current: JobStatus, fromEmail: EmailStatus): JobStatus | null => {
  if (!fromEmail || current === 'rejected') return null
  if (fromEmail === 'rejected') return 'rejected'
  return RANK[fromEmail] > RANK[current] ? fromEmail : null
}

/** Constant-time string comparison for the webhook secret. */
export const safeEqual = (a: string, b: string) => {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  return diff === 0
}

export const sha256Hex = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, '0')).join('')
}
