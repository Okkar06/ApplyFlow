import { useEffect, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, BriefcaseBusiness, FileText, Sparkles } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Skeleton, Textarea } from '../components/ui'
import { JobInput } from '../schemas/jobInput'
import type { JobInput as JobInputType } from '../schemas/jobInput'
import type { ResumeVersion } from '../types/job'
import { JOB_SOURCES, JOB_STATUSES } from '../types/job'
import { createJob, listJobs, updateJob } from '../services/jobs'
import { listResumeVersions } from '../services/resumes'
import { FEATURE_AI_IMPORT } from '../services/importers'
import { parsePastedJobText } from '../utils/jobImport'

const sourceLabels: Record<JobInputType['source'], string> = { manual: 'Manual', linkedin: 'LinkedIn', jobstreet: 'JobStreet', indeed: 'Indeed', glassdoor: 'Glassdoor', greenhouse: 'Greenhouse', lever: 'Lever', workday: 'Workday', mcf: 'MyCareersFuture', company_site: 'Company site', other: 'Other' }
const Field = ({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) => <label className={`grid gap-1.5 text-sm ${className ?? ''}`}><span className="font-medium text-text-secondary">{label}</span>{children}{error && <span className="text-xs text-rejected">{error}</span>}</label>

export const JobFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)
  const { data: jobs = [], isLoading: jobLoading } = useQuery({ queryKey: ['jobs'], queryFn: listJobs, enabled: editing })
  const existingJob = jobs.find((job) => job.id === id)
  const [resumes, setResumes] = useState<ResumeVersion[]>([])
  const [resumesLoading, setResumesLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<JobInputType>({
    resolver: zodResolver(JobInput),
    defaultValues: { status: 'saved', source: 'manual', importStatus: 'none', needsReview: false, priority: 3, workMode: 'hybrid', currency: 'SGD', salaryPeriod: 'yearly', skills: [], requirements: [] },
  })
  useEffect(() => {
    if (!existingJob) return
    setValue('company', existingJob.company)
    setValue('title', existingJob.title)
    setValue('location', existingJob.location)
    setValue('workMode', existingJob.workMode)
    setValue('status', existingJob.status)
    setValue('source', existingJob.source)
    setValue('sourceUrl', existingJob.sourceUrl)
    setValue('appliedDate', existingJob.appliedDate)
    setValue('deadline', existingJob.deadline)
    setValue('jobDescription', existingJob.jobDescription)
    setValue('requirements', existingJob.requirements)
    setValue('skills', existingJob.skills)
    setValue('notes', existingJob.notes)
    setValue('resumeVersionId', existingJob.resumeVersionId)
    setValue('importStatus', existingJob.importStatus)
    setValue('needsReview', existingJob.needsReview ?? existingJob.importStatus === 'needs_review')
  }, [existingJob, setValue])
  const parseText = () => {
    const result = parsePastedJobText(getValues('jobDescription') ?? '', getValues('sourceUrl'))
    if (!result.success) {
      setError('Paste a job description with a title line and try again.')
      return
    }
    setValue('company', result.data.company)
    setValue('title', result.data.title)
    setValue('requirements', result.data.requirements)
    setValue('skills', result.data.skills)
    setValue('importStatus', 'needs_review')
    setValue('fieldProvenance', result.data.fieldProvenance)
    setError(undefined)
  }

  useEffect(() => {
    void listResumeVersions().then(setResumes).catch(() => setResumes([])).finally(() => setResumesLoading(false))
  }, [])

  const submit = async (values: JobInputType) => {
    setSaving(true)
    setError(undefined)
    try {
      if (editing && id) await updateJob(id, values)
      else await createJob(values)
      navigate(editing && id ? `/jobs/${id}` : '/jobs')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to save job.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><button type="button" aria-label="Back to jobs" onClick={() => navigate(editing && id ? `/jobs/${id}` : '/jobs')} className="grid size-10 place-items-center rounded-xl border border-border/35 text-text-secondary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-accent/60"><ArrowLeft size={18} aria-hidden="true" /></button><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Applications</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">{editing ? 'Edit job' : 'Add job'}</h1></div></div>
      <form className="space-y-5" onSubmit={handleSubmit((values) => void submit(values))}>
        <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><BriefcaseBusiness size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Role details</h2><p className="text-sm text-text-secondary">The essentials for finding this opportunity again.</p></div></div><div className="grid gap-4 md:grid-cols-2"><Field label="Company" error={errors.company?.message}><Input {...register('company')} placeholder="Acme Inc." /></Field><Field label="Job title" error={errors.title?.message}><Input {...register('title')} placeholder="Frontend Engineer" /></Field><Field label="Location"><Input {...register('location')} placeholder="Singapore or Remote" /></Field><Field label="Work mode"><Select {...register('workMode')}><option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="onsite">On-site</option></Select></Field><Field label="Status"><Select {...register('status')}>{JOB_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</Select></Field><Field label="Source"><Select {...register('source')}>{JOB_SOURCES.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</Select></Field></div></Card>
        <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><FileText size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Job information</h2><p className="text-sm text-text-secondary">Paste a description to prefill the fields, then review before saving.</p></div></div><div className="grid gap-4"><Field label="Source URL" error={errors.sourceUrl?.message}><Input {...register('sourceUrl')} placeholder="https://..." /></Field><Field label="Job description"><Textarea className="min-h-36" {...register('jobDescription')} placeholder="Paste the job description here..." /></Field><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" onClick={parseText}>Parse pasted details</Button><span className="text-xs text-text-muted">Uses local text parsing; no page scraping.</span></div><Field label="Requirements"><Textarea className="min-h-24" placeholder="One requirement per line" {...register('requirements', { setValueAs: (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) })} /></Field></div></Card>
        <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><Sparkles size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Resume and import</h2><p className="text-sm text-text-secondary">Record which version you used for this application.</p></div></div>{resumesLoading || jobLoading ? <Skeleton className="h-11" /> : <Field label="Resume used"><Select {...register('resumeVersionId')}><option value="">None selected</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.label}</option>)}</Select></Field>}<label className="mt-4 flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" {...register('needsReview')} /> Needs review</label><div className="mt-4 flex flex-wrap gap-3"><Button type="submit" disabled={saving || jobLoading}>{saving ? 'Saving job...' : editing ? 'Save changes' : 'Save job'}</Button><Button type="button" variant="secondary" disabled={!FEATURE_AI_IMPORT}>Auto-fill with AI <span className="text-xs text-text-muted">(coming soon)</span></Button></div>{error && <p role="alert" className="mt-3 text-sm text-rejected">{error}</p>}</Card>
      </form>
    </div>
  )
}
