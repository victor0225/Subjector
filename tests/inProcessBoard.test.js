import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInProcessBoardMessage,
  buildInProcessMessagePurpose,
  buildTaskDetailThreadMessage,
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
  assert.match(message.text, /상세 근거: 스레드 참고/);
});

test('buildInProcessBoardMessage orders important tasks first', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      {
        id: 'task-low',
        title: '낮은 중요도 task',
        status: '미시작',
        importance: '🟢 하',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      },
      {
        id: 'task-high',
        title: '높은 중요도 task',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      },
      {
        id: 'task-mid',
        title: '중간 중요도 task',
        status: '미시작',
        importance: '🟡 중',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });

  assert.ok(message.text.indexOf('높은 중요도 task') < message.text.indexOf('중간 중요도 task'));
  assert.ok(message.text.indexOf('중간 중요도 task') < message.text.indexOf('낮은 중요도 task'));
});

test('buildTaskDetailThreadMessage explains task rationale and acceptance criteria', () => {
  const message = buildTaskDetailThreadMessage({
    user,
    task: {
      title: 'ESP32 센서 후보 비교',
      importance: '🔴 상',
      coordination: '🟡 중',
      context: {
        source: '회의 결과록 2026-06-28',
        why: ['라즈베리파이에서 ESP32로 변경 가능성을 검토하기로 함'],
        assignmentReason: ['수현님이 하드웨어 변경 논의를 주도함'],
        completionCriteria: ['ESP32 후보 3개 이상 비교', '추천안 1개와 근거 작성'],
        dependencies: ['민성님 데이터 수집 구조 task에 영향 가능'],
        confidence: '중간'
      }
    }
  });

  assert.match(message.text, /task 상세 맥락/);
  assert.match(message.text, /왜 생긴 task인가/);
  assert.match(message.text, /라즈베리파이에서 ESP32/);
  assert.match(message.text, /왜 수현님 담당인가/);
  assert.match(message.text, /완료 기준/);
  assert.match(message.text, /의존성/);
  assert.match(message.text, /확신도/);
});

test('buildTaskDetailThreadMessage uses task goal as rationale fallback', () => {
  const message = buildTaskDetailThreadMessage({
    user,
    task: {
      title: '센서 후보 정리',
      importance: '🟡 중',
      coordination: '🟡 중',
      context: {
        source: '회의 결과록',
        goal: 'ESP32와 라즈베리파이를 비교한다.'
      }
    }
  });

  assert.match(message.text, /왜 생긴 task인가/);
  assert.match(message.text, /ESP32와 라즈베리파이를 비교한다/);
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

test('buildInProcessBoardMessage highlights needs-revision tasks as red', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '보완 필요',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });

  assert.match(message.text, /🔴 `보완 필요`/);
});

test('buildInProcessBoardMessage lets users submit revisions for needs-revision tasks', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '보완 필요',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });

  const actions = message.blocks.find((block) => block.type === 'actions');

  assert.equal(actions.elements[1].action_id, 'task_complete');
  assert.equal(actions.elements[1].text.text, '보완 제출');
});
