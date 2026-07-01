import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the approved topic-page meeting desk', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /IDEA CRUISE Meeting Desk/);
  assert.match(html, /1\. Topic Page/);
  assert.match(html, /2\. Topic-Specific AI Cards/);
  assert.match(html, /3\. Task Candidates/);
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
  assert.match(html, /Task 후보 생성: Gemini 2\.5 Flash-Lite/);
  assert.match(html, /적용\/완료\/Subjector 반영: AI 없음/);
  assert.match(html, /https:\/\/github\.com\/SAFIRA-ondevice/);
});

test('renderIdeaCruisePage uses one active topic page with page-specific cards', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /pages: \[/);
  assert.match(html, /activePageId: 'page-1'/);
  assert.match(html, /function activePage\(\)/);
  assert.match(html, /function addTopicPage\(\)/);
  assert.match(html, /function setActivePage\(pageId\)/);
  assert.match(html, /page\.cards/);
  assert.match(html, /이 페이지의 가운데 카드는/);
});

test('renderIdeaCruisePage appends applied card content to the active page and removes the card', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function appendToActivePage\(content\)/);
  assert.match(html, /page\.text = page\.text\.trim\(\) \+ '\\n\\n' \+ content\.trim\(\)/);
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
  assert.match(html, /state\.notTasks = result\.notTasks/);
  assert.doesNotMatch(html, /function buildTasksFromCompletedPages\(\)/);
  assert.doesNotMatch(html, /id="clear-draft"/);
  assert.doesNotMatch(html, /초안 비우기/);
});

test('renderIdeaCruisePage renders flexible card details and optional suggestions', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /card\.details/);
  assert.match(html, /card\.choices/);
  assert.match(html, /if \(card\.suggestion\)/);
  assert.match(html, /data-suggestion/);
});

test('renderIdeaCruisePage keeps meeting record as decision narrative, not task list', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function buildMeetingRecord\(\)/);
  assert.match(html, /오늘 판단한 것/);
  assert.match(html, /제외한 선택지/);
  assert.match(html, /다음 회의로 넘길 맥락/);
  assert.doesNotMatch(html, /task를 줄줄이 나열/);
});
