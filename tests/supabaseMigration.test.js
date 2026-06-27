import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../supabase/migrations/0001_initial.sql', import.meta.url), 'utf8');

const tables = [
  'users',
  'slack_messages',
  'meetings',
  'tasks',
  'codex_prompts',
  'task_results',
  'change_requests',
  'change_votes',
  'daily_work_sessions',
  'finals_updates',
  'processing_events'
];

test('initial Supabase migration creates all MVP tables', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists ${table} \\(`));
  }
});

test('initial Supabase migration enables RLS on all MVP tables', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`alter table ${table} enable row level security;`));
  }
});

test('initial Supabase migration uses updated_at triggers for mutable records', () => {
  for (const table of ['meetings', 'tasks', 'change_requests', 'daily_work_sessions', 'finals_updates']) {
    assert.match(migration, new RegExp(`drop trigger if exists ${table}_set_updated_at on ${table};`));
    assert.match(migration, new RegExp(`create trigger ${table}_set_updated_at`));
  }
});

test('initial Supabase migration does not contain real secrets', () => {
  assert.doesNotMatch(migration, /xoxb-/);
  assert.doesNotMatch(migration, /service_role_key/i);
  assert.doesNotMatch(migration, /sk-[A-Za-z0-9]/);
});
