import { extractBulletRequirements, hasSubmissionConfirmation, parseJsonLdScripts, parseSalaryValue, type JsonLdJob } from './extractorUtils'
import { extractSiteFields } from './siteExtractors'

type Capture = {
  title: string
  company: string
  location: string
  jobDescription: string
  requirements: string[]
  skills: string[]
  sourceUrl: string
  source: 'linkedin' | 'indeed' | 'greenhouse' | 'lever' | 'workday' | 'company_site' | 'other'
  salaryMin?: number
  salaryMax?: number
  submissionDetected: boolean
  workMode: 'onsite' | 'hybrid' | 'remote'
}

const text = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const nestedText = (value: unknown) => {
  if (typeof value === 'string') return text(value)
  if (value && typeof value === 'object' && 'name' in value) return text(String(value.name))
  return ''
}

const hostSource = (): Capture['source'] => {
  const host = location.hostname
  if (host.includes('linkedin')) return 'linkedin'
  if (host.includes('indeed')) return 'indeed'
  if (host.includes('greenhouse')) return 'greenhouse'
  if (host.includes('lever.co')) return 'lever'
  if (host.includes('myworkdayjobs')) return 'workday'
  return 'company_site'
}

const capture = (): Capture => {
  const structured = parseJsonLdScripts([...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => script.textContent ?? ''))
  const fields = extractSiteFields(document, hostSource())
  const pageLocation = nestedText(structured?.jobLocation) || fields.location
  const description = nestedText(structured?.description) || fields.description
  const skills = nestedText(structured?.skills).split(/[,;|]/).map(text).filter(Boolean)
  const requirements = extractBulletRequirements(description, skills)
  const salary = parseSalaryValue(structured as JsonLdJob | undefined)
  const workMode = /remote/i.test(`${pageLocation} ${description}`) ? 'remote' : /hybrid/i.test(`${pageLocation} ${description}`) ? 'hybrid' : 'onsite'
  const submissionDetected = hasSubmissionConfirmation(text(document.body.innerText))
  return {
    title: nestedText(structured?.title) || fields.title,
    company: nestedText(structured?.hiringOrganization) || fields.company,
    location: pageLocation,
    jobDescription: description.slice(0, 50000),
    requirements,
    skills,
    sourceUrl: window.location.href,
    source: hostSource(),
    workMode,
    submissionDetected,
    ...salary,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && typeof message === 'object' && 'type' in message && message.type === 'capture') {
    sendResponse({ capture: capture() })
  }
  return true
})
