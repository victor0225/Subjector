import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInProcessBoardMessage,
  buildInProcessMessagePurpose,
  formatKstDate
} from '../src/domain/inProcessBoard.js';

const user = {
  key: 'suhyeon',
  fullName: '조수현',
  displayName: '수현'
};

test('buildInProcessMessagePurpose is stable per user', () => {
  assert.equal(buildInProcessMessagePurpose(user), 'in_process:suhyeon');
});

test('formatKstDate returns the work date in Asia/Seoul', () => {
  const date = new Date('2026-06-27T16:00:00.000Z');

  assert.equal(formatKstDate(date), '2026-06-28');
});

test('buildInProcessBoardMessage shows an empty task state', () => {
  const message = buildInProcessBoardMessage({
    user,
    tasks: [],
    workDate: '2026-06-28'
  });

  assert.match(message.text, /수현님 task/);
  assert.match(message.text, /상태: 출근 확인됨/);
  assert.match(message.text, /현재 배정된 task가 없습니다/);
  assert.match(message.text, /회의 결과나 변경 제안/);
  assert.equal(message.blocks[0].type, 'section');
});

test('buildInProcessBoardMessage includes assigned task summaries', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      {
        title: '센서 후보 정리',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록 2026-06-28' }
      }
    ]
  });

  assert.match(message.text, /센서 후보 정리/);
  assert.match(message.text, /🟡 `미시작`/);
  assert.match(message.text, /🔴 상/);
  assert.match(message.text, /🟡 중/);
  assert.match(message.text, /회의 결과록 2026-06-28/);
});

test('buildInProcessBoardMessage attaches the four MVP task action buttons', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });

  const actions = message.blocks.find((block) => block.type === 'actions');

  assert.ok(actions);
  assert.deepEqual(actions.elements.map((element) => element.action_id), [
    'task_accept_generate_prompt',
    'task_complete',
    'task_stop_today',
    'task_change_request'
  ]);
  assert.deepEqual(actions.elements.map((element) => element.text.text), [
    '수락 및 Codex 프롬프트 생성',
    '완료',
    '오늘은 여기까지',
    '변경 요청'
  ]);
  assert.ok(actions.elements.every((element) => element.value.includes('task-1')));
  assert.ok(actions.elements.every((element) => element.value.includes('suhyeon')));
});

test('buildInProcessBoardMessage replaces accept button with prompt copy after task acceptance', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '수락',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });

  const actions = message.blocks.find((block) => block.type === 'actions');

  assert.match(message.text, /🟡 `수락`/);
  assert.deepEqual(actions.elements.map((element) => element.action_id), [
    'copy_codex_prompt',
    'task_complete',
    'task_stop_today',
    'task_change_request'
  ]);
  assert.deepEqual(actions.elements.map((element) => element.text.text), [
    'Codex 프롬프트 보기/복사',
    '완료',
    '오늘은 여기까지',
    '변경 요청'
  ]);
  assert.equal(actions.elements[0].value, 'task-1');
  assert.equal(actions.elements.some((element) => element.action_id === 'task_accept_generate_prompt'), false);
});
