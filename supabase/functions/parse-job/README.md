# parse-job

Server-side job page parser. **Not deployed and disabled by default.**

It fetches a public job page, reads its `JobPosting` JSON-LD, and returns fields in `JobInput` shape for the user to review. The browser must still validate the result with the shared `JobInput` schema before saving.

## Guards

- Off unless the function secret `FEATURE_AI_IMPORT=true` (returns 404 otherwise).
- Signed-in users only: the caller's JWT is checked with `auth.getUser()`.
- CORS only for origins listed in `ALLOWED_ORIGINS` (comma-separated, e.g. `https://applyflow.vercel.app`).
- URLs: https only, port 443, no credentials, no localhost / single-label / `.local` / `.internal` hosts, no private or reserved IP literals.
- DNS: every A/AAAA answer must be public (blocks 10/8, 172.16/12, 192.168/16, 169.254/16 incl. cloud metadata, CGNAT, IPv6 ULA/link-local, IPv4-mapped and NAT64 forms).
- Redirects are followed manually (max 3) and every hop is re-checked.
- 8 s timeout, HTML content type only, body read capped at 2 MB, request body capped at 4 KB.
- Internal errors are logged, not returned.

Rules live in `guards.ts` and are covered by `guards.test.ts`.

## Known limits before enabling

- DNS rebinding: `fetch` resolves the host again after the check. The Supabase edge runtime has no way to pin the checked IP, so a hostile DNS server could still swap answers between the two lookups. Acceptable for a personal tool, but keep the function off unless needed.
- No per-user rate limit yet.

## Enabling

```sh
npx supabase secrets set FEATURE_AI_IMPORT=true ALLOWED_ORIGINS=https://applyflow.vercel.app --project-ref <ref>
npx supabase functions deploy parse-job --project-ref <ref>
```
