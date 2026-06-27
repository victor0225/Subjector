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

test('출근 confirms the command without promising pending #in-process updates', () => {
  const result = handleDmCommand({
    text: '출근',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'start_work');
  assert.equal(result.updateInProcess, false);
  assert.match(result.text, /수현님/);
  assert.match(result.text, /출근 명령을 확인했습니다/);
  assert.match(result.text, /다음 구현 단계/);
  assert.doesNotMatch(result.text, /반영하겠습니다/);
});

test('퇴근 confirms the command without promising pending daily summary generation', () => {
  const result = handleDmCommand({
    text: '퇴근',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'end_work');
  assert.equal(result.createDailySummary, false);
  assert.match(result.text, /조은님/);
  assert.match(result.text, /퇴근 명령을 확인했습니다/);
  assert.match(result.text, /다음 구현 단계/);
});

test('finals 업데이트 is allowed for lead user', () => {
  const result = handleDmCommand({
    text: 'finals 업데이트',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'force_finals_preview');
  assert.equal(result.createFinalsPreview, false);
  assert.match(result.text, /명령을 확인했습니다/);
  assert.match(result.text, /다음 구현 단계/);
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
