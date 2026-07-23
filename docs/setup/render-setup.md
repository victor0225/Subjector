# Subjector Render Setup

This guide deploys Subjector as a Render Web Service.

## Web Service Settings

Use these settings when creating or editing the Render service:

```text
Name: subjector
Branch: main
Runtime: Node
Build Command: pnpm install --frozen-lockfile
Start Command: pnpm start
Health Check Path: /health
```

Do not use this build command:

```text
corepack enable && pnpm install --frozen-lockfile
```

On Render, `corepack enable` can try to modify the system `pnpm` shim under `/usr/bin`, which may fail with:

```text
Internal Error: EROFS: read-only file system, unlink '/usr/bin/pnpm'
```

If that happens, remove `corepack enable` and redeploy.

## Environment Variables

Use Render's `Environment` tab and `Add from .env`.

Template:

```env
BASE_URL=https://subjector.onrender.com
HEALTH_PIN=choose-a-private-pin

SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

AI_EVALUATION_PROVIDER=gemini
MEETING_TASK_PROVIDER=openai
FINALS_SUMMARY_PROVIDER=gemini
OPENAI_API_KEY=sk-... or sk-proj-...
OPENAI_EVALUATION_MODEL=gpt-5.2
OPENAI_TASK_EXTRACTION_MODEL=gpt-5.4
OPENAI_FINALS_SUMMARY_MODEL=gpt-5.4
GEMINI_API_KEY=...
GEMINI_EVALUATION_MODEL=gemini-3.5-flash
GEMINI_TRANSCRIPTION_MODEL=gemini-3.5-flash
GEMINI_TASK_EXTRACTION_MODEL=gemini-3.5-flash
GEMINI_FINALS_SUMMARY_MODEL=gemini-3.5-flash

GITHUB_ORGANIZATION_URL=https://github.com/SAFIRA-ondevice
GITHUB_REPOSITORIES=SAFIRA-ondevice/Soohyun
GITHUB_TOKEN=github_pat_read_only_contents_for_private_safira_repos

MEETING_CHANNEL_ID=C...
IN_PROCESS_CHANNEL_ID=C...
FINALS_CHANNEL_ID=C...

LEAD_USER_KEY=suhyeon
USERS_JSON=[{"key":"suhyeon","slack_id":"U...","full_name":"조수현","display_name":"수현"},{"key":"joeun","slack_id":"U...","full_name":"김조은","display_name":"조은"},{"key":"minsung","slack_id":"U...","full_name":"배민성","display_name":"민성"}]
```

`USERS_JSON` must stay on one line.

`GITHUB_TOKEN` is only for the Subjector server. Use a fine-grained GitHub personal access token owned by the `SAFIRA-ondevice` organization with read-only repository access. Grant at least `Metadata: Read-only` and `Contents: Read-only`; add `Issues: Read-only` and `Pull requests: Read-only` if IDEA CRUISE should include open work signals.

Do not commit or paste secret values into GitHub, Slack, or public screenshots.

## PORT

Render normally provides `PORT` for web services.

If the deploy log says:

```text
Missing required env: PORT
```

then add:

```env
PORT=10000
```

and redeploy.

## After Deploy

1. Open `https://subjector.onrender.com/health`.
2. Enter the configured `HEALTH_PIN`.
3. Confirm the page loads.
4. In Slack app settings, confirm event/interactivity URL is:

```text
https://subjector.onrender.com/slack/events
```

5. DM Subjector: `출근`.
