// Deploys the ingest-email Edge Function and its webhook secret, then prints the
// Postmark inbound webhook URL. Run it yourself: `npm run email:deploy`.
//
// Reads from .env.local (never committed):
//   SUPABASE_ACCESS_TOKEN   personal access token for the Supabase CLI
//   VITE_SUPABASE_URL       https://<project-ref>.supabase.co
//   INGEST_WEBHOOK_SECRET   48+ random characters (generated for you if missing)
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

if (!existsSync('.env.local')) {
  console.error('Run this from the repository root, next to .env.local.')
  process.exit(1)
}
process.loadEnvFile('.env.local')

const url = process.env.VITE_SUPABASE_URL ?? ''
const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (!ref) {
  console.error('VITE_SUPABASE_URL in .env.local must look like https://<project-ref>.supabase.co')
  process.exit(1)
}
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Add SUPABASE_ACCESS_TOKEN to .env.local (supabase.com/dashboard/account/tokens).')
  process.exit(1)
}

let secret = process.env.INGEST_WEBHOOK_SECRET ?? ''
if (secret.length < 32) {
  secret = randomBytes(36).toString('base64url')
  appendFileSync('.env.local', `\n# Email ingest webhook secret. Never commit.\nINGEST_WEBHOOK_SECRET=${secret}\n`)
  console.log('Generated INGEST_WEBHOOK_SECRET and saved it to .env.local')
}

const supabase = (args) => {
  const result = spawnSync('npx', ['supabase', ...args], { stdio: 'inherit', shell: process.platform === 'win32', env: process.env })
  if (result.status !== 0) {
    console.error(`\nsupabase ${args[0]} ${args[1] ?? ''} failed.`)
    process.exit(result.status ?? 1)
  }
}

// Pass the secret through a temp env file so it never appears in the process list.
const dir = mkdtempSync(join(tmpdir(), 'jobtrail-'))
const envFile = join(dir, 'secrets.env')
try {
  writeFileSync(envFile, `INGEST_WEBHOOK_SECRET=${secret}\n`, { mode: 0o600 })
  console.log('Setting the function secret...')
  supabase(['secrets', 'set', '--env-file', envFile, '--project-ref', ref])
} finally {
  rmSync(dir, { recursive: true, force: true })
}

// Called by Postmark, not a signed-in user: JWT verification is off and the
// webhook secret + per-user token protect it instead.
console.log('Deploying ingest-email...')
supabase(['functions', 'deploy', 'ingest-email', '--no-verify-jwt', '--use-api', '--project-ref', ref])

const webhook = `https://postmark:${secret}@${ref}.supabase.co/functions/v1/ingest-email`
console.log('\nDone. In Postmark: your server > Default Inbound Stream > Settings > Webhook URL, paste:\n')
console.log(`  ${webhook}\n`)
console.log('Keep that URL private: it contains the webhook secret.')
