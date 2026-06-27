import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodexPrompt } from '../src/domain/codexPrompt.js';

const assignee = {
  key: 'joeun',
  slackId: 'U2',
  fullName: '김조은',
  displayName: '조은'
};

const task = {
  title: 'ESP32와 라즈베리파이 비교 후 추천안 작성',
  importance: '🔴 상',
  coordination: '🔴 상',
  estimate: '2 hr'
};

const context = {
  meetingContext: [
    '기존에는 라즈베리파이를 고려했다.',
    'ESP32가 센서 연결, 전력, 시연 안정성 측면에서 더 적합할 수 있다는 의견이 나왔다.'
  ],
  knownDecisions: ['회의 결과는 #회의-결과록에 기록한다.'],
  unknownDecisions: ['ESP32로 최종 확정할지 아직 확인 대기다.'],
  dependencies: ['조수현 모델 실행 구조 검토', '배민성 Wi-Fi 연결 테스트']
};

test('buildCodexPrompt includes assignee, task, commands, and output contracts', () => {
  const prompt = buildCodexPrompt({
    projectName: 'Subjector',
    assignee,
    task,
    context
  });

  assert.match(prompt, /조은님/);
  assert.match(prompt, /ESP32와 라즈베리파이 비교/);
  assert.match(prompt, /오늘은 여기까지/);
  assert.match(prompt, /완료 제출 결과 작성해줘/);
  assert.match(prompt, /A: personal\/internal adjustment/);
  assert.match(prompt, /\[완료 제출 결과\]/);
  assert.match(prompt, /\[오늘의 진행 상태\]/);
});

test('buildCodexPrompt includes impacted-person guardrails', () => {
  const prompt = buildCodexPrompt({
    projectName: 'Subjector',
    assignee,
    task,
    context
  });

  assert.match(prompt, /조수현/);
  assert.match(prompt, /김조은/);
  assert.match(prompt, /배민성/);
  assert.match(prompt, /변경 요청 초안/);
});
