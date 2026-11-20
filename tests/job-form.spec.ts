import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Signed-in flow against the real Supabase project. Runs only where .env.local
// has a secret key (local machine); skipped in CI. Creates and deletes its own user.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const url = process.env.VITE_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('job form (signed in)', () => {
  test.skip(!url || !secret, 'needs VITE_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')

  let admin: SupabaseClient
  let userId: string | undefined
  const email = `e2e-${Date.now()}@example.com`
  const password = `E2e-${randomUUID()}`

  test.beforeAll(async () => {
    admin = createClient(url!, secret!, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    userId = data.user.id
  })

  const signIn = async (page: Page) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    // wait until the app shell replaces the sign-in page
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeHidden({ timeout: 20000 })
    await expect(page.getByRole('alert')).toHaveCount(0)
  }

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  test('opens Add job, parses pasted text and saves', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await signIn(page)

    await page.goto('/#/jobs/new')
    await expect(page.getByRole('heading', { name: 'Add job' })).toBeVisible()

    await page.getByLabel('Job description').fill('Frontend Engineer\nCompany: Acme E2E\n- React and TypeScript\n- Accessibility experience')
    await page.getByRole('button', { name: 'Parse pasted details' }).click()
    await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Acme E2E')
    await expect(page.getByLabel('Requirements')).toHaveValue('React and TypeScript\nAccessibility experience')

    // typing a new line must not be swallowed
    await page.getByLabel('Requirements').press('End')
    await page.getByLabel('Requirements').pressSequentially('\nTesting')
    await expect(page.getByLabel('Requirements')).toHaveValue('React and TypeScript\nAccessibility experience\nTesting')

    await page.getByRole('button', { name: 'Save job' }).click()
    await expect(page).toHaveURL(/#\/jobs$/)
    await expect(page.getByText('Acme E2E').first()).toBeVisible()

    const { data } = await admin.from('jobs').select('requirements').eq('user_id', userId!).single()
    expect(data?.requirements).toEqual(['React and TypeScript', 'Accessibility experience', 'Testing'])
    expect(pageErrors).toEqual([])
  })

  test('shows which fields block saving', async ({ page }) => {
    await signIn(page)
    await page.goto('/#/jobs/new')
    await page.getByRole('button', { name: 'Save job' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Please check' })).toContainText('Company')
  })
})
