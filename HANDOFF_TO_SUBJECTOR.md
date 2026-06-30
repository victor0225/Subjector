# IDEA CRUISE to Subjector Handoff

Date: 2026-06-30
Status: Context handoff for continuing work in the Subjector thread

## Why This Exists

IDEA CRUISE started as a local live brainstorming MVP, but the product direction changed during discussion.

The new direction is to merge IDEA CRUISE and Subjector into one continuous collaboration process rather than treating them as two separate products.

The user plans to continue implementation and product design from the Subjector Codex thread. This document preserves the IDEA CRUISE conversation, decisions, and revised direction so the Subjector thread can absorb them without losing context.

## Core Problem

The user is building a tactical headset graduation project with a small team. The deeper experiment is not just whether AI can summarize meetings or generate tasks. The experiment is whether a small team can use AI to adapt to a future style of work where:

- team members may have different completion standards,
- team members may move at different speeds,
- team members may define "good enough" differently,
- work often fails to transfer cleanly to the next person,
- emotional and coordination cost grows when standards are discovered too late.

The motivating example:

- The user expected a task to mean "make the core feature work in about 3 hours."
- Another person interpreted the task as "build a more complete app with admin password, better UI, and higher finish quality," and spent about 5 days.
- The output was not bad, but the team had not aligned on the intended output level before work started.

The product should reduce this mismatch before and during work, without becoming a surveillance or scoring tool.

## Revised Product Philosophy

The combined product should not primarily ask:

- Who worked harder?
- Who scored higher?
- Who followed the tool best?

It should ask:

- Did the team align on why this task exists?
- Did the assignee understand the expected output level?
- Is the success criterion clear enough to act on?
- What can be skipped without harming the current goal?
- What can the assignee decide independently?
- What must be confirmed with the team lead?
- Can the next person continue from this output without re-discovering context?

Important principles:

- Do not evaluate or control people.
- Do not force the team into a fixed workflow before observing how they actually work.
- Treat AI as a coordination layer that translates between team goals, individual work styles, and handoff-ready outputs.
- Focus less on whether someone worked hard and more on whether their work flows cleanly to the next person.
- The tool should make meetings leave durable results, not merely reduce meeting time.

## Proposed Unified Flow

```text
Meeting / brainstorming
-> IDEA CRUISE alignment layer
-> criteria-aligned task
-> Subjector task delivery and progress support
-> assignee works using any method
-> Subjector handoff readiness summary
-> next person / next meeting
```

IDEA CRUISE and Subjector should become one process:

- IDEA CRUISE handles the moment before tasks are created.
- Subjector handles the moment after tasks are created.

## IDEA CRUISE Role In The Unified Product

IDEA CRUISE is the meeting and task-birth layer.

It should help the team clarify a task before it becomes work:

- purpose,
- success criteria,
- output level,
- must-do items,
- skippable items,
- assignee discretion,
- handoff information,
- ambiguous criteria,
- questions for the team lead.

It should detect likely mismatches such as:

- team lead wants quick validation, assignee may interpret as polished deliverable,
- task says "research" but does not define comparison criteria,
- implementation task lacks minimum acceptance criteria,
- handoff expectations are missing,
- scope is expanding before the MVP standard is settled.

The live cards should shift from generic brainstorming cards to alignment cards.

Recommended card types:

- Criteria Alignment Card: asks whether work is quick validation, internal usable draft, or final deliverable.
- Completion Criteria Card: flags that "good enough" is not defined.
- Output Level Card: clarifies expected finish quality.
- Must / Can Skip Card: separates required work from optional polish.
- Assignee Discretion Card: identifies what the assignee can decide alone.
- Team Lead Question Card: isolates what must be asked before work starts.
- Handoff Card: asks what the next person needs to receive.
- Goal Mismatch Card: warns that leader intent and assignee interpretation may diverge.
- Existing Conflict / Alternative / GitHub Context Cards: remain useful but become secondary.

## Subjector Role In The Unified Product

Subjector is the execution and handoff layer.

It should take IDEA CRUISE's criteria-aligned task and preserve those criteria through work:

- task delivery,
- work-start guidance,
- progress updates,
- completion submission,
- handoff readiness summary,
- cumulative project memory.

Subjector should avoid score-like language. It should not say:

```text
This task is 72 points.
Criteria A is insufficient.
```

It should say:

```text
This result is enough for the next person to continue, but not enough for a final decision.
The use case is still unclear. Ask the team lead these two questions before expanding research.
```

Subjector's evaluation language should be reframed as:

- next-person readiness,
- decision clarity,
- risk visibility,
- goal alignment,
- handoff ease,
- criteria confidence.

## Unified Task Shape

Every task created from the IDEA CRUISE / Subjector process should include:

