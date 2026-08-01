import test from 'node:test';
import assert from 'node:assert/strict';
import { createInProcessService } from '../src/services/inProcessService.js';

const config = {
  leadUserKey: 'suhyeon',
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

const joeun = {
  key: 'joeun',
  fullName: '김조은',
  displayName: '조은'
};

const minsung = {
  key: 'minsung',
  fullName: '배민성',
  displayName: '민성'
};

const allUsers = [user, joeun, minsung];

function createFakeTaskEvaluator(evaluation) {
  const calls = [];

  return {
    calls,
    async evaluateSubmission(input) {
      calls.push(input);
      return evaluation;
    }
  };
}

function createFakeStore({
  existingMessage = null,
  existingMessagesByPurpose = {},
  taskDetailMessages = [],
  tasks = [],
  allOpenTasks = tasks,
  endedSessions = [],
  finalsUpdateForDate = null,
  latestCodexPrompt = { prompt: 'Subjector Codex prompt' }
} = {}) {
  const calls = [];

  return {
    calls,
    async startWorkSession(input) {
      calls.push(['startWorkSession', input]);
    },
    async listOpenTasksForUser(userKey) {
      calls.push(['listOpenTasksForUser', userKey]);
      return tasks.filter((task) => !task.assigneeUserKey || task.assigneeUserKey === userKey);
    },
    async listOpenTasks(input) {
      calls.push(['listOpenTasks', input]);
      return allOpenTasks;
    },
    async findSlackMessage(input) {
      calls.push(['findSlackMessage', input]);
      if (Object.prototype.hasOwnProperty.call(existingMessagesByPurpose, input.purpose)) {
        return existingMessagesByPurpose[input.purpose];
      }

      return input.purpose?.startsWith('in_process:') || input.purpose === 'finals:cumulative'
        ? existingMessage
        : null;
    },
    async upsertSlackMessage(input) {
      calls.push(['upsertSlackMessage', input]);
    },
    async listTaskDetailMessagesForThread(input) {
      calls.push(['listTaskDetailMessagesForThread', input]);
      return taskDetailMessages;
    },
    async deleteSlackMessage(input) {
      calls.push(['deleteSlackMessage', input]);
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
    async updateTaskContextFromChange(input) {
      calls.push(['updateTaskContextFromChange', input]);
    },
    async updateTaskContextFromCleanup(input) {
      calls.push(['updateTaskContextFromCleanup', input]);
    },
    async updateTaskStatus(input) {
      calls.push(['updateTaskStatus', input]);
    },
    async createCodexPrompt(input) {
      calls.push(['createCodexPrompt', input]);
    },
    async getLatestCodexPromptForTask(taskId) {
      calls.push(['getLatestCodexPromptForTask', taskId]);
      if (latestCodexPrompt === null) {
        return null;
      }
      return {
        taskId,
        prompt: latestCodexPrompt.prompt,
        slackChannelId: 'C_IN_PROCESS',
        slackMessageTs: '1710000000.000001'
      };
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
    async createFinalsUpdate(input) {
      calls.push(['createFinalsUpdate', input]);
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
    },
    async listEndedWorkSessionsForDate(input) {
      calls.push(['listEndedWorkSessionsForDate', input]);
      return endedSessions;
    },
    async getFinalsUpdateForDate(input) {
      calls.push(['getFinalsUpdateForDate', input]);
      return finalsUpdateForDate;
    },
    async archiveTestTasks(input) {
      calls.push(['archiveTestTasks', input]);
    }
  };
}

function createFakeSlackClient({ updateError = null } = {}) {
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
        if (updateError) {
          throw updateError;
        }
        return { ok: true, channel: input.channel, ts: input.ts };
      },
      async delete(input) {
        calls.push(['delete', input]);
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
  assert.match(slackClient.calls[0][1].text, /현재 공유할 진행 task가 없습니다/);
  assert.equal(store.calls.at(-1)[0], 'upsertSlackMessage');
});

test('handleStartWork opens a personal DM task board and refreshes the team progress board', async () => {
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'in_process:suhyeon': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000001'
      }
    },
    tasks: [
      {
        id: 'task-1',
        title: '라즈베리파이 통신 방식 정리',
        assigneeUserKey: 'suhyeon',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ],
    allOpenTasks: [
      {
        id: 'task-1',
        title: '라즈베리파이 통신 방식 정리',
        assigneeUserKey: 'suhyeon',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      },
      {
        id: 'task-2',
        title: '소리 데이터셋 후보 정리',
        assigneeUserKey: 'joeun',
        status: '추가 진행 예정',
        importance: '🟡 중',
        coordination: '🟢 하',
        context: { why: '드론 소리와 말소리 데이터셋 후보를 비교한다.' }
      }
    ]
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T01:00:00.000Z')
  });

  const result = await service.handleStartWork({ user, dmChannelId: 'D_SUHYEON' });

  assert.equal(result.personalTaskCount, 1);
  assert.equal(result.teamTaskCount, 1);
  assert.match(result.dmText, /개인 task 보드/);
  const dmPost = slackClient.calls.find(([name, input]) => name === 'postMessage' && input.channel === 'D_SUHYEON');
  assert.ok(dmPost);
  assert.match(dmPost[1].text, /라즈베리파이 통신 방식 정리/);
  assert.match(dmPost[1].text, /개인 task 보드/);
  assert.doesNotMatch(dmPost[1].text, /소리 데이터셋 후보 정리/);
  const teamUpdate = slackClient.calls.find(([name, input]) => name === 'update' && input.channel === 'C_IN_PROCESS');
  assert.ok(teamUpdate);
  assert.match(teamUpdate[1].text, /라즈베리파이 통신 방식 정리/);
  assert.doesNotMatch(teamUpdate[1].text, /소리 데이터셋 후보 정리/);
  assert.doesNotMatch(teamUpdate[1].text, /작업 제출/);
});
test('handleStartWork posts a fresh personal DM task board when a previous DM board exists', async () => {
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'dm_task_board:suhyeon': {
        channelId: 'D_SUHYEON',
        messageTs: '1700000000.000010',
        threadTs: '1700000000.000010'
      },
      'in_process:suhyeon': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000001'
      }
    },
    tasks: [
      {
        id: 'task-1',
        title: '시연 검증용 스펙트럼·필터링 시각화 방식 초안 정리',
        assigneeUserKey: 'suhyeon',
        status: '수락',
        importance: '보통',
        coordination: '🟡 중',
        context: {
          why: '회의에서 피실험자 체감만으로는 부족하므로 시각화가 필요하다고 했고, 구체적인 시연 화면 설계는 회의 밖에서 검토 시간이 필요한 작업임.'
        }
      }
    ]
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T01:00:00.000Z')
  });

  const result = await service.handleStartWork({ user, dmChannelId: 'D_SUHYEON' });

  const dmPosts = slackClient.calls.filter(([name, input]) => name === 'postMessage' && input.channel === 'D_SUHYEON' && !input.thread_ts);
  assert.equal(dmPosts.length, 1);
  assert.match(dmPosts[0][1].text, /개인 task 보드/);
  assert.match(dmPosts[0][1].text, /시연 검증용 스펙트럼/);
  assert.ok(JSON.stringify(dmPosts[0][1].blocks).includes('작업 제출'));
  const activeBoardUpsert = store.calls.find(([name, input]) => name === 'upsertSlackMessage' && input.purpose === 'dm_task_board:suhyeon');
  assert.equal(activeBoardUpsert[1].messageTs, '1710000000.000001');
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


