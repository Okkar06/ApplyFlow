# JobTrail Capture extension

## Build

From the repository root:

```bash
npm run extension:typecheck
npm run extension:build
```

The loadable extension is written to `extension/dist/`. It uses the repository's
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values from the root `.env.local`.
Only the publishable/anon key belongs in this client; never add a service-role key.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `extension/dist`.
5. Open a supported job page, click the JobTrail icon, sign in, review the fields,
   choose a resume, and select **Save as applied**.

The popup validates every save with the shared `src/schemas/jobInput.ts` schema,
uses the existing RLS-protected `jobs` and `resume_versions` tables, and stores
failed saves in `chrome.storage.local` for retry.

Supported page families:

- LinkedIn
- Indeed
- Greenhouse
- Lever
- Workday

The content script reads only the currently open matching page. It does not crawl,
make background requests to job sites, or use a service-role credential. Layout
changes can cause fields to be blank; the editable preview and `needs_review` flag
are intentional safeguards. Confirmation text is detected conservatively and only
changes the review default; it never silently submits an application.
