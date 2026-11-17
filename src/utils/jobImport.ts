import { JobInput } from '../schemas/jobInput'

const skillPattern = /\b(?:typescript|javascript|react|vue|angular|node\.?js|python|java|sql|aws|docker|kubernetes|figma|tableau|excel)\b/gi

export const parsePastedJobText = (text: string, sourceUrl?: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const title = lines.find((line) => line.length <= 120 && !/[.!?]$/.test(line)) ?? ''
  const companyLine = lines.find((line) => /^company\s*:/i.test(line))
  const company = companyLine?.replace(/^company\s*:\s*/i, '').trim() ?? ''
  const skills = [...new Set((text.match(skillPattern) ?? []).map((skill) => skill.toLowerCase()))]
  const requirements = lines.filter((line) => /^[-*•]\s+/.test(line)).map((line) => line.replace(/^[-*•]\s+/, '')).slice(0, 30)
  const result = {
    company,
    title,
    jobDescription: text.slice(0, 50000),
    requirements,
    skills,
    sourceUrl: sourceUrl?.trim() || undefined,
    source: 'manual' as const,
    importStatus: 'needs_review' as const,
    fieldProvenance: Object.fromEntries(['company', 'title', 'jobDescription', 'requirements', 'skills'].map((field) => [field, { source: 'ai' as const, confidence: field === 'company' || field === 'title' ? 0.45 : 0.7 }])),
  }
  return JobInput.safeParse(result)
}
