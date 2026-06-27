export const TASK_ACTION_CALLBACK_ID = 'task_action_submission';
export const TASK_ACTION_INPUT_BLOCK_ID = 'task_action_input';
export const TASK_ACTION_INPUT_ACTION_ID = 'raw_text';

const TASK_ACTIONS = {
  task_complete: {
    actionId: 'task_complete',
    label: '완료',
    status: '완료',
    resultType: '완료',
    inputLabel: 'Codex 완료 제출 결과',
    placeholder: 'Codex에서 "완료 제출 결과 작성해줘"를 실행한 결과를 붙여넣어 주세요.'
  },
  task_stop_today: {
    actionId: 'task_stop_today',
    label: '오늘은 여기까지',
    status: '오늘은 여기까지',
    resultType: '오늘은 여기까지',
    inputLabel: 'Codex 오늘의 진행 상태',
    placeholder: 'Codex에서 "오늘은 여기까지"를 실행한 결과를 붙여넣어 주세요.'
  },
  task_change_request: {
    actionId: 'task_change_request',
    label: '변경 요청',
    status: '변경 요청 중',
    resultType: '변경 요청',
    inputLabel: '변경 요청 초안',
    placeholder: 'Codex가 작성한 변경 요청 초안, 주장, 근거를 붙여넣어 주세요.'
  }
};

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true
  };
}

function mrkdwn(text) {
  return {
    type: 'mrkdwn',
    text
  };
}

export function taskActionFromActionId(actionId) {
  return TASK_ACTIONS[actionId] ?? null;
}

export function buildTaskActionValue({ actionId, taskId, assigneeUserKey }) {
  return JSON.stringify({
    actionId,
    taskId,
    assigneeUserKey
  });
}

export function parseTaskActionMetadata(raw) {
  return JSON.parse(raw);
}

export function buildTaskActionModalView({ actionId, taskId, assigneeUserKey, taskTitle }) {
  const action = taskActionFromActionId(actionId);
  if (!action) {
    throw new Error(`Unknown task action: ${actionId}`);
  }

  return {
    type: 'modal',
    callback_id: TASK_ACTION_CALLBACK_ID,
    private_metadata: buildTaskActionValue({ actionId, taskId, assigneeUserKey }),
    title: plainText(action.label),
    submit: plainText('제출'),
    close: plainText('취소'),
    blocks: [
      {
        type: 'section',
        text: mrkdwn(`*${taskTitle}*`)
      },
      {
        type: 'input',
        block_id: TASK_ACTION_INPUT_BLOCK_ID,
        label: plainText(action.inputLabel),
        element: {
          type: 'plain_text_input',
          action_id: TASK_ACTION_INPUT_ACTION_ID,
          multiline: true,
          placeholder: plainText(action.placeholder)
        }
      }
    ]
  };
}

export function extractTaskActionSubmissionText(view) {
  return view.state.values[TASK_ACTION_INPUT_BLOCK_ID][TASK_ACTION_INPUT_ACTION_ID].value.trim();
}
