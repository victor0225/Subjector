import { normalizeTaskEvaluation } from '../domain/taskEvaluation.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const EVALUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: {
      type: 'string',
      enum: ['sufficient', 'needs_revision', 'informational']
    },
    score: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },
    summary: { type: 'string' },
    reasons: {
      type: 'array',
      items: { type: 'string' }
    },
    missingItems: {
      type: 'array',
      items: { type: 'string' }
    },
    feedbackToUser: { type: 'string' }
  },
  required: ['verdict', 'score', 'summary', 'reasons', 'missingItems', 'feedbackToUser']
};

function systemPrompt() {
  return [
    'You are Subjector, a strict but practical task submission evaluator for a 3-person graduation-project team.',
    'Evaluate whether the submitted Slack/Codex result meaningfully satisfies the assigned task.',
    'For actionId task_complete, return verdict needs_revision when the submission is vague, off-topic, lacks evidence, lacks output details, or does not address the task goal.',
    'For actionId task_stop_today, return informational unless the content is empty or unusable; provide practical feedback without blocking progress.',
    'Write Korean feedback. Be concise, concrete, and action-oriented.',
    'Never invent completed work. Judge only from the task context and submitted text.'
  ].join('\n');
}

function buildInput({ actionId, actionLabel, task, rawText }) {
  return {
    actionId,
    actionLabel,
    task: {
      id: task?.id,
      title: task?.title,
      status: task?.status,
      importance: task?.importance,
      coordination: task?.coordination,
      context: task?.context ?? {}
    },
    submittedText: rawText
  };
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
              content: systemPrompt()
            },
            {
              role: 'user',
              content: JSON.stringify(buildInput({ actionId, actionLabel, task, rawText }))
            }
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'subjector_task_evaluation',
              strict: true,
              schema: EVALUATION_SCHEMA
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
