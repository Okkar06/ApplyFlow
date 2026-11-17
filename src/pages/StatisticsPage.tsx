import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronUp, Percent, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, EmptyState, Select, Skeleton } from '../components/ui'
import { listJobs } from '../services/jobs'
import { buildStatistics, STATUS_BUCKETS, type StatisticsRange } from '../utils/statistics'

const roleColor = (key: string) => `rgb(var(--color-role-${key}))`
const statusColor = (status: string) => `rgb(var(--color-status-${status === 'interview' ? 'interviewing' : status}))`
const tooltipStyle = {
  backgroundColor: 'rgb(var(--color-surface-solid))',
  border: '1px solid rgb(var(--color-border) / 0.3)',
  borderRadius: '12px',
  color: 'rgb(var(--color-text-primary))',
}
const statusLabels: Record<string, string> = {
  applied: 'Applied',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
}

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  })
  return reduced
}

const Stat = ({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof TrendingUp }) => (
  <Card className="min-w-0" level={1}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">{label}</p>
      <Icon size={18} className="text-accent" aria-hidden="true" />
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    <p className="mt-1 text-xs text-text-muted">{detail}</p>
  </Card>
)

const ChartEmpty = () => <EmptyState icon={BarChart3} title="No statistics yet" description="Add a few applications to see your stats." action={<Link className="text-sm font-medium text-accent hover:text-accent-strong" to="/jobs/new">Add an application</Link>} />

