import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinalsPreviewMessage, buildFinalsPreviewRecord } from '../src/domain/finalsSummary.js';

test('buildFinalsPreviewMessage summarizes cumulative tasks, outputs, and change history', () => {
  const preview = buildFinalsPreviewRecord({
    workDate: '2026-06-28',
    tasks: [
      { title: '센서 후보 정리', status: '완료', importance: '🔴 상', coordination: '🟡 중' },
      { title: 'UI 흐름 검토', status: '오늘은 여기까지', importance: '🟡 중', coordination: '🟡 중' }
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
  assert.match(message, /#finals 누적 업데이트 미리보기/);
  assert.match(message, /확정\/완료된 결과/);
  assert.match(message, /센서 후보 정리/);
  assert.match(message, /ESP32 우선 추천/);
  assert.match(message, /진행 중\/미완료/);
  assert.match(message, /UI 흐름 검토/);
  assert.match(message, /충돌\/변경 이력/);
  assert.match(message, /승인 버튼 문구 변경/);
  assert.match(message, /아직 #finals에는 반영하지 않았습니다/);
});
