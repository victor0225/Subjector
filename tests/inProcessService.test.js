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
  tasks = [],
  endedSessions = [],
  finalsUpdateForDate = null
} = {}) {
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
    async createCodexPrompt(input) {
      calls.push(['createCodexPrompt', input]);
    },
    async getLatestCodexPromptForTask(taskId) {
      calls.push(['getLatestCodexPromptForTask', taskId]);
      return {
        taskId,
        prompt: 'Subjector Codex prompt',
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

test('handleStartWork posts task detail threads for tasks that do not have one yet', async () => {
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001',
      threadTs: '1700000000.000001'
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

  await service.handleStartWork({ user });

  const detailPost = slackClient.calls.find(([name, input]) => name === 'postMessage' && input.thread_ts === '1700000000.000001');
  assert.ok(detailPost);
  assert.match(detailPost[1].text, /task 상세 맥락/);
  assert.match(detailPost[1].text, /왜 생긴 task인가/);

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

test('handleStartWork reposts task details when the board thread was recreated', async () => {
  const deletedMessageError = new Error('message_not_found');
  deletedMessageError.data = { error: 'message_not_found' };
  const store = createFakeStore({
    existingMessage: {
      channelId: 'C_IN_PROCESS',
      messageTs: '1700000000.000001',
      threadTs: '1700000000.000001'
    },
    existingMessagesByPurpose: {
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
  assert.ok(detailPost);
  assert.match(detailPost[1].text, /task 상세 맥락/);
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

test('handleEndWork refreshes #in-process after marking accepted tasks unresolved', async () => {
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

  await service.handleEndWork({ user });

  const update = slackClient.calls.find(([name]) => name === 'update');
  assert.equal(update[1].channel, 'C_IN_PROCESS');
  assert.equal(update[1].ts, '1700000000.000001');
  assert.match(update[1].text, /미정리/);
});

test('handleEndWork creates a finals preview when all users have ended work and no preview exists', async () => {
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

  const result = await service.handleEndWork({ user: minsung });

  assert.match(result.dmText, /민성님, 오늘 한 일 요약입니다/);
  assert.match(result.finalsPreviewDmText, /#finals 누적 업데이트 미리보기/);
  assert.equal(result.leadUser.key, 'suhyeon');
  assert.equal(store.calls.find(([name]) => name === 'getFinalsUpdateForDate')[1].workDate, '2026-06-28');
  assert.equal(store.calls.find(([name]) => name === 'createFinalsPreview')[1].workDate, '2026-06-28');
});

test('handleEndWork does not create a finals preview until every user has ended work', async () => {
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

  const result = await service.handleEndWork({ user: minsung });

  assert.equal(result.finalsPreviewDmText, undefined);
  assert.equal(store.calls.some(([name]) => name === 'createFinalsPreview'), false);
});

test('handleEndWork does not create a duplicate finals preview for the same date', async () => {
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

  const result = await service.handleEndWork({ user: minsung });

  assert.equal(result.finalsPreviewDmText, undefined);
  assert.equal(store.calls.some(([name]) => name === 'createFinalsPreview'), false);
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
