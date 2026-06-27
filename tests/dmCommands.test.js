import test from 'node:test';
import assert from 'node:assert/strict';
import { handleDmCommand, normalizeCommand } from '../src/domain/dmCommands.js';

const config = {
  leadUserKey: 'suhyeon',
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' },
    { key: 'joeun', slackId: 'U2', fullName: '김조은', displayName: '조은' }
  ]
};

test('normalizeCommand trims text and collapses whitespace', () => {
  assert.equal(normalizeCommand('  finals   업데이트  '), 'finals 업데이트');
});

test('출근 creates start-work response and requests #in-process update', () => {
  const result = handleDmCommand({
    text: '출근',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'start_work');
  assert.equal(result.updateInProcess, true);
  assert.match(result.text, /수현님/);
  assert.match(result.text, /오늘 할 일/);
});

test('퇴근 creates end-work summary response without blocking missing tasks', () => {
  const result = handleDmCommand({
    text: '퇴근',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'end_work');
  assert.equal(result.createDailySummary, true);
  assert.match(result.text, /조은님/);
  assert.match(result.text, /오늘 한 일 요약/);
});

test('finals 업데이트 is allowed for lead user', () => {
  const result = handleDmCommand({
    text: 'finals 업데이트',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'force_finals_preview');
  assert.equal(result.createFinalsPreview, true);
});

test('finals 업데이트 is rejected for non-lead user', () => {
  const result = handleDmCommand({
    text: 'finals 업데이트',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'not_allowed');
  assert.match(result.text, /수현님만/);
});

test('unknown command returns short help text', () => {
  const result = handleDmCommand({
    text: '메뉴',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'help');
  assert.match(result.text, /출근/);
  assert.match(result.text, /퇴근/);
});
