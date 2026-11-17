import { describe, expect, it } from 'vitest'
import { parsePastedJobText } from '../utils/jobImport'

describe('pasted job import', () => {
  it('prefills safe fields and marks the result for review', () => {
    const result = parsePastedJobText('Frontend Developer\nCompany: Acme\n- React\n- TypeScript', 'https://example.com/jobs/1')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.title).toBe('Frontend Developer')
    expect(result.data.company).toBe('Acme')
    expect(result.data.skills).toEqual(['react', 'typescript'])
    expect(result.data.importStatus).toBe('needs_review')
  })

  it('rejects empty pasted text instead of creating a partial success', () => {
    expect(parsePastedJobText('')).toMatchObject({ success: false })
  })
})
