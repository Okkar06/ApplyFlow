import { describe, expect, it } from 'vitest'
import { checkPublicUrl, corsHeadersFor, isPrivateAddress, readCapped } from './guards'

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1',
    '::1', '::', 'fe80::1', 'fd00::1', 'fc00::abcd', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1',
    '64:ff9b::a9fe:a9fe', '2001:db8::1', 'not-an-ip', '999.1.1.1',
  ])('blocks %s', (address) => expect(isPrivateAddress(address)).toBe(true))

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('allows %s', (address) =>
    expect(isPrivateAddress(address)).toBe(false))
})

describe('checkPublicUrl', () => {
  it('accepts a normal https job URL', () => {
    expect(checkPublicUrl('https://boards.greenhouse.io/acme/jobs/123').ok).toBe(true)
  })

  it.each([
    ['http://example.com/job', 'https_only'],
    ['file:///etc/passwd', 'https_only'],
    ['https://user:pass@example.com/', 'credentials_in_url'],
    ['https://example.com:8443/', 'port_not_allowed'],
    ['https://localhost/', 'private_host'],
    ['https://intranet/', 'private_host'],
    ['https://printer.local/', 'private_host'],
    ['https://metadata.google.internal/', 'private_host'],
    ['https://169.254.169.254/latest/meta-data/', 'private_address'],
    ['https://[::1]/', 'private_address'],
    ['https://10.0.0.5/', 'private_address'],
    ['not a url', 'invalid_url'],
    [42, 'invalid_url'],
    [`https://example.com/${'a'.repeat(1100)}`, 'invalid_url'],
  ])('rejects %s', (url, reason) => {
    const result = checkPublicUrl(url)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe(reason)
  })
})

describe('readCapped', () => {
  it('stops reading at the byte cap', async () => {
    const big = new TextEncoder().encode('x'.repeat(5000))
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(big)
        controller.enqueue(big)
        controller.close()
      },
    })
    expect((await readCapped(stream, 1234)).length).toBe(1234)
  })
})

describe('corsHeadersFor', () => {
  it('only reflects allowed origins', () => {
    expect(corsHeadersFor('https://okkar06.github.io', ['https://okkar06.github.io'])['Access-Control-Allow-Origin']).toBe('https://okkar06.github.io')
    expect(corsHeadersFor('https://evil.example', ['https://okkar06.github.io'])['Access-Control-Allow-Origin']).toBeUndefined()
    expect(corsHeadersFor(null, [])['Access-Control-Allow-Origin']).toBeUndefined()
  })
})
