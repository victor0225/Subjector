function mrkdwn(text) {
  return {
    type: 'mrkdwn',
    text
  };
}

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true
  };
}

function approvalValue({ sourceChannelId, sourceMessageTs }) {
  return JSON.stringify({
    sourceChannelId,
    sourceMessageTs
  });
}

export const MEETING_PARTICIPANT_INPUT_CALLBACK_ID = 'meeting_participant_task_input_submission';
export const MEETING_CANDIDATE_EDIT_CALLBACK_ID = 'meeting_candidate_edit_submission';

const PARTICIPANT_TASK_INPUT_BLOCK_ID = 'meeting_participant_task_input';
const PARTICIPANT_TASK_INPUT_ACTION_ID = 'raw_text';
const CANDIDATE_TITLE_BLOCK_ID = 'meeting_candidate_title';
const CANDIDATE_WHY_BLOCK_ID = 'meeting_candidate_why';
const CANDIDATE_COMPLETION_BLOCK_ID = 'meeting_candidate_completion';

function meetingValue(value) {
  return JSON.stringify(value);
}

function taskContextText(task) {
  const context = task.context ?? {};
  const criteria = Array.isArray(context.completionCriteria)
    ? context.completionCriteria.filter(Boolean).join(', ')
    : '';

  return [
    `*${task.title}*`,
    `- 중요도: ${task.importance} / 조율: ${task.coordination}`,
    context.why ? `- 왜: ${context.why}` : null,
    context.assignmentReason ? `- 담당 근거: ${context.assignmentReason}` : null,
    criteria ? `- 완료 기준: ${criteria}` : null
  ].filter(Boolean).join('\n');
}

export function buildMeetingTaskApprovalBlocks({ text, sourceChannelId, sourceMessageTs }) {
  return [
    {
      type: 'section',
      text: mrkdwn(text)
    },
    {
      type: 'actions',
      block_id: 'meeting_task_approval_actions',
      elements: [
        {
          type: 'button',
          action_id: 'meeting_approve_tasks',
          text: plainText('승인하고 #in-process 반영'),
          value: approvalValue({ sourceChannelId, sourceMessageTs }),
          style: 'primary'
        }
      ]
    }
  ];
}

export function buildMeetingParticipantInputBlocks({ text, sourceChannelId, sourceMessageTs, userKey }) {
  return [
    {
      type: 'section',
      text: mrkdwn(text)
    },
    {
      type: 'actions',
      block_id: 'meeting_participant_task_input_actions',
      elements: [
        {
          type: 'button',
          action_id: 'meeting_participant_task_input',
          text: plainText('먼저 할 일 입력'),
          value: meetingValue({ sourceChannelId, sourceMessageTs, userKey }),
          style: 'primary'
        }
      ]
    }
  ];
}

export function buildMeetingParticipantSkipBlocks({ text, sourceChannelId, sourceMessageTs }) {
  return [
    {
      type: 'section',
      text: mrkdwn(text)
    },
    {
      type: 'actions',
      block_id: 'meeting_participant_skip_actions',
      elements: [
        {
          type: 'button',
          action_id: 'meeting_participant_skip_waiting',
          text: plainText('테스트용: 현재 답변만으로 진행'),
          value: meetingValue({ sourceChannelId, sourceMessageTs }),
          style: 'primary'
        }
      ]
    }
  ];
}

export function buildMeetingParticipantInputModal({ metadata }) {
  return {
    type: 'modal',
    callback_id: MEETING_PARTICIPANT_INPUT_CALLBACK_ID,
    title: plainText('먼저 할 일 입력'),
    submit: plainText('저장'),
    close: plainText('취소'),
    private_metadata: meetingValue(metadata),
    blocks: [
      {
        type: 'input',
        block_id: PARTICIPANT_TASK_INPUT_BLOCK_ID,
        label: plainText('이번 회의 후 내가 먼저 해야 할 일'),
        element: {
          type: 'plain_text_input',
          action_id: PARTICIPANT_TASK_INPUT_ACTION_ID,
          multiline: true,
          placeholder: plainText('예: 나는 센서 후보 3개를 비교하고, 오늘은 ESP32 기준으로 연결 가능성을 먼저 확인하겠다.')
        }
      }
    ]
  };
}

