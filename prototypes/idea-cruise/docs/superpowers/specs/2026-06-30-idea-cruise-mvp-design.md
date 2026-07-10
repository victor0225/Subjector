# IDEA CRUISE MVP Design

Date: 2026-07-01
Status: Approved for implementation

## 1. Purpose

IDEA CRUISE is the meeting and task-birth layer for the Subjector workflow. It helps a team clarify decisions, sharpen meeting ideas, and create criteria-aligned task candidates before those tasks enter Subjector.

Subjector is no longer responsible for meeting transcription or meeting-result-based task generation. Subjector receives approved IDEA CRUISE tasks and operates them through `in-process`, progress updates, completion, daily summaries, and project memory.

The main product question is not "can AI summarize a meeting?" It is:

- Did the team align on why this task exists?
- Is the expected output level clear enough?
- What is required, what can be skipped, and what can the assignee decide alone?
- Can the next person continue from the output without rediscovering context?

## 2. Product Boundary

### 2.1 IDEA CRUISE Owns

- Live meeting input.
- Simple memo paste input.
- Live intervention cards that strengthen meeting entries.
- Manual meeting record generation.
- Task candidate generation.
- AI-drafted task criteria.
- Assignee and importance selection.
- Applying approved task candidates to Subjector.

### 2.2 Subjector Owns

- Receiving approved IDEA CRUISE tasks.
- Showing assigned tasks in `in-process`.
- Work-start guidance.
- Progress updates.
- `오늘은 여기까지`.
- Completion submission.
- Daily summary.
- Current project memory.

### 2.3 Removed From Subjector

- Meeting transcription as a primary workflow.
- Meeting-result-channel text analysis for task generation.
- Meeting-record-based task generation.

Subjector may keep historical code during migration, but the product source of new meeting tasks is IDEA CRUISE only.

## 3. Modes

IDEA CRUISE has two input modes.

### 3.1 Live Meeting Mode

The user types short entries during the meeting.

```text
entry -> live intervention cards -> apply card -> entry is strengthened
```

Cards can explain conflicts, alternatives, missing criteria, concept comparisons, and project-context conflicts. A vague entry such as "라즈베리 파이와 ESP32의 차이를 모르겠다" should produce a comparison / decision-support card, not just a generic "stuck" card.

### 3.2 Simple Memo Paste Mode

The user opens a large paste window and pastes rough meeting notes after a meeting.

```text
rough memo -> structure decisions/risks/questions -> meeting record -> task candidates
```

This mode does not provide real-time live cards. It is a fallback when IDEA CRUISE was not used during the meeting. The output still enters the same meeting-record and task-candidate pipeline.

## 4. Main Screen

The local web app has three primary columns and a bottom task board.

```text
[Left] Meeting Input
- Live entries.
- Mode buttons: Live Meeting / Simple Memo Paste.
- Add Entry.
- AI Analysis.
- Applied cards directly rewrite/strengthen the original entry.

[Middle] Live Intervention Cards
- Cards are aligned to the entry that triggered them.
- Multiple cards for one entry appear in the same row.
- The most important card appears expanded on the left of the row.
- Other cards are compressed tabs.
- Applying a card strengthens the left entry and removes that card.

[Right] Meeting Record
- The user manually clicks Generate Meeting Record.
- Record is prepared for Slack #project-log.
- The record is not the task-generation source of truth; IDEA CRUISE is.
- The record is an audit trail: decisions, evidence, risks, and task rationale.

[Bottom] Task Candidates From IDEA CRUISE
- Generated from strengthened meeting context by gpt-5.4.
- Each task card includes AI-drafted criteria fields.
- User edits criteria, selects assignee and importance.
- User applies selected tasks to Subjector.
```

## 5. Live Intervention Cards

Card generation should use a cheap, fast model because cards may be frequent.

Default card model:

```text
Gemini 2.5 Flash-Lite
```

Card types:

- Criteria Alignment Card.
- Completion Criteria Card.
- Output Level Card.
- Must / Can Skip Card.
- Assignee Discretion Card.
- Team Lead Question Card.
- Handoff Card.
- Goal Mismatch Card.
- Conflict Card.
- Alternative Card.
- Concept Comparison Card.

