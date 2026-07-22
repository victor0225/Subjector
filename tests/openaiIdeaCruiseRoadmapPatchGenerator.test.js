import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiIdeaCruiseRoadmapPatchGenerator } from '../src/services/openaiIdeaCruiseRoadmapPatchGenerator.js';

test('createOpenAiIdeaCruiseRoadmapPatchGenerator asks GPT for roadmapPatch only', async () => {
  const calls = [];
  const generator = createOpenAiIdeaCruiseRoadmapPatchGenerator({
    apiKey: 'sk-roadmap-key',
    model: 'gpt-5.4',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return {
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              updatedTopics: [
                {
                  targetId: 'roadmap-sound',
                  title: '헤드셋, ESP32 연결부',
                  text: '기성 차음 귀마개 개조와 ESP32 입력을 기준으로 소리 수집을 정리한다.',
                  fixedItems: ['기성 차음 귀마개 개조를 기준으로 한다.'],
                  meetingEvidence: ['회의: 기성 차음 귀마개 개조 결정']
                }
              ],
              createdTopics: [
                {
                  clientId: 'roadmap-manet',
                  parentId: 'roadmap-comm',
                  title: 'MANET 통신 기준',
                  text: '라즈베리파이 간 MANET 통신 프로토콜을 검토한다.',
                  meetingEvidence: ['회의: MANET 통신 프로토콜 설계 조율']
                }
              ],
              warnings: [
                {
                  targetIds: ['roadmap-sound', 'roadmap-learning'],
                  title: '데이터 기준 확인',
                  body: '소리 수집 기준과 학습 데이터 기준을 맞춰야 한다.'
                }
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
    currentRoadmap: [
      { id: 'roadmap-sound', title: '헤드셋, ESP32 연결부', text: '소리 듣는 부분' }
    ],
    meetingMaterials: '회의: 하드웨어 및 AI 모델 설계\n결정: 기성 차음 귀마개 개조',
    taskSignals: [
      { id: 'task-1', title: '통신 프로토콜 조사', text: 'MANET 방식 후보 비교' }
    ],
    githubSignals: ['repo SAFIRA-ondevice/Soohyun | updated']
  });

  const [url, options] = calls[0];
  const body = JSON.parse(options.body);
  const prompt = JSON.stringify(body.input);
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(options.headers.Authorization, 'Bearer sk-roadmap-key');
  assert.equal(body.model, 'gpt-5.4');
  assert.equal(body.text.format.name, 'idea_cruise_roadmap_patch');
  assert.match(prompt, /Do not create first-floor cards directly from meeting-context/);
  assert.match(prompt, /Do not create first-floor cards directly from Subjector tasks/);
  assert.match(prompt, /meetingEvidence/);
  assert.equal(result.updatedTopics[0].targetId, 'roadmap-sound');
  assert.equal(result.createdTopics[0].parentId, 'roadmap-comm');
  assert.equal(result.warnings[0].targetIds[0], 'roadmap-sound');
});

test('createOpenAiIdeaCruiseRoadmapPatchGenerator redacts API keys in errors', async () => {
  const generator = createOpenAiIdeaCruiseRoadmapPatchGenerator({
    apiKey: 'secret-roadmap-key',
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      async text() {
        return 'server failed secret-roadmap-key';
      }
    })
  });

  await assert.rejects(
    () => generator.generate({ currentRoadmap: [{ id: 'r1', title: '기준', text: '내용' }] }),
    (error) => {
      assert.match(error.message, /OpenAI IDEA CRUISE roadmap patch failed/);
      assert.doesNotMatch(error.message, /secret-roadmap-key/);
      return true;
    }
  );
});
