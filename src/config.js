import { formatDisplayName, getUserByKey, getUserBySlackId, normalizeUser } from './domain/users.js';

const REQUIRED_ENV = [
  'PORT',
  'BASE_URL',
  'HEALTH_PIN',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'MEETING_CHANNEL_ID',
  'IN_PROCESS_CHANNEL_ID',
  'FINALS_CHANNEL_ID',
  'LEAD_USER_KEY',
  'USERS_JSON'
];

export { formatDisplayName, getUserByKey, getUserBySlackId };

export function parseUsersJson(raw) {
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`USERS_JSON must be valid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('USERS_JSON must be an array');
  }

  return parsed.map((entry, index) => normalizeUser(entry, index));
}

export function loadConfigFromEnv(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name] || env[name].trim() === '');

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }

  const port = Number.parseInt(env.PORT, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  const users = parseUsersJson(env.USERS_JSON);
  if (!getUserByKey(users, env.LEAD_USER_KEY)) {
    throw new Error(`LEAD_USER_KEY must match one configured user: ${env.LEAD_USER_KEY}`);
  }

  return {
    port,
    baseUrl: env.BASE_URL.trim(),
    healthPin: env.HEALTH_PIN.trim(),
    leadUserKey: env.LEAD_USER_KEY.trim(),
    users,
    slack: {
      botToken: env.SLACK_BOT_TOKEN.trim(),
      signingSecret: env.SLACK_SIGNING_SECRET.trim()
    },
    supabase: {
      url: env.SUPABASE_URL.trim(),
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY.trim()
    },
    openai: {
      apiKey: env.OPENAI_API_KEY.trim(),
      evaluationModel: env.OPENAI_EVALUATION_MODEL?.trim() || 'gpt-5.2'
    },
    channels: {
      meeting: env.MEETING_CHANNEL_ID.trim(),
      inProcess: env.IN_PROCESS_CHANNEL_ID.trim(),
      finals: env.FINALS_CHANNEL_ID.trim()
    }
  };
}
