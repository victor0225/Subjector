# Subjector Handoff Summary

## 2026-06-30 Direction Update

The current MVP product name is now `IDEA CRUISE`.

Subjector remains the existing Slack bot, Render service, Supabase store, and execution layer, but it is no longer the parent product concept. The new direction is:

```text
IDEA CRUISE local meeting alignment
-> criteria-aligned task packets
-> Subjector Slack task delivery
-> method-neutral work support
-> handoff readiness
-> #finals cumulative project memory
```

Authoritative integration spec:

- `docs/superpowers/specs/2026-06-30-idea-cruise-subjector-integration-design.md`

Key product-language changes:

- Replace `점수/검수/보완 필요` framing with `handoff readiness/인수인계 점검/이어받기 전 확인 필요`.
- Do not explain readiness with `상/중/하` or numeric scores. Explain what is useful, what is missing, and what to clarify next.
- Treat Codex as one possible work method, not a required path.
- Use the local IDEA CRUISE web app for meeting criteria alignment instead of forcing the whole meeting flow into Slack.

The older Subjector MVP notes below remain historical context and may contain superseded decisions such as finals preview approval and Slack-only UI assumptions.

Last updated: 2026-06-30

This file preserves the current product context so the project can continue even if the Codex conversation is compacted or restarted.

## Historical MVP Lock

The earlier Subjector-only MVP scope was locked as of 2026-06-27. It is now historical context for the IDEA CRUISE integrated MVP direction.

Earlier design spec:

- `docs/superpowers/specs/2026-06-27-subjector-mvp-design.md`

Day 1 implementation plan:

- `docs/superpowers/plans/2026-06-27-subjector-day1-foundation.md`

GitHub repository:

- `https://github.com/victor0225/Subjector.git`
- Remote branch `origin/main` is connected and the initial Day 1 foundation was pushed in commit `d2d6193`.

Most current visual simulation:

- `.superpowers/brainstorm/full-day-workflow-simulation.html`

Latest operating model:

- Subjector runs as a cloud Slack bot on Render Starter, kept on during the MVP.
- Supabase/Postgres stores state, summaries, tasks, votes, message IDs, prompt records, and finals records.
- Team members work in Slack and paste Subjector-generated prompts into their own Codex sessions.
- Slack is the main UI. There is no local desktop app for MVP.
- Presence-based active/away automation is removed from MVP.
- Each person starts work by DMing Subjector: `출근`.
- Each person ends work by DMing Subjector: `퇴근`.
- 조수현 can force finals preview generation with DM command: `finals 업데이트`.
- `#finals` is never updated directly without 조수현's preview approval.
- `수락` and `Codex에서 진행` are merged into `수락 및 Codex 프롬프트 생성`.
- The generated Codex prompt must show `프롬프트 보기/복사` above the prompt content.
- Mid-work Codex command: `오늘은 여기까지`.
- Final Codex command: `완료 제출 결과 작성해줘`.
- `#in-process` task buttons are `수락 및 Codex 프롬프트 생성`, `완료`, `오늘은 여기까지`, `변경 요청`, `회의 요청`.

## Current Implementation Status

Day 1 foundation scaffold is implemented and pushed to GitHub. It is ready to connect to real Slack, Supabase, OpenAI, and Render credentials.

Implemented:

- Git repository initialized locally on branch `main`.
- GitHub remote `origin` set to `https://github.com/victor0225/Subjector.git`.
- Node.js ESM project scaffold:
  - `package.json`
  - `.gitignore`
  - `.env.example`
  - `README.md`
- Dependencies installed with pnpm:
  - `@slack/bolt`
  - `@supabase/supabase-js`
- Pure modules:
  - `src/config.js`
  - `src/envFile.js`
  - `src/domain/users.js`
  - `src/domain/dmCommands.js`
  - `src/domain/codexPrompt.js`
  - `src/domain/health.js`
  - `src/slack/blocks.js`
  - `src/slack/events.js`
- Slack app shell:
  - `src/slack/app.js`
  - `src/server.js`
- Slack app manifest:
  - App Home Messages tab enabled for `출근`/`퇴근` DM usage.
  - `files:read` and `files:write` included for meeting audio reads and transcript/result uploads.
- Slack app setup progress:
  - Slack app token/signing secret, channel IDs, and member IDs were collected by the user in the local ignored file `references.txt`.
  - The bot was invited to `#회의-결과록`, `#in-process`, and `#finals`.
  - Do not commit or quote the token/signing secret.
  - Use `display_name: "민성"` for 배민성 even if the Slack display name is `Corvus Gold`, so Subjector says `민성님`.
  - Use `display_name: "조은"` for 김조은 unless the user explicitly changes it.