test('refreshBoardForUser updates #in-process without starting a work session', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001'
    },
    tasks: [
      {
        title: 'IDEA CRUISE task 반영',
        status: '미시작',
        importance: '높음',
        coordination: null,
        context: { source: 'IDEA CRUISE' }
      }
    ]
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    clock: () => new Date('2026-06-28T01:30:00.000Z')
  });

  const result = await service.refreshBoardForUser({ user });

  assert.equal(result.action, 'updated');
  assert.equal(result.taskCount, 1);
  assert.equal(store.calls.some(([name]) => name === 'startWorkSession'), false);
  assert.equal(slackClient.calls[0][0], 'update');
  assert.match(slackClient.calls[0][1].text, /IDEA CRUISE task 반영/);
});


test('refreshBoardForUser removes task detail thread messages from the team board', async () => {
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'in_process:suhyeon': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000001',
        threadTs: '1700000000.000001'
      }
    },
    taskDetailMessages: [
      {
        purpose: 'task_detail:task-1',
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000011',
        threadTs: '1700000000.000001'
      },
      {
        purpose: 'task_detail:deleted-task',
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000012',
        threadTs: '1700000000.000001'
      }
    ],
    tasks: [
      {
        id: 'task-1',
        title: '남아있는 task',
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
    clock: () => new Date('2026-06-28T01:30:00.000Z')
  });

  await service.refreshBoardForUser({ user });

  const deletedSlackMessages = slackClient.calls.filter(([name]) => name === 'delete');
  assert.equal(deletedSlackMessages.length, 2);
  assert.deepEqual(deletedSlackMessages.map(([, input]) => input.ts), [
    '1700000000.000011',
    '1700000000.000012'
  ]);

  const deletedRecords = store.calls.filter(([name]) => name === 'deleteSlackMessage');
  assert.equal(deletedRecords.length, 2);
  assert.deepEqual(deletedRecords.map(([, input]) => input.messageTs), [
    '1700000000.000011',
    '1700000000.000012'
  ]);
});
test('handleArchiveTestTasks archives test tasks and refreshes the board', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1710000000.000001',
      threadTs: '1710000000.000001'
    },
    tasks: []
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: allUsers
  });

  const result = await service.handleArchiveTestTasks({ user });

  assert.deepEqual(store.calls[0], ['archiveTestTasks', { keyword: '테스트' }]);
  assert.ok(slackClient.calls.some((call) => call[0] === 'update'));
  assert.match(result.dmText, /테스트 task/);
  assert.match(result.dmText, /보관 처리/);
});

