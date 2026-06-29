alter table tasks add column if not exists external_key text;

drop index if exists idx_tasks_external_key;

create unique index idx_tasks_external_key
on tasks(external_key);
