import { describe, expect, it } from 'vitest'
import { buildStatistics, normalizeRole } from '../utils/statistics'
import type { Job } from '../types/job'

const job = (overrides: Partial<Job>): Job => ({
  id: crypto.randomUUID(),
  company: 'Acme',
  title: 'Frontend Developer',
  location: 'Remote',
  workMode: 'remote',
  status: 'applied',
  appliedDate: '2026-11-16',
  source: 'manual',
  importStatus: 'none',
  priority: 3,
  requirements: [],
  skills: [],
  ...overrides,
})

describe('statistics aggregation', () => {
  it('normalizes near-duplicate role titles', () => {
    expect(normalizeRole('Senior Frontend Dev')).toBe('frontend developer')
    expect(normalizeRole('Frontend Developer')).toBe('frontend developer')
  })

  it('keeps empty weeks in the selected range', () => {
    const result = buildStatistics([job({})], 4, new Date('2026-11-16T12:00:00'))
    expect(result.weeks).toHaveLength(4)
    expect(result.weeks.map((week) => week.total)).toEqual([0, 0, 0, 1])
  })

  it('groups roles beyond the top six into Other', () => {
    const jobs = Array.from({ length: 7 }, (_, index) => job({ id: String(index), title: `Role ${index}`, appliedDate: '2026-11-16' }))
    const result = buildStatistics(jobs, 4, new Date('2026-11-16T12:00:00'))
    expect(result.roles).toHaveLength(7)
    expect(result.roles.at(-1)?.name).toBe('Other')
  })
})
