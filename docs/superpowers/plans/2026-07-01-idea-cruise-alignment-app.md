# IDEA CRUISE Alignment App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first IDEA CRUISE local web app surface for meeting criteria alignment before Subjector task execution.

**Architecture:** Keep the existing Slack/Render server and add a lightweight `/idea-cruise` browser page served by the same ExpressReceiver. The first implementation is local/browser-first: it stores draft fields in browser localStorage, produces a criteria-aligned task packet, and lets the user copy it for later Subjector import.

**Tech Stack:** Node.js ESM, Slack Bolt ExpressReceiver, native `node:test`, plain HTML/CSS/JavaScript.

---

## File Structure

- Create `src/domain/ideaCruiseAlignment.js`
  - Owns alignment packet normalization, readiness warnings, and Markdown export.
- Create `src/domain/ideaCruisePage.js`
  - Owns the static HTML page renderer for `/idea-cruise`.
- Modify `src/slack/app.js`
  - Registers `GET /idea-cruise`.
- Create `tests/ideaCruiseAlignment.test.js`
  - Tests packet normalization, warning generation, and Markdown output.
- Create `tests/ideaCruisePage.test.js`
  - Tests the page includes required UI labels, localStorage behavior, and copy/export affordances.
- Modify `docs/usage.md`
  - Adds the IDEA CRUISE local web app workflow.

## Task 1: Alignment Packet Domain

**Files:**
- Create: `src/domain/ideaCruiseAlignment.js`
- Test: `tests/ideaCruiseAlignment.test.js`

- [x] **Step 1: Write failing tests for packet creation and warnings**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAlignmentMarkdown,
  createAlignmentPacket,
  detectAlignmentWarnings
} from '../src/domain/ideaCruiseAlignment.js';

test('createAlignmentPacket normalizes criteria-aligned task fields', () => {
  const packet = createAlignmentPacket({
    title: '전술 헤드셋 드론 데이터셋 후보 판단',
    purpose: '모델 테스트를 시작할 수 있도록 현실적인 후보를 좁힌다.',
    outputLevel: 'quick_validation',
    successCriteria: '상위 후보 3개와 탈락 이유를 남긴다.',
    mustDo: '라이선스\nannotation 형식\n드론 크기',
    canSkip: '전체 학습\n예쁜 보고서',
    assigneeDiscretion: '검색 출처와 후보 순서',
    handoffNotes: '다음 사람이 바로 작은 모델 테스트 후보를 고를 수 있어야 한다.',
    ambiguousCriteria: '실시간 탐지용인지 사후 분석용인지 애매함',
    leadQuestions: '탐지와 분류 중 무엇이 우선인가?'
  });

  assert.equal(packet.outputLevelLabel, '빠른 검증용');
  assert.deepEqual(packet.mustDo, ['라이선스', 'annotation 형식', '드론 크기']);
  assert.deepEqual(packet.canSkip, ['전체 학습', '예쁜 보고서']);
  assert.equal(packet.handoffNotes, '다음 사람이 바로 작은 모델 테스트 후보를 고를 수 있어야 한다.');
});

test('detectAlignmentWarnings explains missing alignment context without scores', () => {
  const packet = createAlignmentPacket({
    title: '데이터셋 판단',
    purpose: '후보를 찾는다.',
    outputLevel: '',
    successCriteria: '',
    handoffNotes: ''
  });

  const warnings = detectAlignmentWarnings(packet);

  assert.ok(warnings.some((warning) => /산출물 수준/.test(warning)));
  assert.ok(warnings.some((warning) => /성공 기준/.test(warning)));
  assert.ok(warnings.some((warning) => /다음 사람/.test(warning)));
  assert.equal(warnings.some((warning) => /상|중|하|점수/.test(warning)), false);
});

