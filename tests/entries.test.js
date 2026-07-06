import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCardToEntry, createEntry } from '../src/domain/entries.js';

test('createEntry stores live meeting text with stable defaults', () => {
  const entry = createEntry({ text: '라즈베리 파이와 ESP32의 차이를 모르겠다.' });

  assert.equal(entry.text, '라즈베리 파이와 ESP32의 차이를 모르겠다.');
  assert.equal(entry.mode, 'live');
  assert.equal(entry.kind, 'raw');
  assert.equal(entry.version, 1);
  assert.ok(entry.id.startsWith('entry_'));
  assert.ok(entry.createdAt);
});

test('applyCardToEntry strengthens the original entry and removes the card', () => {
  const entry = createEntry({
    id: 'entry_1',
    text: 'ESP32랑 라즈베리 파이 차이를 모르겠다.',
    cards: [
      { id: 'card_1', title: '하드웨어 비교', action: 'decide-now', outcome: 'topic-rewrite' },
      { id: 'card_2' }
    ]
  });

  const updated = applyCardToEntry({
    entry,
    cardId: 'card_1',
    improvedText: 'Raspberry Pi는 카메라/AI 처리 후보이고, ESP32는 저전력 센서 제어 후보이다.'
  });

  assert.equal(updated.text, 'Raspberry Pi는 카메라/AI 처리 후보이고, ESP32는 저전력 센서 제어 후보이다.');
  assert.equal(updated.kind, 'strengthened');
  assert.equal(updated.version, 2);
  assert.deepEqual(updated.cards, [{ id: 'card_2' }]);
  assert.deepEqual(updated.decisionTrail, [
    { cardId: 'card_1', title: '하드웨어 비교', action: 'decide-now', outcome: 'topic-rewrite' }
  ]);
});
