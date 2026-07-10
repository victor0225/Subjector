let entryCounter = 0;

function nowIso() {
  return new Date().toISOString();
}

function inferTitle(text) {
  const normalized = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '새 topic';
  const firstLine = normalized.split(/[.?!\n]/)[0].trim();
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}...` : firstLine;
}

export function createEntry({
  id = null,
  title = null,
  text,
  mode = 'live',
  kind = 'raw',
  cards = [],
  parentId = null,
  fixed = false
}) {
  entryCounter += 1;
  const timestamp = nowIso();
  const normalizedText = String(text ?? '').trim();

  return {
    id: id ?? `entry_${entryCounter}`,
    title: String(title ?? inferTitle(normalizedText)).trim(),
    text: normalizedText,
    parentId,
    fixed,
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
    text: entry.fixed
      ? entry.text
      : String(improvedText ?? selectedCard?.improvedText ?? entry.text).trim(),
    kind: 'strengthened',
    version: Number(entry.version ?? 1) + 1,
    decisionTrail,
    cards: (entry.cards ?? []).filter((card) => card.id !== cardId),
    updatedAt: nowIso()
  };
}

export function updateEntry({ entry, title, text }) {
  if (entry.fixed) {
    return entry;
  }

  return {
    ...entry,
    title: String(title ?? entry.title).trim(),
    text: String(text ?? entry.text).trim(),
    version: Number(entry.version ?? 1) + 1,
    updatedAt: nowIso()
  };
}

export function toggleEntryFixed({ entry }) {
  return {
    ...entry,
    fixed: !entry.fixed,
    updatedAt: nowIso()
  };
}
