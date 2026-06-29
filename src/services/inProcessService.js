import { buildCodexPrompt } from '../domain/codexPrompt.js';
import { buildDailySummaryMessage } from '../domain/dailySummary.js';
import { buildFinalsChannelMessage, buildFinalsPreviewMessage, buildFinalsPreviewRecord } from '../domain/finalsSummary.js';
import {
  buildInProcessBoardMessage,
  buildInProcessMessagePurpose,
  buildTaskDetailThreadMessage,
  formatKstDate
} from '../domain/inProcessBoard.js';
import { buildEvaluationFeedbackMessage, normalizeTaskEvaluation } from '../domain/taskEvaluation.js';
import { taskActionFromActionId } from '../domain/taskActions.js';
import { formatDisplayName } from '../domain/users.js';
import { buildCodexPromptBlocks, buildCodexPromptCopyBlocks, buildTextMessageBlocks } from '../slack/blocks.js';

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

function isSlackMessageNotFound(error) {
  return error?.data?.error === 'message_not_found'
    || error?.error === 'message_not_found'
    || error?.message === 'message_not_found';
}

function taskIdFromDetailPurpose(purpose) {
  const text = String(purpose ?? '');
  return text.startsWith('task_detail:') ? text.slice('task_detail:'.length) : '';
}

