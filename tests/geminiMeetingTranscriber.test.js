import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiMeetingTranscriber } from '../src/services/geminiMeetingTranscriber.js';

test('createGeminiMeetingTranscriber uploads audio and requests a structured transcript', async () => {
  const calls = [];
  const transcriber = createGeminiMeetingTranscriber({
    apiKey: 'gemini-key',
    model: 'gemini-3.5-flash',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);

      if (String(url).includes('/upload/v1beta/files') && options.headers['X-Goog-Upload-Command'] === 'start') {
        return {
          ok: true,
          headers: {
            get(name) {
              return name.toLowerCase() === 'x-goog-upload-url'
                ? 'https://upload.example/session'
                : null;
            }
          },
          async text() {
            return '';
          }
        };
      }

      if (url === 'https://upload.example/session') {
        return {
          ok: true,
          async json() {
            return {
              file: {
                uri: 'files/audio-123',
                mimeType: 'audio/mp4'
              }
            };
          },
          async text() {
            return '';
          }
        };
      }

      if (String(url).includes(':generateContent')) {
        return {
          ok: true,
          async json() {
            return {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          meetingTitle: '산기대학로 회의',
                          conciseSummary: '전사 테스트',
                          speakers: [{ label: 'Speaker A', evidence: '회의를 시작함' }],
                          segments: [{ speaker: 'Speaker A', startTime: '00:00:01', endTime: '00:00:04', text: '시작하겠습니다.' }],
                          decisions: ['전사를 만든다.'],
                          actionItems: ['Speaker 매핑을 확인한다.']
                        })
                      }
                    ]
                  }
                }
              ]
            };
          },
          async text() {
            return '';
          }
        };
      }

      throw new Error(`unexpected URL ${url}`);
    }
  });

  const transcript = await transcriber.transcribeMeeting({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'audio/mp4',
    fileName: '회의.m4a',
    teamMembers: [{ displayName: '수현' }]
  });

  assert.equal(calls[0][1].headers['X-Goog-Upload-Protocol'], 'resumable');
  assert.equal(calls[1][0], 'https://upload.example/session');
  assert.equal(calls[2][1].method, 'POST');
  assert.match(calls[2][1].body, /Speaker A\/B\/C/);
  assert.match(calls[2][1].body, /files\/audio-123/);
  assert.equal(transcript.meetingTitle, '산기대학로 회의');
  assert.equal(transcript.segments[0].speaker, 'Speaker A');
});

test('createGeminiMeetingTranscriber reports Gemini API failures without leaking the key', async () => {
  const transcriber = createGeminiMeetingTranscriber({
    apiKey: 'secret-gemini-key',
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      async text() {
        return 'bad request secret-gemini-key';
      }
    })
  });

  await assert.rejects(
    () => transcriber.transcribeMeeting({
      bytes: new Uint8Array([1]),
      mimeType: 'audio/mp4',
      fileName: '회의.m4a',
      teamMembers: []
    }),
    (error) => {
      assert.match(error.message, /Gemini file upload failed/);
      assert.doesNotMatch(error.message, /secret-gemini-key/);
      return true;
    }
  );
});

test('createGeminiMeetingTranscriber labels network failures during upload start', async () => {
  const transcriber = createGeminiMeetingTranscriber({
    apiKey: 'secret-gemini-key',
    fetchImpl: async () => {
      throw new Error('fetch failed secret-gemini-key');
    }
  });

  await assert.rejects(
    () => transcriber.transcribeMeeting({
      bytes: new Uint8Array([1]),
      mimeType: 'audio/mp4',
      fileName: '회의.m4a',
      teamMembers: []
    }),
    (error) => {
      assert.match(error.message, /Gemini file upload start request failed: fetch failed/);
      assert.doesNotMatch(error.message, /secret-gemini-key/);
      return true;
    }
  );
});
