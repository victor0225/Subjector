import { App, ExpressReceiver } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { formatDisplayName, getUserBySlackId } from '../config.js';
import { handleDmCommand } from '../domain/dmCommands.js';
import { createDefaultHealthStatus, renderHealthPage } from '../domain/health.js';
import { renderIdeaCruisePage } from '../domain/ideaCruisePage.js';
import {
  TASK_ACTION_CALLBACK_ID,
  TASK_FILE_SUBMISSION_ACTION_ID,
  buildTaskActionModalView,
  extractTaskActionSubmissionActionId,
  extractTaskActionSubmissionAttachmentNote,
  extractTaskActionSubmissionAttachments,
  extractTaskActionSubmissionText,
  parseTaskActionMetadata
} from '../domain/taskActions.js';
import { createGeminiMeetingTranscriber } from '../services/geminiMeetingTranscriber.js';
import { createGeminiIdeaCruiseTaskGenerator } from '../services/geminiIdeaCruiseTaskGenerator.js';
import { createFinalsNarrator } from '../services/finalsNarratorFactory.js';
import { createInProcessService } from '../services/inProcessService.js';
import { createMeetingTaskExtractor } from '../services/meetingTaskExtractorFactory.js';
import { createMeetingService } from '../services/meetingService.js';
import { createOpenAiIdeaCruiseCardAnalyzer } from '../services/openaiIdeaCruiseCardAnalyzer.js';
import { createSlackFileDownloader } from '../services/slackFileDownloader.js';
import { createSupabaseStore } from '../services/supabaseStore.js';
import { createTaskEvaluator } from '../services/taskEvaluatorFactory.js';
import { buildFinalsPreviewBlocks, buildTextMessageBlocks } from './blocks.js';
import { isDirectUserMessage } from './events.js';
import {
  MEETING_CANDIDATE_EDIT_CALLBACK_ID,
  MEETING_PARTICIPANT_INPUT_CALLBACK_ID,
  buildMeetingCandidateEditModal,
  buildMeetingParticipantInputModal,
  extractMeetingCandidateEditSubmission,
  extractMeetingParticipantInputSubmission
} from './meetingTaskBlocks.js';

export function buildBootHealthStatus(config) {
  const usesOpenAiForEvaluation = config.ai?.evaluationProvider === 'openai';
  const usesOpenAiForTaskExtraction = config.ai?.meetingTaskProvider === 'openai';

  return {
    ...createDefaultHealthStatus(),
    slack: { ok: true, message: 'configured' },
    supabase: {
      ok: Boolean(config.supabase?.url && config.supabase?.serviceRoleKey),
      message: config.supabase?.url ? 'configured' : 'missing env'
    },
    openai: {
      ok: (!usesOpenAiForEvaluation && !usesOpenAiForTaskExtraction) || Boolean(config.openai?.apiKey),
      message: usesOpenAiForEvaluation || usesOpenAiForTaskExtraction
        ? (config.openai?.apiKey
          ? `configured for ${[
            usesOpenAiForEvaluation ? 'evaluation' : null,
            usesOpenAiForTaskExtraction ? 'task extraction' : null
          ].filter(Boolean).join(' and ')}`
          : 'missing env')
        : 'not selected'
    },
    web: {
      ideaCruise: {
        ok: true,
        message: `${config.baseUrl}/idea-cruise`
      }
    },
    channels: {
      meeting: { ok: Boolean(config.channels?.meeting), message: config.channels?.meeting ? '#회의-결과록 configured' : 'missing channel id' },
      inProcess: { ok: Boolean(config.channels?.inProcess), message: config.channels?.inProcess ? '#in-process configured' : 'missing channel id' },
      finals: { ok: Boolean(config.channels?.finals), message: config.channels?.finals ? '#finals configured' : 'missing channel id' }
    },
    recentEvents: ['server booted']
  };
}

function registerHealthRoute(receiver, config) {
  receiver.router.get('/health', (req, res) => {
    const html = renderHealthPage({
      pin: req.query?.pin,
      config,
      status: buildBootHealthStatus(config)
    });

    res.status(200).type('html').send(html);
  });
}

function findIdeaCruiseAssignee(users = [], assignee) {
  return users.find((user) => [user.key, user.fullName, user.displayName].includes(assignee)) ?? null;
}

