import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, ExternalLink, FileText, Pencil, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui'
import { listJobs, updateJobReviewState } from '../services/jobs'
import { listJobEvents } from '../services/jobEvents'
import { listResumeVersions } from '../services/resumes'
import type { JobStatus } from '../types/job'

const statusLabels: Record<JobStatus, string> = { saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', ghosted: 'Ghosted' }

export const JobDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const { data: resumes = [] } = useQuery({ queryKey: ['resume-versions'], queryFn: listResumeVersions })
  const { data: timeline = [] } = useQuery({ queryKey: ['job-events', id], queryFn: () => listJobEvents(id ?? ''), enabled: Boolean(id) })
  const reviewMutation = useMutation({ mutationFn: (needsReview: boolean) => updateJobReviewState(id ?? '', needsReview), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['jobs'] }) })
  const job = jobs.find((item) => item.id === id)
  const resume = resumes.find((item) => item.id === job?.resumeVersionId)

  if (isLoading) return <Skeleton className="h-[520px]" />
  if (!job) return <EmptyState title="Application not found" description="This application may have been removed or is not available to your account." action={<Button onClick={() => navigate('/jobs')}>Back to jobs</Button>} />

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" aria-label="Back to jobs" onClick={() => navigate('/jobs')} className="grid size-10 place-items-center rounded-xl border border-border/35 text-text-secondary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-accent/60"><ArrowLeft size={18} aria-hidden="true" /></button><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Application</p><h1 className="mt-1 text-2xl font-semibold">{job.title}</h1><p className="text-sm text-text-secondary">{job.company} · {job.location || 'Location not set'}</p></div></div><div className="flex flex-wrap gap-2">{(job.needsReview || job.importStatus === 'needs_review') && <Button variant="secondary" onClick={() => reviewMutation.mutate(false)} disabled={reviewMutation.isPending}>Mark reviewed</Button>}<Link to={`/calendar?job=${job.id}`}><Button variant="secondary"><CalendarDays size={16} aria-hidden="true" />Schedule</Button></Link><Link to={`/jobs/${job.id}/edit`}><Button><Pencil size={16} aria-hidden="true" />Edit</Button></Link></div></div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-5">
        <Card><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Overview</h2><Badge status={job.status}>{statusLabels[job.status]}</Badge></div><dl className="mt-4 grid gap-4 sm:grid-cols-3"><div><dt className="text-xs text-text-muted">Applied</dt><dd className="mt-1 text-sm text-text-primary">{job.appliedDate ?? 'Not applied'}</dd></div><div><dt className="text-xs text-text-muted">Source</dt><dd className="mt-1 text-sm text-text-primary">{job.source}</dd></div><div><dt className="text-xs text-text-muted">Work mode</dt><dd className="mt-1 text-sm text-text-primary">{job.workMode}</dd></div></dl>{job.sourceUrl && <a className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:text-accent-strong" href={job.sourceUrl} target="_blank" rel="noreferrer">Open job posting <ExternalLink size={15} aria-hidden="true" /></a>}</Card>
        <Card><div className="mb-4 flex items-center gap-2"><FileText size={18} className="text-accent" aria-hidden="true" /><h2 className="font-semibold">Job description</h2></div>{job.jobDescription ? <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{job.jobDescription}</p> : <p className="text-sm text-text-muted">No job description captured.</p>}</Card>
        <Card><div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-accent" aria-hidden="true" /><h2 className="font-semibold">Requirements and skills</h2></div>{job.requirements.length || job.skills.length ? <div className="flex flex-wrap gap-2">{[...job.requirements, ...job.skills].map((item, index) => <span key={`${item}-${index}`} className="rounded-full border border-border/25 bg-surface-subtle/50 px-3 py-1.5 text-xs text-text-secondary">{item}</span>)}</div> : <p className="text-sm text-text-muted">No requirements or skills captured.</p>}</Card>
      </div>
      <div className="space-y-5"><Card><h2 className="font-semibold">Resume used</h2>{resume ? <div className="mt-3"><p className="text-sm text-text-primary">{resume.label}</p><p className="mt-1 text-xs text-text-muted">{resume.fileName}</p></div> : <p className="mt-3 text-sm text-text-muted">No resume linked.</p>}</Card><Card><h2 className="font-semibold">Status timeline</h2>{timeline.length ? <ol className="mt-4 space-y-4">{timeline.map((event) => <li key={event.id} className="relative border-l border-border/30 pl-4"><span className="absolute -left-1.5 top-1 size-2.5 rounded-full bg-accent" /><p className="text-sm font-medium text-text-primary">{event.toStatus ? statusLabels[event.toStatus] : event.eventType}</p><p className="mt-1 text-xs text-text-muted">{new Date(event.createdAt).toLocaleString()}</p>{event.note && <p className="mt-1 text-xs text-text-secondary">{event.note}</p>}</li>)}</ol> : <p className="mt-3 text-sm text-text-muted">No status changes recorded yet. Apply the timeline migration to enable automatic entries.</p>}</Card><Card><h2 className="font-semibold">Notes</h2><p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{job.notes || 'No notes yet.'}</p></Card></div>
    </div>
  </div>
}
