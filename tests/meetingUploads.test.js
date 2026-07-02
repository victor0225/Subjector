import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMeetingUploadThreadText,
  getMeetingAudioFile,
  isMeetingUploadMessage
} from '../src/domain/meetingUploads.js';

test('isMeetingUploadMessage accepts audio files in the meeting channel', () => {
  const message = {
    channel: 'C_MEETING',
    ts: '1710000000.000100',
    user: 'U1',
    files: [
      {
        name: 'meeting.m4a',
        mimetype: 'audio/mp4',
        filetype: 'm4a'
      }
    ]
  };

  assert.equal(isMeetingUploadMessage({ message, meetingChannelId: 'C_MEETING' }), true);
  assert.equal(getMeetingAudioFile(message).name, 'meeting.m4a');
});

test('isMeetingUploadMessage ignores other channels, bot messages, and non-audio files', () => {
  assert.equal(isMeetingUploadMessage({
    meetingChannelId: 'C_MEETING',
    message: {
      channel: 'C_OTHER',
      user: 'U1',
      files: [{ name: 'meeting.m4a', mimetype: 'audio/mp4' }]
    }
  }), false);

  assert.equal(isMeetingUploadMessage({
    meetingChannelId: 'C_MEETING',
    message: {
      channel: 'C_MEETING',
      user: 'U1',
      bot_id: 'B1',
      files: [{ name: 'meeting.m4a', mimetype: 'audio/mp4' }]
    }
  }), false);

  assert.equal(isMeetingUploadMessage({
    meetingChannelId: 'C_MEETING',
    message: {
      channel: 'C_MEETING',
      user: 'U1',
      files: [{ name: 'notes.pdf', mimetype: 'application/pdf' }]
    }
  }), false);
});

test('buildMeetingUploadThreadText explains the next processing step', () => {
  const text = buildMeetingUploadThreadText({
    file: { name: 'subjector-meeting.m4a' },
    uploader: { displayName: '수현' }
  });

  assert.match(text, /회의 녹음 업로드를 확인했습니다/);
  assert.match(text, /수현님/);
  assert.match(text, /subjector-meeting\.m4a/);
  assert.match(text, /IDEA CRUISE 참고 맥락/);
});
