import { normalizeMeetingTaskCandidates } from '../domain/meetingTasks.js';
import {
  OPENAI_MEETING_TASK_EXTRACTION_SCHEMA,
  buildMeetingTaskExtractionInput
} from './meetingTaskExtractionPayload.js';

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

export function createOpenAiMeetingTaskExtractor({ apiKey, model = 'gpt-5.4', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('OpenAI meeting task extractor requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('OpenAI meeting task extractor requires fetch');
  }

  async function extractTasks({ meeting, users = [] }) {
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
            content: buildMeetingTaskExtractionInput({ meeting, users })
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'subjector_meeting_task_extraction',
            strict: true,
            schema: OPENAI_MEETING_TASK_EXTRACTION_SCHEMA
          }
        }
      })
    });

    if (!response.ok) {
      const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
      throw new Error(`OpenAI meeting task extraction failed: ${response.status} ${body}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error('OpenAI meeting task extraction failed: empty response');
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
