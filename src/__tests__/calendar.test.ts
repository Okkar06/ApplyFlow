import { describe, expect, it } from 'vitest'
import { addDays, monthDays, startOfMonday } from '../utils/calendar'
import { getFollowUpSuggestions } from '../utils/followUps'
import type { Job } from '../types/job'

const job = (overrides: Partial<Job>): Job => ({
  id: 'job-1',
  company: 'Acme',
  title: 'Frontend Developer',
  location: 'Remote',
  workMode: 'remote',
  status: 'applied',
  appliedDate: '2026-11-01',
  source: 'manual',
  importStatus: 'none',
  priority: 3,
  requirements: [],
  skills: [],
  ...overrides,
})

describe('calendar utilities', () => {
  it('starts weeks on Monday and returns a six-week month grid', () => {
    const monday = startOfMonday(new Date('2026-11-18T12:00:00'))
    expect(monday.getDay()).toBe(1)
    expect(monthDays(new Date('2026-11-01'))).toHaveLength(42)
  })

  it('creates follow-up suggestions only for unanswered applications older than seven days', () => {
    const suggestions = getFollowUpSuggestions([
      job({ id: 'old', appliedDate: '2026-11-01' }),
      job({ id: 'new', appliedDate: '2026-11-15' }),
      job({ id: 'interview', status: 'interview', appliedDate: '2026-11-01' }),
    ], new Date('2026-11-16T12:00:00'))
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].jobId).toBe('old')
    expect(addDays(new Date('2026-11-16'), 1).getDate()).toBe(17)
  })
})
