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

export function buildFinalsPreviewRecord({ workDate, tasks = [], results = [], changeRequests = [], users = [] }) {
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

  return {
    workDate,
    completed,
    inProgress,
    outputs,
    changeHistory
  };
}

export function buildFinalsPreviewMessage(preview) {
  return [
    `#finals 누적 업데이트 미리보기 (${preview.workDate})`,
    '아직 #finals에는 반영하지 않았습니다. 수현님 확인 후 승인 기능에서 실제 반영합니다.',
    '',
    section('확정/완료된 결과', [
      ...preview.completed,
      ...preview.outputs
    ]),
    '',
    section('진행 중/미완료', preview.inProgress),
    '',
    section('충돌/변경 이력', preview.changeHistory)
  ].join('\n');
}

export function buildFinalsChannelMessage(preview) {
  return [
    `#finals 누적 정리 (${preview.workDate})`,
    '',
    section('확정/완료된 결과', [
      ...preview.completed,
      ...preview.outputs
    ]),
    '',
    section('진행 중/미완료', preview.inProgress),
    '',
    section('충돌/변경 이력', preview.changeHistory)
  ].join('\n');
}
