# Subjector Day 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the testable Node.js/Bolt foundation for Subjector: configuration, DM command routing, Codex prompt generation, health page rendering, and a Slack app shell.

**Architecture:** Keep Slack/Bolt code thin and put behavior in pure modules that can be tested with Node's built-in test runner. Day 1 does not call OpenAI or Supabase for real workflows yet; it creates stable seams for those integrations.

**Tech Stack:** Node.js ESM, Slack Bolt.js, Supabase JS client, built-in `node:test`, Render-compatible HTTP server.

---

## Execution Status

Current status: Day 1 foundation scaffold implemented.

Verified:

- `pnpm test`: 25 tests, 0 failures.
- `node src/server.js` without `.env`: exits with a clear missing environment variable error.
- Slack app factory creates successfully with `deferInitialization: true`.

Remaining after this plan:

- Configure real Slack app credentials.
- Create Supabase schema.
- Wire real persistence and Slack channel updates.
- Add OpenAI and meeting audio workflows.

## Scope

Day 1 builds only the foundation needed for later features:

- Project scaffold.
- Environment/config parsing.
- Slack user/channel mapping.
- DM command routing for `출근`, `퇴근`, `finals 업데이트`.
- Slack-friendly block builders for basic replies.
- Codex prompt builder with `프롬프트 복사` copy-first contract.
- Health page HTML rendering.
- Slack Bolt app shell with endpoints and handlers wired to pure services.

Day 1 does not implement:

- Real meeting audio transcription.
- OpenAI calls.
- Supabase persistence workflows.
- Full `#in-process` board update lifecycle.
- Full voting/change-request workflow.
- Render deployment.

## File Structure

- Create `package.json`: scripts, runtime dependencies, Node ESM mode.
- Create `.gitignore`: dependency/build/env ignores.
- Create `.env.example`: all required environment variables with safe examples.
- Create `README.md`: local setup and Day 1 commands.
- Create `src/config.js`: parse environment variables and `USERS_JSON`.
- Create `src/domain/users.js`: user lookup and display-name helpers.
- Create `src/domain/dmCommands.js`: pure DM command classification and response planning.
- Create `src/domain/codexPrompt.js`: build Slack/Codex handoff prompts.
- Create `src/domain/health.js`: health status model and PIN-protected HTML rendering.
- Create `src/slack/blocks.js`: Slack Block Kit builders.
- Create `src/slack/app.js`: create Bolt app and register handlers.
- Create `src/server.js`: process entrypoint.
- Create `tests/config.test.js`: config parser tests.
- Create `tests/dmCommands.test.js`: DM command routing tests.
- Create `tests/codexPrompt.test.js`: prompt contract tests.
- Create `tests/health.test.js`: health HTML tests.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Add scaffold files**

Create `package.json` with ESM and scripts:

```json
{
  "name": "subjector",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/*.test.js",
    "test:watch": "node --test --watch tests/*.test.js"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@slack/bolt": "^4.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "dotenv": "^16.4.5"
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
.env
.env.*
!.env.example
npm-debug.log*
coverage/
.DS_Store
dist/
.worktrees/
```

Create `.env.example`:

```env
PORT=3000
BASE_URL=https://subjector.onrender.com
HEALTH_PIN=1234

SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret

SUPABASE_URL=https://example.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

OPENAI_API_KEY=sk-your-key

MEETING_CHANNEL_ID=C_MEETING
IN_PROCESS_CHANNEL_ID=C_IN_PROCESS
FINALS_CHANNEL_ID=C_FINALS
LEAD_USER_KEY=suhyeon
USERS_JSON=[{"key":"suhyeon","slack_id":"U_SUHYEON","full_name":"조수현","display_name":"수현"},{"key":"joeun","slack_id":"U_JOEUN","full_name":"김조은","display_name":"조은"},{"key":"minsung","slack_id":"U_MINSUNG","full_name":"배민성","display_name":"민성"}]
```

Create `README.md` with local commands and scope notes.

- [ ] **Step 2: Verify scaffold has no test target yet**

Run: `node --test tests/*.test.js`

Expected: fails because tests do not exist yet. This is acceptable before Task 2 creates tests.

## Task 2: Config Parsing

**Files:**
- Create: `tests/config.test.js`
- Create: `src/config.js`
- Create: `src/domain/users.js`

- [ ] **Step 1: Write failing config tests**

Test required behaviors:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUsersJson, loadConfigFromEnv } from '../src/config.js';

test('parseUsersJson parses the three configured users', () => {
  const users = parseUsersJson('[{"key":"suhyeon","slack_id":"U1","full_name":"조수현","display_name":"수현"},{"key":"joeun","slack_id":"U2","full_name":"김조은","display_name":"조은"},{"key":"minsung","slack_id":"U3","full_name":"배민성","display_name":"민성"}]');
  assert.equal(users.length, 3);
  assert.equal(users[0].displayName, '수현');
});

