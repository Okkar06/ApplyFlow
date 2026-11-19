import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { listJobs, markJobFollowedUp } from '../services/jobs'
import { listCalendarEvents } from '../services/calendarEvents'
import { getFollowUpSuggestions } from '../utils/followUps'
import type { Job, JobStatus } from '../types/job'

const cardClass = 'transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none'
const chartTooltipStyle = {
  backgroundColor: 'rgb(var(--color-surface-solid))',
  border: '1px solid rgb(var(--color-border) / 0.3)',
  borderRadius: '12px',
  color: 'rgb(var(--color-text-primary))',
}

const statusLabels: Record<JobStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
}

const formatDate = (value?: string) => {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const day = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - day)
  return result
}

const isInRange = (value: string | undefined, start: Date, end: Date) => {
  if (!value) return false
  const date = new Date(`${value}T00:00:00`)
  return date >= start && date <= end
}

const trendFor = (jobs: Job[], predicate: (job: Job) => boolean) => {
  const now = new Date()
  const thisWeek = startOfWeek(now)
  const previousWeek = new Date(thisWeek)
  previousWeek.setDate(previousWeek.getDate() - 7)
  const thisWeekCount = jobs.filter((job) => predicate(job) && isInRange(job.appliedDate, thisWeek, now)).length
  const previousWeekCount = jobs.filter((job) => predicate(job) && isInRange(job.appliedDate, previousWeek, thisWeek)).length
  const difference = thisWeekCount - previousWeekCount
  return difference === 0 ? 'No change' : `${difference > 0 ? '+' : ''}${difference} this week`
}

const normalizeRole = (title: string) => title
  .toLowerCase()
  .replace(/^(senior|sr|junior|jr|lead|principal|staff)\.?\s+/i, '')
  .replace(/\s+/g, ' ')
  .trim()

const displayRole = (title: string) => title
  .replace(/\s+/g, ' ')
  .trim()

const sourceLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  company_site: 'Company sites',
  other: 'Other',
}

const getSourceGroup = (source: Job['source']) => source in sourceLabels ? source : 'other'

const EmptyWidget = ({ icon: Icon = Search, message }: { icon?: LucideIcon; message: string }) => (
  <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/30 bg-surface-subtle/35 px-4 text-center">
    <Icon size={20} className="text-text-muted" aria-hidden="true" />
    <p className="text-sm text-text-secondary">{message}</p>
  </div>
)

const WidgetSkeleton = ({ className = 'h-48' }: { className?: string }) => (
  <div className={`${className} animate-pulse rounded-xl bg-surface-elevated/60 motion-reduce:animate-none`} />
)

type StatCardProps = {
  label: string
  value: string
  trend: string
  icon: LucideIcon
  positive?: boolean
}

