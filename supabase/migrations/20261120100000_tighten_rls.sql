-- Tighten the older RLS policies to match the newer ones:
--   * apply to the authenticated role only (not public/anon)
--   * use (select auth.uid()) so the uid is evaluated once per statement
--   * a row may only reference jobs / resume versions owned by the same user

-- profiles
drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- saved_views
drop policy if exists "saved_views own rows" on public.saved_views;
create policy "saved_views own rows" on public.saved_views
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- resume_versions
drop policy if exists "resume_versions own rows" on public.resume_versions;
create policy "resume_versions own rows" on public.resume_versions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- contacts: job_id is required (on delete cascade), must be the user's own job
drop policy if exists "contacts own rows" on public.contacts;
create policy "contacts own rows" on public.contacts
for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    job_id is null
    or exists (select 1 from public.jobs where jobs.id = contacts.job_id and jobs.user_id = (select auth.uid()))
  )
);

-- documents: optional job_id, must be the user's own job when set
drop policy if exists "documents own rows" on public.documents;
create policy "documents own rows" on public.documents
for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    job_id is null
    or exists (select 1 from public.jobs where jobs.id = documents.job_id and jobs.user_id = (select auth.uid()))
  )
);

-- jobs: a job may only link a resume version the user owns
drop policy if exists "jobs own rows" on public.jobs;
create policy "jobs own rows" on public.jobs
for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    resume_version_id is null
    or exists (select 1 from public.resume_versions rv where rv.id = jobs.resume_version_id and rv.user_id = (select auth.uid()))
  )
);

-- storage: resume files, signed-in owners only
drop policy if exists "resume files are readable by owner" on storage.objects;
create policy "resume files are readable by owner" on storage.objects
for select to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "resume files are uploadable by owner" on storage.objects;
create policy "resume files are uploadable by owner" on storage.objects
for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "resume files are changeable by owner" on storage.objects;
create policy "resume files are changeable by owner" on storage.objects
for update to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "resume files are removable by owner" on storage.objects;
create policy "resume files are removable by owner" on storage.objects
for delete to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- indexes backing the ownership sub-selects
create index if not exists contacts_job_id_idx on public.contacts (job_id);
create index if not exists documents_job_id_idx on public.documents (job_id);
create index if not exists jobs_resume_version_id_idx on public.jobs (resume_version_id);
