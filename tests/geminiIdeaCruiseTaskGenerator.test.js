import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiIdeaCruiseTaskGenerator } from '../src/services/geminiIdeaCruiseTaskGenerator.js';

test('createGeminiIdeaCruiseTaskGenerator separates new tasks, existing task boosts, and not-task notes', async () => {
  const calls = [];
  const generator = createGeminiIdeaCruiseTaskGenerator({
    apiKey: 'gemini-key',
    model: 'gemini-2.5-flash',
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
                        newTasks: [
                          {
                            pageId: 'page-1',
                            pageNumber: 1,
                            title: '폭음 데이터셋 라이선스 확인',
                            neededInfo: 'AudioSet, ESC-50, UrbanSound8K 라이선스와 위험음 라벨 구조',
                            doneCriteria: '후보별 사용 가능 여부와 제외 이유를 표로 정리',
                            importance: '높음',
                            reason: '기존 하드웨어 task와 산출물이 다르다.'
                          }
                        ],
                        existingTaskUpdates: [
                          {
                            taskId: 'task-1',
                            existingTaskTitle: '하드웨어 후보 비교 기준 확정',
                            addNeededInfo: '1차 개발 보드와 최종 목표 보드를 분리해서 비교',
                            doneCriteriaChange: '비교표에 최종 추천 후보 1개 포함',
                            reason: '새 task가 아니라 기존 task의 판단 기준을 선명하게 한다.'
                          }
                        ],
                        notTasks: [
                          { content: 'AudioSet이 무엇인지 설명하기', reason: '즉시 답변으로 해결됨' },
                          { content: '공사현장용으로 좁히는 회의 내 결정', reason: '회의에서 결정할 내용' }
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

  const result = await generator.generate({
    completedPages: [
      {
        id: 'page-1',
        number: 1,
        title: '폭음 데이터',
        text: '공사현장 위험음 감지로 좁힘\n[조사할 것]\n- AudioSet, ESC-50 라이선스 확인'
      }
    ]
  });

  assert.match(calls[0][0], /gemini-2\.5-flash:generateContent/);
  assert.match(calls[0][0], /key=gemini-key/);
  assert.match(calls[0][1].body, /공사현장 위험음 감지/);
  assert.match(calls[0][1].body, /시간을 써야만 해결되는 일만 task/);
  assert.match(calls[0][1].body, /Current in-process tasks/);
  assert.match(calls[0][1].body, /Meeting materials/);
  assert.equal(result.tasks[0].title, '폭음 데이터셋 라이선스 확인');
  assert.equal(result.tasks[0].reason, '기존 하드웨어 task와 산출물이 다르다.');
  assert.equal(result.tasks[0].assignee, '미배정');
  assert.equal(result.existingTaskUpdates[0].taskId, 'task-1');
  assert.equal(result.existingTaskUpdates[0].addNeededInfo, '1차 개발 보드와 최종 목표 보드를 분리해서 비교');
  assert.equal(result.existingTaskUpdates[0].doneCriteriaChange, '비교표에 최종 추천 후보 1개 포함');
  assert.deepEqual(result.notTasks, [
    { id: result.notTasks[0].id, content: 'AudioSet이 무엇인지 설명하기', reason: '즉시 답변으로 해결됨' },
    { id: result.notTasks[1].id, content: '공사현장용으로 좁히는 회의 내 결정', reason: '회의에서 결정할 내용' }
  ]);
});

test('createGeminiIdeaCruiseTaskGenerator includes meeting materials in the prompt', async () => {
  let requestBody = '';
  const generator = createGeminiIdeaCruiseTaskGenerator({
    apiKey: 'gemini-key',
    fetchImpl: async (url, options) => {
      requestBody = options.body;
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
                        newTasks: [],
                        existingTaskUpdates: [],
                        notTasks: []
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

  await generator.generate({
    completedPages: [{ id: 'roadmap-comm', number: 1, title: '헤드셋 통신부', text: '라즈베리파이 통신 기준' }],
    currentTasks: [],
    meetingRecord: '회의 녹음본 전사: 5~10m 통신을 우선 확인하기로 함'
  });

  assert.match(requestBody, /Meeting materials/);
  assert.match(requestBody, /회의 녹음본 전사: 5~10m 통신을 우선 확인하기로 함/);
});

test('createGeminiIdeaCruiseTaskGenerator redacts API keys in errors', async () => {
  const generator = createGeminiIdeaCruiseTaskGenerator({
    apiKey: 'secret-gemini-key',
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      async text() {
        return 'quota exceeded secret-gemini-key';
      }
    })
  });

  await assert.rejects(
    () => generator.generate({ completedPages: [{ id: 'page-1', number: 1, title: '테스트', text: '내용' }] }),
    (error) => {
      assert.match(error.message, /Gemini IDEA CRUISE task generation failed/);
      assert.doesNotMatch(error.message, /secret-gemini-key/);
      return true;
    }
  );
});
