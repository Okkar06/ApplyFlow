create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  type text not null check (type in ('interview', 'follow_up', 'application_deadline', 'offer_response_deadline', 'other')),
  title text not null check (length(title) between 1 and 160),
  start_time timestamptz not null,
  end_time timestamptz,
  all_day boolean not null default false,
  location text,
  meeting_url text check (meeting_url is null or meeting_url ~* '^https?://'),
  notes text,
  completed boolean not null default false,
  suggested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or end_time > start_time)
);

alter table public.calendar_events enable row level security;

create policy "calendar events own rows"
on public.calendar_events
for all
to authenticated
using (
  user_id = (select auth.uid())
  and (
    job_id is null
    or exists (
      select 1 from public.jobs
      where jobs.id = calendar_events.job_id
      and jobs.user_id = (select auth.uid())
      and jobs.deleted_at is null
    )
  )
)
with check (
  user_id = (select auth.uid())
  and (
    job_id is null
    or exists (
      select 1 from public.jobs
      where jobs.id = calendar_events.job_id
      and jobs.user_id = (select auth.uid())
      and jobs.deleted_at is null
    )
  )
);

create index if not exists calendar_events_user_start_idx
  on public.calendar_events (user_id, start_time);

create index if not exists calendar_events_user_job_idx
  on public.calendar_events (user_id, job_id)
  where job_id is not null;
