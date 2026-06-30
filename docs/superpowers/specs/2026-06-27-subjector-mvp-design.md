# Subjector MVP Design

> Historical note: this document describes the earlier Slack-centered Subjector MVP.
> As of 2026-06-30, the product direction is superseded by
> `docs/superpowers/specs/2026-06-30-idea-cruise-subjector-integration-design.md`.
> The current MVP name is `IDEA CRUISE`, with Subjector treated as the execution and handoff layer.

Date: 2026-06-27
Status: Scope locked for user review

## 1. Purpose

Subjector is a Slack-centered project coordination bot for a three-person graduation-project team: 조수현, 김조은, 배민성.

The product exists because project work was losing context between meetings, individual work, Codex sessions, and daily summaries. Subjector turns meeting recordings and team decisions into practical tasks, Codex-ready prompts, change-request flows, and cumulative project records.

The MVP keeps Slack as the main UI and Codex as each person's execution partner. Subjector does not replace Codex and does not monitor Codex sessions automatically. It gives Codex the right context, collects the result back into Slack, and keeps the shared project record coherent.

## 2. MVP Architecture

### 2.1 Runtime

- Backend: Node.js with Slack Bolt.js.
- Hosting: Render Starter Web Service, kept on during the MVP.
- Database: Supabase/Postgres.
- Repository: private GitHub repo named `subjector`.
- Deployment: GitHub push triggers Render auto-deploy.
- Secrets: Render environment variables only.

Render stays on because Slack events must be received reliably. Turning the server off would make DM commands, file uploads, buttons, and modals fail while the server is unavailable.

### 2.2 External APIs

- OpenAI API is paid by 조수현's API key.
- ChatGPT Plus/Pro is separate from API billing.
- Transcription/diarization target model: `gpt-4o-transcribe-diarize`.
- Meeting/task/impact/finals reasoning target model: `gpt-5.5`.
- Billing/quota failures must be visible in Slack and retriable.

## 3. Slack Surfaces

### 3.1 `#회의-결과록`

Purpose:

- Receive iPhone M4A/MPEG-4 meeting recordings.
- Hold meeting result threads.
- Receive text change proposals.
- Hold meeting-needed agenda drafts.

Rules:

- No casual chatter in this channel for MVP.
- Subjector analyzes normal text messages immediately.
- If a text message is not a change proposal, Subjector replies in-thread that no task change was found.
- Meeting outcomes are entered by uploading a meeting recording, not by manually typing full meeting results.

### 3.2 `#in-process`

Purpose:

- Shared current task board.
- One task area per person.
- Each task includes context, status, importance, coordination, dependencies, and buttons.

Task buttons:

- `수락 및 Codex 프롬프트 생성`
- `완료`
- `오늘은 여기까지`
- `변경 요청`
- `회의 요청`

The old separate `수락` and `Codex에서 진행` buttons are merged. The first button both accepts the task and creates the Codex prompt.

### 3.3 `#finals`

Purpose:

- Cumulative project record.
- Not today's task summary.
- Keeps current project truth, unresolved decisions, conflicts, and change history.

Sections:

- 하드웨어
- 데이터 수집
- 모델 실행
- 확정 결정
- 확인 대기
- 미결정
- 충돌/리스크
- 충돌/변경 이력

Current summaries may be rewritten. Conflict/change history is cumulative and must not be deleted.

## 4. Meeting Recording Flow

1. A user uploads an iPhone M4A/MPEG-4 recording to `#회의-결과록`.
2. Subjector downloads it temporarily.
3. If needed, Subjector compresses/splits the file into chunks under about 25 MB.
4. Subjector transcribes and diarizes the chunks.
5. Subjector merges the chunks into one timeline.
6. Subjector shows `Speaker A/B/C`.
7. 조수현 maps speakers to 조수현, 김조은, 배민성.
8. Subjector attaches the named full transcript as a `.txt` file in the Slack thread.
9. Subjector creates a practical meeting summary.
10. Subjector creates task-change proposals.
11. 조수현 approves meeting-derived broad task updates.
12. Subjector updates `#in-process`.

Full transcript and audio are not stored in Supabase. Transcript text is kept as a Slack file attachment. Supabase stores summaries, tasks, statuses, approvals, and Slack identifiers.

## 5. Text Change Proposal Flow

Any of the three users may post a change proposal in `#회의-결과록`.

Suggested format:

```text
[변경 제안]

[주장]

[근거]
```

Subjector must infer impacted people/tasks. Users are not required to know that themselves.

If the proposal is important or coordination-heavy but too short, Subjector opens a Slack modal asking for:

- 변경 이유/근거
- 기존 방향 처리: 폐기, 대안으로 유지, 보류, 모르겠음

Subjector does not ask the user to identify impacted tasks or people.

After analysis:

