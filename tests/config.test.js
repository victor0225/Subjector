import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDisplayName, getUserByKey, getUserBySlackId, loadConfigFromEnv, parseUsersJson } from '../src/config.js';

const usersJson = '[{"key":"suhyeon","slack_id":"U1","full_name":"조수현","display_name":"수현"},{"key":"joeun","slack_id":"U2","full_name":"김조은","display_name":"조은"},{"key":"minsung","slack_id":"U3","full_name":"배민성","display_name":"민성"}]';

test('parseUsersJson parses configured users into camelCase fields', () => {
  const users = parseUsersJson(usersJson);

  assert.equal(users.length, 3);
  assert.deepEqual(users[0], {
    key: 'suhyeon',
    slackId: 'U1',
    fullName: '조수현',
    displayName: '수현'
  });
});

test('parseUsersJson rejects malformed user entries', () => {
  assert.throws(
    () => parseUsersJson('[{"key":"suhyeon","slack_id":"U1"}]'),
    /full_name/
  );
});

test('loadConfigFromEnv builds app config from environment values', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    OPENAI_API_KEY: 'sk-key',
    GEMINI_API_KEY: 'gemini-key',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson
  });

  assert.equal(config.port, 3333);
  assert.equal(config.baseUrl, 'https://subjector.onrender.com');
  assert.equal(config.channels.meeting, 'C1');
  assert.equal(config.channels.inProcess, 'C2');
  assert.equal(config.channels.finals, 'C3');
  assert.equal(config.leadUserKey, 'suhyeon');
  assert.equal(config.users.length, 3);
  assert.equal(config.ai.evaluationProvider, 'openai');
  assert.equal(config.ai.meetingTaskProvider, 'openai');
  assert.equal(config.ai.finalsSummaryProvider, 'openai');
  assert.equal(config.openai.evaluationModel, 'gpt-5.2');
  assert.equal(config.openai.taskExtractionModel, 'gpt-5.4');
  assert.equal(config.openai.finalsSummaryModel, 'gpt-5.4');
  assert.equal(config.gemini.evaluationModel, 'gemini-3.5-flash');
  assert.equal(config.gemini.transcriptionModel, 'gemini-3.5-flash');
  assert.equal(config.gemini.taskExtractionModel, 'gemini-3.5-flash');
  assert.equal(config.gemini.finalsSummaryModel, 'gemini-3.5-flash');
  assert.equal(config.github.organizationUrl, 'https://github.com/SAFIRA-ondevice');
  assert.deepEqual(config.github.repositories, ['SAFIRA-ondevice/Soohyun']);
});

test('loadConfigFromEnv allows overriding AI model selections', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    OPENAI_API_KEY: 'sk-key',
    GEMINI_API_KEY: 'gemini-key',
    OPENAI_EVALUATION_MODEL: 'gpt-5.2-mini',
    OPENAI_TASK_EXTRACTION_MODEL: 'gpt-5.4-mini',
    OPENAI_FINALS_SUMMARY_MODEL: 'gpt-5.4-finals',
    GEMINI_TRANSCRIPTION_MODEL: 'gemini-3.5-flash-lite',
    GEMINI_TASK_EXTRACTION_MODEL: 'gemini-3.5-pro',
    GEMINI_FINALS_SUMMARY_MODEL: 'gemini-3.5-finals',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson
  });

  assert.equal(config.openai.evaluationModel, 'gpt-5.2-mini');
  assert.equal(config.openai.taskExtractionModel, 'gpt-5.4-mini');
  assert.equal(config.openai.finalsSummaryModel, 'gpt-5.4-finals');
  assert.equal(config.gemini.transcriptionModel, 'gemini-3.5-flash-lite');
  assert.equal(config.gemini.taskExtractionModel, 'gemini-3.5-pro');
  assert.equal(config.gemini.finalsSummaryModel, 'gemini-3.5-finals');
});

test('loadConfigFromEnv allows overriding GitHub organization and repositories', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    OPENAI_API_KEY: 'sk-key',
    GEMINI_API_KEY: 'gemini-key',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson,
    GITHUB_ORGANIZATION_URL: 'https://github.com/CustomOrg',
    GITHUB_REPOSITORIES: 'CustomOrg/App, SAFIRA-ondevice/Soohyun '
  });

  assert.equal(config.github.organizationUrl, 'https://github.com/CustomOrg');
  assert.deepEqual(config.github.repositories, ['CustomOrg/App', 'SAFIRA-ondevice/Soohyun']);
});

