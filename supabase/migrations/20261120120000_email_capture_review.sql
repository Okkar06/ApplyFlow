-- Let users review their own email captures (link to a job or ignore) and
-- manage forwarding tokens, without being able to rewrite captured content.

-- Captures: rows are still written only by the ingest function (service role).
-- Users may change status and matched_job_id, nothing else.
revoke update on public.email_captures from authenticated;
grant update (status, matched_job_id) on public.email_captures to authenticated;

drop policy if exists "email captures review" on public.email_captures;
create policy "email captures review" on public.email_captures
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    matched_job_id is null
    or exists (select 1 from public.jobs where jobs.id = email_captures.matched_job_id and jobs.user_id = (select auth.uid()))
  )
);

create index if not exists email_captures_user_status_idx on public.email_captures (user_id, status, created_at desc);

-- Tokens: a label for the UI and when it was last used by the ingest function.
alter table public.email_capture_tokens
  add column if not exists label text not null default 'Email forwarding',
  add column if not exists last_used_at timestamptz;

alter table public.email_capture_tokens
  add constraint email_capture_tokens_label_check check (char_length(label) between 1 and 60),
  add constraint email_capture_tokens_hash_check check (token_hash ~ '^[0-9a-f]{64}$');

-- Users may create, list and deactivate their tokens; the hash is never rewritten.
revoke update on public.email_capture_tokens from authenticated;
grant update (active, label) on public.email_capture_tokens to authenticated;

create index if not exists email_capture_tokens_user_idx on public.email_capture_tokens (user_id);
