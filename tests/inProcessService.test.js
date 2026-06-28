import test from 'node:test';
import assert from 'node:assert/strict';
import { createInProcessService } from '../src/services/inProcessService.js';

const config = {
  channels: {
    inProcess: 'C_IN_PROCESS',
    finals: 'C_FINALS'
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
    },
    async getTaskById(taskId) {
      calls.push(['getTaskById', taskId]);
      return {
        id: taskId,
        assigneeUserKey: 'suhyeon',
        title: '센서 후보 정리',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: {}
      };
    },
    async submitTaskResult(input) {
      calls.push(['submitTaskResult', input]);
    },
    async createChangeRequest(input) {
      calls.push(['createChangeRequest', input]);
    },
    async updateTaskStatus(input) {
      calls.push(['updateTaskStatus', input]);
    },
    async endWorkSession(input) {
      calls.push(['endWorkSession', input]);
    },
    async markAcceptedTasksUnresolvedForUser(input) {
      calls.push(['markAcceptedTasksUnresolvedForUser', input]);
    },
    async listDailyTasksForUser(input) {
      calls.push(['listDailyTasksForUser', input]);
      return [
        {
          id: 'task-1',
          title: '센서 후보 정리',
          status: '완료',
          importance: '🔴 상',
          coordination: '🟡 중'
        }
      ];
    },
    async listDailyTaskResultsForUser(input) {
      calls.push(['listDailyTaskResultsForUser', input]);
      return [
        {
          taskId: 'task-1',
          taskTitle: '센서 후보 정리',
          resultType: '완료',
          rawText: '[완료 제출 결과]\n[결론]\n- ESP32 우선 추천'
        }
      ];
    },
    async listDailyChangeRequestsForUser(input) {
      calls.push(['listDailyChangeRequestsForUser', input]);
      return [];
    },
    async listAllTasks(input) {
      calls.push(['listAllTasks', input]);
      return [
        {
          id: 'task-1',
          title: '센서 후보 정리',
          status: '완료',
          importance: '🔴 상',
          coordination: '🟡 중'
        }
      ];
    },
    async listAllTaskResults(input) {
      calls.push(['listAllTaskResults', input]);
      return [
        {
          taskId: 'task-1',
          taskTitle: '센서 후보 정리',
          resultType: '완료',
          rawText: '[결론]\n- ESP32 우선 추천'
        }
      ];
    },
    async listAllChangeRequests(input) {
      calls.push(['listAllChangeRequests', input]);
      return [];
    },
    async createFinalsPreview(input) {
      calls.push(['createFinalsPreview', input]);
    },
    async getLatestFinalsPreview() {
      calls.push(['getLatestFinalsPreview']);
      return {
        id: 'finals-1',
        workDate: '2026-06-28',
        preview: {
          workDate: '2026-06-28',
          completed: ['센서 후보 정리: 🔴 상 / 🟡 중'],
          inProgress: [],
          outputs: ['센서 후보 정리: 완료 / [결론] / - ESP32 우선 추천'],
          changeHistory: []
        }
      };
    },
    async approveFinalsUpdate(input) {
      calls.push(['approveFinalsUpdate', input]);
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
  assert.match(result.dmText, /업데이트했습니다/);
  assert.equal(slackClient.calls[0][0], 'update');
  assert.equal(slackClient.calls[0][1].ts, '1700000000.000001');
  assert.match(slackClient.calls[0][1].text, /센서 후보 정리/);
  assert.equal(store.calls.some(([name]) => name === 'upsertSlackMessage'), false);
});

test('handleTaskActionSubmission stores completed task output and refreshes the board', async () => {
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '[완료 제출 결과]'
  });

  assert.equal(result.status, '완료');
  assert.match(result.responseText, /완료로 변경했습니다/);
  assert.deepEqual(store.calls.find(([name]) => name === 'submitTaskResult')[1], {
    taskId: 'task-1',
    resultType: '완료',
    rawText: '[완료 제출 결과]',
    submittedByUserKey: 'suhyeon'
  });
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '완료');
  assert.equal(slackClient.calls.at(-1)[0], 'update');
});

