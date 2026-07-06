let entryCounter = 0;

function nowIso() {
  return new Date().toISOString();
}

export function createEntry({ id = null, text, mode = 'live', kind = 'raw', cards = [] }) {
  entryCounter += 1;
  const timestamp = nowIso();

  return {
    id: id ?? `entry_${entryCounter}`,
    text: String(text ?? '').trim(),
    mode,
    kind,
    version: 1,
    cards,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function applyCardToEntry({ entry, cardId, improvedText }) {
  const selectedCard = (entry.cards ?? []).find((card) => card.id === cardId);
  const decisionTrail = [
    ...(entry.decisionTrail ?? []),
    selectedCard
      ? {
          cardId: selectedCard.id,
          title: selectedCard.title,
          action: selectedCard.action,
          outcome: selectedCard.outcome
        }
      : { cardId, title: 'Unknown card', action: 'unknown', outcome: 'context' }
  ];

  return {
    ...entry,
    text: String(improvedText ?? selectedCard?.improvedText ?? entry.text).trim(),
    kind: 'strengthened',
    version: Number(entry.version ?? 1) + 1,
    decisionTrail,
    cards: (entry.cards ?? []).filter((card) => card.id !== cardId),
    updatedAt: nowIso()
  };
}
