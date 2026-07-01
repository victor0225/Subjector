export function renderIdeaCruisePage() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IDEA CRUISE Meeting Desk</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f8;
      --surface: #ffffff;
      --surface-alt: #eef3f1;
      --text: #17202a;
      --muted: #64707d;
      --line: #d8e0e6;
      --accent: #0f766e;
      --accent-strong: #115e59;
      --amber: #a35d00;
      --blue: #245f9f;
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
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 22px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }

    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 4px; font-size: 22px; line-height: 1.2; }
    h2 { margin-bottom: 4px; font-size: 15px; }
    h3 { margin-bottom: 6px; font-size: 14px; }

    .subtitle, .hint, .status, .meta {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .mode-tabs {
      display: inline-flex;
      gap: 6px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafb;
    }

    button, select, textarea, input {
      font: inherit;
    }

    button {
      border: 1px solid var(--accent);
      border-radius: 6px;
      padding: 9px 12px;
      color: #fff;
      background: var(--accent);
      font-size: 13px;
      cursor: pointer;
    }

    button.secondary {
      color: var(--accent);
      background: #fff;
    }

    button.ghost {
      border-color: transparent;
      color: var(--muted);
      background: transparent;
    }

    button.active {
      color: #fff;
      background: var(--accent-strong);
    }

    main {
      display: grid;
      grid-template-columns: minmax(300px, 0.92fr) minmax(360px, 1.18fr) minmax(330px, 1fr);
      align-items: start;
      gap: 14px;
      padding: 14px;
    }

    section {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .section-head {
      padding: 13px 15px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-alt);
    }

    .section-body {
      display: grid;
      flex: 1;
      gap: 12px;
      min-height: 0;
      padding: 14px 15px 16px;
    }

    textarea, input, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
      color: var(--text);
      background: #fff;
      font-size: 14px;
      line-height: 1.45;
    }

    textarea { min-height: 92px; resize: vertical; }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .actions, .inline-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .entry-list, .card-rows, .task-list {
      display: grid;
      gap: 10px;
    }

    .scroll-pane {
      height: 520px;
      max-height: 520px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .entry-list {
      align-content: start;
    }

    .entry, .intervention, .overflow-card, .task-card, .completed-item, .record-preview, .memo-pane {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }

    .entry textarea {
      min-height: 118px;
      border: 0;
      border-radius: 8px 8px 0 0;
    }

    .entry-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }

    .entry-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }

    .entry-actions button {
      padding: 6px 8px;
      font-size: 11px;
    }

    .card-rows {
      align-content: start;
    }

    .card-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
      min-width: 0;
    }

    .intervention {
      display: grid;
      gap: 8px;
      padding: 10px;
      min-height: 132px;
      min-width: 0;
      overflow: hidden;
      transition: flex-basis 160ms ease, flex-grow 160ms ease;
    }

    .intervention.expanded {
      flex: 1 1 58%;
    }

    .intervention.collapsed {
      flex: 0 1 96px;
      align-content: start;
      justify-items: center;
      text-align: center;
      cursor: pointer;
    }

    .intervention.collapsed h3 {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      line-height: 1.35;
    }

    .intervention.collapsed p,
    .intervention.collapsed textarea,
    .intervention.collapsed .actions {
      display: none;
    }

    .overflow-card {
      display: grid;
      flex: 0 0 72px;
      place-items: center;
      gap: 2px;
      padding: 10px 8px;
      color: var(--accent-strong);
      background: #f4fbf9;
      font-size: 18px;
      font-weight: 800;
      cursor: pointer;
    }

    .overflow-card span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
    }

    .overflow-drawer {
      display: none;
      grid-column: 1 / -1;
      margin-top: 8px;
      padding: 8px;
      border: 1px dashed var(--line);
      border-radius: 8px;
      background: #fbfcfd;
    }

    .overflow-drawer.open {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .overflow-choice {
      border-color: var(--line);
      color: var(--text);
      background: #fff;
    }

    .tag {
      display: inline-flex;
      width: fit-content;
      border-radius: 999px;
      padding: 3px 8px;
      background: #e6f3f1;
      color: var(--accent-strong);
      font-size: 11px;
      font-weight: 700;
    }

    .tag.warn { background: #fff0da; color: var(--amber); }
    .tag.info { background: #eaf2fb; color: var(--blue); }

    .record-preview {
      min-height: 320px;
      padding: 12px;
      white-space: pre-wrap;
      line-height: 1.52;
      font-size: 13px;
    }

    .completed-list {
      display: grid;
      align-content: start;
      gap: 10px;
    }

    .completed-item {
      padding: 12px;
      white-space: pre-wrap;
      line-height: 1.5;
      font-size: 13px;
    }

    .record-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 20;
      width: min(520px, 100vw);
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      background: var(--surface);
      border-left: 1px solid var(--line);
      box-shadow: -18px 0 32px rgba(23, 32, 42, 0.18);
      transform: translateX(105%);
      transition: transform 180ms ease;
    }

    .record-drawer.open {
      transform: translateX(0);
    }

    .drawer-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-alt);
    }

    .drawer-body {
      display: grid;
      gap: 12px;
      min-height: 0;
      padding: 16px;
      overflow-y: auto;
    }

    .task-area {
      grid-column: 1 / -1;
    }

    .task-list {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
    }

    .task-card {
      display: grid;
      flex: 1 1 260px;
      gap: 10px;
      min-width: 0;
      padding: 12px;
    }

    .task-overflow-card {
      display: grid;
      flex: 0 0 92px;
      place-items: center;
      gap: 2px;
      min-height: 180px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f4fbf9;
      color: var(--accent-strong);
      font-size: 20px;
      font-weight: 800;
      cursor: pointer;
    }

    .task-overflow-card span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
    }

    .task-overflow-drawer {
      display: none;
      flex: 1 0 100%;
      gap: 8px;
      padding: 8px;
      border: 1px dashed var(--line);
      border-radius: 8px;
      background: #fbfcfd;
    }

    .task-overflow-drawer.open {
      display: flex;
      flex-wrap: wrap;
    }

    .task-card textarea { min-height: 76px; }

    .task-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .memo-pane {
      display: none;
      padding: 12px;
      background: #fbfcfd;
    }

    .memo-pane.open {
      display: grid;
      gap: 10px;
    }

    @media (max-width: 1120px) {
      main, .task-list { grid-template-columns: 1fr; }
      .task-area { grid-column: auto; }
      .card-row { flex-direction: column; }
      .intervention.expanded,
      .intervention.collapsed,
      .overflow-card { flex: 1 1 auto; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IDEA CRUISE Meeting Desk</h1>
      <div class="subtitle">회의 중 생각을 강화하고, 회의 후 task 후보를 Subjector로 넘기는 앞단 도구</div>
    </div>
    <div class="mode-tabs" aria-label="mode selector">
      <button class="active" id="live-mode">라이브 회의</button>
      <button class="secondary" id="memo-mode">간단 메모 붙여넣기</button>
    </div>
  </header>

  <main>
    <section>
      <div class="section-head">
        <div class="section-title-row">
          <h2>Brainstorming Input</h2>
          <button id="add-entry">Add Entry</button>
        </div>
        <p class="hint">Add Entry로 회의 흐름을 쌓고, AI Analysis로 바로 충돌/대안/질문 카드를 띄웁니다.</p>
      </div>
      <div class="section-body">
        <div class="memo-pane" id="memo-pane">
          <label>
            간단 회의 메모
            <textarea id="quick-memo" placeholder="회의 후 정리된 메모를 붙여넣으면 Meeting Record와 task 후보 생성에 사용합니다."></textarea>
          </label>
          <button class="secondary" id="use-memo">메모를 entry로 넣기</button>
        </div>
        <div class="entry-list scroll-pane" id="entry-list"></div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Live Intervention Cards</h2>
        <p class="hint">카드 모델: gpt-5.4. GitHub organization과 지난 task 흐름까지 보며 충돌/대안을 더 날카롭게 잡습니다.</p>
      </div>
      <div class="section-body">
        <div class="card-rows scroll-pane" id="card-rows"></div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Completed Brainstorming Inputs</h2>
        <p class="hint">live card를 적용해 강화가 끝난 input이 차례대로 쌓입니다. 회의록과 task 생성의 실제 재료입니다.</p>
      </div>
      <div class="section-body">
        <div class="completed-list scroll-pane" id="completed-list"></div>
      </div>
    </section>

    <section class="task-area">
      <div class="section-head">
        <h2>Task Candidates From IDEA CRUISE</h2>
        <p class="hint">회의록/task 생성 모델: Gemini 2.5 Flash-Lite. 제목, 필요 정보, 완료기준, 중요도는 초안이고 담당자는 직접 배정합니다.</p>
      </div>
      <div class="section-body">
        <div class="actions">
          <button id="generate-record">회의록 생성</button>
          <button id="generate-tasks">Task 후보 생성</button>
          <button class="secondary" id="clear-draft">초안 비우기</button>
        </div>
        <div class="task-list" id="task-list"></div>
      </div>
    </section>
  </main>

  <aside class="record-drawer" id="record-drawer" aria-label="meeting record drawer">
    <div class="drawer-head">
      <div>
        <h2>Meeting Record</h2>
        <p class="hint">#project-log에 올릴 회의 결과문 초안입니다.</p>
      </div>
      <div class="actions">
        <button id="copy-record">결과록 복사</button>
        <button class="secondary" id="close-record">닫기</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="record-preview" id="meeting-record"></div>
      <div class="meta">회의록/task 생성 모델: Gemini 2.5 Flash-Lite. 회의록은 감사 기록이고, 아래 task 후보가 Subjector in-process로 이어지는 적용 단위입니다.</div>
    </div>
  </aside>

  <script>
    const storageKey = 'ideaCruiseMeetingDeskDraft';
    const state = loadState() || {
      mode: 'live',
      entries: [
        {
          id: 'entry-1',
          text: '라즈베리 파이와 ESP32 중 어떤 기준으로 선택해야 할지 모르겠다. 비용과 구현 난이도도 비교해야 한다.'
        }
      ],
      cards: {},
      completedEntries: [],
      record: '',
      recordDrawerOpen: false,
      tasks: []
    };
    state.completedEntries = Array.isArray(state.completedEntries) ? state.completedEntries : [];
    state.recordDrawerOpen = Boolean(state.recordDrawerOpen);
    state.tasks = Array.isArray(state.tasks) ? state.tasks.map(function(task) {
      return {
        title: task.title || '',
        neededInfo: task.neededInfo || task.criteria || '',
        doneCriteria: task.doneCriteria || '',
        assignee: task.assignee || '미배정',
        importance: task.importance || '보통',
        source: task.source || ''
      };
    }) : [];

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

    function entrySummary(entry) {
      return entry.text.trim() || '아직 내용 없음';
    }

    function createCardsForEntry(entry) {
      const text = entrySummary(entry);
      const subject = text.length > 42 ? text.slice(0, 42) + '...' : text;
      const unsure = /모르|차이|비교|애매|갈등|충돌|대안|급/.test(text);
      const cards = [
        {
          type: '판단 기준',
          tag: 'info',
          title: '선택 기준을 먼저 고정',
          body: subject + '에 대해 판단 기준을 먼저 정리합니다.',
          suggestion: text + '\\n- 선택 기준: 비용, 시간, 만족도, 실행 가능성, 팀원이 바로 판단할 수 있는 근거'
        },
        {
          type: '충돌 예상',
          tag: 'warn',
          title: '현재 진행 중인 task와 충돌 가능',
          body: subject + '이 이미 진행 중인 task의 일정, 담당, 기준과 충돌하는지 먼저 확인합니다.',
          suggestion: text + '\\n- 충돌 방지: 이미 진행 중인 task와 겹치는 결정/담당/일정을 먼저 확인'
        },
        {
          type: '대안',
          tag: '',
          title: unsure ? '모르는 부분을 비교 task로 전환' : '결정 전 검증 task로 전환',
          body: '지금 바로 결론을 내기보다 작게 검증할 수 있는 task로 쪼개면 회의가 막히지 않습니다.',
          suggestion: text + '\\n- 대안: 결정을 미루지 말고 30분 안에 확인 가능한 비교/검증 task로 전환'
        },
        {
          type: '범위',
          tag: 'info',
          title: '오늘 결정할 범위를 제한',
          body: subject + '에서 오늘 정할 것과 나중에 넘길 것을 분리하면 흐름이 안정됩니다.',
          suggestion: text + '\\n- 범위 제한: 오늘 정할 기준 1개와 다음에 검증할 기준 1개로 분리'
        }
      ];
      return cards;
    }

    function renderEntries() {
      const list = document.getElementById('entry-list');
      list.innerHTML = state.entries.map(function(entry, index) {
        return '<article class="entry">' +
          '<textarea data-entry-id="' + entry.id + '">' + escapeHtml(entry.text) + '</textarea>' +
          '<div class="entry-foot">' +
            '<span>Entry ' + (index + 1) + '</span>' +
            '<div class="entry-actions">' +
              '<button class="secondary" data-analyze-entry-id="' + entry.id + '" type="button">AI Analysis</button>' +
              '<button class="secondary" data-delete-entry-id="' + entry.id + '" type="button">삭제</button>' +
            '</div>' +
          '</div>' +
          '</article>';
      }).join('');

      list.querySelectorAll('textarea').forEach(function(textarea) {
        textarea.addEventListener('input', function(event) {
          const entry = state.entries.find(function(item) { return item.id === event.target.dataset.entryId; });
          if (entry) {
            entry.text = event.target.value;
            if (state.cards[entry.id]) {
              delete state.cards[entry.id];
              renderCards();
            }
            saveState();
          }
        });
      });

      document.querySelectorAll('[data-analyze-entry-id]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          const entry = state.entries.find(function(item) { return item.id === event.target.dataset.analyzeEntryId; });
          if (entry) {
            state.cards[entry.id] = createCardsForEntry(entry);
            render();
          }
        });
      });

      document.querySelectorAll('[data-delete-entry-id]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          const entryId = event.target.dataset.deleteEntryId;
          state.entries = state.entries.filter(function(item) { return item.id !== entryId; });
          delete state.cards[entryId];
          if (state.entries.length === 0) {
            state.entries.push({ id: 'entry-' + Date.now(), text: '' });
          }
          render();
        });
      });
    }

    function renderCards() {
      const rows = document.getElementById('card-rows');
      const html = state.entries.map(function(entry) {
        const cards = state.cards[entry.id] || [];
        if (cards.length === 0) {
          return '<div class="hint">Entry에 대해 AI Analysis를 누르면 이 위치에 카드가 생깁니다.</div>';
        }
        const visibleCards = cards.slice(0, 3);
        const hiddenCards = cards.slice(3);
        const visibleHtml = visibleCards.map(function(card, index) {
          const stateClass = index === 0 ? ' expanded' : ' collapsed';
          return '<article class="intervention' + stateClass + '" data-entry-id="' + entry.id + '" data-card-index="' + index + '">' +
            '<span class="tag ' + card.tag + '">' + escapeHtml(card.type) + '</span>' +
            '<h3>' + escapeHtml(card.title) + '</h3>' +
            '<p>' + escapeHtml(card.body) + '</p>' +
            '<textarea>' + escapeHtml(card.suggestion) + '</textarea>' +
            '<div class="actions"><button data-action="apply">적용</button><button class="secondary" data-action="remove">보류</button></div>' +
          '</article>';
        }).join('');
        const overflowHtml = hiddenCards.length
          ? '<button class="overflow-card" data-overflow-entry-id="' + entry.id + '" type="button">+' + hiddenCards.length + '<span>more</span></button>'
          : '';
        const drawerHtml = hiddenCards.length
          ? '<div class="overflow-drawer" data-overflow-drawer="' + entry.id + '">' + hiddenCards.map(function(card, offset) {
              const cardIndex = offset + 3;
              return '<button class="overflow-choice" data-overflow-card-index="' + cardIndex + '" data-entry-id="' + entry.id + '" type="button">' +
                escapeHtml(card.type) + ' · ' + escapeHtml(card.title) +
              '</button>';
            }).join('') + '</div>'
          : '';
        return '<div class="card-row">' + visibleHtml + overflowHtml + '</div>' + drawerHtml;
      }).join('');
      rows.innerHTML = html;

      rows.addEventListener('click', function(event) {
        if (event.target.closest('button')) return;
        const card = event.target.closest('.intervention');
        if (!card || !rows.contains(card)) return;
        const row = card.parentElement;
        row.querySelectorAll('.intervention').forEach(function(item) {
          item.classList.remove('expanded');
          item.classList.add('collapsed');
        });
        card.classList.remove('collapsed');
        card.classList.add('expanded');
      });

      rows.querySelectorAll('[data-overflow-entry-id]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          event.stopPropagation();
          const drawer = rows.querySelector('[data-overflow-drawer="' + button.dataset.overflowEntryId + '"]');
          if (drawer) drawer.classList.toggle('open');
        });
      });

      rows.querySelectorAll('[data-overflow-card-index]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          event.stopPropagation();
          const entryId = button.dataset.entryId;
          const cards = state.cards[entryId] || [];
          const selectedIndex = Number(button.dataset.overflowCardIndex);
          if (Number.isNaN(selectedIndex) || !cards[selectedIndex]) return;
          const selected = cards.splice(selectedIndex, 1)[0];
          cards.splice(1, 0, selected);
          saveState();
          render();
        });
      });

      rows.querySelectorAll('button[data-action]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          event.stopPropagation();
          const cardEl = event.target.closest('.intervention');
          const entry = state.entries.find(function(item) { return item.id === cardEl.dataset.entryId; });
          const cards = state.cards[cardEl.dataset.entryId] || [];
          const index = Number(cardEl.dataset.cardIndex);
          if (event.target.dataset.action === 'apply' && entry && cards[index]) {
            entry.text = cardEl.querySelector('textarea').value;
            state.completedEntries.push({
              id: 'completed-' + Date.now(),
              text: entry.text
            });
          }
          cards.splice(index, 1);
          saveState();
          render();
        });
      });
    }

    function buildRecord() {
      const sourceEntries = state.completedEntries.length > 0 ? state.completedEntries : state.entries;
      const entries = sourceEntries.map(function(entry, index) {
        return (index + 1) + '. ' + entrySummary(entry);
      }).join('\\n');
      return [
        '# 회의 결과문',
        '',
        '## 오늘 정리된 생각',
        entries || '- 아직 entry 없음',
        '',
        '## 결정/보류',
        '- 결정: IDEA CRUISE에서 task 후보를 만들고 Subjector는 실행 상태를 운영한다.',
        '- 보류: 실시간 협업은 서버 저장/룸 동기화 설계 후 추가한다.',
        '',
        '## #project-log 기록',
        '- 회의 결과문 1개와 하루 요약 + 현재 프로젝트 상태 1개를 같은 채널에 올린다.'
      ].join('\\n');
    }

    function renderRecord() {
      document.getElementById('meeting-record').textContent = state.record || '회의록 생성 버튼을 누르면 Meeting Record 초안이 여기에 표시됩니다.';
    }

    function renderCompletedEntries() {
      const list = document.getElementById('completed-list');
      if (state.completedEntries.length === 0) {
        list.innerHTML = '<div class="hint">live card를 적용한 brainstorming input이 여기에 쌓입니다.</div>';
        return;
      }
      list.innerHTML = state.completedEntries.map(function(entry, index) {
        return '<article class="completed-item"><strong>Completed ' + (index + 1) + '</strong>\\n' + escapeHtml(entry.text) + '</article>';
      }).join('');
    }

    function buildTasks() {
      const sourceEntries = state.completedEntries.length > 0 ? state.completedEntries : state.entries;
      const source = sourceEntries.map(function(entry) { return entrySummary(entry); }).join(' ');
      return [
        {
          title: '하드웨어 후보 비교 기준 확정',
          neededInfo: '가격, 전력, 네트워크 방식, 구현 난이도, 팀원이 실제로 테스트 가능한 환경',
          doneCriteria: '후보별 장단점과 추천안을 한 화면에서 비교 가능',
          assignee: '미배정',
          importance: '높음',
          source: source
        },
        {
          title: '회의 결과문을 #project-log 형식으로 정리',
          neededInfo: '회의에서 결정된 것, 보류된 것, task로 전환된 것',
          doneCriteria: '다음 날 팀원이 이 글만 보고 회의를 이어갈 수 있음',
          assignee: '미배정',
          importance: '보통',
          source: source
        },
        {
          title: 'Subjector in-process 반영 흐름 확인',
          neededInfo: '담당자, 중요도, 필요 정보, 완료기준',
          doneCriteria: 'IDEA CRUISE task 후보가 승인 후 Subjector in-process에 표시되는 경로가 설명됨',
          assignee: '미배정',
          importance: '높음',
          source: source
        },
        {
          title: '라이브 개입 카드 기준 조정',
          neededInfo: '회의 중 자주 막히는 표현, 자동 개입이 과한 순간, 수동 분석이 필요한 순간',
          doneCriteria: '팀원이 부담 없이 쓸 수 있는 호출 간격과 카드 기준이 정리됨',
          assignee: '미배정',
          importance: '보통',
          source: source
        }
      ];
    }

    function renderTasks() {
      const list = document.getElementById('task-list');
      if (state.tasks.length === 0) {
        list.innerHTML = '<div class="hint">Task 후보 생성 버튼을 누르면 task 카드가 생성됩니다.</div>';
        return;
      }
      const visibleTasks = state.tasks.slice(0, 3);
      const hiddenTasks = state.tasks.slice(3);
      const visibleHtml = visibleTasks.map(function(task, index) {
        return '<article class="task-card" data-task-index="' + index + '">' +
          '<label>Task 제목<input data-field="title" value="' + escapeHtml(task.title) + '"></label>' +
          '<label>필요 정보<textarea data-field="neededInfo">' + escapeHtml(task.neededInfo) + '</textarea></label>' +
          '<label>완료기준<textarea data-field="doneCriteria">' + escapeHtml(task.doneCriteria) + '</textarea></label>' +
          '<div class="task-fields">' +
            '<label>담당자<select data-field="assignee"><option>미배정</option><option>조수현</option><option>김조은</option><option>배민성</option></select></label>' +
            '<label>중요도<select data-field="importance"><option>높음</option><option>보통</option><option>낮음</option></select></label>' +
          '</div>' +
          '<button class="secondary" data-action="apply-task">Subjector in-process에 적용</button>' +
        '</article>';
      }).join('');
      const overflowHtml = hiddenTasks.length
        ? '<button class="task-overflow-card" data-task-overflow type="button">+' + hiddenTasks.length + '<span>more</span></button>'
        : '';
      const drawerHtml = hiddenTasks.length
        ? '<div class="task-overflow-drawer" data-task-overflow-drawer>' + hiddenTasks.map(function(task, index) {
            const taskIndex = index + 3;
            return '<button class="overflow-choice" data-task-overflow-index="' + taskIndex + '" type="button">' +
              escapeHtml(task.title) +
            '</button>';
          }).join('') + '</div>'
        : '';
      list.innerHTML = visibleHtml + overflowHtml + drawerHtml;

      list.querySelectorAll('.task-card').forEach(function(card) {
        const task = state.tasks[Number(card.dataset.taskIndex)];
        card.querySelector('[data-field="assignee"]').value = task.assignee;
        card.querySelector('[data-field="importance"]').value = task.importance;
        card.querySelectorAll('input, textarea, select').forEach(function(input) {
          input.addEventListener('input', function(event) {
            task[event.target.dataset.field] = event.target.value;
            saveState();
          });
        });
      });

      const overflowButton = list.querySelector('[data-task-overflow]');
      if (overflowButton) {
        overflowButton.addEventListener('click', function() {
          const drawer = list.querySelector('[data-task-overflow-drawer]');
          if (drawer) drawer.classList.toggle('open');
        });
      }

      list.querySelectorAll('[data-task-overflow-index]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          const selectedIndex = Number(event.target.dataset.taskOverflowIndex);
          if (Number.isNaN(selectedIndex) || !state.tasks[selectedIndex]) return;
          const selected = state.tasks.splice(selectedIndex, 1)[0];
          state.tasks.splice(1, 0, selected);
          saveState();
          render();
        });
      });
    }

    function render() {
      renderEntries();
      renderCards();
      renderRecord();
      renderCompletedEntries();
      renderTasks();
      document.getElementById('record-drawer').classList.toggle('open', state.recordDrawerOpen);
      document.getElementById('memo-pane').classList.toggle('open', state.mode === 'memo');
      document.getElementById('live-mode').classList.toggle('active', state.mode === 'live');
      document.getElementById('memo-mode').classList.toggle('active', state.mode === 'memo');
      saveState();
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.getElementById('add-entry').addEventListener('click', function() {
      state.entries.push({ id: 'entry-' + Date.now(), text: '' });
      render();
    });

    document.getElementById('live-mode').addEventListener('click', function() {
      state.mode = 'live';
      render();
    });

    document.getElementById('memo-mode').addEventListener('click', function() {
      state.mode = 'memo';
      render();
    });

    document.getElementById('use-memo').addEventListener('click', function() {
      const text = document.getElementById('quick-memo').value.trim();
      if (text) {
        state.entries.push({ id: 'entry-' + Date.now(), text: text });
        state.mode = 'live';
        render();
      }
    });

    document.getElementById('generate-record').addEventListener('click', function() {
      state.record = buildRecord();
      state.recordDrawerOpen = true;
      render();
    });

    document.getElementById('generate-tasks').addEventListener('click', function() {
      state.tasks = buildTasks();
      render();
    });

    document.getElementById('copy-record').addEventListener('click', async function() {
      const text = state.record || buildRecord();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    });

    document.getElementById('close-record').addEventListener('click', function() {
      state.recordDrawerOpen = false;
      render();
    });

    document.getElementById('clear-draft').addEventListener('click', function() {
      localStorage.removeItem(storageKey);
      state.mode = 'live';
      state.entries = [{ id: 'entry-1', text: '' }];
      state.cards = {};
      state.completedEntries = [];
      state.record = '';
      state.recordDrawerOpen = false;
      state.tasks = [];
      render();
    });

    render();
  </script>
</body>
</html>`;
}
