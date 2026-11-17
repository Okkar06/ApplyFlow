# ingest-email

This function is designed for a forwarding provider webhook. The provider sends
JSON containing `token`, `messageId`, `sender`, `subject`, `bodyText`, and
optionally `receivedAt`. The token is hashed server-side and matched to an
active row in `email_capture_tokens`; no mailbox access is granted.

Configure `SUPABASE_SERVICE_ROLE_KEY` only as an Edge Function secret. Never put
it in the web app or extension. A provider adapter should authenticate its own
webhook before forwarding the normalized payload here.
