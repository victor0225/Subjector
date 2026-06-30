# IDEA CRUISE Integrated MVP Design

Date: 2026-06-30
Status: Direction update for Subjector integration

## 1. Product Identity

The MVP name is now `IDEA CRUISE`.

`Subjector` remains the existing Slack bot, server, database, and task execution layer. In product language, Subjector is no longer the parent product. It is the execution and handoff layer inside IDEA CRUISE.

The integrated product should be understood as:

```text
IDEA CRUISE
-> meeting criteria alignment
-> criteria-aligned task creation
-> Subjector task delivery and work support
-> handoff readiness summary
-> cumulative project memory
```

## 2. Core Problem

The tactical headset project is also an experiment in future small-team work with AI.

The core problem is not the lack of a task board. The core problem is that teammates often start work with different standards for speed, quality, finish level, and "good enough." Those differences can create wasted time and emotional cost even when everyone works sincerely.

The product should reduce this mismatch before and during work.

IDEA CRUISE should not ask:

- Who worked harder?
- Who scored higher?
- Who followed the tool best?

It should ask:

- Why does this task exist?
- What output level is expected?
- What can be skipped for this phase?
- What can the assignee decide alone?
- What must be checked with the team lead?
- Can the next person continue without rediscovering context?

## 3. Unified Surface Strategy

IDEA CRUISE should not force everything into Slack.

The meeting and criteria-alignment phase should use a local web app because that experience is easier for the user during live thinking. The local web app can show cards, questions, task-shaping prompts, and session output without crowding Slack threads.

Slack remains useful after criteria alignment:

- `#회의-결과록`: meeting recordings, meeting records, and durable meeting output.
- `#in-process`: criteria-aligned task delivery and task actions.
- `#finals`: cumulative project memory.
- Bot DM: start work, refresh, end work, manual imports, and summaries.

The MVP should allow a simple bridge from the local web app to Subjector:

1. IDEA CRUISE local web app produces criteria-aligned task packets.
2. The user imports or pastes the packets into Subjector.
3. Subjector creates task candidates and sends them to assignees for review.
4. Accepted or edited candidates appear in `#in-process`.

Full automatic sync between the local web app and Slack can come later. The first integrated MVP should protect the core workflow without overbuilding the bridge.

## 4. IDEA CRUISE Meeting Alignment Layer

IDEA CRUISE is the task-birth layer.

It watches a meeting or brainstorming session and helps clarify work before it becomes a task. It can be driven by typed notes, pasted meeting text, or later by imported transcript summaries.

The local web app should focus on alignment cards:

- Criteria Alignment Card: asks whether the task is quick validation, internal usable draft, or final deliverable.
- Completion Criteria Card: flags that "good enough" is not defined.
- Output Level Card: clarifies expected finish quality.
- Must / Can Skip Card: separates required work from optional polish.
- Assignee Discretion Card: identifies what the assignee can decide alone.
- Team Lead Question Card: isolates what must be asked before work starts.
- Handoff Card: asks what the next person needs to receive.
- Goal Mismatch Card: warns when team-lead intent and assignee interpretation may diverge.
- Conflict, alternative, scope, cost, and GitHub context cards remain useful but are secondary to criteria alignment.

## 5. Criteria-Aligned Task Shape

Every task created from IDEA CRUISE should carry the alignment context into Subjector.

Required task fields:

```text
Purpose:
Why this task exists.

Output Level:
Quick validation / internal usable draft / final deliverable.

Success Criteria:
What must be true for this task to count as useful.

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

Example task:

```text
Title:
Decide drone dataset candidates for the tactical headset model.

Purpose:
Narrow possible drone datasets so model work can start from realistic candidates.

Output Level:
Quick validation.

Success Criteria:
Top 3 candidate datasets are listed, each candidate has a reason, rejected candidates include the rejection reason, and remaining risks are explicit.

Must Do:
Compare license, annotation type, drone size and visibility, environment, detection/classification fit, and ease of use.

Can Skip:
Full model training, exhaustive dataset survey, polished report formatting.

Assignee Discretion:
Candidate ordering, search sources, and whether to include borderline backup options.

Handoff Notes:
The next person should be able to choose one dataset for a small model test.

Ambiguous Criteria:
Whether real-time detection or offline analysis is the main use case.

Questions For Team Lead:
Is the immediate goal detection, classification, or both?
```

## 6. Subjector Execution Layer

Subjector receives criteria-aligned tasks and preserves the criteria through work.

Current Subjector features to keep:

- meeting-derived task candidates,
- assignee candidate review,
- `#in-process` task board,
- direct work and Codex-assisted work paths,
- change request flow,
- daily summaries,
- `#finals` cumulative memory,
- Supabase persistence,
- Render deployment.

Current Subjector framing to change:

- Do not present Codex as the default or required work method.
- Do not frame completion as scoring.
- Do not use language that sounds like the person is being graded.
- Do not describe LLM output as "검수" when the goal is handoff usefulness.

Work-start actions should eventually become method-neutral:

```text
작업 시작
- Codex로 진행
- 직접 진행
- 자료조사로 진행
- 기준 먼저 질문
```

