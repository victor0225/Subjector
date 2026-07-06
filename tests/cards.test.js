import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCardsForEntry } from '../src/domain/cards.js';

test('generates comparison card for hardware difference uncertainty', () => {
  const cards = generateCardsForEntry({
    entry: { id: 'entry_1', text: '라즈베리 파이와 ESP32의 차이를 모르겠다.' },
    existingTasks: []
  });

  assert.equal(cards[0].type, 'concept-comparison');
  assert.match(cards[0].title, /비교/);
  assert.match(cards[0].body, /Raspberry Pi/);
  assert.match(cards[0].body, /ESP32/);
  assert.match(cards[0].improvedText, /카메라\/AI 처리/);
});

test('generates Subjector conflict card when task source overlaps', () => {
  const cards = generateCardsForEntry({
    entry: { id: 'entry_2', text: 'Subjector에서 회의 결과록을 보고 task도 만들자.' },
    existingTasks: ['Subjector in-process handoff']
  });

  assert.equal(cards[0].type, 'source-conflict');
  assert.match(cards[0].body, /task source/);
  assert.match(cards[0].improvedText, /IDEA CRUISE만/);
});

test('generates a prioritized roadmap for battlefield noise dataset topics', () => {
  const cards = generateCardsForEntry({
    entry: { id: 'entry_3', text: '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터는 무엇인가?' },
    existingTasks: ['공사현장 헤드셋 데이터셋 조사']
  });

  assert.equal(cards[0].priority, 'primary');
  assert.equal(cards[0].action, 'decide-now');
  assert.equal(cards[0].outcome, 'topic-rewrite');
  assert.match(cards[0].title, /목표 환경/);
  assert.match(cards[0].improvedText, /전장용 폭음 차단/);
  assert.ok(cards.some((card) => card.outcome === 'task-candidate'));
  assert.ok(cards.some((card) => card.action === 'defer'));
});