test('loadConfigFromEnv enables participant skip only with an explicit test flag', () => {
  const baseEnv = {
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    OPENAI_API_KEY: 'sk-key',
    GEMINI_API_KEY: 'gemini-key',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson
  };

  assert.equal(loadConfigFromEnv(baseEnv).features.enableTestParticipantSkip, false);
  assert.equal(loadConfigFromEnv(baseEnv).features.enableMeetingTaskFlow, false);
  assert.equal(loadConfigFromEnv({
    ...baseEnv,
    ENABLE_TEST_PARTICIPANT_SKIP: 'true'
  }).features.enableTestParticipantSkip, true);
  assert.equal(loadConfigFromEnv({
    ...baseEnv,
    ENABLE_MEETING_TASK_FLOW: 'true'
  }).features.enableMeetingTaskFlow, true);
});

test('loadConfigFromEnv supports Gemini task evaluation provider', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    AI_EVALUATION_PROVIDER: 'gemini',
    MEETING_TASK_PROVIDER: 'gemini',
    FINALS_SUMMARY_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_EVALUATION_MODEL: 'gemini-3.5-flash-lite',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson
  });

  assert.equal(config.ai.evaluationProvider, 'gemini');
  assert.equal(config.ai.meetingTaskProvider, 'gemini');
  assert.equal(config.ai.finalsSummaryProvider, 'gemini');
  assert.equal(config.gemini.apiKey, 'gemini-key');
  assert.equal(config.gemini.evaluationModel, 'gemini-3.5-flash-lite');
  assert.equal(config.openai.apiKey, '');
});

test('loadConfigFromEnv requires the selected task evaluation provider key', () => {
  assert.throws(
    () => loadConfigFromEnv({
      PORT: '3333',
      BASE_URL: 'https://subjector.onrender.com',
      HEALTH_PIN: '2468',
      SLACK_BOT_TOKEN: 'xoxb-token',
      SLACK_SIGNING_SECRET: 'secret',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      AI_EVALUATION_PROVIDER: 'gemini',
      MEETING_CHANNEL_ID: 'C1',
      IN_PROCESS_CHANNEL_ID: 'C2',
      FINALS_CHANNEL_ID: 'C3',
      LEAD_USER_KEY: 'suhyeon',
      USERS_JSON: usersJson
    }),
    /GEMINI_API_KEY/
  );
});

test('loadConfigFromEnv requires the selected meeting task provider key', () => {
  assert.throws(
    () => loadConfigFromEnv({
      PORT: '3333',
      BASE_URL: 'https://subjector.onrender.com',
      HEALTH_PIN: '2468',
      SLACK_BOT_TOKEN: 'xoxb-token',
      SLACK_SIGNING_SECRET: 'secret',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      MEETING_TASK_PROVIDER: 'openai',
      GEMINI_API_KEY: 'gemini-key',
      MEETING_CHANNEL_ID: 'C1',
      IN_PROCESS_CHANNEL_ID: 'C2',
      FINALS_CHANNEL_ID: 'C3',
      LEAD_USER_KEY: 'suhyeon',
      USERS_JSON: usersJson
    }),
    /OPENAI_API_KEY/
  );
});

test('loadConfigFromEnv treats a Gemini finals provider model name as the finals model', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    AI_EVALUATION_PROVIDER: 'gemini',
    MEETING_TASK_PROVIDER: 'gemini',
    FINALS_SUMMARY_PROVIDER: 'gemini-3.5-flash-lite',
    GEMINI_API_KEY: 'gemini-key',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson
  });

  assert.equal(config.ai.finalsSummaryProvider, 'gemini');
  assert.equal(config.gemini.finalsSummaryModel, 'gemini-3.5-flash-lite');
});

test('loadConfigFromEnv reports missing required variables', () => {
  assert.throws(
    () => loadConfigFromEnv({ USERS_JSON: usersJson }),
    /PORT/
  );
});

test('user lookup helpers find users and format display names politely', () => {
  const users = parseUsersJson(usersJson);

  assert.equal(getUserBySlackId(users, 'U2').fullName, '김조은');
  assert.equal(getUserByKey(users, 'minsung').displayName, '민성');
  assert.equal(formatDisplayName(getUserByKey(users, 'suhyeon')), '수현님');
});
