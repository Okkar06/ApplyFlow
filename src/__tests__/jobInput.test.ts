import { describe, expect, it } from 'vitest'
import { JobInput } from '../schemas/jobInput'

describe('JobInput schema', () => {
  it('accepts manual input and detects source from URL', () => {
    const result = JobInput.parse({
      company: 'Acme',
      title: 'Frontend Engineer',
      sourceUrl: 'https://www.linkedin.com/jobs/view/123',
      status: 'saved',
      importStatus: 'none',
      priority: 3,
      workMode: 'hybrid',
      currency: 'SGD',
      salaryPeriod: 'yearly',
      skills: ['react'],
    })

    expect(result.source).toBe('linkedin')
  })

  it('rejects invalid schemes', () => {
    expect(() =>
      JobInput.parse({
        company: 'Acme',
        title: 'Frontend Engineer',
        sourceUrl: 'javascript:alert(1)',
        status: 'saved',
        importStatus: 'none',
        priority: 3,
        workMode: 'hybrid',
        currency: 'SGD',
        salaryPeriod: 'yearly',
        skills: [],
      }),
    ).toThrow()
  })
})
