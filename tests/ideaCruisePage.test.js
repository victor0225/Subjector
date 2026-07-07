import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the two-layer roadmap desk', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /IDEA CRUISE Roadmap Desk/);
  assert.match(html, /1F Topic Root Layer/);
  assert.match(html, /2층 AI 카드/);
  assert.match(html, /card-popover/);
  assert.match(html, /Task Candidates/);
  assert.match(html, /Meeting Record/);
  assert.match(html, /id="refresh-roadmap"/);
  assert.doesNotMatch(html, /간단 메모 붙여넣기/);
  assert.doesNotMatch(html, /라이브 회의/);
  assert.doesNotMatch(html, /Completed Brainstorming Inputs/);
});

test('renderIdeaCruisePage documents the model split at each AI step', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /카드 생성: GPT-5\.4/);
  assert.match(html, /회의록 생성: Gemini 2\.5 Flash-Lite/);
  assert.match(html, /Task 최종 정제: Gemini 2\.5 Flash-Lite/);
  assert.match(html, /자료조사, 검증, 구현/);
});

test('renderIdeaCruisePage stores topic/root state locally', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /topics: \[\]/);
  assert.match(html, /activeTopicId: null/);
  assert.match(html, /function activeTopic\(\)/);
  assert.match(html, /function addTopic\(/);
  assert.match(html, /function removeActiveTopic\(\)/);
  assert.match(html, /parentId/);
  assert.match(html, /root-line/);
  assert.match(html, /impact-line/);
});

test('renderIdeaCruisePage supports fixed topics as hard editing boundaries', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /topic\.fixed = !topic\.fixed/);
  assert.match(html, /고정된 topic입니다/);
  assert.match(html, /고정 해제 후 적용/);
  assert.match(html, /고정된 topic은 고정 해제 후 수정할 수 있습니다/);
});

test('renderIdeaCruisePage prioritizes split and conflict cards', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function localSplitCard\(topic\)/);
  assert.match(html, /기능별 topic 분리 제안/);
  assert.match(html, /childTopics/);
  assert.match(html, /function localConflictCard\(topic\)/);
  assert.match(html, /고정 topic과 충돌/);
  assert.match(html, /ensurePriorityCards\(topic\)/);
});

test('renderIdeaCruisePage keeps one visible AI card and pending count', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /const card = topic\.cards && topic\.cards\[0\]/);
  assert.match(html, /대기 카드/);
  assert.match(html, /renderPrimaryCard\(topic, card, pendingCount\)/);
  assert.match(html, /data-toggle-pending/);
  assert.match(html, /data-promote-card/);
  assert.match(html, /data-dismiss-card/);
  assert.match(html, /적용 실패/);
});

test('renderIdeaCruisePage clamps topic nodes and opens details from the fixed card size', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /\.topic-node \{/);
  assert.match(html, /height: 158px/);
  assert.match(html, /overflow: hidden/);
  assert.match(html, /\.topic-summary/);
  assert.match(html, /<span class="topic-summary">/);
});

test('renderIdeaCruisePage consumes split cards after apply or dismiss', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /topic\.splitApplied = true/);
  assert.match(html, /topic\.splitDismissed = true/);
  assert.match(html, /!topic\.splitApplied && !topic\.splitDismissed/);
});

test('renderIdeaCruisePage labels topic completion as task candidate handoff', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /data-complete-topic type="button">Task 후보로 보냄/);
  assert.match(html, /Task 후보 대상/);
  assert.doesNotMatch(html, /완료된 topic이 없습니다/);
});

test('renderIdeaCruisePage calls existing IDEA CRUISE APIs', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /fetch\('\/idea-cruise\/roadmap-context\?pin='/);
  assert.match(html, /fetch\('\/idea-cruise\/cards'/);
  assert.match(html, /fetch\('\/idea-cruise\/task-candidates'/);
  assert.match(html, /fetch\('\/idea-cruise\/tasks'/);
  assert.match(html, /fetch\('\/idea-cruise\/task-updates'/);
  assert.match(html, /completedTopics\(\)\.map/);
});

test('renderIdeaCruisePage merges refreshed Subjector context without overwriting fixed topics', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function mergeRoadmapContext\(topics\)/);
  assert.match(html, /sourceExternalId/);
  assert.match(html, /externalUpdateCard\(existing, incoming\)/);
  assert.match(html, /고정 topic에 최신 변경이 도착했습니다/);
  assert.match(html, /idea-cruise-refresh-pin/);
});

test('renderIdeaCruisePage task candidates use the approved editable fields and source reason', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /data-field="title"/);
  assert.match(html, /data-field="neededInfo"/);
  assert.match(html, /data-field="doneCriteria"/);
  assert.match(html, /data-field="assignee"/);
  assert.match(html, /data-field="importance"/);
  assert.match(html, /생성 맥락/);
  assert.match(html, /<option>미배정<\/option><option>조수현<\/option><option>김조은<\/option><option>배민성<\/option>/);
  assert.doesNotMatch(html, /Task 보완 기준/);
});

test('renderIdeaCruisePage removes successfully applied tasks and preserves failures', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /state\.tasks = state\.tasks\.filter\(function\(item\) \{ return item\.id !== task\.id; \}\)/);
  assert.match(html, /task\.error = error\.message/);
  assert.match(html, /반영 실패/);
});

test('renderIdeaCruisePage separates final task refinement buckets', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /state\.existingTaskUpdates/);
  assert.match(html, /기존 task 보강/);
  assert.match(html, /확인할 것만 보강/);
  assert.match(html, /완료 기준 변경 포함/);
  assert.match(html, /data-remove-not-task/);
  assert.match(html, /data-remove-task-update/);
  assert.match(html, /data-remove-task/);
});

test('renderIdeaCruisePage keeps meeting record as decision narrative, not task list', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function buildMeetingRecord\(\)/);
  assert.match(html, /오늘 판단한 것/);
  assert.match(html, /로드맵 변화/);
  assert.match(html, /다음 회의로 넘길 맥락/);
  assert.doesNotMatch(html, /task를 줄줄이 나열/);
});
