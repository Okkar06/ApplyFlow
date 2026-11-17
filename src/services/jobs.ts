import { supabase } from '../lib/supabase'
import type { JobInput } from '../schemas/jobInput'
import { canonicalizeUrl } from '../utils/url'
import type { Job } from '../types/job'

type JobRow = {
  id: string
  company: string
  title: string
  location: string
  work_mode: Job['workMode']
  salary_min: number | null
  salary_max: number | null
  currency: string
  salary_period: Job['salaryPeriod']
  status: Job['status']
  applied_date: string | null
  deadline: string | null
  source_url: string | null
  canonical_url: string | null
  source: Job['source']
  import_status: Job['importStatus']
  needs_review: boolean
  import_error: string | null
  job_description: string | null
  requirements: string[]
  resume_version_id: string | null
  raw_extraction: unknown
  field_provenance: Job['fieldProvenance'] | null
  priority: Job['priority']
  relevance_manual: number | null
  notes: string | null
  tags: string[]
}

const toJob = (row: JobRow): Job => ({
  id: row.id,
  company: row.company,
  title: row.title,
  location: row.location,
  workMode: row.work_mode,
  salaryMin: row.salary_min ?? undefined,
  salaryMax: row.salary_max ?? undefined,
  currency: row.currency,
  salaryPeriod: row.salary_period,
  status: row.status,
  appliedDate: row.applied_date ?? undefined,
  deadline: row.deadline ?? undefined,
  sourceUrl: row.source_url ?? undefined,
  canonicalUrl: row.canonical_url ?? undefined,
  source: row.source,
  importStatus: row.import_status,
  needsReview: row.needs_review,
  importError: row.import_error ?? undefined,
  jobDescription: row.job_description ?? undefined,
  requirements: row.requirements,
  resumeVersionId: row.resume_version_id ?? undefined,
  rawExtraction: row.raw_extraction,
  fieldProvenance: row.field_provenance ?? undefined,
  priority: row.priority,
  relevanceManual: row.relevance_manual ?? undefined,
  notes: row.notes ?? undefined,
  skills: row.tags,
})

const toRow = (input: JobInput) => ({
  company: input.company,
  title: input.title,
  location: input.location,
  work_mode: input.workMode,
  salary_min: input.salaryMin ?? null,
  salary_max: input.salaryMax ?? null,
  currency: input.currency,
  salary_period: input.salaryPeriod,
  status: input.status,
  applied_date: input.appliedDate ?? null,
  deadline: input.deadline ?? null,
  source_url: input.sourceUrl ?? null,
  canonical_url: input.canonicalUrl ?? canonicalizeUrl(input.sourceUrl) ?? null,
  source: input.source,
  import_status: input.importStatus,
  needs_review: input.needsReview,
  import_error: input.importError ?? null,
  job_description: input.jobDescription ?? null,
  requirements: input.requirements,
  resume_version_id: input.resumeVersionId ?? null,
  raw_extraction: input.rawExtraction ?? null,
  field_provenance: input.fieldProvenance ?? null,
  priority: input.priority,
  relevance_manual: input.relevanceManual ?? null,
  notes: input.notes ?? null,
  tags: input.skills,
})

export const listJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase.from('jobs').select('*').is('deleted_at', null).order('updated_at', { ascending: false })
  if (error) throw new Error(`Unable to load jobs: ${error.message}`)
  return (data as JobRow[]).map(toJob)
}

export const createJob = async (input: JobInput): Promise<Job> => {
  let duplicateQuery = supabase
    .from('jobs')
    .select('id')
    .is('deleted_at', null)
    .ilike('company', input.company)
    .ilike('title', input.title)
    .limit(1)
  if (input.appliedDate) duplicateQuery = duplicateQuery.eq('applied_date', input.appliedDate)
  const duplicate = await duplicateQuery
  if (duplicate.error) throw new Error(`Unable to check for duplicate jobs: ${duplicate.error.message}`)
  if (duplicate.data.length > 0) throw new Error('A job with this company and title has already been saved.')

  const { data, error } = await supabase.from('jobs').insert(toRow(input)).select('*').single()
  if (error) {
    if (error.code === '23505') throw new Error('This job has already been saved.')
    throw new Error(`Unable to save job: ${error.message}`)
  }

  return toJob(data as JobRow)
}

export const updateJob = async (id: string, input: JobInput): Promise<Job> => {
  const { data, error } = await supabase.from('jobs').update(toRow(input)).eq('id', id).select('*').single()
  if (error) throw new Error(`Unable to update job: ${error.message}`)
  return toJob(data as JobRow)
}

export const updateJobReviewState = async (id: string, needsReview: boolean): Promise<Job> => {
  const { data, error } = await supabase
    .from('jobs')
    .update({ needs_review: needsReview, import_status: needsReview ? 'needs_review' : 'done' })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(`Unable to update review state: ${error.message}`)
  return toJob(data as JobRow)
}

export const markJobFollowedUp = async (job: Job): Promise<void> => {
  const followUpNote = `Followed up on ${new Date().toISOString().slice(0, 10)}`
  const notes = [job.notes?.trim(), followUpNote].filter(Boolean).join('\n')
  const { error } = await supabase.from('jobs').update({ notes }).eq('id', job.id)
  if (error) throw new Error(`Unable to mark job as followed up: ${error.message}`)
}
