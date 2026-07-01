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
      gap: 14px;
      padding: 14px;
    }

    section {
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
      gap: 12px;
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

    .entry, .intervention, .task-card, .record-preview, .memo-pane {
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
      gap: 8px;
      padding: 8px 10px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
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
      display: grid;
      gap: 10px;
      min-height: 410px;
      padding: 12px;
      white-space: pre-wrap;
      line-height: 1.52;
      font-size: 13px;
    }

    .task-area {
      grid-column: 1 / -1;
    }

    .task-list {
      grid-template-columns: repeat(3, minmax(240px, 1fr));
    }

    .task-card {
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    .task-card textarea { min-height: 76px; }

    .task-fields {
      display: grid;
      grid-template-columns: 1fr 120px;
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
      .intervention.collapsed { flex: 1 1 auto; }
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
        <h2>Brainstorming Input</h2>
        <p class="hint">Add Entry로 회의 흐름을 쌓고, AI Analysis로 바로 충돌/대안/질문 카드를 띄웁니다.</p>
      </div>
      <div class="section-body">
        <div class="actions">
          <button id="add-entry">Add Entry</button>
          <button class="secondary" id="analyze">AI Analysis</button>
        </div>
        <div class="memo-pane" id="memo-pane">
          <label>
            간단 회의 메모
            <textarea id="quick-memo" placeholder="회의 후 정리된 메모를 붙여넣으면 Meeting Record와 task 후보 생성에 사용합니다."></textarea>
          </label>
          <button class="secondary" id="use-memo">메모를 entry로 넣기</button>
        </div>
        <div class="entry-list" id="entry-list"></div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Live Intervention Cards</h2>
        <p class="hint">카드 모델: Gemini 2.5 Flash-Lite. 적용하면 왼쪽 원문이 직접 강화되고 카드는 사라집니다.</p>
      </div>
      <div class="section-body">
        <div class="card-rows" id="card-rows"></div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div class="inline-controls">
          <div>
            <h2>Meeting Record</h2>
            <p class="hint">#project-log에 올릴 회의 결과문 초안입니다. task 생성의 원천은 IDEA CRUISE 입력입니다.</p>
          </div>
          <button id="copy-record">결과록 복사</button>
        </div>
      </div>
      <div class="section-body">
        <div class="actions">
          <button id="generate-record">회의록 생성</button>
          <button class="secondary" id="clear-draft">초안 비우기</button>
        </div>
        <div class="record-preview" id="meeting-record"></div>
        <div class="meta">Task 생성 모델: gpt-5.4. 회의록은 감사 기록이고, 아래 task 후보가 Subjector in-process로 이어지는 적용 단위입니다.</div>
      </div>
    </section>

    <section class="task-area">
      <div class="section-head">
        <h2>Task Candidates From IDEA CRUISE</h2>
        <p class="hint">AI가 task별 보완 기준 초안을 함께 제안합니다. 담당자와 중요도를 정한 뒤 적용합니다.</p>
      </div>
      <div class="section-body">
        <div class="actions">
          <button id="generate-tasks">Task 후보 생성</button>
        </div>
        <div class="task-list" id="task-list"></div>
      </div>
    </section>
  </main>

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
      record: '',
      tasks: []
    };

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
      const unsure = /모르|차이|비교|애매|갈등|충돌|대안|급/.test(text);
      const cards = [
        {
          type: '판단 기준',
          tag: 'info',
          title: '선택 기준을 먼저 고정',
          body: '성능, 전력, 네트워크, 가격, 개발 속도 중 이번 회의의 우선순위를 정하면 논의가 빨라집니다.',
          suggestion: text + '\\n- 선택 기준: 가격, 구현 난이도, 실시간성, 팀원이 바로 검증 가능한 자료'
        },
        {
          type: '충돌 예상',
          tag: 'warn',
          title: '현재 진행 중인 task와 충돌 가능',
          body: '하드웨어 선택이 늦어지면 데이터 수집 방식과 시연 범위 task가 동시에 흔들릴 수 있습니다.',
          suggestion: text + '\\n- 충돌 방지: 오늘은 후보를 2개로 좁히고, 내일 실험 기준만 확정'
        },
        {
          type: '대안',
          tag: '',
          title: unsure ? '모르는 부분을 비교표 task로 전환' : '결정 전 검증 task로 전환',
          body: '지금 바로 결론을 내기보다 30분 조사 task로 쪼개면 회의가 막히지 않습니다.',
          suggestion: text + '\\n- 대안: 라즈베리 파이 vs ESP32 비교표를 만들어 다음 회의 첫 안건으로 확정'
        }
      ];
      return cards;
    }

    function renderEntries() {
      const list = document.getElementById('entry-list');
      list.innerHTML = state.entries.map(function(entry, index) {
        return '<article class="entry">' +
          '<textarea data-entry-id="' + entry.id + '">' + escapeHtml(entry.text) + '</textarea>' +
          '<div class="entry-foot"><span>Entry ' + (index + 1) + '</span><span>localStorage 자동 저장</span></div>' +
          '</article>';
      }).join('');

      list.querySelectorAll('textarea').forEach(function(textarea) {
        textarea.addEventListener('input', function(event) {
          const entry = state.entries.find(function(item) { return item.id === event.target.dataset.entryId; });
          if (entry) {
            entry.text = event.target.value;
            saveState();
          }
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
        return '<div class="card-row">' + cards.map(function(card, index) {
          const stateClass = index === 0 ? ' expanded' : ' collapsed';
          return '<article class="intervention' + stateClass + '" data-entry-id="' + entry.id + '" data-card-index="' + index + '">' +
            '<span class="tag ' + card.tag + '">' + escapeHtml(card.type) + '</span>' +
            '<h3>' + escapeHtml(card.title) + '</h3>' +
            '<p>' + escapeHtml(card.body) + '</p>' +
            '<textarea>' + escapeHtml(card.suggestion) + '</textarea>' +
            '<div class="actions"><button data-action="apply">적용</button><button class="secondary" data-action="remove">보류</button></div>' +
          '</article>';
        }).join('') + '</div>';
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

      rows.querySelectorAll('button[data-action]').forEach(function(button) {
        button.addEventListener('click', function(event) {
          event.stopPropagation();
          const cardEl = event.target.closest('.intervention');
          const entry = state.entries.find(function(item) { return item.id === cardEl.dataset.entryId; });
          const cards = state.cards[cardEl.dataset.entryId] || [];
          const index = Number(cardEl.dataset.cardIndex);
          if (event.target.dataset.action === 'apply' && entry && cards[index]) {
            entry.text = cardEl.querySelector('textarea').value;
          }
          cards.splice(index, 1);
          saveState();
          render();
        });
      });
    }

    function buildRecord() {
      const entries = state.entries.map(function(entry, index) {
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

    function buildTasks() {
      const source = state.entries.map(function(entry) { return entrySummary(entry); }).join(' ');
      return [
        {
          title: '하드웨어 후보 비교 기준 확정',
          criteria: '필요 정보: 가격, 전력, 네트워크 방식, 구현 난이도, 팀원이 실제로 테스트 가능한 환경. 완료 기준: 후보별 장단점과 추천안을 한 화면에서 비교 가능.',
          assignee: '수현',
          importance: '높음',
          source: source
        },
        {
          title: '회의 결과문을 #project-log 형식으로 정리',
          criteria: '필요 정보: 회의에서 결정된 것, 보류된 것, task로 전환된 것. 완료 기준: 다음 날 팀원이 이 글만 보고 회의를 이어갈 수 있음.',
          assignee: '조은',
          importance: '보통',
          source: source
        },
        {
          title: 'Subjector in-process 반영 흐름 확인',
          criteria: '필요 정보: 담당자, 중요도, task 보완 기준. 완료 기준: IDEA CRUISE task 후보가 승인 후 Subjector in-process에 표시되는 경로가 설명됨.',
          assignee: '민석',
          importance: '높음',
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
      list.innerHTML = state.tasks.map(function(task, index) {
        return '<article class="task-card" data-task-index="' + index + '">' +
          '<label>Task 제목<input data-field="title" value="' + escapeHtml(task.title) + '"></label>' +
          '<label>Task 보완 기준<textarea data-field="criteria">' + escapeHtml(task.criteria) + '</textarea></label>' +
          '<div class="task-fields">' +
            '<label>담당자<select data-field="assignee"><option>수현</option><option>조은</option><option>민석</option></select></label>' +
            '<label>중요도<select data-field="importance"><option>높음</option><option>보통</option><option>낮음</option></select></label>' +
          '</div>' +
          '<button class="secondary" data-action="apply-task">Subjector in-process에 적용</button>' +
        '</article>';
      }).join('');

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
    }

    function render() {
      renderEntries();
      renderCards();
      renderRecord();
      renderTasks();
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

    document.getElementById('analyze').addEventListener('click', function() {
      state.entries.forEach(function(entry) {
        state.cards[entry.id] = createCardsForEntry(entry);
      });
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

    document.getElementById('clear-draft').addEventListener('click', function() {
      localStorage.removeItem(storageKey);
      state.mode = 'live';
      state.entries = [{ id: 'entry-1', text: '' }];
      state.cards = {};
      state.record = '';
      state.tasks = [];
      render();
    });

    render();
  </script>
</body>
</html>`;
}
