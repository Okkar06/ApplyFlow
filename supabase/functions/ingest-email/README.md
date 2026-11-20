# ingest-email

Receives forwarded application emails from an inbound-email provider, matches
them to the user's applications, and moves the job status forward. It never
gets mailbox access: users forward emails to a private address.

## How a message is accepted

1. The provider calls the function with header `x-ingest-secret: <INGEST_WEBHOOK_SECRET>`.
   Without a 32+ character secret configured the function refuses all calls (503).
2. The user is identified by a per-user token, taken from `token` or from the
   recipient plus-address `jobs+<token>@your-domain`. Only the SHA-256 hash is stored.
3. Re-delivered messages (same `messageId`) are ignored.
4. Matching: canonical job URL first, then company + title. Unmatched emails go to
   **Needs review** in the app, where the user links or ignores them.
5. Status only moves forward (applied → interview → offer, or → rejected). A rejected
   job is never changed automatically, and emails without a clear status change nothing.

## Payload (JSON, max 200 KB)

| field | required | notes |
| --- | --- | --- |
| `token` or `recipient` | yes | `recipient` like `jobs+<token>@domain` |
| `messageId` | yes | provider message id, used for de-duplication |
| `sender`, `subject` | yes | |
| `bodyText` or `bodyHtml` | yes | HTML is stripped to text |
| `receivedAt` | no | ISO date |

Logic lives in `logic.ts` and is covered by `logic.test.ts`.

## Setup

1. Pick an inbound provider and a receiving address on a domain you control
   (e.g. `jobs@in.example.com`). Options: Cloudflare Email Routing + Email Worker
   (free, domain on Cloudflare), Postmark inbound, Mailgun routes, SendGrid Inbound Parse.
   The provider (or a small adapter) must map its webhook to the payload above and
   add the `x-ingest-secret` header.
2. Set the secret and deploy. The function is called by the provider, not a signed-in
   user, so JWT verification is off; the webhook secret and token protect it instead.

   ```sh
   npx supabase secrets set INGEST_WEBHOOK_SECRET=<random 48+ chars> --project-ref <ref>
   npx supabase functions deploy ingest-email --no-verify-jwt --project-ref <ref>
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions
   automatically. Never put the service-role key or the webhook secret in the web app
   or extension.
3. Set `VITE_EMAIL_INGEST_ADDRESS=jobs@in.example.com` for the web build so users see
   their full forwarding address under **Profile → Email forwarding**.
