import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anon || !service) {
  console.error('Missing Supabase env vars for RLS test')
  process.exit(1)
}

const admin = createClient(url, service)
const anonClient = createClient(url, anon)

const emailA = `a-${Date.now()}@example.com`
const emailB = `b-${Date.now()}@example.com`
const password = 'TempPassw0rd!'

const { data: userA } = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true })
const { data: userB } = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true })

if (!userA.user || !userB.user) throw new Error('Failed to create users')

await admin.from('jobs').insert({ user_id: userA.user.id, company: 'A', title: 'Role A' })
await admin.from('jobs').insert({ user_id: userB.user.id, company: 'B', title: 'Role B' })

const clientA = createClient(url, anon)
await clientA.auth.signInWithPassword({ email: emailA, password })
const rowsA = await clientA.from('jobs').select('company')
if ((rowsA.data ?? []).some((r) => r.company === 'B')) throw new Error('RLS breach: A can read B rows')

const anonRows = await anonClient.from('jobs').select('*')
if ((anonRows.data ?? []).length !== 0) throw new Error('Anon should not see rows')

console.log('RLS checks passed')