export const StatisticsPage = () => {
  const { data: jobs = [], isLoading, isError } = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const [range, setRange] = useState<StatisticsRange>(8)
  const [mode, setMode] = useState<'stacked' | 'grouped'>('stacked')
  const [activeRoles, setActiveRoles] = useState<Set<string>>(new Set())
  const [tableOpen, setTableOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const stats = useMemo(() => buildStatistics(jobs, range), [jobs, range])
  const selectedRoles = activeRoles.size ? stats.roles.filter((role) => activeRoles.has(role.key)) : stats.roles
  const chartData = stats.weeks.map((week) => ({ label: week.label, total: week.total, ...week.byRole }))
  const statusData = stats.weeks.map((week) => ({ label: week.label, ...week.byStatus }))
  const total = stats.selectedJobs.length
  const average = stats.weeks.length ? (total / stats.weeks.length).toFixed(1) : '0'
  const busiest = stats.weeks.reduce((best, week) => week.total > best.total ? week : best, stats.weeks[0])
  const topRole = stats.roleTotals[0]
  const previousRangeStart = stats.weeks[0]?.start
  const previousJobs = previousRangeStart ? jobs.filter((job) => {
    if (!job.appliedDate) return false
    const date = new Date(`${job.appliedDate}T00:00:00`)
    const start = new Date(previousRangeStart)
    start.setDate(start.getDate() - stats.weeks.length * 7)
    return date >= start && date < previousRangeStart
  }).length : 0
  const change = total - previousJobs

  const toggleRole = (key: string) => {
    setActiveRoles((current) => {
      const next = new Set(current)
      if (next.size === 0) stats.roles.forEach((role) => next.add(role.key))
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next.size === stats.roles.length ? new Set() : next
    })
  }

  if (isLoading) return <div className="space-y-5"><Skeleton className="h-20" /><Skeleton className="h-96" /><Skeleton className="h-72" /></div>
  if (isError) return <EmptyState icon={BarChart3} title="Unable to load statistics" description="Refresh the page and try again." />
  if (!jobs.some((job) => job.appliedDate)) return <ChartEmpty />

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-accent">Analytics</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Statistics</h2>
          <p className="mt-1 text-sm text-text-secondary">Understand which roles and sources are moving your search forward.</p>
        </div>
        <Select aria-label="Statistics time range" value={range} onChange={(event) => setRange(event.target.value === 'all' ? 'all' : Number(event.target.value) as StatisticsRange)} className="w-full sm:w-40">
          <option value={4}>Last 4 weeks</option>
          <option value={8}>Last 8 weeks</option>
          <option value={12}>Last 12 weeks</option>
          <option value="all">All time</option>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Applications" value={String(total)} detail="Selected range" icon={BriefcaseBusiness} />
        <Stat label="Weekly average" value={average} detail="Applications per week" icon={CalendarDays} />
        <Stat label="Busiest week" value={busiest?.label ?? '—'} detail={`${busiest?.total ?? 0} applications`} icon={TrendingUp} />
        <Stat label="Most-applied role" value={topRole?.name ?? '—'} detail={`${topRole?.count ?? 0} applications`} icon={BriefcaseBusiness} />
        <Stat label="Change" value={`${change >= 0 ? '+' : ''}${change}`} detail="Compared with previous period" icon={Percent} />
      </div>

      <Card>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold">Applications per week by job role</h3>
            <p className="mt-1 text-sm text-text-secondary">Weeks start on Monday in your local time zone.</p>
          </div>
          <div className="flex rounded-xl bg-surface-subtle/70 p-1" role="group" aria-label="Chart display mode">
            {(['stacked', 'grouped'] as const).map((value) => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize focus-visible:ring-2 focus-visible:ring-accent/60 ${mode === value ? 'bg-surface-solid text-text-primary shadow-glass1' : 'text-text-secondary'}`}>{value}</button>)}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Role legend">
          {stats.roles.map((role) => <button key={role.key} type="button" onClick={() => toggleRole(role.key)} aria-pressed={selectedRoles.some((selected) => selected.key === role.key)} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${selectedRoles.some((selected) => selected.key === role.key) ? 'border-border/40 text-text-primary' : 'border-border/20 text-text-muted opacity-50'}`}><span className="size-2 rounded-full" style={{ backgroundColor: roleColor(role.colorKey) }} />{role.name}</button>)}
        </div>
        <div className="mt-4 h-80 min-w-0 overflow-x-auto">
          <div className="h-full min-w-[620px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--color-border) / 0.18)" />
                <XAxis dataKey="label" tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-accent) / 0.08)' }} />
                <Legend content={() => null} />
                {selectedRoles.map((role, index) => <Bar key={role.key} dataKey={role.key} name={role.name} stackId={mode === 'stacked' ? 'roles' : undefined} fill={roleColor(role.colorKey)} radius={mode === 'stacked' ? undefined : [4, 4, 0, 0]} isAnimationActive={!reducedMotion} animationDuration={400}>{mode === 'stacked' && index === selectedRoles.length - 1 && <LabelList dataKey="total" position="top" fill="rgb(var(--color-text-primary))" fontSize={11} />}</Bar>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-2 text-right text-xs text-text-muted">Totals are shown in the tooltip for each week.</div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Applications by role</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={stats.roleTotals} layout="vertical" margin={{ left: 12, right: 28 }}>
                <CartesianGrid horizontal={false} stroke="rgb(var(--color-border) / 0.18)" />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 5, 5, 0]} isAnimationActive={!reducedMotion}>{stats.roleTotals.map((role) => <Cell key={role.key} fill={roleColor(role.colorKey)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold">Response rate by role</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={stats.roleTotals} layout="vertical" margin={{ left: 12, right: 28 }}>
                <CartesianGrid horizontal={false} stroke="rgb(var(--color-border) / 0.18)" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, 'Response rate']} />
                <Bar dataKey="responseRate" fill="rgb(var(--color-accent))" radius={[0, 5, 5, 0]} isAnimationActive={!reducedMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold">Status breakdown by week</h3>
        <div className="mt-4 h-64 min-w-0 overflow-x-auto">
          <div className="h-full min-w-[620px]">
            <ResponsiveContainer>
              <BarChart data={statusData}>
                <CartesianGrid vertical={false} stroke="rgb(var(--color-border) / 0.18)" />
                <XAxis dataKey="label" tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgb(var(--color-text-secondary))', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                {STATUS_BUCKETS.map((status) => <Bar key={status} dataKey={status} name={statusLabels[status]} stackId="status" fill={statusColor(status)} isAnimationActive={!reducedMotion} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card>
        <button type="button" className="flex w-full items-center justify-between text-left focus-visible:ring-2 focus-visible:ring-accent/60" aria-expanded={tableOpen} onClick={() => setTableOpen((open) => !open)}>
          <span><span className="font-semibold">Data table</span><span className="ml-2 text-sm text-text-muted">Week × role counts</span></span>
          {tableOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </button>
        {tableOpen && <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><caption className="sr-only">Weekly applications by role</caption><thead><tr className="border-b border-border/25 text-text-secondary"><th className="px-3 py-2 font-medium">Week</th>{stats.roles.map((role) => <th key={role.key} className="px-3 py-2 font-medium">{role.name}</th>)}<th className="px-3 py-2 font-medium">Total</th></tr></thead><tbody>{stats.weeks.map((week) => <tr key={week.key} className="border-b border-border/15"><th scope="row" className="px-3 py-2 font-medium">{week.label}</th>{stats.roles.map((role) => <td key={role.key} className="px-3 py-2 text-text-secondary">{week.byRole[role.key] ?? 0}</td>)}<td className="px-3 py-2 font-medium">{week.total}</td></tr>)}</tbody></table></div>}
      </Card>
    </div>
  )
}
