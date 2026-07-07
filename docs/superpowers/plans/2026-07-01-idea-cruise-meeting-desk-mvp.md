# IDEA CRUISE Meeting Desk MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web MVP where IDEA CRUISE strengthens meeting entries, generates a meeting record, drafts task candidates, and marks approved tasks for Subjector handoff.

**Architecture:** A dependency-free Node.js app serves a browser UI and JSON APIs. Domain logic lives in small pure modules with Node test coverage. External LLM and Subjector calls are mocked behind explicit boundaries for later replacement.

**Tech Stack:** Node.js ESM, Node built-in test runner, HTML/CSS/vanilla browser JavaScript, local JSON file storage.

---

## File Structure

- `package.json`: Node scripts and ESM setting.
- `src/server.js`: HTTP server and static file serving.
- `src/config.js`: environment/default configuration.
- `src/storage/jsonStore.js`: local JSON persistence.
- `src/domain/entries.js`: entry creation and card apply behavior.
- `src/domain/cards.js`: deterministic live card generation mock.
- `src/domain/meetingRecord.js`: meeting record generation.
- `src/domain/taskCandidates.js`: task candidate generation with AI-draft criteria fields.
- `src/domain/subjectorHandoff.js`: mock Subjector apply behavior.
- `src/public/index.html`: app shell.
- `src/public/styles.css`: production UI styling.
- `src/public/app.js`: browser state and API interactions.
- `tests/*.test.js`: pure module tests.

## Task 1: Project Scaffold And Entry/Card Domain

**Files:**
- Create: `package.json`
- Create: `src/domain/entries.js`
- Create: `src/domain/cards.js`
- Create: `tests/entries.test.js`
- Create: `tests/cards.test.js`

- [ ] **Step 1: Write failing entry tests**

Create `tests/entries.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCardToEntry, createEntry } from '../src/domain/entries.js';

test('createEntry stores live meeting text with stable defaults', () => {
  const entry = createEntry({ text: '라즈베리 파이와 ESP32의 차이를 모르겠다.' });

  assert.equal(entry.text, '라즈베리 파이와 ESP32의 차이를 모르겠다.');
  assert.equal(entry.mode, 'live');
  assert.equal(entry.kind, 'raw');
  assert.equal(entry.version, 1);
  assert.ok(entry.id.startsWith('entry_'));
  assert.ok(entry.createdAt);
});

test('applyCardToEntry strengthens the original entry and removes the card', () => {
  const entry = createEntry({
    id: 'entry_1',
    text: 'ESP32랑 라즈베리 파이 차이를 모르겠다.',
    cards: [{ id: 'card_1' }, { id: 'card_2' }]
  });

  const updated = applyCardToEntry({
    entry,
    cardId: 'card_1',
    improvedText: 'Raspberry Pi는 카메라/AI 처리 후보이고, ESP32는 저전력 센서 제어 후보이다.'
  });

  assert.equal(updated.text, 'Raspberry Pi는 카메라/AI 처리 후보이고, ESP32는 저전력 센서 제어 후보이다.');
  assert.equal(updated.kind, 'strengthened');
  assert.equal(updated.version, 2);
  assert.deepEqual(updated.cards, [{ id: 'card_2' }]);
});
```

- [ ] **Step 2: Verify entry tests fail**

Run: `npm test -- tests/entries.test.js`

Expected: FAIL because `src/domain/entries.js` does not exist.

- [ ] **Step 3: Implement entries module**

Create `package.json`:

```json
{
  "name": "idea-cruise",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/*.test.js"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Create `src/domain/entries.js`:

```js
let entryCounter = 0;

function nowIso() {
  return new Date().toISOString();
}

