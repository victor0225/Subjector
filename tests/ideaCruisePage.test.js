import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the local criteria alignment workspace', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /IDEA CRUISE/);
  assert.match(html, /회의 기준 정렬/);
  assert.match(html, /빠른 검증용/);
  assert.match(html, /내부 사용 가능한 초안/);
  assert.match(html, /완성도 있는 최종 산출물/);
  assert.match(html, /기준 정렬 패킷 복사/);
});

test('renderIdeaCruisePage stores drafts locally and avoids score language', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /localStorage/);
  assert.match(html, /ideaCruiseAlignmentDraft/);
  assert.match(html, /navigator\.clipboard/);
  assert.doesNotMatch(html, /점수|채점|상\/중\/하/);
});
