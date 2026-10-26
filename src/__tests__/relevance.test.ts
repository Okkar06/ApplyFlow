import { describe, expect, it } from 'vitest'
import { calculateRuleScore } from '../utils/relevance'

describe('relevance scoring', () => {
  it('returns score and skill breakdown', () => {
    const result = calculateRuleScore(
      { skills: ['react', 'typescript'], salaryTargetMin: 7000, preferredModes: ['hybrid'], preferredLocations: ['singapore'] },
      { jobSkills: ['react', 'node'], salaryMax: 8000, workMode: 'hybrid', location: 'Singapore' },
    )

    expect(result.score).toBeGreaterThan(0)
    expect(result.matchedSkills).toContain('react')
    expect(result.missingSkills).toContain('node')
  })
})
