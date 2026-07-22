import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiIdeaCruiseTaskGenerator } from '../src/services/openaiIdeaCruiseTaskGenerator.js';

test('createOpenAiIdeaCruiseTaskGenerator creates task candidates with GPT structured output', async () => {
  const calls = [];
  const generator = createOpenAiIdeaCruiseTaskGenerator({
    apiKey: 'sk-openai-key',
    model: 'gpt-5.4',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return {
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              newTasks: [
                {
                  pageId: 'roadmap-learning',
                  pageNumber: 2,
                  title: 'EfficientAT 데이터 전처리 기준 조사',
                  neededInfo: '드론 소리, 사람 말소리, 헬리콥터 소리 데이터 전처리 방식',
                  doneCriteria: 'EfficientAT 입력 기준에 맞는 데이터셋/전처리 표 정리',
                  importance: '높음',
                  reason: '회의에서 모델 방향은 정했지만 데이터 전처리는 별도 시간이 필요하다.'
                }
              ],
              existingTaskUpdates: [
                {
                  taskId: 'task-1',
                  existingTaskTitle: 'MANET 통신 프로토콜 설계',
                  addNeededInfo: '라즈베리파이 2대 간 거리별 지연 기준',
                  doneCriteriaChange: '통신 방식별 지연/안정성 비교 포함',
                  reason: '새 task보다 기존 통신 task의 기준 보강에 가깝다.'
                }
              ],
              notTasks: [
                { content: '기성 차음 귀마개 개조 결정', reason: '회의에서 이미 결정됨' }
              ]
            })
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
        id: 'roadmap-learning',
        number: 2,
        title: '라즈베리 파이 학습부',
        text: 'EfficientAT 기반 소리 분류 AI 모델 구축 및 데이터 전처리 방안'
      }
    ],
    currentTasks: [{ id: 'task-1', title: 'MANET 통신 프로토콜 설계', context: { neededInfo: '통신 방식' } }],
    meetingRecord: '회의록: 기성 차음 귀마개를 개조하고 EfficientAT를 검토하기로 함'
  });

  const [url, options] = calls[0];
  const body = JSON.parse(options.body);
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(options.headers.Authorization, 'Bearer sk-openai-key');
  assert.equal(body.model, 'gpt-5.4');
  assert.equal(body.text.format.name, 'idea_cruise_task_candidates');
  assert.equal(body.text.format.strict, true);
  assert.match(JSON.stringify(body.input), /EfficientAT 기반 소리 분류/);
  assert.match(JSON.stringify(body.input), /Meeting materials/);
  assert.equal(result.tasks[0].title, 'EfficientAT 데이터 전처리 기준 조사');
  assert.equal(result.tasks[0].assignee, '미배정');
  assert.equal(result.existingTaskUpdates[0].taskId, 'task-1');
  assert.equal(result.notTasks[0].content, '기성 차음 귀마개 개조 결정');
});

test('createOpenAiIdeaCruiseTaskGenerator redacts API keys in errors', async () => {
  const generator = createOpenAiIdeaCruiseTaskGenerator({
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
    () => generator.generate({ completedPages: [{ id: 'page-1', number: 1, title: '테스트', text: '내용' }] }),
    (error) => {
      assert.match(error.message, /OpenAI IDEA CRUISE task generation failed/);
      assert.doesNotMatch(error.message, /secret-openai-key/);
      return true;
    }
  );
});
