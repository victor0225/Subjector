import { formatDisplayName } from './users.js';

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

function isResultForTask(result, task) {
  if (result.taskId && task.id) {
    return result.taskId === task.id;
  }

  return result.taskTitle === task.title;
}

function resultRows(results, resultType, fallbackTasks = []) {
  return fallbackTasks.map((task) => {
    const result = results
      .slice()
      .reverse()
      .find((candidate) => candidate.resultType === resultType && isResultForTask(candidate, task));

    if (result) {
      return `${task.title}: ${compactRawText(result.rawText)}`;
    }

    return `${task.title}: ${task.status}`;
  });
}

export function buildDailySummaryMessage({ user, workDate, tasks = [], results = [], changeRequests = [] }) {
  const displayName = formatDisplayName(user);
  const completedTasks = tasks.filter((task) => task.status === '완료');
  const stoppedTasks = tasks.filter((task) => task.status === '오늘은 여기까지');
  const unresolvedTasks = tasks.filter((task) => ['미정리', '수락', '보완 필요', '변경 요청 중', '회의 필요'].includes(task.status));

  const completedRows = resultRows(results, '완료', completedTasks);
  const stoppedRows = resultRows(results, '오늘은 여기까지', stoppedTasks);
  const unresolvedRows = unresolvedTasks.map((task) => `${task.title}: ${task.status} / 중요도 ${task.importance} / 협응도 ${task.coordination}`);
  const changeRows = changeRequests.map((request) => `${request.taskTitle}: ${request.status}`);

  return [
    `${displayName}, 오늘 한 일 요약입니다. (${workDate})`,
    '',
    section('완료한 task', completedRows),
    '',
    section('오늘은 여기까지', stoppedRows),
    '',
    section('미정리/남은 task', unresolvedRows),
    '',
    section('변경 요청', changeRows),
    '',
    section('다음 확인', [
      '미정리 task는 다음 보드 최신화 때 #in-process에서 다시 확인합니다.',
      '변경 요청이 있으면 영향받는 사람의 찬성/반대와 근거를 모읍니다.'
    ])
  ].join('\n');
}
