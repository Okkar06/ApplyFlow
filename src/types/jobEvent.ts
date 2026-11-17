import type { JobStatus } from './job'

export type JobEvent = {
  id: string
  jobId: string
  eventType: string
  fromStatus?: JobStatus
  toStatus?: JobStatus
  note?: string
  createdAt: string
}
