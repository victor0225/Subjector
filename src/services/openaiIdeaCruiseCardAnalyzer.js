const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const IDEA_CRUISE_CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cards: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          tag: { type: 'string', enum: ['info', 'warn', ''] },
          kind: { type: 'string', enum: ['answer', 'research', 'experiment', 'decision', 'filter'] },
          title: { type: 'string' },
          body: { type: 'string' },
          suggestion: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                body: { type: 'string' }
              },
              required: ['title', 'body']
            }
          },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                body: { type: 'string' },
                suggestion: { type: 'string' }
              },
              required: ['label', 'body', 'suggestion']
            }
          }
        },
        required: ['type', 'tag', 'kind', 'title', 'body', 'suggestion', 'details', 'choices']
      }
    }
  },
  required: ['cards']
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

function buildIdeaCruiseCardInput({ entryText, completedEntries = [], meetingContexts = [], githubOrganization = '' }) {
  return [
    'You are IDEA CRUISE, a live brainstorming intervention assistant for a 3-person graduation-project team.',
    'Your job is not to emit generic templates. Give concrete help for the exact entry.',
    'Use flexible card kinds:',
    '- answer: 즉시 답변. Use this when you can answer now. If useful, put 2-4 concept explanations in details. suggestion can be empty if the topic should not be rewritten.',
    '- research: 확인 필요. Use only when someone must spend time checking sources, licenses, latest state, docs, or data.',
    '- experiment: 실험 필요. Use only when the team must run code, hardware, measurement, or prototype work.',
    '- decision: 결정 필요. Use when the meeting should decide now. Put choices with label/body/suggestion.',
    '- filter: 제외 판단. Use when something should explicitly not become a task.',
    'If the entry asks a technical question, answer directly with definitions, relevant examples, dataset/search directions, and risks. Do not hide the useful answer inside a task.',
    'If details would help, fill details with named concepts such as datasets, hardware candidates, papers, libraries, or standards.',
    'The UI rewrites the left topic with suggestion. Therefore suggestion must be a complete rewritten topic page, not a small patch or bullet fragment.',
    'When the user chooses a direction, rewrite the topic around the chosen direction and preserve only the important current context.',
    'If a card is only an immediate explanation, leave suggestion empty unless it should become durable topic context.',
    'Order cards by importance: the first card must be the most urgent roadmap intervention, usually 지금 결정 / 지금 제외 / 먼저 생각할 것.',
    'If the entry conflicts with previous project direction, point out the conflict and suggest a narrower decision with choices when possible.',
    'If evidence is uncertain, say what must be checked instead of pretending certainty.',
    'Use Korean. Keep each card concise enough to scan during a live meeting.',
    '',
    `GitHub organization context: ${githubOrganization || 'not connected yet'}`,
    '',
    'Completed brainstorming inputs:',
    completedEntries.length > 0 ? completedEntries.join('\n---\n') : 'none yet',
    '',
    'Recent meeting/transcript context:',
    meetingContexts.length > 0 ? meetingContexts.join('\n---\n') : 'none yet',
    '',
    'Current entry:',
    entryText
  ].join('\n');
}

function normalizeCards(value) {
  const cards = Array.isArray(value?.cards) ? value.cards : [];
  return cards.slice(0, 5).map((card) => ({
    type: String(card.type || 'AI 고려'),
    tag: ['info', 'warn', ''].includes(card.tag) ? card.tag : '',
    kind: ['answer', 'research', 'experiment', 'decision', 'filter'].includes(card.kind) ? card.kind : 'research',
    title: String(card.title || 'AI 고려 사항'),
    body: String(card.body || ''),
    suggestion: String(card.suggestion || ''),
    details: Array.isArray(card.details)
      ? card.details.slice(0, 4).map((detail) => ({
        title: String(detail.title || ''),
        body: String(detail.body || '')
      })).filter((detail) => detail.title || detail.body)
      : [],
    choices: Array.isArray(card.choices)
      ? card.choices.slice(0, 4).map((choice) => ({
        label: String(choice.label || ''),
        body: String(choice.body || ''),
        suggestion: String(choice.suggestion || '')
      })).filter((choice) => choice.label || choice.body || choice.suggestion)
      : []
  })).filter((card) => card.body || card.suggestion);
}

export function createOpenAiIdeaCruiseCardAnalyzer({ apiKey, model = 'gpt-5.4', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('OpenAI IDEA CRUISE card analyzer requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('OpenAI IDEA CRUISE card analyzer requires fetch');
  }

  async function analyze({ entryText, completedEntries = [], meetingContexts = [], githubOrganization = '' }) {
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
            content: buildIdeaCruiseCardInput({
              entryText,
              completedEntries,
              meetingContexts,
              githubOrganization
            })
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'idea_cruise_intervention_cards',
            strict: true,
            schema: IDEA_CRUISE_CARD_SCHEMA
          }
        }
      })
    });

    if (!response.ok) {
      const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
      throw new Error(`OpenAI IDEA CRUISE card analysis failed: ${response.status} ${body}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error('OpenAI IDEA CRUISE card analysis failed: empty response');
    }

    return normalizeCards(JSON.parse(outputText));
  }

  return {
    analyze
  };
}
