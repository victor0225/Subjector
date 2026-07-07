export function renderIdeaCruisePage() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IDEA CRUISE Roadmap Desk</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #edf3f5;
      --surface: #ffffff;
      --panel: #f8fbfc;
      --line: #d3e0e7;
      --line-strong: #9eb8c4;
      --text: #132530;
      --muted: #617484;
      --teal: #0b7769;
      --blue: #285fc6;
      --amber: #a96512;
      --red: #b8424a;
      --violet: #6a51b8;
      --teal-soft: #e6f6f0;
      --blue-soft: #eaf1ff;
      --amber-soft: #fff3dd;
      --red-soft: #fff0f1;
      --violet-soft: #f2efff;
      --shadow: 0 16px 34px rgba(19, 37, 48, 0.12);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }

    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 4px; font-size: 22px; line-height: 1.2; }
    h2 { margin-bottom: 4px; font-size: 15px; }
    h3 { margin-bottom: 8px; font-size: 15px; line-height: 1.35; }
    p { color: var(--muted); font-size: 13px; line-height: 1.48; }

    button, input, textarea, select { font: inherit; }
    button {
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 8px 10px;
      background: #fff;
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    button.primary { border-color: var(--teal); background: var(--teal); color: #fff; }
    button.danger { border-color: #efbdc2; background: #fff8f8; color: var(--red); }
    button:disabled, input:disabled, textarea:disabled { cursor: not-allowed; opacity: 0.62; }

    input, textarea, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 9px 10px;
      background: #fff;
      color: var(--text);
      font-size: 13px;
      line-height: 1.45;
    }
    textarea { min-height: 92px; resize: vertical; }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 22px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    header p { margin-bottom: 0; }

    .status, .actions, .topic-meta, .card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .status { justify-content: flex-end; }
    .status span, .tag {
      display: inline-flex;
      align-items: center;
      width: max-content;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 8px;
      background: #fff;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .tag.strong, .tag.teal { border-color: #a6d9d1; background: var(--teal-soft); color: var(--teal); }
    .tag.blue { border-color: #b7c9f6; background: var(--blue-soft); color: var(--blue); }
    .tag.amber { border-color: #efca8a; background: var(--amber-soft); color: var(--amber); }
    .tag.rose { border-color: #efbdc2; background: var(--red-soft); color: var(--red); }
    .tag.violet { border-color: #c9c0f4; background: var(--violet-soft); color: var(--violet); }

    .app-shell {
      display: grid;
      grid-template-columns: minmax(720px, 1.45fr) minmax(370px, 0.55fr);
      gap: 16px;
      padding: 18px 22px;
    }

    .panel {
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      min-height: 78px;
      padding: 14px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .panel-head p { margin-bottom: 0; }

    .roadmap-panel, .task-panel { min-height: calc(100vh - 150px); }
    .roadmap-shell {
      position: relative;
      height: calc(100vh - 230px);
      min-height: 560px;
      overflow: auto;
      background:
        linear-gradient(#dfe8ee 1px, transparent 1px),
        linear-gradient(90deg, #dfe8ee 1px, transparent 1px);
      background-size: 34px 34px;
    }
    .layer-label {
      position: sticky;
      top: 14px;
      left: 14px;
      z-index: 8;
      display: flex;
      align-items: center;
      gap: 8px;
      width: max-content;
      max-width: calc(100% - 28px);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 7px 10px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 8px 20px rgba(19, 37, 48, 0.08);
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .roadmap {
      position: relative;
      min-width: 980px;
      min-height: 560px;
    }
    .root-lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }
    .root-line {
      fill: none;
      stroke: var(--line-strong);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .impact-line {
      fill: none;
      stroke: var(--red);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 8 8;
    }

    .topic-node {
      position: absolute;
      width: 220px;
      min-height: 144px;
      border: 1px solid var(--line);
      border-left: 5px solid var(--teal);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.97);
      box-shadow: 0 12px 24px rgba(19, 37, 48, 0.12);
      padding: 12px;
      text-align: left;
      transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease, box-shadow 160ms ease;
    }
    .topic-node:hover { transform: translateY(-1px); box-shadow: 0 18px 30px rgba(19, 37, 48, 0.16); }
    .topic-node.active { outline: 3px solid rgba(11, 119, 105, 0.18); box-shadow: 0 20px 38px rgba(11, 119, 105, 0.2); }
    .topic-node.fixed { border-left-color: var(--blue); }
    .topic-node.conflict { border-color: #efbdc2; border-left-color: var(--red); background: #fffafa; }
    .roadmap.card-layer-on .topic-node:not(.active) { opacity: 0.52; filter: grayscale(0.18); }
    .topic-node small {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .topic-node strong { display: block; margin-bottom: 8px; font-size: 16px; line-height: 1.35; }
    .topic-node span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.45;
    }
    .topic-meta { margin-top: 10px; }

    .empty-roadmap {
      position: absolute;
      left: 56px;
      top: 90px;
      width: 360px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.95);
      padding: 14px;
    }

    .card-popover {
      position: absolute;
      z-index: 12;
      width: 460px;
      max-height: calc(100vh - 190px);
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 24px 48px rgba(19, 37, 48, 0.2);
      opacity: 0;
      pointer-events: none;
      transform: translateY(10px);
      transition: opacity 160ms ease, transform 160ms ease;
    }
    .card-popover.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
    .popover-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 13px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfd;
      border-radius: 10px 10px 0 0;
    }
    .popover-head p { margin-bottom: 0; }
    .topic-editor, .ai-card { display: grid; gap: 10px; padding: 12px; }
    .topic-editor { border-bottom: 1px solid var(--line); background: #fbfdff; }
    .ai-card { border-left: 4px solid var(--teal); }
    .ai-card.conflict { border-left-color: var(--red); }
    .ai-card.split { border-left-color: var(--violet); }
    .ai-card.research, .ai-card.experiment { border-left-color: var(--amber); }
    .ai-card.answer { border-left-color: var(--blue); }
    .ai-card p { margin-bottom: 0; }
    .hint, .impact, .quiet-box, .task-reason, .error-log {
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #f8fbfc;
      color: var(--muted);
      padding: 9px;
      font-size: 12px;
      line-height: 1.45;
    }
    .error-log { border-color: #efbdc2; background: #fff8f8; color: var(--red); }
    .impact strong { color: var(--text); }
    .child-preview { display: grid; gap: 8px; max-height: 190px; overflow: auto; }
    .child-preview div { border: 1px solid var(--line); border-radius: 7px; padding: 9px; background: #fff; }
    .child-preview strong { display: block; margin-bottom: 5px; }
    .child-preview p { margin-bottom: 0; font-size: 12px; }
    .pending-count { align-self: center; color: var(--muted); font-size: 12px; font-weight: 800; }

    .tasks {
      display: grid;
      gap: 12px;
      max-height: calc(100vh - 230px);
      min-height: 560px;
      overflow: auto;
      padding: 14px;
    }
    .task-card, .update-card, .not-task-card {
      display: grid;
      gap: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .task-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .task-card p, .update-card p, .not-task-card p { margin-bottom: 0; }
    .criteria, .task-grid, .split-update { display: grid; gap: 8px; }
    .task-grid { grid-template-columns: 1fr 1fr; }
    .criteria textarea { min-height: 72px; }
    .split-update { grid-template-columns: 1fr 1fr; }
    .update-part { border: 1px solid var(--line); border-radius: 7px; padding: 9px; background: #fbfcfd; }
    .task-filter { display: flex; flex-wrap: wrap; gap: 7px; }
    .task-filter button.active { border-color: var(--teal); background: var(--teal-soft); color: var(--teal); }

    .meeting-panel { margin: 0 22px 22px; }
    .record {
      margin: 14px;
      padding: 12px;
      min-height: 190px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
      white-space: pre-wrap;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    dialog {
      width: min(620px, calc(100vw - 40px));
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0;
    }
    dialog form { display: grid; gap: 12px; padding: 16px; }
    dialog textarea { min-height: 180px; }

    @media (max-width: 1120px) {
      header, .panel-head { flex-direction: column; }
      .app-shell { grid-template-columns: 1fr; }
      .roadmap-panel, .task-panel { min-height: auto; }
      .roadmap-shell, .tasks { max-height: none; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IDEA CRUISE Roadmap Desk</h1>
      <p>1층은 topic/root 지도, 2층은 선택한 topic에 붙는 AI 카드입니다. 고정한 기준과 충돌할 때만 AI가 강하게 개입합니다.</p>
    </div>
    <div class="status">
      <span>카드 생성: GPT-5.4</span>
      <span>회의록 생성: Gemini 2.5 Flash-Lite</span>
      <span>Task 최종 정제: Gemini 2.5 Flash-Lite</span>
    </div>
  </header>

  <main class="app-shell">
    <section class="panel roadmap-panel">
      <div class="panel-head">
        <div>
          <h2>1F Topic Root Layer</h2>
          <p>topic을 클릭하면 2층 AI 카드 팝오버가 열립니다. 같은 topic을 다시 누르면 닫힙니다.</p>
        </div>
        <div class="actions">
          <button id="add-topic" class="primary" type="button">Topic 추가</button>
          <button id="refresh-roadmap" type="button">최신화</button>
          <button id="generate-record" type="button">회의록 생성</button>
        </div>
      </div>
      <div class="roadmap-shell">
        <div class="layer-label">
          <span class="tag strong">1층</span>
          <span id="layer-state">topic을 추가하거나 클릭하세요.</span>
        </div>
        <div id="roadmap" class="roadmap">
          <svg id="root-lines" class="root-lines" aria-hidden="true"></svg>
          <div id="topic-nodes"></div>
          <section id="card-popover" class="card-popover" aria-live="polite"></section>
        </div>
      </div>
    </section>

    <aside class="panel task-panel">
      <div class="panel-head">
        <div>
          <h2>Task Candidates</h2>
          <p>자료조사, 검증, 구현처럼 시간을 써야 해결되는 일만 남깁니다. 각 task에는 생성 맥락을 표시합니다.</p>
        </div>
        <button id="refresh-tasks" class="primary" type="button">갱신</button>
      </div>
      <div class="tasks">
        <div id="task-filter" class="task-filter"></div>
        <div id="task-generation-error"></div>
        <div id="task-list"></div>
        <div id="task-update-list"></div>
        <div id="not-task-list"></div>
      </div>
    </aside>
  </main>

  <section class="panel meeting-panel">
    <div class="panel-head">
      <div>
        <h2>Meeting Record</h2>
        <p>task 나열이 아니라 로드맵이 왜 이렇게 바뀌었는지 판단을 남기는 기록입니다.</p>
      </div>
      <button id="copy-record" type="button">결과록 복사</button>
    </div>
    <pre id="meeting-record" class="record">회의록 생성 버튼을 누르면 판단 기록 초안이 여기에 표시됩니다.</pre>
  </section>

  <dialog id="topic-dialog">
    <form id="topic-form" method="dialog">
      <h2>Topic 추가</h2>
      <p>새 topic은 선택한 topic 밑에 자동 root로 연결됩니다. 선택 topic이 없으면 최상위 topic으로 생성됩니다.</p>
      <label>Parent topic
        <select id="parent-topic"></select>
      </label>
      <label>Topic 제목
        <input id="topic-title-input" placeholder="예: 전술 헤드셋">
      </label>
      <label>Topic 내용
        <textarea id="topic-text-input" placeholder="회의에서 다룰 생각, 기준, 질문을 적으세요."></textarea>
      </label>
      <div class="actions">
        <button id="close-topic-dialog" type="button">닫기</button>
        <button class="primary" type="submit">추가</button>
      </div>
    </form>
  </dialog>

  <script>
    const STORAGE_KEY = 'idea-cruise-roadmap-v2';
    const state = loadState();
    let layoutCache = new Map();

    const roadmapEl = document.getElementById('roadmap');
    const rootLinesEl = document.getElementById('root-lines');
    const topicNodesEl = document.getElementById('topic-nodes');
    const cardPopoverEl = document.getElementById('card-popover');
    const layerStateEl = document.getElementById('layer-state');
    const taskListEl = document.getElementById('task-list');
    const taskUpdateListEl = document.getElementById('task-update-list');
    const notTaskListEl = document.getElementById('not-task-list');
    const taskFilterEl = document.getElementById('task-filter');
    const recordEl = document.getElementById('meeting-record');
    const topicDialog = document.getElementById('topic-dialog');
    const parentTopicEl = document.getElementById('parent-topic');

    function defaultState() {
      return {
        topics: [],
        activeTopicId: null,
        tasks: [],
        existingTaskUpdates: [],
        notTasks: [],
        taskFilter: 'all',
        taskGenerationError: '',
        record: '',
        refreshMessage: ''
      };
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        return Object.assign(defaultState(), JSON.parse(raw));
      } catch (error) {
        return defaultState();
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function createId(prefix) {
      return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }

    function activeTopic() {
      return state.topics.find(function(topic) { return topic.id === state.activeTopicId; }) || null;
    }

    function completedTopics() {
      return state.topics.filter(function(topic) { return topic.completed; });
    }

    function compactText(text, length) {
      return String(text || '').replace(/\\s+/g, ' ').trim().slice(0, length || 160);
    }

    function titleFromText(text) {
      const first = compactText(text, 80).split(/[.?!]/)[0].trim();
      return first.length > 28 ? first.slice(0, 28) + '...' : first;
    }

    function includesAny(text, terms) {
      return terms.some(function(term) { return text.indexOf(term) >= 0; });
    }

    function broadTopicScore(text) {
      return [
        ['마이크', '환경음', '주변음', '음성', '무전'],
        ['스피커', '출력', '안내'],
        ['데이터', '데이터셋', '학습', '라벨'],
        ['하드웨어', '보드', '라즈베리', 'ESP32', 'Seeed'],
        ['검증', '실험', '테스트', '성능']
      ].filter(function(terms) { return includesAny(text, terms); }).length;
    }

    function localSplitCard(topic) {
      return {
        id: 'split-' + topic.id,
        kind: 'split',
        type: 'topic 분리 제안',
        title: '기능별 topic 분리 제안',
        body: '이 topic에는 입력, 출력, 데이터, 검증이 섞여 있습니다. 먼저 기능별 초안으로 나누면 회의 중 어떤 부분이 고정됐고 어떤 부분이 아직 열려 있는지 더 잘 보입니다.',
        suggestion: topic.text,
        impact: '현재 topic은 parent로 유지하고, child topic들이 root로 연결됩니다. 각 child topic에는 AI 초안 내용만 들어갑니다.',
        childTopics: [
          { title: '마이크 (환경음)', text: '총성, 폭발음, 장비 충격음처럼 줄이거나 감지해야 하는 외부 위험 소리를 다룬다. 첫 MVP에서는 총성/폭발음 중심으로 좁힌다.' },
          { title: '마이크 (주변음)', text: '팀원 목소리, 무전, 경고음처럼 사용자가 놓치면 안 되는 주변 정보를 다룬다. 환경음 차단과 충돌하지 않도록 보존 기준을 정한다.' },
          { title: '내부 스피커', text: '차단되거나 줄어든 위험 정보를 사용자에게 어떤 방식으로 다시 전달할지 정한다. 안내음이 주변음 인지를 방해하지 않아야 한다.' },
          { title: '학습 데이터', text: '환경음 감지와 분류에 필요한 공개 데이터셋 후보, 라벨 구조, 라이선스를 확인한다.' },
          { title: '검증 실험', text: '소음 감소, 위험 인지 유지, 음성 보존, 지연 시간을 확인할 최소 실험 기준을 정한다.' }
        ]
      };
    }

    function localConflictCard(topic) {
      const fixedTopic = state.topics.find(function(item) {
        return item.id !== topic.id && item.fixed && includesAny(item.text, ['전장', '전술', '군용', '폭음', '총성', '폭발음']);
      });
      if (!fixedTopic || !includesAny(topic.text, ['공사현장', '건설', '장비 소음', '산업'])) return null;
      return {
        id: 'conflict-' + topic.id,
        kind: 'conflict',
        type: '충돌 경고',
        title: '고정 topic과 충돌',
        body: '고정된 "' + fixedTopic.title + '"은 전장용 폭음 차단을 기준으로 삼고 있는데, 현재 topic에는 공사현장/산업 소음 기준이 섞여 있습니다.',
        suggestion: topic.text,
        impact: '영향 topic: ' + fixedTopic.title,
        affectedTopicIds: [fixedTopic.id]
      };
    }

    function externalUpdateCard(topic, incoming) {
      return {
        id: 'external-update-' + incoming.externalId,
        kind: 'conflict',
        type: '최신 변경 반영 필요',
        title: '고정 topic에 최신 변경이 도착했습니다',
        body: 'Subjector에서 변경된 내용이 있지만 이 topic은 고정되어 있어 자동으로 덮어쓰지 않았습니다. 고정 해제 후 반영하거나 별도 topic으로 유지하세요.',
        suggestion: incoming.text,
        impact: '최신화 source: ' + (incoming.sourceType || 'Subjector')
      };
    }

    function normalizeKind(kind) {
      if (['answer', 'research', 'experiment', 'decision', 'filter', 'split', 'conflict'].includes(kind)) return kind;
      return 'research';
    }

    function mapApiCard(card, index) {
      const kindMap = { info: 'answer', warn: 'research' };
      return {
        id: 'api-card-' + Date.now() + '-' + index,
        kind: card.kind || kindMap[card.tag] || 'research',
        type: card.type || 'AI 고려',
        title: card.title || 'AI 고려 사항',
        body: card.body || '',
        suggestion: card.suggestion || '',
        details: Array.isArray(card.details) ? card.details : [],
        choices: Array.isArray(card.choices) ? card.choices : [],
        impact: card.impact || card.reason || ''
      };
    }

    function ensurePriorityCards(topic) {
      const conflict = localConflictCard(topic);
      if (conflict) {
        topic.cards = [conflict].concat((topic.cards || []).filter(function(card) { return card.kind !== 'conflict'; }));
        return;
      }
      if (broadTopicScore(topic.text) >= 3 && !(topic.cards || []).some(function(card) { return card.kind === 'split'; })) {
        topic.cards = [localSplitCard(topic)].concat(topic.cards || []);
      }
    }

    async function requestCardsForTopic(topic) {
      ensurePriorityCards(topic);
      if (topic.cards && topic.cards[0] && (topic.cards[0].kind === 'conflict' || topic.cards[0].kind === 'split')) {
        return;
      }
      const response = await fetch('/idea-cruise/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryText: topic.text,
          completedEntries: completedTopics().map(function(item) { return item.text; })
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        throw new Error(result.error || 'AI Analysis 연결에 실패했습니다.');
      }
      topic.cards = (result.cards || []).map(mapApiCard);
      ensurePriorityCards(topic);
    }

    async function requestTaskCandidates() {
      const completed = completedTopics();
      if (completed.length === 0) {
        state.taskGenerationError = '완료된 topic이 없습니다. topic 팝오버에서 완료를 누른 뒤 갱신하세요.';
        return;
      }
      const response = await fetch('/idea-cruise/task-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedPages: completed.map(function(topic, index) {
            return { id: topic.id, number: index + 1, title: topic.title, text: topic.text };
          })
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        state.taskGenerationError = result.error || 'Task 후보를 만들지 못했습니다.';
        return;
      }
      state.tasks = Array.isArray(result.tasks) ? result.tasks.map(function(task, index) {
        return {
          id: task.id || 'task-' + Date.now() + '-' + index,
          pageId: task.pageId || '',
          pageNumber: task.pageNumber || 0,
          title: task.title || '',
          neededInfo: task.neededInfo || '',
          doneCriteria: task.doneCriteria || '',
          reason: task.reason || task.sourceReason || '',
          assignee: task.assignee || '미배정',
          importance: task.importance || '보통',
          kind: task.kind || 'research',
          error: ''
        };
      }) : [];
      state.existingTaskUpdates = Array.isArray(result.existingTaskUpdates) ? result.existingTaskUpdates.map(function(item, index) {
        return {
          id: item.id || 'task-update-' + Date.now() + '-' + index,
          taskId: item.taskId || '',
          existingTaskTitle: item.existingTaskTitle || '',
          addNeededInfo: item.addNeededInfo || '',
          doneCriteriaChange: item.doneCriteriaChange || '',
          reason: item.reason || '',
          error: ''
        };
      }) : [];
      state.notTasks = Array.isArray(result.notTasks) ? result.notTasks.map(function(item, index) {
        if (typeof item === 'string') return { id: 'not-task-' + Date.now() + '-' + index, content: item, reason: '' };
        return { id: item.id || 'not-task-' + Date.now() + '-' + index, content: item.content || '', reason: item.reason || '' };
      }) : [];
      state.taskGenerationError = '';
      if (state.taskFilter !== 'all' && !state.tasks.some(function(task) { return task.pageId === state.taskFilter; })) {
        state.taskFilter = 'all';
      }
    }

    function addTopic({ title, text, parentId }) {
      const topic = {
        id: createId('topic'),
        title: title || titleFromText(text) || '새 topic',
        text: text || title || '새 topic',
        parentId: parentId || null,
        fixed: false,
        completed: false,
        cards: []
      };
      ensurePriorityCards(topic);
      state.topics.push(topic);
      state.activeTopicId = topic.id;
    }

    function mergeRoadmapContext(topics) {
      const externalIdToTopicId = new Map();
      state.topics.forEach(function(topic) {
        if (topic.sourceExternalId) {
          externalIdToTopicId.set(topic.sourceExternalId, topic.id);
        }
      });

      const created = [];
      const updated = [];
      const waiting = [];

      (topics || []).forEach(function(incoming) {
        const existingId = externalIdToTopicId.get(incoming.externalId);
        const parentId = incoming.parentExternalId ? externalIdToTopicId.get(incoming.parentExternalId) || null : null;

        if (existingId) {
          const existing = state.topics.find(function(topic) { return topic.id === existingId; });
          if (!existing) return;
          if (existing.fixed) {
            existing.cards = [externalUpdateCard(existing, incoming)].concat((existing.cards || []).filter(function(card) {
              return card.id !== 'external-update-' + incoming.externalId;
            }));
            waiting.push(existing.title);
            return;
          }
          existing.title = incoming.title || existing.title;
          existing.text = incoming.text || existing.text;
          existing.parentId = parentId;
          existing.sourceType = incoming.sourceType || existing.sourceType;
          updated.push(existing.title);
          ensurePriorityCards(existing);
          return;
        }

        const topic = {
          id: createId('topic'),
          title: incoming.title || 'Subjector 최신 항목',
          text: incoming.text || '',
          parentId: parentId,
          fixed: false,
          completed: false,
          cards: [],
          sourceExternalId: incoming.externalId,
          sourceType: incoming.sourceType || 'external'
        };
        state.topics.push(topic);
        externalIdToTopicId.set(incoming.externalId, topic.id);
        created.push(topic.title);
        ensurePriorityCards(topic);
      });

      state.refreshMessage = [
        created.length ? '추가 ' + created.length + '개' : '',
        updated.length ? '갱신 ' + updated.length + '개' : '',
        waiting.length ? '고정 topic 대기 ' + waiting.length + '개' : ''
      ].filter(Boolean).join(' · ') || '새로 반영할 항목이 없습니다.';

      if (!state.activeTopicId && state.topics.length) {
        state.activeTopicId = state.topics[0].id;
      }
    }

    async function refreshRoadmapContext() {
      let pin = localStorage.getItem('idea-cruise-refresh-pin') || '';
      if (!pin) {
        pin = window.prompt('IDEA CRUISE 최신화 PIN을 입력하세요.');
        if (!pin) return;
        localStorage.setItem('idea-cruise-refresh-pin', pin);
      }

      const response = await fetch('/idea-cruise/roadmap-context?pin=' + encodeURIComponent(pin));
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        if (response.status === 403) {
          localStorage.removeItem('idea-cruise-refresh-pin');
        }
        throw new Error(result.error || '로드맵 최신화에 실패했습니다.');
      }
      mergeRoadmapContext(result.topics || []);
    }

    function removeActiveTopic() {
      const topic = activeTopic();
      if (!topic) return;
      const removeIds = new Set([topic.id]);
      let changed = true;
      while (changed) {
        changed = false;
        state.topics.forEach(function(item) {
          if (item.parentId && removeIds.has(item.parentId) && !removeIds.has(item.id)) {
            removeIds.add(item.id);
            changed = true;
          }
        });
      }
      state.topics = state.topics.filter(function(item) { return !removeIds.has(item.id); });
      state.tasks = state.tasks.filter(function(task) { return !removeIds.has(task.pageId); });
      state.existingTaskUpdates = [];
      state.notTasks = [];
      state.activeTopicId = state.topics[0]?.id || null;
    }

    function applyCard(topic, card, content) {
      if (topic.fixed && card.kind !== 'conflict') {
        throw new Error('고정된 topic은 고정 해제 후 수정할 수 있습니다.');
      }
      if (card.kind === 'split') {
        const existing = new Set(state.topics.filter(function(item) { return item.parentId === topic.id; }).map(function(item) { return item.title; }));
        (card.childTopics || []).forEach(function(child) {
          if (!existing.has(child.title)) {
            addTopic({ title: child.title, text: child.text, parentId: topic.id });
          }
        });
        state.activeTopicId = topic.id;
      } else if (content && content.trim()) {
        topic.text = content.trim();
        topic.title = titleFromText(topic.text) || topic.title;
      }
      topic.cards = (topic.cards || []).filter(function(item) { return item.id !== card.id; });
      ensurePriorityCards(topic);
    }

    function completeTopic(topic) {
      topic.completed = true;
      topic.title = titleFromText(topic.text) || topic.title;
      return requestTaskCandidates();
    }

    function computeLayout() {
      const childrenByParent = new Map();
      state.topics.forEach(function(topic) {
        const parent = topic.parentId || 'root';
        if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
        childrenByParent.get(parent).push(topic);
      });
      const positioned = [];
      const roots = childrenByParent.get('root') || [];
      function place(topic, depth, rowHint) {
        const row = positioned.length + rowHint;
        positioned.push({ topic: topic, depth: depth, row: row });
        (childrenByParent.get(topic.id) || []).forEach(function(child, index) { place(child, depth + 1, index); });
      }
      roots.forEach(function(topic, index) { place(topic, 0, index); });
      const positions = new Map();
      positioned.forEach(function(item) {
        positions.set(item.topic.id, { x: 56 + item.depth * 310, y: 82 + item.row * 172 });
      });
      const maxDepth = Math.max(0, ...positioned.map(function(item) { return item.depth; }));
      const maxRow = Math.max(0, ...positioned.map(function(item) { return item.row; }));
      return {
        positions: positions,
        width: Math.max(980, 56 + (maxDepth + 1) * 310 + 260),
        height: Math.max(560, 82 + (maxRow + 1) * 172 + 190)
      };
    }

    function renderRoadmap() {
      state.topics.forEach(ensurePriorityCards);
      const layout = computeLayout();
      layoutCache = layout.positions;
      roadmapEl.style.width = layout.width + 'px';
      roadmapEl.style.height = layout.height + 'px';
      rootLinesEl.setAttribute('viewBox', '0 0 ' + layout.width + ' ' + layout.height);
      rootLinesEl.setAttribute('width', layout.width);
      rootLinesEl.setAttribute('height', layout.height);
      rootLinesEl.innerHTML = renderRootLines(layout.positions);

      if (!state.topics.length) {
        topicNodesEl.innerHTML = '<article class="empty-roadmap"><strong>아직 topic이 없습니다.</strong><p>먼저 "전술 헤드셋" 같은 큰 topic을 추가하세요.</p></article>';
        layerStateEl.textContent = '첫 topic을 추가하세요.';
        roadmapEl.classList.remove('card-layer-on');
        return;
      }

      roadmapEl.classList.toggle('card-layer-on', Boolean(state.activeTopicId));
      layerStateEl.textContent = state.activeTopicId
        ? (activeTopic()?.title || '선택 topic') + ' topic의 2층 AI 카드가 켜져 있습니다.'
        : (state.refreshMessage || 'topic을 클릭하면 2층 AI 카드가 켜집니다.');

      topicNodesEl.innerHTML = state.topics.map(function(topic) {
        const position = layout.positions.get(topic.id);
        const cardCount = (topic.cards || []).length;
        const currentCard = topic.cards && topic.cards[0];
        const conflict = currentCard && currentCard.kind === 'conflict';
        return '<button class="topic-node ' + (topic.fixed ? 'fixed ' : '') + (conflict ? 'conflict ' : '') + (topic.id === state.activeTopicId ? 'active' : '') + '" style="left:' + position.x + 'px;top:' + position.y + 'px" data-topic="' + topic.id + '" type="button">' +
          '<small>' + (topic.parentId ? 'Topic' : 'Project Topic') + '</small>' +
          '<strong>' + escapeHtml(topic.title) + '</strong>' +
          '<span>' + escapeHtml(compactText(topic.text, 112)) + '</span>' +
          '<span class="topic-meta">' +
            tag(topic.fixed ? '고정' : '초안', topic.fixed ? 'blue' : '') +
            tag(topic.completed ? '완료' : '진행') +
            tag('대기 카드 ' + Math.max(cardCount - 1, 0)) +
            (conflict ? tag('충돌', 'rose') : '') +
          '</span>' +
        '</button>';
      }).join('');
    }

    function renderRootLines(positions) {
      const lines = [];
      state.topics.forEach(function(topic) {
        if (!topic.parentId || !positions.has(topic.parentId) || !positions.has(topic.id)) return;
        const from = positions.get(topic.parentId);
        const to = positions.get(topic.id);
        const startX = from.x + 220;
        const startY = from.y + 72;
        const endX = to.x;
        const endY = to.y + 72;
        const midX = (startX + endX) / 2;
        lines.push('<path class="root-line" d="M ' + startX + ' ' + startY + ' C ' + midX + ' ' + startY + ', ' + midX + ' ' + endY + ', ' + endX + ' ' + endY + '" />');
      });
      const topic = activeTopic();
      const card = topic && topic.cards && topic.cards[0];
      (card?.affectedTopicIds || []).forEach(function(id) {
        if (!positions.has(topic.id) || !positions.has(id)) return;
        const from = positions.get(topic.id);
        const to = positions.get(id);
        const startX = from.x + 110;
        const startY = from.y + 144;
        const endX = to.x + 110;
        const endY = to.y;
        const midY = (startY + endY) / 2;
        lines.push('<path class="impact-line" d="M ' + startX + ' ' + startY + ' C ' + startX + ' ' + midY + ', ' + endX + ' ' + midY + ', ' + endX + ' ' + endY + '" />');
      });
      return lines.join('');
    }

    function renderCardPopover() {
      const topic = activeTopic();
      if (!topic) {
        cardPopoverEl.classList.remove('open');
        cardPopoverEl.innerHTML = '';
        return;
      }
      const position = layoutCache.get(topic.id) || { x: 60, y: 80 };
      const left = Math.max(24, Math.min(position.x + 250, Number.parseInt(roadmapEl.style.width, 10) - 480));
      const top = Math.max(64, position.y - 18);
      const card = topic.cards && topic.cards[0];
      const pendingCount = Math.max((topic.cards || []).length - 1, 0);
      cardPopoverEl.style.left = left + 'px';
      cardPopoverEl.style.top = top + 'px';
      cardPopoverEl.classList.add('open');
      cardPopoverEl.innerHTML =
        '<div class="popover-head"><div><h2>2F AI Card: ' + escapeHtml(topic.title) + '</h2><p>' + (topic.fixed ? '고정된 topic입니다. 수정하려면 먼저 고정 해제하세요.' : 'topic 내용을 수정하거나 AI 분석으로 카드 1개를 갱신할 수 있습니다.') + '</p></div><button data-close-popover type="button">닫기</button></div>' +
        '<div class="topic-editor">' +
          '<label>Topic 제목<input data-topic-title value="' + escapeHtml(topic.title) + '" ' + (topic.fixed ? 'disabled' : '') + '></label>' +
          '<label>Topic 내용<textarea data-topic-text ' + (topic.fixed ? 'disabled' : '') + '>' + escapeHtml(topic.text) + '</textarea></label>' +
          '<div class="actions"><button class="primary" data-save-topic ' + (topic.fixed ? 'disabled' : '') + ' type="button">저장</button><button data-toggle-fixed type="button">' + (topic.fixed ? '고정 해제' : '고정') + '</button><button data-analyze-topic type="button">AI 분석</button><button data-complete-topic type="button">완료</button><button class="danger" data-remove-topic type="button">제거</button></div>' +
        '</div>' +
        (card ? renderPrimaryCard(topic, card, pendingCount) : '<article class="ai-card"><span class="tag">카드 없음</span><h3>현재 표시할 AI 카드가 없습니다</h3><p>필요할 때 AI 분석을 누르세요. 고정 topic과 충돌이 생기면 충돌 카드가 우선 표시됩니다.</p></article>');
    }

    function renderPrimaryCard(topic, card, pendingCount) {
      const kind = normalizeKind(card.kind);
      const fixedBlocked = topic.fixed && kind !== 'conflict';
      const childPreview = card.childTopics && card.childTopics.length
        ? '<div class="child-preview">' + card.childTopics.map(function(child) {
            return '<div><strong>' + escapeHtml(child.title) + '</strong><p>' + escapeHtml(child.text) + '</p></div>';
          }).join('') + '</div>'
        : '';
      const details = card.details && card.details.length
        ? '<div class="child-preview">' + card.details.map(function(item) {
            return '<div><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.body) + '</p></div>';
          }).join('') + '</div>'
        : '';
      const suggestion = kind !== 'split' && kind !== 'conflict' && card.suggestion
        ? '<label>적용 후 topic 내용<textarea data-card-suggestion ' + (fixedBlocked ? 'disabled' : '') + '>' + escapeHtml(card.suggestion) + '</textarea></label>'
        : '';
      return '<article class="ai-card ' + kind + '" data-card-id="' + card.id + '">' +
        '<div class="card-head"><span class="tag strong">' + escapeHtml(card.type || kindLabel(kind)) + '</span><span class="tag">대기 카드 ' + pendingCount + '</span></div>' +
        '<h3>' + escapeHtml(card.title) + '</h3>' +
        '<p>' + escapeHtml(card.body) + '</p>' +
        (card.impact ? '<div class="impact"><strong>로드맵 영향</strong><br>' + escapeHtml(card.impact) + '</div>' : '') +
        details +
        childPreview +
        suggestion +
        '<div class="actions"><button class="primary" data-apply-card="' + card.id + '" ' + (fixedBlocked ? 'disabled' : '') + ' type="button">' + (fixedBlocked ? '고정 해제 후 적용' : applyLabel(kind)) + '</button><button data-dismiss-card="' + card.id + '" type="button">제거</button><span class="pending-count">대기 카드 ' + pendingCount + '</span></div>' +
        (card.error ? '<div class="error-log">적용 실패: ' + escapeHtml(card.error) + '</div>' : '') +
      '</article>';
    }

    function kindLabel(kind) {
      return {
        answer: '즉시 답변',
        research: '확인 필요',
        experiment: '실험 필요',
        decision: '지금 결정',
        filter: '제외/보류',
        split: 'topic 분리 제안',
        conflict: '충돌 경고'
      }[kind] || 'card';
    }

    function applyLabel(kind) {
      if (kind === 'split') return '기능별 topic 생성';
      if (kind === 'conflict') return '충돌 확인';
      return 'topic에 반영';
    }

    function renderTaskFilters() {
      const completed = completedTopics();
      taskFilterEl.innerHTML = '<button class="' + (state.taskFilter === 'all' ? 'active' : '') + '" data-task-filter="all" type="button">전체</button>' +
        completed.map(function(topic, index) {
          return '<button class="' + (state.taskFilter === topic.id ? 'active' : '') + '" data-task-filter="' + topic.id + '" type="button">' + (index + 1) + '</button>';
        }).join('');
    }

    function visibleTasks() {
      if (state.taskFilter === 'all') return state.tasks;
      return state.tasks.filter(function(task) { return task.pageId === state.taskFilter; });
    }

    function renderTasks() {
      const tasks = visibleTasks();
      taskListEl.innerHTML = tasks.length ? tasks.map(function(task) {
        return '<article class="task-card" data-task-id="' + task.id + '">' +
          '<div class="task-head"><div><h3>' + escapeHtml(task.title) + '</h3><p>Page ' + (task.pageNumber || '-') + ' · 실제 확인 필요</p></div><span class="tag amber">task</span></div>' +
          '<label>Task 제목<input data-field="title" value="' + escapeHtml(task.title) + '"></label>' +
          '<label>필요 정보<textarea data-field="neededInfo">' + escapeHtml(task.neededInfo) + '</textarea></label>' +
          '<label>완료기준<textarea data-field="doneCriteria">' + escapeHtml(task.doneCriteria) + '</textarea></label>' +
          '<div class="task-reason"><strong>생성 맥락</strong><br>' + escapeHtml(task.reason || '이 topic에서 시간을 써야 확인할 일이 생겼습니다.') + '</div>' +
          '<div class="task-grid"><label>담당자<select data-field="assignee"><option>미배정</option><option>조수현</option><option>김조은</option><option>배민성</option></select></label><label>중요도<select data-field="importance"><option>높음</option><option>보통</option><option>낮음</option></select></label></div>' +
          '<div class="actions"><button class="primary" data-apply-task="' + task.id + '" type="button">Subjector in-process에 적용</button><button class="danger" data-remove-task="' + task.id + '" type="button">제거</button></div>' +
          (task.error ? '<div class="error-log">반영 실패: ' + escapeHtml(task.error) + '</div>' : '') +
        '</article>';
      }).join('') : '<div class="quiet-box">완료된 topic에서 시간이 필요한 항목만 task 후보로 생성됩니다.</div>';

      taskListEl.querySelectorAll('.task-card').forEach(function(card) {
        const task = state.tasks.find(function(item) { return item.id === card.dataset.taskId; });
        if (!task) return;
        card.querySelector('[data-field="assignee"]').value = task.assignee;
        card.querySelector('[data-field="importance"]').value = task.importance;
      });
    }

    function renderTaskUpdates() {
      taskUpdateListEl.innerHTML = state.existingTaskUpdates.map(function(update) {
        return '<article class="update-card" data-task-update-id="' + update.id + '">' +
          '<div class="task-head"><div><span class="tag amber">기존 task 보강</span><h3>' + escapeHtml(update.existingTaskTitle || update.taskId) + '</h3></div><button class="danger" data-remove-task-update="' + update.id + '" type="button">제거</button></div>' +
          '<p>' + escapeHtml(update.reason || '새 task가 아니라 기존 task를 더 선명하게 만드는 내용입니다.') + '</p>' +
          '<div class="split-update"><div class="update-part"><strong>확인할 것에 추가</strong><p>' + escapeHtml(update.addNeededInfo || '추가할 확인 항목 없음') + '</p></div><div class="update-part"><strong>완료 기준 변경 제안</strong><p>' + escapeHtml(update.doneCriteriaChange || '완료 기준 변경 없음') + '</p></div></div>' +
          '<div class="actions"><button data-apply-task-update="' + update.id + '" data-include-done="false" type="button">확인할 것만 보강</button><button class="primary" data-apply-task-update="' + update.id + '" data-include-done="true" type="button">완료 기준 변경 포함</button></div>' +
          (update.error ? '<div class="error-log">보강 실패: ' + escapeHtml(update.error) + '</div>' : '') +
        '</article>';
      }).join('');
    }

    function renderNotTasks() {
      notTaskListEl.innerHTML = state.notTasks.map(function(item) {
        return '<article class="not-task-card" data-not-task-id="' + item.id + '"><div class="task-head"><div><span class="tag">task 아님</span><h3>' + escapeHtml(item.content) + '</h3></div><button class="danger" data-remove-not-task="' + item.id + '" type="button">제거</button></div>' + (item.reason ? '<p>' + escapeHtml(item.reason) + '</p>' : '') + '</article>';
      }).join('');
      document.getElementById('task-generation-error').innerHTML = state.taskGenerationError ? '<div class="error-log">' + escapeHtml(state.taskGenerationError) + '</div>' : '';
    }

    function buildMeetingRecord() {
      const sources = completedTopics().length ? completedTopics() : state.topics;
      const lines = sources.map(function(topic) { return '- ' + topic.title + ': ' + compactText(topic.text, 180); }).join('\\n');
      return [
        '# 회의 기록',
        '',
        '## 오늘 판단한 것',
        lines || '- 아직 정리된 topic이 없습니다.',
        '',
        '## 로드맵 변화',
        '- 고정한 topic은 회의 기준으로 삼고, 충돌이 생기면 충돌 카드로 확인했습니다.',
        '',
        '## 제외한 선택지',
        '- 설명만으로 해결된 개념 정리와 지금 회의에서 바로 결정한 선택은 task 후보에서 제외했습니다.',
        '',
        '## 다음 회의로 넘길 맥락',
        '- 실제 자료 확인, 라이선스 확인, latency 측정처럼 시간을 써야만 해결되는 일만 Subjector task 후보로 넘깁니다.'
      ].join('\\n');
    }

    function renderRecord() {
      recordEl.textContent = state.record || '회의록 생성 버튼을 누르면 판단 기록 초안이 여기에 표시됩니다.';
    }

    function render() {
      renderRoadmap();
      renderCardPopover();
      renderTaskFilters();
      renderTasks();
      renderTaskUpdates();
      renderNotTasks();
      renderRecord();
      saveState();
    }

    function openTopicDialog() {
      parentTopicEl.innerHTML = '<option value="">최상위 topic</option>' + state.topics.map(function(topic) {
        return '<option value="' + topic.id + '" ' + (state.activeTopicId === topic.id ? 'selected' : '') + '>' + escapeHtml(topic.title) + '</option>';
      }).join('');
      document.getElementById('topic-title-input').value = '';
      document.getElementById('topic-text-input').value = '';
      topicDialog.showModal();
    }

    function tag(text, tone) {
      return '<span class="tag ' + (tone || '') + '">' + escapeHtml(text) + '</span>';
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.getElementById('add-topic').addEventListener('click', openTopicDialog);
    document.getElementById('refresh-roadmap').addEventListener('click', async function(event) {
      event.target.disabled = true;
      try {
        await refreshRoadmapContext();
      } catch (error) {
        state.refreshMessage = error.message;
      }
      event.target.disabled = false;
      render();
    });
    document.getElementById('close-topic-dialog').addEventListener('click', function() { topicDialog.close(); });
    document.getElementById('topic-form').addEventListener('submit', function(event) {
      event.preventDefault();
      const title = document.getElementById('topic-title-input').value.trim();
      const text = document.getElementById('topic-text-input').value.trim();
      if (!title && !text) return;
      addTopic({ title: title, text: text || title, parentId: parentTopicEl.value || null });
      topicDialog.close();
      render();
    });

    roadmapEl.addEventListener('click', async function(event) {
      const closeButton = event.target.closest('[data-close-popover]');
      if (closeButton) {
        state.activeTopicId = null;
        render();
        return;
      }

      const topicButton = event.target.closest('[data-topic]');
      if (topicButton) {
        const topicId = topicButton.dataset.topic;
        state.activeTopicId = state.activeTopicId === topicId ? null : topicId;
        render();
        return;
      }

      const topic = activeTopic();
      if (!topic) return;

      const saveButton = event.target.closest('[data-save-topic]');
      if (saveButton) {
        if (topic.fixed) return;
        topic.title = document.querySelector('[data-topic-title]').value.trim() || topic.title;
        topic.text = document.querySelector('[data-topic-text]').value.trim() || topic.text;
        ensurePriorityCards(topic);
        render();
        return;
      }

      const fixedButton = event.target.closest('[data-toggle-fixed]');
      if (fixedButton) {
        topic.fixed = !topic.fixed;
        render();
        return;
      }

      const completeButton = event.target.closest('[data-complete-topic]');
      if (completeButton) {
        completeButton.disabled = true;
        try {
          await completeTopic(topic);
        } catch (error) {
          state.taskGenerationError = error.message;
        }
        render();
        return;
      }

      const removeButton = event.target.closest('[data-remove-topic]');
      if (removeButton) {
        removeActiveTopic();
        render();
        return;
      }

      const analyzeButton = event.target.closest('[data-analyze-topic]');
      if (analyzeButton) {
        analyzeButton.disabled = true;
        try {
          await requestCardsForTopic(topic);
        } catch (error) {
          topic.cards = [{
            id: 'analysis-error-' + Date.now(),
            kind: 'filter',
            type: 'AI 연결 오류',
            title: 'AI Analysis를 실행하지 못했습니다',
            body: error.message,
            suggestion: '',
            error: error.message
          }];
        }
        render();
        return;
      }

      const applyButton = event.target.closest('[data-apply-card]');
      if (applyButton) {
        const card = (topic.cards || []).find(function(item) { return item.id === applyButton.dataset.applyCard; });
        if (!card) return;
        try {
          const content = event.target.closest('[data-card-id]')?.querySelector('[data-card-suggestion]')?.value || card.suggestion || '';
          applyCard(topic, card, content);
        } catch (error) {
          card.error = error.message;
        }
        render();
        return;
      }

      const dismissButton = event.target.closest('[data-dismiss-card]');
      if (dismissButton) {
        topic.cards = (topic.cards || []).filter(function(card) { return card.id !== dismissButton.dataset.dismissCard; });
        render();
      }
    });

    taskFilterEl.addEventListener('click', function(event) {
      const button = event.target.closest('[data-task-filter]');
      if (!button) return;
      state.taskFilter = button.dataset.taskFilter;
      render();
    });

    document.getElementById('refresh-tasks').addEventListener('click', async function(event) {
      event.target.disabled = true;
      try {
        await requestTaskCandidates();
      } catch (error) {
        state.taskGenerationError = error.message;
      }
      event.target.disabled = false;
      render();
    });

    taskListEl.addEventListener('input', function(event) {
      const card = event.target.closest('[data-task-id]');
      if (!card) return;
      const task = state.tasks.find(function(item) { return item.id === card.dataset.taskId; });
      if (!task) return;
      task[event.target.dataset.field] = event.target.value;
      task.error = '';
      saveState();
    });

    taskListEl.addEventListener('click', async function(event) {
      const removeButton = event.target.closest('[data-remove-task]');
      if (removeButton) {
        state.tasks = state.tasks.filter(function(item) { return item.id !== removeButton.dataset.removeTask; });
        render();
        return;
      }
      const button = event.target.closest('[data-apply-task]');
      if (!button) return;
      const task = state.tasks.find(function(item) { return item.id === button.dataset.applyTask; });
      if (!task) return;
      if (task.assignee === '미배정') {
        task.error = '담당자를 먼저 선택해 주세요.';
        render();
        return;
      }
      button.disabled = true;
      try {
        const response = await fetch('/idea-cruise/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            neededInfo: task.neededInfo,
            doneCriteria: task.doneCriteria,
            reason: task.reason,
            assignee: task.assignee,
            importance: task.importance,
            meetingRecord: state.record
          })
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) throw new Error(result.error || 'Subjector 반영에 실패했습니다.');
        state.tasks = state.tasks.filter(function(item) { return item.id !== task.id; });
      } catch (error) {
        task.error = error.message;
      }
      render();
    });

    taskUpdateListEl.addEventListener('click', async function(event) {
      const removeButton = event.target.closest('[data-remove-task-update]');
      if (removeButton) {
        state.existingTaskUpdates = state.existingTaskUpdates.filter(function(item) { return item.id !== removeButton.dataset.removeTaskUpdate; });
        render();
        return;
      }
      const applyButton = event.target.closest('[data-apply-task-update]');
      if (!applyButton) return;
      const update = state.existingTaskUpdates.find(function(item) { return item.id === applyButton.dataset.applyTaskUpdate; });
      if (!update) return;
      applyButton.disabled = true;
      try {
        const response = await fetch('/idea-cruise/task-updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: update.taskId,
            addNeededInfo: update.addNeededInfo,
            doneCriteriaChange: update.doneCriteriaChange,
            includeDoneCriteriaChange: applyButton.dataset.includeDone === 'true',
            meetingRecord: state.record
          })
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) throw new Error(result.error || '기존 task 보강에 실패했습니다.');
        state.existingTaskUpdates = state.existingTaskUpdates.filter(function(item) { return item.id !== update.id; });
      } catch (error) {
        update.error = error.message;
      }
      render();
    });

    notTaskListEl.addEventListener('click', function(event) {
      const button = event.target.closest('[data-remove-not-task]');
      if (!button) return;
      state.notTasks = state.notTasks.filter(function(item) { return item.id !== button.dataset.removeNotTask; });
      render();
    });

    document.getElementById('generate-record').addEventListener('click', function() {
      state.record = buildMeetingRecord();
      render();
    });

    document.getElementById('copy-record').addEventListener('click', async function() {
      const text = state.record || buildMeetingRecord();
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
    });

    render();
  </script>
</body>
</html>`;
}
