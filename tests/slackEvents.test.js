import test from 'node:test';
import assert from 'node:assert/strict';
import { isDirectUserMessage } from '../src/slack/events.js';

test('isDirectUserMessage accepts human DM messages', () => {
  assert.equal(isDirectUserMessage({
    channel_type: 'im',
    user: 'U1',
    text: '출근'
  }), true);
});

test('isDirectUserMessage rejects channel messages', () => {
  assert.equal(isDirectUserMessage({
    channel_type: 'channel',
    user: 'U1',
    text: '출근'
  }), false);
});

test('isDirectUserMessage rejects bot messages', () => {
  assert.equal(isDirectUserMessage({
    channel_type: 'im',
    bot_id: 'B1',
    text: '출근'
  }), false);
});
