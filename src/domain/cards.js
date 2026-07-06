function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function card(id, type, title, body, improvedText, options = {}) {
  return {
    id,
    type,
    title,
    body,
    improvedText,
    model: options.model ?? 'gpt-5.4',
    priority: options.priority ?? 'secondary',
    action: options.action ?? 'clarify',
    outcome: options.outcome ?? 'context',
    explanation: options.explanation ?? '',
    choiceLabel: options.choiceLabel ?? null
  };
}

export function generateCardsForEntry({ entry, existingTasks = [] }) {
  const text = String(entry?.text ?? '');
  const cards = [];

  if (includesAny(text, ['전장', '군용', '폭음', '총성', '폭발음']) && includesAny(text, ['데이터', '학습', '막아', '차단', '헤드셋'])) {
    cards.push(card(
      `${entry.id}_card_battlefield_scope`,
      'decision-branch',
      '목표 환경을 먼저 고정',
      '지금 가장 먼저 정해야 할 것은 “전장용 폭음 차단”인지 “공사현장 소음 저감”인지입니다. 두 환경은 소리 종류, 안전 기준, 데이터셋, 테스트 방식이 달라서 동시에 잡으면 task가 흐려집니다.',
      '전장용 폭음 차단을 목표로 한다. 우선 총성/폭발음 같은 충격성 소음을 대상으로 하고, 공사현장 소음 저감은 이번 topic에서는 제외한다.',
      {
        priority: 'primary',
        action: 'decide-now',
        outcome: 'topic-rewrite',
        choiceLabel: '전장용 선택'
      }
    ));
    cards.push(card(
      `${entry.id}_card_dataset_task`,
      'research-task',
      '데이터셋 조사는 task 후보',
      'AudioSet, ESC-50, UrbanSound8K, 총성/폭발음 특화 공개 데이터셋은 라벨 구조와 라이선스가 다릅니다. 실제 학습에 쓸 수 있는지 확인하려면 자료조사 시간이 필요하므로 task 후보로 남기는 편이 좋습니다.',
      '전장용 폭음 차단을 목표로 한다. 공개 데이터셋 후보와 라이선스, 라벨 구조는 별도 조사한다.',
      {
        action: 'make-task',
        outcome: 'task-candidate',
        explanation: '즉석 결정이 아니라 자료조사 시간이 필요한 독립 산출물입니다.',
        choiceLabel: 'task 후보로 남기기'
      }
    ));
    cards.push(card(
      `${entry.id}_card_defer_site`,
      'defer-scope',
      '공사현장 방향은 지금 제외',
      `현재 진행 중인 ${existingTasks[0] ?? '기존 헤드셋 관련 task'}와 겹칠 수 있습니다. 전장용을 고르면 공사현장용 데이터/요구사항은 별도 topic에서 다루는 편이 충돌이 적습니다.`,
      '전장용 폭음 차단을 목표로 한다. 공사현장 소음 저감은 별도 topic에서 비교한다.',
      {
        action: 'defer',
        outcome: 'context',
        explanation: '이번 주제의 초점을 좁히기 위한 제외 카드입니다.',
        choiceLabel: '이번 topic에서 제외'
      }
    ));
  }

  if (includesAny(text, ['라즈베리', 'Raspberry', 'ESP32']) && includesAny(text, ['모르', '차이', '비교'])) {
    cards.push(card(
      `${entry.id}_card_compare`,
      'concept-comparison',
      '하드웨어 비교',
      'Raspberry Pi는 Linux, Python, 카메라, AI 처리에 유리합니다. ESP32는 저전력 센서 제어, BLE/Wi-Fi, 간단한 임베디드 제어에 유리합니다.',
      'Raspberry Pi는 카메라/AI 처리 후보이고, ESP32는 저전력 센서 제어 후보이다. 이 task가 로컬 처리인지 저전력 제어인지 먼저 결정한다.',
      {
        priority: cards.length === 0 ? 'primary' : 'secondary',
        action: 'decide-now',
        outcome: 'topic-rewrite',
        choiceLabel: '판단 기준 고정'
      }
    ));
  }

  if (includesAny(text, ['Subjector', 'subjector']) && includesAny(text, ['회의 결과록', 'task', '태스크'])) {
    cards.push(card(
      `${entry.id}_card_source`,
      'source-conflict',
      'Task source 충돌',
      `Subjector가 회의 결과록을 보고 task를 만들면 IDEA CRUISE와 task source가 중복됩니다. 현재 진행 중인 ${existingTasks[0] ?? 'Subjector in-process'} 흐름과도 충돌될 수 있습니다.`,
      'IDEA CRUISE만 회의 기반 task를 생성하고, Subjector는 승인된 task를 각 담당자의 in-process에 반영한다.',
      {
        priority: cards.length === 0 ? 'primary' : 'secondary',
        action: 'decide-now',
        outcome: 'topic-rewrite',
        choiceLabel: 'source 고정'
      }
    ));
  }

  if (cards.length === 0 && includesAny(text, ['모르', '애매', '판단'])) {
    cards.push(card(
      `${entry.id}_card_question`,
      'clarifying-question',
      '판단 기준 확인',
      '이 불확실성이 회의 결정에 필요한 정보인지 확인해야 합니다. 필요하다면 비교 기준을 먼저 세우세요.',
      `${text} 이 항목은 회의 결정에 필요한 기준을 먼저 정한 뒤 판단한다.`,
      {
        priority: 'primary',
        action: 'decide-now',
        outcome: 'topic-rewrite',
        choiceLabel: '기준 먼저 정하기'
      }
    ));
  }

  return cards.sort((a, b) => {
    if (a.priority === b.priority) return 0;
    return a.priority === 'primary' ? -1 : 1;
  });
}
