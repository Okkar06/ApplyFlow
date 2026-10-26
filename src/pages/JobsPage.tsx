import { useMemo, useState } from 'react'
import { getCoreRowModel, useReactTable, flexRender, createColumnHelper } from '@tanstack/react-table'
import { GlassCard } from '../components/GlassCard'
import type { Job } from '../types/job'
import { toCsv } from '../utils/csv'

const col = createColumnHelper<Job>()

const seed: Job[] = [
  {
    id: '1',
    company: 'Acme',
    title: 'Frontend Engineer',
    location: 'Singapore',
    workMode: 'hybrid',
    status: 'applied',
    source: 'manual',
    importStatus: 'none',
    priority: 3,
    skills: ['react', 'typescript'],
  },
]

export const JobsPage = () => {
  const [rows] = useState<Job[]>(seed)
  const columns = useMemo(
    () => [
      col.accessor('company', { header: 'Company' }),
      col.accessor('title', { header: 'Title' }),
      col.accessor('location', { header: 'Location' }),
      col.accessor('workMode', { header: 'Work Mode' }),
      col.accessor('status', { header: 'Status' }),
      col.accessor('source', { header: 'Source' }),
      col.accessor('sourceUrl', { header: 'URL' }),
    ],
    [],
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  const exportCsv = () => {
    const csv = toCsv(rows.map((r) => ({ company: r.company, title: r.title, status: r.status, source: r.source, sourceUrl: r.sourceUrl })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jobs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Jobs</h2>
        <button type="button" onClick={exportCsv} className="rounded-lg border border-white/25 px-3 py-1 text-sm">Export CSV</button>
      </div>
      <div className="overflow-auto rounded-xl bg-black/20 p-2">
        <table className="min-w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-2 py-2 font-medium text-slate-300">{flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2">{String(flexRender(cell.column.columnDef.cell, cell.getContext()) ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