test('handleStartWork posts task detail threads in the personal DM board', async () => {
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'in_process:suhyeon': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000001',
        threadTs: '1700000000.000001'
      }
    },
    tasks: [
      {
        id: 'task-1',
        title: 'ESP32 센서 후보 비교',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: {
          source: '회의 결과록',
          why: ['라즈베리파이에서 ESP32로 변경 가능성을 검토하기로 함'],
          assignmentReason: ['수현님이 하드웨어 변경 논의를 주도함'],
          completionCriteria: ['ESP32 후보 3개 이상 비교'],
          dependencies: ['민성님 데이터 수집 구조 task에 영향 가능'],
          confidence: '중간'
        }
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

  await service.handleStartWork({ user, dmChannelId: 'D_SUHYEON' });

  const detailPost = slackClient.calls.find(([name, input]) => name === 'postMessage' && input.channel === 'D_SUHYEON' && input.thread_ts === '1710000000.000001');
  assert.ok(detailPost);
  assert.match(detailPost[1].text, /task 실행 정보/);
  assert.match(detailPost[1].text, /왜 하는가/);

  const detailUpsert = store.calls.find(([name, input]) => name === 'upsertSlackMessage' && input.purpose === 'task_detail:task-1');
  assert.ok(detailUpsert);
  assert.equal(detailUpsert[1].messageTs, '1710000000.000001');
});

test('handleStartWork recreates #in-process message when the stored Slack message was deleted', async () => {
  const deletedMessageError = new Error('message_not_found');
  deletedMessageError.data = { error: 'message_not_found' };
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
  const slackClient = createFakeSlackClient({
    updateError: deletedMessageError
  });
  const service = createInProcessService({
    store,
    slackClient,
    config,
    clock: () => new Date('2026-06-28T01:00:00.000Z')
  });

  const result = await service.handleStartWork({ user });

  assert.equal(result.action, 'reposted');
  assert.match(result.dmText, /다시 만들었습니다/);
  assert.equal(slackClient.calls[0][0], 'update');
  assert.equal(slackClient.calls[1][0], 'postMessage');
  assert.match(slackClient.calls[1][1].text, /센서 후보 정리/);
  const upsert = store.calls.find(([name]) => name === 'upsertSlackMessage');
  assert.equal(upsert[1].messageTs, '1710000000.000001');
  assert.equal(upsert[1].threadTs, '1710000000.000001');
});

test('handleStartWork does not repost task details in the team board thread', async () => {
  const deletedMessageError = new Error('message_not_found');
  deletedMessageError.data = { error: 'message_not_found' };
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'in_process:suhyeon': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000001',
        threadTs: '1700000000.000001'
      },
      'task_detail:task-1': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000002',
        threadTs: '1700000000.000001'
      }
    },
    tasks: [
      {
        id: 'task-1',
        title: 'ESP32 센서 후보 비교',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        context: { source: '회의 결과록' }
      }
    ]
  });
  const slackClient = createFakeSlackClient({
    updateError: deletedMessageError
  });
  const service = createInProcessService({
    store,
    slackClient,
    config,
    clock: () => new Date('2026-06-28T01:00:00.000Z')
  });

  await service.handleStartWork({ user });

  const detailPost = slackClient.calls.find(([name, input]) => name === 'postMessage' && input.thread_ts === '1710000000.000001');
  assert.equal(detailPost, undefined);
});