export function createEntry({ id = null, text, mode = 'live', kind = 'raw', cards = [] }) {
  entryCounter += 1;

  return {
    id: id ?? `entry_${entryCounter}`,
    text: String(text ?? '').trim(),
    mode,
    kind,
    version: 1,
    cards,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function applyCardToEntry({ entry, cardId, improvedText }) {
  return {
    ...entry,
    text: String(improvedText ?? '').trim(),
    kind: 'strengthened',
    version: Number(entry.version ?? 1) + 1,
    cards: (entry.cards ?? []).filter((card) => card.id !== cardId),
    updatedAt: nowIso()
  };
}
```

- [ ] **Step 4: Verify entry tests pass**

Run: `npm test -- tests/entries.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing card tests**

Create `tests/cards.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCardsForEntry } from '../src/domain/cards.js';

test('generates comparison card for hardware difference uncertainty', () => {
  const cards = generateCardsForEntry({
    entry: { id: 'entry_1', text: '라즈베리 파이와 ESP32의 차이를 모르겠다.' },
    existingTasks: []
  });

  assert.equal(cards[0].type, 'concept-comparison');
  assert.match(cards[0].title, /비교/);
  assert.match(cards[0].body, /Raspberry Pi/);
  assert.match(cards[0].body, /ESP32/);
  assert.match(cards[0].improvedText, /카메라\/AI 처리/);
});

test('generates Subjector conflict card when task source overlaps', () => {
  const cards = generateCardsForEntry({
    entry: { id: 'entry_2', text: 'Subjector에서 회의 결과록을 보고 task도 만들자.' },
    existingTasks: ['Subjector in-process handoff']
  });

  assert.equal(cards[0].type, 'source-conflict');
  assert.match(cards[0].body, /task source/);
  assert.match(cards[0].improvedText, /IDEA CRUISE만/);
});
```

- [ ] **Step 6: Verify card tests fail**

Run: `npm test -- tests/cards.test.js`

Expected: FAIL because `src/domain/cards.js` does not exist.

- [ ] **Step 7: Implement cards module**

Create `src/domain/cards.js`:

```js
function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function card(id, type, title, body, improvedText) {
  return { id, type, title, body, improvedText, model: 'Gemini 2.5 Flash-Lite' };
}

export function generateCardsForEntry({ entry, existingTasks = [] }) {
  const text = String(entry?.text ?? '');
  const cards = [];

  if (includesAny(text, ['라즈베리', 'Raspberry', 'ESP32']) && includesAny(text, ['모르', '차이', '비교'])) {
    cards.push(card(
      `${entry.id}_card_compare`,
      'concept-comparison',
      '하드웨어 비교',
      'Raspberry Pi는 Linux, Python, 카메라, AI 처리에 유리합니다. ESP32는 저전력 센서 제어, BLE/Wi-Fi, 간단한 임베디드 제어에 유리합니다.',
      'Raspberry Pi는 카메라/AI 처리 후보이고, ESP32는 저전력 센서 제어 후보이다. 이 task가 로컬 처리인지 저전력 제어인지 먼저 결정한다.'
    ));
  }

  if (includesAny(text, ['Subjector', 'subjector']) && includesAny(text, ['회의 결과록', 'task', '태스크'])) {
    cards.push(card(
      `${entry.id}_card_source`,
      'source-conflict',
      'Task source 충돌',
      `Subjector가 회의 결과록을 보고 task를 만들면 IDEA CRUISE와 task source가 중복됩니다. 현재 진행 중인 ${existingTasks[0] ?? 'Subjector in-process'} 흐름과도 충돌될 수 있습니다.`,
      'IDEA CRUISE만 회의 기반 task를 생성하고, Subjector는 승인된 task를 각 담당자의 in-process에 반영한다.'
    ));
  }

  if (cards.length === 0 && includesAny(text, ['모르', '애매', '판단'])) {
    cards.push(card(
      `${entry.id}_card_question`,
      'clarifying-question',
      '판단 기준 확인',
      '이 불확실성이 회의 결정에 필요한 정보인지 확인해야 합니다. 필요하다면 비교 기준을 먼저 세우세요.',
      `${text} 이 항목은 회의 결정에 필요한 기준을 먼저 정한 뒤 판단한다.`
    ));
  }

  return cards;
}
```

- [ ] **Step 8: Verify card tests pass**

Run: `npm test -- tests/cards.test.js`

Expected: PASS.

## Task 2: Meeting Record And Task Candidate Domain

**Files:**
- Create: `src/domain/meetingRecord.js`
- Create: `src/domain/taskCandidates.js`
- Create: `src/domain/subjectorHandoff.js`
- Create: `tests/meetingRecord.test.js`
- Create: `tests/taskCandidates.test.js`

- [ ] **Step 1: Write failing meeting record tests**

Create `tests/meetingRecord.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMeetingRecord } from '../src/domain/meetingRecord.js';

test('generates project-log ready meeting record as audit trail', () => {
  const record = generateMeetingRecord({
    entries: [{ text: 'IDEA CRUISE만 회의 기반 task를 생성한다.' }],
    decisions: ['Subjector의 회의 전사 기능을 제거한다.']
  });

  assert.equal(record.channel, '#project-log');
  assert.match(record.title, /회의 결과문/);
  assert.match(record.body, /IDEA CRUISE만 회의 기반 task를 생성한다/);
  assert.match(record.body, /감사 기록/);
});
```

- [ ] **Step 2: Verify meeting record test fails**

Run: `npm test -- tests/meetingRecord.test.js`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement meeting record module**

Create `src/domain/meetingRecord.js`:

```js
export function generateMeetingRecord({ entries = [], decisions = [] }) {
  const decisionLines = decisions.length > 0
    ? decisions.map((decision) => `- ${decision}`).join('\n')
    : entries.map((entry) => `- ${entry.text}`).join('\n');

  const evidenceLines = entries.map((entry) => `- ${entry.text}`).join('\n');

  return {
    channel: '#project-log',
    title: `[회의 결과문] ${new Date().toISOString().slice(0, 10)} IDEA CRUISE 회의`,
    body: [
      '[역할]',
      '이 회의 결과문은 task 생성 입력이 아니라 IDEA CRUISE가 어떤 판단으로 task를 만들었는지 남기는 감사 기록입니다.',
      '',
      '[확정 결정]',
      decisionLines,
      '',
      '[근거]',
      evidenceLines,
      '',
      '[Subjector 연계]',
      '- Subjector는 IDEA CRUISE가 승인한 task만 in-process로 반영합니다.'
    ].join('\n')
  };
}
```

- [ ] **Step 4: Verify meeting record test passes**

Run: `npm test -- tests/meetingRecord.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing task candidate tests**

Create `tests/taskCandidates.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTaskCandidates } from '../src/domain/taskCandidates.js';
import { applyTaskToSubjector } from '../src/domain/subjectorHandoff.js';

test('generates task candidates with gpt-5.4 criteria draft fields', () => {
  const tasks = generateTaskCandidates({
    meetingRecord: {
      body: 'IDEA CRUISE만 task를 생성하고 Subjector는 in-process에 반영한다.'
    }
  });

  assert.equal(tasks[0].model, 'gpt-5.4');
  assert.ok(tasks[0].criteria.successCriteria);
  assert.ok(tasks[0].criteria.mustDo);
  assert.ok(tasks[0].criteria.canSkip);
  assert.ok(tasks[0].criteria.handoffNotes);
  assert.equal(tasks[0].assignee, '조수현');
  assert.equal(tasks[0].importance, '상');
});

test('marks approved task as applied to Subjector in-process', () => {
  const applied = applyTaskToSubjector({
    task: { id: 'task_1', title: 'Define handoff', assignee: '조수현', importance: '상' }
  });

  assert.equal(applied.status, 'applied');
  assert.equal(applied.target, 'Subjector in-process');
  assert.equal(applied.taskId, 'task_1');
});
```

- [ ] **Step 6: Verify task tests fail**

Run: `npm test -- tests/taskCandidates.test.js`

Expected: FAIL because modules do not exist.

- [ ] **Step 7: Implement task candidate and handoff modules**

Create `src/domain/taskCandidates.js`:

```js
let taskCounter = 0;

export function generateTaskCandidates({ meetingRecord }) {
  taskCounter += 1;

  return [
    {
      id: `task_${taskCounter}`,
      model: 'gpt-5.4',
      title: 'IDEA CRUISE task source 정리',
      purpose: 'IDEA CRUISE가 회의 기반 task 생성의 유일한 source가 되도록 Subjector와 역할을 분리한다.',
      outputLevel: 'internal usable draft',
      criteria: {
        successCriteria: 'Subjector의 회의 전사/task 생성 기능 제거 범위가 정리되고, IDEA CRUISE -> Subjector 반영 흐름이 설명된다.',
        mustDo: 'IDEA CRUISE task 후보 생성, 담당자/중요도 지정, Subjector in-process 반영 경계를 문서화한다.',
        canSkip: '실제 Slack modal 구현과 실제 API 연동은 MVP 이후로 미룬다.',
        assigneeDiscretion: 'UI 문구와 세부 필드명은 구현 중 조정할 수 있다.',
        handoffNotes: `근거 회의록: ${meetingRecord?.body ?? ''}`,
        ambiguousCriteria: 'Subjector 기존 전사 코드의 삭제 시점은 별도 결정이 필요하다.',
        questionsForTeamLead: '기존 회의-결과록 채널 데이터를 보존할지 archive할지 결정해야 한다.'
      },
      assignee: '조수현',
      importance: '상',
      applied: false
    }
  ];
}
```

Create `src/domain/subjectorHandoff.js`:

```js
export function applyTaskToSubjector({ task }) {
  return {
    taskId: task.id,
    title: task.title,
    assignee: task.assignee,
    importance: task.importance,
    target: 'Subjector in-process',
    status: 'applied',
    appliedAt: new Date().toISOString()
  };
}
```

- [ ] **Step 8: Verify task tests pass**

Run: `npm test -- tests/taskCandidates.test.js`

Expected: PASS.

## Task 3: Local API, Storage, And Browser UI

**Files:**
- Create: `src/storage/jsonStore.js`
- Create: `src/server.js`
- Create: `src/public/index.html`
- Create: `src/public/styles.css`
- Create: `src/public/app.js`
- Create: `tests/jsonStore.test.js`

- [ ] **Step 1: Write failing JSON store test**

Create `tests/jsonStore.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStore } from '../src/storage/jsonStore.js';

