# Subjector Accounts And Connections

This checklist records what 조수현 must create or connect before Subjector can run as a real Slack bot.

## 1. GitHub

Repository:

```text
https://github.com/victor0225/Subjector.git
```

Needed:

- Push permission from this PC.
- Private repo access from any future laptop/session that will continue development.

## 2. Slack

Needed:

- Permission to create/install a Slack app in the team's workspace.
- App name: `Subjector Bot`.
- Required public channels:
  - `#회의-결과록`
  - `#in-process`
  - `#finals`
- Bot must be invited to all three channels.
- Member IDs for:
  - 조수현
  - 김조은
  - 배민성

After app installation, collect:

```text
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
MEETING_CHANNEL_ID=C...
IN_PROCESS_CHANNEL_ID=C...
FINALS_CHANNEL_ID=C...
USERS_JSON=[...]
```

## 3. Supabase

Needed:

- Supabase project.
- Project URL.
- Service role key for the server.
- Database schema created from `supabase/migrations/0001_initial.sql`.
- User rows inserted for 조수현, 김조은, and 배민성.

Detailed setup guide:

- `docs/setup/supabase-setup.md`

Store only in Render/local `.env`:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Do not paste the service role key into Slack, GitHub, or screenshots.

## 4. OpenAI API

Needed:

- OpenAI Platform API key.
- Billing/payment method if API calls fail with billing/quota errors.

Store only in Render/local `.env`:

```text
OPENAI_API_KEY=sk-...
```

## 5. Render

Needed:

- Render account.
- Web Service connected to the GitHub repo.
- Starter instance kept on during MVP.
- Environment variables copied from `.env.example`.

Expected health URL:

```text
https://subjector.onrender.com/health
```

The health page uses `HEALTH_PIN`, not Slack login, for MVP.

## Current Blockers Before Real Slack Test

1. Create/install the Slack app.
2. Fill `.env` locally with real Slack/Supabase/OpenAI values.
3. Run the local server.
4. Visit `/health?pin=...` or Render health page after deploy.
5. Send Subjector Bot a DM: `출근`.
