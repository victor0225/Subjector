import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areAllSpeakersMapped,
  buildMeetingTaskApprovalText,
  normalizeMeetingTaskCandidates
} from '../src/domain/meetingTasks.js';
import { buildMeetingTaskApprovalBlocks } from '../src/slack/meetingTaskBlocks.js';

const users = [
  { key: 'suhyeon', displayName: '수현' },
  { key: 'joeun', displayName: '조은' },
  { key: 'minsung', displayName: '민성' }
];

test('areAllSpeakersMapped requires every transcript speaker to have a user mapping', () => {
  const transcript = {
    speakers: [
      { label: 'Speaker A' },
      { label: 'Speaker B' },
      { label: 'Speaker C' }
    ]
  };

  assert.equal(areAllSpeakersMapped({
    transcript,
    speakerMapping: { 'Speaker A': 'suhyeon', 'Speaker B': 'joeun' }
  }), false);

  assert.equal(areAllSpeakersMapped({
    transcript,
    speakerMapping: { 'Speaker A': 'suhyeon', 'Speaker B': 'joeun', 'Speaker C': 'minsung' }
  }), true);
});

test('normalizeMeetingTaskCandidates keeps task context usable by #in-process', () => {
  const candidates = normalizeMeetingTaskCandidates({
    tasks: [
      {
        assigneeUserKey: 'joeun',
        title: '실내 측위 후보 비교',
        importance: '상',
        coordination: '중',
        why: '회의에서 센서 후보를 줄이기로 했다.',
        assignmentReason: '조은님이 조사 담당으로 언급되었다.',
        completionCriteria: ['후보 3개 장단점 정리', '추천안 1개 제시'],
        dependencies: ['민성님의 하드웨어 제약 확인'],
        confidence: '높음'
      }
    ]
  }, {
    users,
    sourceLabel: '회의 결과록: 산기대학로 회의'
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].assigneeUserKey, 'joeun');
  assert.equal(candidates[0].title, '실내 측위 후보 비교');
  assert.equal(candidates[0].importance, '🔴 상');
  assert.equal(candidates[0].coordination, '🟡 중');
  assert.equal(candidates[0].context.source, '회의 결과록: 산기대학로 회의');
  assert.match(candidates[0].context.why, /센서 후보/);
  assert.equal(candidates[0].context.completionCriteria[0], '후보 3개 장단점 정리');
});

test('buildMeetingTaskApprovalBlocks asks the lead to approve extracted task candidates', () => {
  const taskCandidates = normalizeMeetingTaskCandidates({
    tasks: [
      {
        assigneeUserKey: 'suhyeon',
        title: '회의 처리 흐름 점검',
        importance: '중',
        coordination: '하',
        why: '전사 결과에서 점검 필요가 언급되었다.'
      }
    ]
  }, {
    users,
    sourceLabel: '회의 결과록: 산기대학로 회의'
  });
  const text = buildMeetingTaskApprovalText({ taskCandidates });
  const blocks = buildMeetingTaskApprovalBlocks({
    text,
    taskCandidates,
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100'
  });

  assert.match(text, /task 후보 추출이 완료되었습니다/);
  assert.match(text, /승인하면 #in-process에 반영할 task로 저장합니다/);
  assert.match(buildMeetingTaskApprovalText({ taskCandidates }), /최신화/);
  assert.equal(blocks[1].elements[0].action_id, 'meeting_approve_tasks');

  const value = JSON.parse(blocks[1].elements[0].value);
  assert.equal(value.sourceChannelId, 'C_MEETING');
  assert.equal(value.sourceMessageTs, '1710000000.000100');
});