test('handleTaskActionSubmission refreshes the personal DM board and team progress board', async () => {
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'in_process:suhyeon': {
        channelId: 'C_IN_PROCESS',
        messageTs: '1700000000.000001'
      },
      'dm_task_board:suhyeon': {
        channelId: 'D_SUHYEON',
        messageTs: '1700000000.000010'
      }
    },
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '추가 진행 예정',
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
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  await service.handleTaskActionSubmission({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '[완료 제출 결과]'
  });

  assert.ok(slackClient.calls.some(([name, input]) => name === 'update' && input.channel === 'C_IN_PROCESS'));
  assert.ok(slackClient.calls.some(([name, input]) => name === 'update' && input.channel === 'D_SUHYEON'));
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

test('handleTaskActionSubmission posts a completion record in the board thread', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001',
      threadTs: '1700000000.000001'
    }
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  await service.handleTaskActionSubmission({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '[완료 제출 결과]'
  });

  const completionPost = slackClient.calls.find(([name, input]) => (
    name === 'postMessage'
    && input.thread_ts === '1700000000.000001'
    && /완료 기록/.test(input.text)
  ));

  assert.ok(completionPost);
  assert.match(completionPost[1].text, /센서 후보 정리/);
  assert.match(completionPost[1].text, /수현님/);
});

test('handleTaskActionSubmission completes a task only after sufficient LLM evaluation', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'sufficient',
    score: 91,
    summary: '과제 목표를 충족했습니다.',
    reasons: ['결론과 근거가 있습니다.'],
    missingItems: [],
    feedbackToUser: '완료 처리 가능합니다.',
    blocksCompletion: false
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '[완료 제출 결과]\n[결론]\nESP32 추천'
  });

  assert.equal(result.status, '완료');
  assert.match(result.responseText, /검수 결과/);
  assert.equal(evaluator.calls[0].actionId, 'task_complete');
  assert.equal(evaluator.calls[0].task.title, '센서 후보 정리');
  assert.equal(store.calls.find(([name]) => name === 'submitTaskResult')[1].parsedSummary.verdict, 'sufficient');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '완료');
});

test('handleTaskActionSubmission includes attachment evidence in evaluation and stored result', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'sufficient',
    score: 90,
    summary: '첨부 산출물과 설명이 충분합니다.',
    reasons: ['파일 설명과 제출 요약이 있습니다.'],
    missingItems: [],
    feedbackToUser: '완료 처리 가능합니다.',
    blocksCompletion: false
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  await service.handleTaskActionSubmission({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '직접 조사 결과를 정리했습니다.',
    attachmentNote: '첨부 Word 파일에 비교표와 결론이 있습니다.',
    attachments: [
      {
        id: 'F1',
        name: '비교표.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filetype: 'docx',
        size: 12000
      }
    ]
  });

  assert.match(evaluator.calls[0].rawText, /첨부 Word 파일/);
  assert.match(evaluator.calls[0].rawText, /비교표\.docx/);

  const inserted = store.calls.find(([name]) => name === 'submitTaskResult')[1];
  assert.match(inserted.rawText, /직접 조사 결과/);
  assert.match(inserted.rawText, /첨부 파일/);
  assert.equal(inserted.parsedSummary.verdict, 'sufficient');
  assert.equal(inserted.parsedSummary.attachmentNote, '첨부 Word 파일에 비교표와 결론이 있습니다.');
  assert.equal(inserted.parsedSummary.attachments[0].name, '비교표.docx');
});

test('handleTaskActionSubmission keeps weak completion as needs revision', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'needs_revision',
    score: 35,
    summary: '완료로 보기에는 부족합니다.',
    reasons: ['근거가 없습니다.'],
    missingItems: ['산출물', '판단 근거'],
    feedbackToUser: '근거와 산출물을 보완해 주세요.',
    blocksCompletion: true
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '잘 했음'
  });

  assert.equal(result.status, '보완 필요');
  assert.match(result.responseText, /보완 필요/);
  assert.equal(store.calls.find(([name]) => name === 'submitTaskResult')[1].parsedSummary.verdict, 'needs_revision');
  const statusUpdate = store.calls.find(([name]) => name === 'updateTaskStatus')[1];
  assert.equal(statusUpdate.status, '보완 필요');
  assert.equal(statusUpdate.completedAt, undefined);
});

test('handleTaskActionSubmission completes sufficient work submissions', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'sufficient',
    score: 92,
    summary: '완료 기준을 충족했습니다.',
    reasons: ['비교표와 추천안이 있습니다.'],
    missingItems: [],
    feedbackToUser: '완료 처리 가능합니다.',
    blocksCompletion: false
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_file_submission',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '비교표와 추천안을 제출합니다.'
  });

  assert.equal(result.status, '완료');
  assert.equal(evaluator.calls[0].actionId, 'task_file_submission');
  assert.equal(store.calls.find(([name]) => name === 'submitTaskResult')[1].resultType, '작업 제출');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '완료');
});

test('handleTaskActionSubmission keeps partial work submissions for next progress', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'informational',
    score: 62,
    summary: '진행 내용은 있지만 완료 기준은 아직 부족합니다.',
    reasons: ['자료 일부를 확인했습니다.'],
    missingItems: ['최종 추천안'],
    feedbackToUser: '다음 작업에서 추천안을 보완하세요.',
    blocksCompletion: false
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_file_submission',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: 'AudioSet 라이선스만 확인했습니다.'
  });

  assert.equal(result.status, '추가 진행 예정');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '추가 진행 예정');
});

