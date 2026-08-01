import { formatDisplayName, getUserByKey, getUserBySlackId, normalizeUser } from './domain/users.js';

const REQUIRED_ENV = [
  'PORT',
  'BASE_URL',
  'HEALTH_PIN',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MEETING_CHANNEL_ID',
  'IN_PROCESS_CHANNEL_ID',
  'FINALS_CHANNEL_ID',
  'LEAD_USER_KEY',
  'USERS_JSON'
];

const EVALUATION_PROVIDERS = new Set(['openai', 'gemini']);
const MEETING_TASK_PROVIDERS = new Set(['openai', 'gemini']);
const FINALS_SUMMARY_PROVIDERS = new Set(['openai', 'gemini']);

export { formatDisplayName, getUserByKey, getUserBySlackId };

function envFlag(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function parseGithubRepositories(raw) {
  const value = String(raw ?? 'SAFIRA-ondevice/Soohyun');
  return value
    .split(',')
    .map((entry) => entry.trim())
    .map((entry) => entry.replace(/^https:\/\/github\.com\//i, '').replace(/\.git$/i, ''))
    .filter(Boolean);
}

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

  const evaluationProvider = (env.AI_EVALUATION_PROVIDER?.trim().toLowerCase() || 'openai');
  if (!EVALUATION_PROVIDERS.has(evaluationProvider)) {
    throw new Error('AI_EVALUATION_PROVIDER must be one of: openai, gemini');
  }

  const meetingTaskProvider = (env.MEETING_TASK_PROVIDER?.trim().toLowerCase() || 'openai');
  if (!MEETING_TASK_PROVIDERS.has(meetingTaskProvider)) {
    throw new Error('MEETING_TASK_PROVIDER must be one of: openai, gemini');
  }

  const rawFinalsSummaryProvider = env.FINALS_SUMMARY_PROVIDER?.trim() || '';
  let inferredFinalsSummaryModel = '';
  let finalsSummaryProvider = (rawFinalsSummaryProvider.toLowerCase() || meetingTaskProvider);
  if (!FINALS_SUMMARY_PROVIDERS.has(finalsSummaryProvider)) {
    if (finalsSummaryProvider.startsWith('gemini-')) {
      finalsSummaryProvider = 'gemini';
      inferredFinalsSummaryModel = rawFinalsSummaryProvider;
    } else {
      throw new Error(
        'FINALS_SUMMARY_PROVIDER must be openai or gemini. '
        + 'If you are choosing a Gemini model, set FINALS_SUMMARY_PROVIDER=gemini and GEMINI_FINALS_SUMMARY_MODEL=<model name>. '
        + 'If you are choosing an OpenAI model, set FINALS_SUMMARY_PROVIDER=openai and OPENAI_FINALS_SUMMARY_MODEL=<model name>.'
      );
    }
  }

  const requiredAiKeys = new Set([
    evaluationProvider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY',
    meetingTaskProvider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY',
    finalsSummaryProvider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'
  ]);
  for (const selectedProviderKey of requiredAiKeys) {
    if (!env[selectedProviderKey] || env[selectedProviderKey].trim() === '') {
      throw new Error(`Missing required env: ${selectedProviderKey}`);
    }
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
    ai: {
      evaluationProvider,
      meetingTaskProvider,
      finalsSummaryProvider
    },
    openai: {
      apiKey: env.OPENAI_API_KEY?.trim() || '',
      evaluationModel: env.OPENAI_EVALUATION_MODEL?.trim() || 'gpt-5.2',
      taskExtractionModel: env.OPENAI_TASK_EXTRACTION_MODEL?.trim() || 'gpt-5.4',
      finalsSummaryModel: env.OPENAI_FINALS_SUMMARY_MODEL?.trim()
        || env.OPENAI_TASK_EXTRACTION_MODEL?.trim()
        || 'gpt-5.4'
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY?.trim() || '',
      evaluationModel: env.GEMINI_EVALUATION_MODEL?.trim() || 'gemini-3.5-flash',
      transcriptionModel: env.GEMINI_TRANSCRIPTION_MODEL?.trim()
        || env.GEMINI_EVALUATION_MODEL?.trim()
        || 'gemini-3.5-flash',
      taskExtractionModel: env.GEMINI_TASK_EXTRACTION_MODEL?.trim()
        || env.GEMINI_TRANSCRIPTION_MODEL?.trim()
        || env.GEMINI_EVALUATION_MODEL?.trim()
        || 'gemini-3.5-flash',
      finalsSummaryModel: env.GEMINI_FINALS_SUMMARY_MODEL?.trim()
        || (finalsSummaryProvider === 'gemini' ? inferredFinalsSummaryModel : '')
        || env.GEMINI_TASK_EXTRACTION_MODEL?.trim()
        || env.GEMINI_TRANSCRIPTION_MODEL?.trim()
        || env.GEMINI_EVALUATION_MODEL?.trim()
        || 'gemini-3.5-flash'
    },
    channels: {
      meeting: env.MEETING_CHANNEL_ID.trim(),
      inProcess: env.IN_PROCESS_CHANNEL_ID.trim(),
      finals: env.FINALS_CHANNEL_ID.trim()
    },
    github: {
      organizationUrl: env.GITHUB_ORGANIZATION_URL?.trim() || 'https://github.com/SAFIRA-ondevice',
      repositories: parseGithubRepositories(env.GITHUB_REPOSITORIES),
      token: env.GITHUB_TOKEN?.trim() || ''
    },
    deployment: {
      commit: env.RENDER_GIT_COMMIT?.trim() || env.GIT_COMMIT?.trim() || 'local'
    },
    features: {
      enableTestParticipantSkip: envFlag(env.ENABLE_TEST_PARTICIPANT_SKIP),
      enableMeetingTaskFlow: envFlag(env.ENABLE_MEETING_TASK_FLOW)
    }
  };
}