- Supabase setup progress:
  - Supabase project was created by the user.
  - Supabase project URL and server-side secret key were collected in the local ignored file `references.txt`.
  - Do not commit or quote the Supabase server-side secret key.
  - `supabase/migrations/0001_initial.sql` was run in Supabase SQL Editor.
  - Three user rows were seeded in Supabase: 조수현/김조은/배민성.
  - Local smoke check with `@supabase/supabase-js` successfully read 3 users from the remote `users` table.
  - 배민성 has `display_name = "민성"` in Supabase, so Subjector can say `민성님`.
- Supabase setup files:
  - `supabase/migrations/0001_initial.sql` creates the MVP schema.
  - All MVP tables have Row Level Security enabled with no public policies.
  - `docs/setup/supabase-setup.md` explains project creation, SQL execution, user seed rows, and required env values.
- Render setup progress:
  - Initial Render deploy failed with `Internal Error: EROFS: read-only file system, unlink '/usr/bin/pnpm'`.
  - Root cause: the build command included `corepack enable`, which tried to modify Render's system `pnpm` shim.
  - Use `Build Command: pnpm install --frozen-lockfile`.
  - Use `Start Command: pnpm start`.
  - Do not include `corepack enable` in the Render build command.
  - Setup guide: `docs/setup/render-setup.md`
- Slack/Render smoke test:
  - Render `/health` loads and shows configured services as 정상.
  - Subjector Bot replies to DM commands `출근` and `퇴근`.
  - `출근` is now wired to create or update the user's `#in-process` task area.
  - If the user has no assigned tasks, `#in-process` shows "현재 배정된 task가 없습니다."
  - Task action buttons are wired for task rows shown in `#in-process`: `완료`, `오늘은 여기까지`, `변경 요청`.
  - Each task button opens a Slack modal with one large text box.
  - `완료` stores a `task_results` row and changes task status to `완료`.
  - `오늘은 여기까지` stores a `task_results` row and changes task status to `오늘은 여기까지`.
  - `변경 요청` stores a `change_requests` row and changes task status to `변경 요청 중`.
  - `수락 및 Codex 프롬프트 생성` now changes task status to `수락`, stores `accepted_at`, generates the Subjector Codex prompt, posts it in the user's `#in-process` board thread with `프롬프트 보기/복사` above the prompt body, and stores the prompt in `codex_prompts`.
  - `프롬프트 보기/복사` is handled by Slack interactivity. It immediately acknowledges the button and sends the user an ephemeral copyable prompt body. Slack cannot directly copy text to the clipboard from a server-side button.
  - Accepted tasks no longer show the `수락 및 Codex 프롬프트 생성` button again. Instead, they show `Codex 프롬프트 보기/복사`, which retrieves the stored prompt without creating a duplicate prompt.
  - Task statuses in `#in-process` are displayed as red/yellow/green Slack-friendly badges.
  - If a stored `#in-process` board message was manually deleted and Slack returns `message_not_found`, Subjector recreates the board message and stores the new Slack timestamp on the next board refresh.
  - `퇴근` now records the user's end-of-work session, changes still-accepted tasks to `미정리`, refreshes the user's `#in-process` board, gathers today's task results/change requests, and sends a DM daily summary.
  - Daily summaries show one final state per task. If a task has both `오늘은 여기까지` and `완료` submissions on the same day, the current final task status decides where it appears.
  - `finals 업데이트` now lets 조수현 generate a cumulative `#finals` preview by DM and stores the preview in `finals_updates`.
  - The `#finals` preview DM includes an approval button. When 조수현 approves, Subjector posts or updates the cumulative `#finals` message and marks the preview as `승인됨`.
  - When all configured users have sent `퇴근` for the day and no finals update exists for that date, Subjector automatically creates a `#finals` preview and sends it to 조수현 by DM with the approval button.
  - Voting and OpenAI impact analysis are not wired yet.
- Tests:
  - `tests/config.test.js`
  - `tests/envFile.test.js`
  - `tests/dmCommands.test.js`
  - `tests/codexPrompt.test.js`
  - `tests/health.test.js`
  - `tests/blocks.test.js`
  - `tests/slackEvents.test.js`
  - `tests/slackManifest.test.js`
  - `tests/supabaseMigration.test.js`
  - `tests/inProcessBoard.test.js`
  - `tests/inProcessService.test.js`
  - `tests/slackApp.test.js`
  - `tests/supabaseStore.test.js`
  - `tests/taskActions.test.js`

