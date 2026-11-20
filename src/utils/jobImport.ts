import { JobInput } from '../schemas/jobInput'
import { sanitizeImportedText, sanitizeLine } from './sanitizeText'

const skillPattern = /\b(?:typescript|javascript|react|vue|angular|node\.?js|python|java|sql|aws|docker|kubernetes|figma|tableau|excel)\b/gi

export const parsePastedJobText = (rawText: string, sourceUrl?: string) => {
  const text = sanitizeImportedText(rawText, 50_000)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const title = lines.find((line) => line.length <= 120 && !/[.!?]$/.test(line)) ?? ''
  const companyLine = lines.find((line) => /^company\s*:/i.test(line))
  const company = sanitizeLine(companyLine?.replace(/^company\s*:\s*/i, ''), 120)
  const skills = [...new Set((text.match(skillPattern) ?? []).map((skill) => skill.toLowerCase()))]
  const requirements = [...new Set(lines.filter((line) => /^[-*•]\s+/.test(line)).map((line) => sanitizeLine(line.replace(/^[-*•]\s+/, ''), 120)).filter(Boolean))].slice(0, 30)
  const result = {
    company,
    title,
    jobDescription: text,
    requirements,
    skills,
    sourceUrl: sourceUrl?.trim() || undefined,
    source: 'manual' as const,
    importStatus: 'needs_review' as const,
    fieldProvenance: Object.fromEntries(['company', 'title', 'jobDescription', 'requirements', 'skills'].map((field) => [field, { source: 'paste' as const, confidence: field === 'company' || field === 'title' ? 0.45 : 0.7 }])),
  }
  return JobInput.safeParse(result)
}
