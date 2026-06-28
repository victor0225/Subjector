import { App, ExpressReceiver } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { formatDisplayName, getUserBySlackId } from '../config.js';
import { handleDmCommand } from '../domain/dmCommands.js';
import { createDefaultHealthStatus, renderHealthPage } from '../domain/health.js';
import {
  TASK_ACTION_CALLBACK_ID,
  buildTaskActionModalView,
  extractTaskActionSubmissionText,
  parseTaskActionMetadata
} from '../domain/taskActions.js';
import { createInProcessService } from '../services/inProcessService.js';
import { createSupabaseStore } from '../services/supabaseStore.js';
import { createTaskEvaluator } from '../services/taskEvaluatorFactory.js';
import { buildFinalsPreviewBlocks, buildTextMessageBlocks } from './blocks.js';
import { isDirectUserMessage } from './events.js';

function buildBootHealthStatus(config) {
  return {
    ...createDefaultHealthStatus(),
    slack: { ok: true, message: 'configured' },
    supabase: {
      ok: Boolean(config.supabase?.url && config.supabase?.serviceRoleKey),
      message: config.supabase?.url ? 'configured' : 'missing env'
    },
    openai: {
      ok: config.ai?.evaluationProvider !== 'openai' || Boolean(config.openai?.apiKey),
      message: config.ai?.evaluationProvider === 'openai'
        ? (config.openai?.apiKey ? 'configured for evaluation' : 'missing env')
        : 'not selected for evaluation'
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

export async function handleDirectDmMessage({ message, say, client = null, config, logger = console, inProcessService }) {
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

  if (response.createDailySummary && inProcessService) {
    try {
      const result = await inProcessService.handleEndWork({ user });
      await say({
        text: result.dmText,
        blocks: buildTextMessageBlocks(result.dmText)
      });
      if (result.finalsPreviewDmText && result.leadUser && client) {
        await sendFinalsPreviewToLead({
          client,
          leadUser: result.leadUser,
          text: result.finalsPreviewDmText
        });
      }
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, 오늘 한 일 요약 생성에 실패했습니다. Render 로그를 확인한 뒤 다시 '퇴근'을 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  if (response.createFinalsPreview && inProcessService) {
    try {
      const result = await inProcessService.handleFinalsPreview({ user });
      await say({
        text: result.dmText,
        blocks: buildFinalsPreviewBlocks(result.dmText)
      });
      return;
    } catch (error) {
      logger.error?.(error);
      const text = `${formatDisplayName(user)}, #finals 미리보기 생성에 실패했습니다. Render 로그를 확인한 뒤 다시 'finals 업데이트'를 보내 주세요.`;
      await say({ text, blocks: buildTextMessageBlocks(text) });
      return;
    }
  }

  await say({
    text: response.text,
    blocks: buildTextMessageBlocks(response.text)
  });
}

async function sendFinalsPreviewToLead({ client, leadUser, text }) {
  const opened = await client.conversations.open({
    users: leadUser.slackId
  });

  await client.chat.postMessage({
    channel: opened.channel.id,
    text,
    blocks: buildFinalsPreviewBlocks(text)
  });
}

function registerDmHandlers(app, config, logger, inProcessService) {
  app.message(async ({ message, say, client }) => {
    await handleDirectDmMessage({
      message,
      say,
      client,
      config,
      logger,
      inProcessService
    });
  });
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
      actionId: metadata.actionId,
      taskId: metadata.taskId,
      assigneeUserKey: metadata.assigneeUserKey,
      submittedByUserKey: submittedBy.key,
      rawText
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

export async function handleFinalsApproveButton({ ack, body, client, config, logger = console, inProcessService }) {
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
      text: `${formatDisplayName(user)}, #finals 반영은 수현님만 실행할 수 있습니다.`
    });
    return;
  }

  try {
    const result = await inProcessService.handleFinalsApproval({
      approvedByUserKey: user.key
    });

    await client.chat.postMessage({
      channel,
      text: result.responseText
    });
  } catch (error) {
    logger.error?.(error);
    await client.chat.postMessage({
      channel,
      text: `${formatDisplayName(user)}, #finals 반영에 실패했습니다. Render 로그를 확인한 뒤 다시 시도해 주세요.`
    });
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

  app.action('copy_codex_prompt', async ({ ack, body, client }) => {
    await handleCodexPromptCopyButton({
      ack,
      body,
      client,
      logger,
      inProcessService
    });
  });

  for (const actionId of ['task_complete', 'task_stop_today', 'task_change_request']) {
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

  app.action('finals_approve_latest', async ({ ack, body, client }) => {
    await handleFinalsApproveButton({
      ack,
      body,
      client,
      config,
      logger,
      inProcessService
    });
  });
}

export function createSlackApp({ config, logger = console, deferInitialization = false, inProcessService = null }) {
  const receiver = new ExpressReceiver({
    signingSecret: config.slack.signingSecret
  });

  registerHealthRoute(receiver, config);

  const app = new App({
    token: config.slack.botToken,
    receiver,
    deferInitialization
  });

  const service = inProcessService ?? createInProcessService({
    store: createSupabaseStore(createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false }
    })),
    slackClient: app.client,
    config,
    logger,
    taskEvaluator: createTaskEvaluator({ config })
  });

  registerDmHandlers(app, config, logger, service);
  registerTaskActionHandlers(app, config, logger, service);

  return { app, receiver };
}
