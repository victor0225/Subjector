# IDEA CRUISE Topic Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `/idea-cruise` page with the approved topic-page meeting desk.

**Architecture:** Keep the existing server routes and API bridge, but replace the page state model with topic pages. The left column edits one active topic, the middle column shows cards only for that topic, and the right column accumulates task candidates from completed topics with page filters.

**Tech Stack:** Node.js ESM, server-rendered HTML string, browser JavaScript, Node test runner.

---

### Task 1: Lock New Page Contract

**Files:**
- Modify: `tests/ideaCruisePage.test.js`

- [ ] Replace old mode-tab and completed-panel assertions with topic-page assertions.
- [ ] Add assertions for removing quick memo/live mode text.
- [ ] Add assertions for topic page navigation, page-specific cards, task page filters, meeting-record drawer, append-on-apply, task success removal, and task failure log retention.
- [ ] Run `node --test tests/ideaCruisePage.test.js` and verify the new tests fail against the old page.

### Task 2: Replace IDEA CRUISE Page

**Files:**
- Modify: `src/domain/ideaCruisePage.js`

- [ ] Replace the previous HTML with the final topic-page layout.
- [ ] Use `state.pages`, `state.activePageId`, `state.taskFilter`, `state.tasks`, and `state.record`.
- [ ] Implement `다음 주제 추가`, page dots, page-specific `AI Analysis`, card apply append, complete page, meeting record drawer, task generation, task filters, Subjector apply success removal, and failure log.
- [ ] Preserve `/idea-cruise/cards` and `/idea-cruise/tasks` API calls.

### Task 3: Verify

**Files:**
- Test: `tests/ideaCruisePage.test.js`
- Test: `tests/openaiIdeaCruiseCardAnalyzer.test.js`

- [ ] Run `node --test tests/ideaCruisePage.test.js`.
- [ ] Run `node --test tests/*.test.js`.
- [ ] Start the app if needed and visually inspect `/idea-cruise`.
- [ ] Commit and push the finished change.
