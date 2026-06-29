import test from 'node:test';
import assert from 'node:assert/strict';
import { createSlackFileDownloader } from '../src/services/slackFileDownloader.js';

test('createSlackFileDownloader downloads a private Slack file with the bot token', async () => {
  const calls = [];
  const downloader = createSlackFileDownloader({
    botToken: 'xoxb-token',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return {
        ok: true,
        headers: {
          get(name) {
            return name.toLowerCase() === 'content-type' ? 'audio/mp4' : null;
          }
        },
        async arrayBuffer() {
          return new Uint8Array([1, 2, 3]).buffer;
        }
      };
    }
  });

  const result = await downloader.downloadFile({
    file: {
      name: '회의.m4a',
      mimetype: 'audio/mp4',
      url_private_download: 'https://files.slack.com/private-download'
    }
  });

  assert.equal(calls[0][0], 'https://files.slack.com/private-download');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer xoxb-token');
  assert.equal(result.fileName, '회의.m4a');
  assert.equal(result.mimeType, 'audio/mp4');
  assert.deepEqual([...result.bytes], [1, 2, 3]);
});

test('createSlackFileDownloader reports missing private download URLs', async () => {
  const downloader = createSlackFileDownloader({
    botToken: 'xoxb-token',
    fetchImpl: async () => {
      throw new Error('should not fetch');
    }
  });

  await assert.rejects(
    () => downloader.downloadFile({ file: { name: '회의.m4a' } }),
    /private download URL/
  );
});

test('createSlackFileDownloader labels network failures during private file download', async () => {
  const downloader = createSlackFileDownloader({
    botToken: 'xoxb-token',
    fetchImpl: async () => {
      throw new Error('fetch failed');
    }
  });

  await assert.rejects(
    () => downloader.downloadFile({
      file: {
        name: '회의.m4a',
        url_private_download: 'https://files.slack.com/private-download'
      }
    }),
    /Slack file download request failed: fetch failed/
  );
});

test('createSlackFileDownloader falls back to files.info when the event file has no download URL', async () => {
  const fileInfoCalls = [];
  const fetchCalls = [];
  const downloader = createSlackFileDownloader({
    botToken: 'xoxb-token',
    slackClient: {
      files: {
        info: async (input) => {
          fileInfoCalls.push(input);
          return {
            file: {
              id: input.file,
              name: '조회된회의.m4a',
              mimetype: 'audio/mp4',
              url_private_download: 'https://files.slack.com/info-download'
            }
          };
        }
      }
    },
    fetchImpl: async (url, options) => {
      fetchCalls.push([url, options]);
      return {
        ok: true,
        headers: {
          get() {
            return null;
          }
        },
        async arrayBuffer() {
          return new Uint8Array([4, 5, 6]).buffer;
        }
      };
    }
  });

  const result = await downloader.downloadFile({
    file: {
      id: 'F123',
      name: '회의.m4a'
    }
  });

  assert.equal(fileInfoCalls[0].file, 'F123');
  assert.equal(fetchCalls[0][0], 'https://files.slack.com/info-download');
  assert.equal(result.fileName, '조회된회의.m4a');
  assert.deepEqual([...result.bytes], [4, 5, 6]);
});
