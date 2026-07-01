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
          title: { type: 'string' },
          body: { type: 'string' },
          suggestion: { type: 'string' }
        },
        required: ['type', 'tag', 'title', 'body', 'suggestion']
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

function buildIdeaCruiseCardInput({ entryText, completedEntries = [], githubOrganization = '' }) {
  return [
    'You are IDEA CRUISE, a live brainstorming intervention assistant for a 3-person graduation-project team.',
    'Your job is not to emit generic templates. Give concrete help for the exact entry.',
    'If the entry asks a technical question, answer with likely definitions, data categories, dataset/search directions, and risks.',
    'If the entry conflicts with previous project direction, point out the conflict and suggest a narrower decision.',
    'If evidence is uncertain, say what must be checked instead of pretending certainty.',
    'Use Korean. Keep each card concise enough to scan during a live meeting.',
    '',
    `GitHub organization context: ${githubOrganization || 'not connected yet'}`,
    '',
    'Completed brainstorming inputs:',
    completedEntries.length > 0 ? completedEntries.join('\n---\n') : 'none yet',
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
    title: String(card.title || 'AI 고려 사항'),
    body: String(card.body || ''),
    suggestion: String(card.suggestion || '')
  })).filter((card) => card.body || card.suggestion);
}

export function createOpenAiIdeaCruiseCardAnalyzer({ apiKey, model = 'gpt-5.4', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('OpenAI IDEA CRUISE card analyzer requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('OpenAI IDEA CRUISE card analyzer requires fetch');
  }

  async function analyze({ entryText, completedEntries = [], githubOrganization = '' }) {
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
