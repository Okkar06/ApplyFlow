import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Inbox, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Select, Skeleton } from '../components/ui'
import { listJobs, updateJobReviewState } from '../services/jobs'
import { ignoreEmailCapture, linkEmailCapture, listEmailCapturesForReview, type EmailCapture } from '../services/emailCapture'
import type { Job } from '../types/job'

const EmailReviewItem = ({ capture, jobs }: { capture: EmailCapture; jobs: Job[] }) => {
  const queryClient = useQueryClient()
  const guess = jobs.find((job) => capture.parsed.company && job.company.toLowerCase() === capture.parsed.company.toLowerCase())
  const [jobId, setJobId] = useState(guess?.id ?? '')
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['email-captures'] })
  const link = useMutation({ mutationFn: () => linkEmailCapture(capture.id, jobId), onSuccess: refresh })
  const ignore = useMutation({ mutationFn: () => ignoreEmailCapture(capture.id), onSuccess: refresh })
  const selectId = `link-${capture.id}`
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-calendar-follow-up/15 text-calendar-follow-up"><Mail size={19} aria-hidden="true" /></div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{capture.subject}</h3>
          <p className="truncate text-sm text-text-secondary">{capture.sender} · {new Date(capture.receivedAt ?? capture.createdAt).toLocaleDateString()}</p>
          <Badge>{[capture.parsed.title, capture.parsed.company].filter(Boolean).join(' at ') || 'No matching application found'}{capture.parsed.status ? ` · looks like: ${capture.parsed.status}` : ''}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">Application for this email</label>
        <Select id={selectId} value={jobId} onChange={(event) => setJobId(event.target.value)} className="w-56">
          <option value="">Choose application...</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.company} · {job.title}</option>)}
        </Select>
        <Button variant="secondary" onClick={() => link.mutate()} disabled={!jobId || link.isPending}>Link</Button>
        <Button variant="ghost" onClick={() => ignore.mutate()} disabled={ignore.isPending}>Ignore</Button>
      </div>
      {(link.error || ignore.error) && <p role="alert" className="w-full text-sm text-rejected">{(link.error ?? ignore.error)?.message}</p>}
    </Card>
  )
}

export const NeedsReviewPage = () => {
  const { data: jobs = [], isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const { data: captures = [], isLoading: capturesLoading, error: capturesError } = useQuery({ queryKey: ['email-captures'], queryFn: listEmailCapturesForReview })
  const queryClient = useQueryClient()
  const reviewMutation = useMutation({ mutationFn: (id: string) => updateJobReviewState(id, false), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['jobs'] }) })
  const reviewJobs = jobs.filter((job) => job.needsReview || job.importStatus === 'needs_review')
  if (isLoading || capturesLoading) return <Skeleton className="h-72" />
  if (error) return <Card><p role="alert" className="text-sm text-rejected">Unable to load review items.</p></Card>
  const empty = !reviewJobs.length && !captures.length
  return (
    <div className="space-y-5">
      <div><p className="text-sm font-medium text-accent">Capture inbox</p><h1 className="mt-1 text-2xl font-semibold">Needs review</h1><p className="mt-1 text-sm text-text-secondary">Check incomplete or uncertain application details before relying on them.</p></div>
      {reviewJobs.length > 0 && <div className="grid gap-3">{reviewJobs.map((job) => <Card key={job.id} className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-calendar-application/15 text-calendar-application"><AlertCircle size={19} aria-hidden="true" /></div><div className="min-w-0"><h2 className="truncate font-semibold">{job.title}</h2><p className="truncate text-sm text-text-secondary">{job.company} · {job.source}</p><Badge>{job.importError || 'Some captured fields need confirmation.'}</Badge></div></div><div className="flex gap-2"><Button variant="ghost" onClick={() => reviewMutation.mutate(job.id)} disabled={reviewMutation.isPending}>Dismiss</Button><Link to={`/jobs/${job.id}/edit`}><Button variant="secondary">Edit</Button></Link><Link to={`/jobs/${job.id}`}><Button variant="secondary">Review <ArrowRight size={15} aria-hidden="true" /></Button></Link></div></Card>)}</div>}
      {capturesError && <Card><p role="alert" className="text-sm text-rejected">Unable to load forwarded emails.</p></Card>}
      {captures.length > 0 && (
        <section className="space-y-3" aria-labelledby="emails-heading">
          <h2 id="emails-heading" className="text-lg font-semibold">Emails to review</h2>
          <p className="text-sm text-text-secondary">Forwarded emails we couldn't match to an application with confidence.</p>
          <div className="grid gap-3">{captures.map((capture) => <EmailReviewItem key={capture.id} capture={capture} jobs={jobs} />)}</div>
        </section>
      )}
      {empty && <Card><EmptyState icon={Inbox} title="Nothing needs review" description="Captured applications and forwarded emails that need a decision will appear here." /></Card>}
    </div>
  )
}
