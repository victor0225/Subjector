import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeetingService } from '../src/services/meetingService.js';

const config = {
  channels: {
    meeting: 'C_MEETING'
  },
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' }
  ]
};

test('handleMeetingFileMessage records a meeting upload and returns a thread reply', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async createMeetingFromAudioUpload(input) {
        calls.push(input);
      }
    }
  });

  const result = await service.handleMeetingFileMessage({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [
        {
          name: '졸작회의.m4a',
          mimetype: 'audio/mp4',
          filetype: 'm4a'
        }
      ]
    }
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    uploaderUserKey: 'suhyeon',
    audioFileName: '졸작회의.m4a'
  });
  assert.equal(result.channel, 'C_MEETING');
  assert.equal(result.threadTs, '1710000000.000100');
  assert.match(result.text, /회의 녹음 업로드를 확인했습니다/);
  assert.match(result.text, /전사와 Speaker A\/B\/C 매핑/);
});

test('handleMeetingFileMessage ignores non-meeting messages', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async createMeetingFromAudioUpload(input) {
        calls.push(input);
      }
    }
  });

  const result = await service.handleMeetingFileMessage({
    message: {
      channel: 'C_OTHER',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    }
  });

  assert.equal(result, null);
  assert.equal(calls.length, 0);
});
