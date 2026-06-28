export const MEETING_TASK_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          assigneeUserKey: { type: 'string' },
          title: { type: 'string' },
          importance: { type: 'string' },
          coordination: { type: 'string' },
          why: { type: 'string' },
          assignmentReason: { type: 'string' },
          completionCriteria: {
            type: 'array',
            items: { type: 'string' }
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' }
          },
          confidence: { type: 'string' }
        },
        required: ['assigneeUserKey', 'title', 'importance', 'coordination', 'why', 'assignmentReason', 'completionCriteria']
      }
    }
  },
  required: ['tasks']
};

export const OPENAI_MEETING_TASK_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          assigneeUserKey: { type: 'string' },
          title: { type: 'string' },
          importance: { type: 'string' },
          coordination: { type: 'string' },
          why: { type: 'string' },
          assignmentReason: { type: 'string' },
          completionCriteria: {
            type: 'array',
            items: { type: 'string' }
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' }
          },
          confidence: { type: 'string' }
        },
        required: ['assigneeUserKey', 'title', 'importance', 'coordination', 'why', 'assignmentReason', 'completionCriteria', 'dependencies', 'confidence']
      }
    }
  },
  required: ['tasks']
};

export function buildMeetingTaskExtractionInput({ meeting, users }) {
  const transcript = meeting?.summary?.transcript ?? {};
  const userKeys = users.map((user) => `${user.key}=${user.displayName}님`).join(', ');

  return [
    '너는 Subjector의 회의 기반 task 추출 엔진이다.',
    '회의 전사, Speaker 매핑, 회의 참여자의 "내가 먼저 해야 할 일" 답변을 보고 실제 수행해야 할 task 후보만 뽑는다.',
    `assigneeUserKey는 반드시 다음 key 중 하나만 사용한다: ${userKeys}`,
    '회의에서 합의되지 않은 추측성 task는 만들지 않는다.',
    '농담, 지나가는 예시, 불확실한 자문 이야기는 참여자 답변이나 회의 결정과 맞지 않으면 task로 만들지 않는다.',
    '참여자 답변은 우선순위 판단의 강한 근거로 사용한다. 답변에는 본인 일이 아닌 다른 사람의 역할/중요도 의견도 포함될 수 있다.',
    '여러 사람이 중요하다고 언급한 항목은 더 높은 우선순위로 보고, 최종 assigneeUserKey는 회의 맥락과 역할에 맞게 배정한다.',
    '다만 전사 내용과 완전히 무관한 새 업무는 만들지 않는다.',
    '각 task는 Codex가 바로 수행할 수 있도록 왜 생겼는지, 왜 그 사람 담당인지, 완료 기준을 구체적으로 적는다.',
    'importance와 coordination은 상/중/하 중 하나로 판단한다.',
    '반드시 JSON만 출력한다.',
    '',
    JSON.stringify({
      speakerMapping: meeting?.speakerMapping ?? meeting?.speaker_mapping ?? {},
      participantTaskInputs: meeting?.summary?.participantTaskInputs ?? {},
      transcript
    })
  ].join('\n');
}
