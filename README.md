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
- `FEATURE_AI_IMPORT=false`

## Security model
- CSP via meta tag in `index.html` with `default-src 'self'` and strict `connect-src`/`img-src` for Supabase.
- Referrer policy: `strict-origin-when-cross-origin`.
- Frame-busting runtime check in `src/main.tsx` (meta cannot set `frame-ancestors`).
- No `dangerouslySetInnerHTML`; ESLint blocks risky DOM APIs.
- URL validation blocks `javascript:`/`data:`/`vbscript:` by allowing only `https:` and `http:`.
- CSV export sanitizes formula prefixes (`= + - @ tab CR`) with `'` prefix.
- Supabase RLS on all core tables with `user_id = auth.uid()` and immutable ownership trigger.

## Database
- Migration: `supabase/migrations/2026102601_initial.sql`
- Seed: `supabase/seed.sql`
- v2 parser placeholder docs: `supabase/functions/parse-job/README.md`

## Tests
```bash
npm run test
npm run test:e2e
```
RLS test script (requires Supabase test env):
```bash
node scripts/rls-test.mjs
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
- Add Job page includes URL input and disabled AI autofill button behind `FEATURE_AI_IMPORT`

## Visual direction proposals (Phase 1 ASK)
1. **Aurora Mist**: brighter indigo/teal glow, softer card borders, more depth on KPI cards.
2. **Nebula Slate**: darker neutral base, sharper contrast tables/forms, restrained glow.

Pick one to finalize tokens and component polish.

## Remaining ASK decisions
- Auth method preference for v1 login: **email magic link** or **GitHub OAuth**?
- Graphify integration: please share the Graphify link before setup.
