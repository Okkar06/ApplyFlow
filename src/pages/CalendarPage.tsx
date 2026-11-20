import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '../components/ui'
import { CalendarEventInput, type CalendarEventInput as CalendarEventInputType } from '../schemas/calendarEvent'
import type { z } from 'zod'
import { completeCalendarEvent, createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from '../services/calendarEvents'
import { listJobs } from '../services/jobs'
import { CALENDAR_EVENT_TYPES, type CalendarEvent, type CalendarEventType } from '../types/calendar'
import { addDays, formatEventTime, formatMonth, monthDays, sameDay, startOfMonday } from '../utils/calendar'
import { getFollowUpSuggestions } from '../utils/followUps'

const eventLabels: Record<CalendarEventType, string> = {
  interview: 'Interview',
  follow_up: 'Follow-up',
  application_deadline: 'Application deadline',
  offer_response_deadline: 'Offer response deadline',
  other: 'Other',
}
const eventClass: Record<CalendarEventType, string> = {
  interview: 'border-calendar-interview/30 bg-calendar-interview/15 text-calendar-interview',
  follow_up: 'border-calendar-follow-up/30 bg-calendar-follow-up/15 text-calendar-follow-up',
  application_deadline: 'border-calendar-application/30 bg-calendar-application/15 text-calendar-application',
  offer_response_deadline: 'border-calendar-offer/30 bg-calendar-offer/15 text-calendar-offer',
  other: 'border-calendar-other/30 bg-calendar-other/15 text-calendar-other',
}

const toLocalInput = (value: string) => {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const defaultStart = (date: Date) => {
  const value = new Date(date)
  value.setHours(9, 0, 0, 0)
  return toLocalInput(value.toISOString())
}

const EventForm = ({ jobs, event, initialDate, initialJobId, onSave, onClose, saving }: { jobs: Awaited<ReturnType<typeof listJobs>>; event?: CalendarEvent; initialDate?: Date; initialJobId?: string; onSave: (value: CalendarEventInputType) => void; onClose: () => void; saving: boolean }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof CalendarEventInput>, unknown, CalendarEventInputType>({
    resolver: zodResolver(CalendarEventInput),
    defaultValues: event ? {
      jobId: event.jobId,
      type: event.type,
      title: event.title,
      startTime: toLocalInput(event.startTime),
      endTime: event.endTime ? toLocalInput(event.endTime) : '',
      allDay: event.allDay,
      location: event.location ?? '',
      meetingUrl: event.meetingUrl ?? '',
      notes: event.notes ?? '',
      completed: event.completed,
      suggested: false,
    } : {
      jobId: initialJobId,
      type: 'interview',
      title: '',
      startTime: defaultStart(initialDate ?? new Date()),
      endTime: '',
      allDay: false,
      location: '',
      meetingUrl: '',
      notes: '',
      completed: false,
      suggested: false,
    },
  })
  const field = (name: keyof CalendarEventInputType) => errors[name]?.message
  return <form className="space-y-4" onSubmit={handleSubmit(onSave)}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span className="font-medium text-text-secondary">Event type</span><Select {...register('type')}>{CALENDAR_EVENT_TYPES.map((type) => <option key={type} value={type}>{eventLabels[type]}</option>)}</Select></label>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span className="font-medium text-text-secondary">Title</span><Input {...register('title')} placeholder="Interview · Acme Corp, Frontend Developer" />{field('title') && <span className="text-xs text-rejected">{field('title')}</span>}</label>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span className="font-medium text-text-secondary">Linked job</span><Select {...register('jobId')}><option value="">No linked job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.company} · {job.title}</option>)}</Select></label>
      <label className="grid gap-1.5 text-sm"><span className="font-medium text-text-secondary">Starts</span><Input type="datetime-local" {...register('startTime')} />{field('startTime') && <span className="text-xs text-rejected">{field('startTime')}</span>}</label>
      <label className="grid gap-1.5 text-sm"><span className="font-medium text-text-secondary">Ends</span><Input type="datetime-local" {...register('endTime')} />{field('endTime') && <span className="text-xs text-rejected">{field('endTime')}</span>}</label>
      <label className="flex items-center gap-2 text-sm text-text-secondary sm:col-span-2"><input type="checkbox" {...register('allDay')} /> All-day event</label>
      <label className="grid gap-1.5 text-sm"><span className="font-medium text-text-secondary">Location</span><Input {...register('location')} placeholder="Office or video call" /></label>
      <label className="grid gap-1.5 text-sm"><span className="font-medium text-text-secondary">Meeting link</span><Input {...register('meetingUrl')} placeholder="https://..." />{field('meetingUrl') && <span className="text-xs text-rejected">{field('meetingUrl')}</span>}</label>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span className="font-medium text-text-secondary">Notes</span><Textarea className="min-h-20" {...register('notes')} placeholder="What should you prepare?" /></label>
    </div>
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save event'}</Button></div>
  </form>
}