test('handleTaskActionSubmission marks weak work submissions as needs revision', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'needs_revision',
    score: 25,
    summary: '제출 내용이 부족합니다.',
    reasons: ['완료 기준과 관련된 증거가 없습니다.'],
    missingItems: ['비교표', '추천안'],
    feedbackToUser: '제출 내용을 다시 정리해 주세요.',
    blocksCompletion: true
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_file_submission',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'suhyeon',
    rawText: '했습니다.'
  });

  assert.equal(result.status, '보완 필요');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '보완 필요');
});

test('handleTaskAcceptAndPrompt accepts a task and posts the Codex prompt in the board thread', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001',
      threadTs: '1700000000.000001'
    }
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskAcceptAndPrompt({
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon'
  });

  assert.equal(result.status, '수락');
  assert.match(result.responseText, /Codex 프롬프트를 생성했습니다/);
  const statusUpdate = store.calls.find(([name]) => name === 'updateTaskStatus');
  assert.equal(statusUpdate[1].status, '수락');
  assert.equal(statusUpdate[1].acceptedAt, '2026-06-28T02:00:00.000Z');

  const promptPost = slackClient.calls.find(([name, input]) => name === 'postMessage' && input.thread_ts);
  assert.equal(promptPost[1].channel, 'C_IN_PROCESS');
  assert.equal(promptPost[1].thread_ts, '1700000000.000001');
  assert.match(promptPost[1].text, /Codex 프롬프트가 생성되었습니다/);
  assert.equal(promptPost[1].blocks[1].elements[0].text.text, '프롬프트 보기/복사');

  const promptInsert = store.calls.find(([name]) => name === 'createCodexPrompt');
  assert.equal(promptInsert[1].taskId, 'task-1');
  assert.match(promptInsert[1].prompt, /센서 후보 정리/);
  assert.equal(promptInsert[1].slackMessageTs, '1710000000.000001');
});

test('handleTaskAcceptDirect accepts a task without creating a Codex prompt', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001',
      threadTs: '1700000000.000001'
    }
  });
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskAcceptDirect({
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon'
  });

  assert.equal(result.status, '수락');
  assert.match(result.responseText, /직접 진행으로 수락했습니다/);
  const statusUpdate = store.calls.find(([name]) => name === 'updateTaskStatus');
  assert.equal(statusUpdate[1].status, '수락');
  assert.equal(statusUpdate[1].acceptedAt, '2026-06-28T02:00:00.000Z');
  assert.equal(store.calls.some(([name]) => name === 'createCodexPrompt'), false);
  assert.equal(slackClient.calls.some(([name]) => name === 'postMessage'), false);
  assert.equal(slackClient.calls.at(-1)[0], 'update');
});

test('handleCodexPromptCopyRequest returns a copyable prompt message', async () => {
  const store = createFakeStore();
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user]
  });

  const result = await service.handleCodexPromptCopyRequest({ taskId: 'task-1' });

  assert.match(result.text, /Codex 프롬프트/);
  assert.match(result.blocks[0].text.text, /선택해서 복사/);
  assert.match(result.blocks[1].text.text, /Subjector Codex prompt/);
  assert.deepEqual(store.calls.find(([name]) => name === 'getLatestCodexPromptForTask'), [
    'getLatestCodexPromptForTask',
    'task-1'
  ]);
});

test('handleCodexPromptCopyRequest returns task help when no stored prompt exists', async () => {
  const store = createFakeStore({ latestCodexPrompt: null });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user]
  });

  const result = await service.handleCodexPromptCopyRequest({ taskId: 'task-1' });

  assert.match(result.text, /도움 받기/);
  assert.match(result.text, /Codex를 쓰면 좋은 부분/);
  assert.match(result.text, /사람이 직접 확인할 것/);
  assert.doesNotMatch(result.text, /수락 및 Codex 프롬프트 생성/);
  assert.deepEqual(store.calls.find(([name]) => name === 'getTaskById'), [
    'getTaskById',
    'task-1'
  ]);
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

