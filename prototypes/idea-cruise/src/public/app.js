const state = {
  entries: [],
  meetingRecord: null,
  tasks: [],
  handoffs: []
};

let activeTopicId = null;
let layoutCache = new Map();

const roadmapEl = document.querySelector('#roadmap');
const rootLinesEl = document.querySelector('#rootLines');
const topicNodesEl = document.querySelector('#topicNodes');
const cardPopoverEl = document.querySelector('#cardPopover');
const layerStateEl = document.querySelector('#layerState');
const tasksEl = document.querySelector('#tasks');
const recordEl = document.querySelector('#meetingRecord');
const topicDialog = document.querySelector('#topicDialog');
const parentTopicEl = document.querySelector('#parentTopic');

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
  if (activeTopicId && !state.entries.some((entry) => entry.id === activeTopicId)) {
    activeTopicId = null;
  }
  render();
}

function render() {
  renderRoadmap();
  renderCardPopover();
  renderTasks();
  renderRecord();
}

function renderRoadmap() {
  const layout = computeLayout(state.entries);
  layoutCache = layout.positions;
  roadmapEl.style.width = `${layout.width}px`;
  roadmapEl.style.height = `${layout.height}px`;

  rootLinesEl.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  rootLinesEl.setAttribute('width', layout.width);
  rootLinesEl.setAttribute('height', layout.height);
  rootLinesEl.innerHTML = renderRootLines(layout.positions);

  if (state.entries.length === 0) {
    topicNodesEl.innerHTML = `
      <article class="empty-roadmap">
        <strong>아직 topic이 없습니다.</strong>
        <p>먼저 “전술 헤드셋” 같은 큰 topic을 추가하세요. AI가 너무 넓다고 판단하면 topic 분리 제안을 띄웁니다.</p>
      </article>
    `;
    layerStateEl.textContent = '첫 topic을 추가하세요.';
    roadmapEl.classList.remove('card-layer-on');
    return;
  }

  roadmapEl.classList.toggle('card-layer-on', Boolean(activeTopicId));
  layerStateEl.textContent = activeTopicId
    ? `${topicTitle(activeTopicId)} topic의 2층 AI 카드가 켜져 있습니다.`
    : 'topic을 클릭하면 2층 AI 카드가 켜집니다.';

  topicNodesEl.innerHTML = state.entries.map((entry) => {
    const position = layout.positions.get(entry.id);
    const cardCount = entry.cards?.length ?? 0;
    const currentCard = entry.cards?.[0];
    const conflict = currentCard?.type === 'source-conflict';
    return `
      <button
        class="topic-node ${entry.fixed ? 'fixed' : ''} ${conflict ? 'conflict' : ''} ${entry.id === activeTopicId ? 'active' : ''}"
        style="left:${position.x}px;top:${position.y}px"
        data-topic="${entry.id}"
      >
        <small>${entry.parentId ? 'Topic' : 'Project Topic'}</small>
        <strong>${escapeHtml(entry.title ?? '새 topic')}</strong>
        <span>${escapeHtml(shorten(entry.text, 112))}</span>
        <span class="topic-meta">
          ${entry.fixed ? tag('고정', 'teal') : tag('초안')}
          ${cardCount ? tag(`대기 카드 ${Math.max(cardCount - 1, 0)}`) : tag('카드 없음')}
          ${conflict ? tag('충돌', 'rose') : ''}
        </span>
      </button>
    `;
  }).join('');
}

function renderRootLines(positions) {
  const lines = [];
  for (const entry of state.entries) {
    if (!entry.parentId || !positions.has(entry.parentId) || !positions.has(entry.id)) continue;
    const from = positions.get(entry.parentId);
    const to = positions.get(entry.id);
    const startX = from.x + 220;
    const startY = from.y + 72;
    const endX = to.x;
    const endY = to.y + 72;
    const midX = (startX + endX) / 2;
    lines.push(`<path class="root-line" d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" />`);
  }

  const active = activeEntry();
  const currentCard = active?.cards?.[0];
  for (const affectedId of currentCard?.affectedTopics ?? []) {
    if (!positions.has(active.id) || !positions.has(affectedId)) continue;
    const from = positions.get(active.id);
    const to = positions.get(affectedId);
    const startX = from.x + 110;
    const startY = from.y + 144;
    const endX = to.x + 110;
    const endY = to.y;
    const midY = (startY + endY) / 2;
    lines.push(`<path class="impact-line" d="M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}" />`);
  }

  return lines.join('');
}

function computeLayout(entries) {
  const childrenByParent = new Map();
  for (const entry of entries) {
    const parent = entry.parentId ?? 'root';
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent).push(entry);
  }

  const positioned = [];
  const roots = childrenByParent.get('root') ?? [];

  function place(entry, depth, rowHint) {
    const children = childrenByParent.get(entry.id) ?? [];
    const row = positioned.length + rowHint;
    positioned.push({ entry, depth, row });
    children.forEach((child, index) => place(child, depth + 1, index));
  }

  roots.forEach((entry, index) => place(entry, 0, index));

  const positions = new Map();
  for (const item of positioned) {
    positions.set(item.entry.id, {
      x: 56 + item.depth * 310,
      y: 82 + item.row * 172
    });
  }

  const maxDepth = Math.max(0, ...positioned.map((item) => item.depth));
  const maxRow = Math.max(0, ...positioned.map((item) => item.row));
  return {
    positions,
    width: Math.max(980, 56 + (maxDepth + 1) * 310 + 260),
    height: Math.max(560, 82 + (maxRow + 1) * 172 + 190)
  };
}

