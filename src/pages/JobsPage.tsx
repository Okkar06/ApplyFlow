import { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, useReactTable, flexRender, createColumnHelper } from '@tanstack/react-table'
import { GlassCard } from '../components/GlassCard'
import type { Job } from '../types/job'
import { listJobs } from '../services/jobs'
import { toCsv } from '../utils/csv'

const col = createColumnHelper<Job>()

export const JobsPage = () => {
  const [rows, setRows] = useState<Job[]>([])
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void listJobs().then(setRows).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load jobs.')).finally(() => setLoading(false))
  }, [])
  const columns = useMemo(() => [
    col.accessor('company', { header: 'Company' }),
    col.accessor('title', { header: 'Title' }),
    col.accessor('location', { header: 'Location' }),
    col.accessor('status', { header: 'Status' }),
    col.accessor('source', { header: 'Source' }),
    col.accessor('resumeVersionId', { header: 'Resume' }),
  ], [])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })
  const exportCsv = () => {
    const csv = toCsv(rows.map((row) => ({ company: row.company, title: row.title, status: row.status, source: row.source, sourceUrl: row.sourceUrl })))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'jobs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Jobs</h2><button type="button" onClick={exportCsv} disabled={!rows.length} className="rounded-lg border border-border/35 px-3 py-1 text-sm disabled:opacity-50">Export CSV</button></div>
      {loading && <p className="text-sm text-text-secondary">Loading jobs...</p>}
      {error && <p role="alert" className="text-sm text-rejected">{error}</p>}
      {!loading && !error && !rows.length && <p className="text-sm text-text-secondary">No jobs saved yet.</p>}
      {!!rows.length && <div className="surface-solid overflow-auto rounded-xl p-2"><table className="min-w-full text-left text-sm"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="px-2 py-2 font-medium text-text-secondary">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-t border-border/20">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-2 py-2">{String(flexRender(cell.column.columnDef.cell, cell.getContext()) ?? '')}</td>)}</tr>)}</tbody></table></div>}
    </GlassCard>
  )
}
