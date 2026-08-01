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

function isSlackMessageNotFound(error) {
  return error?.data?.error === 'message_not_found'
    || error?.error === 'message_not_found'
    || error?.message === 'message_not_found';
}

function buildPersonalTaskBoardMessagePurpose(user) {
  return `dm_task_board:${user.key}`;
}

function buildPersonalTaskBoardClosedMessage({ user, workDate }) {
  const text = [
    `${formatDisplayName(user)}, 오늘 작업을 종료했습니다.`,
    `기준일: ${workDate}`,
    '',
    '미완료 task는 다음 출근 때 다시 표시됩니다.'
  ].join('\n');

  return {
    text,
    blocks: buildTextMessageBlocks(text)
  };
}

function kstHour(date) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).find((part) => part.type === 'hour')?.value;

  return Number(hour);
}

function isAtOrAfterFinalsCutoff(date) {
  return kstHour(date) >= 18;
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

function parseSection(rawText, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(rawText ?? '').match(new RegExp(`\\[${escaped}\\]\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)`));
  return match?.[1]?.trim() ?? '';
}

function parseTaskChangeText(rawText) {
  return {
    why: parseSection(rawText, '해야 할 일 변경'),
    neededInfo: parseSection(rawText, '확인할 것 추가/수정'),
    doneCriteria: parseSection(rawText, '완료 기준 변경 제안')
  };
}

function parseTaskCleanupText(rawText) {
  return {
    cleanupType: parseSection(rawText, '정리 유형'),
    reason: parseSection(rawText, '정리 사유')
  };
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

  async function renderPersonalTaskBoard({ user, dmChannelId = null, now = clock(), forcePost = false }) {
    const workDate = formatKstDate(now);
    const purpose = buildPersonalTaskBoardMessagePurpose(user);
    const existingMessage = await store.findSlackMessage({
      purpose,
      channelId: dmChannelId
    });
    const channelId = dmChannelId ?? existingMessage?.channelId;

    if (!channelId) {
      return {
        action: 'skipped',
        taskCount: 0
      };
    }

    const tasks = await store.listOpenTasksForUser(user.key);
    const message = buildInProcessBoardMessage({
      user,
      tasks,
      workDate,
      boardLabel: '개인 task 보드'
    });

    if (existingMessage?.messageTs && !forcePost) {
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

        await cleanupStaleTaskDetailThreads({
          channelId,
          threadTs: posted.ts,
          tasks
        });

        return {
          action: 'reposted',
          taskCount: tasks.length,
          messageTs: posted.ts
        };
      }

      const threadTs = existingMessage.threadTs ?? existingMessage.messageTs;
      await ensureTaskDetailThreads({
        channelId,
        threadTs,
        tasks,
        user
      });

      await cleanupStaleTaskDetailThreads({
        channelId,
        threadTs,
        tasks
      });

      return {
        action: 'updated',
        taskCount: tasks.length,
        messageTs: existingMessage.messageTs
      };
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

    await cleanupStaleTaskDetailThreads({
      channelId,
      threadTs: posted.ts,
      tasks
    });

    return {
      action: 'posted',
      taskCount: tasks.length,
      messageTs: posted.ts
    };
  }

  async function closePersonalTaskBoard({ user, dmChannelId = null, now = clock() }) {
    const workDate = formatKstDate(now);
    const purpose = buildPersonalTaskBoardMessagePurpose(user);
    const existingMessage = await store.findSlackMessage({
      purpose,
      channelId: dmChannelId
    });
    const channelId = dmChannelId ?? existingMessage?.channelId;

    if (!channelId) {
      return {
        action: 'skipped'
      };
    }

    const message = buildPersonalTaskBoardClosedMessage({ user, workDate });

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

        return {
          action: 'reposted',
          messageTs: posted.ts
        };
      }

      return {
        action: 'updated',
        messageTs: existingMessage.messageTs
      };
    }

    const posted = await postBoardMessage({
      channelId,
      message,
      purpose
    });

    return {
      action: 'posted',
      messageTs: posted.ts
    };
  }

  async function refreshPersonalTaskBoardIfOpen({ user, now = clock() }) {
    return renderPersonalTaskBoard({ user, now });
  }

  async function renderBoard({ user, now = clock() }) {
    const workDate = formatKstDate(now);
    const channelId = config.channels.inProcess;
    const purpose = buildInProcessMessagePurpose(user);

    const tasks = await store.listOpenTasksForUser(user.key);
    const message = buildInProcessBoardMessage({
      user,
      tasks,
      workDate,
      boardLabel: '팀 진행 과정 보드'
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

        await postBoardMessage({
          channelId,
          message,
          purpose
        });

        await cleanupStaleTaskDetailThreads({
          channelId,
          threadTs: existingMessage.threadTs ?? existingMessage.messageTs,
          tasks: []
        });

        return {
          action: 'reposted',
          taskCount: tasks.length
        };
      }


      await cleanupStaleTaskDetailThreads({
        channelId,
        threadTs: existingMessage.threadTs ?? existingMessage.messageTs,
        tasks: []
      });

      return {
        action: 'updated',
        taskCount: tasks.length
      };
    }

    await postBoardMessage({
      channelId,
      message,
      purpose,
    });

    return {
      action: 'posted',
      taskCount: tasks.length
    };
  }

  async function handleStartWork({ user, dmChannelId = null }) {
    const now = clock();
    const workDate = formatKstDate(now);

    await store.startWorkSession({
      userKey: user.key,
      workDate,
      startedAt: now.toISOString()
    });

    const personalResult = await renderPersonalTaskBoard({
      user,
      dmChannelId,
      now,
      forcePost: Boolean(dmChannelId)
    });
    const teamResult = await renderBoard({ user, now });
    const action = personalResult.action === 'skipped' ? teamResult.action : personalResult.action;
    const verbByAction = {
      updated: '업데이트했습니다',
      posted: personalResult.action === 'skipped' ? '만들었습니다' : '열었습니다',
      reposted: personalResult.action === 'skipped' ? '다시 만들었습니다' : '다시 열었습니다',
      skipped: '확인했습니다'
    };
    const verb = verbByAction[action] ?? '열었습니다';
    const target = personalResult.action === 'skipped' ? '#in-process 팀 진행 과정 보드' : '개인 task 보드';
    const suffix = personalResult.action === 'skipped' ? '' : ' #in-process 팀 진행 과정 보드도 갱신했습니다.';

    return {
      action,
      taskCount: personalResult.action === 'skipped' ? teamResult.taskCount : personalResult.taskCount,
      teamAction: teamResult.action,
      personalTaskCount: personalResult.taskCount,
      teamTaskCount: teamResult.taskCount,
      dmText: `${formatDisplayName(user)}, ${target}를 ${verb}.${suffix}`
    };
  }

  async function refreshBoardForUser({ user }) {
    return renderBoard({ user, now: clock() });
  }

  async function handleArchiveTestTasks({ user }) {
    const now = clock();
    await store.archiveTestTasks({ keyword: '테스트' });
    await renderBoard({ user, now });

    return {
      dmText: `${formatDisplayName(user)}, 테스트 task를 보관 처리하고 #in-process 팀 진행 과정 보드를 최신화했습니다.`
    };
  }

  async function buildFinalsPreviewForWorkDate(workDate) {
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

    return buildFinalsPreviewRecord({
      workDate,
      tasks,
      results,
      changeRequests,
      users,
      narrative
    });
  }

  async function publishFinalsMessage(preview) {
    const channelId = config.channels.finals;
    const text = buildFinalsChannelMessage(preview);
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

    return text;
  }

  async function createAndPublishFinalsUpdateForWorkDate(workDate, {
    updatedByUserKey = null,
    reason = 'manual',
    now = clock()
  } = {}) {
    const preview = await buildFinalsPreviewForWorkDate(workDate);

    await publishFinalsMessage(preview);
    await store.createFinalsUpdate({
      workDate,
      preview,
      approvedByUserKey: updatedByUserKey,
      approvedAt: now.toISOString(),
      reason
    });

    return {
      dmText: buildFinalsPreviewMessage(preview),
      preview
    };
  }

  async function handleDailySummary({ user }) {
    const now = clock();
    const workDate = formatKstDate(now);
    const { fromIso, toIso } = kstDayRange(workDate);

    await store.markAcceptedTasksUnresolvedForUser({
      userKey: user.key
    });

    await renderBoard({ user, now });

    const [tasks, results, changeRequests] = await Promise.all([
      store.listDailyTasksForUser({ userKey: user.key }),
      store.listDailyTaskResultsForUser({ userKey: user.key, fromIso, toIso }),
      store.listDailyChangeRequestsForUser({ userKey: user.key, fromIso, toIso })
    ]);
    const dailySummary = buildDailySummaryMessage({
      user,
      workDate,
      tasks,
      results,
      changeRequests
    });

    return {
      dmText: dailySummary
    };
  }

  async function handleEndWork({ user, dmChannelId = null }) {
    const now = clock();
    const workDate = formatKstDate(now);

    if (store.endWorkSession) {
      await store.endWorkSession({
        userKey: user.key,
        workDate,
        endedAt: now.toISOString()
      });
    }

    await closePersonalTaskBoard({ user, dmChannelId, now });
    await renderBoard({ user, now });

    return {
      dmText: `${formatDisplayName(user)}, 오늘 작업을 종료했습니다. 미완료 task는 다음 출근 때 다시 표시됩니다.`
    };
  }

  async function handleCodexPromptCopyRequest({ taskId }) {
    const record = await store.getLatestCodexPromptForTask(taskId);

    if (!record?.prompt) {
      const task = await store.getTaskById(taskId);
      const context = task?.context ?? {};
      const neededInfo = String(context.neededInfo ?? context.requiredInfo ?? context.needs ?? '').trim();
      const completionCriteria = String(context.completionCriteria ?? context.acceptanceCriteria ?? context.doneCriteria ?? '').trim();
      const why = String(context.why ?? context.reason ?? context.goal ?? '').trim();
      const text = [
        `*${task?.title ?? 'task'}* 도움 받기`,
        '',
        '[왜 하는가]',
        `- ${why || 'IDEA CRUISE에서 task로 분리된 실행 항목입니다.'}`,
        '',
        '[Codex를 쓰면 좋은 부분]',
        '- 조사 결과를 완료 기준에 맞는 표/체크리스트로 정리하기',
        '- 누락된 확인 항목이나 반례를 찾아 task 범위를 더 선명하게 만들기',
        '- 제출 내용을 Slack에 올리기 좋은 형태로 다듬기',
        '',
        '[사람이 직접 확인할 것]',
        `- ${neededInfo || '공식 자료, 최신 정보, 실제 테스트 결과처럼 직접 판단이 필요한 정보'}`,
        '',
        '[완료 기준]',
        `- ${completionCriteria || 'IDEA CRUISE에서 정한 완료 기준을 충족하는 제출물'}`
      ].join('\n');
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
    const result = await createAndPublishFinalsUpdateForWorkDate(workDate, {
      updatedByUserKey: user.key,
      reason: 'manual',
      now
    });

    return {
      ...result,
      dmText: `${formatDisplayName(user)}, #finals 누적 정리를 업데이트했습니다.`
    };
  }

  async function handleScheduledFinalsUpdate() {
    const now = clock();
    if (!isAtOrAfterFinalsCutoff(now)) {
      return {
        updated: false,
        reason: 'before_cutoff'
      };
    }

    const workDate = formatKstDate(now);
    const existingFinalsUpdate = await store.getFinalsUpdateForDate({ workDate });
    if (existingFinalsUpdate) {
      return {
        updated: false,
        reason: 'already_updated'
      };
    }

    await createAndPublishFinalsUpdateForWorkDate(workDate, {
      updatedByUserKey: config.leadUserKey,
      reason: 'scheduled',
      now
    });

    return {
      updated: true,
      reason: 'scheduled'
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
    await refreshPersonalTaskBoardIfOpen({ user: owner, now });

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
    await refreshPersonalTaskBoardIfOpen({ user: owner, now });

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

    if (taskEvaluator && ['task_complete', 'task_stop_today', 'task_file_submission'].includes(actionId)) {
      evaluation = normalizeTaskEvaluation(await taskEvaluator.evaluateSubmission({
        actionId,
        actionLabel: action.label,
        task,
        rawText: submissionText
      }));

      if (actionId === 'task_file_submission') {
        if (evaluation.verdict === 'sufficient') {
          finalStatus = '완료';
        } else if (evaluation.verdict === 'informational') {
          finalStatus = '추가 진행 예정';
        } else {
          finalStatus = '보완 필요';
        }
      } else if (actionId === 'task_complete' && evaluation.blocksCompletion) {
        finalStatus = '보완 필요';
      }
    }

    if (actionId === 'task_change_request') {
      await store.createChangeRequest({
        taskId,
        proposerUserKey: submittedByUserKey,
        rawText
      });
      if (store.updateTaskContextFromChange) {
        const change = parseTaskChangeText(rawText);
        await store.updateTaskContextFromChange({
          taskId,
          proposerUserKey: submittedByUserKey,
          rawText,
          ...change
        });
      }
    } else if (actionId === 'task_cleanup') {
      const cleanup = parseTaskCleanupText(rawText);
      await store.submitTaskResult({
        taskId,
        resultType: action.resultType,
        rawText: submissionText,
        submittedByUserKey
      });
      if (store.updateTaskContextFromCleanup) {
        await store.updateTaskContextFromCleanup({
          taskId,
          cleanedByUserKey: submittedByUserKey,
          rawText,
          ...cleanup
        });
      }
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
    await refreshPersonalTaskBoardIfOpen({ user: owner, now });
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

    if (actionId === 'task_cleanup') {
      return {
        status: finalStatus,
        responseText: `${formatDisplayName(owner)}, task를 정리됨으로 변경했습니다. 원래 task와 정리 사유 기록은 남겨두었습니다.`
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
    refreshBoardForUser,
    handleArchiveTestTasks,
    handleDailySummary,
    handleEndWork,
    handleFinalsPreview,
    handleScheduledFinalsUpdate,
    handleTaskAcceptAndPrompt,
    handleTaskAcceptDirect,
    handleCodexPromptCopyRequest,
    handleTaskActionSubmission,
    getTaskTitle
  };
}
