const IMPORTANCE_BY_TEXT = [
  ['🔴 상', ['상', '높', '중요', 'urgent', 'high', 'red']],
  ['🟡 중', ['중', '보통', 'medium', 'yellow']],
  ['🟢 하', ['하', '낮', 'low', 'green']]
];

const COORDINATION_BY_TEXT = [
  ['🔴 상', ['상', '높', '회의', '합의', '조율 필요', 'high', 'red']],
  ['🟡 중', ['중', '보통', '확인', 'medium', 'yellow']],
  ['🟢 하', ['하', '낮', '독립', 'low', 'green']]
];

function asString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }

  const text = asString(value);
  return text ? [text] : [];
}

function normalizeLevel(value, mapping, fallback) {
  const text = asString(value).toLowerCase();
  for (const [normalized, needles] of mapping) {
    if (needles.some((needle) => text.includes(needle))) {
      return normalized;
    }
  }

  return fallback;
}

function validAssignee(value, users) {
  const key = asString(value);
  return users.some((user) => user.key === key) ? key : users[0]?.key;
}

function taskSourceLabel({ sourceLabel, meetingTitle }) {
  if (sourceLabel) {
    return sourceLabel;
  }

  return `회의 결과록: ${meetingTitle || '회의'}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function areAllSpeakersMapped({ transcript, speakerMapping }) {
  const labels = (transcript?.speakers ?? [])
    .map((speaker) => asString(speaker.label))
    .filter(Boolean);

  return labels.length > 0 && labels.every((label) => Boolean(speakerMapping?.[label]));
}

export function getMappedParticipantUserKeys({ transcript, speakerMapping }) {
  const labels = (transcript?.speakers ?? [])
    .map((speaker) => asString(speaker.label))
    .filter(Boolean);

  return unique(labels.map((label) => speakerMapping?.[label]));
}

export function normalizeMeetingTaskCandidates(value = {}, { users = [], sourceLabel = null, meetingTitle = null } = {}) {
  const fallbackSource = taskSourceLabel({ sourceLabel, meetingTitle });
  const tasks = Array.isArray(value) ? value : value.tasks;

  return (tasks ?? [])
    .map((task) => {
      const assigneeUserKey = validAssignee(task?.assigneeUserKey, users);
      const title = asString(task?.title);

      if (!assigneeUserKey || !title) {
        return null;
      }

      const context = {
        source: asString(task?.context?.source, fallbackSource),
        why: asString(task?.why ?? task?.context?.why),
        assignmentReason: asString(task?.assignmentReason ?? task?.context?.assignmentReason),
        completionCriteria: asArray(task?.completionCriteria ?? task?.context?.completionCriteria),
        dependencies: asArray(task?.dependencies ?? task?.context?.dependencies),
        confidence: asString(task?.confidence ?? task?.context?.confidence, '중간')
      };

      return {
        assigneeUserKey,
        title,
        importance: normalizeLevel(task?.importance, IMPORTANCE_BY_TEXT, '🟡 중'),
        coordination: normalizeLevel(task?.coordination, COORDINATION_BY_TEXT, '🟡 중'),
        context
      };
    })
    .filter(Boolean);
}

export function buildMeetingTaskApprovalText({ taskCandidates = [] }) {
  const lines = [
    'task 후보 추출이 완료되었습니다.',
    `- 후보 task: ${taskCandidates.length}개`,
    '- 상태: 수현님 승인 대기',
    '승인하면 #in-process에 반영할 task로 저장합니다.',
    '승인 후 담당자는 Subjector Bot DM에 `최신화`를 보내 새 task를 확인합니다.',
    '',
    '[후보 목록]'
  ];

  for (const [index, task] of taskCandidates.entries()) {
    lines.push(`${index + 1}. ${task.title} (${task.assigneeUserKey}, ${task.importance}, 조율 ${task.coordination})`);
  }

  return lines.join('\n');
}

export function buildParticipantTaskInputThreadText({ participantUserKeys = [], users = [] }) {
  const names = participantUserKeys
    .map((userKey) => formatUserName(userKey, users))
    .join(', ');

  return [
    'Speaker A/B/C 매핑이 완료되었습니다.',
    '- 다음 단계: 회의 참여자에게 DM으로 “내가 먼저 해야 할 일”을 묻습니다.',
    `- 대상: ${names || '등록된 참여자 없음'}`,
    '모든 답변이 모이면 task 후보를 만들고 담당자별 채택/제외/수정 DM을 보냅니다.'
  ].join('\n');
}

export function buildParticipantTaskInputDmText({ user, meetingTitle }) {
  return [
    `${formatDisplayNameForTask(user)}, 이번 회의 후 중요하다고 보는 일을 적어 주세요.`,
    `- 회의: ${meetingTitle || '회의'}`,
    '- 기준: 내가 먼저 해야 할 일, 남이 맡아야 한다고 보는 일, 안 해도 된다고 보는 후보, 중요하다고 느낀 순서를 짧게 적으면 됩니다.',
    '아래 버튼을 눌러 답변을 남겨 주세요.'
  ].join('\n');
}

export function buildParticipantTaskInputSavedText({ remainingUserKeys = [], users = [] }) {
  if (remainingUserKeys.length === 0) {
    return '답변을 저장했습니다. 모든 답변이 모여 task 후보를 생성합니다.';
  }

  return [
    '답변을 저장했습니다.',
    `- 아직 답변 대기: ${remainingUserKeys.map((userKey) => formatUserName(userKey, users)).join(', ')}`
  ].join('\n');
}

export function buildMeetingTaskCandidateReviewText({ user, taskCandidates = [] }) {
  return [
    `${formatDisplayNameForTask(user)}, 회의 기반 task 후보를 확인해 주세요.`,
    `- 후보: ${taskCandidates.length}개`,
    '채택하면 바로 #in-process에 저장됩니다.',
    '필요 없으면 제외, 내용이 어긋나면 수정해서 반영하세요.'
  ].join('\n');
}

export function buildMeetingTaskApprovalResultText({ taskCandidates = [] }) {
  return [
    `회의 기반 task ${taskCandidates.length}개를 생성했습니다.`,
    '담당자가 Subjector Bot DM에 `최신화`를 보내면 #in-process task 보드에서 확인할 수 있습니다.'
  ].join('\n');
}

function formatDisplayNameForTask(user) {
  if (!user) {
    return '담당자님';
  }

  return `${asString(user.displayName || user.fullName || user.key)}님`;
}

function formatUserName(userKey, users) {
  const user = users.find((candidate) => candidate.key === userKey);
  return formatDisplayNameForTask(user);
}
