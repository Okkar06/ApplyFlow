insert into public.jobs (user_id, company, title, location, work_mode, status, source, import_status, priority, tags)
values
  (auth.uid(), 'Demo Co', 'Frontend Engineer', 'Singapore', 'hybrid', 'applied', 'manual', 'none', 3, '{react,typescript}');
