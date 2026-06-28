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

export function buildFinalsPreviewRecord({ workDate, tasks = [], results = [], changeRequests = [] }) {
  const completed = tasks
    .filter((task) => task.status === '완료')
    .map((task) => `${task.title}: ${task.importance} / ${task.coordination}`);

  const inProgress = tasks
    .filter((task) => ['미시작', '수락', '오늘은 여기까지', '미정리', '변경 요청 중', '회의 필요'].includes(task.status))
    .map((task) => `${task.title}: ${task.status} / 중요도 ${task.importance} / 협응도 ${task.coordination}`);

  const outputs = results.map((result) => `${result.taskTitle}: ${result.resultType} / ${compactRawText(result.rawText)}`);
  const changeHistory = changeRequests.map((request) => `${request.taskTitle}: ${request.status} / ${compactRawText(request.rawText)}`);

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
