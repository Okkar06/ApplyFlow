# Deploying JobTrail on Vercel

The web app is a static Vite build (`dist/`) using `HashRouter`, so no server or
rewrite rules are needed. Vercel builds and deploys from GitHub; the GitHub
Actions workflow (`.github/workflows/ci.yml`) only runs checks.

Everything Vercel needs is in [`vercel.json`](vercel.json): build commands,
security headers (CSP, HSTS, frame blocking, permissions policy) and caching
(hashed `/assets/*` cached for a year, `index.html` always revalidated).

## 1. Create the Vercel project

1. Vercel dashboard → **Add New → Project** → import `Okkar06/ApplyFlow`.
2. Framework preset: **Vite** (detected). Leave build settings as they are;
   `vercel.json` sets install `npm ci --legacy-peer-deps`, build `npm run build`,
   output `dist`.
3. Root directory: repository root. Production branch: `main`.

## 2. Environment variables

Vercel → Project → **Settings → Environment Variables**. These are *public*,
browser-safe values; Vite inlines them at build time, so redeploy after changing them.

| Name | Value | Environments |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key | Production, Preview, Development |
| `VITE_FEATURE_AI_IMPORT` | `false` | all |
| `VITE_EMAIL_INGEST_ADDRESS` | e.g. `jobs@in.example.com` (optional, once email forwarding is set up) | all |

If you connected Supabase through Vercel's **Supabase integration**, it already
created `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or
`..._PUBLISHABLE_KEY`). The app reads those too (`envPrefix` in `vite.config.ts`),
so you don't need to duplicate them as `VITE_*`. The integration also adds server
secrets (service role, JWT secret, Postgres URLs); they have no public prefix, so
they are never bundled. If they're missing, the app shows a "isn't connected yet"
screen listing what to add instead of a blank page.

**Never** add `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, the Supabase
access token, or `INGEST_WEBHOOK_SECRET` to Vercel. Nothing in the web app needs
them; they belong only in `.env.local` (scripts) and Supabase Edge Function secrets.

## 3. Supabase auth URLs

Supabase → **Authentication → URL Configuration**:

- **Site URL**: your production URL, e.g. `https://applyflow.vercel.app/`
  (used in sign-up confirmation emails).
- **Redirect URLs** (allow-list):
  - `https://applyflow.vercel.app/**` (production; add your custom domain too if you use one)
  - `https://*-<your-vercel-team>.vercel.app/**` (preview deployments)
  - `http://localhost:5173/**` (local `npm run dev`)

The app sends users back to the site root without a hash (`authRedirectUrl()` in
`src/lib/authRedirect.ts`), so these patterns cover Google sign-in and email links.

## 4. Google sign-in

Unchanged by the move: the Google OAuth client's authorized redirect URI is the
Supabase callback, `https://<project-ref>.supabase.co/auth/v1/callback`.
Supabase then redirects to one of the URLs allowed above. Optionally add your
Vercel domain under the OAuth consent screen's authorized domains.

## 5. Edge Functions that check the site origin

If you enable `parse-job`, set its allowed origin to the Vercel URL:

```sh
npx supabase secrets set ALLOWED_ORIGINS=https://applyflow.vercel.app --project-ref <ref>
```

`ingest-email` is called by the email provider, not the browser, so it needs no change.

## 6. Retire GitHub Pages

The workflow no longer deploys to Pages. In GitHub → **Settings → Pages**, set the
source to **None** (or unpublish) so the old copy at `okkar06.github.io/ApplyFlow/`
stops being served, and remove it from Supabase's redirect URLs.

## Checking a deployment

- Open the URL, sign in, and reload a deep link such as `/#/jobs`.
- Browser dev tools → Console: there should be no `Content-Security-Policy` errors.
- Response headers on `/` should include `content-security-policy`,
  `strict-transport-security` and `x-frame-options: DENY`.

## Local production preview

```sh
npm run build
npx vite preview          # http://localhost:4173/
```

To build for a sub-path host instead of a domain root, set `VITE_BASE_PATH=/ApplyFlow/`.