export const CalendarPage = () => {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<'month' | 'week' | 'agenda'>(() => window.innerWidth < 640 ? 'agenda' : 'month')
  const [cursor, setCursor] = useState(new Date())
  const [selected, setSelected] = useState<CalendarEvent>()
  const [formDate, setFormDate] = useState<Date>()
  const [formOpen, setFormOpen] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(new Set(CALENDAR_EVENT_TYPES))
  const { data: events = [], isError } = useQuery({ queryKey: ['calendar-events'], queryFn: listCalendarEvents, retry: false })
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({ queryKey: ['jobs'], queryFn: listJobs, retry: false })
  const suggestions = useMemo(() => getFollowUpSuggestions(jobs), [jobs])
  const preselectedJobId = searchParams.get('job') ?? undefined
  const visibleEvents = useMemo(() => [...events, ...suggestions].filter((event) => !dismissedSuggestions.has(event.id) && activeTypes.has(event.type)), [events, suggestions, activeTypes, dismissedSuggestions])
  const jobMap = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs])
  const mutation = useMutation({
    mutationFn: (input: { id?: string; value: CalendarEventInputType }) => input.id ? updateCalendarEvent(input.id, input.value) : createCalendarEvent(input.value),
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] })
      const previous = queryClient.getQueryData<CalendarEvent[]>(['calendar-events']) ?? []
      const optimistic: CalendarEvent = { id: id ?? `local-${Date.now()}`, userId: '', jobId: value.jobId, type: value.type, title: value.title, startTime: new Date(value.startTime).toISOString(), endTime: value.endTime ? new Date(value.endTime).toISOString() : undefined, allDay: value.allDay, location: value.location, meetingUrl: value.meetingUrl, notes: value.notes, completed: value.completed, suggested: false, createdAt: '', updatedAt: '' }
      queryClient.setQueryData(['calendar-events'], id ? previous.map((event) => event.id === id ? optimistic : event) : [...previous, optimistic])
      return { previous }
    },
    onError: (_error, _input, context) => queryClient.setQueryData(['calendar-events'], context?.previous ?? []),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  })
  const removeMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] })
      const previous = queryClient.getQueryData<CalendarEvent[]>(['calendar-events']) ?? []
      queryClient.setQueryData(['calendar-events'], previous.filter((event) => event.id !== id))
      return { previous }
    },
    onError: (_error, _id, context) => queryClient.setQueryData(['calendar-events'], context?.previous ?? []),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  })
  const completeMutation = useMutation({ mutationFn: completeCalendarEvent, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['calendar-events'] }) })

  const openNew = (date?: Date) => { setSelected(undefined); setFormDate(date ?? new Date()); setFormOpen(true) }
  const save = (value: CalendarEventInputType) => { mutation.mutate({ id: selected && !selected.suggested ? selected.id : undefined, value }, { onSuccess: () => { setFormOpen(false); setSelected(undefined) } }) }
  const moveCursor = (amount: number) => setCursor((value) => view === 'month' ? new Date(value.getFullYear(), value.getMonth() + amount, 1) : addDays(value, amount * (view === 'week' ? 7 : 1)))
  const eventLabel = (event: CalendarEvent) => {
    const job = event.jobId ? jobMap.get(event.jobId) : undefined
    return job ? `${eventLabels[event.type]} · ${job.company}, ${job.title}` : event.title
  }
  const days = monthDays(cursor)
  const agendaEvents = visibleEvents.filter((event) => new Date(event.startTime) >= new Date()).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const weekStart = startOfMonday(cursor)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  if (jobsLoading) return <div className="space-y-5"><Skeleton className="h-20" /><Skeleton className="h-[620px]" /></div>

  return <div className="space-y-5 pb-8">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-accent">Planning</p><h1 className="mt-1 text-2xl font-semibold">Calendar</h1><p className="mt-1 text-sm text-text-secondary">Keep interviews, deadlines, and follow-ups in one place.</p></div><Button onClick={() => openNew()}><Plus size={17} aria-hidden="true" /> Add event</Button></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
    <Card className="!p-0">
      <div className="border-b border-border/20 bg-surface-panel/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Button variant="secondary" onClick={() => setCursor(new Date())}>Today</Button><button type="button" aria-label="Previous period" onClick={() => moveCursor(-1)} className="grid size-9 place-items-center rounded-xl border border-border/35 text-text-secondary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-accent/60"><ChevronLeft size={17} aria-hidden="true" /></button><button type="button" aria-label="Next period" onClick={() => moveCursor(1)} className="grid size-9 place-items-center rounded-xl border border-border/35 text-text-secondary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-accent/60"><ChevronRight size={17} aria-hidden="true" /></button><h2 className="ml-1 text-xl font-semibold tracking-tight">{view === 'month' ? formatMonth(cursor) : view === 'week' ? `Week of ${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Upcoming agenda'}</h2></div><div className="flex rounded-xl bg-surface-subtle/70 p-1" role="group" aria-label="Calendar view"><button type="button" onClick={() => setView('month')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === 'month' ? 'bg-surface-solid text-text-primary shadow-glass1' : 'text-text-secondary'}`}>Month</button><button type="button" onClick={() => setView('week')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === 'week' ? 'bg-surface-solid text-text-primary shadow-glass1' : 'text-text-secondary'}`}>Week</button><button type="button" onClick={() => setView('agenda')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === 'agenda' ? 'bg-surface-solid text-text-primary shadow-glass1' : 'text-text-secondary'}`}>Agenda</button></div></div>
        {isError && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-calendar-application/30 bg-calendar-application/10 px-3 py-2 text-xs text-calendar-application"><AlertCircle size={15} aria-hidden="true" /> Calendar events are not available yet. You can still browse dates; apply the calendar migration to save events.</div>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/20 pt-4" aria-label="Event type filters">{CALENDAR_EVENT_TYPES.map((type) => <button key={type} type="button" aria-pressed={activeTypes.has(type)} onClick={() => setActiveTypes((current) => { const next = new Set(current); if (next.has(type)) next.delete(type); else next.add(type); return next })} className={`rounded-full border px-3 py-1.5 text-xs ${activeTypes.has(type) ? eventClass[type] : 'border-border/20 text-text-muted opacity-50'}`}>{eventLabels[type]}</button>)}</div>
      {view === 'month' && <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-border/25 sm:mx-5 sm:mb-5"><div className="grid grid-cols-7 border-b border-border/25 bg-surface-subtle/45">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="p-2 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const dayEvents = visibleEvents.filter((event) => sameDay(new Date(event.startTime), day)); const inMonth = day.getMonth() === cursor.getMonth(); const today = sameDay(day, new Date()); return <button type="button" key={day.toISOString()} onClick={() => openNew(day)} className={`group min-h-28 border-b border-r border-border/20 p-2 text-left align-top transition-colors hover:bg-surface-subtle/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 ${inMonth ? 'bg-surface-solid/20' : 'bg-surface-subtle/15 text-text-muted'} ${today ? 'bg-accent/10' : ''}`}><span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${today ? 'bg-accent text-on-accent shadow-glass1' : 'group-hover:bg-surface-elevated'}`}>{day.getDate()}</span><div className="mt-1.5 space-y-1">{dayEvents.slice(0, 3).map((event) => <span key={event.id} role="button" tabIndex={0} onClick={(click) => { click.stopPropagation(); setSelected(event); setFormOpen(true) }} className={`block truncate rounded-md border-l-2 px-1.5 py-1 text-[10px] font-medium ${eventClass[event.type]}`}>{eventLabel(event)}</span>)}{dayEvents.length > 3 && <span className="block px-1 text-[10px] font-medium text-text-muted">+{dayEvents.length - 3} more</span>}</div></button> })}</div></div>}
      {view === 'week' && <div className="mt-5 grid grid-cols-7 overflow-x-auto rounded-2xl border border-border/25">{weekDays.map((day) => <div key={day.toISOString()} className={`min-h-96 min-w-32 border-r border-border/20 p-2 ${sameDay(day, new Date()) ? 'bg-accent/10' : ''}`}><button type="button" onClick={() => openNew(day)} className="w-full text-left text-xs font-semibold text-text-secondary">{day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</button><div className="mt-3 space-y-2">{visibleEvents.filter((event) => sameDay(new Date(event.startTime), day)).map((event) => <button type="button" key={event.id} onClick={() => { setSelected(event); setFormOpen(true) }} className={`w-full rounded-lg border p-2 text-left text-xs ${eventClass[event.type]}`}><span className="font-medium">{formatEventTime(event)}</span><span className="mt-1 block">{eventLabel(event)}</span></button>)}</div></div>)}</div>}
      {view === 'agenda' && <div className="mt-5 space-y-2">{agendaEvents.length ? agendaEvents.map((event) => <button key={event.id} type="button" onClick={() => { setSelected(event); setFormOpen(true) }} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${eventClass[event.type]}`}><Clock3 size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-medium">{eventLabel(event)}</span><span className="mt-1 block text-xs opacity-80">{new Date(event.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: event.allDay ? undefined : 'short' })}</span></span>{event.suggested && <span className="text-xs font-medium">Suggested</span>}</button>) : <EmptyState icon={CalendarDays} title="Your agenda is clear" description="Schedule an interview or follow-up to see it here." action={<Button onClick={() => openNew()}><Plus size={15} aria-hidden="true" /> Schedule event</Button>} />}</div>}
    </Card>
    <Card className="h-fit !p-0">
      <div className="border-b border-border/20 bg-surface-panel/60 p-4"><h3 className="font-semibold">Upcoming</h3><p className="mt-1 text-xs text-text-muted">Your next calendar events</p></div>
      <div className="space-y-2 p-4">{visibleEvents.filter((event) => new Date(event.startTime) >= new Date()).slice(0, 6).map((event) => <button key={event.id} type="button" onClick={() => { setSelected(event); setFormOpen(true) }} className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left ${eventClass[event.type]}`}><span className="mt-0.5 size-2 shrink-0 rounded-full bg-current" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{eventLabel(event)}</span><span className="mt-1 block text-[11px] opacity-80">{new Date(event.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></span></button>)}{!visibleEvents.some((event) => new Date(event.startTime) >= new Date()) && <p className="rounded-xl bg-surface-subtle/45 p-3 text-xs text-text-secondary">No upcoming events. Click any day to schedule one.</p>}</div>
      <div className="border-t border-border/20 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Calendars</p><div className="space-y-2">{CALENDAR_EVENT_TYPES.map((type) => <button key={type} type="button" aria-pressed={activeTypes.has(type)} onClick={() => setActiveTypes((current) => { const next = new Set(current); if (next.has(type)) next.delete(type); else next.add(type); return next })} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs text-text-secondary hover:bg-surface-subtle/50"><span className={`size-2.5 rounded-full ${activeTypes.has(type) ? eventClass[type].split(' ')[1] : 'bg-text-muted/30'}`} />{eventLabels[type]}</button>)}</div></div>
    </Card>
    </div>
    {selected && <Modal open={formOpen} title={selected.suggested ? 'Confirm follow-up' : 'Edit event'} onClose={() => { setFormOpen(false); setSelected(undefined) }}><EventForm jobs={jobs} event={selected} onSave={save} onClose={() => setFormOpen(false)} saving={mutation.isPending} /><div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-border/20 pt-4"><div className="flex gap-2">{selected.suggested ? <Button variant="ghost" onClick={() => { setDismissedSuggestions((current) => new Set(current).add(selected.id)); setFormOpen(false); setSelected(undefined) }}>Dismiss suggestion</Button> : <Button variant="secondary" onClick={() => completeMutation.mutate(selected)}><Check size={15} aria-hidden="true" /> {selected.completed ? 'Mark incomplete' : 'Mark complete'}</Button>}{selected.jobId && <Button variant="ghost" onClick={() => window.location.hash = `#/jobs/${selected.jobId}/edit`}><ExternalLink size={15} aria-hidden="true" /> Open job</Button>}</div>{!selected.suggested && <Button variant="danger" onClick={() => { removeMutation.mutate(selected.id); setFormOpen(false); setSelected(undefined) }}><Trash2 size={15} aria-hidden="true" /> Delete</Button>}</div></Modal>}
    {!selected && <Modal open={formOpen} title="Add calendar event" onClose={() => setFormOpen(false)}><EventForm jobs={jobs} initialDate={formDate} initialJobId={preselectedJobId} onSave={save} onClose={() => setFormOpen(false)} saving={mutation.isPending} /></Modal>}
  </div>
}