```text
Purpose:
Why this task exists.

Output Level:
Quick validation / internal usable draft / final deliverable.

Success Criteria:
What must be true for this task to count as done.

Must Do:
Required work.

Can Skip:
Explicitly allowed omissions.

Assignee Discretion:
What the assignee may decide without asking.

Handoff Notes:
What the next person needs to know or receive.

Ambiguous Criteria:
Parts of the task standard that are still unclear.

Questions For Team Lead:
Questions that should be answered before or during work.
```

Example:

```md
Title: Decide drone dataset candidates for tactical headset model

Purpose:
Narrow possible drone datasets for the tactical headset project so the model work can start from realistic candidates.

Output Level:
Quick validation.

Success Criteria:
- Top 3 candidate datasets are listed.
- Each candidate has a short reason for inclusion.
- Rejected candidates include the reason they were rejected.
- Remaining risks are explicit.

Must Do:
- Compare dataset license, annotation type, drone size/visibility, environment, and ease of use.
- Identify whether the dataset supports detection or only classification.

Can Skip:
- Full model training.
- Exhaustive survey of every drone dataset.
- Polished report formatting.

Assignee Discretion:
- Candidate ordering.
- Exact search sources.
- Whether to include borderline datasets as backup options.

Handoff Notes:
- Next person should be able to choose one dataset for a small model test.
- Include links and dataset access notes.

Ambiguous Criteria:
- Whether real-time detection or offline analysis is the main use case.
- Whether small indoor drones matter.

Questions For Team Lead:
- Is the immediate goal detection, classification, or both?
- Is quick model testing more important than dataset realism for this phase?
```

## MVP Scope After Merge

Do not build a separate full IDEA CRUISE app first unless the user explicitly reopens that route.

Recommended merged MVP:

- Keep Subjector as the main operating environment.
- Add an IDEA CRUISE-style meeting/task-alignment phase before task creation.
- Convert meeting outcomes into criteria-aligned task candidates.
- Let Subjector deliver those tasks to assignees.
- Let assignees work using Codex, web search, direct development, or any other method.
- On completion, Subjector summarizes output as handoff readiness rather than score.

Likely MVP surfaces:

- `#회의-결과록` or a meeting thread for criteria alignment.
- `#in-process` for aligned tasks.
- DM or modal flow for assignee work-start guidance.
- Completion modal for handoff-ready output.
- `#finals` for cumulative project memory.

## What To Preserve From Original IDEA CRUISE Design

Keep:

- live intervention concept,
- manual AI analysis button concept,
- cost sensitivity,
- Gemini Flash-Lite as possible low-cost default,
- LLM provider abstraction,
- GitHub organization as low-cost context,
- issue draft/task draft format,
- local/personalized learning as a future direction.

Change:

- no longer center the MVP around generic solo brainstorming,
- no longer treat GitHub Issue drafts as the main product outcome,
- no longer define success mainly by conflict/alternative cards,
- move the center to task standard alignment and handoff quality.

## What To Preserve From Subjector

Keep:

- Slack-centered team workflow,
- meeting-derived task candidates,
- task board,
- DM work cycle,
- `#finals` project memory,
- retry/error transparency,
- Supabase persistence,
- GitHub/Render deployment direction if still needed.

Change:

- remove score/grade framing,
- replace "task evaluation" with "handoff readiness",
- ensure task creation includes output level and success criteria,
- make work-start guidance method-neutral, not Codex-only,
- treat Codex as one possible work method, not a requirement.

## Integration Questions For Subjector Thread

The Subjector thread should decide:

1. Should the product name remain Subjector, with IDEA CRUISE as the meeting-alignment module?
2. Or should IDEA CRUISE become the parent product and Subjector become the execution module?
3. What is the smallest Slack flow that can test criteria alignment before task creation?
4. Which current Subjector database tables need fields for output level, success criteria, must-do, can-skip, discretion, handoff notes, ambiguous criteria, and team-lead questions?
5. Which existing LLM prompts need to be rewritten from scoring/evaluation to handoff readiness?
6. How should the UI make this feel supportive rather than supervisory?

## Current IDEA CRUISE Repository State

Repository:

```text
https://github.com/victor0225/IDEA-CRUISE.git
```

Local folder:

```text
C:\Users\C\IDEA CRUISE
```

Existing important files:

- `IDEA CRUISE.docx`: original user-written idea document.
- `docs/superpowers/specs/2026-06-30-idea-cruise-mvp-design.md`: earlier standalone IDEA CRUISE MVP design.
- `HANDOFF_TO_SUBJECTOR.md`: this merged-direction handoff.

The earlier standalone design is now historical context, not the recommended implementation direction.

## Recommended Next Step In Subjector Thread

Do not immediately code.

First update the Subjector design/spec around this merged flow:

```text
IDEA CRUISE meeting alignment
-> criteria-aligned task candidate
-> Subjector task delivery
-> method-neutral work support
-> handoff readiness completion
-> finals memory
```

Then write an implementation plan from that updated spec.
