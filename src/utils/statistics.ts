import type { Job, JobStatus } from '../types/job'

export type StatisticsRange = 4 | 8 | 12 | 'all'
export type RoleBucket = { key: string; name: string; colorKey: string; count: number }
export type WeekBucket = {
  key: string
  label: string
  start: Date
  end: Date
  total: number
  byRole: Record<string, number>
  byStatus: Record<string, number>
}

export const ROLE_COLOR_KEYS = ['one', 'two', 'three', 'four', 'five', 'six', 'other'] as const
export const STATUS_BUCKETS = ['applied', 'interview', 'offer', 'rejected', 'ghosted'] as const

const startOfLocalDay = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export const startOfMonday = (date: Date) => {
  const result = startOfLocalDay(date)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

const dateFromValue = (value?: string) => {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

export const normalizeRole = (title: string) => {
  const normalized = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(senior|sr|junior|jr|lead|principal|staff|ii|iii|iv)\b/g, ' ')
    .replace(/\b(developer|dev)\b/g, 'developer')
    .replace(/\b(engineer|engineering)\b/g, 'engineer')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || 'untitled role'
}

export const displayRole = (title: string) => titleCase(title.trim().replace(/\s+/g, ' ')) || 'Untitled role'

const statusBucket = (status: JobStatus) => status === 'saved' ? 'applied' : status

const formatWeekLabel = (start: Date) => {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
  return `${formatter.format(start)}–${formatter.format(end)}`
}

const weekKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateRange = (jobs: Job[], range: StatisticsRange, now = new Date()) => {
  const current = startOfMonday(now)
  if (range !== 'all') return Array.from({ length: range }, (_, index) => {
    const start = new Date(current)
    start.setDate(start.getDate() - (range - index - 1) * 7)
    return start
  })

  const datedJobs = jobs.map((job) => dateFromValue(job.appliedDate)).filter((date): date is Date => Boolean(date))
  const first = datedJobs.length ? startOfMonday(new Date(Math.min(...datedJobs.map((date) => date.getTime())))) : current
  const weeks: Date[] = []
  for (const cursor = new Date(first); cursor <= current; cursor.setDate(cursor.getDate() + 7)) weeks.push(new Date(cursor))
  return weeks
}

export const buildStatistics = (jobs: Job[], range: StatisticsRange, now = new Date()) => {
  const starts = dateRange(jobs, range, now)
  const roleCounts = new Map<string, { name: string; count: number }>()
  jobs.forEach((job) => {
    const date = dateFromValue(job.appliedDate)
    if (!date) return
    const key = normalizeRole(job.title)
    const current = roleCounts.get(key)
    roleCounts.set(key, { name: current?.name ?? displayRole(job.title), count: (current?.count ?? 0) + 1 })
  })
  const topRoles = [...roleCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 6)
  const topRoleKeys = new Set(topRoles.map(([key]) => key))
  const roles: RoleBucket[] = topRoles.map(([key, value], index) => ({ key, ...value, colorKey: ROLE_COLOR_KEYS[index] }))
  const otherCount = [...roleCounts.entries()].filter(([key]) => !topRoleKeys.has(key)).reduce((sum, [, value]) => sum + value.count, 0)
  if (otherCount) roles.push({ key: 'other', name: 'Other', colorKey: 'other', count: otherCount })

  const roleForJob = (job: Job) => topRoleKeys.has(normalizeRole(job.title)) ? normalizeRole(job.title) : 'other'
  const weeks: WeekBucket[] = starts.map((start) => {
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const inWeek = jobs.filter((job) => {
      const date = dateFromValue(job.appliedDate)
      return date ? date >= start && date < end : false
    })
    const byRole: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    inWeek.forEach((job) => {
      const role = roleForJob(job)
      const status = statusBucket(job.status)
      byRole[role] = (byRole[role] ?? 0) + 1
      byStatus[status] = (byStatus[status] ?? 0) + 1
    })
    return { key: weekKey(start), label: formatWeekLabel(start), start, end: new Date(end.getTime() - 1), total: inWeek.length, byRole, byStatus }
  })

  const selectedJobs = jobs.filter((job) => weeks.some((week) => {
    const date = dateFromValue(job.appliedDate)
    return date ? date >= week.start && date <= week.end : false
  }))
  const roleTotals = roles.map((role) => {
    const matching = selectedJobs.filter((job) => roleForJob(job) === role.key)
    const responded = matching.filter((job) => ['interview', 'offer', 'rejected'].includes(job.status)).length
    return { ...role, count: matching.length, responseRate: matching.length ? Math.round((responded / matching.length) * 100) : 0 }
  }).filter((role) => role.count > 0)

  return { weeks, roles, roleTotals, selectedJobs }
}
