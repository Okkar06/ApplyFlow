import { supabase } from '../lib/supabase'
import { CalendarEventInput } from '../schemas/calendarEvent'
import type { CalendarEvent } from '../types/calendar'

type CalendarEventRow = {
  id: string
  user_id: string
  job_id: string | null
  type: CalendarEvent['type']
  title: string
  start_time: string
  end_time: string | null
  all_day: boolean
  location: string | null
  meeting_url: string | null
  notes: string | null
  completed: boolean
  suggested: boolean
  created_at: string
  updated_at: string
}

const toEvent = (row: CalendarEventRow): CalendarEvent => ({
  id: row.id,
  userId: row.user_id,
  jobId: row.job_id ?? undefined,
  type: row.type,
  title: row.title,
  startTime: row.start_time,
  endTime: row.end_time ?? undefined,
  allDay: row.all_day,
  location: row.location ?? undefined,
  meetingUrl: row.meeting_url ?? undefined,
  notes: row.notes ?? undefined,
  completed: row.completed,
  suggested: row.suggested,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toRow = (input: CalendarEventInput) => ({
  job_id: input.jobId ?? null,
  type: input.type,
  title: input.title,
  start_time: new Date(input.startTime).toISOString(),
  end_time: input.endTime ? new Date(input.endTime).toISOString() : null,
  all_day: input.allDay,
  location: input.location || null,
  meeting_url: input.meetingUrl || null,
  notes: input.notes || null,
  completed: input.completed,
  suggested: input.suggested,
})

export const listCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase.from('calendar_events').select('*').order('start_time', { ascending: true })
  if (error) throw new Error(`Unable to load calendar events: ${error.message}`)
  return (data as CalendarEventRow[]).map(toEvent)
}

export const createCalendarEvent = async (input: CalendarEventInput): Promise<CalendarEvent> => {
  const parsed = CalendarEventInput.parse(input)
  const { data, error } = await supabase.from('calendar_events').insert(toRow(parsed)).select('*').single()
  if (error) throw new Error(`Unable to create calendar event: ${error.message}`)
  return toEvent(data as CalendarEventRow)
}

export const updateCalendarEvent = async (id: string, input: CalendarEventInput): Promise<CalendarEvent> => {
  const parsed = CalendarEventInput.parse(input)
  const { data, error } = await supabase.from('calendar_events').update({ ...toRow(parsed), updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error) throw new Error(`Unable to update calendar event: ${error.message}`)
  return toEvent(data as CalendarEventRow)
}

export const deleteCalendarEvent = async (id: string) => {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw new Error(`Unable to delete calendar event: ${error.message}`)
}

export const completeCalendarEvent = async (event: CalendarEvent) => updateCalendarEvent(event.id, {
  jobId: event.jobId,
  type: event.type,
  title: event.title,
  startTime: event.startTime,
  endTime: event.endTime,
  allDay: event.allDay,
  location: event.location,
  meetingUrl: event.meetingUrl,
  notes: event.notes,
  completed: !event.completed,
  suggested: false,
})
