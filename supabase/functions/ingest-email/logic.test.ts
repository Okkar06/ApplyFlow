import { describe, expect, it } from 'vitest'
import { extractToken, nextJobStatus, normalizePayload, parseEmail, safeEqual, sha256Hex } from './logic'

describe('nextJobStatus', () => {
  it('moves forward only', () => {
    expect(nextJobStatus('applied', 'interview')).toBe('interview')
    expect(nextJobStatus('interview', 'offer')).toBe('offer')
    expect(nextJobStatus('offer', 'interview')).toBeNull()
    expect(nextJobStatus('interview', 'applied')).toBeNull()
    expect(nextJobStatus('saved', 'applied')).toBe('applied')
  })

  it('never auto-changes a rejected job and ignores unclear emails', () => {
    expect(nextJobStatus('rejected', 'interview')).toBeNull()
    expect(nextJobStatus('offer', null)).toBeNull()
  })

  it('applies rejections and revives ghosted jobs', () => {
    expect(nextJobStatus('interview', 'rejected')).toBe('rejected')
    expect(nextJobStatus('ghosted', 'interview')).toBe('interview')
  })
})

describe('parseEmail', () => {
  it('detects status from wording', () => {
    expect(parseEmail('jobs@acme.com', 'Interview invitation', 'Next steps').status).toBe('interview')
    expect(parseEmail('jobs@acme.com', 'Your application', 'Unfortunately we are not moving forward').status).toBe('rejected')
    expect(parseEmail('jobs@acme.com', 'Thank you for applying', 'Role: Engineer').status).toBe('applied')
    expect(parseEmail('news@acme.com', 'Our newsletter', 'Hello').status).toBeNull()
  })

  it('extracts role, company and link', () => {
    const parsed = parseEmail('talent@acme.com', 'Application received', 'Role: Data Engineer\nCompany: Acme\nhttps://jobs.acme.com/1')
    expect(parsed).toMatchObject({ title: 'Data Engineer', company: 'Acme', sourceUrl: 'https://jobs.acme.com/1' })
  })
})

describe('payload handling', () => {
  it('reads the token from a plus-address recipient', () => {
    expect(extractToken({ recipient: 'Jobs+AbCdEf0123456789xyz@mail.example.com' })).toBe('abcdef0123456789xyz')
    expect(extractToken({ recipient: 'jobs@mail.example.com' })).toBe('')
    expect(extractToken({ token: 'direct-token', recipient: 'jobs+other1234567890123@x.com' })).toBe('direct-token')
  })

  it('falls back to stripped HTML and validates dates', () => {
    const email = normalizePayload({ messageId: 'm', sender: 's', subject: 'x', bodyHtml: '<p>Hello<script>x()</script></p><p>there</p>', receivedAt: 'nope' })
    expect(email.bodyText).toBe('Hello\nthere')
    expect(email.receivedAt).toBeNull()
  })
})

describe('secrets', () => {
  it('compares in constant time and hashes to hex', async () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
