import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinalsPreviewMessage, buildFinalsPreviewRecord } from '../src/domain/finalsSummary.js';

test('buildFinalsPreviewMessage summarizes cumulative tasks, outputs, and change history', () => {
  const preview = buildFinalsPreviewRecord({
    workDate: '2026-06-28',
    users: [
      { key: 'suhyeon', displayName: '수현' },
      { key: 'joeun', displayName: '조은' }
    ],
    tasks: [
      { title: '센서 후보 정리', status: '완료', assigneeUserKey: 'suhyeon', importance: '🔴 상', coordination: '🟡 중' },
      { title: 'UI 흐름 검토', status: '오늘은 여기까지', assigneeUserKey: 'joeun', importance: '🟡 중', coordination: '🟡 중' }
    ],
    results: [
      { taskTitle: '센서 후보 정리', resultType: '완료', rawText: '[결론]\n- ESP32 우선 추천' }
    ],
    changeRequests: [
      { taskTitle: 'UI 흐름 검토', status: '투표 중', rawText: '[변경 제안]\n- 승인 버튼 문구 변경' }
    ]
  });
  const message = buildFinalsPreviewMessage(preview);

  assert.equal(preview.workDate, '2026-06-28');
  assert.match(preview.narrative.projectOverview, /프로젝트는/);
  assert.match(preview.narrative.memberProgress.join('\n'), /수현님/);
  assert.match(message, /#finals 누적 정리 업데이트/);
  assert.match(message, /프로젝트 현재 상태/);
  assert.doesNotMatch(message, /사람별 진행 맥락/);
  assert.match(message, /수현님은 센서 후보 정리를 완료했습니다/);
  assert.match(message, /ESP32 우선 추천/);
  assert.match(message, /다음 회의\/내일 볼 것/);
  assert.match(message, /조은님은 UI 흐름 검토를 이어서 진행해야 합니다/);
  assert.doesNotMatch(message, /중요도/);
  assert.doesNotMatch(message, /협응도/);
  assert.match(message, /충돌\/변경 이력/);
  assert.match(message, /UI 흐름 검토에는 투표 중 상태의 변경 요청이 있습니다/);
  assert.match(message, /#finals에 바로 반영된 내용입니다/);
});

test('buildFinalsPreviewMessage uses an LLM narrative when provided', () => {
  const preview = buildFinalsPreviewRecord({
    workDate: '2026-06-28',
    narrative: {
      projectOverview: '프로젝트는 ESP32 중심으로 재정렬되었고, 내일은 연결 방식 검증이 중요합니다.',
      memberProgress: [
        '수현님은 개발 환경 정리를 마쳤습니다.',
        '민성님은 ESP32 연결 조사를 진행 중입니다.'
      ],
      nextFocus: [
        '라즈베리파이 제외 결정이 회로 설계와 충돌하지 않는지 확인합니다.'
      ]
    },
    changeRequests: [
      { taskTitle: '하드웨어 선정', status: '기록됨', rawText: '라즈베리파이에서 ESP32로 변경' }
    ]
  });

  const message = buildFinalsPreviewMessage(preview);

  assert.match(message, /ESP32 중심으로 재정렬/);
  assert.match(message, /민성님은 ESP32 연결 조사를 진행 중/);
  assert.match(message, /라즈베리파이 제외 결정/);
  assert.match(message, /충돌\/변경 이력/);
  assert.doesNotMatch(message, /확정\/완료된 결과/);
});
