import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultHealthStatus, isHealthPinValid, renderHealthPage } from '../src/domain/health.js';

const config = {
  healthPin: '2468',
  baseUrl: 'https://subjector.onrender.com',
  channels: {
    meeting: 'C1',
    inProcess: 'C2',
    finals: 'C3'
  },
  slack: {
    botToken: 'xoxb-secret',
    signingSecret: 'signing-secret'
  },
  supabase: {
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-secret'
  },
  openai: {
    apiKey: 'sk-secret'
  }
};

test('isHealthPinValid accepts only the configured PIN', () => {
  assert.equal(isHealthPinValid('2468', config), true);
  assert.equal(isHealthPinValid('0000', config), false);
});

test('renderHealthPage without valid PIN shows form and no secrets', () => {
  const html = renderHealthPage({
    pin: '0000',
    config,
    status: createDefaultHealthStatus()
  });

  assert.match(html, /Subjector Health/);
  assert.match(html, /PIN/);
  assert.doesNotMatch(html, /xoxb-secret/);
  assert.doesNotMatch(html, /service-secret/);
  assert.doesNotMatch(html, /sk-secret/);
});

test('renderHealthPage with valid PIN shows service statuses and channel checks', () => {
  const html = renderHealthPage({
    pin: '2468',
    config,
    status: {
      slack: { ok: true, message: 'connected' },
      supabase: { ok: false, message: 'missing env' },
      openai: { ok: true, message: 'configured' },
      deployment: { ok: true, message: 'c8ca660668af4a73e0e8db9e8e77d7fbc83517e9' },
      channels: {
        meeting: { ok: true, message: '#회의-결과록' },
        inProcess: { ok: true, message: '#in-process' },
        finals: { ok: false, message: 'not invited' }
      },
      web: {
        ideaCruise: { ok: true, message: 'https://subjector.onrender.com/idea-cruise' }
      },
      recentEvents: ['server started']
    }
  });

  assert.match(html, /Slack/);
  assert.match(html, /Supabase/);
  assert.match(html, /OpenAI/);
  assert.match(html, /IDEA CRUISE/);
  assert.match(html, /Deployment/);
  assert.match(html, /c8ca660/);
  assert.match(html, /\/idea-cruise/);
  assert.match(html, /#회의-결과록/);
  assert.match(html, /not invited/);
  assert.doesNotMatch(html, /xoxb-secret/);
});
