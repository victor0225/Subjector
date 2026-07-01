# IDEA CRUISE Task Apply API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the IDEA CRUISE web page apply a task candidate into Subjector by creating a Supabase task and refreshing the assignee's `#in-process` board.

**Architecture:** Add a small server-side POST endpoint under the existing `/idea-cruise` route. The page sends one task candidate to the server; the server validates the assignee, inserts a `tasks` row through the store, then calls the existing `inProcessService.renderBoard` path through a public wrapper.

**Tech Stack:** Node.js, Slack Bolt ExpressReceiver router, Supabase store wrapper, existing in-process Slack service, vanilla HTML/CSS/JS page.

---

### Task 1: Store Method For IDEA CRUISE Tasks

**Files:**
- Modify: `src/services/supabaseStore.js`
- Test: `tests/supabaseStore.test.js`

- [x] **Step 1: Write the failing test**

Add a test that calls `store.createIdeaCruiseTask({ assigneeUserKey, title, importance, context })` and asserts it inserts into `tasks` with `status: '미시작'`, `source_type: 'idea_cruise'`, and the supplied context.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/supabaseStore.test.js`

Expected: FAIL because `createIdeaCruiseTask` is not defined.

- [x] **Step 3: Add minimal store implementation**

Add `createIdeaCruiseTask` near the existing task creation methods in `src/services/supabaseStore.js`. It should insert one row and return the created task row if Supabase returns data.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/supabaseStore.test.js`

Expected: PASS.

### Task 2: In-Process Refresh Wrapper

**Files:**
- Modify: `src/services/inProcessService.js`
- Test: `tests/inProcessService.test.js`

- [x] **Step 1: Write the failing test**

Add a test that calls `service.refreshBoardForUser({ user })` and asserts it refreshes the board without starting a work session.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/inProcessService.test.js`

Expected: FAIL because `refreshBoardForUser` is not exported.

- [x] **Step 3: Expose a minimal wrapper**

Return `refreshBoardForUser` from `createInProcessService`; internally it should call the existing `renderBoard({ user })`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/inProcessService.test.js`

Expected: PASS.

### Task 3: Server POST Endpoint

**Files:**
- Modify: `src/slack/app.js`
- Test: `tests/slackApp.test.js`

- [x] **Step 1: Write failing route tests**

Add tests for `POST /idea-cruise/tasks`:
- missing assignee returns 400,
- unknown assignee returns 400,
- valid payload calls `store.createIdeaCruiseTask` and `inProcessService.refreshBoardForUser`,
- success returns JSON `{ ok: true }`.

- [x] **Step 2: Run route tests to verify failure**

Run: `node --test tests/slackApp.test.js`

Expected: FAIL because the route does not exist.

- [x] **Step 3: Implement route registration**

Change `registerIdeaCruiseRoute(receiver)` to accept `{ config, store, inProcessService }`. Register `receiver.router.post('/idea-cruise/tasks', ...)`, validate JSON body, map display assignee to configured user, create the task, refresh the assignee board, and return a JSON response.

- [x] **Step 4: Run route tests to verify pass**

Run: `node --test tests/slackApp.test.js`

Expected: PASS.

### Task 4: Frontend Apply Flow

**Files:**
- Modify: `src/domain/ideaCruisePage.js`
- Test: `tests/ideaCruisePage.test.js`

- [x] **Step 1: Write failing page tests**

Assert that task apply uses `fetch('/idea-cruise/tasks'...)`, blocks `미배정`, removes the task only after `response.ok`, and keeps the task on failure.

- [x] **Step 2: Run page tests to verify failure**

Run: `node --test tests/ideaCruisePage.test.js`

Expected: FAIL because task apply is currently local-only.

- [x] **Step 3: Implement frontend fetch**

Update the task apply handler to require a non-`미배정` assignee, POST the task candidate, remove it on success, and show a short status/error message.

- [x] **Step 4: Run page tests to verify pass**

Run: `node --test tests/ideaCruisePage.test.js`

Expected: PASS.

### Task 5: Full Verification And Push

**Files:**
- No new production files.

- [x] **Step 1: Run focused tests**

Run:
- `node --test tests/ideaCruisePage.test.js`
- `node --test tests/slackApp.test.js`
- `node --test tests/supabaseStore.test.js`
- `node --test tests/inProcessService.test.js`

- [x] **Step 2: Run full test suite**

Run: `node --test tests/*.test.js`

Expected: all tests pass.

- [x] **Step 3: Browser render check**

Open `/idea-cruise` and verify the task candidate cards still render with assignee select, importance, and apply button.

- [ ] **Step 4: Commit and push**

Commit message: `Add Idea Cruise task apply API`

Push branch: `main`.

## Self-Review

- Spec coverage: The plan covers server API, task persistence, Slack board refresh, frontend success/failure behavior, and tests.
- Placeholder scan: No placeholder implementation steps remain.
- Type consistency: The endpoint, store method, and frontend payload consistently use task fields `title`, `neededInfo`, `doneCriteria`, `assignee`, `importance`, and `meetingRecord`.
