import {
  OPENAI_FINALS_NARRATION_SCHEMA,
  buildFinalsNarrationInput,
  buildFinalsNarrationSystemPrompt,
  normalizeFinalsNarrative
} from './finalsNarrationPayload.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

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

export function createOpenAiFinalsNarrator({ apiKey, model = 'gpt-5.4', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('OpenAI finals narrator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('OpenAI finals narrator requires fetch');
  }

  return {
    async narrate({ workDate, tasks = [], results = [], changeRequests = [], users = [] }) {
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
              role: 'system',
              content: buildFinalsNarrationSystemPrompt()
            },
            {
              role: 'user',
              content: JSON.stringify(buildFinalsNarrationInput({
                workDate,
                tasks,
                results,
                changeRequests,
                users
              }))
            }
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'subjector_finals_narration',
              strict: true,
              schema: OPENAI_FINALS_NARRATION_SCHEMA
            }
          }
        })
      });

      if (!response.ok) {
        const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
        throw new Error(`OpenAI finals narration failed: ${response.status} ${body}`);
      }

      const outputText = extractOutputText(await response.json());
      if (!outputText) {
        throw new Error('OpenAI finals narration failed: empty response');
      }

      return normalizeFinalsNarrative(JSON.parse(outputText));
    }
  };
}