Cards should be practical and directly applicable. The card should include an improvement draft that can be applied to the triggering entry.

Example:

```text
Entry:
라즈베리 파이와 ESP32의 차이를 모르겠다.

Card:
Raspberry Pi is better for Linux, Python, camera, and heavier processing.
ESP32 is better for low-power sensor control, BLE/Wi-Fi, and simple embedded tasks.

Improvement draft:
Raspberry Pi is the main computer candidate for camera/AI work, while ESP32 is the low-power sensor/control candidate. Decide based on whether this task needs local processing or lightweight device control.
```

## 6. Meeting Record

The official Slack channel is unified as:

```text
#project-log
```

Slack display behavior is separate from the local web app. In Slack, a day can show only two main official posts:

```text
[회의 결과문] YYYY-MM-DD <topic>
[하루 요약 + 현재 프로젝트 상태] YYYY-MM-DD
```

Clicking a Slack post can open a separate detail/modal-style view. The local IDEA CRUISE web app still shows the right-side panel as `Meeting Record`, not as a Slack channel preview.

Meeting record role:

- Preserve why decisions were made.
- Preserve evidence, risks, and unresolved questions.
- Explain why tasks were generated.
- Give tomorrow's meeting a clear reference point.
- Avoid becoming a second task source.

## 7. Task Candidates

Task generation uses a stronger model because task quality matters.

Task generation model:

```text
gpt-5.4
```

Each generated task has:

```text
Title
Purpose
Output Level
Success Criteria
Must Do
Can Skip
Assignee Discretion
Handoff Notes
Ambiguous Criteria
Questions For Team Lead
Assignee
Importance
```

The AI drafts the criteria fields first. The user edits the fields directly in the task card. There is no separate edit button.

Only `Assignee` and `Importance` are shown as compact selection fields in the MVP. Coordination level and status are excluded from this screen.

Applying a task sends the approved task to Subjector's `in-process` flow.

## 8. Models And Cost Strategy

```text
Live cards:
Gemini 2.5 Flash-Lite

Task generation:
gpt-5.4
```

Reasoning:

- Cards can be frequent and should be cheap.
- Task generation happens less often and needs better context, criteria drafting, and handoff quality.
- Model provider boundaries should be explicit in code so models can be swapped later.

## 9. MVP Implementation Scope

The first implementation should build a local web app with deterministic mock AI behavior first. Real model calls and Subjector network integration can be wired after the UI and data flow are stable.

MVP should include:

- Static/local Node web app.
- Live Meeting mode.
- Simple Memo Paste mode UI.
- Entry list.
- Live card rows aligned to entries.
- Card apply behavior that directly rewrites/strengthens the entry and removes the card.
- Manual meeting record generation.
- Task candidate generation from strengthened context.
- Editable AI-drafted task criteria fields.
- Assignee and importance selectors.
- Mock "apply to Subjector" behavior.

Deferred:

- Real Gemini API calls.
- Real OpenAI API calls.
- Real Subjector API calls.
- Slack modal rendering.
- GitHub API sync.
- Audio transcription.

## 10. Success Criteria

The MVP is usable if:

- A user can enter live meeting ideas.
- The app can show multiple cards aligned to one entry.
- Applying cards strengthens the original entry.
- A user can paste rough notes through Simple Memo Paste mode.
- A user can manually generate a meeting record.
- The app can generate task candidates from IDEA CRUISE context.
- Each task candidate includes editable AI-drafted criteria.
- The user can select assignee and importance.
- The user can mark tasks as applied to Subjector.

## 11. Self-Review

- The spec reflects IDEA CRUISE as the sole task-generation front end.
- Subjector transcription and meeting-result task generation are removed from the target product boundary.
- `#project-log` is the single official Slack record channel.
- The local right panel remains Meeting Record.
- Live cards use Gemini 2.5 Flash-Lite.
- Task generation uses gpt-5.4.
- The MVP can be implemented without real external API calls first.
