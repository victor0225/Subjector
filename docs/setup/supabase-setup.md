# Subjector Supabase Setup

This guide creates the database used by the Subjector MVP.

## 1. Create The Project

1. Go to Supabase.
2. Create a new project.
3. Suggested project name: `subjector`.
4. Pick the nearest available region.
5. Store the database password somewhere private.

## 2. Run The Schema

1. Open the Supabase project.
2. Open SQL Editor.
3. Copy the full contents of:

```text
supabase/migrations/0001_initial.sql
```

4. Run it once.

The migration creates MVP tables for users, meetings, tasks, Codex prompts, task results, change requests, daily work sessions, finals updates, and processing events.

Security default:

- Row Level Security is enabled on every Subjector table.
- No public read/write policies are created in the MVP.
- Subjector accesses the database only from the server with `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Insert The Three Users

After running the schema, insert the three users with the Slack member IDs from the local ignored note file.

Use this template and replace the placeholder IDs:

```sql
insert into users (key, slack_id, full_name, display_name, role)
values
  ('suhyeon', 'U_REPLACE_SUHYEON', '조수현', '수현', 'lead'),
  ('joeun', 'U_REPLACE_JOEUN', '김조은', '조은', 'member'),
  ('minsung', 'U_REPLACE_MINSUNG', '배민성', '민성', 'member')
on conflict (key) do update set
  slack_id = excluded.slack_id,
  full_name = excluded.full_name,
  display_name = excluded.display_name,
  role = excluded.role;
```

Important:

- 배민성's Slack display name can be `Corvus Gold`, but Subjector should store `display_name = '민성'`.
- Then Subjector will call him `민성님`, not `Corvus Gold님`.

## 4. Collect Environment Values

Copy these values into local `.env` and later into Render environment variables:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-side-service-role-or-secret-key
```

Do not commit or share the service role key.

Use the server-side service role/secret key, not a browser/client publishable key, because the MVP server must write task state, summaries, approvals, and message IDs.

## 5. Smoke Check

After `.env` is filled, Subjector should be able to show Supabase as configured on:

```text
https://subjector.onrender.com/health
```

During local development, the equivalent URL is:

```text
http://localhost:3000/health?pin=YOUR_PIN
```

Day 1 only checks that Supabase values are configured. A later task will add an actual database connectivity probe.
