import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { JobInput } from '../src/schemas/jobInput'
import { canonicalizeUrl } from '../src/utils/url'

type Capture = {
  title: string
  company: string
  location: string
  jobDescription: string
  requirements: string[]
  skills: string[]
  sourceUrl: string
  source: string
  workMode: 'onsite' | 'hybrid' | 'remote'
  salaryMin?: number
  salaryMax?: number
  submissionDetected: boolean
}

type QueueItem = { id: string; input: unknown }
type Resume = { id: string; label: string; is_default: boolean }

const message = document.querySelector<HTMLElement>('#message')!
const auth = document.querySelector<HTMLElement>('#auth')!
const captureSection = document.querySelector<HTMLElement>('#capture')!
const form = document.querySelector<HTMLFormElement>('#job-form')!
const saveButton = document.querySelector<HTMLButtonElement>('#save')!
const title = document.querySelector<HTMLInputElement>('#title')!
const company = document.querySelector<HTMLInputElement>('#company')!
const locationField = document.querySelector<HTMLInputElement>('#location')!
const description = document.querySelector<HTMLTextAreaElement>('#description')!
const resume = document.querySelector<HTMLSelectElement>('#resume')!
const needsReview = document.querySelector<HTMLInputElement>('#needs-review')!

const storage = {
  getItem: async (key: string) => {
    const result = await chrome.storage.local.get(key)
    return typeof result[key] === 'string' ? result[key] : null
  },
  setItem: async (key: string, value: string) => chrome.storage.local.set({ [key]: value }),
  removeItem: async (key: string) => chrome.storage.local.remove(key),
}

