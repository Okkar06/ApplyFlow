import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from '@tanstack/react-table'
import { ArrowDownUp, Plus, Search } from 'lucide-react'
import downloadAnimation from 'react-useanimations/lib/download'
import briefcaseAnimation from 'react-useanimations/lib/briefcase'
import zoomInAnimation from 'react-useanimations/lib/zoomIn'
import { Link } from 'react-router-dom'
import { AnimatedButton, Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table } from '../components/ui'
import type { Job } from '../types/job'
import { JOB_SOURCES, JOB_STATUSES } from '../types/job'
import { listJobs } from '../services/jobs'
import { toCsv } from '../utils/csv'

const column = createColumnHelper<Job>()
const statusLabels: Record<Job['status'], string> = { saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', ghosted: 'Ghosted' }
const sourceLabels: Record<Job['source'], string> = { manual: 'Manual', linkedin: 'LinkedIn', jobstreet: 'JobStreet', indeed: 'Indeed', glassdoor: 'Glassdoor', greenhouse: 'Greenhouse', lever: 'Lever', workday: 'Workday', mcf: 'MyCareersFuture', company_site: 'Company site', other: 'Other' }

const isWithinDays = (value: string | undefined, days: string) => {
  if (days === 'all' || !value) return true
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - Number(days))
  return new Date(`${value}T00:00:00`) >= cutoff
}

export const JobsPage = () => {
  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [role, setRole] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'appliedDate', desc: true }])

  const filteredRows = useMemo(() => rows.filter((job) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [job.company, job.title, job.location].some((value) => value.toLowerCase().includes(query))
    const matchesStatus = status === 'all' || job.status === status
    const matchesSource = source === 'all' || job.source === source
    const matchesRole = !role.trim() || job.title.toLowerCase().includes(role.trim().toLowerCase())
    return matchesSearch && matchesStatus && matchesSource && matchesRole && isWithinDays(job.appliedDate, dateRange)
  }), [dateRange, role, rows, search, source, status])

  const columns = useMemo(() => [
    column.accessor('company', { header: 'Company', cell: ({ row, getValue }) => <Link className="font-medium text-text-primary hover:text-accent" to={`/jobs/${row.original.id}`}>{getValue()}</Link> }),
    column.accessor('title', { header: 'Role', cell: ({ row, getValue }) => <Link className="text-text-primary hover:text-accent" to={`/jobs/${row.original.id}`}>{getValue()}</Link> }),
    column.accessor('location', { header: 'Location' }),
    column.accessor('status', { header: 'Status', cell: ({ getValue }) => <Badge status={getValue()}>{statusLabels[getValue()]}</Badge> }),
    column.accessor('source', { header: 'Source', cell: ({ getValue }) => sourceLabels[getValue()] }),
    column.accessor('appliedDate', { header: 'Applied', cell: ({ getValue }) => getValue() || '—' }),
  ], [])
  const table = useReactTable({ data: filteredRows, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() })
  const visibleRows = table.getRowModel().rows.map((row) => row.original)

  const exportCsv = () => {
    const csv = toCsv(visibleRows.map((row) => ({ company: row.company, title: row.title, status: row.status, source: row.source, sourceUrl: row.sourceUrl })))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'jobs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Applications</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Jobs</h1><p className="mt-1 text-sm text-text-secondary">Search and manage every opportunity in one place.</p></div>
        <div className="flex gap-2"><AnimatedButton variant="secondary" animation={downloadAnimation} onClick={exportCsv} disabled={!visibleRows.length}>Export CSV</AnimatedButton><Link to="/jobs/new"><Button><Plus size={16} aria-hidden="true" />Add Job</Button></Link></div>
      </div>
      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative block xl:col-span-2"><span className="sr-only">Search jobs</span><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, role, or location" className="pl-9" /></label>
          <label><span className="sr-only">Status</span><Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{JOB_STATUSES.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</Select></label>
          <label><span className="sr-only">Source</span><Select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All sources</option>{JOB_SOURCES.map((value) => <option key={value} value={value}>{sourceLabels[value]}</option>)}</Select></label>
          <label><span className="sr-only">Date range</span><Select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select></label>
        </div>
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Role</span><Input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. frontend" className="w-44" /></label><p className="text-xs text-text-muted">{filteredRows.length} matching applications</p></div>
      </Card>
      {isLoading && <Card><Skeleton className="h-64" /></Card>}
      {error && <Card><p role="alert" className="text-sm text-rejected">{error instanceof Error ? error.message : 'Unable to load jobs.'}</p></Card>}
      {!isLoading && !error && !rows.length && <Card><EmptyState animation={briefcaseAnimation} title="No applications yet" description="Start tracking an opportunity and it will appear here." action={<Link to="/jobs/new"><Button><Plus size={16} aria-hidden="true" />Add your first job</Button></Link>} /></Card>}
      {!isLoading && !error && !!rows.length && !filteredRows.length && <Card><EmptyState animation={zoomInAnimation} title="No matching jobs" description="Try clearing a filter or searching for a different role." /></Card>}
      {!isLoading && !error && !!filteredRows.length && <Card className="p-3 sm:p-5">      <div className="hidden md:block"><Table><thead><tr>{table.getHeaderGroups()[0].headers.map((header) => <th key={header.id} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"><button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 rounded focus-visible:ring-2 focus-visible:ring-accent/60">{flexRender(header.column.columnDef.header, header.getContext())}<ArrowDownUp size={13} aria-hidden="true" /></button></th>)}</tr></thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-t border-border/20 hover:bg-surface-subtle/40">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-3 text-text-secondary">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></Table></div><div className="grid gap-3 md:hidden">{visibleRows.map((job) => <Link to={`/jobs/${job.id}`} key={job.id} className="rounded-2xl border border-border/25 bg-surface-subtle/30 p-4 hover:bg-surface-subtle/50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-text-primary">{job.title}</h2><p className="truncate text-sm text-text-secondary">{job.company}</p></div><Badge status={job.status}>{statusLabels[job.status]}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted"><span>{job.location || 'Location not set'}</span><span>{sourceLabels[job.source]}</span><span>{job.appliedDate || 'Not applied'}</span></div></Link>)}</div></Card>}
    </div>
  )
}
