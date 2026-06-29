const NARRATIVE_PROPERTIES = {
  projectOverview: { type: 'string' },
  memberProgress: {
    type: 'array',
    items: { type: 'string' }
  },
  nextFocus: {
    type: 'array',
    items: { type: 'string' }
  }
};

export const OPENAI_FINALS_NARRATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: NARRATIVE_PROPERTIES,
  required: ['projectOverview', 'memberProgress', 'nextFocus']
};

export const GEMINI_FINALS_NARRATION_SCHEMA = {
  type: 'object',
  properties: NARRATIVE_PROPERTIES,
  required: ['projectOverview', 'memberProgress', 'nextFocus']
};

function userLabel(userKey, users = []) {
  const user = users.find((candidate) => candidate.key === userKey);
  return user?.displayName ? `${user.displayName}님` : userKey || '담당자 미지정';
}

function compactRawText(rawText) {
  const lines = String(rawText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(0, 4).join(' / ') || '내용 없음';
}

export function buildFinalsNarrationSystemPrompt() {
  return [
    'You are Subjector, a project coordination assistant for a 3-person graduation-project team.',
    'Write a Korean cumulative #finals summary that sounds like a project manager explaining the current project picture.',
    'Do not merely list task names. Explain what changed, where the project is heading, who is responsible for what, and what may need a decision tomorrow.',
    'Do not invent facts beyond the provided tasks, results, and change requests.',
    'Mention assignees politely with 님.'
  ].join('\n');
}

export function buildFinalsNarrationInput({ workDate, tasks = [], results = [], changeRequests = [], users = [] }) {
  return {
    workDate,
    teamMembers: users.map((user) => ({
      key: user.key,
      name: `${user.displayName}님`
    })),
    tasks: tasks.map((task) => ({
      title: task.title,
      assignee: userLabel(task.assigneeUserKey, users),
      status: task.status,
      context: task.context ?? {}
    })),
    results: results.map((result) => ({
      taskTitle: result.taskTitle,
      resultType: result.resultType,
      summary: compactRawText(result.rawText)
    })),
    changeRequests: changeRequests.map((request) => ({
      taskTitle: request.taskTitle,
      status: request.status,
      summary: compactRawText(request.rawText)
    }))
  };
}

export function normalizeFinalsNarrative(raw = {}) {
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
