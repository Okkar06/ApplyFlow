# Claude Handover: ApplyFlow / JobTrail

## Purpose

ApplyFlow (internally named JobTrail) is a personal job application tracker built for a manual-first v1.

The app helps a user:

- track job applications and statuses;
- maintain resumes and documents;
- review incomplete or low-confidence captures;
- see follow-ups, calendar events, and application statistics;
- capture applications from pasted descriptions, supported job websites, and future email forwarding.

Repository: `Okkar06/ApplyFlow`

Primary working directory for the recovered project:

```text
C:\VS code\ApplyFlow-recovery
```

Git state at handover:

- `main` tracks `origin/main`
- the working tree is clean
- main merge commit: `cea6765`
- production build: passes
- extension typecheck: passes
- extension production build: passes
- theme Playwright test: passes

## Technology

- React 19
- Vite 8
- TypeScript 6 strict configuration
- React Router with `HashRouter`
- TanStack Query and TanStack Table
- React Hook Form and Zod
- Supabase Auth, Postgres, Storage, and Edge Functions
- Tailwind CSS with semantic theme tokens
- Recharts
- Vitest and Testing Library
- Playwright
- Manifest V3 Chrome extension

Key entry points:

- web app: `src/main.tsx`
- route/component map: `src/app/App.tsx`
- shared app shell: `src/components/layout/AppShell.tsx`
- shared UI primitives: `src/components/ui/index.tsx`
- shared job validation: `src/schemas/jobInput.ts`
- Supabase client: `src/lib/supabase.ts`
- jobs service: `src/services/jobs.ts`
- implementation plan: `PLAN.md`
- project documentation: `README.md`

## Completed

### Authentication and data

- Supabase email/password authentication
- browser writes through the Supabase anon key
- RLS-first database design
- private resume storage
- canonical job URLs and duplicate protection
- needs-review job state
- status event timeline
- jobs, resumes, calendar events, job events, contacts, and documents services
- shared Zod validation for browser and extension entry points

### UI

- dashboard with Supabase-backed statistics
- applications table with search and filters
- add/edit application form
- application detail page
- needs-review inbox
- contacts, documents, statistics, calendar, and profile pages
- responsive glassmorphism shell
- light/dark theme toggle
- system theme preference and persisted theme choice
- no-flash theme initialization
- reduced transparency and backdrop-filter fallbacks
- loading, empty, error, and retry states

### Calendar

- month, week, and agenda views
- event type filters
- linked jobs
- suggested follow-ups
- create/edit/delete mutations
- RLS-protected `calendar_events` migration

### Job import and review

- paste-description entry point
- local text parsing and reviewable prefill
- partial captures marked for review
- existing-job editing through the shared `JobInput` schema
- URL canonicalization and duplicate active URL checks

### Browser extension

- Manifest V3 foundation
- LinkedIn, Indeed, Greenhouse, Lever, and Workday extractors
- generic JSON-LD fallback
- Supabase authenticated saves
- resume picker
- confirmation detection
- offline retry queue
- partial extraction review
- synthetic HTML fixtures
- independent extension typecheck and build

### Email capture foundation

- forwarding-only design; no mailbox access
- normalized webhook handling
- ingest-token validation
- URL-first matching, then company/title matching
- interview, rejection, and offer timeline parsing
- bounded email metadata/body storage
- uncertain matches routed to review

### Security and CI

- CSP and referrer policy
- URL validation
- CSV formula sanitization
- ESLint security rules
- GitHub Pages workflow
- secret-pattern grep
- CodeQL and gitleaks workflow jobs
- `.env.local` and `.env.*` files ignored except `.env.example`

## Recovery history

The project was partially corrupted locally. The latest local commits existed in Git objects that were missing or damaged, so the repository was recovered using a staged snapshot and the original OneDrive copy.

Recovery sequence:

1. created `recovery/2026-11-17-applyflow`;
2. merged it into `main`;
3. found and restored missing source files from:

```text
C:\Users\okkar.hein\OneDrive - Accenture\Desktop\VS code\ApplyFlow
```

4. committed the restoration on `fix/restore-missing-files`;
5. merged that work into `main`.

Do not use the old original folder as the active project. Use:

```text
C:\VS code\ApplyFlow-recovery
```

The original folder and OneDrive copy should be retained as recovery sources until the team has no more need for them.

## Setup

From PowerShell:

```powershell
cd "C:\VS code\ApplyFlow-recovery"
npm.cmd install
npm.cmd run dev
```

GitHub Pages HashRouter paths use `/#/` and the project is deployed with the GitHub Pages workflow.

Environment files:

