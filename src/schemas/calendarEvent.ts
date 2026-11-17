import { z } from 'zod'
import { CALENDAR_EVENT_TYPES } from '../types/calendar'

const validDateTime = (value: string) => !Number.isNaN(new Date(value).getTime())

export const CalendarEventInput = z.object({
  jobId: z.preprocess((value) => value === '' ? undefined : value, z.string().uuid().optional()),
  type: z.enum(CALENDAR_EVENT_TYPES),
  title: z.string().trim().min(1).max(160),
  startTime: z.string().refine(validDateTime, 'Enter a valid start date and time.'),
  endTime: z.string().optional().refine((value) => !value || validDateTime(value), 'Enter a valid end date and time.'),
  allDay: z.boolean().default(false),
  location: z.string().trim().max(240).optional(),
  meetingUrl: z.string().trim().max(1024).optional().refine((value) => !value || /^https?:\/\//i.test(value), 'Meeting link must use http or https.'),
  notes: z.string().trim().max(5000).optional(),
  completed: z.boolean().default(false),
  suggested: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.endTime && new Date(value.endTime) <= new Date(value.startTime)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'End time must be after the start time.' })
  }
})

export type CalendarEventInput = z.infer<typeof CalendarEventInput>
