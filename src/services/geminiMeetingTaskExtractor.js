import { normalizeMeetingTaskCandidates } from '../domain/meetingTasks.js';

const GEMINI_GENERATE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const TASK_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          assigneeUserKey: { type: 'string' },
          title: { type: 'string' },
          importance: { type: 'string' },
          coordination: { type: 'string' },
          why: { type: 'string' },
          assignmentReason: { type: 'string' },
          completionCriteria: {
            type: 'array',
            items: { type: 'string' }
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' }
          },
          confidence: { type: 'string' }
        },
        required: ['assigneeUserKey', 'title', 'importance', 'coordination', 'why', 'assignmentReason', 'completionCriteria']
      }
    }
  },
  required: ['tasks']
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

function buildTaskExtractionInput({ meeting, users }) {
  const transcript = meeting?.summary?.transcript ?? {};
  const userKeys = users.map((user) => `${user.key}=${user.displayName}님`).join(', ');

  return [
    '너는 Subjector의 회의 기반 task 추출 엔진이다.',
    '회의 전사와 Speaker 매핑을 보고 실제 수행해야 할 task 후보만 뽑는다.',
    `assigneeUserKey는 반드시 다음 key 중 하나만 사용한다: ${userKeys}`,
    '회의에서 합의되지 않은 추측성 task는 만들지 않는다.',
    '각 task는 Codex가 바로 수행할 수 있도록 왜 생겼는지, 왜 그 사람 담당인지, 완료 기준을 구체적으로 적는다.',
    'importance와 coordination은 상/중/하 중 하나로 판단한다.',
    '반드시 JSON만 출력한다.',
    '',
    JSON.stringify({
      speakerMapping: meeting?.speakerMapping ?? meeting?.speaker_mapping ?? {},
      transcript
    })
  ].join('\n');
}

async function readErrorBody(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export function createGeminiMeetingTaskExtractor({ apiKey, model = 'gemini-3.5-flash', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('Gemini meeting task extractor requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('Gemini meeting task extractor requires fetch');
  }

  async function extractTasks({ meeting, users = [] }) {
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
              { text: buildTaskExtractionInput({ meeting, users }) }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: TASK_EXTRACTION_SCHEMA
        }
      })
    });

    if (!response.ok) {
      const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
      throw new Error(`Gemini meeting task extraction failed: ${response.status} ${body}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error('Gemini meeting task extraction failed: empty response');
    }

    return normalizeMeetingTaskCandidates(JSON.parse(outputText), {
      users,
      meetingTitle: meeting?.summary?.transcript?.meetingTitle
    });
  }

  return {
    extractTasks
  };
}
