import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMeetingTranscriptionReadyText,
  normalizeMeetingTranscript
} from '../src/domain/meetingTranscript.js';
import { buildSpeakerMappingBlocks } from '../src/slack/meetingBlocks.js';

const users = [
  { key: 'suhyeon', displayName: '수현' },
  { key: 'joeun', displayName: '조은' },
  { key: 'minsung', displayName: '민성' }
];

test('normalizeMeetingTranscript keeps speaker candidates and transcript segments', () => {
  const transcript = normalizeMeetingTranscript({
    meetingTitle: '산기대학로 회의',
    conciseSummary: '주요 기능 구현 순서를 정했다.',
    speakers: [
      { label: 'Speaker A', evidence: '회의를 시작하고 승인 흐름을 언급함' },
      { label: 'Speaker B', evidence: '작업량 기준을 질문함' }
    ],
    segments: [
      {
        speaker: 'Speaker A',
        startTime: '00:00:03',
        endTime: '00:00:12',
        text: '오늘은 회의 전사부터 만들겠습니다.'
      }
    ],
    decisions: ['회의 녹음은 #회의-결과록에 업로드한다.'],
    actionItems: ['Speaker A/B/C 매핑을 확인한다.']
  });

  assert.equal(transcript.meetingTitle, '산기대학로 회의');
  assert.equal(transcript.speakers[0].label, 'Speaker A');
  assert.equal(transcript.segments[0].text, '오늘은 회의 전사부터 만들겠습니다.');
  assert.equal(transcript.decisions[0], '회의 녹음은 #회의-결과록에 업로드한다.');
});

test('buildMeetingTranscriptionReadyText stores transcript as IDEA CRUISE context', () => {
  const text = buildMeetingTranscriptionReadyText({
    transcript: normalizeMeetingTranscript({
      meetingTitle: '산기대학로 회의',
      conciseSummary: '전사 테스트가 완료되었다.',
      speakers: [{ label: 'Speaker A', evidence: '업로드 담당자처럼 말함' }],
      segments: []
    })
  });

  assert.match(text, /전사가 완료되었습니다/);
  assert.match(text, /IDEA CRUISE 참고 맥락/);
  assert.match(text, /자동 task 생성은 진행하지 않습니다/);
});

test('buildSpeakerMappingBlocks renders team member buttons for each speaker', () => {
  const transcript = normalizeMeetingTranscript({
    meetingTitle: '산기대학로 회의',
    conciseSummary: '전사 테스트가 완료되었다.',
    speakers: [
      { label: 'Speaker A', evidence: '첫 번째로 말함' },
      { label: 'Speaker B', evidence: '두 번째로 말함' }
    ],
    segments: []
  });

  const blocks = buildSpeakerMappingBlocks({
    text: '전사가 완료되었습니다.',
    transcript,
    users,
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100'
  });

  const actionBlocks = blocks.filter((block) => block.type === 'actions');
  const actionIds = actionBlocks.flatMap((block) => block.elements.map((element) => element.action_id));

  assert.equal(actionBlocks.length, 2);
  assert.equal(new Set(actionIds).size, actionIds.length);
  assert.ok(actionBlocks[0].elements[0].action_id.startsWith('meeting_map_speaker_'));
  assert.equal(actionBlocks[0].elements[0].text.text, '수현님');

  const value = JSON.parse(actionBlocks[0].elements[0].value);
  assert.equal(value.speakerLabel, 'Speaker A');
  assert.equal(value.userKey, 'suhyeon');
  assert.equal(value.sourceChannelId, 'C_MEETING');
  assert.equal(value.sourceMessageTs, '1710000000.000100');
});
