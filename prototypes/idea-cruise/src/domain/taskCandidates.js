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
    sourceTopicTitle: entry.title ?? '관련 topic',
    model: 'Gemini 2.5 Flash-Lite',
    title: '전장 폭음 데이터셋 후보와 라이선스/라벨 구조 조사',
    purpose: '전장용 폭음 차단 모델 학습에 실제로 쓸 수 있는 공개 데이터셋 후보를 좁히고, 회의에서 바로 선택할 수 있는 근거를 만든다.',
    sourceReason: `${entry.title ?? '이 topic'}에서 학습 데이터 후보, 라벨 구조, 라이선스 확인이 필요해서 생겼습니다.`,
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

function prototypeValidationTask({ entry, meetingRecord }) {
  return {
    id: taskId(entry.id, 'validation'),
    sourceEntryId: entry.id,
    sourceTopicTitle: entry.title ?? '관련 topic',
    model: 'Gemini 2.5 Flash-Lite',
    title: '전술 헤드셋 최소 검증 실험 기준 정리',
    purpose: '소음 감소, 위험 인지 유지, 음성 보존, 지연 시간을 어떤 방식으로 확인할지 다음 회의 전에 판단 가능한 기준으로 정리한다.',
    sourceReason: `${entry.title ?? '이 topic'}에서 직접 측정해야 알 수 있는 검증 조건이 나와서 생겼습니다.`,
    outputLevel: 'test criteria',
    criteria: {
      successCriteria: '최소 실험 항목 3개 이상과 각 항목의 통과 기준을 적는다.',
      mustDo: '소음 감소, 주변음 보존, 지연 시간 중 최소 2개를 포함한다.',
      canSkip: '실제 성능 측정과 장비 구매는 이번 task 범위에서 제외한다.',
      assigneeDiscretion: '실험 장비가 없으면 대체 가능한 샘플/시뮬레이션 기준을 제안할 수 있다.',
      handoffNotes: `IDEA CRUISE topic: ${entry.text}\n\n회의록 맥락: ${meetingRecord?.body ?? '회의록 생성 전'}`,
      ambiguousCriteria: '성공 기준이 너무 높으면 MVP 검증이 지연될 수 있으므로 첫 기준은 작게 잡는다.',
      questionsForTeamLead: '위험 소리 감지와 주변음 보존 중 어떤 항목을 첫 MVP 성공 기준으로 우선할지 확인한다.'
    },
    assignee: '미배정',
    importance: '중',
    applied: false,
    reflected: false
  };
}

function speakerOutputTask({ entry, meetingRecord }) {
  return {
    id: taskId(entry.id, 'speaker'),
    sourceEntryId: entry.id,
    sourceTopicTitle: entry.title ?? '관련 topic',
    model: 'Gemini 2.5 Flash-Lite',
    title: '내부 스피커 안내 방식과 주변음 방해 기준 정리',
    purpose: '위험 정보를 사용자에게 전달하면서 팀원 목소리나 무전을 덮지 않는 출력 기준을 만든다.',
    sourceReason: `${entry.title ?? '이 topic'}에서 출력 방식이 주변음 보존과 충돌할 수 있어서 생겼습니다.`,
    outputLevel: 'decision criteria',
    criteria: {
      successCriteria: '안내음/음성/톤 중 후보 방식을 비교하고 주변음 방해 여부 기준을 적는다.',
      mustDo: '사용자가 반드시 들어야 하는 주변음 목록과 스피커 출력 제한 조건을 함께 적는다.',
      canSkip: '스피커 부품 선정과 음향 튜닝은 이번 task 범위에서 제외한다.',
      assigneeDiscretion: '예시 시나리오를 만들어 기준을 설명할 수 있다.',
      handoffNotes: `IDEA CRUISE topic: ${entry.text}\n\n회의록 맥락: ${meetingRecord?.body ?? '회의록 생성 전'}`,
      ambiguousCriteria: '위험 알림을 얼마나 자세히 들려줄지는 아직 확정되지 않았다.',
      questionsForTeamLead: '위험 알림은 음성 안내가 좋은지, 짧은 톤/방향성 알림이 좋은지 회의에서 결정한다.'
    },
    assignee: '미배정',
    importance: '중',
    applied: false,
    reflected: false
  };
}

export function generateTaskCandidates({ meetingRecord, entries = [] }) {
  const strengthenedEntries = entries.filter((entry) => (
    entry.kind === 'strengthened'
    || entry.fixed
    || hasAny(String(entry.text ?? ''), ['데이터셋', '라이선스', '라벨', '검증', '실험', '스피커', '안내'])
  ));
  const tasks = [];
  const seenTitles = new Set();

  function addTask(task) {
    if (seenTitles.has(task.title)) return;
    seenTitles.add(task.title);
    tasks.push(task);
  }

  for (const entry of strengthenedEntries) {
    const text = String(entry.text ?? '');
    const needsResearch = hasAny(text, ['데이터셋', '라이선스', '라벨', '조사', '공개 데이터']);
    const battlefieldNoise = hasAny(text, ['전장용', '폭음', '총성', '폭발음']);
    const needsValidation = hasAny(text, ['검증', '실험', '테스트', '소음 감소', '지연 시간', '성능']);
    const speakerOutput = hasAny(text, ['스피커', '안내음', '음성 안내', '출력', '들려']);

    if (battlefieldNoise && needsResearch) {
      addTask(battlefieldDatasetTask({ entry, meetingRecord }));
      continue;
    }

    if (needsResearch && hasAny(text, ['환경음', '위험 소리', '학습'])) {
      addTask(battlefieldDatasetTask({ entry: { ...entry, text: `전장용 폭음 차단. ${entry.text}` }, meetingRecord }));
    }

    if (needsValidation) {
      addTask(prototypeValidationTask({ entry, meetingRecord }));
    }

    if (speakerOutput) {
      addTask(speakerOutputTask({ entry, meetingRecord }));
    }
  }

  return tasks;
}
