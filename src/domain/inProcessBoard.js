import { formatDisplayName } from './users.js';

function mrkdwn(text) {
  return {
    type: 'mrkdwn',
    text
  };
}

function section(text) {
  return {
    type: 'section',
    text: mrkdwn(text)
  };
}

function taskContextSource(task) {
  return task?.context?.source ?? task?.sourceType ?? '기록 없음';
}

function formatTask(task, index) {
  return [
    `${index + 1}. *${task.title}*`,
    `   - 상태: ${task.status}`,
    `   - 중요도: ${task.importance}`,
    `   - 조율: ${task.coordination}`,
    `   - 맥락: ${taskContextSource(task)}`
  ].join('\n');
}

export function buildInProcessMessagePurpose(user) {
  return `in_process:${user.key}`;
}

export function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function buildInProcessBoardMessage({ user, tasks = [], workDate = formatKstDate() }) {
  const displayName = formatDisplayName(user);
  const header = [
    `*${displayName} task*`,
    `상태: 출근 확인됨`,
    `기준일: ${workDate}`
  ].join('\n');

  const body = tasks.length === 0
    ? [
        '현재 배정된 task가 없습니다.',
        '회의 결과나 변경 제안이 반영되면 여기에 표시됩니다.'
      ].join('\n')
    : tasks.map(formatTask).join('\n\n');

  const text = [header, body].join('\n\n');

  return {
    text,
    blocks: [section(text)]
  };
}
