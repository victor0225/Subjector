import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiMeetingTaskExtractor } from '../src/services/openaiMeetingTaskExtractor.js';

const users = [
  { key: 'suhyeon', displayName: '수현' },
  { key: 'joeun', displayName: '조은' },
  { key: 'minsung', displayName: '민성' }
];

test('createOpenAiMeetingTaskExtractor asks OpenAI for structured task candidates', async () => {
  const calls = [];
  const extractor = createOpenAiMeetingTaskExtractor({
    apiKey: 'sk-openai-key',
    model: 'gpt-5.4',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return {
        ok: true,
        async json() {
          return {
            output: [
              {
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      tasks: [
                        {
                          assigneeUserKey: 'joeun',
                          title: '실내 측위 후보 비교',
                          importance: '상',
                          coordination: '중',
                          why: '회의에서 후보를 좁히기로 했다.',
                          assignmentReason: '조은님이 조사 담당으로 언급되었다.',
                          completionCriteria: ['후보 비교표 작성'],
                          dependencies: ['민성님의 하드웨어 제약 확인'],
                          confidence: '높음'
                        }
                      ]
                    })
                  }
                ]
              }
            ]
          };
        },
        async text() {
          return '';
        }
      };
    }
  });

  const result = await extractor.extractTasks({
    meeting: {
      summary: {
        transcript: {
          meetingTitle: '산기대학로 회의',
          conciseSummary: '후속 task를 정했다.',
          speakers: [{ label: 'Speaker A' }],
          segments: [{ speaker: 'Speaker A', text: '조은님이 후보를 비교해 주세요.' }]
        }
      },
      speakerMapping: { 'Speaker A': 'suhyeon' }
    },
    users
  });

  assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
  const requestBody = JSON.parse(calls[0][1].body);
  assert.equal(requestBody.model, 'gpt-5.4');
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(requestBody.text.format.schema.additionalProperties, false);
  assert.equal(requestBody.text.format.schema.properties.tasks.items.additionalProperties, false);
  assert.deepEqual(
    requestBody.text.format.schema.properties.tasks.items.required,
    ['assigneeUserKey', 'title', 'importance', 'coordination', 'why', 'assignmentReason', 'completionCriteria', 'dependencies', 'confidence']
  );
  assert.match(calls[0][1].headers.Authorization, /Bearer sk-openai-key/);
  assert.match(calls[0][1].body, /Speaker A/);
  assert.match(calls[0][1].body, /joeun/);
  assert.equal(result[0].assigneeUserKey, 'joeun');
  assert.equal(result[0].importance, '🔴 상');
});

test('createOpenAiMeetingTaskExtractor redacts API keys in errors', async () => {
  const extractor = createOpenAiMeetingTaskExtractor({
    apiKey: 'secret-openai-key',
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      async text() {
        return 'quota exceeded secret-openai-key';
      }
    })
  });

  await assert.rejects(
    () => extractor.extractTasks({
      meeting: { summary: { transcript: {} }, speakerMapping: {} },
      users
    }),
    (error) => {
      assert.match(error.message, /OpenAI meeting task extraction failed/);
      assert.doesNotMatch(error.message, /secret-openai-key/);
      return true;
    }
  );
});