The current `수락 및 Codex 프롬프트 생성` button can remain during transition, but the product direction is method-neutral.

## 7. Handoff Readiness

The old completion evaluation should be reframed.

Replace:

```text
점수
검수
보완 필요
보완 제출
```

With:

```text
인수인계 점검
이어받기 전 확인 필요
인수인계 보강
handoff readiness
next-person usefulness
```

The system should not explain readiness with `상/중/하` labels. It should explain the context in natural language:

```text
지금 결과는 다음 사람이 후보를 좁히는 데는 충분합니다.
다만 최종 선택으로 가기에는 사용 목적이 아직 흐립니다.

좋은 점:
추천 후보와 탈락 후보가 나뉘어 있어 다음 사람이 다시 검색을 시작하지 않아도 됩니다.

부족한 점:
실시간 탐지용인지, 사후 분석용인지가 정리되지 않아 최종 후보를 고르기 어렵습니다.

보강하면 좋은 것:
팀장에게 사용 목적을 먼저 확인하고, 상위 3개 후보의 라이선스와 annotation 형식을 한 줄씩 추가해 주세요.
```

Recommended readiness dimensions:

- next-person readiness,
- decision clarity,
- risk visibility,
- goal alignment,
- handoff ease,
- criteria confidence.

These dimensions are not user-facing scores. They are analysis lenses used to write useful feedback.

## 8. Completion And Progress Output

`완료` should mean "the assignee believes this is ready to hand off," not "the AI has graded this as good."

When the output is not ready, Subjector should say that the handoff is blocked by missing context, not that the person failed.

Preferred message:

```text
지금 결과는 다음 사람이 바로 이어받기에는 한 가지 기준이 비어 있습니다.

자료를 더 많이 찾기보다, 먼저 "빠른 후보 압축이 목표인지, 최종 선정이 목표인지"를 확인하면 시간을 줄일 수 있어요.
```

`오늘은 여기까지` should also produce handoff-aware progress:

```text
오늘 진행한 것
현재 판단
아직 애매한 기준
다음 사람이 보거나 이어서 할 것
막힌 이유
질문할 사람
```

## 9. Team Lead And Assignee UX

Team lead UX:

- show likely standard mismatches before work starts,
- show where task scope may be interpreted too broadly,
- recommend one or two clarifying questions,
- avoid micromanagement language.

Assignee UX:

- explain why the task exists,
- explain the expected output level,
- clarify what can be skipped,
- suggest a work method without forcing Codex,
- show what the next person needs from the output.

Example:

```text
이번 task는 완벽한 조사가 아니라 빠른 후보 압축에 가깝습니다.

후보를 더 늘리기보다 상위 3개만 남기고, 왜 나머지를 탈락시켰는지 적어주면 다음 사람이 바로 모델 테스트 후보를 고를 수 있습니다.
```

## 10. Data And Prompt Changes Needed

Future implementation should add or map these task fields:

- `output_level`,
- `success_criteria`,
- `must_do`,
- `can_skip`,
- `assignee_discretion`,
- `handoff_notes`,
- `ambiguous_criteria`,
- `lead_questions`.

Prompt changes needed:

- meeting task extraction prompt should generate criteria-aligned task packets,
- Codex prompt should become method-neutral and explain Codex as one possible path,
- task evaluation prompt should become handoff readiness analysis,
- daily summary should mention handoff blockers and next-person usefulness,
- finals summary should describe project flow, unresolved criteria, and handoff risks.

## 11. MVP Implementation Order

Recommended order:

1. Product language cleanup:
   Replace `점수/검수/보완 필요` language with handoff readiness language in docs, prompts, Slack messages, and tests.

2. Criteria-aligned task packet:
   Extend meeting task extraction and candidate review so every task includes purpose, output level, must-do, can-skip, discretion, handoff notes, ambiguous criteria, and lead questions.

3. Local IDEA CRUISE web app:
   Build or move the HTML-style local app into the integrated product as the meeting alignment workspace.

4. Import bridge:
   Let the local web app export criteria-aligned task packets that Subjector can import through a paste or file flow.

5. Later automation:
   Add optional GitHub context, automatic sync, richer local personalization, and deeper team learning only after the simple workflow proves useful.

## 12. Success Criteria

The integrated MVP is working if, after a real meeting:

- tasks include why they exist and what level of output is expected,
- assignees know what can be skipped,
- unclear criteria are visible before work expands,
- completion feedback helps the next person continue,
- the tool feels supportive rather than supervisory,
- the team spends less time discovering standard mismatches after the work is already done.

## 13. Historical Inputs

This design absorbs:

- `HANDOFF_TO_SUBJECTOR.md` from the IDEA CRUISE repository,
- `docs/superpowers/specs/2026-06-30-idea-cruise-mvp-design.md` from the standalone IDEA CRUISE repository,
- `IDEA CRUISE.docx`,
- the existing Subjector MVP implementation and usage guide.

The standalone IDEA CRUISE design is historical context. The current direction is one integrated MVP named IDEA CRUISE with Subjector as the execution layer.
