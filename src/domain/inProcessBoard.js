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

export function buildTaskDetailThreadMessage({ user, task }) {
  const context = task?.context ?? {};
  const displayName = formatDisplayName(user);
  const why = detailFromContext(context, ['why', 'reason', 'goal', 'meetingContext']);
  const assignmentReason = detailFromContext(context, ['assignmentReason', 'assigneeReason', 'ownerReason']);
  const completionCriteria = detailFromContext(context, ['completionCriteria', 'acceptanceCriteria', 'doneCriteria']);
  const dependencies = detailFromContext(context, ['dependencies', 'dependency']);
  const confidence = detailFromContext(context, ['confidence', 'assignmentConfidence']);

  const text = [
    `*[task 상세 맥락] ${task.title}*`,
    '',
    `[왜 생긴 task인가]`,
    detailRows(why),
    '',
    `[왜 ${displayName} 담당인가]`,
    detailRows(assignmentReason),
    '',
    `[완료 기준]`,
    detailRows(completionCriteria),
    '',
    `[의존성]`,
    detailRows(dependencies),
    '',
    `[확신도]`,
    detailRows(confidence),
    '',
    `[출처]`,
    `- ${taskContextSource(task)}`,
    `- 중요도: ${task.importance ?? '🟡 중'}`,
    `- 조율: ${task.coordination ?? '🟡 중'}`
  ].join('\n');

  return {
    text,
    blocks: [section(text)]
  };
}

function formatTask(task, index) {
  return [
    `${index + 1}. *${task.title}*`,
    `   - 상태: ${statusBadge(task.status)}`,
    `   - 중요도: ${task.importance}`,
    `   - 조율: ${task.coordination}`,
    `   - 맥락: ${taskContextSource(task)}`,
    `   - 상세 근거: 스레드 참고`
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
    text: plainText('Codex 프롬프트 보기/복사'),
    value: task.id
  };
}

function taskActionsBlock({ task, user }) {
  const completeButtonText = task.status === '보완 필요' ? '보완 제출' : '완료';
  const elements = [
    taskActionButton({ actionId: 'task_complete', text: completeButtonText, task, user }),
    taskActionButton({ actionId: 'task_stop_today', text: '오늘은 여기까지', task, user }),
    taskActionButton({ actionId: 'task_change_request', text: '변경 요청', task, user, style: 'danger' })
  ];

  if (task.status === '미시작') {
    elements.unshift(
      taskActionButton({ actionId: 'task_accept_generate_prompt', text: '수락 및 Codex 프롬프트 생성', task, user, style: 'primary' }),
      taskActionButton({ actionId: 'task_accept_direct', text: '수락하고 직접 진행', task, user })
    );
  } else {
    elements.unshift(codexPromptCopyButton(task));
    elements.splice(3, 0, taskActionButton({ actionId: 'task_file_submission', text: '파일 첨부 제출', task, user }));
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
  const sortedTasks = sortTasksForDisplay(tasks);
  const header = [
    `*${displayName} task*`,
    `상태: 출근 확인됨`,
    `기준일: ${workDate}`
  ].join('\n');

  const body = sortedTasks.length === 0
    ? [
        '현재 배정된 task가 없습니다.',
        '회의 결과나 변경 제안이 반영되면 여기에 표시됩니다.'
      ].join('\n')
    : sortedTasks.map(formatTask).join('\n\n');

  const text = [header, body].join('\n\n');

  const blocks = sortedTasks.length === 0
    ? [section(text)]
    : [
        section(header),
        ...sortedTasks.flatMap((task, index) => [
          section(formatTask(task, index)),
          taskActionsBlock({ task, user })
        ])
      ];

  return {
    text,
    blocks
  };
}