const StatCard = ({ label, value, trend, icon: Icon, positive = true }: StatCardProps) => (
  <GlassCard level={1} className={`glass-kpi ${cardClass}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <Icon size={19} className="text-accent-strong" aria-hidden="true" />
    </div>
    <p className="mt-4 text-3xl font-semibold tabular-nums text-text-primary">{value}</p>
    <p className={`mt-2 text-xs ${positive ? 'text-offer' : 'text-rejected'}`}>{trend}</p>
  </GlassCard>
)

const Pipeline = ({ jobs }: { jobs: Job[] }) => {
  const stages = [
    { label: 'Applied', count: jobs.filter((job) => job.status === 'applied').length, className: 'bg-applied/75' },
    { label: 'Screening', count: jobs.filter((job) => job.status === 'saved').length, className: 'bg-ghosted/75' },
    { label: 'Interview', count: jobs.filter((job) => job.status === 'interview').length, className: 'bg-interviewing/75' },
    { label: 'Offer', count: jobs.filter((job) => job.status === 'offer').length, className: 'bg-offer/75' },
  ]
  const max = Math.max(...stages.map((stage) => stage.count), 1)

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const previous = stages[index - 1]
        const conversion = previous && previous.count > 0 ? `${Math.round((stage.count / previous.count) * 100)}%` : '—'
        return (
          <div key={stage.label}>
            {previous && <p className="mb-1 text-right text-xs text-text-muted">{conversion} from {previous.label.toLowerCase()}</p>}
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-text-secondary">{stage.label}</span>
              <div className="h-9 min-w-0 flex-1 rounded-lg bg-surface-subtle/60">
                <div
                  className={`flex h-full min-w-10 items-center justify-end rounded-lg ${stage.className} px-3 text-sm font-semibold text-on-accent`}
                  style={{ width: `${Math.max((stage.count / max) * 100, stage.count ? 12 : 0)}%` }}
                >
                  {stage.count}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const DashboardPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [followingUpId, setFollowingUpId] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const { data: jobs = [], isLoading, isError } = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const { data: calendarEvents = [] } = useQuery({ queryKey: ['calendar-events'], queryFn: listCalendarEvents })

  const stats = useMemo(() => {
    const active = jobs.filter((job) => ['saved', 'applied', 'interview'].includes(job.status))
    const interviews = jobs.filter((job) => job.status === 'interview')
    const offers = jobs.filter((job) => job.status === 'offer')
    const responded = jobs.filter((job) => ['interview', 'offer', 'rejected', 'ghosted'].includes(job.status))
    return [
      { label: 'Total applications', value: String(jobs.length), trend: trendFor(jobs, () => true), icon: BriefcaseBusiness },
      { label: 'Active', value: String(active.length), trend: trendFor(jobs, (job) => ['saved', 'applied', 'interview'].includes(job.status)), icon: Target },
      { label: 'Interviews', value: String(interviews.length), trend: trendFor(jobs, (job) => job.status === 'interview'), icon: CalendarDays },
      { label: 'Offers', value: String(offers.length), trend: trendFor(jobs, (job) => job.status === 'offer'), icon: CircleDollarSign },
      { label: 'Response rate', value: jobs.length ? `${Math.round((responded.length / jobs.length) * 100)}%` : '0%', trend: trendFor(jobs, (job) => ['interview', 'offer', 'rejected', 'ghosted'].includes(job.status)), icon: Activity },
    ]
  }, [jobs])

  const roles = useMemo(() => {
    const grouped = new Map<string, { name: string; count: number }>()
    for (const job of jobs) {
      const key = normalizeRole(job.title)
      const current = grouped.get(key)
      grouped.set(key, { name: current?.name ?? displayRole(job.title), count: (current?.count ?? 0) + 1 })
    }
    return [...grouped.values()].sort((a, b) => b.count - a.count).slice(0, 8)
  }, [jobs])

  const sources = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const job of jobs) {
      const source = getSourceGroup(job.source)
      grouped.set(source, (grouped.get(source) ?? 0) + 1)
    }
    return [...grouped.entries()].map(([source, count]) => ({ name: sourceLabels[source], count }))
  }, [jobs])

  const followUpSuggestions = useMemo(() => getFollowUpSuggestions(jobs).filter((suggestion) => !calendarEvents.some((event) => event.jobId === suggestion.jobId && event.type === 'follow_up')), [jobs, calendarEvents])
  const followUpJobs = useMemo(() => followUpSuggestions.map((suggestion) => jobs.find((job) => job.id === suggestion.jobId)).filter((job): job is Job => Boolean(job)).slice(0, 5), [followUpSuggestions, jobs])
  const upcomingInterviews = useMemo(() => calendarEvents.filter((event) => event.type === 'interview' && !event.completed && new Date(event.startTime) >= new Date()).slice(0, 5), [calendarEvents])

  const recentJobs = useMemo(() => jobs.filter((job) => job.appliedDate).slice(0, 6), [jobs])
  const skills = useMemo(() => {
    const grouped = new Map<string, { name: string; count: number }>()
    for (const value of jobs.flatMap((job) => [...job.skills, ...job.requirements])) {
      const name = value.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const current = grouped.get(key)
      grouped.set(key, { name: current?.name ?? name, count: (current?.count ?? 0) + 1 })
    }
    return [...grouped.values()].sort((a, b) => b.count - a.count).slice(0, 12)
  }, [jobs])

  const markFollowedUp = async (job: Job) => {
    setFollowingUpId(job.id)
    setActionError(undefined)
    try {
      await markJobFollowedUp(job)
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to update this application.')
    } finally {
      setFollowingUpId(undefined)
    }
  }

  if (isError) {
    return <GlassCard className={cardClass}><p role="alert" className="text-sm text-rejected">Unable to load dashboard data. Please refresh and try again.</p></GlassCard>
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <GlassCard key={index} level={1}><WidgetSkeleton className="h-28" /></GlassCard>)}</section>
        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><GlassCard><WidgetSkeleton /></GlassCard><GlassCard><WidgetSkeleton /></GlassCard></section>
        <section className="grid gap-5 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <GlassCard key={index}><WidgetSkeleton /></GlassCard>)}</section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} positive={!stat.trend.startsWith('-')} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <GlassCard className={cardClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-base font-semibold text-text-primary">Applications by job role</h2><p className="mt-1 text-xs text-text-muted">Your most targeted roles</p></div>
            <Link to="/jobs" className="flex items-center gap-1 text-xs font-medium text-accent-strong hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60">View all <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </div>
          {roles.length ? <div className="h-72"><ResponsiveContainer><BarChart data={roles} layout="vertical" margin={{ left: 8, right: 28 }}><CartesianGrid horizontal={false} stroke="rgb(var(--color-border) / 0.18)" /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="name" width={112} tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 12 }} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'rgb(var(--color-accent) / 0.08)' }} contentStyle={chartTooltipStyle} /><Bar dataKey="count" fill="rgb(var(--color-accent))" radius={[0, 6, 6, 0]}><LabelList dataKey="count" position="right" fill="rgb(var(--color-text-primary))" /></Bar></BarChart></ResponsiveContainer></div> : <EmptyWidget icon={BriefcaseBusiness} message="Your role breakdown will appear after you save applications." />}
        </GlassCard>
        <GlassCard className={cardClass}>
          <div className="mb-4"><h2 className="text-base font-semibold text-text-primary">Pipeline</h2><p className="mt-1 text-xs text-text-muted">Move applications toward an offer</p></div>
          {jobs.length ? <Pipeline jobs={jobs} /> : <EmptyWidget icon={Target} message="Your pipeline will appear after your first application." />}
        </GlassCard>
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-3">
        <GlassCard className={cardClass}>
          <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="text-base font-semibold text-text-primary">Applications by source</h2><p className="mt-1 text-xs text-text-muted">Where your opportunities come from</p></div><Link to="/calendar" className="sr-only">View calendar</Link></div>
          {sources.length ? <div className="h-56"><ResponsiveContainer><PieChart><Pie data={sources} dataKey="count" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>{sources.map((source, index) => <Cell key={source.name} fill={['rgb(var(--color-accent))', 'rgb(var(--color-status-applied))', 'rgb(var(--color-status-interviewing))', 'rgb(var(--color-status-ghosted))'][index % 4]} />)}</Pie><Tooltip contentStyle={chartTooltipStyle} /></PieChart></ResponsiveContainer></div> : <EmptyWidget icon={BriefcaseBusiness} message="Source insights will appear after you save applications." />}
        </GlassCard>
        <GlassCard className={`${cardClass} flex h-full flex-col`}>
          <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="text-base font-semibold text-text-primary">Upcoming interviews</h2><p className="mt-1 text-xs text-text-muted">Your next conversations</p></div><Link to="/calendar" className="text-xs font-medium text-accent-strong hover:text-accent">View calendar</Link></div>
          {upcomingInterviews.length ? <ul className="flex-1 space-y-3">{upcomingInterviews.map((event) => { const job = event.jobId ? jobs.find((item) => item.id === event.jobId) : undefined; return <li key={event.id} className="rounded-xl border border-border/25 bg-surface-subtle/30 p-3"><p className="text-sm font-medium text-text-primary">{job?.company ?? event.title}</p><p className="text-xs text-text-secondary">{job?.title ?? 'Interview'}</p><p className="mt-1 text-xs text-text-muted">{new Date(event.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p></li> })}</ul> : <div className="flex flex-1 items-center"><EmptyWidget icon={CalendarDays} message="Schedule an interview to see it here." /></div>}
        </GlassCard>
        <GlassCard className={`${cardClass} flex h-full flex-col`}>
          <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="text-base font-semibold text-text-primary">Needs follow-up</h2><p className="mt-1 text-xs text-text-muted">No response after seven days</p></div><Link to="/calendar" className="text-xs font-medium text-accent-strong hover:text-accent">View calendar</Link></div>
          {actionError && <p role="alert" className="mb-3 rounded-lg border border-rejected/30 bg-rejected/10 px-3 py-2 text-xs text-rejected">{actionError}</p>}
          {followUpJobs.length ? <ul className="flex-1 space-y-3">{followUpJobs.map((job) => <li key={job.id} className="rounded-xl border border-border/25 bg-surface-subtle/30 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-text-primary">{job.company}</p><p className="truncate text-xs text-text-secondary">{job.title}</p><p className="mt-1 text-xs text-text-muted">Applied {formatDate(job.appliedDate)}</p></div><Clock3 size={16} className="shrink-0 text-text-muted" aria-hidden="true" /></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><button type="button" disabled={followingUpId === job.id} onClick={() => void markFollowedUp(job)} className="rounded-lg bg-accent/15 px-2 py-1 font-medium text-accent-strong hover:bg-accent/25 disabled:opacity-50">Mark followed up</button><button type="button" onClick={() => navigate(`/jobs/${job.id}/edit`)} className="rounded-lg border border-border/30 px-2 py-1 text-text-secondary hover:bg-surface-elevated">Update status</button><button type="button" onClick={() => navigate(`/jobs/${job.id}/edit`)} aria-label={`Open ${job.title} at ${job.company}`} className="grid size-7 place-items-center rounded-lg border border-border/30 text-text-secondary hover:bg-surface-elevated"><ExternalLink size={14} aria-hidden="true" /></button></div></li>)}</ul> : <div className="flex flex-1 items-center"><EmptyWidget icon={CheckCircle2} message="You are all caught up." /></div>}
        </GlassCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <GlassCard className={cardClass}>
          <div className="mb-4"><h2 className="text-base font-semibold text-text-primary">Recent activity</h2><p className="mt-1 text-xs text-text-muted">Your latest applications</p></div>
          {recentJobs.length ? <ul className="space-y-3">{recentJobs.map((job) => <li key={job.id} className="flex items-start gap-3"><div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-strong"><RefreshCw size={15} aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="text-sm text-text-primary"><span className="font-medium">{job.company}</span> — {statusLabels[job.status].toLowerCase()} application</p><p className="mt-0.5 text-xs text-text-muted">{job.title} · {formatDate(job.appliedDate) ?? 'Recently updated'}</p></div></li>)}</ul> : <EmptyWidget icon={Activity} message="New applications and status changes will appear here." />}
        </GlassCard>
        {skills.length > 0 && <GlassCard className={cardClass}><div className="mb-4"><h2 className="text-base font-semibold text-text-primary">Top requested skills</h2><p className="mt-1 text-xs text-text-muted">Skills appearing in your applications</p></div><div className="flex flex-wrap gap-2">{skills.map((skill) => <span key={skill.name.toLowerCase()} className="inline-flex items-center gap-1.5 rounded-full border border-border/25 bg-surface-subtle/50 px-3 py-1.5 text-xs text-text-secondary"><Sparkles size={13} className="text-accent-strong" aria-hidden="true" />{skill.name}<strong className="text-text-primary">{skill.count}</strong></span>)}</div></GlassCard>}
      </section>
    </div>
  )
}
