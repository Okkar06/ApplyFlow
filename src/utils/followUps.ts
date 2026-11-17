import type { Job } from '../types/job'
import type { CalendarEvent } from '../types/calendar'

export const getFollowUpSuggestions = (jobs: Job[], now = new Date()): CalendarEvent[] => {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 7)
  cutoff.setHours(9, 0, 0, 0)
  return jobs.filter((job) => ['saved', 'applied'].includes(job.status) && job.appliedDate && new Date(`${job.appliedDate}T00:00:00`) <= cutoff).map((job) => ({
    id: `suggested-${job.id}`,
    userId: '',
    jobId: job.id,
    type: 'follow_up',
    title: `Follow up · ${job.company}, ${job.title}`,
    startTime: cutoff.toISOString(),
    allDay: false,
    completed: false,
    suggested: true,
    createdAt: '',
    updatedAt: '',
  }))
}
