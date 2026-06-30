# IDEA CRUISE MVP Design

Date: 2026-06-30
Status: Written for user review

## 1. Purpose

IDEA CRUISE is a local live brainstorming tool that helps a user notice conflicts, stalled thinking, scope creep, cost risks, and useful alternatives while ideas are still being formed.

The MVP focuses on solo brainstorming first. It does not assume the user is using Codex. The user can type ideas directly into IDEA CRUISE, and the app watches the session in real time. GitHub organization data provides project context, so the app can compare new ideas against the team's actual repositories, open work, and recent progress.

The MVP must stay cheap. It avoids audio transcription, always-on AI calls, cloud hosting, team sync, automatic task assignment, and real reinforcement learning. Instead, it uses local event detection, selective LLM calls, and local feedback-based personalization.

## 2. Product Scope

### 2.1 In Scope

- Local web app for solo live brainstorming.
- Direct text input as the primary brainstorming surface.
- Three-panel workspace:
  - Brainstorm Stream.
  - Project State.
  - Live Intervention Cards.
- GitHub organization read integration:
  - repositories,
  - README/project descriptions,
  - open issues,
  - open pull requests,
  - recent commits.
- GitHub Issue draft generation at session end.
- No automatic issue creation in GitHub.
- Local event detection before AI calls.
- Manual AI analysis button.
- Card feedback: accept, defer, ignore.
- Local storage of sessions, cards, feedback, GitHub context cache, and personalized signal weights.
- LLM provider abstraction with Gemini as the default low-cost provider and OpenAI as an optional provider.

### 2.2 Out of Scope

- Audio recording or transcription.
- Local speech models.
- Real reinforcement learning model training.
- Automatic GitHub issue creation.
- Automatic task assignment.
- Team-wide shared storage.
- Subjector task board duplication.
- Slack integration.
- Cloud deployment.

## 3. Core UX

The MVP screen uses a three-panel layout.

```text
[Left] Brainstorm Stream
- User enters ideas, decisions, concerns, and questions.
- Entries are stored chronologically.
- Each entry can be classified as idea, decision, concern, question, or note.

[Center] Project State
- GitHub organization context.
- Repository summaries.
- Open issues and pull requests.
- Recent commits.
- Current inferred decisions, constraints, and open questions.

[Right] Live Intervention Cards
- Conflict cards.
- Stuck-thinking cards.
- Alternative cards.
- Clarifying question cards.
- Scope warning cards.
- GitHub comparison cards.
```

The app must not block the user's thinking flow. Cards appear on the side and can be handled later. Each card has three feedback actions:

- Accept: the intervention was useful.
- Defer: not now, but it may still matter.
- Ignore: the intervention was unnecessary.

Deferred cards are hidden for the moment, but they can return during a later automatic analysis if the same concern is still relevant. Deferred cards are also considered in the session-end summary.

## 4. GitHub Integration

GitHub is used as a low-cost project context source, not as an execution system in the MVP.

```text
GitHub organization
-> repository list
-> README / open issues / open PRs / recent commits
-> raw GitHub data
-> repo snapshots
-> project context summary
-> live analysis context
```

The app reads:

- repository name,
- repository description,
- default branch,
- recent update time,
- README content or project overview,
- open issues,
- open pull requests,
- recent commits.

Raw GitHub data must not be sent to the LLM on every analysis. The backend summarizes GitHub data into a compact Project Context Summary and reuses that summary for live analysis.

GitHub authentication uses local environment variables:

```text
GITHUB_TOKEN
GITHUB_ORG
```

The token is used only by the local backend and must never be exposed to the frontend.

If GitHub sync fails, the app continues in local-only mode:

- brainstorming input still works,
- local event detection still works,
- AI analysis can still run without GitHub context,
- Project State shows a clear connection failure,
- the user can retry sync manually,
- the latest cached context is used if available.

## 5. Live Event Detection

The MVP uses a two-stage intervention system:

```text
1. Local event detector
2. LLM analysis
```

The local detector is free and runs before any LLM call. It scores new entries using signal groups, sentence patterns, and recent session flow.

