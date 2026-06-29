alter table tasks add column if not exists external_key text;

create unique index if not exists idx_tasks_external_key
on tasks(external_key)
where external_key is not null;
