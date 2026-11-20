// Decides whether a failed capture save should go to the offline retry queue.
// Only transient failures (network, server, expired session) are retried;
// invalid input, duplicates and permission errors would fail forever.

export const MAX_QUEUE_ITEMS = 50

export class SaveError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly duplicate = false) {
    super(message)
    this.name = 'SaveError'
  }
}

type PostgrestLikeError = { code?: string | null; message?: string | null; status?: number }

export const classifySaveError = (error: PostgrestLikeError): SaveError => {
  const code = error.code ?? ''
  const message = error.message || 'Save failed.'
  if (code === '23505') return new SaveError('This job is already saved.', false, true)
  // Session problems: retry after the user signs in again
  if (code === 'PGRST301' || code === 'PGRST302' || error.status === 401) return new SaveError('Your session expired. Sign in again to save.', true)
  // Other Postgres SQLSTATEs (5 chars) and PostgREST request errors are permanent
  if (/^[0-9A-Z]{5}$/.test(code) || /^PGRST/.test(code)) return new SaveError(message, false)
  if (typeof error.status === 'number' && error.status >= 400 && error.status < 500) return new SaveError(message, false)
  // No code: network failure, timeout or 5xx
  return new SaveError(message, true)
}

export const isRetryable = (error: unknown) => !(error instanceof SaveError) || error.retryable