Signal groups include:

- Conflict: but, however, problem, tradeoff, conflict, "may not work", "on the other hand".
- Uncertainty: "I don't know", "not sure", "unclear", "hard to judge", "does this make sense".
- Stuck thinking: stuck, blocked, "what should we do", "need another way".
- Alternative need: alternative, other way, plan B, fallback.
- Decision: "let's go with", fixed, MVP is, exclude, defer.
- Scope expansion: later, automate, audio, reinforcement learning, auto assignment, add everything.
- Cost: price, cheap, API, token, local, cost.
- GitHub conflict: duplicate task board, database overlap, repo ownership, existing issue, active PR.

The detector must not rely on one exact keyword such as "모르겠음". It should recognize expression groups such as "모르겠다", "잘 모르겠네", "애매하다", "판단이 안 된다", and similar forms.

Local scoring behavior:

```text
Low score:
- store the entry only.

Medium score:
- update Project State and session summary.

High score:
- request LLM analysis and create a card.
```

The MVP defaults are:

- automatic analysis minimum interval: 1 minute or more,
- automatic analysis limit: up to 30 calls per session,
- manual analysis: always available, with call count visible.

These values are expected to change after real use.

## 6. Manual AI Analysis

Automatic detection is not enough. The user may urgently want a conflict check, alternative, or scope review before the detector chooses to intervene.

The input area includes a manual AI analysis button. The first MVP can expose one button with a small mode menu:

```text
AI Analysis
- Conflict check
- Alternative suggestion
- Next question
- Compare with GitHub state
- MVP scope check
```

Manual analysis bypasses the automatic event score. The result appears as a Live Intervention Card and is still stored with feedback.

## 7. Feedback-Based Personalization

The MVP does not implement real reinforcement learning. It implements a local feedback loop that can later evolve into stronger learning.

Each user has local signal weights stored on their own computer.

```json
{
  "userSignalWeights": {
    "cost": 1.4,
    "scopeExpansion": 1.3,
    "uncertainty": 0.7,
    "githubConflict": 1.5
  }
}
```

Feedback changes future sensitivity:

- Accept increases related signal weights.
- Ignore decreases related signal weights.
- Defer keeps weights mostly stable and allows later reappearance if still relevant.

If a teammate runs IDEA CRUISE on their own computer, their sessions, feedback, and signal weights stay local to that computer. This gives each person a different personalized detector without central sync, reducing privacy risk and operational cost.

Future versions may add explicit export/import or opt-in team sync.

## 8. Session-End Outputs

When the user ends a brainstorming session, IDEA CRUISE creates three outputs:

1. Session Summary.
2. Execution Roadmap.
3. GitHub Issue Drafts.

The Session Summary records:

- core decisions,
- constraints,
- conflicts found,
- deferred concerns,
- open questions,
- useful alternatives.

The Execution Roadmap turns the session into phases and next actions.

GitHub Issue Drafts turn ideas into task cards that can be copied into GitHub. The MVP does not upload them automatically.

Issue draft format:

```md
Title: Add manual AI analysis button to IDEA CRUISE

Why:
Automatic event detection can miss moments where the user urgently wants conflict checks or alternatives.

Tasks:
- Add AI analysis button near the input area.
- Provide analysis modes: conflict, alternative, scope check, GitHub comparison.
- Generate a live card from the selected mode.

Acceptance Criteria:
- User can manually request AI analysis anytime.
- Manual analysis does not depend on automatic event score.
- Result appears in the Live Intervention Cards panel.

Related Context:
- Session decisions.
- Relevant GitHub repository or issue references.
```

Issue drafts exist to bridge brainstorming and execution. They answer: what should be done next, why does it matter, and how will we know it is done?

## 9. Architecture

The MVP architecture is local-first.

```text
Browser frontend
-> local Node.js backend
-> SQLite storage
-> GitHub API
-> LLM provider abstraction
```

Frontend responsibilities:

- render the three-panel workspace,
- handle brainstorming input,
- show project state,
- show live cards,
- provide manual AI analysis controls,
- show AI call counters and sync status,
- show session-end outputs.

