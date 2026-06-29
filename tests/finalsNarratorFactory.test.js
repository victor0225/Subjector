import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalsNarrator } from '../src/services/finalsNarratorFactory.js';

function narrativePayload() {
  return JSON.stringify({
    projectOverview: '프로젝트는 ESP32 연결 검증 단계로 넘어가고 있습니다.',
    memberProgress: ['수현님은 개발 환경 정리를 완료했습니다.'],
    nextFocus: ['내일은 회로 연결 위험을 확인합니다.']
  });
}

test('createFinalsNarrator selects Gemini from config', async () => {
  const calls = [];
  const narrator = createFinalsNarrator({
    config: {
      ai: { finalsSummaryProvider: 'gemini' },
      gemini: { apiKey: 'gemini-key', finalsSummaryModel: 'gemini-3.5-flash' },
      openai: { apiKey: 'sk-key', finalsSummaryModel: 'gpt-5.4' }
    },
    fetchImpl: async (url, input) => {
      calls.push([url, input]);
      return {
        ok: true,
        json: async () => ({ output_text: narrativePayload() })
      };
    }
  });

  const result = await narrator.narrate({
    workDate: '2026-06-28',
    tasks: [],
    results: [],
    changeRequests: [],
    users: []
  });

  assert.match(result.projectOverview, /ESP32 연결 검증/);
  assert.equal(calls[0][0], 'https://generativelanguage.googleapis.com/v1beta/interactions');
});

test('createFinalsNarrator selects OpenAI from config', async () => {
  const calls = [];
  const narrator = createFinalsNarrator({
    config: {
      ai: { finalsSummaryProvider: 'openai' },
      gemini: { apiKey: 'gemini-key', finalsSummaryModel: 'gemini-3.5-flash' },
      openai: { apiKey: 'sk-key', finalsSummaryModel: 'gpt-5.4' }
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
                  text: narrativePayload()
                }
              ]
            }
          ]
        })
      };
    }
  });

  const result = await narrator.narrate({
    workDate: '2026-06-28',
    tasks: [],
    results: [],
    changeRequests: [],
    users: []
  });

  assert.match(result.projectOverview, /ESP32 연결 검증/);
  assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
});
