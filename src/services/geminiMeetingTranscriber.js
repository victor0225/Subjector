import { normalizeMeetingTranscript } from '../domain/meetingTranscript.js';

const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_GENERATE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const MEETING_TRANSCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    meetingTitle: { type: 'string' },
    conciseSummary: { type: 'string' },
    speakers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          evidence: { type: 'string' }
        },
        required: ['label', 'evidence']
      }
    },
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          speaker: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['speaker', 'startTime', 'endTime', 'text']
      }
    },
    decisions: {
      type: 'array',
      items: { type: 'string' }
    },
    actionItems: {
      type: 'array',
      items: { type: 'string' }
    },
    openQuestions: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['meetingTitle', 'conciseSummary', 'speakers', 'segments', 'decisions', 'actionItems']
};

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

function buildTranscriptionPrompt({ teamMembers = [] }) {
  const memberNames = teamMembers.map((member) => `${member.displayName}님`).join(', ') || '수현님, 조은님, 민성님';

  return [
    '너는 Subjector의 회의 전사 엔진이다.',
    `팀원 후보는 ${memberNames}이다.`,
    '녹음 파일을 한국어 중심으로 전사하고, 실제 이름을 확정하지 말고 Speaker A/B/C 형식으로만 화자를 구분한다.',
    '각 Speaker의 evidence에는 목소리 특징이 아니라 발언 맥락 근거를 짧게 적는다.',
    '잡음, 침묵, 반복 추임새는 줄이고 task 판단에 필요한 발언을 보존한다.',
    '타임스탬프는 HH:MM:SS 또는 MM:SS 형식으로 적는다.',
    '반드시 JSON만 출력한다.'
  ].join('\n');
}

async function readErrorBody(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function fetchGemini({ fetchImpl, url, options, stage, apiKey }) {
  try {
    return await fetchImpl(url, options);
  } catch (error) {
    const message = sanitizeErrorBody(error.message, apiKey);
    throw new Error(`Gemini ${stage} request failed: ${message}`, { cause: error });
  }
}

export function createGeminiMeetingTranscriber({ apiKey, model = 'gemini-3.5-flash', fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    throw new Error('Gemini meeting transcriber requires an API key');
  }

  if (!fetchImpl) {
    throw new Error('Gemini meeting transcriber requires fetch');
  }

  async function uploadAudio({ bytes, mimeType, fileName }) {
    const startResponse = await fetchGemini({
      fetchImpl,
      url: GEMINI_UPLOAD_URL,
      stage: 'file upload start',
      apiKey,
      options: {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
          'X-Goog-Upload-Header-Content-Type': mimeType
        },
        body: JSON.stringify({
          file: {
            display_name: fileName
          }
        })
      }
    });

    if (!startResponse.ok) {
      const body = sanitizeErrorBody(await readErrorBody(startResponse), apiKey);
      throw new Error(`Gemini file upload failed: ${startResponse.status} ${body}`);
    }

    const uploadUrl = startResponse.headers?.get?.('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('Gemini file upload failed: missing upload URL');
    }

    const finalizeResponse = await fetchGemini({
      fetchImpl,
      url: uploadUrl,
      stage: 'file upload finalize',
      apiKey,
      options: {
        method: 'POST',
        headers: {
          'Content-Length': String(bytes.byteLength),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: bytes
      }
    });

    if (!finalizeResponse.ok) {
      const body = sanitizeErrorBody(await readErrorBody(finalizeResponse), apiKey);
      throw new Error(`Gemini file upload failed: ${finalizeResponse.status} ${body}`);
    }

    const payload = await finalizeResponse.json();
    if (!payload?.file?.uri) {
      throw new Error('Gemini file upload failed: missing file URI');
    }

    return payload.file;
  }

  async function transcribeMeeting({ bytes, mimeType, fileName, teamMembers = [] }) {
    const file = await uploadAudio({ bytes, mimeType, fileName });
    const response = await fetchGemini({
      fetchImpl,
      url: `${GEMINI_GENERATE_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      stage: 'meeting transcription',
      apiKey,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: buildTranscriptionPrompt({ teamMembers }) },
                {
                  file_data: {
                    mime_type: file.mimeType || mimeType,
                    file_uri: file.uri
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: MEETING_TRANSCRIPT_SCHEMA
          }
        })
      }
    });

    if (!response.ok) {
      const body = sanitizeErrorBody(await readErrorBody(response), apiKey);
      throw new Error(`Gemini meeting transcription failed: ${response.status} ${body}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error('Gemini meeting transcription failed: empty response');
    }

    return normalizeMeetingTranscript(JSON.parse(outputText));
  }

  return {
    transcribeMeeting
  };
}
