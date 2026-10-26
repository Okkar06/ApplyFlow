import { describe, expect, it } from 'vitest'
import { sanitizeCsvCell } from '../utils/csv'

describe('CSV sanitizer', () => {
  it('prefixes dangerous prefixes', () => {
    expect(sanitizeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
    expect(sanitizeCsvCell('+1')).toBe("'+1")
  })
})
