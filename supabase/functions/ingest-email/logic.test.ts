import { describe, expect, it } from 'vitest'
import { extractToken, nextJobStatus, normalizePayload, originalSender, parseEmail, safeEqual, sha256Hex, stripForwardPrefix, webhookAuthorized } from './logic'

const SECRET = 's'.repeat(40)
const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null })

describe('Postmark inbound', () => {
  const postmark = {
    MessageID: '7c1c5bd8-0000-4000-8000-000000000001',
    From: 'me@gmail.com',
    FromFull: { Email: 'me@gmail.com', Name: 'Me' },
    To: 'abc123+0123456789abcdef0123456789abcdef@inbound.postmarkapp.com',
    ToFull: [{ Email: 'abc123+0123456789abcdef0123456789abcdef@inbound.postmarkapp.com', MailboxHash: '0123456789abcdef0123456789abcdef' }],
    OriginalRecipient: 'abc123+0123456789abcdef0123456789abcdef@inbound.postmarkapp.com',
    MailboxHash: '0123456789abcdef0123456789abcdef',
    Subject: 'Fwd: Interview invitation - Data Engineer',
    Date: 'Thu, 20 Nov 2026 10:00:00 +0800',
    TextBody: '---------- Forwarded message ---------\nFrom: Acme Talent <talent@acme.com>\nDate: Wed, 19 Nov 2026\nSubject: Interview invitation\n\nRole: Data Engineer\nWe would like to schedule an interview.',
    HtmlBody: '<p>ignored when text exists</p>',
    Attachments: [],
  }

  it('maps the payload, token and original sender', () => {
    const email = normalizePayload(postmark)
    expect(email.token).toBe('0123456789abcdef0123456789abcdef')
    expect(email.messageId).toBe(postmark.MessageID)
    expect(email.sender).toBe('talent@acme.com')
    expect(email.forwardedBy).toBe('me@gmail.com')
    expect(email.subject).toBe('Interview invitation - Data Engineer')
    expect(email.receivedAt).toBe('2026-11-20T02:00:00.000Z')
    const parsed = parseEmail(email.sender, email.subject, email.bodyText)
    expect(parsed).toMatchObject({ title: 'Data Engineer', company: 'acme', status: 'interview' })
  })

  it('falls back to the plus-address when MailboxHash is empty', () => {
    expect(normalizePayload({ ...postmark, MailboxHash: '', ToFull: [] }).token).toBe('0123456789abcdef0123456789abcdef')
  })

  it('keeps the direct sender when the email was not forwarded', () => {
    expect(normalizePayload({ ...postmark, TextBody: 'Thank you for applying', From: 'jobs@acme.com', FromFull: { Email: 'jobs@acme.com' } }).sender).toBe('jobs@acme.com')
  })
})

describe('forwarded emails', () => {
  it('reads Gmail, Apple Mail and Outlook forward headers', () => {
    expect(originalSender('---------- Forwarded message ---------\nFrom: Acme <hr@acme.com>\n')).toBe('hr@acme.com')
    expect(originalSender('Begin forwarded message:\n\nFrom: "Globex" <talent@globex.io>\n')).toBe('talent@globex.io')
    expect(originalSender('-----Original Message-----\nFrom: recruiter@initech.co.uk\n')).toBe('recruiter@initech.co.uk')
    expect(originalSender('no forward here, From: x@y.com')).toBe('')
  })

  it('strips Fwd/FW prefixes', () => {
    expect(stripForwardPrefix('Fwd: FW: Offer letter')).toBe('Offer letter')
  })
})

describe('webhookAuthorized', () => {
  it('accepts the secret as a header or as a Basic-auth password', () => {
    expect(webhookAuthorized(headers({ 'x-ingest-secret': SECRET }), SECRET)).toBe(true)
    expect(webhookAuthorized(headers({ authorization: `Basic ${btoa(`postmark:${SECRET}`)}` }), SECRET)).toBe(true)
  })

  it('rejects wrong, missing or malformed credentials and weak secrets', () => {
    expect(webhookAuthorized(headers({ 'x-ingest-secret': 'nope' }), SECRET)).toBe(false)
    expect(webhookAuthorized(headers({ authorization: `Basic ${btoa('postmark:nope')}` }), SECRET)).toBe(false)
    expect(webhookAuthorized(headers({ authorization: 'Basic !!!' }), SECRET)).toBe(false)
    expect(webhookAuthorized(headers({ authorization: `Bearer ${SECRET}` }), SECRET)).toBe(false)
    expect(webhookAuthorized(headers({}), SECRET)).toBe(false)
    expect(webhookAuthorized(headers({ 'x-ingest-secret': 'short' }), 'short')).toBe(false)
  })
})

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
