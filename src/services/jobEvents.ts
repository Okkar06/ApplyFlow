import { supabase } from '../lib/supabase'
import type { JobEvent } from '../types/jobEvent'
import type { JobStatus } from '../types/job'

type JobEventRow = { id: string; job_id: string; event_type: string; payload: { from?: string; to?: string; note?: string }; created_at: string }

export const listJobEvents = async (jobId: string): Promise<JobEvent[]> => {
  const { data, error } = await supabase.from('job_events').select('id, job_id, event_type, payload, created_at').eq('job_id', jobId).order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load status timeline: ${error.message}`)
  return (data as JobEventRow[]).map((row) => ({ id: row.id, jobId: row.job_id, eventType: row.event_type, fromStatus: row.payload.from as JobStatus | undefined, toStatus: row.payload.to as JobStatus | undefined, note: row.payload.note, createdAt: row.created_at }))
}
