drop policy if exists "jobs own rows" on public.jobs;
create policy "jobs own rows" on public.jobs
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "job_events own rows" on public.job_events;
create policy "job_events own rows" on public.job_events
for all to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.jobs where jobs.id = job_events.job_id and jobs.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.jobs where jobs.id = job_events.job_id and jobs.user_id = (select auth.uid()))
);

insert into public.job_events (job_id, user_id, event_type, payload)
select jobs.id, jobs.user_id, 'status_changed',
  jsonb_build_object('from', null, 'to', jobs.status::text, 'note', 'Timeline backfilled')
from public.jobs
where not exists (
  select 1 from public.job_events
  where job_events.job_id = jobs.id
);

create table if not exists public.email_capture_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.email_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null,
  sender text not null,
  subject text not null,
  received_at timestamptz,
  body_text text not null check (length(body_text) <= 50000),
  status text not null default 'needs_review' check (status in ('needs_review', 'matched', 'ignored')),
  matched_job_id uuid references public.jobs(id) on delete set null,
  parsed jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table public.email_capture_tokens enable row level security;
alter table public.email_captures enable row level security;

create policy "email capture tokens own rows" on public.email_capture_tokens
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "email captures own rows" on public.email_captures
for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists email_captures_user_created_idx
  on public.email_captures (user_id, created_at desc);