- All impacted people must vote `찬성` for the change to apply.
- If anyone votes `반대`, Subjector does not apply the change and creates a meeting-needed agenda.
- Votes require a reason.

## 6. Personal Task Change Request Flow

When a person is already working on a task and discovers an impactful change:

1. Codex should stop and draft a change request.
2. The assignee clicks `변경 요청` on the `#in-process` task.
3. The assignee pastes the Codex-generated draft.
4. Subjector analyzes impacted people/tasks.
5. Impacted people vote `찬성` or `반대` with reasons.
6. All `찬성` applies the change.
7. Any `반대` creates a meeting-needed agenda.

Change request draft must include:

- `[변경 제안]`
- `[주장]`
- `[근거]`
- 영향받는 사람/task
- 동의가 필요한 이유

## 7. Daily Work Cycle

Presence detection is removed from MVP. The current design uses explicit DM commands.

### 7.1 Start Work

Each person sends Subjector DM:

```text
출근
```

Subjector replies by DM with that person's today's context:

- Why the task exists.
- Which meeting/change created it.
- Relevant claims/evidence.
- What to do today.
- What to use Codex for.
- Completion criteria.

At the same time, Subjector updates that person's task area in `#in-process`.

### 7.2 End Work

Each person sends Subjector DM:

```text
퇴근
```

Subjector creates that person's daily summary by DM.

The summary includes:

- Completed tasks.
- `오늘은 여기까지` tasks.
- Accepted but unreported tasks, shown as `미정리`.
- Tasks not accepted, shown as `미시작`.
- Change requests and meeting-needed items.

Subjector does not block 퇴근 to ask for missing task input. If a task is accepted but has no `완료` or `오늘은 여기까지` result, it is simply marked `미정리`.

### 7.3 `#finals` Update

When all three users have sent `퇴근` for the day, Subjector creates a `#finals` update preview once for that day.

If someone forgets, only 조수현 can send:

```text
finals 업데이트
```

This generates the same preview using available task states and thread records. If a user's DM summary is missing, the preview must say that the update is based on `#in-process` task records only.

## 8. Task Statuses

MVP task statuses:

- `미시작`: not accepted yet.
- `수락`: accepted and Codex prompt generated.
- `완료`: assignee submitted final Codex result through the task.
- `오늘은 여기까지`: assignee submitted progress state before finishing.
- `미정리`: accepted but no end-of-day result was submitted.
- `변경 요청 중`: change proposal waiting for impacted-person votes.
- `회의 필요`: disagreement or unresolved high-coordination decision.

Next-day behavior:

- Completed tasks are hidden from `#in-process`.
- Completed records remain in Supabase and `#finals`.
- `오늘은 여기까지`, `미정리`, and `미시작` tasks are considered during the next `출근` update.
- New tasks are not automatically added just because another task was completed during the same day.

## 9. Codex Handoff Prompt

When the assignee clicks `수락 및 Codex 프롬프트 생성`:

1. The task becomes accepted.
2. Subjector posts a long Codex prompt in the task thread.
3. The `프롬프트 복사` button appears above the prompt content.
4. The assignee copies the prompt into Codex.

The prompt must include:

- Project overview.
- Assignee identity.
- Task objective.
- Meeting/change context.
- Known decisions.
- Unknown decisions.
- Importance and coordination.
- Dependencies and blocked conditions.
- Superpowers instruction.
- Question-first working rule.
- Change-impact A/B/C rule.
- Mid-work stop command.
- Final submission command.
- Slack-ready result templates.

### 9.1 Change-Impact Rule

Codex must classify emerging changes:

- A: personal/internal adjustment. Continue.
- B: minor change. Record in final output.
- C: impactful change. Stop and draft a Slack change request before continuing.

C includes changes affecting another person's task, `#finals`, hardware/data/model structure, workload, schedule, or high-coordination scope.

### 9.2 Mid-Work Stop Command

If the user types:

```text
오늘은 여기까지
```

Codex outputs:

```text
[오늘의 진행 상태]
- 오늘 실제로 한 것:

[현재 결론]
- 아직 임시 결론이면 임시라고 표시:

[남은 것]
- 다음에 이어서 할 일:

[막힌 것]
- 막힌 이유 또는 필요한 정보:

[변경사항]
- 다른 사람/task에 영향을 줄 수 있는 변경이 있으면 명시:

[다음 시작 지점]
- 다음 Codex 세션에서 바로 이어갈 수 있는 첫 작업:
```

The assignee clicks `오늘은 여기까지` in Slack and pastes this output into the large text box.

### 9.3 Final Submission Command

If the user types:

```text
완료 제출 결과 작성해줘
```

Codex outputs:

