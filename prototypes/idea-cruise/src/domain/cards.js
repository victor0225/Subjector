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
    choiceLabel: options.choiceLabel ?? null,
    impact: options.impact ?? '',
    affectedTopics: options.affectedTopics ?? [],
    childTopics: options.childTopics ?? []
  };
}

function broadTopicScore(text) {
  return [
    ['마이크', '환경음', '주변음', '음성', '무전'],
    ['스피커', '출력', '안내'],
    ['데이터', '데이터셋', '학습', '라벨'],
    ['하드웨어', '보드', '라즈베리', 'ESP32', 'Seeed'],
    ['검증', '실험', '테스트', '성능']
  ].filter((terms) => includesAny(text, terms)).length;
}

function topicSplitCard(entry, text) {
  return card(
    `${entry.id}_card_split_functional`,
    'topic-split',
    '기능별 topic 분리 제안',
    '이 topic에는 입력, 출력, 데이터, 검증이 섞여 있습니다. 먼저 기능별 초안으로 나누면 회의 중 어떤 부분이 고정됐고 어떤 부분이 아직 열려 있는지 더 잘 보입니다.',
    '전술 헤드셋은 입력, 출력, 데이터, 검증 topic으로 나누어 계획한다. 각 topic은 회의 중 별도로 고정하거나 변경한다.',
    {
      priority: 'primary',
      action: 'split-topic',
      outcome: 'topic-split',
      choiceLabel: '기능별 topic 생성',
      impact: '현재 topic은 parent로 유지하고, child topic들이 root로 연결됩니다. 각 child topic에는 AI 초안 내용만 들어가며 카드는 클릭/분석 시 생성됩니다.',
      childTopics: [
        {
          title: '마이크 (환경음)',
          text: '총성, 폭발음, 장비 충격음처럼 줄이거나 감지해야 하는 외부 위험 소리를 다룬다. 첫 MVP에서는 총성/폭발음 중심으로 좁힌다.'
        },
        {
          title: '마이크 (주변음)',
          text: '팀원 목소리, 무전, 경고음처럼 사용자가 놓치면 안 되는 주변 정보를 다룬다. 환경음 차단과 충돌하지 않도록 보존 기준을 정한다.'
        },
        {
          title: '내부 스피커',
          text: '차단되거나 줄어든 위험 정보를 사용자에게 어떤 방식으로 다시 전달할지 정한다. 안내음이 주변음 인지를 방해하지 않아야 한다.'
        },
        {
          title: '학습 데이터',
          text: '환경음 감지와 분류에 필요한 공개 데이터셋 후보, 라벨 구조, 라이선스를 확인한다.'
        },
        {
          title: '검증 실험',
          text: '소음 감소, 위험 인지 유지, 음성 보존, 지연 시간을 확인할 최소 실험 기준을 정한다.'
        }
      ],
      explanation: includesAny(text, ['전술', '헤드셋'])
        ? '전술 헤드셋처럼 넓은 topic은 기능별 초안을 먼저 보는 편이 결정에 신중해집니다.'
        : ''
    }
  );
}

function fixedConflictCards({ entry, entries }) {
  const text = String(entry?.text ?? '');
  const fixedBattlefield = entries.find((candidate) => (
    candidate.id !== entry.id
    && candidate.fixed
    && includesAny(String(candidate.text ?? ''), ['전장', '전술', '군용', '폭음', '총성', '폭발음'])
  ));

  if (!fixedBattlefield || !includesAny(text, ['공사현장', '건설', '장비 소음', '산업'])) {
    return [];
  }

  return [card(
    `${entry.id}_card_fixed_conflict`,
    'source-conflict',
    '고정 topic과 충돌',
    `고정된 “${fixedBattlefield.title ?? '전장용 topic'}”은 전장용 폭음 차단을 기준으로 삼고 있는데, 현재 topic에는 공사현장/산업 소음 기준이 섞여 있습니다. 별도 topic으로 분리하거나 현재 topic에서 제외하는 편이 좋습니다.`,
    text,
    {
      priority: 'primary',
      action: 'resolve-conflict',
      outcome: 'context',
      choiceLabel: '충돌 확인',
      impact: `영향 topic: ${fixedBattlefield.title ?? fixedBattlefield.text}`,
      affectedTopics: [fixedBattlefield.id]
    }
  )];
}

export function generateCardsForEntry({ entry, existingTasks = [], entries = [] }) {
  const text = String(entry?.text ?? '');
  const cards = [...fixedConflictCards({ entry, entries })];

  if (cards.length === 0 && broadTopicScore(text) >= 3) {
    cards.push(topicSplitCard(entry, text));
  }

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
        choiceLabel: '전장용 선택',
        impact: '고정 전에는 목표 환경을 먼저 좁히는 카드가 우선입니다. 고정 후에는 이 기준과 충돌하는 topic만 경고합니다.'
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
        choiceLabel: 'task 후보로 남기기',
        impact: 'task 후보 패널에 “이 topic에서 데이터셋 확인이 필요해서 생김”이라는 맥락으로 표시됩니다.'
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
        choiceLabel: '이번 topic에서 제외',
        impact: '공사현장 방향은 별도 topic으로 분리하면 고정된 전장용 계획과 충돌하지 않습니다.'
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
        choiceLabel: '판단 기준 고정',
        impact: '하드웨어 topic의 기준을 고정하면 데이터 처리량, 전력, 개발 속도 task가 더 선명해집니다.'
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
        choiceLabel: 'source 고정',
        impact: 'Subjector는 승인된 task 운영판으로 남고, IDEA CRUISE가 회의 기반 task source가 됩니다.'
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
        choiceLabel: '기준 먼저 정하기',
        impact: '판단 기준이 고정되면 이후 카드는 그 기준을 존중하고 충돌할 때만 경고합니다.'
      }
    ));
  }

  return cards.sort((a, b) => {
    if (a.priority === b.priority) return 0;
    return a.priority === 'primary' ? -1 : 1;
  });
}
