import { describe, expect, it } from 'vitest'
import { MAX_RAW_IMPORT_CHARS, sanitizeImportedText, sanitizeLine } from '../utils/sanitizeText'
import { parsePastedJobText } from '../utils/jobImport'
import { JobInput } from '../schemas/jobInput'

describe('sanitizeImportedText', () => {
  it('strips tags, scripts, styles and comments, keeping readable structure', () => {
    const html = '<h1>Engineer</h1><script>alert(1)</script><style>p{}</style><!-- hi --><p>Build <b>things</b></p><ul><li>React</li><li>SQL</li></ul>'
    expect(sanitizeImportedText(html)).toBe('Engineer\nBuild things\n\n- React\n- SQL')
  })

  it('removes event-handler markup entirely', () => {
    expect(sanitizeImportedText('<img src=x onerror="alert(1)">Hello')).toBe('Hello')
  })

  it('decodes entities without re-interpreting them as markup', () => {
    expect(sanitizeImportedText('5&nbsp;years &amp; up &lt;b&gt; &#8226; &#x2014;')).toBe('5 years & up <b> • —')
  })

  it('leaves plain text with angle brackets alone', () => {
    expect(sanitizeImportedText('Salary < 100k and > 50k')).toBe('Salary < 100k and > 50k')
  })

  it('drops control and bidi override characters', () => {
    expect(sanitizeImportedText('a\u0000b\u202ec\u0007d')).toBe('abcd')
  })

  it('collapses blank lines and caps length', () => {
    expect(sanitizeImportedText('a\n\n\n\n\nb')).toBe('a\n\nb')
    expect(sanitizeImportedText('x'.repeat(100), 10)).toHaveLength(10)
  })

  it('bounds work on oversized input', () => {
    expect(sanitizeImportedText('y'.repeat(MAX_RAW_IMPORT_CHARS * 2), Infinity)).toHaveLength(MAX_RAW_IMPORT_CHARS)
  })

  it('returns empty string for non-strings', () => {
    expect(sanitizeImportedText(undefined)).toBe('')
    expect(sanitizeLine(42, 10)).toBe('')
  })
})

describe('pasted import edge cases', () => {
  it('cleans pasted HTML before parsing', () => {
    const result = parsePastedJobText('<h2>Data Analyst</h2><p>Company: Acme</p><ul><li>SQL</li></ul>')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.title).toBe('Data Analyst')
    expect(result.data.company).toBe('Acme')
    expect(result.data.jobDescription).not.toMatch(/<[a-z]/i)
    expect(result.data.fieldProvenance?.title.source).toBe('paste')
  })

  it('does not fail when a bullet is longer than 120 characters', () => {
    const result = parsePastedJobText(`Backend Engineer\nCompany: Acme\n- ${'very long requirement '.repeat(20)}`)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.requirements[0].length).toBeLessThanOrEqual(120)
  })

  it('recognises • bullets', () => {
    const result = parsePastedJobText('QA Engineer\nCompany: Acme\n• Playwright experience')
    expect(result.success && result.data.requirements).toEqual(['Playwright experience'])
  })
})

describe('JobInput limits', () => {
  it('rejects unknown provenance sources and oversized arrays', () => {
    const base = { company: 'Acme', title: 'Dev' }
    expect(JobInput.safeParse({ ...base, fieldProvenance: { title: { source: 'robot' } } }).success).toBe(false)
    expect(JobInput.safeParse({ ...base, skills: Array.from({ length: 51 }, (_, i) => `s${i}`) }).success).toBe(false)
    expect(JobInput.safeParse({ ...base, requirements: Array.from({ length: 101 }, (_, i) => `r${i}`) }).success).toBe(false)
  })
})
