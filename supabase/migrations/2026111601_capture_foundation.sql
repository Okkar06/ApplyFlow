create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null check (length(label) between 1 and 120),
  file_path text not null,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs
  add column if not exists canonical_url text,
  add column if not exists job_description text,
  add column if not exists requirements text[] not null default '{}',
  add column if not exists resume_version_id uuid references public.resume_versions(id) on delete set null;

alter table public.resume_versions enable row level security;

create policy "resume_versions own rows" on public.resume_versions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "resume files are readable by owner"
on storage.objects for select
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "resume files are uploadable by owner"
on storage.objects for insert
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "resume files are changeable by owner"
on storage.objects for update
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "resume files are removable by owner"
on storage.objects for delete
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create unique index if not exists jobs_user_canonical_url_idx
  on public.jobs (user_id, canonical_url)
  where canonical_url is not null and deleted_at is null;

create index if not exists jobs_user_updated_at_idx
  on public.jobs (user_id, updated_at desc);

create index if not exists resume_versions_user_created_at_idx
  on public.resume_versions (user_id, created_at desc);
