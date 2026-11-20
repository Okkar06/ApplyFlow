export type JsonLdJob = Record<string, unknown>

export const parseJsonLdScripts = (scripts: string[]): JsonLdJob | undefined => {
  for (const source of scripts) {
    try {
      const parsed: unknown = JSON.parse(source)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      const graph = candidates.flatMap((item) => item && typeof item === 'object' && '@graph' in item && Array.isArray(item['@graph']) ? item['@graph'] : [])
      const job = [...candidates, ...graph].find((item) => item && typeof item === 'object' && '@type' in item && (item['@type'] === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting'))))
      if (job && typeof job === 'object') return job as JsonLdJob
    } catch {
      continue
    }
  }
  return undefined
}

export const parseSalaryValue = (job: JsonLdJob | undefined) => {
  const value = job?.baseSalary
  const amount = value && typeof value === 'object' && 'value' in value ? value.value : undefined
  const min = amount && typeof amount === 'object' && 'minValue' in amount ? Number(amount.minValue) : undefined
  const max = amount && typeof amount === 'object' && 'maxValue' in amount ? Number(amount.maxValue) : undefined
  return {
    salaryMin: Number.isFinite(min) ? min : undefined,
    salaryMax: Number.isFinite(max) ? max : undefined,
  }
}

export const extractBulletRequirements = (description: string, skills: string[]) => {
  const bullets = [...description.matchAll(/(?:^|\n|\r)[\s]*[-*•]\s+(.{3,160})/g)].map((match) => match[1].replace(/\s+/g, ' ').trim().slice(0, 120)).filter(Boolean)
  return [...new Set([...bullets, ...skills])].slice(0, 100)
}

export const hasSubmissionConfirmation = (value: string) => /(?:application|application form).{0,30}(?:submitted|received)|thank you for applying|your application has been received/i.test(value)
