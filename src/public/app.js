const state = {
  entries: [],
  meetingRecord: null,
  tasks: [],
  handoffs: []
};

const entriesEl = document.querySelector('#entries');
const cardRowsEl = document.querySelector('#cardRows');
const tasksEl = document.querySelector('#tasks');
const recordEl = document.querySelector('#meetingRecord');
const memoDialog = document.querySelector('#memoDialog');

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

function mergeState(nextState) {
  state.entries = nextState.entries ?? [];
  state.meetingRecord = nextState.meetingRecord ?? null;
  state.tasks = nextState.tasks ?? [];
  state.handoffs = nextState.handoffs ?? [];
  render();
}

function tag(text) {
  return `<span class="tag">${text}</span>`;
}

function renderEntries() {
  entriesEl.innerHTML = state.entries.map((entry) => `
    <article class="entry ${entry.kind === 'strengthened' ? 'strengthened' : ''}">
      <div class="entry-head">
        <strong>${entry.mode === 'memo' ? '보조 메모' : `Topic v${entry.version ?? 1}`}</strong>
        <div class="tag-row">${tag(entry.kind)}${entry.cards?.length ? tag(`${entry.cards.length} cards`) : ''}</div>
      </div>
      <p>${escapeHtml(entry.text)}</p>
      ${entry.decisionTrail?.length ? `
        <ol class="trail">
          ${entry.decisionTrail.map((item) => `<li>${escapeHtml(item.title)}</li>`).join('')}
        </ol>
      ` : ''}
    </article>
  `).join('');
}

function renderCards() {
  cardRowsEl.innerHTML = state.entries.map((entry) => {
    const cards = entry.cards ?? [];
    if (cards.length === 0) {
      return `
        <div class="roadmap-row empty">
          <div class="roadmap-node source-node">${escapeHtml(entry.text || '주제 없음')}</div>
          <div class="arrow">-></div>
          <div class="quiet-box">${entry.kind === 'strengthened' ? '이 주제는 현재 선택된 방향으로 정리됐습니다.' : 'AI 분석할 카드가 없습니다.'}</div>
        </div>
      `;
    }

    const [first, ...rest] = cards;
    return `
      <div class="roadmap-row">
        <div class="roadmap-node source-node">
          <span>현재 주제</span>
          <strong>${escapeHtml(entry.text)}</strong>
        </div>
        <div class="arrow">-></div>
        ${roadmapCard(first, entry, true)}
        <div class="arrow">-></div>
        <div class="branch-stack">
          ${rest.length ? rest.map((card) => roadmapCard(card, entry, false)).join('') : '<div class="quiet-box">추가 branch 없음</div>'}
        </div>
        <div class="arrow">-></div>
        <div class="roadmap-node outcome-node">
          <span>결과</span>
          <strong>${first.outcome === 'task-candidate' ? 'task 후보' : '주제 강화'}</strong>
          <small>${escapeHtml(first.choiceLabel ?? '선택 후 다음 분석')}</small>
        </div>
      </div>
    `;
  }).join('');
}

function roadmapCard(card, entry, isPrimary) {
  return `
    <article class="card roadmap-card ${card.type} ${isPrimary ? 'primary-card' : 'branch-card'}">
      <div class="card-head">
        <div>
          <span class="eyebrow">${escapeHtml(actionLabel(card.action))}</span>
          <strong>${escapeHtml(card.title)}</strong>
        </div>
        ${tag(card.model)}
      </div>
      <p>${escapeHtml(card.body)}</p>
      ${card.explanation ? `<div class="hint">${escapeHtml(card.explanation)}</div>` : ''}
      <div class="improve">
        <label>선택하면 왼쪽 topic이 이렇게 바뀝니다
          <textarea data-improved="${card.id}">${escapeHtml(card.improvedText)}</textarea>
        </label>
        <div class="actions">
          <button class="primary" data-apply-card="${card.id}" data-entry="${entry.id}">${escapeHtml(card.choiceLabel ?? '선택하고 주제 재작성')}</button>
        </div>
      </div>
    </article>
  `;
}

function actionLabel(action) {
  const labels = {
    'decide-now': '지금 결정',
    'make-task': 'task 후보',
    defer: '지금 제외',
    clarify: '기준 정리'
  };
  return labels[action] ?? action;
}

function renderRecord() {
  recordEl.textContent = state.meetingRecord
    ? `${state.meetingRecord.title}\n\n${state.meetingRecord.body}`
    : '회의록 생성 전입니다.';
}

