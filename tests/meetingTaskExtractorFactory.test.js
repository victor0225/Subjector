import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeetingTaskExtractor } from '../src/services/meetingTaskExtractorFactory.js';

const meeting = {
  summary: {
    transcript: {
      meetingTitle: '졸작 회의',
      speakers: [{ label: 'Speaker A' }],
      segments: [{ speaker: 'Speaker A', text: '수현님이 회의 처리 흐름을 점검한다.' }]
    }
  },
  speakerMapping: { 'Speaker A': 'suhyeon' }
};

const users = [{ key: 'suhyeon', displayName: '수현' }];

test('createMeetingTaskExtractor selects OpenAI meeting task extraction from config', async () => {
  const calls = [];
  const extractor = createMeetingTaskExtractor({
    config: {
      ai: { meetingTaskProvider: 'openai' },
      openai: { apiKey: 'sk-key', taskExtractionModel: 'gpt-5.4' },
      gemini: { apiKey: 'gemini-key', taskExtractionModel: 'gemini-3.5-flash' }
    },
    fetchImpl: async (url, input) => {
      calls.push([url, input]);
      return {
        ok: true,
        json: async () => ({ output_text: JSON.stringify({ tasks: [] }) }),
        text: async () => ''
      };
    }
  });

  await extractor.extractTasks({ meeting, users });

  assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
});

test('createMeetingTaskExtractor keeps Gemini available as an explicit fallback', async () => {
  const calls = [];
  const extractor = createMeetingTaskExtractor({
    config: {
      ai: { meetingTaskProvider: 'gemini' },
      openai: { apiKey: 'sk-key', taskExtractionModel: 'gpt-5.4' },
      gemini: { apiKey: 'gemini-key', taskExtractionModel: 'gemini-3.5-flash' }
    },
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ tasks: [] }) }] } }] }),
        text: async () => ''
      };
    }
  });

  await extractor.extractTasks({ meeting, users });

  assert.equal(calls[0], 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=gemini-key');
});
