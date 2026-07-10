import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTaskCandidates } from '../src/domain/taskCandidates.js';
import { applyTaskToSubjector } from '../src/domain/subjectorHandoff.js';

test('generates task candidates from strengthened roadmap entries', () => {
  const tasks = generateTaskCandidates({
    meetingRecord: {
      body: 'IDEA CRUISE만 task를 생성하고 Subjector는 in-process에 반영한다.'
    },
    entries: [
      {
        id: 'entry_1',
        kind: 'strengthened',
        text: '전장용 폭음 차단을 목표로 한다. 공개 데이터셋 후보와 라이선스, 라벨 구조는 별도 조사한다.',
        decisionTrail: [{ outcome: 'topic-rewrite' }]
      }
    ]
  });

  assert.equal(tasks[0].model, 'Gemini 2.5 Flash-Lite');
  assert.match(tasks[0].title, /전장 폭음 데이터셋/);
  assert.ok(tasks[0].criteria.successCriteria);
  assert.ok(tasks[0].criteria.mustDo);
  assert.ok(tasks[0].criteria.canSkip);
  assert.ok(tasks[0].criteria.handoffNotes);
  assert.match(tasks[0].sourceReason, /학습 데이터 후보/);
  assert.equal(tasks[0].assignee, '미배정');
  assert.equal(tasks[0].importance, '상');
  assert.equal(tasks[0].sourceEntryId, 'entry_1');
  assert.equal(tasks[0].reflected, false);
});

test('does not turn pure meeting decisions into tasks', () => {
  const tasks = generateTaskCandidates({
    meetingRecord: { body: '오늘은 전장용으로 방향을 좁힌다.' },
    entries: [
      {
        id: 'entry_2',
        kind: 'strengthened',
        text: '전장용으로 방향을 좁힌다. 오늘 회의에서 결정 완료.',
        decisionTrail: [{ outcome: 'topic-rewrite' }]
      }
    ]
  });

  assert.deepEqual(tasks, []);
});

test('marks approved task as applied to Subjector in-process', () => {
  const applied = applyTaskToSubjector({
    task: { id: 'task_1', title: 'Define handoff', assignee: '조수현', importance: '상' }
  });

  assert.equal(applied.status, 'applied');
  assert.equal(applied.target, 'Subjector in-process');
  assert.equal(applied.taskId, 'task_1');
});