function renderCardPopover() {
  const entry = activeEntry();
  if (!entry) {
    cardPopoverEl.classList.remove('open');
    cardPopoverEl.innerHTML = '';
    return;
  }

  const position = layoutCache.get(entry.id) ?? { x: 60, y: 80 };
  const left = Math.min(position.x + 250, Number.parseInt(roadmapEl.style.width, 10) - 470);
  const top = Math.max(64, position.y - 18);
  const card = entry.cards?.[0] ?? null;
  const pendingCount = Math.max((entry.cards?.length ?? 0) - 1, 0);

  cardPopoverEl.style.left = `${Math.max(24, left)}px`;
  cardPopoverEl.style.top = `${top}px`;
  cardPopoverEl.classList.add('open');
  cardPopoverEl.innerHTML = `
    <div class="popover-head">
      <div>
        <h2>2층 AI Card: ${escapeHtml(entry.title)}</h2>
        <p>${entry.fixed ? '고정된 topic입니다. 수정하려면 먼저 고정 해제하세요.' : 'topic 내용을 수정하거나 AI 분석으로 카드 1개를 갱신할 수 있습니다.'}</p>
      </div>
      <button data-close-popover>닫기</button>
    </div>

    <div class="topic-editor">
      <label>Topic 제목
        <input data-topic-title value="${escapeHtml(entry.title ?? '')}" ${entry.fixed ? 'disabled' : ''} />
      </label>
      <label>Topic 내용
        <textarea data-topic-text ${entry.fixed ? 'disabled' : ''}>${escapeHtml(entry.text ?? '')}</textarea>
      </label>
      <div class="actions">
        <button class="primary" data-save-topic ${entry.fixed ? 'disabled' : ''}>저장</button>
        <button data-toggle-fixed>${entry.fixed ? '고정 해제' : '고정'}</button>
        <button data-analyze-topic>AI 분석</button>
      </div>
    </div>

    ${card ? renderPrimaryCard(card, entry, pendingCount) : `
      <article class="ai-card empty-card">
        <span class="tag">카드 없음</span>
        <h3>현재 표시할 AI 카드가 없습니다</h3>
        <p>필요할 때 AI 분석을 누르세요. 고정 topic과 충돌이 생기면 충돌 카드는 자동으로 우선 표시됩니다.</p>
      </article>
    `}
  `;
}

