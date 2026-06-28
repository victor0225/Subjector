import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiTaskEvaluator } from '../src/services/geminiTaskEvaluator.js';

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

test('createGeminiTaskEvaluator calls Gemini API with structured output', async () => {
  const calls = [];
  const evaluator = createGeminiTaskEvaluator({
    apiKey: 'gemini-test-key',
    model: 'gemini-3.5-flash',
    fetchImpl: async (url, input) => {
      calls.push([url, input]);
      return {
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({
            verdict: 'sufficient',
            score: 88,
            summary: '충분합니다.',
            reasons: ['task 목표를 다뤘습니다.'],
            missingItems: [],
            feedbackToUser: '완료 처리 가능합니다.'
          })
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
  assert.equal(result.score, 88);
  assert.equal(calls[0][0], 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(calls[0][1].headers['x-goog-api-key'], 'gemini-test-key');
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.model, 'gemini-3.5-flash');
  assert.equal(body.response_format.mime_type, 'application/json');
  assert.equal(body.response_format.schema.properties.verdict.enum.includes('needs_revision'), true);
});

test('createGeminiTaskEvaluator reports API errors without leaking the key', async () => {
  const evaluator = createGeminiTaskEvaluator({
    apiKey: 'gemini-secret-value',
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
      assert.match(error.message, /Gemini task evaluation failed/);
      assert.doesNotMatch(error.message, /gemini-secret-value/);
      return true;
    }
  );
});

test('createGeminiTaskEvaluator reads text from Interactions REST steps', async () => {
  const evaluator = createGeminiTaskEvaluator({
    apiKey: 'gemini-test-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        id: 'interaction-1',
        object: 'interaction',
        status: 'completed',
        steps: [
          {
            type: 'model_output',
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  verdict: 'needs_revision',
                  score: 45,
                  summary: '근거가 부족합니다.',
                  reasons: ['비교 결과가 구체적이지 않습니다.'],
                  missingItems: ['후보별 장단점'],
                  feedbackToUser: '후보별 비교표를 추가해 주세요.'
                })
              }
            ]
          }
        ]
      })
    })
  });

  const result = await evaluator.evaluateSubmission({
    actionId: 'task_complete',
    actionLabel: '완료',
    task,
    rawText: '[완료 제출 결과]\n비교함'
  });

  assert.equal(result.verdict, 'needs_revision');
  assert.equal(result.score, 45);
  assert.equal(result.blocksCompletion, true);
});
