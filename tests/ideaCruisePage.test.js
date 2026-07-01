import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the IDEA CRUISE meeting desk workspace', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /IDEA CRUISE Meeting Desk/);
  assert.match(html, /라이브 회의/);
  assert.match(html, /간단 메모 붙여넣기/);
  assert.match(html, /Brainstorming Input/);
  assert.match(html, /Live Intervention Cards/);
  assert.match(html, /Meeting Record/);
  assert.match(html, /Task Candidates From IDEA CRUISE/);
  assert.match(html, /#project-log/);
});

test('renderIdeaCruisePage documents model split and local draft behavior', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /localStorage/);
  assert.match(html, /ideaCruiseMeetingDeskDraft/);
  assert.match(html, /navigator\.clipboard/);
  assert.match(html, /Gemini 2\.5 Flash-Lite/);
  assert.match(html, /gpt-5\.4/);
  assert.match(html, /카드 모델: gpt-5\.4/);
  assert.match(html, /회의록\/task 생성 모델: Gemini 2\.5 Flash-Lite/);
  assert.doesNotMatch(html, /기준 정렬 패킷|빠른 검증용|상\/중\/하/);
});

test('renderIdeaCruisePage delegates intervention card expansion clicks', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /rows\.addEventListener\('click'/);
  assert.doesNotMatch(html, /querySelectorAll\('\.intervention\.collapsed'\)\.forEach/);
});

test('renderIdeaCruisePage expands the selected intervention card in its row', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /\.card-row\s*{\s*display: flex;/);
  assert.match(html, /\.intervention\.expanded\s*{[^}]*flex: 1 1 58%/);
  assert.match(html, /\.intervention\.collapsed\s*{[^}]*flex: 0 1 96px/);
  assert.match(html, /classList\.add\('expanded'\)/);
  assert.match(html, /classList\.remove\('collapsed'\)/);
});

test('renderIdeaCruisePage caps visible intervention cards and renders overflow candidates', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /const visibleCards = cards\.slice\(0, 3\)/);
  assert.match(html, /const hiddenCards = cards\.slice\(3\)/);
  assert.match(html, /class="overflow-card"/);
  assert.match(html, /<span>more<\/span>/);
  assert.match(html, /data-overflow-entry-id/);
});

test('renderIdeaCruisePage gives each brainstorming entry its own controls', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /class="entry-actions"/);
  assert.match(html, /data-analyze-entry-id/);
  assert.match(html, /data-delete-entry-id/);
  assert.match(html, /document\.querySelectorAll\('\[data-analyze-entry-id\]'\)/);
  assert.match(html, /document\.querySelectorAll\('\[data-delete-entry-id\]'\)/);
  assert.doesNotMatch(html, /id="analyze"/);
});

test('renderIdeaCruisePage places add entry in the brainstorming header', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /<div class="section-title-row">[\s\S]*<h2>Brainstorming Input<\/h2>[\s\S]*<button id="add-entry">Add Entry<\/button>[\s\S]*<\/div>/);
});

test('renderIdeaCruisePage constrains panel heights and scrolls overflowing content', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /main\s*{[^}]*align-items: start;/);
  assert.match(html, /section\s*{[^}]*display: flex;[^}]*flex-direction: column;/);
  assert.match(html, /\.scroll-pane\s*{[^}]*height: 520px;[^}]*max-height: 520px;[^}]*overflow-y: auto;/);
  assert.match(html, /class="entry-list scroll-pane"/);
  assert.match(html, /class="card-rows scroll-pane"/);
  assert.match(html, /class="completed-list scroll-pane"/);
});

test('renderIdeaCruisePage invalidates stale intervention cards when an entry changes', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /delete state\.cards\[entry\.id\]/);
  assert.match(html, /renderCards\(\)/);
});

test('renderIdeaCruisePage builds intervention cards from the current entry text', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /const subject = text/);
  assert.match(html, /subject \+ '에 대해 판단 기준을 먼저 정리합니다\.'/);
  assert.doesNotMatch(html, /라즈베리 파이 vs ESP32 비교표/);
});

test('renderIdeaCruisePage caps visible task candidates and renders task overflow', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /const visibleTasks = state\.tasks\.slice\(0, 3\)/);
  assert.match(html, /const hiddenTasks = state\.tasks\.slice\(3\)/);
  assert.match(html, /class="task-overflow-card"/);
  assert.match(html, /data-task-overflow/);
});

test('renderIdeaCruisePage shows completed brainstorming inputs in the right column', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /Completed Brainstorming Inputs/);
  assert.match(html, /completed-list/);
  assert.match(html, /state\.completedEntries/);
  assert.match(html, /state\.completedEntries\.push/);
});

test('renderIdeaCruisePage moves meeting record into a slide-out drawer', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /class="record-drawer/);
  assert.match(html, /id="record-drawer"/);
  assert.match(html, /classList\.toggle\('open', state\.recordDrawerOpen\)/);
  assert.match(html, /id="close-record"/);
});

test('renderIdeaCruisePage task candidates use explicit task fields and manual assignee selection', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /data-field="neededInfo"/);
  assert.match(html, /data-field="doneCriteria"/);
  assert.match(html, /<option>미배정<\/option><option>조수현<\/option><option>김조은<\/option><option>배민성<\/option>/);
  assert.match(html, /assignee: '미배정'/);
  assert.doesNotMatch(html, /Task 보완 기준/);
  assert.doesNotMatch(html, /assignee: '수현'|assignee: '조은'|assignee: '민석'/);
});
