# Subjector

Subjector is a Slack-centered coordination bot for a three-person graduation-project team. It turns meeting context into tasks, Codex-ready prompts, daily progress summaries, and cumulative project records.

## MVP Stack

- Node.js ESM
- Slack Bolt.js
- Supabase/Postgres
- OpenAI API
- Render Web Service

## Local Commands

```powershell
npm test
npm start
```

Day 1 uses Node's built-in test runner for pure modules. Slack, Supabase, and OpenAI credentials are configured with environment variables.

## Required Environment

Copy `.env.example` to `.env` and fill in real values before running the Slack server.

```powershell
Copy-Item .env.example .env
```

## Current Design Docs

- `docs/superpowers/specs/2026-06-27-subjector-mvp-design.md`
- `docs/superpowers/plans/2026-06-27-subjector-day1-foundation.md`
- `HANDOFF_SUMMARY.md`