function renderTasks() {
  if (state.tasks.length === 0) {
    tasksEl.innerHTML = '<div class="quiet-box">아직 task 후보가 없습니다. 주제를 강화한 뒤 task 후보를 갱신하세요.</div>';
    return;
  }

  tasksEl.innerHTML = state.tasks.map((task) => `
    <article class="task">
      <div class="task-head">
        <strong>${escapeHtml(task.title)}</strong>
        <div class="tag-row">
          ${tag(task.model)}
          ${task.applied ? tag('Subjector 반영됨') : ''}
          ${task.reflected ? tag('회의 기록으로만 반영') : ''}
        </div>
      </div>
      <p>${escapeHtml(task.purpose)}</p>
      <div class="criteria">
        ${criteriaField(task, 'successCriteria', '완료 기준')}
        ${criteriaField(task, 'mustDo', 'Must Do')}
        ${criteriaField(task, 'canSkip', 'Can Skip')}
        ${criteriaField(task, 'handoffNotes', 'Handoff')}
      </div>
      <div class="selectors">
        <label>담당자
          <select data-task-field="assignee" data-task="${task.id}">
            ${['미배정', '조수현', '김조은', '배민성'].map((name) => `<option ${task.assignee === name ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>
        <label>중요도
          <select data-task-field="importance" data-task="${task.id}">
            ${['상', '중', '하'].map((level) => `<option ${task.importance === level ? 'selected' : ''}>${level}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="actions">
        <button class="primary" data-apply-task="${task.id}">${task.applied ? '반영됨' : 'Subjector task로 반영'}</button>
        <button data-reflect-task="${task.id}">회의 기록으로만 반영</button>
        <button class="danger" data-remove-task="${task.id}">제거</button>
      </div>
    </article>
  `).join('');
}

function criteriaField(task, key, label) {
  return `
    <label>${label}
      <textarea data-criteria="${key}" data-task="${task.id}">${escapeHtml(task.criteria[key] ?? '')}</textarea>
    </label>
  `;
}

function render() {
  renderEntries();
  renderCards();
  renderRecord();
  renderTasks();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

document.querySelector('#entryForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = document.querySelector('#entryText').value.trim();
  if (!text) return;
  document.querySelector('#entryText').value = '';
  mergeState(await api('/api/entries', {
    method: 'POST',
    body: JSON.stringify({ text, mode: 'live' })
  }));
});

document.querySelector('#analysisButton').addEventListener('click', async () => {
  const text = document.querySelector('#entryText').value.trim() || '라즈베리 파이와 ESP32의 차이를 모르겠다.';
  document.querySelector('#entryText').value = '';
  mergeState(await api('/api/entries', {
    method: 'POST',
    body: JSON.stringify({ text, mode: 'live' })
  }));
});

document.querySelector('#memoMode').addEventListener('click', () => {
  memoDialog.showModal();
});

document.querySelector('#closeMemo').addEventListener('click', () => {
  memoDialog.close();
});

document.querySelector('#memoForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = document.querySelector('#memoText').value.trim();
  if (!text) return;
  document.querySelector('#memoText').value = '';
  memoDialog.close();
  mergeState(await api('/api/simple-memo', {
    method: 'POST',
    body: JSON.stringify({ text })
  }));
});

cardRowsEl.addEventListener('click', async (event) => {
  const applyButton = event.target.closest('[data-apply-card]');
  if (!applyButton) return;
  const cardId = applyButton.dataset.applyCard;
  const entryId = applyButton.dataset.entry;
  const improvedText = document.querySelector(`[data-improved="${cardId}"]`).value;
  mergeState(await api('/api/apply-card', {
    method: 'POST',
    body: JSON.stringify({ entryId, cardId, improvedText })
  }));
});

document.querySelector('#recordButton').addEventListener('click', async () => {
  mergeState(await api('/api/meeting-record', { method: 'POST', body: '{}' }));
});

document.querySelector('#taskButton').addEventListener('click', async () => {
  mergeState(await api('/api/task-candidates', { method: 'POST', body: '{}' }));
});

tasksEl.addEventListener('input', (event) => {
  const target = event.target;
  const task = state.tasks.find((candidate) => candidate.id === target.dataset.task);
  if (!task) return;
  if (target.dataset.criteria) {
    task.criteria[target.dataset.criteria] = target.value;
  }
  if (target.dataset.taskField) {
    task[target.dataset.taskField] = target.value;
  }
});

tasksEl.addEventListener('click', async (event) => {
  const applyButton = event.target.closest('[data-apply-task]');
  if (applyButton) {
    const task = state.tasks.find((candidate) => candidate.id === applyButton.dataset.applyTask);
    mergeState(await api('/api/apply-task', {
      method: 'POST',
      body: JSON.stringify({
        taskId: task.id,
        patch: {
          assignee: task.assignee,
          importance: task.importance,
          criteria: task.criteria
        }
      })
    }));
    return;
  }

  const reflectButton = event.target.closest('[data-reflect-task]');
  if (reflectButton) {
    mergeState(await api('/api/reflect-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: reflectButton.dataset.reflectTask })
    }));
    return;
  }

  const removeButton = event.target.closest('[data-remove-task]');
  if (removeButton) {
    mergeState(await api('/api/remove-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: removeButton.dataset.removeTask })
    }));
  }
});

mergeState(await api('/api/state'));
