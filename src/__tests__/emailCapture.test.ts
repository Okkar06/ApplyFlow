import { describe, expect, it } from 'vitest'
import { parseForwardedEmail } from '../utils/emailCapture'

describe('parseForwardedEmail', () => {
  it('parses an application confirmation with a role, company, and URL', () => {
    const result = parseForwardedEmail({
      sender: 'careers@example.com',
      subject: 'Application received: Frontend Developer at Example',
      body: 'Thanks for applying. View the role at https://example.com/jobs/123',
    })
    expect(result).toMatchObject({ title: 'Frontend Developer', company: 'Example', status: 'applied', sourceUrl: 'https://example.com/jobs/123' })
  })

  it('maps interview and rejection messages to status updates', () => {
    expect(parseForwardedEmail({ sender: 'jobs@acme.com', subject: 'Interview next steps', body: 'Role: Product Engineer' }).status).toBe('interview')
    expect(parseForwardedEmail({ sender: 'jobs@acme.com', subject: 'Unfortunately, we are not moving forward', body: 'Role: Product Engineer' }).status).toBe('rejected')
  })
})
