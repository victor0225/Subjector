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
OPENAI_API_KEY=sk-... or sk-proj-...
OPENAI_EVALUATION_MODEL=gpt-5.2
GEMINI_API_KEY=...
GEMINI_EVALUATION_MODEL=gemini-3.5-flash
GEMINI_TRANSCRIPTION_MODEL=gemini-3.5-flash

MEETING_CHANNEL_ID=C...
IN_PROCESS_CHANNEL_ID=C...
FINALS_CHANNEL_ID=C...

LEAD_USER_KEY=suhyeon
USERS_JSON=[{"key":"suhyeon","slack_id":"U...","full_name":"조수현","display_name":"수현"},{"key":"joeun","slack_id":"U...","full_name":"김조은","display_name":"조은"},{"key":"minsung","slack_id":"U...","full_name":"배민성","display_name":"민성"}]
```

`USERS_JSON` must stay on one line.

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
