# JobTrail (ApplyFlow)

Personal job application tracker (v1 manual-first), built with React + Vite + TypeScript + Supabase.

## Stack
- React + Vite + TypeScript (strict)
- HashRouter (`/#/` paths) for GitHub Pages
- Tailwind CSS + reusable glass tokens/components
- TanStack Query + TanStack Table
- React Hook Form + Zod (shared `JobInput` schema)
- Supabase (Auth/Postgres/Storage, RLS-first)
- Vitest + Playwright

## Quick start
```bash
npm install --legacy-peer-deps
npm run dev
```

## Environment
Copy `.env.example` to `.env` and fill values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (worker/tests only; never client)
- `SUPABASE_ACCESS_TOKEN`
- `VITE_FEATURE_AI_IMPORT=false`

## Security model
- CSP via meta tag in `index.html` with `default-src 'self'` and strict `connect-src`/`img-src` for Supabase.
- Referrer policy: `strict-origin-when-cross-origin`.
- Frame-busting runtime check in `src/main.tsx` (meta cannot set `frame-ancestors`).
- No `dangerouslySetInnerHTML`; ESLint blocks risky DOM APIs.
- URL validation blocks `javascript:`/`data:`/`vbscript:` by allowing only `https:` and `http:`.
- CSV export sanitizes formula prefixes (`= + - @ tab CR`) with `'` prefix.
- Pasted and extension-captured job text is converted to plain text by `src/utils/sanitizeText.ts` (tags, scripts, control and bidi characters removed; input capped at 200k characters).
- Supabase RLS on all core tables with `user_id = auth.uid()` and immutable ownership trigger.

## Database
- Migration: `supabase/migrations/20261116070011_initial_schema.sql`
- Capture foundation migration: `supabase/migrations/20261116070020_capture_foundation.sql`
- Seed: `supabase/seed.sql`
- Server-side parser (disabled, not deployed) and its SSRF guards: `supabase/functions/parse-job/README.md`

## Tests
```bash
npm run test
npm run test:e2e
```
Live RLS isolation test (reads `.env.local`; needs `SUPABASE_SECRET_KEY`, used only by this script). It creates two throwaway users, checks 51 cross-user, anonymous and storage cases, then deletes everything it created:
```bash
npm run test:rls
```

## CI/CD
Workflow: `.github/workflows/ci-pages.yml`
- lint, unit tests, build, npm audit
- dist secret-pattern grep
- CodeQL scan
- gitleaks
- deploy to GitHub Pages on `main`

## v2 AI import seams already prepared
- `jobs.source_url`, `jobs.source`, `jobs.import_status`, `jobs.import_error`, `jobs.raw_extraction`, `jobs.field_provenance`
- Shared schema: `src/schemas/jobInput.ts`
- Import interface + implementations: `src/services/importers.ts`
- `AiUrlImporter` currently throws `not enabled`
- Add Job page includes URL input and disabled AI autofill button behind `VITE_FEATURE_AI_IMPORT`
- Email/password authentication protects the app and all browser writes use the Supabase anon key with RLS.
- Resume versions are stored in the private `resumes` bucket and linked from `jobs.resume_version_id`.
- Job saves canonicalize source URLs and reject duplicate active URLs per user.
- Calendar events are stored in the RLS-protected `calendar_events` table. Apply `supabase/migrations/20261117022348_calendar_events.sql` (or the equivalent hosted migration) before using event creation.
- Calendar supports month, week, and agenda views, event-type filters, linked jobs, suggested follow-ups, and optimistic event mutations.
- Job detail pages are available at `/#/jobs/:id`; incomplete imported records appear at `/#/needs-review`.
- Paste-a-link fallback currently supports safe local parsing of pasted job description text. It does not scrape remote pages from the browser.
- Existing jobs can be edited at `/#/jobs/:id/edit`; edits use the same validated `JobInput` schema as new jobs.
- Reviewable captures have a dedicated `jobs.needs_review` flag. The Needs Review page supports mark reviewed, dismiss, and edit actions.
- Status changes are recorded in `job_events` by the `jobs_status_timeline` trigger and shown on job details.
- The hosted review/timeline migration is `supabase/migrations/20261117025948_review_timeline.sql`.
- `supabase/functions/parse-job` is a server-side JSON-LD `JobPosting` extraction foundation. It is not a general scraper and should be deployed/configured before enabling remote URL imports.
- `extension/` contains the Manifest V3 capture client. Load its built `dist` folder in Chrome at `chrome://extensions` with Developer mode enabled and use **Load unpacked**.
- Build the production extension with `npm run extension:typecheck` and `npm run extension:build`, then load `extension/dist`. It shares `JobInput` validation, supports LinkedIn/Indeed/Greenhouse/Lever/Workday extractors, authenticated RLS saves, resume selection, confirmation detection, and a local retry queue.
- Security/email migration `supabase/migrations/20261117064604_security_email.sql` tightens authenticated RLS, backfills missing timeline entries, and adds forwarding-only email capture tables. `supabase/functions/ingest-email` accepts a provider-normalized webhook only when a per-user hashed ingest token matches; it does not access a mailbox.
- Email forwarding stores bounded sender, subject, body, and parsed metadata. Messages match by URL first, then company/title; uncertain messages appear under **Needs review**, where users link them to an application or ignore them. Users create their private forwarding address under **Profile → Email forwarding** (token shown once, stored as a SHA-256 hash). Provider setup and deployment: `supabase/functions/ingest-email/README.md`.
- Extractor fixtures live under `extension/fixtures/` and are tested without network access using `npm test -- --run extension/siteExtractors.test.ts extension/extractorUtils.test.ts`.

## Visual direction
**Nebula Slate** was chosen over Aurora Mist (still on branch `feat/aurora-mist` for reference): darker neutral base, sharper contrast on tables and forms, restrained glow.

- Tokens live in `src/index.css`: `--mesh-strength`, `--border-alpha`, `--control-border-alpha`, `--table-rule-alpha`, `--table-head-bg`, `--kpi-edge`, `--glow-kpi`, with light and dark values.
- Form controls use the `.control` class and tables use `.data-table`, so both designs differ only in token values.
- Text colour tokens are unchanged; light/dark contrast checks are still outstanding.

## Sign-in
Email/password and **Continue with Google** (Supabase OAuth, PKCE). Redirects return to the app root without a hash, e.g. `https://okkar06.github.io/ApplyFlow/`. Google needs a client ID/secret in Supabase (Authentication → Providers → Google), and the site URL / redirect allow-list must include the Pages URL and `http://localhost:5173/ApplyFlow/**` for local development.

## Deployment variables
The Pages build reads browser-safe values from GitHub repository **variables** (not secrets): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_EMAIL_INGEST_ADDRESS`.

## Developer tooling
- Graphify knowledge graph for Claude Code: `graphify update .` rebuilds `graphify-out/` (ignored by git).
