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

export function areAllSpeakersMapped({ transcript, speakerMapping }) {
  const labels = (transcript?.speakers ?? [])
    .map((speaker) => asString(speaker.label))
    .filter(Boolean);

  return labels.length > 0 && labels.every((label) => Boolean(speakerMapping?.[label]));
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

export function buildMeetingTaskApprovalResultText({ taskCandidates = [] }) {
  return [
    `회의 기반 task ${taskCandidates.length}개를 생성했습니다.`,
    '담당자가 Subjector Bot DM에 `최신화`를 보내면 #in-process task 보드에서 확인할 수 있습니다.'
  ].join('\n');
}
