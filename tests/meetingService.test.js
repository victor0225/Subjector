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

test('processMeetingAudioUpload downloads, transcribes, stores, and asks for speaker mapping', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async markMeetingTranscribing(input) {
        calls.push(['markMeetingTranscribing', input]);
      },
      async completeMeetingTranscription(input) {
        calls.push(['completeMeetingTranscription', input]);
      },
      async failMeetingTranscription(input) {
        calls.push(['failMeetingTranscription', input]);
      }
    },
    fileDownloader: {
      async downloadFile(input) {
        calls.push(['downloadFile', input.file.name]);
        return {
          bytes: new Uint8Array([1, 2, 3]),
          mimeType: 'audio/mp4',
          fileName: '졸작회의.m4a'
        };
      }
    },
    audioTranscriber: {
      async transcribeMeeting(input) {
        calls.push(['transcribeMeeting', input.fileName, input.teamMembers.length]);
        return {
          meetingTitle: '졸작 회의',
          conciseSummary: '회의 전사 테스트',
          speakers: [{ label: 'Speaker A', evidence: '회의를 시작함' }],
          segments: [{ speaker: 'Speaker A', startTime: '00:00:01', endTime: '00:00:04', text: '시작하겠습니다.' }],
          decisions: ['전사를 진행한다.'],
          actionItems: ['Speaker 매핑을 확인한다.']
        };
      }
    }
  });

  const result = await service.processMeetingAudioUpload({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    }
  });

  assert.equal(calls[0][0], 'markMeetingTranscribing');
  assert.equal(calls[1][0], 'downloadFile');
  assert.equal(calls[2][0], 'transcribeMeeting');
  assert.equal(calls[3][0], 'completeMeetingTranscription');
  assert.equal(calls[3][1].transcript.meetingTitle, '졸작 회의');
  assert.equal(result.channel, 'C_MEETING');
  assert.equal(result.threadTs, '1710000000.000100');
  assert.match(result.text, /전사가 완료되었습니다/);
  assert.ok(result.blocks.some((block) => block.type === 'actions'));
});

test('processMeetingAudioUpload marks the meeting failed when transcription fails', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async markMeetingTranscribing(input) {
        calls.push(['markMeetingTranscribing', input]);
      },
      async completeMeetingTranscription(input) {
        calls.push(['completeMeetingTranscription', input]);
      },
      async failMeetingTranscription(input) {
        calls.push(['failMeetingTranscription', input]);
      }
    },
    fileDownloader: {
      async downloadFile() {
        throw new Error('Slack download failed');
      }
    },
    audioTranscriber: {
      async transcribeMeeting() {
        throw new Error('should not transcribe');
      }
    }
  });

  const result = await service.processMeetingAudioUpload({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    }
  });

  assert.equal(calls[0][0], 'markMeetingTranscribing');
  assert.equal(calls[1][0], 'failMeetingTranscription');
  assert.match(calls[1][1].errorMessage, /Slack download failed/);
  assert.match(result.text, /회의 전사에 실패했습니다/);
});

test('handleSpeakerMapping stores a lead-approved speaker mapping', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async saveMeetingSpeakerMapping(input) {
        calls.push(input);
        return {
          speakerMapping: {
            'Speaker A': 'suhyeon'
          }
        };
      }
    }
  });

  const result = await service.handleSpeakerMapping({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    speakerLabel: 'Speaker A',
    userKey: 'suhyeon'
  });

  assert.equal(calls[0].speakerLabel, 'Speaker A');
  assert.equal(calls[0].userKey, 'suhyeon');
  assert.match(result.text, /Speaker A/);
  assert.match(result.text, /수현님/);
});
