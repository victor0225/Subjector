import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailySummaryMessage } from '../src/domain/dailySummary.js';

const user = {
  key: 'suhyeon',
  fullName: '조수현',
  displayName: '수현'
};

test('buildDailySummaryMessage summarizes completed, stopped, unresolved, and change-requested tasks', () => {
  const message = buildDailySummaryMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      { id: 'task-1', title: '센서 후보 정리', status: '완료', importance: '🔴 상', coordination: '🟡 중' },
      { id: 'task-2', title: 'UI 흐름 검토', status: '오늘은 여기까지', importance: '🟡 중', coordination: '🟡 중' },
      { id: 'task-3', title: '데이터 수집 기준 정리', status: '미정리', importance: '🟡 중', coordination: '🔴 상' },
      { id: 'task-4', title: '검수 기준 보완', status: '보완 필요', importance: '🔴 상', coordination: '🟡 중' }
    ],
    results: [
      { taskId: 'task-1', taskTitle: '센서 후보 정리', resultType: '완료', rawText: '[완료 제출 결과]\n[결론]\n- ESP32 우선 추천' },
      { taskId: 'task-2', taskTitle: 'UI 흐름 검토', resultType: '오늘은 여기까지', rawText: '[오늘의 진행 상태]\n- 와이어프레임 1차 확인' }
    ],
    changeRequests: [
      { taskId: 'task-2', taskTitle: 'UI 흐름 검토', status: '투표 중', rawText: '[변경 제안]\n- 승인 버튼 문구 변경' }
    ]
  });

  assert.match(message, /수현님, 오늘 한 일 요약입니다/);
  assert.match(message, /2026-06-28/);
  assert.match(message, /완료한 task/);
  assert.match(message, /센서 후보 정리/);
  assert.match(message, /ESP32 우선 추천/);
  assert.match(message, /오늘은 여기까지/);
  assert.match(message, /와이어프레임 1차 확인/);
  assert.match(message, /미정리\/남은 task/);
  assert.match(message, /데이터 수집 기준 정리/);
  assert.match(message, /검수 기준 보완/);
  assert.match(message, /보완 필요/);
  assert.match(message, /변경 요청/);
  assert.match(message, /UI 흐름 검토: 투표 중/);
  assert.doesNotMatch(message, /승인 버튼 문구 변경/);
});

test('buildDailySummaryMessage shows one final daily state per task', () => {
  const message = buildDailySummaryMessage({
    user,
    workDate: '2026-06-28',
    tasks: [
      { id: 'task-1', title: '센서 후보 정리', status: '완료', importance: '🔴 상', coordination: '🟡 중' }
    ],
    results: [
      {
        taskId: 'task-1',
        taskTitle: '센서 후보 정리',
        resultType: '오늘은 여기까지',
        rawText: '[오늘의 진행 상태]\n- 비교표 초안 작성'
      },
      {
        taskId: 'task-1',
        taskTitle: '센서 후보 정리',
        resultType: '완료',
        rawText: '[완료 제출 결과]\n[결론]\n- ESP32 우선 추천'
      }
    ]
  });

  assert.match(message, /ESP32 우선 추천/);
  assert.doesNotMatch(message, /비교표 초안 작성/);
  assert.equal(message.match(/센서 후보 정리/g).length, 1);
});
