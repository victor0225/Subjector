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
