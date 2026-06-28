import { buildCodexPrompt } from '../domain/codexPrompt.js';
import { buildDailySummaryMessage } from '../domain/dailySummary.js';
import { buildFinalsChannelMessage, buildFinalsPreviewMessage, buildFinalsPreviewRecord } from '../domain/finalsSummary.js';
import { buildInProcessBoardMessage, buildInProcessMessagePurpose, formatKstDate } from '../domain/inProcessBoard.js';
import { taskActionFromActionId } from '../domain/taskActions.js';
import { formatDisplayName } from '../domain/users.js';
import { buildCodexPromptBlocks } from '../slack/blocks.js';

function kstDayRange(workDate) {
  const [year, month, day] = workDate.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -9, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0));

  return {
    fromIso: start.toISOString(),
    toIso: end.toISOString()
  };
}

function allUsersEndedWork({ users, sessions }) {
  const endedUserKeys = new Set(
    sessions
      .filter((session) => session.endedAt)
      .map((session) => session.userKey)
  );

  return users.every((user) => endedUserKeys.has(user.key));
}

export function createInProcessService({ store, slackClient, config, users = config.users, clock = () => new Date() }) {
  async function renderBoard({ user, now = clock() }) {
    const workDate = formatKstDate(now);
    const channelId = config.channels.inProcess;
    const purpose = buildInProcessMessagePurpose(user);

    const tasks = await store.listOpenTasksForUser(user.key);
    const message = buildInProcessBoardMessage({
      user,
      tasks,
      workDate
    });

    const existingMessage = await store.findSlackMessage({
      purpose,
      channelId
    });

    if (existingMessage?.messageTs) {
      await slackClient.chat.update({
        channel: channelId,
        ts: existingMessage.messageTs,
        text: message.text,
        blocks: message.blocks
      });

      return {
        action: 'updated',
        taskCount: tasks.length
      };
    }

    const posted = await slackClient.chat.postMessage({
      channel: channelId,
      text: message.text,
      blocks: message.blocks
    });

    await store.upsertSlackMessage({
      purpose,
      channelId,
      messageTs: posted.ts,
      threadTs: posted.ts
    });

    return {
      action: 'posted',
      taskCount: tasks.length
    };
  }

  async function handleStartWork({ user }) {
    const now = clock();
    const workDate = formatKstDate(now);

    await store.startWorkSession({
      userKey: user.key,
      workDate,
      startedAt: now.toISOString()
    });

    const result = await renderBoard({ user, now });
    const verb = result.action === 'updated' ? '업데이트했습니다' : '만들었습니다';

    return {
      ...result,
      dmText: `${formatDisplayName(user)}, 출근 확인했습니다. #in-process에 오늘 task 영역을 ${verb}.`
    };
  }

  async function createFinalsPreviewForWorkDate(workDate) {
    const [tasks, results, changeRequests] = await Promise.all([
      store.listAllTasks({ limit: 100 }),
      store.listAllTaskResults({ limit: 100 }),
      store.listAllChangeRequests({ limit: 100 })
    ]);
    const preview = buildFinalsPreviewRecord({
      workDate,
      tasks,
      results,
      changeRequests
    });

    await store.createFinalsPreview({
      workDate,
      preview
    });

    return {
      dmText: buildFinalsPreviewMessage(preview)
    };
  }

  async function maybeCreateAutomaticFinalsPreview({ workDate }) {
    const sessions = await store.listEndedWorkSessionsForDate({ workDate });
    if (!allUsersEndedWork({ users, sessions })) {
      return null;
    }

    const existingFinalsUpdate = await store.getFinalsUpdateForDate({ workDate });
    if (existingFinalsUpdate) {
      return null;
    }

    const result = await createFinalsPreviewForWorkDate(workDate);
    const leadUser = users.find((candidate) => candidate.key === config.leadUserKey);

    return {
      finalsPreviewDmText: result.dmText,
      leadUser
    };
  }

  async function handleEndWork({ user }) {
    const now = clock();
    const workDate = formatKstDate(now);
    const { fromIso, toIso } = kstDayRange(workDate);

    await store.endWorkSession({
      userKey: user.key,
      workDate,
      endedAt: now.toISOString()
    });

    await store.markAcceptedTasksUnresolvedForUser({
      userKey: user.key
    });

    const [tasks, results, changeRequests] = await Promise.all([
      store.listDailyTasksForUser({ userKey: user.key }),
      store.listDailyTaskResultsForUser({ userKey: user.key, fromIso, toIso }),
      store.listDailyChangeRequestsForUser({ userKey: user.key, fromIso, toIso })
    ]);
    const automaticFinals = await maybeCreateAutomaticFinalsPreview({ workDate });

    return {
      dmText: buildDailySummaryMessage({
        user,
        workDate,
        tasks,
        results,
        changeRequests
      }),
      ...(automaticFinals ?? {})
    };
  }

  async function handleFinalsPreview({ user }) {
    const now = clock();
    const workDate = formatKstDate(now);
    return createFinalsPreviewForWorkDate(workDate);
  }

  async function handleFinalsApproval({ approvedByUserKey }) {
    const now = clock();
    const channelId = config.channels.finals;
    const latest = await store.getLatestFinalsPreview();

    if (!latest) {
      return {
        responseText: '승인할 #finals 미리보기가 없습니다. 먼저 `finals 업데이트`를 보내 주세요.'
      };
    }

    const text = buildFinalsChannelMessage(latest.preview);
    const existingMessage = await store.findSlackMessage({
      purpose: 'finals:cumulative',
      channelId
    });

    if (existingMessage?.messageTs) {
      await slackClient.chat.update({
        channel: channelId,
        ts: existingMessage.messageTs,
        text
      });
    } else {
      const posted = await slackClient.chat.postMessage({
        channel: channelId,
        text
      });

      await store.upsertSlackMessage({
        purpose: 'finals:cumulative',
        channelId,
        messageTs: posted.ts,
        threadTs: posted.ts
      });
    }

    await store.approveFinalsUpdate({
      id: latest.id,
      approvedByUserKey,
      approvedAt: now.toISOString()
    });

    return {
      responseText: '#finals 누적 정리를 반영했습니다.'
    };
  }

  async function handleTaskAcceptAndPrompt({ taskId, assigneeUserKey }) {
    const now = clock();
    const task = await store.getTaskById(taskId);
    const ownerKey = task?.assigneeUserKey ?? assigneeUserKey;
    const owner = users.find((candidate) => candidate.key === ownerKey);

    if (!owner) {
      throw new Error(`Unknown task owner: ${ownerKey}`);
    }

    const prompt = buildCodexPrompt({
      assignee: owner,
      task,
      context: task.context ?? {}
    });
    const channelId = config.channels.inProcess;
    const boardMessage = await store.findSlackMessage({
      purpose: buildInProcessMessagePurpose(owner),
      channelId
    });
    const threadTs = boardMessage?.threadTs ?? boardMessage?.messageTs;
    const postInput = {
      channel: channelId,
      text: 'Codex 프롬프트가 생성되었습니다.',
      blocks: buildCodexPromptBlocks({
        taskId,
        prompt
      })
    };

    if (threadTs) {
      postInput.thread_ts = threadTs;
    }

    const posted = await slackClient.chat.postMessage(postInput);

    await store.createCodexPrompt({
      taskId,
      prompt,
      slackChannelId: channelId,
      slackMessageTs: posted.ts
    });

    await store.updateTaskStatus({
      taskId,
      status: '수락',
      acceptedAt: now.toISOString()
    });

    await renderBoard({ user: owner, now });

    return {
      status: '수락',
      responseText: `${formatDisplayName(owner)}, Codex 프롬프트를 생성했습니다. #in-process 스레드를 확인해 주세요.`
    };
  }

  async function handleTaskActionSubmission({ actionId, taskId, assigneeUserKey, submittedByUserKey, rawText }) {
    const action = taskActionFromActionId(actionId);
    if (!action) {
      throw new Error(`Unknown task action: ${actionId}`);
    }

    const now = clock();
    const task = await store.getTaskById(taskId);
    const ownerKey = task?.assigneeUserKey ?? assigneeUserKey;

    if (actionId === 'task_change_request') {
      await store.createChangeRequest({
        taskId,
        proposerUserKey: submittedByUserKey,
        rawText
      });
    } else {
      await store.submitTaskResult({
        taskId,
        resultType: action.resultType,
        rawText,
        submittedByUserKey
      });
    }

    await store.updateTaskStatus({
      taskId,
      status: action.status,
      completedAt: action.status === '완료' ? now.toISOString() : null
    });

    const owner = users.find((candidate) => candidate.key === ownerKey);
    if (owner) {
      await renderBoard({ user: owner, now });
    }

    return {
      status: action.status,
      responseText: `${formatDisplayName(owner)}, task 상태를 ${action.status}로 변경했습니다.`
    };
  }

  async function getTaskTitle(taskId) {
    const task = await store.getTaskById(taskId);
    return task?.title ?? 'task';
  }

  return {
    handleStartWork,
    handleEndWork,
    handleFinalsPreview,
    handleFinalsApproval,
    handleTaskAcceptAndPrompt,
    handleTaskActionSubmission,
    getTaskTitle
  };
}
