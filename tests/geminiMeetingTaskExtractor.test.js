import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiMeetingTaskExtractor } from '../src/services/geminiMeetingTaskExtractor.js';

const users = [
  { key: 'suhyeon', displayName: '수현' },
  { key: 'joeun', displayName: '조은' },
  { key: 'minsung', displayName: '민성' }
];

test('createGeminiMeetingTaskExtractor asks Gemini for structured task candidates', async () => {
  const calls = [];
  const extractor = createGeminiMeetingTaskExtractor({
    apiKey: 'gemini-key',
    model: 'gemini-3.5-flash',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return {
        ok: true,
        async json() {
          return {
            candidates: [
              {
                content: {
                  parts: [
                    {
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

  assert.equal(calls[0][0], 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=gemini-key');
  assert.match(calls[0][1].body, /Speaker A/);
  assert.match(calls[0][1].body, /joeun/);
  assert.equal(result[0].assigneeUserKey, 'joeun');
  assert.equal(result[0].importance, '🔴 상');
});

test('createGeminiMeetingTaskExtractor redacts API keys in errors', async () => {
  const extractor = createGeminiMeetingTaskExtractor({
    apiKey: 'secret-gemini-key',
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      async text() {
        return 'bad request secret-gemini-key';
      }
    })
  });

  await assert.rejects(
    () => extractor.extractTasks({
      meeting: { summary: { transcript: {} }, speakerMapping: {} },
      users
    }),
    (error) => {
      assert.match(error.message, /Gemini meeting task extraction failed/);
      assert.doesNotMatch(error.message, /secret-gemini-key/);
      return true;
    }
  );
});
