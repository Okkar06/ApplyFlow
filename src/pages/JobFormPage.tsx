import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { GlassCard } from '../components/GlassCard'
import { JobInput } from '../schemas/jobInput'
import type { JobInput as JobInputType } from '../schemas/jobInput'
import type { ResumeVersion } from '../types/job'
import { createJob } from '../services/jobs'
import { listResumeVersions } from '../services/resumes'
import { FEATURE_AI_IMPORT } from '../services/importers'
import { useNavigate } from 'react-router-dom'

export const JobFormPage = () => {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<ResumeVersion[]>([])
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<JobInputType>({
    resolver: zodResolver(JobInput),
    defaultValues: { status: 'saved', source: 'manual', importStatus: 'none', priority: 3, workMode: 'hybrid', currency: 'SGD', salaryPeriod: 'yearly', skills: [], requirements: [] },
  })
  useEffect(() => { void listResumeVersions().then(setResumes).catch(() => setResumes([])) }, [])
  const submit = async (values: JobInputType) => {
    setSaving(true)
    setError(undefined)
    try {
      await createJob(values)
      navigate('/jobs')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to save job.')
    } finally {
      setSaving(false)
    }
  }
  return <GlassCard><h2 className="mb-3 text-lg font-semibold">Add Job</h2><form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit((values) => void submit(values))}>
    <label className="grid gap-1 text-sm">Company<input className="rounded-lg bg-black/20 px-3 py-2" {...register('company')} />{errors.company && <span className="text-red-300">{errors.company.message}</span>}</label>
    <label className="grid gap-1 text-sm">Title<input className="rounded-lg bg-black/20 px-3 py-2" {...register('title')} />{errors.title && <span className="text-red-300">{errors.title.message}</span>}</label>
    <label className="grid gap-1 text-sm">Location<input className="rounded-lg bg-black/20 px-3 py-2" {...register('location')} /></label>
    <label className="grid gap-1 text-sm">Status<select className="rounded-lg bg-black/20 px-3 py-2" {...register('status')}><option value="saved">Saved</option><option value="applied">Applied</option><option value="interview">Interview</option><option value="rejected">Rejected</option></select></label>
    <label className="grid gap-1 text-sm md:col-span-2">Source URL<input className="rounded-lg bg-black/20 px-3 py-2" placeholder="https://..." {...register('sourceUrl')} />{errors.sourceUrl && <span className="text-red-300">{errors.sourceUrl.message}</span>}</label>
    <label className="grid gap-1 text-sm md:col-span-2">Job description<textarea className="min-h-32 rounded-lg bg-black/20 px-3 py-2" {...register('jobDescription')} /></label>
    <label className="grid gap-1 text-sm md:col-span-2">Requirements <textarea className="min-h-20 rounded-lg bg-black/20 px-3 py-2" placeholder="One requirement per line" {...register('requirements', { setValueAs: (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) })} /></label>
    <label className="grid gap-1 text-sm md:col-span-2">Resume used<select className="rounded-lg bg-black/20 px-3 py-2" {...register('resumeVersionId')}><option value="">None selected</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.label}</option>)}</select></label>
    <div className="md:col-span-2 flex gap-2"><button type="submit" disabled={saving} className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50">{saving ? 'Saving...' : 'Save Job'}</button><button type="button" disabled={!FEATURE_AI_IMPORT} className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Auto-fill with AI (coming soon)</button></div>
    {error && <p role="alert" className="text-sm text-red-300 md:col-span-2">{error}</p>}
  </form></GlassCard>
}