export function extractMeetingParticipantInputSubmission(view) {
  return view?.state?.values?.[PARTICIPANT_TASK_INPUT_BLOCK_ID]?.[PARTICIPANT_TASK_INPUT_ACTION_ID]?.value?.trim() ?? '';
}

export function buildMeetingCandidateReviewBlocks({ text, taskCandidates, sourceChannelId, sourceMessageTs, assigneeUserKey }) {
  const blocks = [
    {
      type: 'section',
      text: mrkdwn(text)
    }
  ];

  for (const [index, task] of taskCandidates.entries()) {
    blocks.push({
      type: 'section',
      text: mrkdwn(`${index + 1}. ${taskContextText(task)}`)
    });
    blocks.push({
      type: 'actions',
      block_id: `meeting_candidate_review_${index}`,
      elements: [
        {
          type: 'button',
          action_id: 'meeting_candidate_accept',
          text: plainText('채택'),
          value: meetingValue({ sourceChannelId, sourceMessageTs, candidateIndex: task.candidateIndex ?? index, assigneeUserKey }),
          style: 'primary'
        },
        {
          type: 'button',
          action_id: 'meeting_candidate_reject',
          text: plainText('제외'),
          value: meetingValue({ sourceChannelId, sourceMessageTs, candidateIndex: task.candidateIndex ?? index, assigneeUserKey }),
          style: 'danger'
        },
        {
          type: 'button',
          action_id: 'meeting_candidate_edit',
          text: plainText('수정'),
          value: meetingValue({ sourceChannelId, sourceMessageTs, candidateIndex: task.candidateIndex ?? index, assigneeUserKey })
        }
      ]
    });
  }

  return blocks;
}

export function buildMeetingCandidateEditModal({ metadata, taskCandidate }) {
  const context = taskCandidate.context ?? {};
  const criteria = Array.isArray(context.completionCriteria)
    ? context.completionCriteria.join('\n')
    : '';

  return {
    type: 'modal',
    callback_id: MEETING_CANDIDATE_EDIT_CALLBACK_ID,
    title: plainText('task 후보 수정'),
    submit: plainText('수정해서 반영'),
    close: plainText('취소'),
    private_metadata: meetingValue(metadata),
    blocks: [
      {
        type: 'input',
        block_id: CANDIDATE_TITLE_BLOCK_ID,
        label: plainText('task 이름'),
        element: {
          type: 'plain_text_input',
          action_id: 'title',
          initial_value: taskCandidate.title
        }
      },
      {
        type: 'input',
        block_id: CANDIDATE_WHY_BLOCK_ID,
        label: plainText('왜 해야 하는지'),
        element: {
          type: 'plain_text_input',
          action_id: 'why',
          multiline: true,
          initial_value: context.why || context.assignmentReason || '회의에서 나온 결정/우선순위에 따른 task입니다.'
        }
      },
      {
        type: 'input',
        block_id: CANDIDATE_COMPLETION_BLOCK_ID,
        label: plainText('완료 기준'),
        element: {
          type: 'plain_text_input',
          action_id: 'completionCriteria',
          multiline: true,
          initial_value: criteria || '결과를 완료 제출 템플릿으로 정리한다.'
        }
      }
    ]
  };
}

export function extractMeetingCandidateEditSubmission(view) {
  const values = view?.state?.values ?? {};
  const title = values[CANDIDATE_TITLE_BLOCK_ID]?.title?.value?.trim() ?? '';
  const why = values[CANDIDATE_WHY_BLOCK_ID]?.why?.value?.trim() ?? '';
  const completionCriteria = values[CANDIDATE_COMPLETION_BLOCK_ID]?.completionCriteria?.value
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean) ?? [];

  return {
    title,
    why,
    completionCriteria
  };
}
