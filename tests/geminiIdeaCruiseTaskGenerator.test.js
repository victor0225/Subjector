import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiIdeaCruiseTaskGenerator } from '../src/services/geminiIdeaCruiseTaskGenerator.js';

test('createGeminiIdeaCruiseTaskGenerator creates task candidates and not-task notes from completed topic pages', async () => {
  const calls = [];
  const generator = createGeminiIdeaCruiseTaskGenerator({
    apiKey: 'gemini-key',
    model: 'gemini-2.5-flash-lite',
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
                            pageId: 'page-1',
                            pageNumber: 1,
                            title: '폭음 데이터셋 라이선스 확인',
                            neededInfo: 'AudioSet, ESC-50, UrbanSound8K 라이선스와 위험음 라벨 구조',
                            doneCriteria: '후보별 사용 가능 여부와 제외 이유를 표로 정리',
                            importance: '높음'
                          }
                        ],
                        notTasks: [
                          'AudioSet이 무엇인지 설명하기',
                          '공사현장용으로 좁히는 회의 내 결정'
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

  assert.match(calls[0][0], /gemini-2\.5-flash-lite:generateContent/);
  assert.match(calls[0][0], /key=gemini-key/);
  assert.match(calls[0][1].body, /공사현장 위험음 감지/);
  assert.match(calls[0][1].body, /시간을 써야만 해결되는 일만 task/);
  assert.equal(result.tasks[0].title, '폭음 데이터셋 라이선스 확인');
  assert.equal(result.tasks[0].assignee, '미배정');
  assert.deepEqual(result.notTasks, [
    'AudioSet이 무엇인지 설명하기',
    '공사현장용으로 좁히는 회의 내 결정'
  ]);
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
