import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui'
import { listJobs, updateJobReviewState } from '../services/jobs'

export const NeedsReviewPage = () => {
  const { data: jobs = [], isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const queryClient = useQueryClient()
  const reviewMutation = useMutation({ mutationFn: (id: string) => updateJobReviewState(id, false), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['jobs'] }) })
  const reviewJobs = jobs.filter((job) => job.needsReview || job.importStatus === 'needs_review')
  if (isLoading) return <Skeleton className="h-72" />
  if (error) return <Card><p role="alert" className="text-sm text-rejected">Unable to load review items.</p></Card>
  return <div className="space-y-5"><div><p className="text-sm font-medium text-accent">Capture inbox</p><h1 className="mt-1 text-2xl font-semibold">Needs review</h1><p className="mt-1 text-sm text-text-secondary">Check incomplete or uncertain application details before relying on them.</p></div>{reviewJobs.length ? <div className="grid gap-3">{reviewJobs.map((job) => <Card key={job.id} className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-calendar-application/15 text-calendar-application"><AlertCircle size={19} aria-hidden="true" /></div><div className="min-w-0"><h2 className="truncate font-semibold">{job.title}</h2><p className="truncate text-sm text-text-secondary">{job.company} · {job.source}</p><Badge>{job.importError || 'Some captured fields need confirmation.'}</Badge></div></div><div className="flex gap-2"><Button variant="ghost" onClick={() => reviewMutation.mutate(job.id)} disabled={reviewMutation.isPending}>Dismiss</Button><Link to={`/jobs/${job.id}/edit`}><Button variant="secondary">Edit</Button></Link><Link to={`/jobs/${job.id}`}><Button variant="secondary">Review <ArrowRight size={15} aria-hidden="true" /></Button></Link></div></Card>)}</div> : <Card><EmptyState icon={Inbox} title="Nothing needs review" description="Captured applications with incomplete fields will appear here." /></Card>}</div>
}
