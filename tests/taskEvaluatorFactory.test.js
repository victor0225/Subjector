import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskEvaluator } from '../src/services/taskEvaluatorFactory.js';

const task = {
  id: 'task-1',
  title: '센서 후보 정리',
  status: '수락',
  importance: '🔴 상',
  coordination: '🟡 중',
  context: {}
};

function sufficientPayload() {
  return JSON.stringify({
    verdict: 'sufficient',
    score: 90,
    summary: '충분합니다.',
    reasons: ['근거가 있습니다.'],
    missingItems: [],
    feedbackToUser: '완료 처리 가능합니다.'
  });
}

test('createTaskEvaluator selects Gemini from config', async () => {
  const calls = [];
  const evaluator = createTaskEvaluator({
    config: {
      ai: { evaluationProvider: 'gemini' },
      gemini: { apiKey: 'gemini-key', evaluationModel: 'gemini-3.5-flash' },
      openai: { apiKey: 'sk-key', evaluationModel: 'gpt-5.2' }
    },
    fetchImpl: async (url, input) => {
      calls.push([url, input]);
      return {
        ok: true,
        json: async () => ({ output_text: sufficientPayload() })
      };
    }
  });

  const result = await evaluator.evaluateSubmission({
    actionId: 'task_complete',
    actionLabel: '완료',
    task,
    rawText: '[완료 제출 결과]'
  });

  assert.equal(result.verdict, 'sufficient');
  assert.equal(calls[0][0], 'https://generativelanguage.googleapis.com/v1beta/interactions');
});

test('createTaskEvaluator selects OpenAI from config', async () => {
  const calls = [];
  const evaluator = createTaskEvaluator({
    config: {
      ai: { evaluationProvider: 'openai' },
      gemini: { apiKey: 'gemini-key', evaluationModel: 'gemini-3.5-flash' },
      openai: { apiKey: 'sk-key', evaluationModel: 'gpt-5.2' }
    },
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
                  text: sufficientPayload()
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
    rawText: '[완료 제출 결과]'
  });

  assert.equal(result.verdict, 'sufficient');
  assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
});