test('buildAlignmentMarkdown exports a Subjector-ready criteria packet', () => {
  const packet = createAlignmentPacket({
    title: '전술 헤드셋 드론 데이터셋 후보 판단',
    purpose: '현실적인 후보를 좁힌다.',
    outputLevel: 'quick_validation',
    successCriteria: '상위 후보 3개를 남긴다.',
    mustDo: ['라이선스 확인', 'annotation 형식 확인'],
    canSkip: ['전체 학습'],
    assigneeDiscretion: ['후보 순서'],
    handoffNotes: '다음 사람이 작은 모델 테스트를 시작할 수 있어야 한다.',
    ambiguousCriteria: ['실시간 탐지 여부'],
    leadQuestions: ['탐지와 분류 중 무엇이 우선인가?']
  });

  const markdown = buildAlignmentMarkdown(packet);

  assert.match(markdown, /# IDEA CRUISE 기준 정렬 패킷/);
  assert.match(markdown, /전술 헤드셋 드론 데이터셋 후보 판단/);
  assert.match(markdown, /빠른 검증용/);
  assert.match(markdown, /라이선스 확인/);
  assert.match(markdown, /다음 사람이 작은 모델 테스트를 시작/);
  assert.doesNotMatch(markdown, /점수|상\/중\/하/);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm test`

Expected: FAIL because `src/domain/ideaCruiseAlignment.js` does not exist.

- [x] **Step 3: Implement the domain module**

```js
const OUTPUT_LEVEL_LABELS = new Map([
  ['quick_validation', '빠른 검증용'],
  ['internal_draft', '내부 사용 가능한 초안'],
  ['final_deliverable', '완성도 있는 최종 산출물']
]);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function section(title, value) {
  const lines = Array.isArray(value) ? value : normalizeList(value);
  if (lines.length === 0) {
    return `## ${title}\n- 아직 정리되지 않음`;
  }

  return `## ${title}\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

export function createAlignmentPacket(input = {}) {
  const outputLevel = normalizeText(input.outputLevel);

  return {
    title: normalizeText(input.title),
    purpose: normalizeText(input.purpose),
    outputLevel,
    outputLevelLabel: OUTPUT_LEVEL_LABELS.get(outputLevel) ?? '정하지 않음',
    successCriteria: normalizeText(input.successCriteria),
    mustDo: normalizeList(input.mustDo),
    canSkip: normalizeList(input.canSkip),
    assigneeDiscretion: normalizeList(input.assigneeDiscretion),
    handoffNotes: normalizeText(input.handoffNotes),
    ambiguousCriteria: normalizeList(input.ambiguousCriteria),
    leadQuestions: normalizeList(input.leadQuestions)
  };
}

export function detectAlignmentWarnings(packet) {
  const warnings = [];

  if (!packet.outputLevel || packet.outputLevelLabel === '정하지 않음') {
    warnings.push('산출물 수준이 아직 정해지지 않았습니다. 빠른 검증용인지, 내부 사용 가능한 초안인지, 최종 산출물인지 먼저 맞추면 작업 범위가 덜 흔들립니다.');
  }

  if (!packet.successCriteria) {
    warnings.push('성공 기준이 비어 있습니다. 무엇이 되면 충분한지 한 문장으로 정하면 담당자가 과하게 만들거나 너무 적게 조사하는 일을 줄일 수 있습니다.');
  }

  if (!packet.handoffNotes) {
    warnings.push('다음 사람이 이어받을 정보가 아직 없습니다. 다음 사람이 무엇을 보고 바로 움직이면 되는지 적어두면 재검색과 재설명을 줄일 수 있습니다.');
  }

  if (packet.mustDo.length === 0 && packet.canSkip.length === 0) {
    warnings.push('반드시 해야 할 것과 생략해도 되는 것이 나뉘지 않았습니다. 이 둘을 나누면 성실한 작업이 불필요한 완성도 경쟁으로 흐르는 것을 막을 수 있습니다.');
  }

  return warnings;
}

export function buildAlignmentMarkdown(packet) {
  return [
    '# IDEA CRUISE 기준 정렬 패킷',
    '',
    `## Task`,
    packet.title || '제목 없음',
    '',
    `## 목적`,
    packet.purpose || '아직 정리되지 않음',
    '',
    `## 산출물 수준`,
    packet.outputLevelLabel,
    '',
    `## 성공 기준`,
    packet.successCriteria || '아직 정리되지 않음',
    '',
    section('반드시 해야 하는 것', packet.mustDo),
    '',
    section('생략해도 되는 것', packet.canSkip),
    '',
    section('담당자 재량 영역', packet.assigneeDiscretion),
    '',
    `## 다음 사람에게 넘길 정보`,
    packet.handoffNotes || '아직 정리되지 않음',
    '',
    section('아직 애매한 기준', packet.ambiguousCriteria),
    '',
    section('팀장에게 확인할 질문', packet.leadQuestions)
  ].join('\n');
}
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm test`

Expected: PASS for the new domain tests and all existing tests.

## Task 2: IDEA CRUISE Web Page

**Files:**
- Create: `src/domain/ideaCruisePage.js`
- Test: `tests/ideaCruisePage.test.js`

- [x] **Step 1: Write failing page-render tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the local criteria alignment workspace', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /IDEA CRUISE/);
  assert.match(html, /회의 기준 정렬/);
  assert.match(html, /빠른 검증용/);
  assert.match(html, /내부 사용 가능한 초안/);
  assert.match(html, /완성도 있는 최종 산출물/);
  assert.match(html, /기준 정렬 패킷 복사/);
});

test('renderIdeaCruisePage stores drafts locally and avoids score language', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /localStorage/);
  assert.match(html, /ideaCruiseAlignmentDraft/);
  assert.match(html, /navigator\.clipboard/);
  assert.doesNotMatch(html, /점수|채점|상\/중\/하/);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm test`

Expected: FAIL because `src/domain/ideaCruisePage.js` does not exist.

- [x] **Step 3: Implement the page renderer**

Create a plain HTML renderer with:

- left panel: meeting notes/task seed input,
- center panel: alignment fields,
- right panel: warnings and generated criteria packet,
- localStorage auto-save,
- copy button using `navigator.clipboard.writeText`,
- no score or grade language.

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm test`

Expected: PASS.

## Task 3: Serve `/idea-cruise`

**Files:**
- Modify: `src/slack/app.js`
- Test: `tests/slackApp.test.js`

- [x] **Step 1: Write failing route registration test**

Add a test that calls `createSlackApp({ ..., deferInitialization: true, enableScheduledFinalsUpdates: false })` and checks the Express router stack includes `/idea-cruise`, or extract and test a route registration helper if direct stack inspection is brittle.

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL because `/idea-cruise` is not registered.

- [x] **Step 3: Register the route**

Import `renderIdeaCruisePage` and add:

```js
function registerIdeaCruiseRoute(receiver) {
  receiver.router.get('/idea-cruise', (req, res) => {
    res.status(200).type('html').send(renderIdeaCruisePage());
  });
}
```

Call it from `createSlackApp` after `registerHealthRoute(receiver, config)`.

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm test`

Expected: PASS.

## Task 4: Usage Documentation

**Files:**
- Modify: `docs/usage.md`

- [x] **Step 1: Update workflow documentation**

Document:

- open `https://subjector.onrender.com/idea-cruise` for the first deployed version or local server equivalent during development,
- write meeting/task seed,
- fill output level, success criteria, must-do, can-skip, discretion, handoff notes, ambiguous criteria, lead questions,
- copy criteria packet,
- paste it into Subjector flow until automatic import exists.

- [x] **Step 2: Run verification**

Run: `pnpm test`

Expected: PASS.

## Self-Review

Spec coverage:

- MVP name remains IDEA CRUISE.
- IDEA CRUISE is added as a meeting criteria alignment front-end.
- Subjector remains the execution layer.
- The first UI is browser-based, not Slack-only.
- The first bridge is copy/export, keeping the scope small.
- Score and `상/중/하` language is avoided in the new user-facing page.

Known gap:

- This plan does not yet replace the existing task completion evaluator with handoff readiness. That is the next implementation plan after the IDEA CRUISE alignment app lands.
