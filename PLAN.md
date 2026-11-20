# JobTrail implementation plan

## PHASE 1 - Data model

- [x] Keep the existing `jobs` ownership model and RLS-first Supabase access pattern.
- [x] Keep private resume storage, `resume_versions`, resume metadata, and the application-to-resume foreign key.
- [x] Keep canonical URL indexing and application-level company/title duplicate checks as the initial duplicate-detection layer.
- [ ] Add explicit source-site and canonical job URL fields to the shared schema and database types.
- [x] Add a structured capture model for job description, normalized requirements, skills, salary, location, remote type, and field provenance. (Provenance sources: manual, paste, extension, structured_data, email, ai. DB limits in `2026112002_job_field_constraints.sql`.)
- [x] Add an explicit `needs_review` flag or equivalent review state that is independent from import processing status.
- [x] Define a typed status timeline/event model with allowed event types, timestamps, notes, and source metadata.
- [x] Strengthen RLS policies with explicit `authenticated` targets and parent-job ownership checks for events, contacts, and related records.
- [x] Add indexes and database constraints for common filters, active records, and safe duplicate matching. (`2026112001_tighten_rls.sql`, `2026112002_job_field_constraints.sql`; apply to hosted project pending.)
- [x] Keep all browser, extension, and future email inputs validated through the same `JobInput` Zod schema.

## PHASE 2 - Glassmorphism design system

- [x] Define light and dark theme values as CSS variables for surfaces, text, borders, accents, focus states, shadows, and status colors.
- [x] Wire semantic theme tokens into `tailwind.config.js` instead of scattering literal colors through JSX.
- [x] Define three glass levels: subtle, panel, and elevated, with tuned opacity, blur, border, and shadow per theme.
- [x] Make light mode use tinted panels, darker borders, and stronger shadows so it does not look washed out.
- [x] Add a restrained gradient-mesh background that does not reduce text contrast.
- [x] Add a theme toggle that respects system preference, persists the user choice, and applies before first paint to avoid a flash.
- [x] Provide solid-panel fallbacks when `backdrop-filter` is unsupported or reduced transparency is enabled.
- [x] Never animate blur; limit motion to opacity, color, and transform transitions.
- [x] Fix the development CSP strategy so Vite styles are usable locally without weakening the production security policy.

## PHASE 3 - Rebuild UI

- [x] Create shared `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Dropdown`, `Table`, `Tabs`, `Toast`, `EmptyState`, and `Skeleton` components.
- [x] Use glass surfaces for the shell, sidebar, top bar, cards, and modals.
- [x] Use more solid, high-contrast surfaces for tables and forms.
- [x] Rebuild the dashboard with live statistics, weekly applications, response rate, top skills, and needs-review count.
- [x] Rebuild the applications table with filters for status, source, role, and date.
- [x] Add an application detail page with description, requirements, skill chips, linked resume, notes, and source URL.
- [x] Complete the add form with validated fields and inline errors.
- [x] Build a resume versions page with upload, labels, default selection, file metadata, and safe signed access.
- [x] Add a needs-review inbox for incomplete or low-confidence captures.
- [x] Add loading, error, empty, retry, and success states to data-backed views.
- [x] Make layouts responsive and keyboard accessible across desktop and mobile breakpoints.
- [x] Remove hardcoded dashboard/demo values and connect displayed data to Supabase.

## PHASE 4 - Paste-a-link import

- [x] Add a paste-description entry point with a reviewable prefill flow.
- [x] Extract JSON-LD `JobPosting` through a server-side or extension path; do not fetch arbitrary job pages from the browser.
- [ ] Use `FEATURE_AI_IMPORT` only for an explicitly enabled, server-side import path.
- [x] Prefill the validated form with field provenance and confidence values.
- [x] Show the editable form as the review step before saving.
- [x] Save partial results with `needs_review` instead of silently dropping missing fields.
- [x] Sanitize captured text and HTML; never render captured HTML with `dangerouslySetInnerHTML`. (`src/utils/sanitizeText.ts`, used by paste import and the extension.)

## PHASE 5 - Browser extension

- [x] Create `extension/` with an independent Manifest V3 foundation.
- [x] Share types and the `JobInput` Zod schema with the web app without duplicating validation.
- [x] Add per-site extractors for LinkedIn, Indeed, Greenhouse, Lever, and Workday.
- [x] Add a generic JSON-LD `JobPosting` fallback extractor.
- [x] Read only the currently viewed page; do not crawl, bulk scrape, or make background job-site requests.
- [x] Detect reliable submission confirmations and default confirmed captures to applied.
- [x] Provide a one-click “Save as Applied” action everywhere else.
- [x] Add an editable preview with source, URL, salary, location, requirements, and resume picker.
- [x] Default the picker to the last-used resume version.
- [x] Authenticate as the user with Supabase RLS; never ship a service-role or secret key.
- [x] Request only the minimum host permissions for the supported sites.
- [x] Add an offline retry queue with visible pending/failed states.
- [x] Preserve partial extractions and mark them `needs_review`.
- [ ] Reuse the web app’s glass theme without coupling the extension to browser page styles.

## PHASE 6 - Email capture (optional)

- [x] Choose a forwarding-address workflow; do not request mailbox access.
- [x] Define confirmation-email matching rules and sender/domain safeguards.
- [x] Create or match applications using URL first, then company/title heuristics.
- [x] Parse interview, rejection, and offer status-update emails into timeline events.
- [x] Store only minimum email metadata and body text bounded to 50,000 characters.
- [x] Route uncertain matches to the needs-review email capture table.
- [x] Document token storage, revocation, retention, and privacy behavior.

## PHASE 7 - Harden and test

- [x] Add Vitest coverage for email parsing and extractor utilities.
- [x] Add saved synthetic HTML fixtures for each supported job-site extractor.
- [ ] Add Playwright coverage for theme persistence, no-flash initialization, review inbox behavior, and resume linking.
- [ ] Add contrast checks for both light and dark themes.
- [ ] Add RLS tests for jobs, resumes, storage objects, events, and cross-user isolation.
- [ ] Test malformed, oversized, unsafe, partial, duplicate, and offline inputs.
- [ ] Review CSP, extension permissions, redirect URLs, storage policies, and secret exposure.
- [ ] Update `README.md` with extension setup, environment variables, migrations, deployment, and security model changes.
- [ ] Run lint, typecheck, unit tests, end-to-end tests, production build, dependency audit, and secret scans.
