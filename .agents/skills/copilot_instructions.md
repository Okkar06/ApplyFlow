# JobTrail (ApplyFlow): Copilot instructions

## Project
Personal job application tracker. React + Vite + TypeScript (strict), HashRouter (static hosting on Vercel), Tailwind CSS, TanStack Query + Table, React Hook Form + Zod (shared JobInput schema), Supabase (Auth/Postgres/Storage, RLS-first), Vitest + Playwright.

## Rules
- Follow the plan in PLAN.md. Work on ONE phase at a time, then stop and summarize.
- After finishing a task, tick it off in PLAN.md and add short notes on what changed.
- Never hardcode colors; use the theme CSS variables/Tailwind tokens.
- Validate all data with the shared Zod schema at every entry point.
- Never use the Supabase service role key in client or extension code.
- No dangerouslySetInnerHTML; respect the CSP in index.html (update it minimally when needed).
- Respect prefers-reduced-motion and prefers-reduced-transparency.
- All text must meet WCAG AA contrast in both light and dark themes.
- Write clean, typed, reusable code that matches existing conventions.
- Run lint and tests after each phase and fix failures.