Verification:

- `pnpm test` passes: 100 tests, 0 failures.
- `node src/server.js` without `.env` exits with a clear missing-environment-variable message.
- Slack app factory can be created with `deferInitialization: true` without network verification.
- `git diff --cached --check` reports no staged whitespace/conflict-marker problems.

Not yet implemented:

- Slack workflows beyond `출근`, `퇴근` daily summary, basic `#in-process` board update, and first task action modal submissions.
- Slack vote/approval workflows for change requests.
- Broader Supabase persistence workflows beyond work-session start, task result submission, change request creation, and `#in-process` message tracking.
- Real OpenAI calls.
- Meeting audio pipeline.
- Full `#in-process` update lifecycle.
- Change-request voting workflow.
- Voting/approval workflows for task change requests.

Current MVP statuses:

- `미시작`
- `수락`
- `완료`
- `오늘은 여기까지`
- `미정리`
- `변경 요청 중`
- `회의 필요`

Original idea alignment:

- Preserved: Slack + Codex, meeting recording transcription, speaker-separated transcript, claim/evidence summary, per-person tasks, impacted-person agreement, disagreement-to-meeting, daily summaries.
- Changed: automatic voice identity becomes manual Speaker A/B/C mapping; presence automation becomes DM commands; `그대로 가자/변경하자` becomes `반대/찬성`; direct `코덱스에서 진행` becomes prompt handoff.
- Deferred: personal learning agents, automatic Codex session monitoring, direct Codex control from Slack, local tray app, automatic voice training, full replay queue.

## Source Idea

- Original idea file: `subjector.docx`
- Product name: `Subjector`
- First users/customers: Jo Suhyeon, Kim Joeun, Bae Minsung
- Main environment: Slack + Codex
- Core purpose: help a small team turn meeting context into individual tasks, decision records, Codex-ready prompts, and daily progress summaries.

## Confirmed MVP Shape

Subjector is a Slack-centered cloud bot for a 3-person graduation-project team.

- Subjector should run on a low-cost cloud server for the MVP, instead of Jo Suhyeon's laptop.
- Slack is the main user interface.
- Team members use Slack tasks and copy Codex prompts into their own Codex sessions.
- Team members should install Codex + Superpowers, but they do not each run a Subjector bot server.
- Cloud deployment avoids ngrok and keeps Slack automation available when Jo Suhyeon's laptop is off.

## Runtime And Installation

- MVP server should run on Render Starter Web Service for low fixed cost and predictable Slack availability.
- Pricing should be verified in Render before purchase; the working assumption during planning was about $7/month.
- Supabase remains the database.
- ngrok is no longer needed for MVP if the cloud deployment is used.
- A local Windows tray app/status window is deferred unless a later local/offline mode is desired.
- Team members still only need Slack + Codex + Superpowers for task execution.
- Backend stack: Node.js + Slack Bolt.js.
- Rationale: Slack events, buttons, modals, threads, and DMs are central to the MVP. Bolt.js fits this better than implementing Slack interaction payload handling directly in Python/FastAPI.
- Audio chunking can be handled from the Node server with ffmpeg or a suitable media-processing helper.

## Channels

### `#회의-결과록`

Used for:

- iPhone MPEG-4/M4A meeting recording uploads.
- Text-only change proposals.
- Subjector processing results, speaker mapping request, transcript file attachment, meeting summaries, and task-change proposals.

Important decision:

- There is no separate `#회의` channel for the MVP.
- `#회의-결과록` is treated as an operations channel with no casual chatter.
- Any normal text message in `#회의-결과록` is analyzed by Subjector.
- If it is a change proposal, Subjector creates task-change candidates.
- If not, Subjector leaves a short thread reply saying task changes were not found.

### `#in-process`

Used for:

- Daily person-by-person task messages.
- One daily task message per person:
  - Jo Suhyeon
  - Kim Joeun
  - Bae Minsung
- Messages are updated in place by Slack message IDs.
- Slack message ID means `channel_id + message_ts`, not a user/account ID.

### `#finals`

Used for:

- Cumulative project results, not just today's task summary.
- Subjector should maintain multiple topic-level cumulative messages, not one huge message.
- Suggested topic messages:
  - Hardware decisions.
  - Data collection.
  - Model execution.
  - Confirmed decisions.
  - Open conflicts/risks.
  - Unresolved decisions.
