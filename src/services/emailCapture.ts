import { supabase } from '../lib/supabase'

// Forwarding tokens are generated in the browser and only their SHA-256 hash is
// stored. The plain token is shown to the user once, inside their forwarding
// address (jobs+<token>@domain), and cannot be recovered afterwards.

export type ForwardingToken = { id: string; label: string; active: boolean; createdAt: string; lastUsedAt?: string }
export type EmailCapture = {
  id: string
  sender: string
  subject: string
  receivedAt?: string
  createdAt: string
  status: 'needs_review' | 'matched' | 'ignored'
  matchedJobId?: string
  parsed: { title?: string; company?: string; status?: string | null; sourceUrl?: string | null }
}

/** e.g. "jobs@in.example.com", set per deployment once a provider is configured. */
export const INGEST_ADDRESS = (import.meta.env.VITE_EMAIL_INGEST_ADDRESS ?? '').trim()

export const forwardingAddressFor = (token: string, base = INGEST_ADDRESS) => {
  const match = base.match(/^([^@+\s]+)@([^@\s]+)$/)
  return match ? `${match[1]}+${token}@${match[2]}` : undefined
}

const hex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(16)))
export const hashToken = async (token: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))

export const createForwardingToken = async (label = 'Email forwarding') => {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in again to create a forwarding address.')
  const token = newToken()
  const { error } = await supabase.from('email_capture_tokens').insert({ user_id: auth.user.id, token_hash: await hashToken(token), label: label.trim().slice(0, 60) || 'Email forwarding' })
  if (error) throw new Error(error.message)
  return token
}

export const listForwardingTokens = async (): Promise<ForwardingToken[]> => {
  const { data, error } = await supabase.from('email_capture_tokens').select('id,label,active,created_at,last_used_at').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map((row) => ({ id: row.id, label: row.label, active: row.active, createdAt: row.created_at, lastUsedAt: row.last_used_at ?? undefined }))
}

export const deactivateForwardingToken = async (id: string) => {
  const { error } = await supabase.from('email_capture_tokens').update({ active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export const listEmailCapturesForReview = async (): Promise<EmailCapture[]> => {
  const { data, error } = await supabase
    .from('email_captures')
    .select('id,sender,subject,received_at,created_at,status,matched_job_id,parsed')
    .eq('status', 'needs_review')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data.map((row) => ({
    id: row.id,
    sender: row.sender,
    subject: row.subject,
    receivedAt: row.received_at ?? undefined,
    createdAt: row.created_at,
    status: row.status,
    matchedJobId: row.matched_job_id ?? undefined,
    parsed: (row.parsed ?? {}) as EmailCapture['parsed'],
  }))
}

export const linkEmailCapture = async (id: string, jobId: string) => {
  const { error } = await supabase.from('email_captures').update({ status: 'matched', matched_job_id: jobId }).eq('id', id)
  if (error) throw new Error(error.message)
}

export const ignoreEmailCapture = async (id: string) => {
  const { error } = await supabase.from('email_captures').update({ status: 'ignored' }).eq('id', id)
  if (error) throw new Error(error.message)
}