async function readIdeaCruiseTaskBody(req) {
  if (req.body && Object.keys(req.body).length > 0) {
    return req.body;
  }

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

export function registerIdeaCruiseRoute(receiver, { config = {}, store = null, inProcessService = null, cardAnalyzer = null, taskCandidateGenerator = null } = {}) {
  receiver.router.get('/idea-cruise', (req, res) => {
    res.status(200).type('html').send(renderIdeaCruisePage());
  });

  receiver.router.post('/idea-cruise/cards', async (req, res) => {
    try {
      if (!cardAnalyzer?.analyze) {
        return res.status(503).json({
          ok: false,
          error: 'AI Analysis 연결이 아직 준비되지 않았습니다.'
        });
      }

      const body = await readIdeaCruiseTaskBody(req);
      const entryText = String(body.entryText ?? '').trim();
      if (!entryText) {
        return res.status(400).json({
          ok: false,
          error: '분석할 entry 내용이 비어 있습니다.'
        });
      }

      const cards = await cardAnalyzer.analyze({
        entryText,
        completedEntries: Array.isArray(body.completedEntries) ? body.completedEntries : [],
        githubOrganization: 'https://github.com/SAFIRA-ondevice'
      });

      return res.status(200).json({
        ok: true,
        cards
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  receiver.router.post('/idea-cruise/task-candidates', async (req, res) => {
    try {
      if (!taskCandidateGenerator?.generate) {
        return res.status(503).json({
          ok: false,
          error: 'Task 후보 생성 연결이 아직 준비되지 않았습니다.'
        });
      }

      const body = await readIdeaCruiseTaskBody(req);
      const completedPages = Array.isArray(body.completedPages) ? body.completedPages : [];
      if (completedPages.length === 0) {
        return res.status(400).json({
          ok: false,
          error: '완료된 topic page가 없습니다.'
        });
      }

      const currentTasks = store?.listAllTasks
        ? (await store.listAllTasks({ limit: 50 })).filter((task) => ['미시작', '수락', '오늘은 여기까지', '보완 필요', '미정리', '변경 요청 중', '회의 필요'].includes(task.status))
        : [];

      const result = await taskCandidateGenerator.generate({
        completedPages,
        currentTasks
      });

      return res.status(200).json({
        ok: true,
        tasks: result.tasks,
        existingTaskUpdates: result.existingTaskUpdates ?? [],
        notTasks: result.notTasks
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  receiver.router.post('/idea-cruise/tasks', async (req, res) => {
    try {
      const body = await readIdeaCruiseTaskBody(req);
      const assignee = String(body.assignee ?? '').trim();
      if (!assignee || assignee === '미배정') {
        return res.status(400).json({
          ok: false,
          error: '담당자를 먼저 선택해 주세요.'
        });
      }

      const user = findIdeaCruiseAssignee(config.users, assignee);
      if (!user) {
        return res.status(400).json({
          ok: false,
          error: '등록되지 않은 담당자입니다.'
        });
      }

      const title = String(body.title ?? '').trim();
      if (!title) {
        return res.status(400).json({
          ok: false,
          error: 'task 제목이 비어 있습니다.'
        });
      }

      if (!store?.createIdeaCruiseTask || !inProcessService?.refreshBoardForUser) {
        return res.status(503).json({
          ok: false,
          error: 'IDEA CRUISE task 반영 경로가 아직 준비되지 않았습니다.'
        });
      }

      await store.createIdeaCruiseTask({
        assigneeUserKey: user.key,
        title,
        importance: String(body.importance ?? '보통').trim() || '보통',
        context: {
          source: 'IDEA CRUISE',
          neededInfo: String(body.neededInfo ?? '').trim(),
          doneCriteria: String(body.doneCriteria ?? '').trim(),
          meetingRecord: String(body.meetingRecord ?? '').trim()
        }
      });

      const board = await inProcessService.refreshBoardForUser({ user });
      return res.status(200).json({
        ok: true,
        board
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  receiver.router.post('/idea-cruise/task-updates', async (req, res) => {
    try {
      const body = await readIdeaCruiseTaskBody(req);
      const taskId = String(body.taskId ?? '').trim();
      if (!taskId) {
        return res.status(400).json({
          ok: false,
          error: '보강할 기존 task가 비어 있습니다.'
        });
      }

      if (!store?.updateIdeaCruiseTaskContext || !inProcessService?.refreshBoardForUser) {
        return res.status(503).json({
          ok: false,
          error: '기존 task 보강 경로가 아직 준비되지 않았습니다.'
        });
      }

      const updated = await store.updateIdeaCruiseTaskContext({
        taskId,
        addNeededInfo: String(body.addNeededInfo ?? '').trim(),
        doneCriteriaChange: String(body.doneCriteriaChange ?? '').trim(),
        includeDoneCriteriaChange: Boolean(body.includeDoneCriteriaChange),
        meetingRecord: String(body.meetingRecord ?? '').trim()
      });

      const user = config.users?.find((item) => item.key === updated.assigneeUserKey);
      if (!user) {
        return res.status(400).json({
          ok: false,
          error: '보강된 task 담당자를 찾지 못했습니다.'
        });
      }

      const board = await inProcessService.refreshBoardForUser({ user });
      return res.status(200).json({
        ok: true,
        board
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });
}

export async function handleDirectDmMessage({ message, say, client = null, config, logger = console, inProcessService, meetingService = null }) {
  if (!isDirectUserMessage(message)) {
    return;
  }

  const user = getUserBySlackId(config.users, message.user);
  if (!user) {
    const text = '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.';
    await say({ text, blocks: buildTextMessageBlocks(text) });
    return;
  }

  const response = handleDmCommand({
    text: message.text,
    user,
    config
  });

  logger.info?.(`DM command handled: ${response.type}`);

  if (response.updateInProcess && inProcessService) {
    try {
      const result = await inProcessService.handleStartWork({ user });
      await say({
        text: result.dmText,
        blocks: buildTextMessageBlocks(result.dmText)
      });
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, #in-process 업데이트에 실패했습니다. Render 로그를 확인한 뒤 다시 '출근'을 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  if (response.refreshInProcess && inProcessService) {
    try {
      const result = await inProcessService.handleRefreshInProcess({ user });
      await say({
        text: result.dmText,
        blocks: buildTextMessageBlocks(result.dmText)
      });
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, #in-process 최신화에 실패했습니다. Render 로그를 확인한 뒤 다시 '최신화'를 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  if (response.createDailySummary && inProcessService) {
    try {
      const result = await inProcessService.handleEndWork({ user });
      await say({
        text: result.dmText,
        blocks: buildTextMessageBlocks(result.dmText)
      });
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, 오늘 한 일 요약 생성에 실패했습니다. Render 로그를 확인한 뒤 다시 '퇴근'을 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  if (response.createFinalsUpdate && inProcessService) {
    try {
      const result = await inProcessService.handleFinalsPreview({ user });
      await say({
        text: result.dmText,
        blocks: buildFinalsPreviewBlocks(result.dmText)
      });
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, #finals 업데이트에 실패했습니다. Render 로그를 확인한 뒤 다시 'finals 업데이트'를 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  if (response.archiveTestTasks && inProcessService) {
    try {
      const result = await inProcessService.handleArchiveTestTasks({ user });
      await say({
        text: result.dmText,
        blocks: buildTextMessageBlocks(result.dmText)
      });
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, 테스트 task 정리에 실패했습니다. Render 로그를 확인한 뒤 다시 '테스트 task 정리'를 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  if (response.createRawMeeting && meetingService) {
    try {
      const result = await meetingService.handleRawMeetingText({
        sourceChannelId: message.channel,
        sourceMessageTs: message.ts,
        submittedByUserKey: user.key,
        rawText: response.rawMeetingText
      });

      await say({
        text: result.text,
        blocks: buildTextMessageBlocks(result.text)
      });

      if (client && result.directMessages?.length > 0) {
        await sendDirectMessages({
          client,
          messages: result.directMessages
        });
      }
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, 회의 기록 저장에 실패했습니다. Render 로그를 확인한 뒤 다시 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  await say({
    text: response.text,
    blocks: buildTextMessageBlocks(response.text)
  });
}

async function sendDirectMessage({ client, slackId, text, blocks = null }) {
  const opened = await client.conversations.open({
    users: slackId
  });

  await client.chat.postMessage({
    channel: opened.channel.id,
    text,
    blocks: blocks ?? buildTextMessageBlocks(text)
  });
}

async function sendDirectMessages({ client, messages = [] }) {
  for (const message of messages) {
    await sendDirectMessage({
      client,
      slackId: message.slackId,
      text: message.text,
      blocks: message.blocks
    });
  }
}

function registerDmHandlers(app, config, logger, inProcessService, meetingService) {
  app.message(async ({ message, say, client }) => {
    await handleDirectDmMessage({
      message,
      say,
      client,
      config,
      logger,
      inProcessService,
      meetingService
    });
  });
}

function runInBackground(task, logger) {
  setTimeout(() => {
    task().catch((error) => logger.error?.(error));
  }, 0);
}

function buildMeetingTranscribingText() {
  return [
    '회의 전사를 시작했습니다.',
    '- 상태: 전사 중',
    '- 안내: 61MB 같은 긴 녹음은 몇 분 이상 걸릴 수 있습니다.',
    '완료되면 이 스레드에 Speaker A/B/C 매핑 버튼이 표시됩니다.'
  ].join('\n');
}

export async function handleMeetingFileMessage({
  message,
  client,
  logger = console,
  meetingService,
  backgroundRunner = (task) => runInBackground(task, logger)
}) {
  try {
    const result = await meetingService.handleMeetingFileMessage({ message });

    if (!result) {
      return;
    }

    await client.chat.postMessage({
      channel: result.channel,
      thread_ts: result.threadTs,
      text: result.text,
      blocks: buildTextMessageBlocks(result.text)
    });

    logger.info?.('Meeting audio upload recorded');

    if (typeof meetingService.processMeetingAudioUpload === 'function') {
      const backgroundResult = backgroundRunner(async () => {
        const transcribingText = buildMeetingTranscribingText();
        await client.chat.postMessage({
          channel: result.channel,
          thread_ts: result.threadTs,
          text: transcribingText,
          blocks: buildTextMessageBlocks(transcribingText)
        });

        const processingResult = await meetingService.processMeetingAudioUpload({ message });
        if (!processingResult) {
          return;
        }

        await client.chat.postMessage({
          channel: processingResult.channel,
          thread_ts: processingResult.threadTs,
          text: processingResult.text,
          blocks: processingResult.blocks ?? buildTextMessageBlocks(processingResult.text)
        });
      });

      if (backgroundResult && typeof backgroundResult.then === 'function') {
        await backgroundResult;
      }
    }
  } catch (error) {
    logger.error?.(error);

    if (message?.channel && message?.ts && client?.chat?.postMessage) {
      const text = '회의 녹음 업로드를 기록하지 못했습니다. Render 로그를 확인한 뒤 다시 업로드해 주세요.';
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.thread_ts ?? message.ts,
        text,
        blocks: buildTextMessageBlocks(text)
      });
    }
  }
}

function registerMeetingHandlers(app, logger, meetingService) {
  app.message(async ({ message, client }) => {
    await handleMeetingFileMessage({
      message,
      client,
      logger,
      meetingService
    });
  });
}

function parseSpeakerMappingValue(value) {
  return JSON.parse(value);
}

function blockContainsCandidateIndex(block, candidateIndex) {
  return (block.elements ?? []).some((element) => {
    if (!element.value) {
      return false;
    }

    try {
      return Number(parseSpeakerMappingValue(element.value).candidateIndex) === Number(candidateIndex);
    } catch {
      return false;
    }
  });
}

function removeReviewedCandidateActionBlocks({ blocks = [], candidateIndex, resultText }) {
  const reviewedText = [
    '*처리 완료*',
    resultText
  ].join('\n');

  return [
    ...blocks.filter((block) => !(block.type === 'actions' && blockContainsCandidateIndex(block, candidateIndex))),
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: reviewedText
      }
    }
  ];
}

export async function handleMeetingSpeakerMappingButton({ ack, body, client, config, logger = console, meetingService }) {
  await ack();

  const user = getUserBySlackId(config.users, body.user.id);
  const channel = body.channel?.id;

  if (!user) {
    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text: '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.'
    });
    return;
  }

  if (user.key !== config.leadUserKey) {
    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text: `${formatDisplayName(user)}, Speaker 매핑은 수현님만 실행할 수 있습니다.`
    });
    return;
  }

  try {
    const metadata = parseSpeakerMappingValue(body.actions[0].value);
    const result = await meetingService.handleSpeakerMapping(metadata);

    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text: result.text,
      blocks: buildTextMessageBlocks(result.text)
    });

    if (result.threadMessage) {
      await client.chat.postMessage({
        channel: result.threadMessage.channel,
        thread_ts: result.threadMessage.threadTs,
        text: result.threadMessage.text,
        blocks: result.threadMessage.blocks ?? buildTextMessageBlocks(result.threadMessage.text)
      });
    }

    if (result.directMessages?.length > 0) {
      await sendDirectMessages({
        client,
        messages: result.directMessages
      });
    }

    logger.info?.('Meeting speaker mapping saved');
  } catch (error) {
    logger.error?.(error);

    const text = 'Speaker 매핑을 저장하지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.';
    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text,
      blocks: buildTextMessageBlocks(text)
    });
  }
}

export async function handleMeetingTaskApprovalButton({ ack, body, client, config, logger = console, meetingService }) {
  await ack();

  const user = getUserBySlackId(config.users, body.user.id);
  const channel = body.channel?.id;

  if (!user) {
    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text: '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.'
    });
    return;
  }

  if (user.key !== config.leadUserKey) {
    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text: `${formatDisplayName(user)}, task 반영 승인은 수현님만 실행할 수 있습니다.`
    });
    return;
  }

  try {
    const metadata = parseSpeakerMappingValue(body.actions[0].value);
    const result = await meetingService.handleTaskApproval(metadata);

    await client.chat.postMessage({
      channel,
      thread_ts: metadata.sourceMessageTs,
      text: result.text,
      blocks: buildTextMessageBlocks(result.text)
    });

    logger.info?.('Meeting tasks approved');
  } catch (error) {
    logger.error?.(error);

    const text = '회의 기반 task 반영에 실패했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.';
    await client.chat.postEphemeral({
      channel,
      user: body.user.id,
      text,
      blocks: buildTextMessageBlocks(text)
    });
  }
}

export async function handleMeetingParticipantInputButton({ ack, body, client, config, logger = console }) {
  await ack();

  const user = getUserBySlackId(config.users, body.user.id);
  const channel = body.channel?.id;
  const metadata = parseSpeakerMappingValue(body.actions[0].value);

  if (!user) {
    await client.chat.postMessage({
      channel,
      text: '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.'
    });
    return;
  }

  if (user.key !== metadata.userKey) {
    await client.chat.postMessage({
      channel,
      text: `${formatDisplayName(user)}, 이 답변은 담당자 본인만 입력할 수 있습니다.`
    });
    return;
  }

  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildMeetingParticipantInputModal({ metadata })
  });

  logger.info?.('Meeting participant task input modal opened');
}

export async function handleMeetingParticipantInputViewSubmission({ ack, body, view, client, config, logger = console, meetingService }) {
  const submittedBy = getUserBySlackId(config.users, body.user.id);

  if (!submittedBy) {
    await ack({
      response_action: 'errors',
      errors: {
        meeting_participant_task_input: '등록되지 않은 사용자입니다.'
      }
    });
    return;
  }

  const rawText = extractMeetingParticipantInputSubmission(view);
  if (!rawText) {
    await ack({
      response_action: 'errors',
      errors: {
        meeting_participant_task_input: '내용을 입력해 주세요.'
      }
    });
    return;
  }

  await ack();

  try {
    const metadata = parseSpeakerMappingValue(view.private_metadata);
    const result = await meetingService.handleParticipantTaskInput({
      sourceChannelId: metadata.sourceChannelId,
      sourceMessageTs: metadata.sourceMessageTs,
      userKey: submittedBy.key,
      rawText
    });

    await sendDirectMessage({
      client,
      slackId: submittedBy.slackId,
      text: result.text
    });

    if (result.directMessages?.length > 0) {
      await sendDirectMessages({
        client,
        messages: result.directMessages
      });
    }

    if (result.candidateReviewMessages?.length > 0) {
      await sendDirectMessages({
        client,
        messages: result.candidateReviewMessages
      });
    }

    logger.info?.('Meeting participant task input submitted');
  } catch (error) {
    logger.error?.(error);
    await sendDirectMessage({
      client,
      slackId: submittedBy.slackId,
      text: '회의 후 우선 task 답변을 저장하지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.'
    });
  }
}

export async function handleMeetingParticipantSkipWaitingButton({ ack, body, client, config, logger = console, meetingService }) {
  await ack();

  const user = getUserBySlackId(config.users, body.user.id);
  const channel = body.channel?.id;

  if (!user) {
    await client.chat.postMessage({
      channel,
      text: '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.'
    });
    return;
  }

  if (user.key !== config.leadUserKey) {
    await client.chat.postMessage({
      channel,
      text: `${formatDisplayName(user)}, 테스트용 진행은 수현님만 실행할 수 있습니다.`
    });
    return;
  }

  try {
    const metadata = parseSpeakerMappingValue(body.actions[0].value);
    const result = await meetingService.handleParticipantSkipWaiting({
      ...metadata,
      requestedByUserKey: user.key
    });

    await client.chat.postMessage({
      channel,
      text: result.text,
      blocks: buildTextMessageBlocks(result.text)
    });

    if (result.candidateReviewMessages?.length > 0) {
      await sendDirectMessages({
        client,
        messages: result.candidateReviewMessages
      });
    }

    logger.info?.('Meeting participant waiting skipped for testing');
  } catch (error) {
    logger.error?.(error);
    const text = '현재 답변만으로 진행하지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.';
    await client.chat.postMessage({
      channel,
      text,
      blocks: buildTextMessageBlocks(text)
    });
  }
}

export async function handleMeetingCandidateDecisionButton({ ack, body, client, config, logger = console, meetingService, decision }) {
  await ack();

  const user = getUserBySlackId(config.users, body.user.id);
  const channel = body.channel?.id;
  const metadata = parseSpeakerMappingValue(body.actions[0].value);

  if (!user) {
    await client.chat.postMessage({
      channel,
      text: '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.'
    });
    return;
  }

  try {
    const result = await meetingService.handleCandidateReview({
      ...metadata,
      reviewedByUserKey: user.key,
      decision
    });

    await client.chat.postMessage({
      channel,
      text: result.text,
      blocks: buildTextMessageBlocks(result.text)
    });

    if (body.message?.ts && body.message?.blocks && client.chat.update) {
      await client.chat.update({
        channel,
        ts: body.message.ts,
        text: body.message.text ?? result.text,
        blocks: removeReviewedCandidateActionBlocks({
          blocks: body.message.blocks,
          candidateIndex: metadata.candidateIndex,
          resultText: result.text
        })
      });
    }

    logger.info?.(`Meeting task candidate reviewed: ${decision}`);
  } catch (error) {
    logger.error?.(error);
    const text = '회의 task 후보 처리를 저장하지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.';
    await client.chat.postMessage({
      channel,
      text,
      blocks: buildTextMessageBlocks(text)
    });
  }
}

export async function handleMeetingCandidateEditButton({ ack, body, client, config, logger = console, meetingService }) {
  await ack();

  const user = getUserBySlackId(config.users, body.user.id);
  const channel = body.channel?.id;
  const metadata = parseSpeakerMappingValue(body.actions[0].value);

  if (!user) {
    await client.chat.postMessage({
      channel,
      text: '등록되지 않은 사용자입니다. 수현님에게 Slack 멤버 ID 등록을 요청해 주세요.'
    });
    return;
  }

  if (user.key !== metadata.assigneeUserKey) {
    await client.chat.postMessage({
      channel,
      text: `${formatDisplayName(user)}, 이 task 후보는 담당자 본인만 수정할 수 있습니다.`
    });
    return;
  }

  try {
    const result = await meetingService.getMeetingTaskCandidate(metadata);
    if (!result.taskCandidate) {
      await client.chat.postMessage({
        channel,
        text: 'task 후보를 찾지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.'
      });
      return;
    }

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildMeetingCandidateEditModal({
        metadata,
        taskCandidate: result.taskCandidate
      })
    });

    logger.info?.('Meeting task candidate edit modal opened');
  } catch (error) {
    logger.error?.(error);
    const text = 'task 후보 수정 창을 열지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.';
    await client.chat.postMessage({
      channel,
      text,
      blocks: buildTextMessageBlocks(text)
    });
  }
}

export async function handleMeetingCandidateEditViewSubmission({ ack, body, view, client, config, logger = console, meetingService }) {
  const submittedBy = getUserBySlackId(config.users, body.user.id);

  if (!submittedBy) {
    await ack({
      response_action: 'errors',
      errors: {
        meeting_candidate_title: '등록되지 않은 사용자입니다.'
      }
    });
    return;
  }

  const editedCandidate = extractMeetingCandidateEditSubmission(view);
  if (!editedCandidate.title) {
    await ack({
      response_action: 'errors',
      errors: {
        meeting_candidate_title: 'task 이름을 입력해 주세요.'
      }
    });
    return;
  }

  await ack();

  try {
    const metadata = parseSpeakerMappingValue(view.private_metadata);
    const result = await meetingService.handleCandidateReview({
      ...metadata,
      reviewedByUserKey: submittedBy.key,
      decision: 'edited_accepted',
      editedCandidate
    });

    await sendDirectMessage({
      client,
      slackId: submittedBy.slackId,
      text: result.text
    });

    logger.info?.('Meeting task candidate edited and accepted');
  } catch (error) {
    logger.error?.(error);
    await sendDirectMessage({
      client,
      slackId: submittedBy.slackId,
      text: '수정한 task 후보를 반영하지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.'
    });
  }
}

export async function handleTaskActionButton({ ack, body, client, logger = console, inProcessService }) {
  await ack();

  const actionPayload = body.actions[0];
  const metadata = parseTaskActionMetadata(actionPayload.value);
  const taskTitle = await inProcessService.getTaskTitle(metadata.taskId);

  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildTaskActionModalView({
      actionId: metadata.actionId,
      taskId: metadata.taskId,
      assigneeUserKey: metadata.assigneeUserKey,
      taskTitle
    })
  });

  logger.info?.(`Task action modal opened: ${metadata.actionId}`);
}

export async function handleTaskAcceptButton({ ack, body, logger = console, inProcessService }) {
  await ack();

  const actionPayload = body.actions[0];
  const metadata = parseTaskActionMetadata(actionPayload.value);

  await inProcessService.handleTaskAcceptAndPrompt({
    taskId: metadata.taskId,
    assigneeUserKey: metadata.assigneeUserKey
  });

  logger.info?.('Task accepted and Codex prompt generated');
}

export async function handleTaskAcceptDirectButton({ ack, body, logger = console, inProcessService }) {
  await ack();

  const actionPayload = body.actions[0];
  const metadata = parseTaskActionMetadata(actionPayload.value);

  await inProcessService.handleTaskAcceptDirect({
    taskId: metadata.taskId,
    assigneeUserKey: metadata.assigneeUserKey
  });

  logger.info?.('Task accepted for direct work');
}

export async function handleCodexPromptCopyButton({ ack, body, client, logger = console, inProcessService }) {
  await ack();

  const taskId = body.actions?.[0]?.value;
  const channel = body.channel?.id;
  const userId = body.user?.id;

  try {
    const result = await inProcessService.handleCodexPromptCopyRequest({ taskId });

    await client.chat.postEphemeral({
      channel,
      user: userId,
      text: result.text,
      blocks: result.blocks
    });

    logger.info?.('Codex prompt copy message sent');
  } catch (error) {
    logger.error?.(error);
    await client.chat.postEphemeral({
      channel,
      user: userId,
      text: 'Codex 프롬프트를 불러오지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.',
      blocks: buildTextMessageBlocks('Codex 프롬프트를 불러오지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.')
    });
  }
}

export async function handleTaskActionViewSubmission({ ack, body, view, client = null, config, logger = console, inProcessService }) {
  const metadata = parseTaskActionMetadata(view.private_metadata);
  const actionId = extractTaskActionSubmissionActionId(view, metadata.actionId);
  const submittedBy = getUserBySlackId(config.users, body.user.id);

  if (!submittedBy) {
    await ack({
      response_action: 'errors',
      errors: {
        task_action_input: '등록되지 않은 사용자입니다.'
      }
    });
    return;
  }

  const rawText = extractTaskActionSubmissionText(view);
  const attachments = extractTaskActionSubmissionAttachments(view);
  const attachmentNote = extractTaskActionSubmissionAttachmentNote(view);
  if (!rawText) {
    await ack({
      response_action: 'errors',
      errors: {
        task_action_input: '내용을 입력해 주세요.'
      }
    });
    return;
  }

  await ack();

  try {
    const result = await inProcessService.handleTaskActionSubmission({
      actionId,
      taskId: metadata.taskId,
      assigneeUserKey: metadata.assigneeUserKey,
      submittedByUserKey: submittedBy.key,
      rawText,
      attachments,
      attachmentNote
    });

    logger.info?.(`Task action submitted: ${metadata.actionId}`);

    if (client && result?.responseText) {
      await client.chat.postEphemeral({
        channel: config.channels.inProcess,
        user: body.user.id,
        text: result.responseText,
        blocks: buildTextMessageBlocks(result.responseText)
      });
    }
  } catch (error) {
    logger.error?.(error);

    if (client) {
      const text = 'task 제출을 처리하지 못했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.';
      await client.chat.postEphemeral({
        channel: config.channels.inProcess,
        user: body.user.id,
        text,
        blocks: buildTextMessageBlocks(text)
      });
    }
  }
}

function registerTaskActionHandlers(app, config, logger, inProcessService) {
  app.action('task_accept_generate_prompt', async ({ ack, body }) => {
    await handleTaskAcceptButton({
      ack,
      body,
      logger,
      inProcessService
    });
  });

  app.action('task_accept_direct', async ({ ack, body }) => {
    await handleTaskAcceptDirectButton({
      ack,
      body,
      logger,
      inProcessService
    });
  });

  app.action('copy_codex_prompt', async ({ ack, body, client }) => {
    await handleCodexPromptCopyButton({
      ack,
      body,
      client,
      logger,
      inProcessService
    });
  });

  for (const actionId of ['task_complete', 'task_stop_today', 'task_file_submission', 'task_change_request']) {
    app.action(actionId, async ({ ack, body, client }) => {
      await handleTaskActionButton({
        ack,
        body,
        client,
        logger,
        inProcessService
      });
    });
  }

  app.view(TASK_ACTION_CALLBACK_ID, async ({ ack, body, view, client }) => {
    await handleTaskActionViewSubmission({
      ack,
      body,
      view,
      client,
      config,
      logger,
      inProcessService
    });
  });

}

function registerMeetingActionHandlers(app, config, logger, meetingService) {
  app.action(/^meeting_map_speaker_/, async ({ ack, body, client }) => {
    await handleMeetingSpeakerMappingButton({
      ack,
      body,
      client,
      config,
      logger,
      meetingService
    });
  });

  app.action('meeting_participant_task_input', async ({ ack, body, client }) => {
    await handleMeetingParticipantInputButton({
      ack,
      body,
      client,
      config,
      logger
    });
  });

  app.view(MEETING_PARTICIPANT_INPUT_CALLBACK_ID, async ({ ack, body, view, client }) => {
    await handleMeetingParticipantInputViewSubmission({
      ack,
      body,
      view,
      client,
      config,
      logger,
      meetingService
    });
  });

  app.action('meeting_participant_skip_waiting', async ({ ack, body, client }) => {
    await handleMeetingParticipantSkipWaitingButton({
      ack,
      body,
      client,
      config,
      logger,
      meetingService
    });
  });

  app.action('meeting_candidate_accept', async ({ ack, body, client }) => {
    await handleMeetingCandidateDecisionButton({
      ack,
      body,
      client,
      config,
      logger,
      meetingService,
      decision: 'accepted'
    });
  });

  app.action('meeting_candidate_reject', async ({ ack, body, client }) => {
    await handleMeetingCandidateDecisionButton({
      ack,
      body,
      client,
      config,
      logger,
      meetingService,
      decision: 'rejected'
    });
  });

  app.action('meeting_candidate_edit', async ({ ack, body, client }) => {
    await handleMeetingCandidateEditButton({
      ack,
      body,
      client,
      config,
      logger,
      meetingService
    });
  });

  app.view(MEETING_CANDIDATE_EDIT_CALLBACK_ID, async ({ ack, body, view, client }) => {
    await handleMeetingCandidateEditViewSubmission({
      ack,
      body,
      view,
      client,
      config,
      logger,
      meetingService
    });
  });

  app.action('meeting_approve_tasks', async ({ ack, body, client }) => {
    await handleMeetingTaskApprovalButton({
      ack,
      body,
      client,
      config,
      logger,
      meetingService
    });
  });
}

function registerScheduledFinalsUpdates({ service, logger = console, intervalMs = 5 * 60 * 1000 }) {
  const timer = setInterval(async () => {
    try {
      const result = await service.handleScheduledFinalsUpdate();
      if (result?.updated) {
        logger.info?.('Scheduled #finals update completed');
      }
    } catch (error) {
      logger.error?.(error);
    }
  }, intervalMs);

  timer.unref?.();
  return timer;
}

export function createSlackApp({
  config,
  logger = console,
  deferInitialization = false,
  inProcessService = null,
  meetingService = null,
  enableScheduledFinalsUpdates = true
}) {
  const receiver = new ExpressReceiver({
    signingSecret: config.slack.signingSecret
  });

  registerHealthRoute(receiver, config);

  const app = new App({
    token: config.slack.botToken,
    receiver,
    deferInitialization
  });

  const store = createSupabaseStore(createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false }
  }));

  const service = inProcessService ?? createInProcessService({
    store,
    slackClient: app.client,
    config,
    logger,
    taskEvaluator: createTaskEvaluator({ config }),
    finalsNarrator: createFinalsNarrator({ config })
  });

  const ideaCruiseCardAnalyzer = config.openai?.apiKey
    ? createOpenAiIdeaCruiseCardAnalyzer({
      apiKey: config.openai.apiKey,
      model: config.openai.taskExtractionModel
    })
    : null;

  const ideaCruiseTaskCandidateGenerator = config.gemini?.apiKey
    ? createGeminiIdeaCruiseTaskGenerator({
      apiKey: config.gemini.apiKey,
      model: 'gemini-2.5-flash'
    })
    : null;

  registerIdeaCruiseRoute(receiver, {
    config,
    store,
    inProcessService: service,
    cardAnalyzer: ideaCruiseCardAnalyzer,
    taskCandidateGenerator: ideaCruiseTaskCandidateGenerator
  });

  const meetings = meetingService ?? createMeetingService({
    store,
    config,
    logger,
    fileDownloader: createSlackFileDownloader({
      botToken: config.slack.botToken,
      slackClient: app.client
    }),
    audioTranscriber: config.gemini.apiKey
      ? createGeminiMeetingTranscriber({
        apiKey: config.gemini.apiKey,
        model: config.gemini.transcriptionModel
      })
      : null,
    taskExtractor: createMeetingTaskExtractor({ config })
  });

  registerDmHandlers(app, config, logger, service, meetings);
  registerMeetingHandlers(app, logger, meetings);
  registerTaskActionHandlers(app, config, logger, service);
  registerMeetingActionHandlers(app, config, logger, meetings);

  const scheduledFinalsTimer = enableScheduledFinalsUpdates
    ? registerScheduledFinalsUpdates({ service, logger })
    : null;

  return { app, receiver, scheduledFinalsTimer };
}