- Existing `#finals` messages are updated in place using Slack message IDs.
- The purpose is to make it possible to detect later conflicts between old and new decisions.
- `#finals` preview should be generated when all three users have sent the DM command `퇴근`, reflecting cumulative project state, not only today's work.
- If someone forgets `퇴근`, only Jo Suhyeon can force preview generation by DMing `finals 업데이트`.
- `#finals` is updated only after Jo Suhyeon reviews and approves the preview.
- `#finals` final/current summary sections are rewritten to stay current.
- `#finals` conflict/change-history sections are cumulative and should not be deleted.
- Certainty sections:
  - Confirmed decisions.
  - Pending confirmation.
  - Undecided.
  - Conflicts/risks.
- Implicit agreement estimates go into pending confirmation until all meeting participants confirm.

## Meeting Recording Flow

1. Jo Suhyeon uploads an iPhone MPEG-4/M4A meeting recording to `#회의-결과록`.
2. Subjector downloads the file temporarily.
3. If the file is too large for safe audio upload, Subjector automatically compresses or splits it into chunks.
   - Example observed recording: about 60 MB for a 2-hour iPhone meeting recording.
   - Target: keep chunks under 25 MB for OpenAI audio upload safety.
   - Users should not need to manually cut files.
4. Subjector runs transcription and diarization on chunks.
5. Subjector merges chunk transcripts back into one meeting timeline.
6. Speaker labels are shown as `Speaker A/B/C`.
7. Jo Suhyeon maps fixed names:
   - Jo Suhyeon
   - Kim Joeun
   - Bae Minsung
8. Subjector attaches a named transcript `.txt` file to the Slack thread.
9. Subjector creates a practical meeting summary.
10. Subjector creates task-change proposals.
11. Jo Suhyeon approves the overall meeting-derived task update.
12. Subjector updates the per-person task messages in `#in-process`.

Meeting-result certainty:

- Explicit agreement is treated as confirmed.
- Implicit agreement is treated as pending confirmation.
- No conclusion is treated as undecided.
- Meeting summaries should show confirmed decisions, implicit-agreement/pending-confirmation items, and undecided items separately.
- Implicit-agreement confirmation is requested from actual meeting participants, based on mapped speakers with real speech in the recording.
- If any participant does not respond, the item remains undecided/pending; silence is not treated as agreement.

## Speaker Mapping

- MVP does not try to automatically identify each person by voice.
- MVP uses diarization to split `Speaker A/B/C`.
- Jo Suhyeon maps A/B/C to the fixed three names before summary/task generation.
- Later versions may use saved voice samples or confirmed mappings.

## User Mapping

MVP uses explicit configuration mapping instead of automatic Slack display-name lookup.

Example:

```env
USERS_JSON=[
  {"key":"suhyeon","slack_id":"U...","full_name":"조수현","display_name":"수현"},
  {"key":"joeun","slack_id":"U...","full_name":"김조은","display_name":"조은"},
  {"key":"minsung","slack_id":"U...","full_name":"배민성","display_name":"민성"}
]
```

Jo Suhyeon can get member IDs from Slack member management and provide each person's ID, full name, and display name.

Why:

- Avoids display-name changes.
- Avoids duplicate names.
- Keeps DM, mentions, votes, and task ownership stable.
- Lets Subjector use the right name depending on context:
  - Slack mentions use `<@U...>`.
  - Formal summaries use full names.
  - Friendly DM/task text can use display names with `님`.
  - Example: if `display_name` is `수현`, Subjector says `수현님, ...`, not `수현, ...`.

## Bot Voice And Tone

MVP tone:

- Polite, concise, operational.
- Avoid long coaching-style prose unless context is needed.
- Use `display_name + 님` when addressing a user directly.

Examples:

- `수현님, 오늘 할 일 맥락을 정리했습니다.`
- `변경 요청이 접수되었습니다.`
- `영향받는 task를 분석했습니다.`
- `수현님, 오늘 한 일 요약입니다.`

## Transcript Storage

- Full transcript is not stored in Supabase.
- Full transcript is attached as a `.txt` file in the relevant Slack thread.
- Supabase stores summaries, tasks, state, approvals, and Slack message identifiers.

## AI Models

Confirmed direction:

- Transcription/diarization: `gpt-4o-transcribe-diarize`
- Important task generation, task distribution, impact analysis, and text change proposal analysis: `gpt-5.5`
- Meeting summary may use `gpt-5.4` or `gpt-5.5`, but final task generation should use `gpt-5.5`.

Important constraints:

- OpenAI API billing is separate from ChatGPT Plus/Pro.
- Jo Suhyeon will use her own OpenAI API key.
- If billing/quota is missing, Subjector should show a clear Slack error and allow retry after billing is fixed.
- No manual transcript fallback is planned for MVP.