function renderPrimaryCard(card, entry, pendingCount) {
  const fixedBlocked = entry.fixed && card.action !== 'resolve-conflict';
  return `
    <article class="ai-card ${card.type}">
      <div class="card-head">
        <span class="tag strong">${escapeHtml(actionLabel(card.action))}</span>
        <span class="tag">${escapeHtml(card.model)}</span>
      </div>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
      ${card.explanation ? `<div class="hint">${escapeHtml(card.explanation)}</div>` : ''}
      ${card.impact ? `<div class="impact"><strong>로드맵 영향</strong><br>${escapeHtml(card.impact)}</div>` : ''}
      ${card.childTopics?.length ? `
        <div class="child-preview">
          ${card.childTopics.map((topic) => `
            <div>
              <strong>${escapeHtml(topic.title)}</strong>
              <p>${escapeHtml(topic.text)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${card.action !== 'split-topic' && card.action !== 'resolve-conflict' ? `
        <label>적용 후 topic 내용
          <textarea data-improved="${card.id}" ${fixedBlocked ? 'disabled' : ''}>${escapeHtml(card.improvedText)}</textarea>
        </label>
      ` : ''}
      <div class="actions">
        <button
          class="primary"
          data-apply-card="${card.id}"
          ${fixedBlocked ? 'disabled' : ''}
        >${fixedBlocked ? '고정 해제 후 적용' : escapeHtml(card.choiceLabel ?? '적용')}</button>
        <button data-dismiss-card="${card.id}">제거</button>
        <span class="pending-count">대기 카드 ${pendingCount}</span>
      </div>
    </article>
  `;
}

function renderTasks() {
  if (state.tasks.length === 0) {
    tasksEl.innerHTML = `
      <div class="quiet-box">
        아직 task 후보가 없습니다. 로드맵을 정리한 뒤 갱신하세요.
      </div>
    `;
    return;
  }

  tasksEl.innerHTML = state.tasks.map((task) => `
    <article class="task-card">
      <div class="task-head">
        <strong>${escapeHtml(task.title)}</strong>
        <span class="tag">${escapeHtml(task.importance ?? '중')}</span>
      </div>
      <p>${escapeHtml(task.purpose)}</p>
      <div class="task-reason">${escapeHtml(task.sourceReason ?? `${task.sourceTopicTitle ?? '이 topic'}에서 생긴 task입니다.`)}</div>
      <div class="criteria">
        ${criteriaField(task, 'successCriteria', '완료 기준')}
        ${criteriaField(task, 'mustDo', '필요 정보')}
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
        <button class="primary" data-apply-task="${task.id}">${task.applied ? '반영됨' : 'Subjector in-process'}</button>
        <button data-reflect-task="${task.id}">회의 기록으로만</button>
        <button class="danger" data-remove-task="${task.id}">제거</button>
      </div>
    </article>
  `).join('');
}

function criteriaField(task, key, label) {
  return `
    <label>${label}
      <textarea data-criteria="${key}" data-task="${task.id}">${escapeHtml(task.criteria?.[key] ?? '')}</textarea>
    </label>
  `;
}

function renderRecord() {
  recordEl.textContent = state.meetingRecord
    ? `${state.meetingRecord.title}\n\n${state.meetingRecord.body}`
    : '회의록 생성 전입니다.';
}

function openTopicDialog() {
  parentTopicEl.innerHTML = `
    <option value="">최상위 topic</option>
    ${state.entries.map((entry) => `
      <option value="${entry.id}" ${activeTopicId === entry.id ? 'selected' : ''}>${escapeHtml(entry.title)}</option>
    `).join('')}
  `;
  document.querySelector('#topicTitle').value = '';
  document.querySelector('#topicText').value = '';
  topicDialog.showModal();
}

function activeEntry() {
  return state.entries.find((entry) => entry.id === activeTopicId) ?? null;
}

function topicTitle(entryId) {
  return state.entries.find((entry) => entry.id === entryId)?.title ?? '선택 topic';
}

function actionLabel(action) {
  const labels = {
    'decide-now': '결정 필요',
    'make-task': 'task 후보',
    'split-topic': 'topic 분리 제안',
    'resolve-conflict': '충돌 경고',
    defer: '지금 제외',
    clarify: '기준 정리'
  };
  return labels[action] ?? action;
}

function tag(text, tone = '') {
  return `<span class="tag ${tone}">${escapeHtml(text)}</span>`;
}

function shorten(value, maxLength) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

document.querySelector('#addTopicButton').addEventListener('click', openTopicDialog);

document.querySelector('#closeTopicDialog').addEventListener('click', () => {
  topicDialog.close();
});

document.querySelector('#topicForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = document.querySelector('#topicTitle').value.trim();
  const text = document.querySelector('#topicText').value.trim();
  if (!text && !title) return;
  topicDialog.close();
  const nextState = await api('/api/entries', {
    method: 'POST',
    body: JSON.stringify({
      title,
      text: text || title,
      parentId: parentTopicEl.value || null,
      mode: 'live'
    })
  });
  mergeState(nextState);
});

roadmapEl.addEventListener('click', async (event) => {
  const closeButton = event.target.closest('[data-close-popover]');
  if (closeButton) {
    activeTopicId = null;
    render();
    return;
  }

  const topicButton = event.target.closest('[data-topic]');
  if (topicButton) {
    const topicId = topicButton.dataset.topic;
    activeTopicId = activeTopicId === topicId ? null : topicId;
    render();
    return;
  }

  const saveButton = event.target.closest('[data-save-topic]');
  if (saveButton) {
    const entry = activeEntry();
    mergeState(await api('/api/update-entry', {
      method: 'POST',
      body: JSON.stringify({
        entryId: entry.id,
        title: document.querySelector('[data-topic-title]').value,
        text: document.querySelector('[data-topic-text]').value
      })
    }));
    return;
  }

  const fixedButton = event.target.closest('[data-toggle-fixed]');
  if (fixedButton) {
    const entry = activeEntry();
    mergeState(await api('/api/toggle-fixed', {
      method: 'POST',
      body: JSON.stringify({ entryId: entry.id })
    }));
    return;
  }

  const analyzeButton = event.target.closest('[data-analyze-topic]');
  if (analyzeButton) {
    const entry = activeEntry();
    mergeState(await api('/api/analyze-entry', {
      method: 'POST',
      body: JSON.stringify({ entryId: entry.id })
    }));
    return;
  }

  const applyButton = event.target.closest('[data-apply-card]');
  if (applyButton) {
    const entry = activeEntry();
    const cardId = applyButton.dataset.applyCard;
    const improvedEl = document.querySelector(`[data-improved="${cardId}"]`);
    mergeState(await api('/api/apply-card', {
      method: 'POST',
      body: JSON.stringify({
        entryId: entry.id,
        cardId,
        improvedText: improvedEl?.value
      })
    }));
    return;
  }

  const dismissButton = event.target.closest('[data-dismiss-card]');
  if (dismissButton) {
    const entry = activeEntry();
    mergeState(await api('/api/dismiss-card', {
      method: 'POST',
      body: JSON.stringify({
        entryId: entry.id,
        cardId: dismissButton.dataset.dismissCard
      })
    }));
  }
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
