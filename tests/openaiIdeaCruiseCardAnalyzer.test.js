import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiIdeaCruiseCardAnalyzer } from '../src/services/openaiIdeaCruiseCardAnalyzer.js';

test('createOpenAiIdeaCruiseCardAnalyzer asks OpenAI for contextual live intervention cards', async () => {
  const calls = [];
  const analyzer = createOpenAiIdeaCruiseCardAnalyzer({
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
                      cards: [
                        {
                          type: '데이터 후보',
                          tag: 'info',
                          kind: 'answer',
                          title: '폭음 정의부터 고정',
                          body: '총성, 폭발음, 공사장 충격음 중 어느 소리를 막을지 먼저 나눠야 합니다.',
                          suggestion: '전장 폭음 차단 목적이라면 총성/폭발음/충격음을 별도 데이터 범주로 나누고 공개 sound event dataset 후보를 비교합니다.',
                          details: [
                            { title: 'AudioSet', body: '넓은 오디오 이벤트 탐색용입니다.' },
                            { title: 'ESC-50', body: '빠른 환경음 실험용입니다.' },
                            { title: 'UrbanSound8K', body: '도시/공사장 소음 검토용입니다.' }
                          ],
                          choices: []
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

  const result = await analyzer.analyze({
    entryText: '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터는 무엇인가?',
    completedEntries: ['헤드셋 목적은 전장 소음 대응'],
    meetingContexts: ['최근 전사: 공사현장용과 전장용 헤드셋 방향이 충돌할 수 있음'],
    githubOrganization: 'https://github.com/SAFIRA-ondevice'
  });

  assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
  const requestBody = JSON.parse(calls[0][1].body);
  assert.equal(requestBody.model, 'gpt-5.4');
  assert.equal(requestBody.text.format.strict, true);
  assert.match(calls[0][1].headers.Authorization, /Bearer sk-openai-key/);
  assert.match(calls[0][1].body, /전장 상황에서 폭음을 막아주는 역할/);
  assert.match(calls[0][1].body, /SAFIRA-ondevice/);
  assert.match(calls[0][1].body, /최근 전사/);
  assert.equal(result[0].title, '폭음 정의부터 고정');
  assert.equal(result[0].suggestion.includes('공개 sound event dataset'), true);
  assert.equal(result[0].kind, 'answer');
  assert.equal(result[0].details.length, 3);
  assert.equal(result[0].details[0].title, 'AudioSet');
  assert.deepEqual(result[0].choices, []);
  assert.match(calls[0][1].body, /즉시 답변/);
  assert.match(calls[0][1].body, /details/);
  assert.match(calls[0][1].body, /choices/);
});

test('createOpenAiIdeaCruiseCardAnalyzer redacts API keys in errors', async () => {
  const analyzer = createOpenAiIdeaCruiseCardAnalyzer({
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
    () => analyzer.analyze({ entryText: '테스트 질문' }),
    (error) => {
      assert.match(error.message, /OpenAI IDEA CRUISE card analysis failed/);
      assert.doesNotMatch(error.message, /secret-openai-key/);
      return true;
    }
  );
});
