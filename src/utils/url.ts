import type { JobSource } from '../types/job'

const SOURCE_MAP: Record<string, JobSource> = {
  'linkedin.com': 'linkedin',
  'jobstreet.com': 'jobstreet',
  'indeed.com': 'indeed',
  'glassdoor.com': 'glassdoor',
  'greenhouse.io': 'greenhouse',
  'lever.co': 'lever',
  'myworkdayjobs.com': 'workday',
  'mycareersfuture.gov.sg': 'mcf',
}

export const detectSourceFromUrl = (value?: string): JobSource => {
  if (!value) return 'manual'
  try {
    const { hostname } = new URL(value)
    const normalized = hostname.replace(/^www\./, '')
    const match = Object.keys(SOURCE_MAP).find((key) => normalized.endsWith(key))
    return match ? SOURCE_MAP[match] : 'company_site'
  } catch {
    return 'other'
  }
}

export const canonicalizeUrl = (value?: string): string | undefined => {
  if (!value) return undefined
  try {
    const url = new URL(value)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|trk$)/i.test(key)) url.searchParams.delete(key)
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

export const validateExternalUrl = (value?: string): boolean => {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
