create table if not exists users (
  key text primary key,
  slack_id text not null unique,
  full_name text not null,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists slack_messages (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,
  channel_id text not null,
  message_ts text not null,
  thread_ts text,
  created_at timestamptz not null default now(),
  unique (channel_id, message_ts)
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  source_channel_id text not null,
  source_message_ts text not null,
  uploader_user_key text references users(key),
  status text not null default 'uploaded',
  audio_file_name text,
  transcript_file_ts text,
  speaker_mapping jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  assignee_user_key text not null references users(key),
  title text not null,
  status text not null default '미시작',
  importance text not null default '🟡 중',
  coordination text not null default '🟡 중',
  source_type text not null default 'manual',
  source_id uuid,
  context jsonb not null default '{}'::jsonb,
  slack_channel_id text,
  slack_message_ts text,
  slack_thread_ts text,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists codex_prompts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  prompt text not null,
  slack_channel_id text,
  slack_message_ts text,
  created_at timestamptz not null default now()
);

create table if not exists task_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  result_type text not null,
  raw_text text not null,
  parsed_summary jsonb not null default '{}'::jsonb,
  submitted_by_user_key text not null references users(key),
  created_at timestamptz not null default now()
);

create table if not exists change_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete set null,
  proposer_user_key text not null references users(key),
  status text not null default '투표 중',
  raw_text text not null,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists change_votes (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references change_requests(id) on delete cascade,
  voter_user_key text not null references users(key),
  vote text not null check (vote in ('찬성', '반대')),
  rationale text not null,
  created_at timestamptz not null default now(),
  unique (change_request_id, voter_user_key)
);

create table if not exists daily_work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_key text not null references users(key),
  work_date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_key, work_date)
);

create table if not exists finals_updates (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  status text not null default '미리보기',
  preview jsonb not null default '{}'::jsonb,
  revision_notes text,
  approved_by_user_key text references users(key),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists processing_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  status text not null,
  related_table text,
  related_id uuid,
  message text,
  created_at timestamptz not null default now()
);
