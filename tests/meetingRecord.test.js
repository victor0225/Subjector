import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMeetingRecord } from '../src/domain/meetingRecord.js';

test('generates project-log ready meeting record as audit trail', () => {
  const record = generateMeetingRecord({
    entries: [{ text: 'IDEA CRUISE만 회의 기반 task를 생성한다.' }],
    decisions: ['Subjector의 회의 전사 기능을 제거한다.']
  });

  assert.equal(record.channel, '#project-log');
  assert.match(record.title, /회의 결과문/);
  assert.match(record.body, /IDEA CRUISE만 회의 기반 task를 생성한다/);
  assert.match(record.body, /감사 기록/);
});
