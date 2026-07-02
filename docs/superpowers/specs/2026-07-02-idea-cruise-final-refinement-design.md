# IDEA CRUISE Final Refinement Design

## Goal

IDEA CRUISE is responsible for turning meeting context into non-overlapping execution work before anything reaches Subjector. Subjector in-process should not make a second duplicate-task judgment; it should operate the tasks and updates IDEA CRUISE has already refined.

## Responsibility Split

IDEA CRUISE:
- Reads completed topic pages and current in-process tasks.
- Compares goals, needed information, done criteria, assignee, status, and expected output.
- Produces only non-overlapping new tasks as task candidates.
- Separates existing task boosts from new tasks.
- Separates meeting decisions or immediately answered concepts into not-task notes.

Subjector in-process:
- Receives approved new tasks.
- Receives approved boosts to existing tasks.
- Manages acceptance, help, work submission, change, and daily continuation.
- Does not run a second AI duplicate check.

## Final Refinement Buckets

### New Task

A new task is created only when it has a distinct output from current in-process tasks and needs time outside the meeting.

Required fields:
- title
- neededInfo
- doneCriteria
- importance
- reason explaining why it does not overlap existing tasks

### Existing Task Boost

An existing task boost is used when meeting content should strengthen an existing task instead of creating another task.

The card shows two sections:
- `확인할 것에 추가`: safe context to add to `context.neededInfo`.
- `완료 기준 변경 제안`: a possible change to `context.doneCriteria`, applied only when the user explicitly chooses `완료 기준 변경 포함`.

Available actions:
- `확인할 것만 보강`
- `완료 기준 변경 포함`
- `제거`

Boost history is stored in `context.ideaCruiseBoosts` so later project-log/finals summaries can explain how the task changed.

### Not Task

Not-task notes are generated for:
- meeting decisions that should be recorded, not assigned;
- concepts the AI can answer immediately;
- wording cleanup;
- items already covered by existing work.

The user can remove each not-task note after reviewing it.

## Deferred Context

The following concepts are intentionally not shown as primary in-process fields in the next implementation phase, but the reasoning is preserved here for possible reintroduction:

- Coordination: hidden from the execution UI because it does not directly tell the assignee what to do next. The database field can remain for compatibility.
- Assignment reason: not needed in the main execution path for a three-person team once IDEA CRUISE has assigned the task.
- Dependency and confidence: useful later for complex project planning, but too heavy for the MVP execution board.
- Meeting-record based task extraction: legacy path. IDEA CRUISE should be the only task creation front door.

## Model Split

- Live intervention cards: GPT-5.4, because real-time conflict and context detection is the hardest reasoning step.
- Final task refinement: Gemini 2.5 Flash, because it must compare completed topic pages with current tasks and classify outputs into new task, existing task boost, or not-task.
- In-process execution display: no AI.
- Help/strategy in in-process: lightweight AI later, only when the assignee asks for help.
