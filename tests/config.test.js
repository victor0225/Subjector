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
  assert.equal(config.openai.evaluationModel, 'gpt-5.2');
});

test('loadConfigFromEnv allows overriding the OpenAI evaluation model', () => {
  const config = loadConfigFromEnv({
    PORT: '3333',
    BASE_URL: 'https://subjector.onrender.com',
    HEALTH_PIN: '2468',
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    OPENAI_API_KEY: 'sk-key',
    OPENAI_EVALUATION_MODEL: 'gpt-5.2-mini',
    MEETING_CHANNEL_ID: 'C1',
    IN_PROCESS_CHANNEL_ID: 'C2',
    FINALS_CHANNEL_ID: 'C3',
    LEAD_USER_KEY: 'suhyeon',
    USERS_JSON: usersJson
  });

  assert.equal(config.openai.evaluationModel, 'gpt-5.2-mini');
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