OpenAI billing/quota error UX:

- Do not fail silently.
- Post a clear Slack thread message explaining that OpenAI API billing/quota needs attention.
- Include the likely cause.
- Include a link/instruction to check OpenAI Platform billing.
- Include a `다시 처리` button so the same meeting file or text proposal can be retried after billing is fixed.
- Manual transcript fallback is not part of the MVP.

## Supabase

Decision:

- Use Supabase/Postgres instead of local DB because laptop storage is limited and data should survive laptop changes.
- Keep all MVP records during the MVP; no automatic retention cleanup.
- Supabase Free currently includes 500 MB database size per project, which should be enough because full transcripts and audio are not stored in the DB.

Supabase stores:

- Meeting records and processing status.
- Practical meeting summaries.
- Task records.
- Task status.
- Speaker name mapping.
- Approval/vote records.
- Slack channel IDs and message timestamps.
- Codex prompt records.

Supabase does not store:

- Full raw meeting transcript.
- Original audio files.

Access/security:

- Team members do not need Supabase login.
- Supabase dashboard is accessed only by project/admin account holders.
- Subjector server uses Supabase credentials stored in Render environment variables.
- Supabase keys must never be exposed in Slack messages or `/health`.
- Remote Supabase setup guide: `docs/setup/supabase-setup.md`
- The initial schema enables Row Level Security on every MVP table.
- The MVP creates no public table policies; access is through the server-side service role/secret key.

## `#in-process` Task Message Style

Use detailed context style, not simple list style.

Each task should include:

- Task name.
- Status.
- Meeting/context source.
- Execution helper.
- Decision needed.
- Importance.
- Coordination level.
- Buttons:
  - Accept and generate Codex prompt
  - Complete
  - Stop for today
  - Change request
  - Meeting request

`수락` and `Codex에서 진행` are merged into one first button:

- `수락 및 Codex 프롬프트 생성`

When clicked:

1. Task status becomes accepted.
2. A detailed Codex prompt is generated in the task thread.
3. A `프롬프트 보기/복사` button is shown above the prompt content.

`진행 중` button was removed because acceptance already implies starting work.

If an assignee needs to change an accepted task:

- The assignee clicks `변경 요청`.
- If Codex detected the change, the assignee pastes the Codex-generated change request draft.
- The draft should include claim and evidence.
- Subjector analyzes impacted people/tasks and asks impacted people for `찬성`/`반대` with required rationale.

## Task Status Flow

Basic task flow:

- Proposed
- Reflected into `#in-process`
- Accepted
- Completed

Completion:

- Assignee asks Codex: `완료 제출 결과 작성해줘`.
- Assignee clicks `완료`.
- Slack opens one large text box.
- Assignee pastes the Codex final submission output.
- Subjector updates the task status to completed in place.
- Completed tasks stay in their original position, with status changed to `완료`.
- The task message may show a short completion summary.

Stop-for-today:

- Assignee asks Codex: `오늘은 여기까지`.
- Assignee clicks `오늘은 여기까지`.
- Slack opens one large text box.
- Assignee pastes the Codex progress output.
- Subjector updates the task status to `오늘은 여기까지`.
- This state appears in the user's `퇴근` summary.

If a task was accepted but no `완료` or `오늘은 여기까지` output was submitted by `퇴근`, Subjector marks it as `미정리` instead of blocking the user.

## Codex Handoff

MVP behavior:

1. Assignee clicks `수락 및 Codex 프롬프트 생성` on a task.
2. Task status changes to accepted.
3. Subjector generates a detailed Codex prompt in that task's Slack thread.
4. Subjector provides a `프롬프트 복사` button above the long prompt content.
5. Assignee copies the prompt into their own Codex session.
6. Assignee runs the task with Codex + Superpowers.
7. If Codex detects an impactful change, Codex drafts a Slack change request with claim and evidence.
8. The assignee clicks `변경 요청` on the Slack task and pastes the Codex-generated draft.
9. If stopping mid-task, the assignee types `오늘은 여기까지` in Codex, clicks Slack `오늘은 여기까지`, and pastes the Codex progress output into the large text box.
10. If completing the task, the assignee types `완료 제출 결과 작성해줘` in Codex, clicks Slack `완료`, and pastes the Codex final output into the large text box.

The Codex prompt must include:

