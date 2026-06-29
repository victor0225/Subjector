import {
  GEMINI_FINALS_NARRATION_SCHEMA,
  buildFinalsNarrationInput,
  buildFinalsNarrationSystemPrompt,
  normalizeFinalsNarrative
} from './finalsNarrationPayload.js';

const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

function sanitizeErrorBody(body, apiKey) {
  return String(body ?? '').replaceAll(apiKey, '[redacted]');
}

function extractOutputText(payload) {
  if (payload?.output_text) {
    return payload.output_text;
  }

  const chunks = [];
  for (const candidate of payload?.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        chunks.push(part.text);
      }
    }
  }

  for (const step of payload?.steps ?? []) {
    for (const content of step.content ?? []) {
      if (content.text) {
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

export function createGeminiFinalsNarrator({ apiKey, model = 'gemini-3.5-flash', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('Gemini finals narrator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('Gemini finals narrator requires fetch');
  }

  return {
    async narrate({ workDate, tasks = [], results = [], changeRequests = [], users = [] }) {
      const response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: [
            buildFinalsNarrationSystemPrompt(),
            '',
            JSON.stringify(buildFinalsNarrationInput({
              workDate,
              tasks,
              results,
              changeRequests,
              users
            }))
          ].join('\n'),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: GEMINI_FINALS_NARRATION_SCHEMA
          }
        })
      });

      if (!response.ok) {
        const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
        throw new Error(`Gemini finals narration failed: ${response.status} ${body}`);
      }

      const output = await response.json();
      if (output?.projectOverview) {
        return normalizeFinalsNarrative(output);
      }

      const outputText = extractOutputText(output);
      if (!outputText) {
        throw new Error('Gemini finals narration failed: empty response');
      }

      return normalizeFinalsNarrative(JSON.parse(outputText));
    }
  };
}
