# JobTrail implementation plan

## PHASE 1 - Data model

- [x] Keep the existing `jobs` ownership model and RLS-first Supabase access pattern.
- [x] Keep private resume storage, `resume_versions`, resume metadata, and the application-to-resume foreign key.
- [x] Keep canonical URL indexing and application-level company/title duplicate checks as the initial duplicate-detection layer.
- [ ] Add explicit source-site and canonical job URL fields to the shared schema and database types.
- [ ] Add a structured capture model for job description, normalized requirements, skills, salary, location, remote type, and field provenance.
- [ ] Add an explicit `needs_review` flag or equivalent review state that is independent from import processing status.
- [ ] Define a typed status timeline/event model with allowed event types, timestamps, notes, and source metadata.
- [ ] Strengthen RLS policies with explicit `authenticated` targets and parent-job ownership checks for events, contacts, and related records.
- [ ] Add indexes and database constraints for common filters, active records, and safe duplicate matching.
- [ ] Keep all browser, extension, and future email inputs validated through the same `JobInput` Zod schema.

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

- [ ] Create shared `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Dropdown`, `Table`, `Tabs`, `Toast`, `EmptyState`, and `Skeleton` components.
- [ ] Use glass surfaces for the shell, sidebar, top bar, cards, and modals.
- [ ] Use more solid, high-contrast surfaces for tables and forms.
- [ ] Rebuild the dashboard with live statistics, weekly applications, response rate, top skills, and needs-review count.
- [ ] Rebuild the applications table with filters for status, source, resume version, and date.
- [ ] Add an application detail page with description, requirements, skill chips, linked resume, status timeline, notes, and source URL.
- [ ] Complete the add/edit form with all validated application fields and clear inline errors.
- [ ] Build a resume versions page with upload, labels, default selection, file metadata, and safe signed access.
- [ ] Add a needs-review inbox for incomplete or low-confidence captures.
- [ ] Add loading, error, empty, retry, and success states to every data-backed view.
- [ ] Make layouts responsive and keyboard accessible across desktop and mobile breakpoints.
- [ ] Remove hardcoded dashboard/demo values and connect all displayed data to Supabase.

## PHASE 4 - Paste-a-link import

- [ ] Add a paste-a-link and paste-description entry point.
- [ ] Extract JSON-LD `JobPosting` and safe visible text where available.
- [ ] Use `FEATURE_AI_IMPORT` only for an explicitly enabled, server-side import path.
- [ ] Prefill the validated form with field provenance and confidence values.
- [ ] Show an editable preview before saving.
- [ ] Save partial results with `needs_review` instead of silently dropping missing fields.
- [ ] Sanitize captured text and HTML; never render captured HTML with `dangerouslySetInnerHTML`.

## PHASE 5 - Browser extension

- [ ] Create `extension/` with an independent Manifest V3 build.
- [ ] Share types and the `JobInput` Zod schema with the web app without duplicating validation.
- [ ] Add per-site extractors for LinkedIn, Indeed, Greenhouse, Lever, and Workday.
- [ ] Add a generic JSON-LD `JobPosting` fallback extractor.
- [ ] Read only the currently viewed page; do not crawl, bulk scrape, or make background job-site requests.
- [ ] Detect reliable submission confirmations and auto-save as applied only where confidence is high.
- [ ] Provide a one-click “Save as Applied” action everywhere else.
- [ ] Add an editable preview with source, URL, salary, location, requirements, and resume picker.
- [ ] Default the picker to the last-used resume version.
- [ ] Authenticate as the user with Supabase RLS; never ship a service-role or secret key.
- [ ] Request only the minimum host permissions for the supported sites.
- [ ] Add an offline retry queue with visible pending/failed states.
- [ ] Preserve partial extractions and mark them `needs_review`.
- [ ] Reuse the web app’s glass theme without coupling the extension to browser page styles.

## PHASE 6 - Email capture (optional)

- [ ] Choose between Gmail API read-only access and a forwarding-address workflow.
- [ ] Define confirmation-email matching rules and sender/domain safeguards.
- [ ] Create or match applications using URL first, then company/title/date heuristics.
- [ ] Parse interview, rejection, offer, and other status-update emails into timeline events.
- [ ] Keep email access read-only and store only the minimum required message metadata.
- [ ] Route uncertain matches to the needs-review inbox.
- [ ] Document token storage, revocation, retention, and privacy behavior.

## PHASE 7 - Harden and test

- [ ] Add Vitest coverage for schema edge cases, duplicate detection, source detection, and all extractors.
- [ ] Add saved HTML fixtures for each supported job-site extractor.
- [ ] Add Playwright coverage for theme persistence, no-flash initialization, review inbox behavior, and resume linking.
- [ ] Add contrast checks for both light and dark themes.
- [ ] Add RLS tests for jobs, resumes, storage objects, events, and cross-user isolation.
- [ ] Test malformed, oversized, unsafe, partial, duplicate, and offline inputs.
- [ ] Review CSP, extension permissions, redirect URLs, storage policies, and secret exposure.
- [ ] Update `README.md` with extension setup, environment variables, migrations, deployment, and security model changes.
- [ ] Run lint, typecheck, unit tests, end-to-end tests, production build, dependency audit, and secret scans.
