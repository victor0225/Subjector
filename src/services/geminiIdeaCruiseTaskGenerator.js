const GEMINI_GENERATE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const IDEA_CRUISE_TASK_SCHEMA = {
  type: 'object',
  properties: {
    newTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          pageNumber: { type: 'integer' },
          title: { type: 'string' },
          neededInfo: { type: 'string' },
          doneCriteria: { type: 'string' },
          importance: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['pageId', 'pageNumber', 'title', 'neededInfo', 'doneCriteria', 'importance', 'reason']
      }
    },
    existingTaskUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          existingTaskTitle: { type: 'string' },
          addNeededInfo: { type: 'string' },
          doneCriteriaChange: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['taskId', 'existingTaskTitle', 'addNeededInfo', 'doneCriteriaChange', 'reason']
      }
    },
    notTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['content', 'reason']
      }
    }
  },
  required: ['newTasks', 'existingTaskUpdates', 'notTasks']
};

function sanitizeErrorBody(body, apiKey) {
  return String(body ?? '').replaceAll(apiKey, '[redacted]');
}

function extractOutputText(payload) {
  const chunks = [];
  for (const candidate of payload?.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join('\n');
}

async function readErrorBody(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function buildIdeaCruiseTaskInput({ completedPages = [], currentTasks = [], meetingRecord = '' }) {
  return [
    'You are IDEA CRUISE task candidate generator.',
    'Use Korean.',
    'Convert completed topic pages into task candidates only when the work needs time outside the meeting.',
    '시간을 써야만 해결되는 일만 task로 만든다.',
    'Compare completed topic pages with current in-process tasks by goal, done criteria, needed information, assignee, status, and expected output.',
    'Return only non-overlapping new tasks in newTasks.',
    'If the meeting content should strengthen an existing task, return it in existingTaskUpdates instead of creating a new task.',
    'If it was decided in the meeting or can be answered immediately, return it in notTasks.',
    'Do not create tasks for concepts you can answer immediately, choices already decided in the meeting, or wording cleanup.',
    'Each task must be grounded in the supplied topic page text. Do not reuse canned hardware/audio examples unless the page actually mentions them.',
    'Assignee must not be selected by AI; the UI will set every assignee to 미배정.',
    'For existingTaskUpdates, addNeededInfo is safe to apply as 확인할 것, while doneCriteriaChange must be shown as an explicit human choice.',
    '',
    'Completed topic pages:',
    completedPages.map((page) => [
      `Page ID: ${page.id}`,
      `Page Number: ${page.number}`,
      `Title: ${page.title}`,
      'Text:',
      page.text
    ].join('\n')).join('\n---\n') || 'none',
    '',
    'Current in-process tasks:',
    currentTasks.map((task) => [
      `Task ID: ${task.id}`,
      `Title: ${task.title}`,
      `Assignee: ${task.assigneeUserKey || task.assignee || ''}`,
      `Status: ${task.status || ''}`,
      `Importance: ${task.importance || ''}`,
      `Needed info: ${task.context?.neededInfo || ''}`,
      `Done criteria: ${task.context?.doneCriteria || ''}`,
      `Why: ${task.context?.why || task.context?.goal || ''}`
    ].join('\n')).join('\n---\n') || 'none',
    '',
    'Meeting materials:',
    String(meetingRecord || '').trim() || 'none'
  ].join('\n');
}

function normalizeResult(value) {
  const tasks = Array.isArray(value?.newTasks) ? value.newTasks : (Array.isArray(value?.tasks) ? value.tasks : []);
  const existingTaskUpdates = Array.isArray(value?.existingTaskUpdates) ? value.existingTaskUpdates : [];
  const notTasks = Array.isArray(value?.notTasks) ? value.notTasks : [];

  return {
    tasks: tasks.slice(0, 8).map((task, index) => ({
      id: `generated-task-${Date.now()}-${index}`,
      pageId: String(task.pageId || ''),
      pageNumber: Number.isInteger(task.pageNumber) ? task.pageNumber : Number(task.pageNumber || 0),
      title: String(task.title || '제목 없음'),
      neededInfo: String(task.neededInfo || ''),
      doneCriteria: String(task.doneCriteria || ''),
      reason: String(task.reason || ''),
      assignee: '미배정',
      importance: ['높음', '보통', '낮음'].includes(task.importance) ? task.importance : '보통',
      kind: 'research',
      error: ''
    })).filter((task) => task.title && (task.neededInfo || task.doneCriteria)),
    existingTaskUpdates: existingTaskUpdates.slice(0, 8).map((item, index) => ({
      id: `task-update-${Date.now()}-${index}`,
      taskId: String(item.taskId || ''),
      existingTaskTitle: String(item.existingTaskTitle || ''),
      addNeededInfo: String(item.addNeededInfo || ''),
      doneCriteriaChange: String(item.doneCriteriaChange || ''),
      reason: String(item.reason || ''),
      error: ''
    })).filter((item) => item.taskId && (item.addNeededInfo || item.doneCriteriaChange)),
    notTasks: notTasks.slice(0, 8).map((item, index) => {
      if (typeof item === 'string') {
        return { id: `not-task-${Date.now()}-${index}`, content: item, reason: '' };
      }
      return {
        id: `not-task-${Date.now()}-${index}`,
        content: String(item?.content || ''),
        reason: String(item?.reason || '')
      };
    }).filter((item) => item.content)
  };
}

export function createGeminiIdeaCruiseTaskGenerator({ apiKey, model = 'gemini-2.5-flash', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('Gemini IDEA CRUISE task generator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('Gemini IDEA CRUISE task generator requires fetch');
  }

  async function generate({ completedPages = [], currentTasks = [], meetingRecord = '' }) {
    const response = await fetchImpl(`${GEMINI_GENERATE_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: buildIdeaCruiseTaskInput({ completedPages, currentTasks, meetingRecord }) }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: IDEA_CRUISE_TASK_SCHEMA
        }
      })
    });

    if (!response.ok) {
      const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
      throw new Error(`Gemini IDEA CRUISE task generation failed: ${response.status} ${body}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error('Gemini IDEA CRUISE task generation failed: empty response');
    }

    return normalizeResult(JSON.parse(outputText));
  }

  return {
    generate
  };
}