- Task goal.
- Meeting/background context.
- Relevant claims and evidence.
- Known decisions.
- Unknown decisions.
- Needed materials/files/links.
- Completion criteria.
- Instructions to use Superpowers.
- Question-first working style:
  - Do not blindly execute ambiguous tasks.
  - Ask the assignee one clear question at a time when decisions are missing.
  - Discuss important choices before implementation.
  - Proceed only when the task is clear enough.
- Change-impact guardrail:
  - During Codex work, classify any emerging change as A/B/C.
  - A: personal/internal adjustment. Continue.
  - B: minor change. Record in final output.
  - C: impactful change. Stop and draft a Slack change request before continuing.
  - C includes changes that affect another person's task, conflict with `#finals`, alter hardware/data/model structure, significantly change workload/schedule, or change the scope of a high-coordination task.
- If C happens, Codex should generate:
  - Change request draft.
  - Rationale/evidence.
  - Likely impacted people/tasks.
  - Why agreement is needed.
- Final output must report whether any changes occurred and whether a Slack change request was raised.
- A fixed Slack-friendly result template.
- The mid-work command `오늘은 여기까지`, which returns a Slack-ready progress-state template.
- The final command `완료 제출 결과 작성해줘`, which returns a Slack-ready final-submission template.

Team onboarding must explain this work style:

- Codex is not just a command runner.
- Read the Subjector-generated context first.
- Let Codex ask clarifying questions.
- Answer those questions before asking it to implement.
- Paste final results back to the Slack task thread using the required output template.

Mid-work template:

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

Fixed final-submission template:

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

## Deferred Codex Session Monitoring

Best future version:

- Team members can opt in to connecting a specific Codex task session to Subjector.
- Subjector does not store full Codex conversations by default.
- Subjector may receive short work-state summaries or change candidates.
- Subjector can suggest "this is a good timing to raise a change request" when it detects impact.
- This should be designed as work-sharing support, not surveillance.

Deferred from MVP because:

- Requires each teammate's explicit consent.
- Requires installing/connecting a helper or integration.
- Raises privacy and trust concerns.
- Expands scope beyond the 3-day MVP.

MVP instead relies on:

- Strong Codex prompt rules.
- Required change-impact classification.
- Required final change report.
- If Codex detects an impactful change during work, it drafts a change request including claim and evidence.
- The assignee clicks the Slack task's `변경 요청` button and pastes the Codex-generated draft.

## Text Change Proposal Flow

Text messages in `#회의-결과록` are analyzed by Subjector.

If a message is a change proposal:

1. Subjector analyzes it using `gpt-5.5`.
2. Subjector identifies claim, evidence, likely impacted tasks/people, importance, and coordination level.
3. Subjector posts a short analysis in the thread.
4. Jo Suhyeon approves before broad `#in-process` updates are made.

Updated MVP rule:

- Any of the three users may post a text change proposal in `#회의-결과록`.
- If impacted people all vote `찬성`, the change can be reflected without Jo Suhyeon's final approval.
- If anyone votes `반대`, the item becomes meeting-needed.
- Jo Suhyeon's approval is still used for meeting-recording-derived broad task updates, but text change proposals follow impacted-person agreement.

Suggested message format, but not required:

```text
[변경 제안]
...

[주장]
...

[근거]
...
```

Subjector should infer impact if the user does not know it.

Important/short change proposals:

- If a short text proposal is judged importance high or coordination high, Subjector must request more detail before task reflection.
- Use a Slack modal.
- Required modal fields:
  - Change rationale/evidence.
  - Existing direction handling.
- Do not ask users to identify impacted tasks/people or whether today's tasks should be updated; Subjector infers these.
- Existing direction handling uses fixed choices:
  - Discard.
  - Keep as alternative.
  - Hold.
  - Not sure.
- Rationale/evidence is required but one line is enough; if it is too vague, Subjector asks one follow-up question.

If a text message is not a change proposal:

- Subjector replies in the thread:
  - "Subjector가 확인했습니다. task 변경 사항은 없는 것으로 기록했습니다."

Timing:

- Text messages in `#회의-결과록` are analyzed immediately because the channel is treated as a meeting/decision channel, not casual chat.

## Personal Task Change Request Flow

This is different from a `#회의-결과록` text change proposal.

When an assignee is already working on an individual task and needs to change it:

1. Assignee clicks `변경 요청` on their task in `#in-process`.
2. Assignee writes the proposed change and rationale.
3. Subjector analyzes who is affected.
4. Subjector mentions impacted people in the task thread.
5. Impacted people must respond.

Vote labels:

- `찬성`
- `반대`

Reason/rationale is required when voting.

If all impacted people vote `찬성`:

