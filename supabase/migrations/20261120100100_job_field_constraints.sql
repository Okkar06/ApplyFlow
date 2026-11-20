-- Align database limits with the shared JobInput schema so the database is the
-- final guard for every input path (web app, extension, email, parse-job).

create or replace function public.text_array_items_within(items text[], max_len int)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(bool_and(char_length(item) between 1 and max_len), true) from unnest(items) as item
$$;

alter table public.jobs
  add constraint jobs_salary_nonnegative_check check ((salary_min is null or salary_min >= 0) and (salary_max is null or salary_max >= 0)),
  add constraint jobs_source_url_length_check check (source_url is null or char_length(source_url) <= 1024),
  add constraint jobs_canonical_url_check check (canonical_url is null or (char_length(canonical_url) <= 1024 and canonical_url ~* '^https?://')),
  add constraint jobs_job_description_length_check check (job_description is null or char_length(job_description) <= 50000),
  add constraint jobs_notes_length_check check (notes is null or char_length(notes) <= 5000),
  add constraint jobs_import_error_length_check check (import_error is null or char_length(import_error) <= 2000),
  add constraint jobs_requirements_check check (cardinality(requirements) <= 100 and public.text_array_items_within(requirements, 120)),
  add constraint jobs_tags_check check (cardinality(tags) <= 50 and public.text_array_items_within(tags, 40)),
  add constraint jobs_field_provenance_object_check check (field_provenance is null or jsonb_typeof(field_provenance) = 'object'),
  add constraint jobs_raw_extraction_size_check check (raw_extraction is null or (jsonb_typeof(raw_extraction) = 'object' and octet_length(raw_extraction::text) <= 200000));

-- Dashboard / list filters
create index if not exists jobs_user_status_idx on public.jobs (user_id, status) where deleted_at is null;
create index if not exists jobs_user_deadline_idx on public.jobs (user_id, deadline) where deadline is not null and deleted_at is null;

-- RLS filters on user_id; these tables had no supporting index
create index if not exists job_events_job_id_idx on public.job_events (job_id);
create index if not exists job_events_user_id_idx on public.job_events (user_id);
create index if not exists contacts_user_id_idx on public.contacts (user_id);
create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists saved_views_user_id_idx on public.saved_views (user_id);
