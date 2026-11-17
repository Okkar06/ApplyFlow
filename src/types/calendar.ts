export const CALENDAR_EVENT_TYPES = ['interview', 'follow_up', 'application_deadline', 'offer_response_deadline', 'other'] as const
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number]

export type CalendarEvent = {
  id: string
  userId: string
  jobId?: string
  type: CalendarEventType
  title: string
  startTime: string
  endTime?: string
  allDay: boolean
  location?: string
  meetingUrl?: string
  notes?: string
  completed: boolean
  suggested: boolean
  createdAt: string
  updatedAt: string
}
