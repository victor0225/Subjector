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

  assert.match(message.text, /수현님 팀 진행 과정 보드/);
  assert.doesNotMatch(message.text, /상태: 출근 확인됨/);
  assert.match(message.text, /기준일: 2026-06-28/);
  assert.match(message.text, /현재 공유할 진행 task가 없습니다/);
  assert.match(message.text, /개인 task 진행 상태/);
  assert.equal(message.blocks[0].type, 'section');
});

test('buildInProcessBoardMessage shows read-only team task summaries', () => {
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
        context: {
          why: '센서 선택 기준이 정해져야 다음 개발 방향을 잡을 수 있음',
          neededInfo: '가격, 전력, 구현 난이도',
          doneCriteria: '비교표와 추천안 1개'
        }
      }
    ]
  });

  assert.match(message.text, /센서 후보 정리/);
  assert.match(message.text, /🟡 `미시작`/);
  assert.match(message.text, /🔴 상/);
  assert.match(message.text, /세부사항: 센서 선택 기준이 정해져야 다음 개발 방향을 잡을 수 있음/);
  assert.doesNotMatch(message.text, /해야 할 일/);
  assert.doesNotMatch(message.text, /확인할 것/);
  assert.doesNotMatch(message.text, /완료 기준/);
  assert.equal(message.blocks.some((block) => block.type === 'actions'), false);
});

test('buildInProcessBoardMessage keeps personal DM task board details and actions', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    boardLabel: '개인 task 보드',
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: {
          why: '센서 선택 기준이 정해져야 다음 개발 방향을 잡을 수 있음',
          neededInfo: '가격, 전력, 구현 난이도',
          doneCriteria: '비교표와 추천안 1개'
        }
      }
    ]
  });

  assert.match(message.text, /해야 할 일: 센서 선택 기준이 정해져야 다음 개발 방향을 잡을 수 있음/);
  assert.match(message.text, /확인할 것: 가격, 전력, 구현 난이도/);
  assert.match(message.text, /완료 기준: 비교표와 추천안 1개/);
  assert.equal(message.blocks.some((block) => block.type === 'actions'), true);
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
        neededInfo: ['가격', '전력', '개발 난이도'],
        assignmentReason: ['수현님이 하드웨어 변경 논의를 주도함'],
        completionCriteria: ['ESP32 후보 3개 이상 비교', '추천안 1개와 근거 작성'],
        dependencies: ['민성님 데이터 수집 구조 task에 영향 가능'],
        confidence: '중간'
      }
    }
  });

  assert.match(message.text, /task 실행 정보/);
  assert.match(message.text, /왜 하는가/);
  assert.match(message.text, /라즈베리파이에서 ESP32/);
  assert.match(message.text, /확인할 것/);
  assert.match(message.text, /가격/);
  assert.match(message.text, /완료 기준/);
  assert.doesNotMatch(message.text, /왜 수현님 담당인가/);
  assert.doesNotMatch(message.text, /의존성/);
  assert.doesNotMatch(message.text, /확신도/);
  assert.doesNotMatch(message.text, /출처/);
  assert.doesNotMatch(message.text, /조율/);
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

  assert.match(message.text, /왜 하는가/);
  assert.match(message.text, /ESP32와 라즈베리파이를 비교한다/);
});

test('buildInProcessBoardMessage attaches task action buttons including direct work acceptance', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    boardLabel: '개인 task 보드',
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
    'task_accept_direct',
    'task_change_request',
    'task_cleanup'
  ]);
  assert.deepEqual(actions.elements.map((element) => element.text.text), [
    '수락',
    '변경',
    '정리'
  ]);
  assert.ok(actions.elements.every((element) => element.value.includes('task-1')));
  assert.ok(actions.elements.every((element) => element.value.includes('suhyeon')));
});

test('buildInProcessBoardMessage replaces accept button with prompt copy after task acceptance', () => {
  const message = buildInProcessBoardMessage({
    user,
    workDate: '2026-06-28',
    boardLabel: '개인 task 보드',
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
    'task_file_submission',
    'task_change_request',
    'task_cleanup'
  ]);
  assert.deepEqual(actions.elements.map((element) => element.text.text), [
    '도움 받기',
    '작업 제출',
    '변경',
    '정리'
  ]);
  assert.equal(actions.elements[0].value, 'task-1');
  assert.equal(actions.elements.some((element) => element.action_id === 'task_accept_generate_prompt'), false);
  assert.equal(actions.elements.some((element) => element.action_id === 'task_file_submission'), true);
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
    boardLabel: '개인 task 보드',
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

  assert.equal(actions.elements[1].action_id, 'task_file_submission');
  assert.equal(actions.elements[1].text.text, '작업 제출');
});
