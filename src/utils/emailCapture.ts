import type { JobStatus } from '../types/job'

export type ParsedEmailCapture = {
  company: string
  title: string
  status: JobStatus
  sourceUrl?: string
  confidence: number
}

const clean = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 120)

const statusFromText = (value: string): JobStatus => {
  if (/interview|next steps|phone screen/i.test(value)) return 'interview'
  if (/offer|congratulations/i.test(value)) return 'offer'
  if (/not moving forward|rejection|unsuccessful|regret to inform/i.test(value)) return 'rejected'
  return 'applied'
}

const companyFromSender = (sender: string) => {
  const domain = sender.match(/@([a-z0-9.-]+)/i)?.[1]?.split('.')[0]
  return domain ? clean(domain.replace(/[-_]/g, ' ')) : ''
}

export const parseForwardedEmail = (input: { sender: string; subject: string; body: string }): ParsedEmailCapture => {
  const text = `${input.subject}\n${input.body}`
  const roleMatch = text.match(/(?:application received|thank you for applying|applied for|application for)\s*[-:]?\s*["“]?([^"\n“”]+?)(?:["”]?\s+(?:at|with)\s+([A-Z][^\n,.]+))?(?:[.\n]|$)/i)
  const explicitRole = text.match(/(?:role|position|job title)\s*[-:]\s*([^\n]+)/i)?.[1]
  const title = clean(explicitRole || roleMatch?.[1] || '')
  const company = clean(roleMatch?.[2] || text.match(/(?:company|employer)\s*[-:]\s*([^\n]+)/i)?.[1] || companyFromSender(input.sender))
  const sourceUrl = text.match(/https?:\/\/[^\s<>"')]+/i)?.[0]
  const confidence = title && company ? (sourceUrl ? 0.9 : 0.7) : 0.35
  return { company, title, status: statusFromText(text), sourceUrl, confidence }
}
