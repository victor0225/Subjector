import test from 'node:test';
import assert from 'node:assert/strict';
import { createInProcessService } from '../src/services/inProcessService.js';

const config = {
  channels: {
    inProcess: 'C_IN_PROCESS'
  }
};

const user = {
  key: 'suhyeon',
  fullName: '조수현',
  displayName: '수현'
};

function createFakeStore({ existingMessage = null, tasks = [] } = {}) {
  const calls = [];

  return {
    calls,
    async startWorkSession(input) {
      calls.push(['startWorkSession', input]);
    },
    async listOpenTasksForUser(userKey) {
      calls.push(['listOpenTasksForUser', userKey]);
      return tasks;
    },
    async findSlackMessage(input) {
      calls.push(['findSlackMessage', input]);
      return existingMessage;
    },
    async upsertSlackMessage(input) {
      calls.push(['upsertSlackMessage', input]);
    }
  };
}

function createFakeSlackClient() {
  const calls = [];

  return {
    calls,
    chat: {
      async postMessage(input) {
        calls.push(['postMessage', input]);
        return { ok: true, channel: input.channel, ts: '1710000000.000001' };
      },
      async update(input) {
        calls.push(['update', input]);
        return { ok: true, channel: input.channel, ts: input.ts };
      }
    }
  };
}

test('handleStartWork posts a new #in-process message when one does not exist', async () => {
  const store = createFakeStore();
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    clock: () => new Date('2026-06-28T01:00:00.000Z')
  });

  const result = await service.handleStartWork({ user });

  assert.equal(result.action, 'posted');
  assert.equal(result.taskCount, 0);
  assert.match(result.dmText, /수현님/);
  assert.match(result.dmText, /#in-process/);
  assert.deepEqual(store.calls[0][0], 'startWorkSession');
  assert.equal(store.calls[0][1].workDate, '2026-06-28');
  assert.equal(slackClient.calls[0][0], 'postMessage');
  assert.equal(slackClient.calls[0][1].channel, 'C_IN_PROCESS');
  assert.match(slackClient.calls[0][1].text, /현재 배정된 task가 없습니다/);
  assert.equal(store.calls.at(-1)[0], 'upsertSlackMessage');
});

test('handleStartWork updates an existing #in-process message', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001'
    },
    tasks: [
      {
        title: '센서 후보 정리',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    clock: () => new Date('2026-06-28T01:00:00.000Z')
  });

  const result = await service.handleStartWork({ user });

  assert.equal(result.action, 'updated');
  assert.equal(result.taskCount, 1);
  assert.equal(slackClient.calls[0][0], 'update');
  assert.equal(slackClient.calls[0][1].ts, '1700000000.000001');
  assert.match(slackClient.calls[0][1].text, /센서 후보 정리/);
  assert.equal(store.calls.some(([name]) => name === 'upsertSlackMessage'), false);
});
