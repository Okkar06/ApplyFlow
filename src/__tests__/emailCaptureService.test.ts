import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

const { forwardingAddressFor, hashToken, newToken } = await import('../services/emailCapture')
const { extractToken, sha256Hex } = await import('../../supabase/functions/ingest-email/logic')

describe('forwarding tokens', () => {
  it('are 32 lowercase hex characters and unique', () => {
    const a = newToken()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(newToken()).not.toBe(a)
  })

  it('build a plus-address that the ingest function can read back', () => {
    const token = newToken()
    const address = forwardingAddressFor(token, 'jobs@in.example.com')
    expect(address).toBe(`jobs+${token}@in.example.com`)
    expect(address!.split('@')[0].length).toBeLessThanOrEqual(64)
    expect(extractToken({ recipient: address!.toUpperCase() })).toBe(token)
  })

  it('return undefined when no ingest address is configured', () => {
    expect(forwardingAddressFor('abc', '')).toBeUndefined()
    expect(forwardingAddressFor('abc', 'not-an-email')).toBeUndefined()
  })

  it('hash the same way in the browser and the edge function', async () => {
    const token = newToken()
    expect(await hashToken(token)).toBe(await sha256Hex(token))
  })
})