test('JsonStore persists and reloads app state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'idea-cruise-'));
  const file = join(dir, 'state.json');

  const store = new JsonStore(file);
  await store.save({ entries: [{ id: 'entry_1', text: 'hello' }] });

  const loaded = await store.load();
  assert.deepEqual(loaded.entries, [{ id: 'entry_1', text: 'hello' }]);

  const raw = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(raw.entries[0].id, 'entry_1');

  await rm(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Verify JSON store test fails**

Run: `npm test -- tests/jsonStore.test.js`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement JSON store**

Create `src/storage/jsonStore.js`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    try {
      return JSON.parse(await readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { entries: [], meetingRecord: null, tasks: [], handoffs: [] };
      }
      throw error;
    }
  }

  async save(state) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf8');
    return state;
  }
}
```

- [ ] **Step 4: Verify JSON store test passes**

Run: `npm test -- tests/jsonStore.test.js`

Expected: PASS.

- [ ] **Step 5: Implement server and UI**

Create `src/server.js`, `src/public/index.html`, `src/public/styles.css`, and `src/public/app.js` using the tested domain modules. The UI must include:

- left Live Meeting / Simple Memo Paste controls,
- Add Entry and AI Analysis buttons,
- middle aligned card stack,
- right Meeting Record panel,
- bottom Task Candidates From IDEA CRUISE board,
- editable criteria fields,
- assignee and importance selectors,
- apply-to-Subjector buttons.

- [ ] **Step 6: Run full test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Start app**

Run: `npm start`

Expected: server prints `IDEA CRUISE running at http://localhost:3000`.

## Self-Review

- Spec coverage: live mode, simple memo mode, card apply, manual meeting record, task candidates, criteria fields, assignee/importance, and mock Subjector handoff are covered.
- Deferred APIs: real Gemini/OpenAI/Subjector calls are intentionally not in this MVP implementation plan.
- No placeholder steps remain for the first two domain tasks. Task 3 UI step is implementation-oriented but bounded by tested modules and explicit UI requirements.
