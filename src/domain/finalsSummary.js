function compactRawText(rawText) {
  const lines = String(rawText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return '내용 없음';
  }

  return lines.slice(0, 3).join(' / ');
}

function section(title, rows) {
  return [
    `[${title}]`,
    rows.length ? rows.map((row) => `- ${row}`).join('\n') : '- 없음'
  ].join('\n');
}

function paragraphSection(title, text) {
  return [
    `[${title}]`,
    String(text ?? '').trim() || '아직 정리된 내용이 없습니다.'
  ].join('\n');
}

function assigneeLabel(task, users = []) {
  const user = users.find((candidate) => candidate.key === task?.assigneeUserKey);
  if (user?.displayName) {
    return `${user.displayName}님`;
  }

  return task?.assigneeUserKey ? `${task.assigneeUserKey}` : '담당자 미지정';
}

function taskByTitle(tasks = []) {
  return new Map(tasks.map((task) => [task.title, task]));
}

function normalizeNarrative(raw = {}) {
  return {
    projectOverview: String(raw.projectOverview ?? '').trim(),
    memberProgress: Array.isArray(raw.memberProgress)
      ? raw.memberProgress.map((row) => String(row).trim()).filter(Boolean)
      : [],
    nextFocus: Array.isArray(raw.nextFocus)
      ? raw.nextFocus.map((row) => String(row).trim()).filter(Boolean)
      : []
  };
}

function resultByTaskTitle(results = []) {
  const grouped = new Map();
  for (const result of results) {
    if (!grouped.has(result.taskTitle)) {
      grouped.set(result.taskTitle, []);
    }
    grouped.get(result.taskTitle).push(result);
  }

  return grouped;
}

function buildDefaultNarrative({ tasks = [], results = [], users = [] }) {
  const resultsByTitle = resultByTaskTitle(results);
  const completedCount = tasks.filter((task) => task.status === '완료').length;
  const openTasks = tasks.filter((task) => ['미시작', '수락', '오늘은 여기까지', '미정리', '변경 요청 중', '회의 필요'].includes(task.status));

  const memberProgress = tasks.map((task) => {
    const assignee = assigneeLabel(task, users);
    const taskResults = resultsByTitle.get(task.title) ?? [];
    const compactOutputs = taskResults
      .map((result) => `${result.resultType}: ${compactRawText(result.rawText)}`)
      .join(' / ');

    if (task.status === '완료') {
      return `${assignee}은 ${task.title}를 완료했습니다.${compactOutputs ? ` 결과: ${compactOutputs}` : ''}`;
    }

    return `${assignee}은 ${task.title}를 이어서 진행해야 합니다. 현재 상태: ${task.status}.`;
  });

  const nextFocus = openTasks.map((task) => `${assigneeLabel(task, users)} 담당 ${task.title}의 다음 진행 기준을 확인합니다.`);

  return {
    projectOverview: `프로젝트는 현재 완료된 항목 ${completedCount}개와 진행 중인 항목 ${openTasks.length}개를 기준으로 다음 작업을 정리해야 합니다.`,
    memberProgress,
    nextFocus
  };
}

export function buildFinalsPreviewRecord({ workDate, tasks = [], results = [], changeRequests = [], users = [], narrative = null }) {
  const tasksByTitle = taskByTitle(tasks);
  const completed = tasks
    .filter((task) => task.status === '완료')
    .map((task) => `${assigneeLabel(task, users)} 담당 ${task.title}는 완료 상태입니다.`);

  const inProgress = tasks
    .filter((task) => ['미시작', '수락', '오늘은 여기까지', '미정리', '변경 요청 중', '회의 필요'].includes(task.status))
    .map((task) => `${assigneeLabel(task, users)} 담당 ${task.title}는 ${task.status} 상태입니다.`);

  const outputs = results.map((result) => {
    const task = tasksByTitle.get(result.taskTitle);
    const owner = task ? `${assigneeLabel(task, users)} 담당 ` : '';
    return `${owner}${result.taskTitle}의 ${result.resultType} 결과는 ${compactRawText(result.rawText)}입니다.`;
  });
  const changeHistory = changeRequests.map((request) => `${request.taskTitle}에는 ${request.status} 상태의 변경 요청이 있습니다.`);
  const normalizedNarrative = narrative
    ? normalizeNarrative(narrative)
    : buildDefaultNarrative({ tasks, results, users });

  return {
    workDate,
    completed,
    inProgress,
    outputs,
    changeHistory,
    narrative: normalizedNarrative
  };
}

export function buildFinalsPreviewMessage(preview) {
  return [
    `#finals 누적 정리 업데이트 (${preview.workDate})`,
    '#finals에 바로 반영된 내용입니다.',
    '',
    paragraphSection('프로젝트 현재 상태', [
      preview.narrative?.projectOverview,
      ...(preview.narrative?.memberProgress ?? [])
    ].filter(Boolean).join('\n')),
    '',
    section('다음 회의/내일 볼 것', preview.narrative?.nextFocus ?? []),
    '',
    section('충돌/변경 이력', preview.changeHistory)
  ].join('\n');
}

export function buildFinalsChannelMessage(preview) {
  return [
    `#finals 누적 정리 (${preview.workDate})`,
    '',
    paragraphSection('프로젝트 현재 상태', [
      preview.narrative?.projectOverview,
      ...(preview.narrative?.memberProgress ?? [])
    ].filter(Boolean).join('\n')),
    '',
    section('다음 회의/내일 볼 것', preview.narrative?.nextFocus ?? []),
    '',
    section('충돌/변경 이력', preview.changeHistory)
  ].join('\n');
}
