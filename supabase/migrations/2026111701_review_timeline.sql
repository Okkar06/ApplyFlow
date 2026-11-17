alter table public.jobs
  add column if not exists needs_review boolean not null default false;

create index if not exists jobs_user_needs_review_idx
  on public.jobs (user_id, needs_review)
  where deleted_at is null;

create or replace function public.record_job_status_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.job_events (job_id, user_id, event_type, payload)
    values (
      new.id,
      new.user_id,
      'status_changed',
      jsonb_build_object(
        'from', case when tg_op = 'INSERT' then null else old.status::text end,
        'to', new.status::text,
        'note', case when tg_op = 'INSERT' then 'Application created' else 'Status updated' end
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_status_timeline on public.jobs;
create trigger jobs_status_timeline
after insert or update of status on public.jobs
for each row execute function public.record_job_status_change();
