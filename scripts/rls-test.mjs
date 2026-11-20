// Live RLS isolation test. Creates two throwaway users, has each try to read,
// change and link to the other's data, then deletes everything it created.
//
//   npm run test:rls        (reads .env.local)
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY)
// and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). The secret key is used
// only here, server-side, to create and delete the test users.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !secretKey) {
  console.error('Missing env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SECRET_KEY are required.')
  process.exit(1)
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, secretKey, opts)
const anon = createClient(url, anonKey, opts)

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`)
}
const must = (label, { data, error }) => {
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const password = `Rls-${crypto.randomUUID()}`
const created = { users: [], files: [] }

const makeUser = async (tag) => {
  const email = `rls-${tag}-${run}@example.com`
  const { user } = must(`create ${tag}`, await admin.auth.admin.createUser({ email, password, email_confirm: true }))
  created.users.push(user.id)
  const client = createClient(url, anonKey, opts)
  must(`sign in ${tag}`, await client.auth.signInWithPassword({ email, password }))
  return { id: user.id, client }
}

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]) // "%PDF-1.4\n"
const OWNED_TABLES = ['jobs', 'job_events', 'contacts', 'documents', 'calendar_events', 'saved_views', 'profiles', 'resume_versions', 'email_captures', 'email_capture_tokens']

try {
  const A = await makeUser('a')
  const B = await makeUser('b')

  // ---- seed A's data as A (exercises the insert policies) ----
  const resumePath = `${A.id}/rls-${run}.pdf`
  must('A upload resume', await A.client.storage.from('resumes').upload(resumePath, pdf, { contentType: 'application/pdf' }))
  created.files.push(resumePath)
  const resume = must('A resume row', await A.client.from('resume_versions').insert({ user_id: A.id, label: 'RLS test', file_path: resumePath, file_name: 'rls.pdf', mime_type: 'application/pdf', size_bytes: pdf.byteLength }).select('id').single())
  const job = must('A job', await A.client.from('jobs').insert({ user_id: A.id, company: 'A Corp', title: 'Role A', resume_version_id: resume.id }).select('id').single())
  must('A job event', await A.client.from('job_events').insert({ user_id: A.id, job_id: job.id, event_type: 'note' }))
  must('A contact', await A.client.from('contacts').insert({ user_id: A.id, job_id: job.id, name: 'Recruiter A' }))
  must('A document', await A.client.from('documents').insert({ user_id: A.id, job_id: job.id, file_path: `${A.id}/doc-${run}.pdf`, file_name: 'doc.pdf', mime_type: 'application/pdf', size_bytes: 10 }))
  must('A calendar event', await A.client.from('calendar_events').insert({ user_id: A.id, job_id: job.id, type: 'interview', title: 'Interview A', start_time: new Date(Date.now() + 86400000).toISOString() }))
  must('A saved view', await A.client.from('saved_views').insert({ user_id: A.id, name: 'View A' }))
  must('A profile', await A.client.from('profiles').upsert({ user_id: A.id }))
  // written server-side in production (email ingest), so seed with admin
  must('A email capture', await admin.from('email_captures').insert({ user_id: A.id, message_id: `rls-${run}`, sender: 'x@example.com', subject: 'Applied', body_text: 'Thanks for applying' }))
  must('A ingest token', await admin.from('email_capture_tokens').insert({ user_id: A.id, token_hash: `rls-${run}` }))

  // ---- positive control: A sees its own rows ----
  for (const table of OWNED_TABLES) {
    const { data, error } = await A.client.from(table).select('user_id').eq('user_id', A.id)
    check(`A can read own ${table}`, !error && data.length > 0, error?.message ?? `${data?.length} rows`)
  }
  const ownFile = await A.client.storage.from('resumes').download(resumePath)
  check('A can download own resume file', !ownFile.error)

  // ---- B cannot read A's data ----
  for (const table of OWNED_TABLES) {
    const { data, error } = await B.client.from(table).select('user_id')
    check(`B cannot read A's ${table}`, !error && data.every((row) => row.user_id === B.id), error?.message)
  }
  const bDownload = await B.client.storage.from('resumes').download(resumePath)
  check("B cannot download A's resume file", Boolean(bDownload.error))
  const bList = await B.client.storage.from('resumes').list(A.id)
  check("B cannot list A's resume folder", !bList.data?.length)

  // ---- B cannot change or delete A's data ----
  const bUpdate = await B.client.from('jobs').update({ title: 'hacked' }).eq('id', job.id).select('id')
  check("B cannot update A's job", !bUpdate.data?.length)
  const bDelete = await B.client.from('jobs').delete().eq('id', job.id).select('id')
  check("B cannot delete A's job", !bDelete.data?.length)
  const still = await admin.from('jobs').select('title').eq('id', job.id).single()
  check("A's job is unchanged", still.data?.title === 'Role A', still.data?.title)
  const bRemove = await B.client.storage.from('resumes').remove([resumePath])
  const fileStill = await admin.storage.from('resumes').list(A.id)
  check("B cannot delete A's resume file", fileStill.data?.some((f) => resumePath.endsWith(f.name)), bRemove.error?.message)
  const bOverwrite = await B.client.storage.from('resumes').upload(resumePath, pdf, { contentType: 'application/pdf', upsert: true })
  check("B cannot overwrite A's resume file", Boolean(bOverwrite.error))
  const bUploadA = await B.client.storage.from('resumes').upload(`${A.id}/planted-${run}.pdf`, pdf, { contentType: 'application/pdf' })
  if (!bUploadA.error) created.files.push(`${A.id}/planted-${run}.pdf`)
  check("B cannot upload into A's folder", Boolean(bUploadA.error))

  // ---- B cannot create rows owned by A or linked to A's rows ----
  const denied = async (label, query) => {
    const { error } = await query
    check(label, Boolean(error), 'insert succeeded')
  }
  await denied('B cannot insert a job as A', B.client.from('jobs').insert({ user_id: A.id, company: 'X', title: 'X' }))
  await denied("B cannot link A's resume to a job", B.client.from('jobs').insert({ user_id: B.id, company: 'X', title: 'X', resume_version_id: resume.id }))
  await denied("B cannot add a contact to A's job", B.client.from('contacts').insert({ user_id: B.id, job_id: job.id, name: 'X' }))
  await denied("B cannot add a document to A's job", B.client.from('documents').insert({ user_id: B.id, job_id: job.id, file_path: 'x', file_name: 'x', mime_type: 'application/pdf', size_bytes: 1 }))
  await denied("B cannot add an event to A's job", B.client.from('job_events').insert({ user_id: B.id, job_id: job.id, event_type: 'note' }))
  await denied("B cannot add a calendar event to A's job", B.client.from('calendar_events').insert({ user_id: B.id, job_id: job.id, type: 'other', title: 'X', start_time: new Date().toISOString() }))
  await denied('B cannot write email captures', B.client.from('email_captures').insert({ user_id: B.id, message_id: 'x', sender: 'x', subject: 'x', body_text: 'x' }))

  // ---- ownership cannot be moved, DB limits hold ----
  const move = await A.client.from('jobs').update({ user_id: B.id }).eq('id', job.id).select('id')
  check('A cannot hand a job to B', Boolean(move.error) || !move.data?.length)
  await denied('DB rejects more than 50 tags', A.client.from('jobs').insert({ user_id: A.id, company: 'X', title: 'X', tags: Array.from({ length: 51 }, (_, i) => `t${i}`) }))
  await denied('DB rejects negative salary', A.client.from('jobs').insert({ user_id: A.id, company: 'X', title: 'X', salary_min: -1 }))

  // ---- signed-out visitors see nothing ----
  for (const table of OWNED_TABLES) {
    const { data } = await anon.from(table).select('user_id')
    check(`anon cannot read ${table}`, !data?.length)
  }
  const anonFile = await anon.storage.from('resumes').download(resumePath)
  check('anon cannot download resume files', Boolean(anonFile.error))
  await denied('anon cannot insert jobs', anon.from('jobs').insert({ user_id: A.id, company: 'X', title: 'X' }))
} catch (error) {
  check('test setup', false, error instanceof Error ? error.message : String(error))
} finally {
  if (created.files.length) await admin.storage.from('resumes').remove(created.files)
  for (const id of created.users) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) console.error(`cleanup: could not delete test user ${id}: ${error.message}`)
  }
  console.log(`cleanup: removed ${created.users.length} test users and ${created.files.length} files`)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
