import { describe, expect, it } from 'vitest'
import { extractBulletRequirements, hasSubmissionConfirmation, parseJsonLdScripts, parseSalaryValue } from './extractorUtils'

describe('extension extractor utilities', () => {
  it('finds JobPosting JSON-LD in a graph and parses salary', () => {
    const job = parseJsonLdScripts([JSON.stringify({ '@graph': [{ '@type': 'JobPosting', title: 'Engineer', baseSalary: { value: { minValue: 100, maxValue: 120 } } }] })])
    expect(job?.title).toBe('Engineer')
    expect(parseSalaryValue(job)).toEqual({ salaryMin: 100, salaryMax: 120 })
  })

  it('combines bullet requirements and skills without duplicates', () => {
    expect(extractBulletRequirements('- TypeScript\n- React', ['React', 'SQL'])).toEqual(['TypeScript', 'React', 'SQL'])
  })

  it('detects confirmation text conservatively', () => {
    expect(hasSubmissionConfirmation('Thank you for applying. Your application has been received.')).toBe(true)
    expect(hasSubmissionConfirmation('Apply now to continue.')).toBe(false)
  })
})