```text
[완료 제출 결과]

[수행 결과]
- 실제로 무엇을 했는지:

[결론]
- 최종 결론 또는 추천:

[근거]
1.
2.
3.

[산출물]
- 만든 파일/문서/코드/조사 결과:
- 위치 또는 링크:

[영향받는 task]
- 조수현:
- 김조은:
- 배민성:

[변경사항]
- 기존 계획과 달라진 점:
- 영향이 없으면 "영향 있는 변경사항 없음":

[남은 리스크]
- 아직 확인이 필요한 점:

[다음 사람이 이어받을 때 볼 것]
- 이어서 봐야 할 핵심:
```

The assignee clicks `완료` in Slack and pastes this output into the large text box.

## 10. `#finals` Preview And Revision

Subjector does not write directly to `#finals`.

Flow:

1. Subjector creates `#finals 업데이트 미리보기`.
2. Subjector sends it to 조수현 by DM.
3. 조수현 chooses `#finals에 반영`, `수정 요청`, or `보류`.
4. If `수정 요청` is clicked, Slack opens one large text box.
5. 조수현 writes natural-language revision instructions.
6. Subjector generates a new preview version.
7. Nothing is written to `#finals` until 조수현 approves.

## 11. Health, Setup, And Permissions

Health URL:

```text
https://subjector.onrender.com/health
```

The page asks for a shared PIN. It shows only statuses, never secret values.

Health checks:

- Server status.
- Slack connection.
- Supabase connection.
- OpenAI API status.
- Required channels:
  - `#회의-결과록`
  - `#in-process`
  - `#finals`
- Recent processing failures.

Install verification must include real test messages in the three required channels. Test messages can remain as setup records.

## 12. Error And Retry Behavior

For OpenAI billing/quota, transcription failures, Slack permission issues, or processing failures:

- Post the failure in the original Slack thread.
- DM 조수현 with the failure summary.
- Include likely cause.
- Include manual recovery action.
- Include `다시 처리` when retry is possible.

MVP does not include a full queue/replay system. If Render restarts or an event is missed, users recover by retrying, reuploading, or reclicking.

## 13. Data Storage

Supabase stores:

- Users and Slack IDs.
- Slack channel IDs and message timestamps.
- Meeting records.
- Speaker mapping.
- Summaries.
- Task records and statuses.
- Change proposals.
- Votes and rationales.
- Codex prompt records.
- Finals preview/update records.
- Processing status and errors.

Supabase does not store:

- Original audio files.
- Full raw meeting transcripts.
- OpenAI API key or Slack tokens in user-visible records.

## 14. Original Idea Alignment

Preserved:

- Slack + Codex as the main operating environment.
- Meeting recording transcription.
- Speaker-separated transcript.
- Meeting summary by topic, claim, evidence, and context.
- Meeting-derived task updates.
- Per-person task board.
- Importance and coordination levels.
- Change proposal with impacted-person choice.
- Disagreement leading to a meeting.
- Daily work summary.

Changed:

- Automatic voice-to-person identification becomes manual Speaker A/B/C mapping in MVP.
- `그대로 가자` / `변경하자` becomes `반대` / `찬성`.
- `코덱스에서 진행` becomes `수락 및 Codex 프롬프트 생성`.
- Presence-based 출근/퇴근 becomes explicit DM commands: `출근`, `퇴근`.
- `#finals` writes require 조수현 preview approval.

Deferred:

- Personal learning agent for each teammate.
- Automatic Codex session monitoring.
- Direct opening/controlling Codex from Slack.
- Local desktop tray app.
- Automatic voice identity training.
- Full queue/replay recovery.

## 15. Visual Mockups

Brainstorming mockups live in `.superpowers/brainstorm/`.

Most current full-day flow:

```text
.superpowers/brainstorm/full-day-workflow-simulation.html
```

This mockup now shows the `프롬프트 복사` button above the prompt content.

## 16. Implementation Scope Lock

MVP scope is locked around these deliverables:

1. Slack Bolt server.
2. Supabase schema and data access.
3. Render deployment and health page.
4. Slack channel setup verification.
5. Meeting audio upload processing.
6. Speaker mapping.
7. Meeting summary and task proposal.
8. `#in-process` task board with buttons.
9. Codex prompt generation with copy-first UX.
10. `완료`, `오늘은 여기까지`, `변경 요청`, `회의 요청`.
11. DM commands: `출근`, `퇴근`, `finals 업데이트`.
12. `#finals` preview, revision, and approval.
13. Error handling and retry.

No implementation should add deferred features unless the user explicitly reopens scope.

## 17. Self-Review

- No placeholder decisions remain for MVP behavior.
- Presence-based automation is explicitly removed.
- `#finals` automatic write is prevented by preview approval.
- Codex handoff has both mid-work and final submission commands.
- Original idea changes are documented.
- The implementation scope is narrow enough for a first build plan.
