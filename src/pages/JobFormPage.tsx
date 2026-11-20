import { cloneElement, isValidElement, useEffect, useId, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, type Control, type FieldErrors } from 'react-hook-form'
import { ArrowLeft, BriefcaseBusiness, FileText, Sparkles } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Input, Select, Skeleton, Textarea } from '../components/ui'
import { JobInput } from '../schemas/jobInput'
import type { JobInput as JobInputType } from '../schemas/jobInput'
import type { z } from 'zod'

type JobFormValues = z.input<typeof JobInput>
import type { ResumeVersion } from '../types/job'
import { JOB_SOURCES, JOB_STATUSES } from '../types/job'
import { createJob, listJobs, updateJob } from '../services/jobs'
import { listResumeVersions } from '../services/resumes'
import { FEATURE_AI_IMPORT } from '../services/importers'
import { parsePastedJobText } from '../utils/jobImport'

const sourceLabels: Record<JobInputType['source'], string> = { manual: 'Manual', linkedin: 'LinkedIn', jobstreet: 'JobStreet', indeed: 'Indeed', glassdoor: 'Glassdoor', greenhouse: 'Greenhouse', lever: 'Lever', workday: 'Workday', mcf: 'MyCareersFuture', company_site: 'Company site', other: 'Other' }
// Label is linked by id (not by wrapping) so a select's accessible name is just
// its label, not the text of every option.
const Field = ({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) => {
  const id = useId()
  const errorId = `${id}-error`
  const control = isValidElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>(children)
    ? cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined })
    : children
  return (
    <div className={`grid gap-1.5 text-sm ${className ?? ''}`}>
      <label htmlFor={id} className="font-medium text-text-secondary">{label}</label>
      {control}
      {error && <span id={errorId} className="text-xs text-rejected">{error}</span>}
    </div>
  )
}

const linesToList = (text: string) => text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)

/** One requirement per line. Keeps the raw text while typing so new lines aren't swallowed. */
type RequirementsFieldProps = { value: string[] | undefined; onChange: (next: string[]) => void; onBlur: () => void; id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }
const RequirementsField = ({ value, onChange, onBlur, ...aria }: RequirementsFieldProps) => {
  const joined = (Array.isArray(value) ? value : []).join('\n')
  const [text, setText] = useState(joined)
  // Re-sync when the value changes from outside (loading a job, "Parse pasted details")
  const [lastSeen, setLastSeen] = useState(joined)
  if (joined !== lastSeen) {
    setLastSeen(joined)
    if (linesToList(text).join('\n') !== joined) setText(joined)
  }
  return (
    <Textarea
      {...aria}
      className="min-h-24"
      placeholder="One requirement per line"
      value={text}
      onBlur={onBlur}
      onChange={(event) => {
        const next = linesToList(event.target.value)
        setText(event.target.value)
        setLastSeen(next.join('\n'))
        onChange(next)
      }}
    />
  )
}

const RequirementsControl = ({ control, ...aria }: { control: Control<JobFormValues, unknown, JobInputType>; id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => (
  <Controller control={control} name="requirements" render={({ field }) => <RequirementsField {...aria} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />
)

const optionalText =(value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const fieldNames: Partial<Record<keyof JobInputType, string>> = { company: 'Company', title: 'Job title', location: 'Location', sourceUrl: 'Source URL', jobDescription: 'Job description', requirements: 'Requirements', resumeVersionId: 'Resume used', skills: 'Skills' }

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
  const queryClient = useQueryClient()
  const { register, control, handleSubmit, getValues, setValue, formState: { errors } } = useForm<JobFormValues, unknown, JobInputType>({
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
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
      navigate(editing && id ? `/jobs/${id}` : '/jobs')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to save job.')
    } finally {
      setSaving(false)
    }
  }

  const onInvalid = (invalid: FieldErrors<JobFormValues>) => {
    const names = Object.keys(invalid).map((key) => fieldNames[key as keyof JobInputType] ?? key)
    setError(`Please check: ${names.join(', ')}.`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><button type="button" aria-label="Back to jobs" onClick={() => navigate(editing && id ? `/jobs/${id}` : '/jobs')} className="grid size-10 place-items-center rounded-xl border border-border/35 text-text-secondary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-accent/60"><ArrowLeft size={18} aria-hidden="true" /></button><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Applications</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">{editing ? 'Edit job' : 'Add job'}</h1></div></div>
      <form className="space-y-5" onSubmit={handleSubmit((values) => void submit(values), onInvalid)}>
        <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><BriefcaseBusiness size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Role details</h2><p className="text-sm text-text-secondary">The essentials for finding this opportunity again.</p></div></div><div className="grid gap-4 md:grid-cols-2"><Field label="Company" error={errors.company?.message}><Input {...register('company')} placeholder="Acme Inc." /></Field><Field label="Job title" error={errors.title?.message}><Input {...register('title')} placeholder="Frontend Engineer" /></Field><Field label="Location"><Input {...register('location')} placeholder="Singapore or Remote" /></Field><Field label="Work mode"><Select {...register('workMode')}><option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="onsite">On-site</option></Select></Field><Field label="Status"><Select {...register('status')}>{JOB_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</Select></Field><Field label="Source"><Select {...register('source')}>{JOB_SOURCES.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</Select></Field></div></Card>
        <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><FileText size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Job information</h2><p className="text-sm text-text-secondary">Paste a description to prefill the fields, then review before saving.</p></div></div><div className="grid gap-4"><Field label="Source URL" error={errors.sourceUrl?.message}><Input {...register('sourceUrl', { setValueAs: optionalText })} placeholder="https://..." /></Field><Field label="Job description"><Textarea className="min-h-36" {...register('jobDescription')} placeholder="Paste the job description here..." /></Field><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" onClick={parseText}>Parse pasted details</Button><span className="text-xs text-text-muted">Uses local text parsing; no page scraping.</span></div><Field label="Requirements" error={errors.requirements?.message ?? errors.requirements?.root?.message}><RequirementsControl control={control} /></Field></div></Card>
        <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><Sparkles size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Resume and import</h2><p className="text-sm text-text-secondary">Record which version you used for this application.</p></div></div>{resumesLoading || jobLoading ? <Skeleton className="h-11" /> : <Field label="Resume used"><Select {...register('resumeVersionId', { setValueAs: optionalText })}><option value="">None selected</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.label}</option>)}</Select></Field>}<label className="mt-4 flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" {...register('needsReview')} /> Needs review</label><div className="mt-4 flex flex-wrap gap-3"><Button type="submit" disabled={saving || jobLoading}>{saving ? 'Saving job...' : editing ? 'Save changes' : 'Save job'}</Button><Button type="button" variant="secondary" disabled={!FEATURE_AI_IMPORT}>Auto-fill with AI <span className="text-xs text-text-muted">(coming soon)</span></Button></div>{error && <p role="alert" className="mt-3 text-sm text-rejected">{error}</p>}</Card>
      </form>
    </div>
  )
}