const supabase: SupabaseClient = createClient(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

const setMessage = (value: string, type: 'error' | 'success' | '' = '') => {
  message.textContent = value
  message.className = type
}

const queue = async (): Promise<QueueItem[]> => {
  const result = await chrome.storage.local.get('jobtrailQueue')
  return Array.isArray(result.jobtrailQueue) ? result.jobtrailQueue as QueueItem[] : []
}

const enqueue = async (input: unknown) => {
  const items = await queue()
  items.push({ id: crypto.randomUUID(), input })
  await chrome.storage.local.set({ jobtrailQueue: items })
}

const saveInput = async (input: unknown) => {
  const parsed = JobInput.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'job'}: ${issue.message}`).join('; '))
  const { error } = await supabase.from('jobs').insert({
    company: parsed.data.company,
    title: parsed.data.title,
    location: parsed.data.location,
    work_mode: parsed.data.workMode,
    salary_min: parsed.data.salaryMin ?? null,
    salary_max: parsed.data.salaryMax ?? null,
    currency: parsed.data.currency,
    salary_period: parsed.data.salaryPeriod,
    status: parsed.data.status,
    applied_date: parsed.data.appliedDate ?? null,
    source_url: parsed.data.sourceUrl ?? null,
    canonical_url: canonicalizeUrl(parsed.data.sourceUrl) ?? null,
    source: parsed.data.source,
    import_status: parsed.data.importStatus,
    needs_review: parsed.data.needsReview,
    job_description: parsed.data.jobDescription ?? null,
    requirements: parsed.data.requirements,
    resume_version_id: parsed.data.resumeVersionId ?? null,
    raw_extraction: parsed.data.rawExtraction ?? null,
    field_provenance: parsed.data.fieldProvenance ?? null,
    priority: parsed.data.priority,
    notes: parsed.data.notes ?? null,
    tags: parsed.data.skills,
  })
  if (error) {
    if (error.code === '23505') throw new Error('This job is already saved.')
    throw new Error(error.message)
  }
}

const retryQueue = async () => {
  const items = await queue()
  if (!items.length) {
    setMessage('No queued captures.', 'success')
    return
  }
  const remaining: QueueItem[] = []
  for (const item of items) {
    try { await saveInput(item.input) } catch { remaining.push(item) }
  }
  await chrome.storage.local.set({ jobtrailQueue: remaining })
  setMessage(remaining.length ? `${remaining.length} capture(s) still queued.` : 'Queued captures saved.', remaining.length ? 'error' : 'success')
}

const loadResumes = async () => {
  const { data, error } = await supabase.from('resume_versions').select('id,label,is_default').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  for (const item of (data ?? []) as Resume[]) {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.label
    option.selected = item.is_default
    resume.append(option)
  }
}

const showCapture = async () => {
  auth.classList.add('hidden')
  captureSection.classList.remove('hidden')
  try {
    await loadResumes()
    await retryQueue()
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Unable to load extension data.', 'error')
  }
}

const readPage = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.id) throw new Error('No active tab.')
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'capture' }) as { capture?: Capture }
  if (!response.capture) throw new Error('No job details found on this page.')
  title.value = response.capture.title
  company.value = response.capture.company
  locationField.value = response.capture.location
  description.value = response.capture.jobDescription
  form.dataset.sourceUrl = response.capture.sourceUrl
  form.dataset.source = response.capture.source
  form.dataset.workMode = response.capture.workMode
  form.dataset.requirements = JSON.stringify(response.capture.requirements)
  form.dataset.skills = JSON.stringify(response.capture.skills)
  form.dataset.salaryMin = response.capture.salaryMin?.toString() ?? ''
  form.dataset.salaryMax = response.capture.salaryMax?.toString() ?? ''
  needsReview.checked = !response.capture.submissionDetected
  setMessage('Review the fields, choose a resume, then save.', 'success')
}

document.querySelector<HTMLButtonElement>('#sign-in')!.addEventListener('click', async () => {
  const result = await supabase.auth.signInWithPassword({ email: document.querySelector<HTMLInputElement>('#email')!.value, password: document.querySelector<HTMLInputElement>('#password')!.value })
  if (result.error) setMessage(result.error.message, 'error')
  else await showCapture()
})

document.querySelector<HTMLButtonElement>('#sign-up')!.addEventListener('click', async () => {
  const result = await supabase.auth.signUp({ email: document.querySelector<HTMLInputElement>('#email')!.value, password: document.querySelector<HTMLInputElement>('#password')!.value })
  if (result.error) setMessage(result.error.message, 'error')
  else setMessage(result.data.session ? 'Account created.' : 'Check your email to confirm your account.', 'success')
})

document.querySelector<HTMLButtonElement>('#read-page')!.addEventListener('click', () => void readPage().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to read page.', 'error')))
document.querySelector<HTMLButtonElement>('#retry')!.addEventListener('click', () => void retryQueue())
document.querySelector<HTMLButtonElement>('#sign-out')!.addEventListener('click', () => void supabase.auth.signOut().then(() => window.close()))

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  saveButton.disabled = true
  const input = {
    title: title.value,
    company: company.value,
    location: locationField.value,
    jobDescription: description.value,
    sourceUrl: form.dataset.sourceUrl,
    source: form.dataset.source,
    workMode: form.dataset.workMode ?? 'hybrid',
    requirements: JSON.parse(form.dataset.requirements ?? '[]'),
    skills: JSON.parse(form.dataset.skills ?? '[]'),
    salaryMin: form.dataset.salaryMin ? Number(form.dataset.salaryMin) : undefined,
    salaryMax: form.dataset.salaryMax ? Number(form.dataset.salaryMax) : undefined,
    resumeVersionId: resume.value || undefined,
    status: 'applied',
    appliedDate: new Date().toISOString().slice(0, 10),
    importStatus: needsReview.checked ? 'needs_review' : 'done',
    needsReview: needsReview.checked,
    fieldProvenance: { title: { source: 'manual' }, company: { source: 'manual' }, jobDescription: { source: 'ai', confidence: 0.7 } },
  }
  try {
    await saveInput(input)
    setMessage('Saved to JobTrail.', 'success')
  } catch (error) {
    await enqueue(input)
    setMessage(`${error instanceof Error ? error.message : 'Save failed'} Saved to the retry queue.`, 'error')
  } finally {
    saveButton.disabled = false
  }
})

supabase.auth.getSession().then(({ data }) => {
  if (data.session) void showCapture()
})