- Subjector reflects the change in `#in-process`.

If anyone votes `반대`:

- Subjector does not apply the change.
- Subjector moves the item to meeting-needed state.
- Subjector creates a meeting agenda draft from the opinions/rationales.

This matches the original idea that impacted people should choose and disagreements should become a meeting.

## Meeting Request Draft

If a change request has disagreement:

Subjector should ask each impacted person for:

- Position: agree/disagree.
- Required rationale.
- Concerned impact.
- Optional additional checks.

Then Subjector creates a meeting agenda draft:

- Change request.
- Core issue.
- Agree reasons.
- Disagree reasons.
- Impacted tasks.
- Decisions needed.

Meeting agenda posting:

- Meeting-needed items are shown in the original task thread and also posted to `#회의-결과록` as a detailed meeting agenda.
- The team should conduct the meeting while looking at `#회의-결과록`.
- MVP meeting outcomes are entered by uploading the meeting recording, not by text result entry.
- Text in `#회의-결과록` remains for change proposals, not full meeting result replacement.

## Daily Task Planning And DM Commands

Confirmed basis:

- `오늘의 할 일` is generated from `#회의-결과록` content, approved meeting-derived task updates, accepted change proposals, and unfinished prior task states.
- It is meeting/change driven, not a separate manual daily planner in MVP.
- Presence detection is removed from MVP.
- Each team member starts work by DMing Subjector: `출근`.
- Each team member ends work by DMing Subjector: `퇴근`.
- Arrival and departure times can differ.
- The start-of-work DM includes the fuller context for that person's work:
  - Why this task exists.
  - Which meeting/change it came from.
  - Relevant claims and evidence.
  - What to do today.
  - What to use Codex for.
  - Completion criteria.
- The `출근` command also updates that person's `#in-process` task area.
- The `퇴근` command creates that person's daily summary by DM.
- `#in-process` remains the shared task board with shorter context and buttons.
- `#finals` remains the cumulative project result board.
- When all three users have sent `퇴근`, Subjector generates a daily `#finals` preview once.
- If someone forgets `퇴근`, Jo Suhyeon can DM `finals 업데이트` to force preview generation.
- Even then, Subjector does not write to `#finals` until Jo Suhyeon approves the preview.

Capacity rule:

- Per person: 4 hours planned work + 1 hour buffer.
- Typical distribution:
  - One 2-hour core task.
  - One 1-hour supporting task.
  - One or two 30-minute check tasks.
  - One hour left for review, meetings, unexpected fixes.

Each task should include:

- Estimated work: 30 min / 1 hr / 2 hr / 4 hr.
- Codex suitability: high / medium / low.
- Real-world verification needed: yes/no.
- Coordination level: high / medium / low.
- Completion criteria.
- Warning if the day is overloaded.
- Parallelization status:
  - `독립 진행 가능`
  - `조건부 가능`
  - `보류 권장`
- Dependencies:
  - Which task/decision should happen before this task.
- Impact candidates:
  - Which tasks/people may be affected if this task changes.
- Block condition:
  - Which unresolved decision should stop the task.

Display convention:

- Importance and coordination use only red/yellow/green circle emoji:
  - `🔴 상`
  - `🟡 중`
  - `🟢 하`
- Do not use other decorative emoji for these fields in MVP.

## Daily Summary

Confirmed MVP:

- Per-user DM summary is triggered by the explicit command `퇴근`.
- Each user's summary should include their accepted tasks, completed work, pending tasks, Codex outputs, change requests, and meeting-needed items.
- `#finals` preview is generated when all three users have sent `퇴근`, once per day.
- If someone forgets, only Jo Suhyeon can force preview generation with `finals 업데이트`.
- A user is not blocked during `퇴근` for missing task state input.
- Accepted tasks without `완료` or `오늘은 여기까지` output become `미정리`.
- Tasks not accepted become `미시작`.
- Summaries should prioritize important/high-coordination items first.
- Automatic scheduled daily summary is postponed.

## Slack Permissions And Channel Manager Risk

Concern:

- Jo Suhyeon may not be channel manager for `#회의-결과록`.

MVP needs:

- The Slack app must be installed in the workspace.
- The bot must be a member of the needed channels.
- For public channels, the bot can usually join if it has the right scopes and workspace policy allows it.
- For private channels, someone already in the channel must invite/add the app.
- Workspace app approval policy may require an admin/owner approval even if the channel manager is not Jo Suhyeon.

This must be verified during Slack setup.

Slack scope principle:

