import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiTaskEvaluator } from '../src/services/openaiTaskEvaluator.js';

const task = {
  id: 'task-1',
  title: '센서 후보 정리',
  status: '수락',
  importance: '🔴 상',
  coordination: '🟡 중',
  context: {
    source: '회의 결과록',
    goal: 'ESP32와 라즈베리파이를 비교한다.'
  }
};

test('createOpenAiTaskEvaluator calls Responses API with structured output', async () => {
  const calls = [];
  const evaluator = createOpenAiTaskEvaluator({
    apiKey: 'sk-test',
    model: 'gpt-5.2',
    fetchImpl: async (url, input) => {
      calls.push([url, input]);
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    verdict: 'sufficient',
                    score: 90,
                    summary: '충분합니다.',
                    reasons: ['근거가 있습니다.'],
                    missingItems: [],
                    feedbackToUser: '완료 처리 가능합니다.'
                  })
                }
              ]
            }
          ]
        })
      };
    }
  });

  const result = await evaluator.evaluateSubmission({
    actionId: 'task_complete',
    actionLabel: '완료',
    task,
    rawText: '[완료 제출 결과]\n[결론]\nESP32 추천'
  });

  assert.equal(result.verdict, 'sufficient');
  assert.equal(result.score, 90);
  assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.model, 'gpt-5.2');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.name, 'subjector_task_evaluation');
});

test('createOpenAiTaskEvaluator reports API errors without leaking the key', async () => {
  const evaluator = createOpenAiTaskEvaluator({
    apiKey: 'sk-secret-value',
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      text: async () => 'quota exceeded'
    })
  });

  await assert.rejects(
    () => evaluator.evaluateSubmission({
      actionId: 'task_complete',
      actionLabel: '완료',
      task,
      rawText: '내용'
    }),
    (error) => {
      assert.match(error.message, /OpenAI task evaluation failed/);
      assert.doesNotMatch(error.message, /sk-secret-value/);
      return true;
    }
  );
});
