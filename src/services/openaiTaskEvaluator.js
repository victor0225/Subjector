import { normalizeTaskEvaluation } from '../domain/taskEvaluation.js';
import {
  OPENAI_EVALUATION_SCHEMA,
  buildEvaluationInput,
  buildEvaluationSystemPrompt
} from './taskEvaluationPayload.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

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

function parseEvaluation(payload) {
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('OpenAI task evaluation failed: empty response');
  }

  return normalizeTaskEvaluation(JSON.parse(outputText));
}

export function createOpenAiTaskEvaluator({ apiKey, model = 'gpt-5.2', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('OpenAI task evaluator requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('OpenAI task evaluator requires fetch');
  }

  return {
    async evaluateSubmission({ actionId, actionLabel, task, rawText }) {
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
              content: buildEvaluationSystemPrompt()
            },
            {
              role: 'user',
              content: JSON.stringify(buildEvaluationInput({ actionId, actionLabel, task, rawText }))
            }
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'subjector_task_evaluation',
              strict: true,
              schema: OPENAI_EVALUATION_SCHEMA
            }
          }
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI task evaluation failed: ${response.status} ${body}`);
      }

      return parseEvaluation(await response.json());
    }
  };
}
