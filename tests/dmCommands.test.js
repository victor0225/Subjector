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

test('출근 opens the personal DM task board', () => {
  const result = handleDmCommand({
    text: '출근',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'start_work');
  assert.equal(result.openPersonalTaskBoard, true);
  assert.match(result.text, /수현님/);
  assert.match(result.text, /개인 task 보드/);
});

test('최신화 refreshes every team member board for any user', () => {
  const result = handleDmCommand({
    text: '최신화',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'refresh_all_in_process');
  assert.equal(result.refreshAllInProcess, true);
  assert.match(result.text, /조은님/);
  assert.match(result.text, /팀 진행 과정 보드/);
});

test('전체 최신화 refreshes every team member board for the lead', () => {
  const result = handleDmCommand({
    text: '전체 최신화',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'refresh_all_in_process');
  assert.equal(result.refreshAllInProcess, true);
  assert.match(result.text, /팀 전체/);
  assert.match(result.text, /#in-process/);
});

test('전체 최신화 remains a compatibility alias for every team member board', () => {
  const result = handleDmCommand({
    text: '전체 최신화',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'refresh_all_in_process');
  assert.equal(result.refreshAllInProcess, true);
});

test('로드맵 반영 requests IDEA CRUISE roadmap reflection for the lead', () => {
  const result = handleDmCommand({
    text: '로드맵 반영',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'roadmap_reflection');
  assert.equal(result.reflectRoadmap, true);
  assert.match(result.text, /로드맵 반영/);
  assert.match(result.text, /#회의-결과록/);
});

test('로드맵 반영 is rejected for non-lead users', () => {
  const result = handleDmCommand({
    text: '로드맵 반영',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'not_allowed');
  assert.match(result.text, /수현님만/);
});

test('오늘 요약 requests daily summary generation', () => {
  const result = handleDmCommand({
    text: '오늘 요약',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'daily_summary');
  assert.equal(result.createDailySummary, true);
  assert.match(result.text, /조은님/);
  assert.match(result.text, /오늘 한 일 요약/);
  assert.doesNotMatch(result.text, /퇴근/);
});

test('일일 정리 requests daily summary generation', () => {
  const result = handleDmCommand({
    text: '일일 정리',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'daily_summary');
  assert.equal(result.createDailySummary, true);
  assert.match(result.text, /오늘 한 일 요약/);
});

test('퇴근 folds the personal DM task board without creating a daily summary', () => {
  const result = handleDmCommand({
    text: '퇴근',
    user: config.users[1],
    config
  });

  assert.equal(result.type, 'end_work');
  assert.equal(result.closePersonalTaskBoard, true);
  assert.equal(result.createDailySummary, undefined);
  assert.match(result.text, /개인 task 보드/);
  assert.match(result.text, /접겠습니다/);
});

test('finals 업데이트 is allowed for lead user', () => {
  const result = handleDmCommand({
    text: 'finals 업데이트',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'force_finals_update');
  assert.equal(result.createFinalsUpdate, true);
  assert.match(result.text, /명령을 확인했습니다/);
  assert.match(result.text, /바로 반영/);
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

test('테스트 task 정리 is no longer a user-facing DM command', () => {
  const result = handleDmCommand({
    text: '테스트 task 정리',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'help');
  assert.equal(result.archiveTestTasks, undefined);
  assert.doesNotMatch(result.text, /테스트 task 정리/);
});

test('회의 기록 is no longer stored through a DM command', () => {
  const result = handleDmCommand({
    text: '회의 기록: ESP32 기준으로 진행하기로 함',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'help');
  assert.equal(result.createRawMeeting, undefined);
  assert.equal(result.rawMeetingText, undefined);
  assert.doesNotMatch(result.text, /회의 기록/);
});

test('unknown command returns short help text', () => {
  const result = handleDmCommand({
    text: '메뉴',
    user: config.users[0],
    config
  });

  assert.equal(result.type, 'help');
  assert.match(result.text, /최신화/);
  assert.match(result.text, /로드맵 반영/);
  assert.match(result.text, /오늘 요약/);
  assert.match(result.text, /일일 정리/);
  assert.doesNotMatch(result.text, /회의 기록|테스트 task 정리/);
  assert.match(result.text, /출근/);
  assert.match(result.text, /퇴근/);
  assert.doesNotMatch(result.text, /업무 시작|출근 기록/);
});