function compactResultText(rawText) {
  const lines = String(rawText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(0, 3).join(' / ');
}

function normalizeSubmissionAttachments(attachments = []) {
  return attachments
    .filter((file) => file?.id || file?.name)
    .map((file) => ({
      id: file.id,
      name: file.name,
      mimetype: file.mimetype,
      filetype: file.filetype,
      size: file.size
    }));
}

function formatAttachmentLine(file) {
  const details = [
    file.filetype,
    file.mimetype,
    typeof file.size === 'number' ? `${file.size} bytes` : null
  ].filter(Boolean).join(', ');

  return `- ${file.name ?? file.id}${details ? ` (${details})` : ''}`;
}

function buildSubmissionText({ rawText, attachments = [], attachmentNote = '' }) {
  const trimmedText = String(rawText ?? '').trim();
  const trimmedNote = String(attachmentNote ?? '').trim();
  const normalizedAttachments = normalizeSubmissionAttachments(attachments);

  return [
    trimmedText,
    trimmedNote ? `[첨부 설명]\n${trimmedNote}` : null,
    normalizedAttachments.length ? `[첨부 파일]\n${normalizedAttachments.map(formatAttachmentLine).join('\n')}` : null
  ].filter(Boolean).join('\n\n');
}

function buildParsedSummary({ evaluation, attachments = [], attachmentNote = '' }) {
  const parsedSummary = evaluation ? { ...evaluation } : {};
  const normalizedAttachments = normalizeSubmissionAttachments(attachments);
  const trimmedNote = String(attachmentNote ?? '').trim();

  if (trimmedNote) {
    parsedSummary.attachmentNote = trimmedNote;
  }

  if (normalizedAttachments.length) {
    parsedSummary.attachments = normalizedAttachments;
  }

  return Object.keys(parsedSummary).length ? parsedSummary : null;
}

function buildTaskCompletionThreadText({ user, task, rawText }) {
  const summary = compactResultText(rawText);
  return [
    '[task 완료 기록]',
    `- 담당자: ${formatDisplayName(user)}`,
    `- task: ${task?.title ?? 'task'}`,
    '- 상태: 완료',
    summary ? `- 제출 요약: ${summary}` : null
  ].filter(Boolean).join('\n');
}

export function createInProcessService({
  store,
  slackClient,
  config,
  users = config.users,
  clock = () => new Date(),
  taskEvaluator = null,
  finalsNarrator = null,
  logger = console
}) {
  async function postBoardMessage({ channelId, message, purpose }) {
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

    return posted;
  }

  async function ensureTaskDetailThreads({ channelId, threadTs, tasks, user }) {
    if (!threadTs) {
      return;
    }

    for (const task of tasks) {
      if (!task.id) {
        continue;
      }

      const purpose = `task_detail:${task.id}`;
      const existingDetail = await store.findSlackMessage({
        purpose,
        channelId
      });

      if (existingDetail?.messageTs && existingDetail.threadTs === threadTs) {
        continue;
      }

      const detail = buildTaskDetailThreadMessage({ user, task });
      const posted = await slackClient.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: detail.text,
        blocks: detail.blocks
      });

      await store.upsertSlackMessage({
        purpose,
        channelId,
        messageTs: posted.ts,
        threadTs
      });
    }
  }

  async function cleanupStaleTaskDetailThreads({ channelId, threadTs, tasks }) {
    if (!threadTs) {
      return;
    }

    const currentTaskIds = new Set(tasks.map((task) => task.id).filter(Boolean));
    const existingDetails = await store.listTaskDetailMessagesForThread({
      channelId,
      threadTs
    });

    for (const detail of existingDetails) {
      const taskId = taskIdFromDetailPurpose(detail.purpose);
      if (!taskId || currentTaskIds.has(taskId)) {
        continue;
      }

      try {
        await slackClient.chat.delete({
          channel: channelId,
          ts: detail.messageTs
        });
      } catch (error) {
        if (!isSlackMessageNotFound(error)) {
          throw error;
        }
      }

      await store.deleteSlackMessage({
        channelId,
        messageTs: detail.messageTs
      });
    }
  }

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
      try {
        await slackClient.chat.update({
          channel: channelId,
          ts: existingMessage.messageTs,
          text: message.text,
          blocks: message.blocks
        });
      } catch (error) {
        if (!isSlackMessageNotFound(error)) {
          throw error;
        }

        const posted = await postBoardMessage({
          channelId,
          message,
          purpose
        });

        await ensureTaskDetailThreads({
          channelId,
          threadTs: posted.ts,
          tasks,
          user
        });

        return {
          action: 'reposted',
          taskCount: tasks.length
        };
      }

      await ensureTaskDetailThreads({
        channelId,
        threadTs: existingMessage.threadTs ?? existingMessage.messageTs,
        tasks,
        user
      });

      await cleanupStaleTaskDetailThreads({
        channelId,
        threadTs: existingMessage.threadTs ?? existingMessage.messageTs,
        tasks
      });

      return {
        action: 'updated',
        taskCount: tasks.length
      };
    }

    const posted = await postBoardMessage({
      channelId,
      message,
      purpose,
    });

    await ensureTaskDetailThreads({
      channelId,
      threadTs: posted.ts,
      tasks,
      user
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
    const verbByAction = {
      updated: '업데이트했습니다',
      posted: '만들었습니다',
      reposted: '다시 만들었습니다'
    };
    const verb = verbByAction[result.action] ?? '업데이트했습니다';

    return {
      ...result,
      dmText: `${formatDisplayName(user)}, 출근 확인했습니다. #in-process에 오늘 task 영역을 ${verb}.`
    };
  }

  async function handleRefreshInProcess({ user }) {
    const now = clock();
    const result = await renderBoard({ user, now });

    return {
      ...result,
      dmText: `${formatDisplayName(user)}, #in-process task 영역을 최신화했습니다.`
    };
  }

  async function handleArchiveTestTasks({ user }) {
    const now = clock();
    await store.archiveTestTasks({ keyword: '테스트' });
    await renderBoard({ user, now });

    return {
      dmText: `${formatDisplayName(user)}, 테스트 task를 보관 처리하고 #in-process task 영역을 최신화했습니다.`
    };
  }

  async function createFinalsPreviewForWorkDate(workDate) {
    const [tasks, results, changeRequests] = await Promise.all([
      store.listAllTasks({ limit: 100 }),
      store.listAllTaskResults({ limit: 100 }),
      store.listAllChangeRequests({ limit: 100 })
    ]);
    let narrative = null;
    if (finalsNarrator) {
      try {
        narrative = await finalsNarrator.narrate({
          workDate,
          tasks,
          results,
          changeRequests,
          users
        });
      } catch (error) {
        logger.warn?.('Finals narration failed; falling back to deterministic summary', error);
      }
    }

    const preview = buildFinalsPreviewRecord({
      workDate,
      tasks,
      results,
      changeRequests,
      users,
      narrative
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

    await renderBoard({ user, now });

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

  async function handleCodexPromptCopyRequest({ taskId }) {
    const record = await store.getLatestCodexPromptForTask(taskId);

    if (!record?.prompt) {
      const text = '저장된 Codex 프롬프트를 찾지 못했습니다. task에서 `수락 및 Codex 프롬프트 생성`을 다시 실행해 주세요.';
      return {
        text,
        blocks: buildTextMessageBlocks(text)
      };
    }

    const text = 'Codex 프롬프트 복사용 본문입니다. Slack 메시지에서 아래 본문을 선택해 복사해 주세요.';
    return {
      text,
      blocks: buildCodexPromptCopyBlocks({
        prompt: record.prompt
      })
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

    async function postFinalsMessage() {
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

    if (existingMessage?.messageTs) {
      try {
        await slackClient.chat.update({
          channel: channelId,
          ts: existingMessage.messageTs,
          text
        });
      } catch (error) {
        if (!isSlackMessageNotFound(error)) {
          throw error;
        }

        await postFinalsMessage();
      }
    } else {
      await postFinalsMessage();
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

  async function handleTaskAcceptDirect({ taskId, assigneeUserKey }) {
    const now = clock();
    const task = await store.getTaskById(taskId);
    const ownerKey = task?.assigneeUserKey ?? assigneeUserKey;
    const owner = users.find((candidate) => candidate.key === ownerKey);

    if (!owner) {
      throw new Error(`Unknown task owner: ${ownerKey}`);
    }

    await store.updateTaskStatus({
      taskId,
      status: '수락',
      acceptedAt: now.toISOString()
    });

    await renderBoard({ user: owner, now });

    return {
      status: '수락',
      responseText: `${formatDisplayName(owner)}, 직접 진행으로 수락했습니다. 작업이 끝나면 완료 또는 오늘은 여기까지로 결과를 제출해 주세요.`
    };
  }

  async function handleTaskActionSubmission({ actionId, taskId, assigneeUserKey, submittedByUserKey, rawText, attachments = [], attachmentNote = '' }) {
    const action = taskActionFromActionId(actionId);
    if (!action) {
      throw new Error(`Unknown task action: ${actionId}`);
    }

    const now = clock();
    const task = await store.getTaskById(taskId);
    const ownerKey = task?.assigneeUserKey ?? assigneeUserKey;
    const submissionText = buildSubmissionText({ rawText, attachments, attachmentNote });
    let evaluation = null;
    let finalStatus = action.status;

    if (taskEvaluator && ['task_complete', 'task_stop_today'].includes(actionId)) {
      evaluation = normalizeTaskEvaluation(await taskEvaluator.evaluateSubmission({
        actionId,
        actionLabel: action.label,
        task,
        rawText: submissionText
      }));

      if (actionId === 'task_complete' && evaluation.blocksCompletion) {
        finalStatus = '보완 필요';
      }
    }

    if (actionId === 'task_change_request') {
      await store.createChangeRequest({
        taskId,
        proposerUserKey: submittedByUserKey,
        rawText
      });
    } else {
      const resultInput = {
        taskId,
        resultType: action.resultType,
        rawText: submissionText,
        submittedByUserKey
      };
      const resultParsedSummary = buildParsedSummary({ evaluation, attachments, attachmentNote });
      if (resultParsedSummary) {
        resultInput.parsedSummary = resultParsedSummary;
      }

      await store.submitTaskResult(resultInput);
    }

    const statusInput = {
      taskId,
      status: finalStatus
    };
    if (finalStatus === '완료') {
      statusInput.completedAt = now.toISOString();
    }

    await store.updateTaskStatus(statusInput);

    const owner = users.find((candidate) => candidate.key === ownerKey);
    if (owner) {
      if (finalStatus === '완료' && task?.status !== '완료') {
        const channelId = config.channels.inProcess;
        const boardMessage = await store.findSlackMessage({
          purpose: buildInProcessMessagePurpose(owner),
          channelId
        });
        const threadTs = boardMessage?.threadTs ?? boardMessage?.messageTs;

        if (threadTs) {
          const text = buildTaskCompletionThreadText({
            user: owner,
            task,
            rawText: submissionText
          });

          await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text,
            blocks: buildTextMessageBlocks(text)
          });
        }
      }

      await renderBoard({ user: owner, now });
    }

    if (evaluation) {
      return {
        status: finalStatus,
        responseText: buildEvaluationFeedbackMessage({
          actionLabel: action.label,
          taskTitle: task?.title ?? 'task',
          finalStatus,
          evaluation
        })
      };
    }

    return {
      status: finalStatus,
      responseText: `${formatDisplayName(owner)}, task 상태를 ${finalStatus}로 변경했습니다.`
    };
  }

  async function getTaskTitle(taskId) {
    const task = await store.getTaskById(taskId);
    return task?.title ?? 'task';
  }

  return {
    handleStartWork,
    handleRefreshInProcess,
    handleArchiveTestTasks,
    handleEndWork,
    handleFinalsPreview,
    handleFinalsApproval,
    handleTaskAcceptAndPrompt,
    handleTaskAcceptDirect,
    handleCodexPromptCopyRequest,
    handleTaskActionSubmission,
    getTaskTitle
  };
}
