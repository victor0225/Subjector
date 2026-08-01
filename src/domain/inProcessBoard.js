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

function importanceRank(importance = '') {
  if (importance.includes('상') || importance.includes('🔴')) {
    return 0;
  }

  if (importance.includes('중') || importance.includes('🟡')) {
    return 1;
  }

  if (importance.includes('하') || importance.includes('🟢')) {
    return 2;
  }

  return 3;
}

function sortTasksForDisplay(tasks = []) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      const rankDiff = importanceRank(left.task.importance) - importanceRank(right.task.importance);
      return rankDiff || left.index - right.index;
    })
    .map(({ task }) => task);
}

function statusBadge(status) {
  const markerByStatus = {
    미시작: '🟡',
    수락: '🟡',
    완료: '🟢',
    '오늘은 여기까지': '🟡',
    '추가 진행 예정': '🟡',
    '보완 필요': '🔴',
    미정리: '🔴',
    '변경 요청 중': '🔴',
    '회의 필요': '🔴'
  };

  return `${markerByStatus[status] ?? '🟡'} \`${status}\``;
}

function detailRows(value) {
  const rows = Array.isArray(value) ? value : [value];
  const normalized = rows
    .map((row) => String(row ?? '').trim())
    .filter(Boolean);

  return normalized.length ? normalized.map((row) => `- ${row}`).join('\n') : '- 기록 없음';
}

function detailFromContext(context, keys) {
  for (const key of keys) {
    if (context?.[key]) {
      return context[key];
    }
  }

  return null;
}

function compactDetail(value) {
  const rows = Array.isArray(value) ? value : [value];
  const normalized = rows
    .map((row) => String(row ?? '').trim())
    .filter(Boolean);

  return normalized.length ? normalized.join(', ') : '기록 없음';
}

export function buildTaskDetailThreadMessage({ user, task }) {
  const context = task?.context ?? {};
  const why = detailFromContext(context, ['why', 'reason', 'goal', 'meetingContext']);
  const neededInfo = detailFromContext(context, ['neededInfo', 'requiredInfo', 'needs', 'checkpoints']);
  const completionCriteria = detailFromContext(context, ['completionCriteria', 'acceptanceCriteria', 'doneCriteria']);

  const text = [
    `*[task 실행 정보] ${task.title}*`,
    '',
    `[왜 하는가]`,
    detailRows(why),
    '',
    `[확인할 것]`,
    detailRows(neededInfo),
    '',
    `[완료 기준]`,
    detailRows(completionCriteria)
  ].join('\n');

  return {
    text,
    blocks: [section(text)]
  };
}

function formatTask(task, index) {
  const context = task?.context ?? {};
  const why = detailFromContext(context, ['why', 'reason', 'goal', 'meetingContext']);
  const neededInfo = detailFromContext(context, ['neededInfo', 'requiredInfo', 'needs', 'checkpoints']);
  const completionCriteria = detailFromContext(context, ['completionCriteria', 'acceptanceCriteria', 'doneCriteria']);

  return [
    `${index + 1}. *${task.title}*`,
    `   - 상태: ${statusBadge(task.status)}`,
    `   - 중요도: ${task.importance}`,
    `   - 해야 할 일: ${compactDetail(why || task.title)}`,
    `   - 확인할 것: ${compactDetail(neededInfo)}`,
    `   - 완료 기준: ${compactDetail(completionCriteria)}`
  ].join('\n');
}

function formatTeamTaskSummary(task, index) {
  const context = task?.context ?? {};
  const why = detailFromContext(context, ['why', 'reason', 'goal', 'meetingContext']);

  return [
    `${index + 1}. *${task.title}*`,
    `   - 상태: ${statusBadge(task.status)}`,
    `   - 중요도: ${task.importance}`,
    `   - 세부사항: ${compactDetail(why || task.title)}`
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

function codexPromptCopyButton(task) {
  return {
    type: 'button',
    action_id: 'copy_codex_prompt',
    text: plainText('도움 받기'),
    value: task.id
  };
}

function taskActionsBlock({ task, user }) {
  if (task.status === '미시작') {
    return {
      type: 'actions',
      block_id: `task_actions_${task.id}`,
      elements: [
        taskActionButton({ actionId: 'task_accept_direct', text: '수락', task, user, style: 'primary' }),
        taskActionButton({ actionId: 'task_change_request', text: '변경', task, user, style: 'danger' }),
        taskActionButton({ actionId: 'task_cleanup', text: '정리', task, user })
      ]
    };
  }

  return {
    type: 'actions',
    block_id: `task_actions_${task.id}`,
    elements: [
      codexPromptCopyButton(task),
      taskActionButton({ actionId: 'task_file_submission', text: '작업 제출', task, user, style: 'primary' }),
      taskActionButton({ actionId: 'task_change_request', text: '변경', task, user, style: 'danger' }),
      taskActionButton({ actionId: 'task_cleanup', text: '정리', task, user })
    ]
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

export function buildInProcessBoardMessage({ user, tasks = [], workDate = formatKstDate(), boardLabel = '팀 진행 과정 보드', showActions = boardLabel === '개인 task 보드' }) {
  const displayName = formatDisplayName(user);
  const sortedTasks = sortTasksForDisplay(tasks);
  const formatTaskForBoard = showActions ? formatTask : formatTeamTaskSummary;
  const header = [
    `*${displayName} ${boardLabel}*`,
    `기준일: ${workDate}`
  ].join('\n');

  const body = sortedTasks.length === 0
    ? [
        boardLabel === '개인 task 보드' ? '현재 배정된 개인 task가 없습니다.' : '현재 공유할 진행 task가 없습니다.',
        boardLabel === '개인 task 보드' ? '회의 결과나 변경 제안이 반영되면 다음 출근 때 다시 표시됩니다.' : '개인 task 진행 상태가 바뀌면 여기에 공유됩니다.'
      ].join('\n')
    : sortedTasks.map(formatTaskForBoard).join('\n\n');

  const text = [header, body].join('\n\n');

  const blocks = sortedTasks.length === 0
    ? [section(text)]
    : [
        section(header),
        ...sortedTasks.flatMap((task, index) => showActions
          ? [section(formatTaskForBoard(task, index)), taskActionsBlock({ task, user })]
          : [section(formatTaskForBoard(task, index))])
      ];

  return {
    text,
    blocks
  };
}
