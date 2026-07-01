const GEMINI_GENERATE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const IDEA_CRUISE_TASK_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          pageNumber: { type: 'integer' },
          title: { type: 'string' },
          neededInfo: { type: 'string' },
          doneCriteria: { type: 'string' },
          importance: { type: 'string' }
        },
        required: ['pageId', 'pageNumber', 'title', 'neededInfo', 'doneCriteria', 'importance']
      }
    },
    notTasks: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['tasks', 'notTasks']
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

function buildIdeaCruiseTaskInput({ completedPages = [] }) {
  return [
    'You are IDEA CRUISE task candidate generator.',
    'Use Korean.',
    'Convert completed topic pages into task candidates only when the work needs time outside the meeting.',
    '시간을 써야만 해결되는 일만 task로 만든다.',
    'Do not create tasks for concepts you can answer immediately, choices already decided in the meeting, or wording cleanup.',
    'Each task must be grounded in the supplied topic page text. Do not reuse canned hardware/audio examples unless the page actually mentions them.',
    'Assignee must not be selected by AI; the UI will set every assignee to 미배정.',
    'Return notTasks for important items intentionally excluded from task creation.',
    '',
    'Completed topic pages:',
    completedPages.map((page) => [
      `Page ID: ${page.id}`,
      `Page Number: ${page.number}`,
      `Title: ${page.title}`,
      'Text:',
      page.text
    ].join('\n')).join('\n---\n') || 'none'
  ].join('\n');
}

function normalizeResult(value) {
  const tasks = Array.isArray(value?.tasks) ? value.tasks : [];
  const notTasks = Array.isArray(value?.notTasks) ? value.notTasks : [];

  return {
    tasks: tasks.slice(0, 8).map((task, index) => ({
      id: `generated-task-${Date.now()}-${index}`,
      pageId: String(task.pageId || ''),
      pageNumber: Number.isInteger(task.pageNumber) ? task.pageNumber : Number(task.pageNumber || 0),
      title: String(task.title || '제목 없음'),
      neededInfo: String(task.neededInfo || ''),
      doneCriteria: String(task.doneCriteria || ''),
      assignee: '미배정',
      importance: ['높음', '보통', '낮음'].includes(task.importance) ? task.importance : '보통',
      kind: 'research',
      error: ''
    })).filter((task) => task.title && (task.neededInfo || task.doneCriteria)),
    notTasks: notTasks.slice(0, 8).map((item) => String(item)).filter(Boolean)
  };
}

export function createGeminiIdeaCruiseTaskGenerator({ apiKey, model = 'gemini-2.5-flash-lite', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('Gemini IDEA CRUISE task generator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('Gemini IDEA CRUISE task generator requires fetch');
  }

  async function generate({ completedPages = [] }) {
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
              { text: buildIdeaCruiseTaskInput({ completedPages }) }
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
