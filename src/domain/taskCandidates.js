let taskCounter = 0;

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function taskId(sourceEntryId, suffix) {
  taskCounter += 1;
  return `task_${sourceEntryId}_${suffix}_${taskCounter}`;
}

function battlefieldDatasetTask({ entry, meetingRecord }) {
  return {
    id: taskId(entry.id, 'dataset'),
    sourceEntryId: entry.id,
    model: 'Gemini 2.5 Flash-Lite',
    title: '전장 폭음 데이터셋 후보와 라이선스/라벨 구조 조사',
    purpose: '전장용 폭음 차단 모델 학습에 실제로 쓸 수 있는 공개 데이터셋 후보를 좁히고, 회의에서 바로 선택할 수 있는 근거를 만든다.',
    outputLevel: 'comparison table',
    criteria: {
      successCriteria: '후보 데이터셋 3개 이상에 대해 소리 종류, 라벨 구조, 라이선스, 상업/연구 사용 가능 여부, 다운로드 가능성을 비교한다.',
      mustDo: 'AudioSet, ESC-50, UrbanSound8K와 총성/폭발음 특화 후보를 최소 1개 이상 함께 확인한다.',
      canSkip: '모델 학습 실험과 성능 측정은 이번 task 범위에서 제외한다.',
      assigneeDiscretion: '후보가 부적합하면 이유를 적고 대체 후보를 추가할 수 있다.',
      handoffNotes: `IDEA CRUISE topic: ${entry.text}\n\n회의록 맥락: ${meetingRecord?.body ?? '회의록 생성 전'}`,
      ambiguousCriteria: '군용 데이터의 공개 접근성이 낮을 수 있으므로 공개 데이터로 검증 가능한 범위를 먼저 확인한다.',
      questionsForTeamLead: '전장용 범위를 총성/폭발음으로 고정할지, 차량/항공기 소음까지 포함할지 다음 회의에서 결정한다.'
    },
    assignee: '미배정',
    importance: '상',
    applied: false,
    reflected: false
  };
}

export function generateTaskCandidates({ meetingRecord, entries = [] }) {
  const strengthenedEntries = entries.filter((entry) => entry.kind === 'strengthened');
  const tasks = [];

  for (const entry of strengthenedEntries) {
    const text = String(entry.text ?? '');
    const needsResearch = hasAny(text, ['데이터셋', '라이선스', '라벨', '조사', '공개 데이터']);
    const battlefieldNoise = hasAny(text, ['전장용', '폭음', '총성', '폭발음']);

    if (battlefieldNoise && needsResearch) {
      tasks.push(battlefieldDatasetTask({ entry, meetingRecord }));
    }
  }

  return tasks;
}
