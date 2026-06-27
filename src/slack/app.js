import { App, ExpressReceiver } from '@slack/bolt';
import { getUserBySlackId } from '../config.js';
import { handleDmCommand } from '../domain/dmCommands.js';
import { createDefaultHealthStatus, renderHealthPage } from '../domain/health.js';
import { buildTextMessageBlocks } from './blocks.js';
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
      ok: Boolean(config.openai?.apiKey),
      message: config.openai?.apiKey ? 'configured' : 'missing env'
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

function registerDmHandlers(app, config, logger) {
  app.message(async ({ message, say }) => {
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
    await say({
      text: response.text,
      blocks: buildTextMessageBlocks(response.text)
    });
  });
}

export function createSlackApp({ config, logger = console, deferInitialization = false }) {
  const receiver = new ExpressReceiver({
    signingSecret: config.slack.signingSecret
  });

  registerHealthRoute(receiver, config);

  const app = new App({
    token: config.slack.botToken,
    receiver,
    deferInitialization
  });

  registerDmHandlers(app, config, logger);

  return { app, receiver };
}
