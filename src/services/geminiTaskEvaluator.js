import { normalizeTaskEvaluation } from '../domain/taskEvaluation.js';
import {
  GEMINI_EVALUATION_SCHEMA,
  buildEvaluationInput,
  buildEvaluationSystemPrompt
} from './taskEvaluationPayload.js';

const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

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

function parseEvaluation(payload) {
  if (payload?.verdict) {
    return normalizeTaskEvaluation(payload);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('Gemini task evaluation failed: empty response');
  }

  return normalizeTaskEvaluation(JSON.parse(outputText));
}

export function createGeminiTaskEvaluator({ apiKey, model = 'gemini-3.5-flash', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('Gemini task evaluator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('Gemini task evaluator requires fetch');
  }

  return {
    async evaluateSubmission({ actionId, actionLabel, task, rawText }) {
      const response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: [
            buildEvaluationSystemPrompt(),
            '',
            JSON.stringify(buildEvaluationInput({ actionId, actionLabel, task, rawText }))
          ].join('\n'),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: GEMINI_EVALUATION_SCHEMA
          }
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gemini task evaluation failed: ${response.status} ${body}`);
      }

      return parseEvaluation(await response.json());
    }
  };
}