test('handleTaskActionSubmission stores stop-for-today output with non-blocking LLM feedback', async () => {
  const evaluator = createFakeTaskEvaluator({
    verdict: 'informational',
    score: 70,
    summary: '진행 상황은 이해됩니다.',
    reasons: ['다음 시작 지점이 있습니다.'],
    missingItems: ['남은 검증 항목'],
    feedbackToUser: '다음에는 검증 항목을 보완해 주세요.',
    blocksCompletion: false
  });
  const store = createFakeStore({ existingMessage: { channelId: 'C_IN_PROCESS', messageTs: '1700000000.000001' } });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    taskEvaluator: evaluator,
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
  assert.match(result.responseText, /진행 상황은 이해됩니다/);
  assert.equal(store.calls.find(([name]) => name === 'submitTaskResult')[1].parsedSummary.verdict, 'informational');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '오늘은 여기까지');
});

test('handleTaskActionSubmission marks a task cleaned up with type, reason, and history', async () => {
  const store = createFakeStore({
    existingMessage: { messageTs: '1710000000.000100', threadTs: '1710000000.000100' },
    tasks: []
  });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T02:00:00.000Z')
  });

  const result = await service.handleTaskActionSubmission({
    actionId: 'task_cleanup',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    submittedByUserKey: 'joeun',
    rawText: '[정리 유형]\ntask로 하지 않음\n\n[정리 사유]\n오늘 회의에서 정리한 내용이라 별도 진행 부담을 만들지 않기로 함'
  });

  assert.equal(result.status, '정리됨');
  assert.match(result.responseText, /task를 정리됨으로 변경했습니다/);
  assert.deepEqual(store.calls.find(([name]) => name === 'submitTaskResult')[1], {
    taskId: 'task-1',
    resultType: '정리됨',
    rawText: '[정리 유형]\ntask로 하지 않음\n\n[정리 사유]\n오늘 회의에서 정리한 내용이라 별도 진행 부담을 만들지 않기로 함',
    submittedByUserKey: 'joeun'
  });
  assert.deepEqual(store.calls.find(([name]) => name === 'updateTaskContextFromCleanup')[1], {
    taskId: 'task-1',
    cleanedByUserKey: 'joeun',
    cleanupType: 'task로 하지 않음',
    reason: '오늘 회의에서 정리한 내용이라 별도 진행 부담을 만들지 않기로 함',
    rawText: '[정리 유형]\ntask로 하지 않음\n\n[정리 사유]\n오늘 회의에서 정리한 내용이라 별도 진행 부담을 만들지 않기로 함'
  });
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '정리됨');
  assert.ok(store.calls.some(([name]) => name === 'listOpenTasksForUser'));
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
    rawText: [
      '[해야 할 일 변경]',
      'ESP32 기준 비교로 좁힘',
      '',
      '[확인할 것 추가/수정]',
      '가격과 전력 확인',
      '',
      '[완료 기준 변경 제안]',
      '추천 후보 1개 제시'
    ].join('\n')
  });

  assert.equal(result.status, '수락');
  assert.match(store.calls.find(([name]) => name === 'createChangeRequest')[1].rawText, /해야 할 일 변경/);
  assert.equal(store.calls.find(([name]) => name === 'updateTaskContextFromChange')[1].why, 'ESP32 기준 비교로 좁힘');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskContextFromChange')[1].neededInfo, '가격과 전력 확인');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskContextFromChange')[1].doneCriteria, '추천 후보 1개 제시');
  assert.equal(store.calls.find(([name]) => name === 'updateTaskStatus')[1].status, '수락');
});