Backend responsibilities:

- serve the frontend,
- read local environment configuration,
- sync GitHub context,
- summarize GitHub data,
- run local event detection,
- enforce automatic analysis limits,
- call the selected LLM provider,
- store sessions, entries, cards, feedback, and signal weights,
- generate session-end outputs.

Storage:

- SQLite is preferred over loose JSON files.
- SQLite stores sessions, entries, cards, feedback, signal weights, GitHub context cache, and generated issue drafts.
- The database lives locally on the user's machine.

## 10. LLM Provider Strategy

The MVP should not hard-code a single model provider into the product logic.

```text
LLM Provider Interface
- analyzeLiveMoment(input)
- generateSessionSummary(input)
- generateIssueDrafts(input)
```

Default provider:

- Gemini 2.5 Flash-Lite for low-cost live cards.

Optional provider:

- OpenAI for fallback or higher-quality analysis if needed.

Cost control rules:

- Do not call the LLM on every entry.
- Use local event detection first.
- Send compact project context, not raw GitHub data.
- Send recent entries plus session summary, not the full session every time.
- Show call counts in the UI.
- Enforce automatic analysis limits.

Under the planning assumption of at least 1 minute between automatic analyses and up to 30 automatic calls per session, Gemini Flash-Lite is the default cost-first choice. The model choice can be changed after quality testing.

## 11. Error Handling

GitHub failures:

- keep the session usable,
- show clear sync status,
- use cached context if available,
- allow manual retry.

LLM failures:

- show a failed-analysis card or inline error,
- keep input and local detection working,
- allow retry,
- record the failed request metadata without exposing secrets.

Storage failures:

- show a local storage error,
- keep unsaved entries in memory during the session if possible,
- tell the user when persistence is not reliable.

Rate limits:

- GitHub rate limits fall back to cached context.
- LLM auto-analysis limits stop automatic calls but preserve manual calls with visible counters.

## 12. Testing And Success Criteria

Functional tests:

- user can start a session,
- user can add entries,
- event detector classifies and scores entries,
- high scores request automatic analysis,
- manual AI analysis works regardless of score,
- cards can be accepted, deferred, or ignored,
- feedback changes local signal weights,
- GitHub context can be synced and summarized,
- GitHub failures do not break local brainstorming,
- session-end summary, roadmap, and issue drafts are generated.

Cost tests:

- normal entries do not trigger LLM calls every time,
- automatic analysis respects the minimum interval,
- automatic analysis respects the session limit,
- raw GitHub data is not sent on every live analysis.

UX tests:

- the user can keep typing while cards appear,
- cards do not block the input flow,
- the manual analysis button is easy to reach,
- cards explain why they appeared,
- GitHub sync status and AI call counts are visible.

MVP success criteria:

- In a 20-30 minute real brainstorming session, IDEA CRUISE produces at least one useful conflict, scope, alternative, or GitHub-context card.
- The user can manually request analysis at any time.
- The session-end output includes at least three usable GitHub Issue drafts.
- Automatic AI calls do not feel excessive.
- Feedback affects later detection behavior on the same local machine.

## 13. Original Idea Alignment

Preserved:

- Live brainstorming support.
- Conflict detection.
- Alternative generation.
- Roadmap generation.
- Task handoff through GitHub Issue drafts.
- Cost sensitivity.
- Future path toward user-specific learning.

Changed for MVP:

- Audio is deferred.
- Real reinforcement learning is deferred.
- Automatic task assignment is deferred.
- Team meeting mode is deferred.
- GitHub writes are deferred.
- Subjector integration is deferred.

## 14. Self-Review

- The MVP scope is focused on solo text-based live brainstorming.
- GitHub integration is read plus draft output only.
- The cost-control strategy is explicit.
- Manual AI analysis is included alongside automatic detection.
- Feedback-based personalization is included without claiming real reinforcement learning.
- Local storage behavior for each teammate is explicit.
- Issue drafts are explained as execution handoff artifacts.
- The design does not duplicate Subjector's task board.
- Deferred features are documented.