- `.env.example` contains safe variable names
- `.env.local` exists locally and must never be committed
- the local secret-key value should be rotated if it was ever exposed
- browser variables must use `VITE_...` names
- service-role keys must remain server-only

Before deployment, confirm the hosted Supabase project has all required migrations applied.

## Database setup

Apply migrations in repository order:

```text
supabase/migrations/2026102601_initial.sql
supabase/migrations/2026111601_capture_foundation.sql
supabase/migrations/2026111602_calendar_events.sql
supabase/migrations/2026111701_review_timeline.sql
supabase/migrations/2026111702_security_email.sql
```

Additional operational files:

- `supabase/seed.sql`
- `scripts/rls-test.mjs`
- `supabase/functions/parse-job`
- `supabase/functions/ingest-email`

The migrations include foundational RLS, timeline, review, and email-capture behavior. Claude should verify them against the live Supabase project rather than assuming hosted migration state.

## Validation status

Passing:

- `npm run build`
- `npm run lint`
- `npm run extension:typecheck`
- `npm run extension:build`
- `npm run test:e2e`
- theme persistence Playwright test
- 22 Vitest unit tests

Failing or incomplete:

- `npm test` is currently mixed incorrectly:
  - Vitest discovers `tests/theme-persistence.spec.ts`
  - that file uses Playwright `test()` and cannot run inside Vitest
- fix `vitest.config.ts` to exclude `tests/**/*.spec.ts` or move the Playwright test to the tests directory and run it through the existing separate Playwright configuration
- `npm audit` reports 7 moderate vulnerabilities, all rooted in the `minimatch`/TypeScript ESLint dependency chain
- run and review `npm audit fix` carefully; do not accept unrelated major dependency upgrades blindly

Recommended validation sequence:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run src
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run extension:typecheck
npm.cmd run extension:build
npm.cmd run audit
```

## Known incomplete work

### Functional

- remote AI URL import is not enabled
- server-side `parse-job` is still documentation-only
- paste/import HTML sanitization is not complete
- the capture extension should use the web app's glass theme but is not fully coupled
- hosted Supabase migrations and Edge Functions may not be deployed/configured
- email provider webhook and forwarding secret are not configured
- actual live RLS behavior must be verified

### Testing

- separate Vitest and Playwright discovery
- review-inbox Playwright coverage
- resume-linking E2E coverage
- light/dark contrast checks
- RLS tests for jobs, resumes, storage, events, and cross-user isolation
- malformed, oversized, unsafe, duplicate, partial, and offline input tests
- production CSP and extension-permission review

### Data model

- explicit source-site fields and structured capture metadata are not fully formalized
- salary, requirements, remote type, provenance, and confidence fields need final database/type alignment
- additional indexes and constraints need review

### Visual direction

README proposals remain open:

- Aurora Mist
- Nebula Slate

No final visual direction or component polish decision has been recorded beyond the implemented theme foundation.

## Decisions needed from the user

1. Authentication preference:
   - email magic link
   - GitHub OAuth

2. AI import should remain disabled until server-side hosting/configuration is ready.

3. Final visual direction:
   - Aurora Mist
   - Nebula Slate
   - an existing design direction

4. The Graphify integration link, if required, has not been shared.

## Recommended continuation order

1. Fix Vitest/Playwright test discovery.
2. Run the full unit, E2E, lint, build, extension, and audit baselines from a clean checkout.
3. Verify live Supabase migrations and RLS.
4. Add missing RLS and malformed-input tests.
5. Deploy and configure the email ingest Edge Function only after webhook secret setup.
6. Decide whether to enable AI URL import.
7. Implement the server-side parser behind the feature flag.
8. Finish HTML/text sanitization and provenance/confidence fields.
9. Add stronger Playwright coverage for the review inbox and resumes.
10. Address the moderate npm audit dependency findings.
11. Finalize the visual direction and perform accessibility contrast checks.

## Rules for Claude

- Preserve RLS-first behavior.
- Never add `SUPABASE_SERVICE_ROLE_KEY`, ingest secrets, or real credentials to browser or extension code.
- Keep browser writes behind the Supabase anon key and RLS.
- Use the shared `JobInput` Zod schema for every input path.
- Do not use `dangerouslySetInnerHTML`.
- Do not hardcode colors; use the Tailwind semantic theme tokens.
- Do not fetch arbitrary job pages from the browser.
- Keep AI import disabled until it is explicitly server-side and feature-gated.
- Never commit `.env`, `.env.local`, or secret-bearing files.
- Do not rewrite Git history.
- Work from `C:\VS code\ApplyFlow-recovery`, not the original recovery folder.
- For schema changes, add migrations rather than editing the hosted database ad hoc.
- Update PLAN.md and README.md when a marked implementation item changes.