test('handleTaskActionSubmission stores stop-for-today output', async () => {
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_stop_today',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '[오늘의 진행 상태]'
  });

  assert.equal(result.status, '오늘은 여기까지');
  assert.equal(store.calls.find(([name]) => name === 'submitTaskResult')[1].resultType, '오늘은 여기까지');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '오늘은 여기까지');
});

test('handleTaskActionSubmission stores change request output', async () => {
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_change_request',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '[변경 요청]'
  });

  assert.equal(result.status, '변경 요청 중');
  assert.equal(store.calls.find(([name]) => name === 'createChangeRequest')[1].rawText, '[변경 요청]');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '변경 요청 중');
});

test('handleEndWork stores the end time and returns a daily summary', async () => {
  const store = createFakeStore();
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleEndWork({ user });

  assert.match(result.dmText, /수현님, 오늘 한 일 요약입니다/);
  assert.match(result.dmText, /센서 후보 정리/);
  assert.match(result.dmText, /ESP32 우선 추천/);
  assert.deepEqual(store.calls.find(([name]) => name === 'endWorkSession')[1], {
    userKey: 'suhyeon',
    workDate: '2026-06-28',
    endedAt: '2026-06-28T12:00:00.000Z'
  });
  assert.deepEqual(store.calls.find(([name]) => name === 'markAcceptedTasksUnresolvedForUser')[1], {
    userKey: 'suhyeon'
  });
  assert.equal(store.calls.find(([name]) => name === 'listDailyTaskResultsForUser')[1].fromIso, '2026-06-27T15:00:00.000Z');
  assert.equal(store.calls.find(([name]) => name === 'listDailyTaskResultsForUser')[1].toIso, '2026-06-28T15:00:00.000Z');
});

test('handleFinalsPreview stores a cumulative preview and returns a DM message', async () => {
  const store = createFakeStore();
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleFinalsPreview({ user });

  assert.match(result.dmText, /#finals 누적 업데이트 미리보기/);
  assert.match(result.dmText, /센서 후보 정리/);
  assert.match(result.dmText, /ESP32 우선 추천/);
  const previewCall = store.calls.find(([name]) => name === 'createFinalsPreview');
  assert.equal(previewCall[1].workDate, '2026-06-28');
  assert.equal(previewCall[1].preview.workDate, '2026-06-28');
  assert.ok(store.calls.some(([name]) => name === 'listAllTasks'));
  assert.ok(store.calls.some(([name]) => name === 'listAllTaskResults'));
  assert.ok(store.calls.some(([name]) => name === 'listAllChangeRequests'));
});

test('handleFinalsApproval posts the latest preview to #finals when no message exists', async () => {
  const store = createFakeStore();
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleFinalsApproval({ approvedByUserKey: 'suhyeon' });

  assert.match(result.responseText, /#finals 누적 정리를 반영했습니다/);
  const post = slackClient.calls.find(([name]) => name === 'postMessage');
  assert.equal(post[1].channel, 'C_FINALS');
  assert.match(post[1].text, /#finals 누적 정리/);
  assert.equal(store.calls.find(([name]) => name === 'upsertSlackMessage')[1].purpose, 'finals:cumulative');
  assert.equal(store.calls.find(([name]) => name === 'approveFinalsUpdate')[1].id, 'finals-1');
});

test('handleFinalsApproval updates the existing #finals cumulative message', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_FINALS',
      messageTs: '1700000000.000001'
    }
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  await service.handleFinalsApproval({ approvedByUserKey: 'suhyeon' });

  const update = slackClient.calls.find(([name]) => name === 'update');
  assert.equal(update[1].channel, 'C_FINALS');
  assert.equal(update[1].ts, '1700000000.000001');
  assert.equal(store.calls.some(([name]) => name === 'upsertSlackMessage'), false);
});