test('handleEndWork folds the personal DM task board without deleting tasks', async () => {
  const store = createFakeStore({
    existingMessagesByPurpose: {
      'dm_task_board:suhyeon': {
        channelId: 'D_SUHYEON',
        messageTs: '1700000000.000010'
      }
    },
    tasks: [
      {
        id: 'task-1',
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
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleEndWork({ user, dmChannelId: 'D_SUHYEON' });

  assert.match(result.dmText, /오늘 작업을 종료했습니다/);
  assert.equal(store.calls.some(([name]) => name === 'markAcceptedTasksUnresolvedForUser'), false);
  assert.equal(store.calls.some(([name]) => name === 'updateTaskStatus'), false);
  const dmUpdate = slackClient.calls.find(([name, input]) => name === 'update' && input.channel === 'D_SUHYEON');
  assert.ok(dmUpdate);
  assert.match(dmUpdate[1].text, /미완료 task는 다음 출근 때 다시 표시됩니다/);
});
test('handleDailySummary returns a daily summary without recording attendance', async () => {
  const store = createFakeStore();
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleDailySummary({ user });

  assert.match(result.dmText, /수현님, 오늘 한 일 요약입니다/);
  assert.match(result.dmText, /센서 후보 정리/);
  assert.match(result.dmText, /ESP32 우선 추천/);
  assert.equal(store.calls.some(([name]) => name === 'endWorkSession'), false);
  assert.deepEqual(store.calls.find(([name]) => name === 'markAcceptedTasksUnresolvedForUser')[1], {
    userKey: 'suhyeon'
  });
  assert.equal(store.calls.find(([name]) => name === 'listDailyTaskResultsForUser')[1].fromIso, '2026-06-27T15:00:00.000Z');
  assert.equal(store.calls.find(([name]) => name === 'listDailyTaskResultsForUser')[1].toIso, '2026-06-28T15:00:00.000Z');
});

test('handleDailySummary refreshes #in-process after marking accepted tasks unresolved', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001'
    },
    tasks: [
      {
        id: 'task-1',
        title: '센서 후보 정리',
        status: '미정리',
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
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  await service.handleDailySummary({ user });

  const update = slackClient.calls.find(([name]) => name === 'update');
  assert.equal(update[1].channel, 'C_IN_PROCESS');
  assert.equal(update[1].ts, '1700000000.000001');
  assert.match(update[1].text, /미정리/);
});

test('handleDailySummary does not update #finals from all-ended attendance state', async () => {
  const store = createFakeStore({
    endedSessions: [
      { userKey: 'suhyeon', workDate: '2026-06-28', endedAt: '2026-06-28T10:00:00.000Z' },
      { userKey: 'joeun', workDate: '2026-06-28', endedAt: '2026-06-28T11:00:00.000Z' },
      { userKey: 'minsung', workDate: '2026-06-28', endedAt: '2026-06-28T12:00:00.000Z' }
    ]
  });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleDailySummary({ user: minsung });

  assert.match(result.dmText, /민성님, 오늘 한 일 요약입니다/);
  assert.doesNotMatch(result.dmText, /#finals 누적 정리도 업데이트했습니다/);
  assert.equal(result.finalsUpdated, undefined);
  assert.equal(store.calls.some(([name]) => name === 'listEndedWorkSessionsForDate'), false);
  assert.equal(store.calls.some(([name]) => name === 'getFinalsUpdateForDate'), false);
  assert.equal(store.calls.some(([name]) => name === 'createFinalsUpdate'), false);
});

test('handleDailySummary never waits for other users before returning the summary', async () => {
  const store = createFakeStore({
    endedSessions: [
      { userKey: 'suhyeon', workDate: '2026-06-28', endedAt: '2026-06-28T10:00:00.000Z' },
      { userKey: 'minsung', workDate: '2026-06-28', endedAt: '2026-06-28T12:00:00.000Z' }
    ]
  });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleDailySummary({ user: minsung });

  assert.doesNotMatch(result.dmText, /#finals 누적 정리도 업데이트했습니다/);
  assert.equal(store.calls.some(([name]) => name === 'createFinalsUpdate'), false);
});

test('handleDailySummary ignores existing finals updates because finals is manual or scheduled', async () => {
  const store = createFakeStore({
    endedSessions: [
      { userKey: 'suhyeon', workDate: '2026-06-28', endedAt: '2026-06-28T10:00:00.000Z' },
      { userKey: 'joeun', workDate: '2026-06-28', endedAt: '2026-06-28T11:00:00.000Z' },
      { userKey: 'minsung', workDate: '2026-06-28', endedAt: '2026-06-28T12:00:00.000Z' }
    ],
    finalsUpdateForDate: {
      id: 'finals-1',
      workDate: '2026-06-28',
      status: '미리보기',
      preview: {}
    }
  });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleDailySummary({ user: minsung });

  assert.doesNotMatch(result.dmText, /#finals 누적 정리도 업데이트했습니다/);
  assert.equal(store.calls.some(([name]) => name === 'createFinalsUpdate'), false);
});

test('handleFinalsPreview directly updates #finals and returns a DM message', async () => {
  const store = createFakeStore();
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleFinalsPreview({ user });

  assert.match(result.dmText, /#finals 누적 정리를 업데이트했습니다/);
  const updateCall = store.calls.find(([name]) => name === 'createFinalsUpdate');
  assert.equal(updateCall[1].workDate, '2026-06-28');
  assert.equal(updateCall[1].preview.workDate, '2026-06-28');
  assert.equal(updateCall[1].reason, 'manual');
  assert.equal(slackClient.calls.find(([name]) => name === 'postMessage')[1].channel, 'C_FINALS');
  assert.ok(store.calls.some(([name]) => name === 'listAllTasks'));
  assert.ok(store.calls.some(([name]) => name === 'listAllTaskResults'));
  assert.ok(store.calls.some(([name]) => name === 'listAllChangeRequests'));
});

test('handleFinalsPreview updates the existing #finals cumulative message', async () => {
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

  await service.handleFinalsPreview({ user });

  const update = slackClient.calls.find(([name]) => name === 'update');
  assert.equal(update[1].channel, 'C_FINALS');
  assert.equal(update[1].ts, '1700000000.000001');
  assert.equal(store.calls.some(([name]) => name === 'upsertSlackMessage'), false);
});

test('handleFinalsPreview reposts #finals when the stored Slack message was deleted', async () => {
  const deletedMessageError = new Error('message_not_found');
  deletedMessageError.data = { error: 'message_not_found' };
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_FINALS',
      messageTs: '1700000000.000001'
    }
  });
  const slackClient = createFakeSlackClient({
    updateError: deletedMessageError
  });
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: [user],
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  await service.handleFinalsPreview({ user });

  assert.equal(slackClient.calls[0][0], 'update');
  assert.equal(slackClient.calls[1][0], 'postMessage');
  assert.equal(slackClient.calls[1][1].channel, 'C_FINALS');
  const upsert = store.calls.find(([name]) => name === 'upsertSlackMessage');
  assert.equal(upsert[1].purpose, 'finals:cumulative');
  assert.equal(upsert[1].messageTs, '1710000000.000001');
  assert.ok(store.calls.find(([name]) => name === 'createFinalsUpdate'));
});

test('handleFinalsPreview stores an LLM narrative when a finals narrator is configured', async () => {
  const store = createFakeStore();
  const narratorCalls = [];
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    finalsNarrator: {
      async narrate(input) {
        narratorCalls.push(input);
        return {
          projectOverview: '프로젝트는 ESP32 연결 검증 단계로 넘어가고 있습니다.',
          memberProgress: [
            '수현님은 센서 후보 정리를 완료했습니다.'
          ],
          nextFocus: [
            '내일은 회로 연결 위험을 먼저 확인합니다.'
          ]
        };
      }
    },
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleFinalsPreview({ user });

  assert.equal(narratorCalls.length, 1);
  assert.equal(narratorCalls[0].workDate, '2026-06-28');
  assert.match(result.dmText, /#finals 누적 정리를 업데이트했습니다/);
  const updateCall = store.calls.find(([name]) => name === 'createFinalsUpdate');
  assert.match(updateCall[1].preview.narrative.projectOverview, /ESP32 연결 검증/);
});

test('handleFinalsPreview falls back to deterministic narrative when the finals narrator fails', async () => {
  const loggerCalls = [];
  const store = createFakeStore();
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: [user],
    logger: {
      warn(...input) {
        loggerCalls.push(input);
      }
    },
    finalsNarrator: {
      async narrate() {
        throw new Error('quota exceeded');
      }
    },
    clock: () => new Date('2026-06-28T12:00:00.000Z')
  });

  const result = await service.handleFinalsPreview({ user });

  assert.match(result.dmText, /#finals 누적 정리를 업데이트했습니다/);
  assert.ok(store.calls.find(([name]) => name === 'createFinalsUpdate'));
  assert.equal(loggerCalls.length, 1);
});

test('handleScheduledFinalsUpdate does nothing before 18:00 KST', async () => {
  const store = createFakeStore();
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T08:59:00.000Z')
  });

  const result = await service.handleScheduledFinalsUpdate();

  assert.equal(result.updated, false);
  assert.equal(result.reason, 'before_cutoff');
  assert.equal(store.calls.some(([name]) => name === 'createFinalsUpdate'), false);
});

test('handleScheduledFinalsUpdate updates #finals once after 18:00 KST', async () => {
  const store = createFakeStore();
  const slackClient = createFakeSlackClient();
  const service = createInProcessService({
    store,
    slackClient,
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T09:00:00.000Z')
  });

  const result = await service.handleScheduledFinalsUpdate();

  assert.equal(result.updated, true);
  assert.equal(result.reason, 'scheduled');
  assert.equal(store.calls.find(([name]) => name === 'getFinalsUpdateForDate')[1].workDate, '2026-06-28');
  assert.equal(store.calls.find(([name]) => name === 'createFinalsUpdate')[1].reason, 'scheduled');
  assert.equal(slackClient.calls.find(([name]) => name === 'postMessage')[1].channel, 'C_FINALS');
});

test('handleScheduledFinalsUpdate skips when a finals update already exists for the day', async () => {
  const store = createFakeStore({
    finalsUpdateForDate: {
      id: 'finals-1',
      workDate: '2026-06-28',
      status: '승인됨',
      preview: {}
    }
  });
  const service = createInProcessService({
    store,
    slackClient: createFakeSlackClient(),
    config,
    users: allUsers,
    clock: () => new Date('2026-06-28T09:00:00.000Z')
  });

  const result = await service.handleScheduledFinalsUpdate();

  assert.equal(result.updated, false);
  assert.equal(result.reason, 'already_updated');
  assert.equal(store.calls.some(([name]) => name === 'createFinalsUpdate'), false);
});
