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
      --bg: #f5f7f8;
      --surface: #ffffff;
      --panel: #eef3f1;
      --line: #d7e0e5;
      --text: #17202a;
      --muted: #65717d;
      --teal: #0f766e;
      --teal-dark: #115e59;
      --blue: #245f9f;
      --amber: #a46100;
      --red: #a64242;
      --gray: #4b5563;
      --blue-soft: #eaf2fb;
      --teal-soft: #e7f5f1;
      --amber-soft: #fff1db;
      --red-soft: #fae9e9;
      --gray-soft: #eef1f4;
      --shadow: 0 10px 24px rgba(23, 32, 42, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 22px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }

    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 3px; font-size: 22px; line-height: 1.2; }
    h2 { margin-bottom: 4px; font-size: 15px; }
    h3 { margin-bottom: 5px; font-size: 14px; line-height: 1.35; }

    .subtitle, .hint, .meta, .small, .status {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    button {
      border: 1px solid var(--teal);
      border-radius: 6px;
      padding: 8px 11px;
      background: var(--teal);
      color: #fff;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }

    button.secondary {
      background: #fff;
      color: var(--teal);
    }

    button.ghost {
      border-color: var(--line);
      background: #fff;
      color: var(--gray);
    }

    button:disabled {
      cursor: default;
      opacity: 0.62;
    }

    main {
      display: grid;
      grid-template-columns: minmax(330px, 0.9fr) minmax(520px, 1.35fr) minmax(390px, 1fr);
      gap: 14px;
      padding: 14px;
      align-items: start;
    }

    section {
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: calc(100vh - 106px);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .section-head {
      min-height: 94px;
      padding: 13px 15px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .head-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .section-body {
      display: grid;
      align-content: start;
      gap: 12px;
      min-height: 0;
      padding: 14px;
      overflow-y: auto;
    }

    textarea, input, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 10px;
      color: var(--text);
      background: #fff;
      font: inherit;
      font-size: 13px;
      line-height: 1.5;
    }

    textarea { min-height: 92px; resize: vertical; }

    label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .top-actions, .actions, .page-nav, .choice-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 7px;
    }

    .topic-card, .entry-card, .ai-card, .decision-card, .task-card, .not-task, .roadmap-node {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }

    .topic-card {
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    .topic-title-row {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 10px;
    }

    .entry-card {
      overflow: hidden;
    }

    .entry-card textarea {
      border: 0;
      border-radius: 0;
      min-height: 260px;
      font-size: 14px;
    }

    .entry-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-top: 1px solid var(--line);
    }

    .page-nav {
      justify-content: center;
      padding: 10px;
      border: 1px dashed var(--line);
      border-radius: 8px;
      background: #fbfcfd;
    }

    .task-filter-nav {
      justify-content: flex-start;
    }

    .dot {
      min-width: 28px;
      height: 28px;
      display: inline-grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      background: #fff;
      font-size: 11px;
      font-weight: 700;
    }

    .dot.active {
      color: #fff;
      background: var(--teal-dark);
      border-color: var(--teal-dark);
    }

    .pill {
      display: inline-flex;
      width: fit-content;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .pill.answer { color: var(--blue); background: var(--blue-soft); }
    .pill.research { color: var(--amber); background: var(--amber-soft); }
    .pill.experiment { color: var(--red); background: var(--red-soft); }
    .pill.decision { color: var(--teal-dark); background: var(--teal-soft); }
    .pill.filter { color: var(--gray); background: var(--gray-soft); }

    .roadmap-row {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(170px, 0.62fr);
      gap: 10px;
      align-items: start;
    }

    .roadmap-main {
      display: grid;
      gap: 9px;
    }

    .roadmap-branches {
      display: grid;
      gap: 8px;
      max-height: calc(100vh - 250px);
      overflow-y: auto;
    }

    .roadmap-node {
      display: grid;
      gap: 8px;
      padding: 10px;
      background: #fbfcfd;
    }

    .roadmap-node strong {
      font-size: 13px;
      line-height: 1.45;
    }

    .roadmap-node span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .branch-card {
      min-height: 0;
      max-height: 330px;
      overflow-y: auto;
    }

    .branch-card h3 {
      font-size: 13px;
    }

    .primary-roadmap-card {
      min-height: 300px;
    }

    .rewrite-note {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }

    .ai-card {
      display: grid;
      gap: 9px;
      padding: 12px;
    }

    .ai-card.answer { border-left: 5px solid var(--blue); }
    .ai-card.research { border-left: 5px solid var(--amber); }
    .ai-card.experiment { border-left: 5px solid var(--red); }
    .ai-card.filter { border-left: 5px solid var(--gray); }

    .decision-card {
      display: grid;
      gap: 11px;
      padding: 12px;
      border-left: 5px solid var(--teal);
    }

    .ai-card p, .ai-card ul, .decision-card p, .decision-card ul {
      margin-bottom: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .ai-card ul, .decision-card ul {
      padding-left: 18px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .info-box {
      display: grid;
      gap: 5px;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #fff;
    }

    .info-box strong { font-size: 12px; }
    .info-box span {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }

    .apply-preview {
      display: grid;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #f8fafb;
    }

    .apply-preview textarea {
      min-height: 76px;
      background: #fff;
    }

    .choice-card {
      flex: 1 1 180px;
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 11px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }

    .choice-card.selected {
      border-color: var(--teal);
      background: var(--teal-soft);
    }

    .choice-card strong { font-size: 13px; }
    .choice-card p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .not-task {
      display: grid;
      gap: 8px;
      padding: 12px;
      border-color: #c7dcf3;
      background: var(--blue-soft);
    }

    .not-task h3 { color: var(--blue); }
    .not-task ul {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
      line-height: 1.5;
    }

    .update-card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--line);
      border-left: 5px solid var(--amber);
      border-radius: 8px;
      background: #fffdf8;
    }

    .split-update {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .update-part {
      display: grid;
      gap: 7px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #fff;
    }

    .update-part strong { font-size: 12px; }
    .update-part p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .task-card {
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    .task-card header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 10px;
      padding: 0;
      border: 0;
      background: transparent;
    }

    .task-card h3 { margin-bottom: 0; }

    .task-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .record-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 20;
      width: min(560px, 100vw);
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      background: var(--surface);
      border-left: 1px solid var(--line);
      box-shadow: -18px 0 32px rgba(23, 32, 42, 0.18);
      transform: translateX(105%);
      transition: transform 180ms ease;
    }

    .record-drawer.open { transform: translateX(0); }

    .drawer-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .drawer-body {
      display: grid;
      gap: 12px;
      min-height: 0;
      padding: 16px;
      overflow-y: auto;
    }

    .record-preview {
      min-height: 360px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      white-space: pre-wrap;
      line-height: 1.52;
      font-size: 13px;
    }

    .error-log {
      padding: 8px 10px;
      border: 1px solid #efcaca;
      border-radius: 7px;
      background: #fff7f7;
      color: var(--red);
      font-size: 12px;
      line-height: 1.45;
    }

    @media (max-width: 1160px) {
      main { grid-template-columns: 1fr; }
      section { height: auto; min-height: 520px; }
      .info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IDEA CRUISE Roadmap Desk</h1>
      <div class="subtitle">주제를 던지고, 중요한 선택을 먼저 고른 뒤, 시간이 필요한 일만 Subjector task로 넘깁니다.</div>
    </div>
    <div class="top-actions">
      <button class="ghost" id="open-record" type="button">회의록 열기</button>
    </div>
  </header>

  <main>
    <section>
      <div class="section-head">
        <div class="head-row">
          <div>
            <h2>1. Topic Page</h2>
            <p class="hint">왼쪽 한 페이지는 하나의 주제를 담당합니다<br>다음 페이지로 가면 가운데 카드도 새 주제 전용으로 바뀝니다.</p>
          </div>
          <div class="actions">
            <button id="add-topic" type="button">다음 주제 추가</button>
            <button class="secondary" id="remove-topic" type="button">제거</button>
          </div>
        </div>
      </div>
      <div class="section-body">
        <article class="topic-card">
          <div class="topic-title-row">
            <div>
              <h3 id="topic-title"></h3>
              <div class="meta" id="topic-meta">이 페이지의 가운데 카드는 현재 주제에만 연결됩니다.</div>
            </div>
            <span class="pill answer" id="topic-state">active</span>
          </div>
        </article>

        <article class="entry-card">
          <textarea id="topic-text"></textarea>
          <div class="entry-foot">
            <span class="meta">원문과 보강이 한 카드에 누적됨</span>
            <div class="actions">
              <button class="secondary" id="analyze-topic" type="button">AI Analysis</button>
              <button id="complete-topic" type="button">완료</button>
            </div>
          </div>
        </article>

        <div class="page-nav" id="page-nav"></div>
        <div class="meta">새 궁금증이 생기면 다음 주제 추가를 눌러 전용 페이지에서 분석합니다.</div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>2. Roadmap Intervention</h2>
        <p class="hint">카드 생성: GPT-5.4. 가장 중요한 결정 1개를 크게 띄우고, 나머지는 branch 후보로 좁혀 둡니다.</p>
      </div>
      <div class="section-body" id="card-list"></div>
    </section>

    <section>
      <div class="section-head">
        <h2>3. Outcome Tasks</h2>
        <p class="hint">Task 최종 정제: Gemini 2.5 Flash-Lite. 결정 자체가 아니라 자료조사, 검증, 구현처럼 시간이 필요한 일만 남깁니다.</p>
      </div>
      <div class="section-body">
        <div class="page-nav task-filter-nav" id="task-filter-nav"></div>
        <div class="actions">
          <button class="secondary" id="generate-record" type="button">회의록 생성</button>
        </div>
        <div class="status">회의록 생성: Gemini 2.5 Flash-Lite</div>
        <article class="not-task" id="not-task"></article>
        <div id="task-update-list"></div>
        <div id="task-generation-error"></div>
        <div id="task-list"></div>
      </div>
    </section>
  </main>

  <aside class="record-drawer" id="record-drawer" aria-label="meeting record drawer">
    <div class="drawer-head">
      <div>
        <h2>Meeting Record</h2>
        <p class="hint">#project-log에 올릴 판단 기록 초안입니다.</p>
      </div>
      <div class="actions">
        <button id="copy-record" type="button">결과록 복사</button>
        <button class="secondary" id="close-record" type="button">닫기</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="record-preview" id="meeting-record"></div>
      <div class="meta">회의록은 task 목록이 아니라, 어떤 판단을 했는지 남기는 글입니다.</div>
    </div>
  </aside>

  <script>
    const storageKey = 'ideaCruiseTopicPagesDraft';
    const defaultTopicText = '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터는 무엇인가?\\n\\n[알게 된 것]\\n- 아직 정리 전\\n\\n[조사할 것]\\n- \\n\\n[해볼 것]\\n- \\n\\n[정한 것]\\n- ';
    const state = loadState() || {
      pages: [
        {
          id: 'page-1',
          number: 1,
          title: '폭음 데이터',
          text: defaultTopicText,
          cards: seedCards(),
          completed: false
        }
      ],
      activePageId: 'page-1',
      taskFilter: 'all',
      tasks: [],
      existingTaskUpdates: [],
      notTasks: [],
      taskGenerationError: '',
      record: '',
      recordDrawerOpen: false
    };

    normalizeState();

    function normalizeState() {
      if (!Array.isArray(state.pages) || state.pages.length === 0) {
        state.pages = [{ id: 'page-1', number: 1, title: '새 주제', text: defaultTopicText, cards: seedCards(), completed: false }];
      }
      state.pages.forEach(function(page, index) {
        page.id = page.id || 'page-' + (index + 1);
        page.number = page.number || index + 1;
        page.title = page.title || titleFromText(page.text) || '새 주제';
        page.text = page.text || '';
        page.cards = Array.isArray(page.cards) ? page.cards : [];
        page.completed = Boolean(page.completed);
      });
      if (!state.pages.some(function(page) { return page.id === state.activePageId; })) {
        state.activePageId = state.pages[0].id;
      }
      state.taskFilter = state.taskFilter || 'all';
      state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
      state.existingTaskUpdates = Array.isArray(state.existingTaskUpdates) ? state.existingTaskUpdates : [];
      state.notTasks = Array.isArray(state.notTasks) ? state.notTasks : [];
      state.taskGenerationError = state.taskGenerationError || '';
      state.record = state.record || '';
      state.recordDrawerOpen = Boolean(state.recordDrawerOpen);
    }

    function seedCards() {
      return [
        {
          id: 'card-answer-1',
          kind: 'answer',
          type: '즉시 답변 · 펼쳐보기',
          title: '데이터셋 후보가 왜 언급되는지 먼저 설명',
          body: '자료조사 task를 만들기 전에 AI가 알고 있는 기본 설명을 펼쳐서 보여줍니다. 이 설명은 task가 아니라 이해 보조입니다.',
          details: [
            { title: 'AudioSet', body: '구글이 만든 대규모 오디오 이벤트 데이터셋입니다. 범위가 넓어서 후보 탐색 출발점으로 좋지만 라벨이 거칠 수 있습니다.' },
            { title: 'ESC-50', body: '환경음 50종 분류 데이터셋입니다. 작고 구조가 단순해 빠른 실험에 좋지만 전장 폭음 특화는 아닙니다.' },
            { title: 'UrbanSound8K', body: '도시 소음 중심 데이터셋입니다. 사이렌, 드릴 같은 생활/공사장 소음 검토에는 유용하지만 총성/폭발음은 별도 확인이 필요합니다.' }
          ],
          suggestion: '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터는 무엇인가?\\n\\n[알게 된 것]\\n- AudioSet은 넓은 오디오 이벤트 후보 탐색용, ESC-50은 빠른 환경음 실험용, UrbanSound8K는 도시/공사장 소음 검토용으로 볼 수 있습니다.\\n\\n[조사할 것]\\n- \\n\\n[해볼 것]\\n- \\n\\n[정한 것]\\n- '
        },
        {
          id: 'card-research-1',
          kind: 'research',
          type: '확인 필요 · task 후보 가능',
          title: '라이선스와 라벨 구조는 직접 확인해야 합니다',
          body: '후보의 이름을 아는 것과 프로젝트에 쓸 수 있는 것은 다릅니다. 그래서 이 항목은 자료조사 task 후보가 됩니다.',
          suggestion: '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터는 무엇인가?\\n\\n[알게 된 것]\\n- 후보 데이터셋 이름을 아는 것과 실제 프로젝트에 쓸 수 있는 것은 다릅니다.\\n\\n[조사할 것]\\n- AudioSet, ESC-50, UrbanSound8K의 라이선스, 라벨 구조, 폭음/위험음 관련성, MVP 실험 적합성을 비교합니다.\\n\\n[해볼 것]\\n- \\n\\n[정한 것]\\n- '
        },
        {
          id: 'card-decision-1',
          kind: 'decision',
          type: '결정 필요 · 지금 회의에서 선택',
          title: '전장용 vs 공사현장용 중 하나로 좁히기',
          body: '이건 task로 넘기기보다 지금 회의에서 선택해야 하는 기준입니다. 선택하면 왼쪽에 정한 것으로 기록됩니다.',
          choices: [
            { label: '전장용', body: '발표 임팩트는 크지만 데이터 수집과 안전성 설명이 어려울 수 있습니다. 총성/폭발음 계열 데이터가 더 중요합니다.', suggestion: '전장용 폭음 감지를 MVP 방향으로 좁힙니다.\\n\\n[알게 된 것]\\n- 총성/폭발음 계열 데이터가 중요합니다.\\n\\n[조사할 것]\\n- 전장 폭음 데이터셋 후보, 라이선스, 라벨 구조를 확인합니다.\\n\\n[해볼 것]\\n- 실제 모델 학습과 latency 측정은 후보 데이터셋 확인 뒤 진행합니다.\\n\\n[정한 것]\\n- 공사현장용은 이번 topic에서 제외합니다.' },
            { label: '공사현장용', body: '시연과 설득이 쉽고 도시/공사장 소음 데이터와 연결하기 좋습니다. 졸업작품 MVP 범위로 더 안정적입니다.', suggestion: '공사현장용 청력 보호/위험음 감지를 MVP 방향으로 좁힙니다.\\n\\n[알게 된 것]\\n- 도시/공사장 소음 데이터와 연결하기 쉽고 시연 가능성이 높습니다.\\n\\n[조사할 것]\\n- 공사현장 소음 데이터셋과 위험음 라벨 구조를 확인합니다.\\n\\n[해볼 것]\\n- 현장 소음 샘플로 감지 latency를 측정합니다.\\n\\n[정한 것]\\n- 전장용 폭음 감지는 이번 topic에서 제외합니다.' }
          ],
          suggestion: '전장용과 공사현장용 중 하나로 MVP 범위를 좁혀야 합니다.\\n\\n[알게 된 것]\\n- 두 방향은 데이터셋, 시연 방식, 안전성 설명이 다릅니다.\\n\\n[조사할 것]\\n- \\n\\n[해볼 것]\\n- \\n\\n[정한 것]\\n- 아직 선택 전입니다.'
        },
        {
          id: 'card-experiment-1',
          kind: 'experiment',
          type: '실험 필요 · task 후보 가능',
          title: '실시간 감지는 직접 돌려봐야 압니다',
          body: '모델이 라즈베리 파이에서 돌아가는지, latency가 시연 가능한 수준인지는 설명만으로 끝나지 않습니다.',
          suggestion: '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터와 실시간 처리 가능성을 함께 확인합니다.\\n\\n[알게 된 것]\\n- 라즈베리 파이에서 돌아가는지와 latency는 설명만으로 확정할 수 없습니다.\\n\\n[조사할 것]\\n- 사용할 sound event model 후보를 정합니다.\\n\\n[해볼 것]\\n- 라즈베리 파이에서 샘플 sound event model의 평균 latency를 측정합니다.\\n- 마이크 입력 조건과 추론 시간을 함께 기록합니다.\\n\\n[정한 것]\\n- '
        }
      ];
    }

    function loadState() {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        return null;
      }
    }

    function saveState() {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function activePage() {
      return state.pages.find(function(page) { return page.id === state.activePageId; }) || state.pages[0];
    }

    function completedPages() {
      return state.pages.filter(function(page) { return page.completed; });
    }

    function titleFromText(text) {
      const firstLine = String(text || '').split('\\n').map(function(line) { return line.trim(); }).find(Boolean);
      return firstLine ? firstLine.slice(0, 28) : '';
    }

    function addTopicPage() {
      const number = state.pages.length + 1;
      const page = {
        id: 'page-' + Date.now(),
        number: number,
        title: '새 주제 ' + number,
        text: '',
        cards: [],
        completed: false
      };
      state.pages.push(page);
      state.activePageId = page.id;
      render();
    }

    function createEmptyTopicPage() {
      return {
        id: 'page-' + Date.now(),
        number: 1,
        title: '새 주제',
        text: '',
        cards: [],
        completed: false
      };
    }

    function removeActiveTopicPage() {
      const removedPageId = state.activePageId;
      const removedIndex = state.pages.findIndex(function(page) { return page.id === removedPageId; });
      state.pages = state.pages.filter(function(page) { return page.id !== removedPageId; });
      if (state.pages.length === 0) {
        state.pages = [createEmptyTopicPage()];
      }
      state.pages.forEach(function(page, index) {
        page.number = index + 1;
      });
      const nextIndex = Math.min(Math.max(removedIndex, 0), state.pages.length - 1);
      state.activePageId = state.pages[nextIndex].id;
      state.tasks = state.tasks.filter(function(task) { return task.pageId !== removedPageId; });
      state.tasks.forEach(function(task) {
        const page = state.pages.find(function(item) { return item.id === task.pageId; });
        if (page) {
          task.pageNumber = page.number;
        }
      });
      if (state.taskFilter === removedPageId) {
        state.taskFilter = 'all';
      }
      state.existingTaskUpdates = [];
      state.notTasks = [];
      state.taskGenerationError = '';
      render();
    }

    function setActivePage(pageId) {
      state.activePageId = pageId;
      render();
    }

    function setTaskFilter(filter) {
      state.taskFilter = filter;
      render();
    }

    function rewriteActivePage(content) {
      const page = activePage();
      if (!content || !content.trim()) {
        throw new Error('적용할 내용이 비어 있습니다.');
      }
      page.text = content.trim();
      page.title = titleFromText(page.text) || page.title;
    }

    async function completeActivePage() {
      const page = activePage();
      page.completed = true;
      page.title = titleFromText(page.text) || page.title;
      await requestTaskCandidates();
      render();
    }

    function mapApiCard(card, index) {
      const kindMap = {
        info: 'answer',
        warn: 'research'
      };
      return {
        id: 'api-card-' + Date.now() + '-' + index,
        kind: card.kind || kindMap[card.tag] || 'research',
        type: card.type || 'AI 고려',
        title: card.title || 'AI 고려 사항',
        body: card.body || '',
        suggestion: card.suggestion || '',
        details: Array.isArray(card.details) ? card.details : [],
        choices: Array.isArray(card.choices) ? card.choices : []
      };
    }

    async function requestCardsForActivePage() {
      const page = activePage();
      const response = await fetch('/idea-cruise/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryText: page.text,
          completedEntries: completedPages().map(function(item) { return item.text; })
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        throw new Error(result.error || 'AI Analysis 연결에 실패했습니다.');
      }
      page.cards = (result.cards || []).map(mapApiCard);
    }

    async function requestTaskCandidates() {
      const pages = completedPages();
      if (pages.length === 0) {
        state.taskGenerationError = '완료된 topic page가 없습니다.';
        return;
      }

      const response = await fetch('/idea-cruise/task-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedPages: completedPages().map(function(page) {
            return {
              id: page.id,
              number: page.number,
              title: page.title,
              text: page.text
            };
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
          reason: task.reason || '',
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
        if (typeof item === 'string') {
          return { id: 'not-task-' + Date.now() + '-' + index, content: item, reason: '' };
        }
        return {
          id: item.id || 'not-task-' + Date.now() + '-' + index,
          content: item.content || '',
          reason: item.reason || ''
        };
      }) : [];
      state.taskGenerationError = '';
    }

    function renderTopicPage() {
      const page = activePage();
      document.getElementById('topic-title').textContent = 'Page ' + page.number + ' · ' + (page.title || '새 주제');
      document.getElementById('topic-state').textContent = page.completed ? 'completed' : 'active';
      document.getElementById('topic-text').value = page.text;
      document.getElementById('page-nav').innerHTML = state.pages.map(function(item) {
        return '<button class="dot ' + (item.id === state.activePageId ? 'active' : '') + '" data-page-id="' + item.id + '" type="button">' + item.number + '</button>';
      }).join('');
      document.querySelectorAll('[data-page-id]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          setActivePage(event.target.dataset.pageId);
        });
      });
    }

    function renderCards() {
      const page = activePage();
      const list = document.getElementById('card-list');
      if (!page.cards.length) {
        list.innerHTML = '<div class="hint">AI Analysis를 누르면 현재 page 전용 카드가 여기에 표시됩니다.</div>';
        return;
      }
      const primaryIndex = page.cards.findIndex(function(card) { return normalizeKind(card.kind) === 'decision'; });
      const mainIndex = primaryIndex >= 0 ? primaryIndex : 0;
      const mainCard = page.cards[mainIndex];
      const branchCards = page.cards
        .map(function(card, index) { return { card: card, index: index }; })
        .filter(function(item) { return item.index !== mainIndex; });

      list.innerHTML = '<div class="roadmap-row">' +
        '<div class="roadmap-main">' +
          '<div class="roadmap-node"><span>현재 주제</span><strong>' + escapeHtml(compactText(page.text) || '주제 없음') + '</strong></div>' +
          renderCardArticle(mainCard, mainIndex, true) +
          '<div class="roadmap-node"><span>다음 단계</span><strong>선택하면 왼쪽 topic이 재작성됩니다. 다시 AI Analysis를 누르면 선택한 방향으로 더 깊게 들어갑니다.</strong></div>' +
        '</div>' +
        '<div class="roadmap-branches">' +
          (branchCards.length ? branchCards.map(function(item) { return renderCardArticle(item.card, item.index, false); }).join('') : '<div class="hint">추가 branch가 없습니다.</div>') +
        '</div>' +
      '</div>';
    }

    function renderCardArticle(card, index, isPrimary) {
        const kind = normalizeKind(card.kind);
        if (kind === 'decision') {
          return renderDecisionCard(card, index, isPrimary);
        }
        const details = Array.isArray(card.details) && card.details.length
          ? '<div class="info-grid">' + card.details.map(function(item) {
              return '<div class="info-box"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.body) + '</span></div>';
            }).join('') + '</div>'
          : '';
        let applyPreview = '<div class="actions"><button class="secondary" data-dismiss-card="' + index + '" type="button">확인</button></div>';
        if (card.suggestion) {
          applyPreview = '<div class="apply-preview">' +
            '<label>선택하면 왼쪽 topic이 이렇게 바뀝니다</label>' +
            '<textarea data-suggestion>' + escapeHtml(card.suggestion) + '</textarea>' +
            '<div class="rewrite-note">기존 topic에 붙이는 것이 아니라 이 내용으로 재작성됩니다.</div>' +
            '<div class="actions"><button data-apply-card="' + index + '" type="button">선택하고 주제 재작성</button><button class="secondary" data-dismiss-card="' + index + '" type="button">보류</button></div>' +
          '</div>';
        }
        return '<article class="ai-card ' + kind + ' ' + (isPrimary ? 'primary-roadmap-card' : 'branch-card') + '" data-card-index="' + index + '">' +
          '<span class="pill ' + kind + '">' + escapeHtml(card.type) + '</span>' +
          '<h3>' + escapeHtml(card.title) + '</h3>' +
          '<p>' + escapeHtml(card.body) + '</p>' +
          details +
          applyPreview +
          (card.error ? '<div class="error-log">적용 실패: ' + escapeHtml(card.error) + '</div>' : '') +
        '</article>';
    }

    function renderDecisionCard(card, index, isPrimary) {
      const choices = Array.isArray(card.choices) && card.choices.length ? card.choices : [
        { label: '선택 A', body: card.body, suggestion: card.suggestion }
      ];
      return '<article class="decision-card ' + (isPrimary ? 'primary-roadmap-card' : 'branch-card') + '" data-card-index="' + index + '">' +
        '<span class="pill decision">' + escapeHtml(card.type) + '</span>' +
        '<h3>' + escapeHtml(card.title) + '</h3>' +
        '<p>' + escapeHtml(card.body) + '</p>' +
        '<div class="choice-row">' + choices.map(function(choice, choiceIndex) {
          return '<div class="choice-card">' +
            '<strong>' + escapeHtml(choice.label) + '</strong>' +
            '<p>' + escapeHtml(choice.body) + '</p>' +
            '<button class="secondary" data-choice-card="' + index + '" data-choice-index="' + choiceIndex + '" type="button">' + escapeHtml(choice.label) + ' 선택</button>' +
          '</div>';
        }).join('') + '</div>' +
        (card.suggestion ? '<div class="apply-preview">' +
          '<label>선택하면 왼쪽 topic이 이렇게 바뀝니다</label>' +
          '<textarea data-suggestion>' + escapeHtml(card.suggestion) + '</textarea>' +
          '<div class="rewrite-note">기존 topic에 붙이는 것이 아니라 이 내용으로 재작성됩니다.</div>' +
          '<div class="actions"><button data-apply-card="' + index + '" type="button">선택하고 주제 재작성</button><button class="secondary" data-dismiss-card="' + index + '" type="button">보류</button></div>' +
        '</div>' : '<div class="actions"><button class="secondary" data-dismiss-card="' + index + '" type="button">확인</button></div>') +
        (card.error ? '<div class="error-log">적용 실패: ' + escapeHtml(card.error) + '</div>' : '') +
      '</article>';
    }

    function normalizeKind(kind) {
      return ['answer', 'research', 'experiment', 'decision', 'filter'].includes(kind) ? kind : 'research';
    }

    function buildMeetingRecord() {
      const sources = completedPages().length ? completedPages() : state.pages;
      const summaries = sources.map(function(page) {
        return '- Page ' + page.number + ' ' + page.title + ': ' + compactText(page.text);
      }).join('\\n');
      return [
        '# 회의 기록',
        '',
        '## 오늘 판단한 것',
        summaries || '- 아직 정리된 주제가 없습니다.',
        '',
        '## 알게 된 것',
        '- 회의 중 바로 답할 수 있는 내용은 task로 넘기지 않고 topic page 안에 정리했습니다.',
        '',
        '## 제외한 선택지',
        '- 설명만으로 해결된 개념 정리와 지금 회의에서 바로 결정한 선택은 task 후보에서 제외했습니다.',
        '',
        '## 다음 회의로 넘길 맥락',
        '- 실제 자료 확인, 라이선스 확인, latency 측정처럼 시간을 써야만 해결되는 일만 Subjector task 후보로 넘깁니다.'
      ].join('\\n');
    }

    function visibleTasks() {
      if (state.taskFilter === 'all') {
        return state.tasks;
      }
      return state.tasks.filter(function(task) { return task.pageId === state.taskFilter; });
    }

    function renderTaskFilters() {
      const pagesWithTasks = state.pages.filter(function(page) {
        return state.tasks.some(function(task) { return task.pageId === page.id; });
      });
      document.getElementById('task-filter-nav').innerHTML =
        '<button class="dot ' + (state.taskFilter === 'all' ? 'active' : '') + '" data-task-filter="all" type="button">전체</button>' +
        pagesWithTasks.map(function(page) {
          return '<button class="dot ' + (state.taskFilter === page.id ? 'active' : '') + '" data-task-filter="' + page.id + '" type="button">' + page.number + '</button>';
        }).join('');
      document.querySelectorAll('[data-task-filter]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          setTaskFilter(event.target.dataset.taskFilter);
        });
      });
    }

    function renderNotTask() {
      const items = state.notTasks.length > 0 ? state.notTasks : [{ id: 'empty', content: '아직 제외 판단이 생성되지 않았습니다.', reason: '' }];
      document.getElementById('not-task').innerHTML = '<h3>task로 만들지 않은 것</h3>' +
        '<div>' + items.map(function(item) {
          const removeButton = item.id === 'empty' ? '' : '<button class="ghost" data-remove-not-task="' + item.id + '" type="button">제거</button>';
          return '<div class="head-row" data-not-task-id="' + escapeHtml(item.id) + '"><div><strong>' + escapeHtml(item.content) + '</strong>' +
            (item.reason ? '<div class="meta">' + escapeHtml(item.reason) + '</div>' : '') +
            '</div>' + removeButton + '</div>';
        }).join('') + '</div>';
      document.getElementById('task-generation-error').innerHTML = state.taskGenerationError
        ? '<div class="error-log">' + escapeHtml(state.taskGenerationError) + '</div>'
        : '';
    }

    function renderTaskUpdates() {
      const list = document.getElementById('task-update-list');
      if (!state.existingTaskUpdates.length) {
        list.innerHTML = '';
        return;
      }
      list.innerHTML = state.existingTaskUpdates.map(function(update) {
        return '<article class="update-card" data-task-update-id="' + update.id + '">' +
          '<div class="head-row"><div><span class="pill research">기존 task 보강</span><h3>' + escapeHtml(update.existingTaskTitle || update.taskId) + '</h3></div>' +
          '<button class="ghost" data-remove-task-update="' + update.id + '" type="button">제거</button></div>' +
          '<p class="small">' + escapeHtml(update.reason || '새 task가 아니라 기존 task를 더 선명하게 만드는 내용입니다.') + '</p>' +
          '<div class="split-update">' +
            '<div class="update-part"><strong>확인할 것에 추가</strong><p>' + escapeHtml(update.addNeededInfo || '추가할 확인 항목 없음') + '</p></div>' +
            '<div class="update-part"><strong>완료 기준 변경 제안</strong><p>' + escapeHtml(update.doneCriteriaChange || '완료 기준 변경 없음') + '</p></div>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="secondary" data-apply-task-update="' + update.id + '" data-include-done="false" type="button">확인할 것만 보강</button>' +
            '<button data-apply-task-update="' + update.id + '" data-include-done="true" type="button">완료 기준 변경 포함</button>' +
          '</div>' +
          (update.error ? '<div class="error-log">보강 실패: ' + escapeHtml(update.error) + '</div>' : '') +
        '</article>';
      }).join('');
    }

    function renderTasks() {
      const list = document.getElementById('task-list');
      const tasks = visibleTasks();
      if (!tasks.length) {
        list.innerHTML = '<div class="hint">완료된 topic page에서 시간이 필요한 항목만 task 후보로 생성됩니다.</div>';
        return;
      }
      list.innerHTML = tasks.map(function(task) {
        const kind = normalizeKind(task.kind);
        return '<article class="task-card" data-task-id="' + task.id + '">' +
          '<header><div><h3>' + escapeHtml(task.title) + '</h3><div class="meta">Page ' + task.pageNumber + ' · 실제 확인 필요</div></div><span class="pill ' + kind + '">task</span></header>' +
          '<label>Task 제목<input data-field="title" value="' + escapeHtml(task.title) + '"></label>' +
          '<label>필요 정보<textarea data-field="neededInfo">' + escapeHtml(task.neededInfo) + '</textarea></label>' +
          '<label>완료기준<textarea data-field="doneCriteria">' + escapeHtml(task.doneCriteria) + '</textarea></label>' +
          (task.reason ? '<div class="meta">겹치지 않는 이유: ' + escapeHtml(task.reason) + '</div>' : '') +
          '<div class="task-grid">' +
            '<label>담당자<select data-field="assignee"><option>미배정</option><option>조수현</option><option>김조은</option><option>배민성</option></select></label>' +
            '<label>중요도<select data-field="importance"><option>높음</option><option>보통</option><option>낮음</option></select></label>' +
          '</div>' +
          '<div class="actions"><button data-apply-task="' + task.id + '" type="button">Subjector in-process에 적용</button><button class="ghost" data-remove-task="' + task.id + '" type="button">제거</button></div>' +
          (task.error ? '<div class="error-log">반영 실패: ' + escapeHtml(task.error) + '</div>' : '') +
        '</article>';
      }).join('');

      list.querySelectorAll('.task-card').forEach(function(card) {
        const task = state.tasks.find(function(item) { return item.id === card.dataset.taskId; });
        if (!task) return;
        card.querySelector('[data-field="assignee"]').value = task.assignee;
        card.querySelector('[data-field="importance"]').value = task.importance;
        card.querySelectorAll('input, textarea, select').forEach(function(input) {
          input.addEventListener('input', function(event) {
            task[event.target.dataset.field] = event.target.value;
            task.error = '';
            saveState();
          });
        });
      });
    }

    function renderRecord() {
      document.getElementById('meeting-record').textContent = state.record || '회의록 생성 버튼을 누르면 판단 기록 초안이 여기에 표시됩니다.';
      document.getElementById('record-drawer').classList.toggle('open', state.recordDrawerOpen);
    }

    function render() {
      renderTopicPage();
      renderCards();
      renderTaskFilters();
      renderNotTask();
      renderTaskUpdates();
      renderTasks();
      renderRecord();
      saveState();
    }

    function compactText(text) {
      return String(text || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.getElementById('topic-text').addEventListener('input', function(event) {
      const page = activePage();
      page.text = event.target.value;
      page.title = titleFromText(page.text) || page.title;
      saveState();
      renderTopicPage();
    });

    document.getElementById('add-topic').addEventListener('click', addTopicPage);
    document.getElementById('remove-topic').addEventListener('click', removeActiveTopicPage);
    document.getElementById('complete-topic').addEventListener('click', function() {
      completeActivePage().catch(function(error) {
        state.taskGenerationError = error.message;
        render();
      });
    });

    document.getElementById('analyze-topic').addEventListener('click', async function(event) {
      const button = event.target;
      button.disabled = true;
      try {
        await requestCardsForActivePage();
      } catch (error) {
        activePage().cards = [{
          id: 'analysis-error-' + Date.now(),
          kind: 'filter',
          type: 'AI 연결 오류',
          title: 'AI Analysis를 실행하지 못했습니다',
          body: error.message,
          suggestion: '',
          error: error.message
        }];
      } finally {
        button.disabled = false;
        render();
      }
    });

    document.getElementById('card-list').addEventListener('click', function(event) {
      const choiceButton = event.target.closest('[data-choice-card]');
      if (choiceButton) {
        const page = activePage();
        const card = page.cards[Number(choiceButton.dataset.choiceCard)];
        const choice = card?.choices?.[Number(choiceButton.dataset.choiceIndex)];
        if (choice) {
          card.suggestion = choice.suggestion;
          card.body = '선택 결과: ' + choice.label + ' 방향으로 정리합니다.';
          renderCards();
        }
        return;
      }

      const applyButton = event.target.closest('[data-apply-card]');
      if (applyButton) {
        const page = activePage();
        const cardIndex = Number(applyButton.dataset.applyCard);
        const card = page.cards[cardIndex];
        try {
          const container = applyButton.closest('[data-card-index]');
          const content = container.querySelector('[data-suggestion]')?.value || card.suggestion || '';
          rewriteActivePage(content);
          page.cards.splice(cardIndex, 1);
        } catch (error) {
          card.error = error.message;
        }
        render();
        return;
      }

      const dismissButton = event.target.closest('[data-dismiss-card]');
      if (dismissButton) {
        activePage().cards.splice(Number(dismissButton.dataset.dismissCard), 1);
        render();
      }
    });

    document.getElementById('generate-record').addEventListener('click', function() {
      state.record = buildMeetingRecord();
      state.recordDrawerOpen = true;
      render();
    });

    document.getElementById('task-list').addEventListener('click', async function(event) {
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
        if (!response.ok) {
          throw new Error(result.error || 'Subjector 반영에 실패했습니다.');
        }
        state.tasks = state.tasks.filter(function(item) { return item.id !== task.id; });
      } catch (error) {
        task.error = error.message;
      }
      render();
    });

    document.getElementById('not-task').addEventListener('click', function(event) {
      const button = event.target.closest('[data-remove-not-task]');
      if (!button) return;
      state.notTasks = state.notTasks.filter(function(item) { return item.id !== button.dataset.removeNotTask; });
      render();
    });

    document.getElementById('task-update-list').addEventListener('click', async function(event) {
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
        if (!response.ok) {
          throw new Error(result.error || '기존 task 보강에 실패했습니다.');
        }
        state.existingTaskUpdates = state.existingTaskUpdates.filter(function(item) { return item.id !== update.id; });
      } catch (error) {
        update.error = error.message;
      }
      render();
    });

    document.getElementById('open-record').addEventListener('click', function() {
      state.recordDrawerOpen = true;
      render();
    });

    document.getElementById('close-record').addEventListener('click', function() {
      state.recordDrawerOpen = false;
      render();
    });

    document.getElementById('copy-record').addEventListener('click', async function() {
      const text = state.record || buildMeetingRecord();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    });

    render();
  </script>
</body>
</html>`;
}
