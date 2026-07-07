import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the approved topic-page meeting desk', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /IDEA CRUISE Roadmap Desk/);
  assert.match(html, /1\. Topic Page/);
  assert.match(html, /2\. Roadmap Intervention/);
  assert.match(html, /3\. Outcome Tasks/);
  assert.match(html, /다음 주제 추가/);
  assert.match(html, /회의록 열기/);
  assert.doesNotMatch(html, /간단 메모 붙여넣기/);
  assert.doesNotMatch(html, /라이브 회의/);
  assert.doesNotMatch(html, /Completed Brainstorming Inputs/);
  assert.doesNotMatch(html, /Source: 전체 Completed Topic Pages/);
});

test('renderIdeaCruisePage documents the model split at each AI step', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /카드 생성: GPT-5\.4/);
  assert.match(html, /회의록 생성: Gemini 2\.5 Flash-Lite/);
  assert.match(html, /Task 최종 정제: Gemini 2\.5 Flash-Lite/);
  assert.match(html, /자료조사, 검증, 구현/);
});

test('renderIdeaCruisePage uses one active topic page with page-specific cards', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /pages: \[/);
  assert.match(html, /activePageId: 'page-1'/);
  assert.match(html, /function activePage\(\)/);
  assert.match(html, /function addTopicPage\(\)/);
  assert.match(html, /function removeActiveTopicPage\(\)/);
  assert.match(html, /function setActivePage\(pageId\)/);
  assert.match(html, /page\.cards/);
  assert.match(html, /이 페이지의 가운데 카드는/);
});

test('renderIdeaCruisePage removes active topic pages and their generated right-side state', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /id="remove-topic"/);
  assert.match(html, /state\.pages = state\.pages\.filter\(function\(page\) \{ return page\.id !== removedPageId; \}\)/);
  assert.match(html, /page\.number = index \+ 1/);
  assert.match(html, /state\.tasks = state\.tasks\.filter\(function\(task\) \{ return task\.pageId !== removedPageId; \}\)/);
  assert.match(html, /state\.existingTaskUpdates = \[\]/);
  assert.match(html, /state\.notTasks = \[\]/);
});

test('renderIdeaCruisePage rewrites the active page from applied card content and removes the card', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function rewriteActivePage\(content\)/);
  assert.match(html, /page\.text = content\.trim\(\)/);
  assert.match(html, /page\.cards\.splice\(cardIndex, 1\)/);
  assert.doesNotMatch(html, /entry\.text = cardEl\.querySelector\('textarea'\)\.value/);
});

test('renderIdeaCruisePage keeps failed card applications visible with a short log', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /card\.error = error\.message/);
  assert.match(html, /class="error-log"/);
  assert.match(html, /적용 실패/);
});

test('renderIdeaCruisePage completes pages and feeds task generation from completed pages', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function completeActivePage\(\)/);
  assert.match(html, /page\.completed = true/);
  assert.match(html, /function completedPages\(\)/);
  assert.match(html, /requestTaskCandidates\(\)/);
});

test('renderIdeaCruisePage shows task filters as the first element in the right column', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /<div class="page-nav task-filter-nav" id="task-filter-nav"><\/div>/);
  assert.match(html, /function setTaskFilter\(filter\)/);
  assert.match(html, /function visibleTasks\(\)/);
  assert.match(html, /state\.taskFilter === 'all'/);
});

test('renderIdeaCruisePage task candidates use the approved five editable fields', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /data-field="title"/);
  assert.match(html, /data-field="neededInfo"/);
  assert.match(html, /data-field="doneCriteria"/);
  assert.match(html, /data-field="assignee"/);
  assert.match(html, /data-field="importance"/);
  assert.match(html, /<option>미배정<\/option><option>조수현<\/option><option>김조은<\/option><option>배민성<\/option>/);
  assert.doesNotMatch(html, /Task 보완 기준/);
});

test('renderIdeaCruisePage removes successfully applied tasks and preserves failures', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /fetch\('\/idea-cruise\/tasks'/);
  assert.match(html, /state\.tasks = state\.tasks\.filter\(function\(item\) \{ return item\.id !== task\.id; \}\)/);
  assert.match(html, /task\.error = error\.message/);
  assert.match(html, /반영 실패/);
});

test('renderIdeaCruisePage generates task candidates from completed topic pages through the API', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /async function requestTaskCandidates\(\)/);
  assert.match(html, /fetch\('\/idea-cruise\/task-candidates'/);
  assert.match(html, /completedPages\(\)\.map/);
  assert.match(html, /state\.existingTaskUpdates = Array\.isArray\(result\.existingTaskUpdates\)/);
  assert.match(html, /state\.notTasks = Array\.isArray\(result\.notTasks\)/);
  assert.doesNotMatch(html, /function buildTasksFromCompletedPages\(\)/);
  assert.doesNotMatch(html, /id="clear-draft"/);
  assert.doesNotMatch(html, /초안 비우기/);
  assert.doesNotMatch(html, /id="generate-tasks"/);
  assert.doesNotMatch(html, /Task 후보 생성/);
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
  assert.match(html, /fetch\('\/idea-cruise\/task-updates'/);
});

test('renderIdeaCruisePage renders flexible card details and optional suggestions', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /card\.details/);
  assert.match(html, /card\.choices/);
  assert.match(html, /if \(card\.suggestion\)/);
  assert.match(html, /data-suggestion/);
  assert.match(html, /roadmap-board/);
  assert.match(html, /roadmap-lines/);
  assert.match(html, /flow-node/);
  assert.match(html, /data-select-roadmap-card/);
  assert.match(html, /renderRoadmapDetail/);
});

test('renderIdeaCruisePage keeps meeting record as decision narrative, not task list', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function buildMeetingRecord\(\)/);
  assert.match(html, /오늘 판단한 것/);
  assert.match(html, /제외한 선택지/);
  assert.match(html, /다음 회의로 넘길 맥락/);
  assert.doesNotMatch(html, /task를 줄줄이 나열/);
});


test('renderIdeaCruisePage prioritizes decision and exclusion lanes in the roadmap', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /priority-roadmap-v2/);
  assert.match(html, /먼저 판단: 지금 결정해야 다음으로 감/);
  assert.match(html, /보류\/제외: 지금은 다른 생각 먼저/);
  assert.match(html, /function priorityScore\(card\)/);
  assert.match(html, /function prioritizedCards\(cards, selectedIndex\)/);
  assert.match(html, /branch-now/);
  assert.match(html, /branch-later/);
  assert.match(html, /선택하면 이쪽으로 심화/);
});
