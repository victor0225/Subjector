import { normalizeMeetingTaskCandidates } from '../domain/meetingTasks.js';
import {
  MEETING_TASK_EXTRACTION_SCHEMA,
  buildMeetingTaskExtractionInput
} from './meetingTaskExtractionPayload.js';

const GEMINI_GENERATE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
              { text: buildMeetingTaskExtractionInput({ meeting, users }) }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: MEETING_TASK_EXTRACTION_SCHEMA
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