test('loadConfigFromEnv builds channel and lead-user config', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    OPENAI_API_KEY: 'sk-key',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: '[{"key":"suhyeon","slack_id":"U1","full_name":"조수현","display_name":"수현"}]'
  });

  assert.equal(config.port, 3333);
  assert.equal(config.channels.finals, 'C3');
  assert.equal(config.leadUserKey, 'suhyeon');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/config.test.js`

Expected: FAIL because `src/config.js` does not exist.

- [ ] **Step 3: Implement config parsing**

Create named exports:

- `parseUsersJson(raw)`
- `loadConfigFromEnv(env)`
- `getUserBySlackId(users, slackId)`
- `getUserByKey(users, key)`
- `formatDisplayName(user)`

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/config.test.js`

Expected: PASS.

## Task 3: DM Command Routing

**Files:**
- Create: `tests/dmCommands.test.js`
- Create: `src/domain/dmCommands.js`
- Create: `src/slack/blocks.js`

- [ ] **Step 1: Write failing command tests**

Required behavior:

- `출근` returns a start-work response and `updateInProcess: true`.
- `퇴근` returns an end-work summary response.
- `finals 업데이트` is allowed only for the lead user.
- Unknown commands return a short help message.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/dmCommands.test.js`

Expected: FAIL because command module does not exist.

- [ ] **Step 3: Implement command routing**

Create:

- `normalizeCommand(text)`
- `handleDmCommand({ text, user, config })`
- `buildHelpText(displayName)`

Return a plan object shaped like:

```js
{
  type: 'start_work',
  text: '수현님, 오늘 할 일 맥락을 정리했습니다.',
  updateInProcess: true
}
```

- [ ] **Step 4: Run command tests and verify GREEN**

Run: `node --test tests/dmCommands.test.js`

Expected: PASS.

## Task 4: Codex Prompt Builder

**Files:**
- Create: `tests/codexPrompt.test.js`
- Create: `src/domain/codexPrompt.js`

- [ ] **Step 1: Write failing prompt tests**

Test that generated prompts include:

- Assignee name with `님`.
- Task title.
- `오늘은 여기까지`.
- `완료 제출 결과 작성해줘`.
- Change-impact A/B/C rule.
- Final submission template.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/codexPrompt.test.js`

Expected: FAIL because prompt builder does not exist.

- [ ] **Step 3: Implement prompt builder**

Create:

- `buildCodexPrompt({ project, assignee, task, context })`

The output is a single copyable string.

- [ ] **Step 4: Run prompt tests and verify GREEN**

Run: `node --test tests/codexPrompt.test.js`

Expected: PASS.

## Task 5: Health Page Rendering

**Files:**
- Create: `tests/health.test.js`
- Create: `src/domain/health.js`

- [ ] **Step 1: Write failing health tests**

Test:

- Without valid PIN, page shows a PIN form.
- With valid PIN, page shows Slack, Supabase, OpenAI, and channel statuses.
- Secret values are never rendered.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/health.test.js`

Expected: FAIL because health module does not exist.

- [ ] **Step 3: Implement health renderer**

Create:

- `createDefaultHealthStatus()`
- `renderHealthPage({ pin, config, status })`
- `isHealthPinValid(pin, config)`

- [ ] **Step 4: Run health tests and verify GREEN**

Run: `node --test tests/health.test.js`

Expected: PASS.

## Task 6: Slack App Shell

**Files:**
- Create: `src/slack/app.js`
- Create: `src/server.js`

- [ ] **Step 1: Write minimal app shell**

Create a Bolt app factory:

- Uses `SLACK_BOT_TOKEN`.
- Uses `SLACK_SIGNING_SECRET`.
- Registers DM message handler.
- Registers `/health` route through receiver router.
- Does not call Supabase or OpenAI yet.

- [ ] **Step 2: Run unit tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 3: Run server smoke test without Slack secrets**

Run: `node src/server.js`

Expected: exits with a clear missing environment variable error.

## Task 7: Handoff Update

**Files:**
- Modify: `HANDOFF_SUMMARY.md`

- [ ] **Step 1: Add GitHub remote and Day 1 status**

Record:

- GitHub repo: `https://github.com/victor0225/Subjector.git`
- Day 1 plan path.
- Current implementation status.

- [ ] **Step 2: Run verification**

Run:

```powershell
node --test tests/*.test.js
```

Expected: PASS.

## Self-Review

- Spec coverage for Day 1: Slack server foundation, config, DM commands, prompt generation, health page, and handoff persistence are covered.
- Deferred features are not implemented in Day 1.
- Tests are required before each pure module implementation.
- No OpenAI/Supabase real workflows are introduced before their later plans.
