import { formatDisplayName } from './users.js';
import { buildTaskActionValue } from './taskActions.js';

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

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true
  };
}

function taskContextSource(task) {
  return task?.context?.source ?? task?.sourceType ?? '기록 없음';
}

function statusBadge(status) {
  const markerByStatus = {
    미시작: '🟡',
    수락: '🟡',
    완료: '🟢',
    '오늘은 여기까지': '🟡',
    미정리: '🔴',
    '변경 요청 중': '🔴',
    '회의 필요': '🔴'
  };

  return `${markerByStatus[status] ?? '🟡'} \`${status}\``;
}

function formatTask(task, index) {
  return [
    `${index + 1}. *${task.title}*`,
    `   - 상태: ${statusBadge(task.status)}`,
    `   - 중요도: ${task.importance}`,
    `   - 조율: ${task.coordination}`,
    `   - 맥락: ${taskContextSource(task)}`
  ].join('\n');
}

function taskActionButton({ actionId, text, task, user, style }) {
  const button = {
    type: 'button',
    action_id: actionId,
    text: plainText(text),
    value: buildTaskActionValue({
      actionId,
      taskId: task.id,
      assigneeUserKey: user.key
    })
  };

  if (style) {
    button.style = style;
  }

  return button;
}

function taskActionsBlock({ task, user }) {
  const elements = [
    taskActionButton({ actionId: 'task_complete', text: '완료', task, user }),
    taskActionButton({ actionId: 'task_stop_today', text: '오늘은 여기까지', task, user }),
    taskActionButton({ actionId: 'task_change_request', text: '변경 요청', task, user, style: 'danger' })
  ];

  if (task.status === '미시작') {
    elements.unshift(
      taskActionButton({ actionId: 'task_accept_generate_prompt', text: '수락 및 Codex 프롬프트 생성', task, user, style: 'primary' })
    );
  }

  return {
    type: 'actions',
    block_id: `task_actions_${task.id}`,
    elements
  };
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

  const blocks = tasks.length === 0
    ? [section(text)]
    : [
        section(header),
        ...tasks.flatMap((task, index) => [
          section(formatTask(task, index)),
          taskActionsBlock({ task, user })
        ])
      ];

  return {
    text,
    blocks
  };
}
