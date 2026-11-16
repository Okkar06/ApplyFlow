export const JOB_STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_SOURCES = ['manual', 'linkedin', 'jobstreet', 'indeed', 'glassdoor', 'greenhouse', 'lever', 'workday', 'mcf', 'company_site', 'other'] as const
export type JobSource = (typeof JOB_SOURCES)[number]

export const IMPORT_STATUSES = ['none', 'pending', 'processing', 'needs_review', 'done', 'failed'] as const
export type ImportStatus = (typeof IMPORT_STATUSES)[number]

export type Job = {
  id: string
  company: string
  title: string
  location: string
  workMode: 'onsite' | 'hybrid' | 'remote'
  salaryMin?: number
  salaryMax?: number
  currency?: string
  salaryPeriod?: 'yearly' | 'monthly'
  status: JobStatus
  appliedDate?: string
  deadline?: string
  source: JobSource
  sourceUrl?: string
  canonicalUrl?: string
  importStatus: ImportStatus
  importError?: string
  jobDescription?: string
  requirements: string[]
  resumeVersionId?: string
  rawExtraction?: unknown
  fieldProvenance?: Record<string, { source: 'manual' | 'ai'; confidence?: number }>
  priority: 1 | 2 | 3 | 4 | 5
  relevanceManual?: number
  notes?: string
  skills: string[]
}

export type ResumeVersion = {
  id: string
  label: string
  filePath: string
  fileName: string
  mimeType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  sizeBytes: number
  isDefault: boolean
  createdAt: string
}
