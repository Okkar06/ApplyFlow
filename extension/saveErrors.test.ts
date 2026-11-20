import { describe, expect, it } from 'vitest'
import { classifySaveError, isRetryable, SaveError } from './saveErrors'

describe('classifySaveError', () => {
  it('treats duplicates as permanent and flags them', () => {
    const error = classifySaveError({ code: '23505', message: 'dup' })
    expect(error.retryable).toBe(false)
    expect(error.duplicate).toBe(true)
  })

  it.each(['23514', '42501', '22001', 'PGRST204'])('treats %s as permanent', (code) => {
    expect(classifySaveError({ code, message: 'x' }).retryable).toBe(false)
  })

  it('retries expired sessions', () => {
    expect(classifySaveError({ code: 'PGRST301', message: 'JWT expired' }).retryable).toBe(true)
  })

  it('retries network failures with no code', () => {
    expect(classifySaveError({ code: '', message: 'TypeError: Failed to fetch' }).retryable).toBe(true)
    expect(classifySaveError({ message: 'timeout', status: 503 }).retryable).toBe(true)
  })

  it('does not retry validation errors but retries unknown errors', () => {
    expect(isRetryable(new SaveError('title: required', false))).toBe(false)
    expect(isRetryable(new Error('boom'))).toBe(true)
  })
})
