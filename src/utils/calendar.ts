import type { CalendarEvent } from '../types/calendar'

export const startOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export const startOfMonday = (value: Date) => {
  const date = startOfDay(value)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

export const addDays = (value: Date, amount: number) => {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

export const sameDay = (left: Date, right: Date) => startOfDay(left).getTime() === startOfDay(right).getTime()

export const monthDays = (value: Date) => {
  const first = new Date(value.getFullYear(), value.getMonth(), 1)
  const start = startOfMonday(first)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export const formatEventTime = (event: CalendarEvent) => event.allDay ? 'All day' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startTime))

export const formatMonth = (value: Date) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(value)
