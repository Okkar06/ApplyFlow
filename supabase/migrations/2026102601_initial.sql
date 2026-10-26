create extension if not exists "pgcrypto";

create type job_status as enum ('saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted');
create type job_source as enum ('manual', 'linkedin', 'jobstreet', 'indeed', 'mcf', 'company_site', 'other');
create type import_status as enum ('none', 'pending', 'processing', 'needs_review', 'done', 'failed');

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  skills text[] not null default '{}',
  target_roles text[] not null default '{}',
  salary_target_min numeric,
  salary_target_max numeric,
  preferred_locations text[] not null default '{}',
  preferred_work_modes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null check (length(company) between 1 and 120),
  title text not null check (length(title) between 1 and 120),
  location text not null default '' check (length(location) <= 120),
  work_mode text not null default 'hybrid' check (work_mode in ('onsite', 'hybrid', 'remote')),
  salary_min numeric,
  salary_max numeric,
  currency text not null default 'SGD' check (length(currency) between 1 and 8),
  salary_period text not null default 'yearly' check (salary_period in ('yearly', 'monthly')),
  status job_status not null default 'saved',
  applied_date date,
  deadline date,
  source_url text,
  source job_source not null default 'manual',
  import_status import_status not null default 'none',
  import_error text,
  raw_extraction jsonb,
  field_provenance jsonb,
  priority smallint not null default 3 check (priority between 1 and 5),
  relevance_manual smallint check (relevance_manual between 1 and 5),
  notes text,
  tags text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_min <= salary_max),
  check (source_url is null or source_url ~* '^https?://')
);

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text,
  follow_up_at date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.contacts enable row level security;
alter table public.documents enable row level security;
alter table public.saved_views enable row level security;

create policy "profiles own rows" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "jobs own rows" on public.jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "job_events own rows" on public.job_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contacts own rows" on public.contacts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "documents own rows" on public.documents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved_views own rows" on public.saved_views for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.assert_job_owner_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end;
$$;

create trigger jobs_user_immutable before update on public.jobs
for each row execute function public.assert_job_owner_immutable();
