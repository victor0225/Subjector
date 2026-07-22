const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const ROADMAP_PATCH_SCHEMA = {
  type: 'object',
  properties: {
    updatedTopics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetId: { type: 'string' },
          title: { type: 'string' },
          text: { type: 'string' },
          fixedItems: { type: 'array', items: { type: 'string' } },
          scope: { type: 'string' },
          meetingEvidence: { type: 'array', items: { type: 'string' } },
          hasTeamOpinion: { type: 'boolean' }
        },
        required: ['targetId', 'title', 'text', 'fixedItems', 'scope', 'meetingEvidence', 'hasTeamOpinion'],
        additionalProperties: false
      }
    },
    createdTopics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          parentId: { type: 'string' },
          title: { type: 'string' },
          text: { type: 'string' },
          fixedItems: { type: 'array', items: { type: 'string' } },
          scope: { type: 'string' },
          meetingEvidence: { type: 'array', items: { type: 'string' } }
        },
        required: ['clientId', 'parentId', 'title', 'text', 'fixedItems', 'scope', 'meetingEvidence'],
        additionalProperties: false
      }
    },
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetIds: { type: 'array', items: { type: 'string' } },
          title: { type: 'string' },
          body: { type: 'string' }
        },
        required: ['targetIds', 'title', 'body'],
        additionalProperties: false
      }
    }
  },
  required: ['updatedTopics', 'createdTopics', 'warnings'],
  additionalProperties: false
};

function sanitizeErrorBody(body, apiKey) {
  return String(body ?? '').replaceAll(apiKey, '[redacted]');
}

function extractOutputText(payload) {
  if (payload?.output_text) {
    return payload.output_text;
  }

  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) {
        chunks.push(content.text);
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

function compactList(values, limit = 12) {
  return (Array.isArray(values) ? values : [])
    .filter(Boolean)
    .slice(0, limit);
}

function buildRoadmapPatchInput({ currentRoadmap = [], meetingMaterials = '', taskSignals = [], githubSignals = [] }) {
  return [
    'You are IDEA CRUISE roadmap patch generator.',
    'Use Korean.',
    'Return only roadmapPatch JSON that can be overlaid onto the existing first-floor roadmap.',
    'Principle 1: Meeting decisions are the strongest evidence, but do not rewrite the whole roadmap if a small patch is enough.',
    'Principle 2: Preserve the current roadmap structure and card positions unless meeting evidence clearly changes the roadmap.',
    'Do not create first-floor cards directly from meeting-context.',
    'Do not create first-floor cards directly from Subjector tasks.',
    'Use Subjector tasks only as reference signals for progress, missing criteria, or consistency.',
    'Meeting material original text must appear only in meetingEvidence, so the client can show it in the second-floor detail as 회의 근거.',
    'If a meeting-context or task suggests a real roadmap change, express it as updatedTopics or createdTopics, not as a Task: card.',
    'For createdTopics, connect them to an existing parentId whenever possible. Use left-to-right progress logic.',
    'Use warnings for conflict signals between existing roadmap topics; do not resolve conflicts automatically.',
    '',
    'Current first-floor roadmap:',
    compactList(currentRoadmap, 30).map((topic) => [
      `ID: ${topic.id}`,
      `Title: ${topic.title}`,
      `Parent ID: ${topic.parentId || ''}`,
      `Fixed: ${Boolean(topic.fixed)}`,
      `Text: ${topic.text || ''}`,
      `Fixed items: ${(topic.fixedItems || []).join(' / ')}`,
      `Meeting evidence: ${(topic.meetingEvidence || []).join(' / ')}`
    ].join('\n')).join('\n---\n') || 'none',
    '',
    'Meeting materials:',
    String(meetingMaterials || '').trim() || 'none',
    '',
    'Subjector task status signals:',
    compactList(taskSignals, 40).map((signal) => [
      `Task ID: ${signal.id}`,
      `Title: ${signal.title}`,
      `Text: ${signal.text}`
    ].join('\n')).join('\n---\n') || 'none',
    '',
    'GitHub/document signals:',
    compactList(githubSignals, 12).map((item) => `- ${item}`).join('\n') || 'none'
  ].join('\n');
}

function normalizeStringArray(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeResult(value) {
  const updatedTopics = Array.isArray(value?.updatedTopics) ? value.updatedTopics : [];
  const createdTopics = Array.isArray(value?.createdTopics) ? value.createdTopics : [];
  const warnings = Array.isArray(value?.warnings) ? value.warnings : [];

  return {
    updatedTopics: updatedTopics.slice(0, 12).map((topic) => ({
      targetId: String(topic.targetId || ''),
      title: String(topic.title || ''),
      text: String(topic.text || ''),
      fixedItems: normalizeStringArray(topic.fixedItems),
      scope: String(topic.scope || ''),
      meetingEvidence: normalizeStringArray(topic.meetingEvidence),
      hasTeamOpinion: Boolean(topic.hasTeamOpinion)
    })).filter((topic) => topic.targetId && (topic.title || topic.text || topic.meetingEvidence.length)),
    createdTopics: createdTopics.slice(0, 10).map((topic) => ({
      clientId: String(topic.clientId || ''),
      parentId: String(topic.parentId || ''),
      title: String(topic.title || '새 로드맵 카드'),
      text: String(topic.text || ''),
      fixedItems: normalizeStringArray(topic.fixedItems),
      scope: String(topic.scope || ''),
      meetingEvidence: normalizeStringArray(topic.meetingEvidence)
    })).filter((topic) => topic.title && topic.text),
    warnings: warnings.slice(0, 8).map((warning) => ({
      targetIds: normalizeStringArray(warning.targetIds),
      title: String(warning.title || '충돌 감지'),
      body: String(warning.body || '')
    })).filter((warning) => warning.targetIds.length && warning.body)
  };
}

export function createOpenAiIdeaCruiseRoadmapPatchGenerator({ apiKey, model = 'gpt-5.4', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('OpenAI IDEA CRUISE roadmap patch generator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('OpenAI IDEA CRUISE roadmap patch generator requires fetch');
  }

  async function generate({ currentRoadmap = [], meetingMaterials = '', taskSignals = [], githubSignals = [] }) {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: buildRoadmapPatchInput({ currentRoadmap, meetingMaterials, taskSignals, githubSignals })
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'idea_cruise_roadmap_patch',
            strict: true,
            schema: ROADMAP_PATCH_SCHEMA
          }
        }
      })
    });

    if (!response.ok) {
      const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
      throw new Error(`OpenAI IDEA CRUISE roadmap patch failed: ${response.status} ${body}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error('OpenAI IDEA CRUISE roadmap patch failed: empty response');
    }

    return normalizeResult(JSON.parse(outputText));
  }

  return {
    generate
  };
}