- Use MVP minimum permissions.
- Request only what is needed for:
  - Reading events/messages in the connected channels.
  - Reading uploaded files from `#회의-결과록`.
  - Posting messages, replies, and updated task/finals messages.
  - Handling buttons/modals.
  - Opening/sending DMs.
- Avoid broad future-proof scopes in the MVP to reduce approval/security risk.

## Local UI

Local UI was previously considered for laptop-hosted MVP. After switching to cloud MVP, this is deferred.

If local mode is revived later, the Subjector local status app should show:

- Slack connection status.
- OpenAI API status.
- Supabase status.
- ngrok URL.
- Recent processing status.
- Start/restart/stop controls.

X button:

- Minimize to system tray/hidden icons.
- Does not quit the server.

Cloud MVP replacement:

- Render dashboard/logs show server health.
- Subjector should expose a simple `/health` endpoint.
- Slack setup/testing commands should report whether Slack, OpenAI, and Supabase are connected.
- `/health` is protected by a shared PIN/access key.
- Users visit `https://subjector.onrender.com/health`, enter the PIN on the page, and then see status.
- Jo Suhyeon can share the URL with team members and share the PIN separately.
- Anyone with the URL and PIN can view the health page; it is not a per-user Slack login in MVP.
- `/health` must show statuses only, never secret values.

## Restart And Missed Event Handling

MVP decision:

- Do not build a full queue/replay system.
- If Render restarts, a deploy happens, or a transient outage causes a Slack event to be missed, users recover by retrying/reuploading/reclicking.
- Subjector stores processing status such as `started`, `failed`, `completed` so `/health` and Slack messages can show what stopped.
- Error messages should include manual recovery actions like `다시 처리`.

Rationale:

- Render paid Starter service should be more stable than a free idle service, but deploys, crashes, and platform restarts can still happen.
- Full queue/replay logic is useful later but too large for the 3-day MVP.

## Slack Setup Verification

MVP decision:

- Use MVP-minimum Slack scopes only.
- After install, verify:
  - `#회의-결과록`
  - `#in-process`
  - `#finals`
- Verification should include `/health` status plus a real Slack test message in each channel.
- Test messages can remain as setup records.
- If a connection/permission later fails, Subjector should surface a warning where possible and show it on `/health`.

## Deployment

MVP deployment:

- GitHub private repo named `subjector`.
- Render is connected to the GitHub repo.
- Pushing code to GitHub triggers automatic Render deploy.
- Slack app remains installed; new server code changes bot behavior without reinstalling the Slack app.
- Secrets are stored in Render environment variables, not GitHub.

## Confirmed Visual Mockups

Stored under `.superpowers/brainstorm/`:

- `full-day-workflow-simulation.html`
- `full-mvp-flow-simulation.html`
- `codex-handoff-simulation.html`
- `meeting-summary-example.html`
- `in-process-layout-options.html`
- `task-button-options.html`
- `task-completion-simulation.html`
- `change-request-flow.html`
- `impact-vote-flow.html`
- `daily-task-planning-example.html`
- `subjector-scope-map-standalone.html`

## Original Idea Changes Or Deferred Items

Deferred from MVP:

- Fully automatic voice-to-person identification.
- Personal long-term agent that learns each person's thinking style.
- Automatic direct opening of each user's Codex session from Slack.
- Automatic Codex session monitoring.
- Automatic scheduled daily summaries.
- Slack workspace member selector for speaker mapping.
- Local tray/status app.
- Full queue/replay recovery.

Preserved in MVP:

- Meeting recording to transcript.
- Speaker separation with manual name mapping.
- Practical meeting summary.
- Task generation from meeting context.
- Task updates in Slack.
- Coordination level and importance.
- Change request with impacted-person agreement.
- Codex handoff prompt.
- Daily summary by DM command.
- Render cloud deployment.

## Remaining Work

No additional MVP product decisions are currently open.

Next steps:

1. User creates/connects the real accounts and credentials:
   - Slack app install using `slack/manifest.yaml`. Initial Slack app install/invite is done; remaining work is putting secrets into `.env`/Render and verifying event delivery.
   - Supabase project and schema migration.
   - OpenAI API billing/key readiness.
   - Render service connected to the GitHub repository.
2. Fill Render/local environment variables from `.env.example`.
3. Continue implementation in order:
   - Real Slack install verification and `/health` checks.
   - Supabase persistence layer.
   - `#in-process` task board lifecycle.
   - Codex prompt modal/copy page UX.
   - Meeting audio pipeline.
   - Change proposal and voting.
   - `#finals` preview/approval.
   - Error/retry handling.
