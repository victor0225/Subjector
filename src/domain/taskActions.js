export const TASK_ACTION_CALLBACK_ID = 'task_action_submission';
export const TASK_ACTION_INPUT_BLOCK_ID = 'task_action_input';
export const TASK_ACTION_INPUT_ACTION_ID = 'raw_text';
export const TASK_ACTION_FILE_BLOCK_ID = 'task_action_files';
export const TASK_ACTION_FILE_ACTION_ID = 'files';
export const TASK_ACTION_ATTACHMENT_NOTE_BLOCK_ID = 'task_action_attachment_note';
export const TASK_ACTION_ATTACHMENT_NOTE_ACTION_ID = 'attachment_note';
export const TASK_ACTION_RESULT_TYPE_BLOCK_ID = 'task_action_result_type';
export const TASK_ACTION_RESULT_TYPE_ACTION_ID = 'result_type';
export const TASK_FILE_SUBMISSION_ACTION_ID = 'task_file_submission';
export const TASK_CHANGE_WHY_BLOCK_ID = 'task_change_why';
export const TASK_CHANGE_WHY_ACTION_ID = 'why';
export const TASK_CHANGE_NEEDED_INFO_BLOCK_ID = 'task_change_needed_info';
export const TASK_CHANGE_NEEDED_INFO_ACTION_ID = 'needed_info';
export const TASK_CHANGE_DONE_CRITERIA_BLOCK_ID = 'task_change_done_criteria';
export const TASK_CHANGE_DONE_CRITERIA_ACTION_ID = 'done_criteria';
export const TASK_CLEANUP_ACTION_ID = 'task_cleanup';
export const TASK_CLEANUP_TYPE_BLOCK_ID = 'task_cleanup_type';
export const TASK_CLEANUP_TYPE_ACTION_ID = 'cleanup_type';

const TASK_ACTIONS = {
  task_complete: {
    actionId: 'task_complete',
    label: '완료',
    status: '완료',
    resultType: '완료',
    inputLabel: '완료 제출 결과',
    placeholder: 'Codex 결과나 직접 작업 결과를 알아볼 수 있게 요약해 주세요.'
  },
  task_stop_today: {
    actionId: 'task_stop_today',
    label: '오늘은 여기까지',
    status: '오늘은 여기까지',
    resultType: '오늘은 여기까지',
    inputLabel: '오늘의 진행 상태',
    placeholder: 'Codex 결과, 직접 진행한 내용, 남은 일, 다음에 이어서 볼 내용을 요약해 주세요.'
  },
  task_change_request: {
    actionId: 'task_change_request',
    label: '변경',
    status: '수락',
    resultType: '변경',
    inputLabel: '변경',
    placeholder: '완료 기준 안에서 조정할 변경 내용과 변경 이유를 적어 주세요.'
  },
  [TASK_FILE_SUBMISSION_ACTION_ID]: {
    actionId: TASK_FILE_SUBMISSION_ACTION_ID,
    label: '작업 제출',
    status: '추가 진행 예정',
    resultType: '작업 제출',
    inputLabel: '제출 내용',
    placeholder: '제출한 결과, 확인한 내용, 완료 기준 충족 여부, 남은 일을 적어 주세요. 파일을 첨부했다면 파일에서 무엇을 보면 되는지도 함께 적어 주세요.',
    acceptsAttachments: true,
    requiresAttachments: false,
    requiresResultTypeSelect: false
  },
  [TASK_CLEANUP_ACTION_ID]: {
    actionId: TASK_CLEANUP_ACTION_ID,
    label: '정리',
    status: '정리됨',
    resultType: '정리됨',
    inputLabel: '정리 사유',
    placeholder: '로드맵에 구멍이 남아도 괜찮다고 판단한 이유, 회의에서 해결된 내용, 또는 흡수된 기존 task를 적어 주세요.'
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

function attachmentBlocks() {
  return [
    {
      type: 'input',
      block_id: TASK_ACTION_FILE_BLOCK_ID,
      optional: true,
      label: plainText('첨부 파일'),
      hint: plainText('Word, PDF, 이미지 등 직접 작업 산출물을 첨부할 수 있습니다.'),
      element: {
        type: 'file_input',
        action_id: TASK_ACTION_FILE_ACTION_ID,
        max_files: 5,
        filetypes: ['docx', 'pdf', 'png', 'jpg', 'jpeg', 'pptx', 'xlsx', 'txt', 'md']
      }
    }
  ];
}

function resultTypeSelectBlock() {
  return {
    type: 'input',
    block_id: TASK_ACTION_RESULT_TYPE_BLOCK_ID,
    label: plainText('제출 종류'),
    element: {
      type: 'static_select',
      action_id: TASK_ACTION_RESULT_TYPE_ACTION_ID,
      placeholder: plainText('완료 또는 오늘은 여기까지 선택'),
      options: [
        {
          text: plainText('완료'),
          value: 'task_complete'
        },
        {
          text: plainText('오늘은 여기까지'),
          value: 'task_stop_today'
        }
      ]
    }
  };
}

function changeInputBlocks() {
  return [
    {
      type: 'section',
      text: mrkdwn('완료 기준이 바뀌면 완료 판정 기준 자체가 바뀝니다. 제출 후 현재 task 기준이 이 내용으로 갱신됩니다.')
    },
    {
      type: 'input',
      block_id: TASK_CHANGE_WHY_BLOCK_ID,
      label: plainText('해야 할 일 변경'),
      element: {
        type: 'plain_text_input',
        action_id: TASK_CHANGE_WHY_ACTION_ID,
        multiline: true,
        placeholder: plainText('이 task에서 실제로 해야 할 일을 현실에 맞게 적어 주세요.')
      }
    },
    {
      type: 'input',
      block_id: TASK_CHANGE_NEEDED_INFO_BLOCK_ID,
      label: plainText('확인할 것 추가/수정'),
      element: {
        type: 'plain_text_input',
        action_id: TASK_CHANGE_NEEDED_INFO_ACTION_ID,
        multiline: true,
        placeholder: plainText('조사, 테스트, 자료 확인처럼 착수 전에 확인해야 할 내용을 적어 주세요.')
      }
    },
    {
      type: 'input',
      block_id: TASK_CHANGE_DONE_CRITERIA_BLOCK_ID,
      label: plainText('완료 기준 변경 제안'),
      element: {
        type: 'plain_text_input',
        action_id: TASK_CHANGE_DONE_CRITERIA_ACTION_ID,
        multiline: true,
        placeholder: plainText('이 기준을 만족하면 완료라고 볼 수 있는 조건을 적어 주세요.')
      }
    }
  ];
}

function cleanupInputBlocks(action) {
  return [
    {
      type: 'section',
      text: mrkdwn('정리하면 이 task는 #in-process에서 사라지고, 기록에는 정리됨 상태와 사유가 남습니다.')
    },
    {
      type: 'input',
      block_id: TASK_CLEANUP_TYPE_BLOCK_ID,
      label: plainText('정리 유형'),
      element: {
        type: 'static_select',
        action_id: TASK_CLEANUP_TYPE_ACTION_ID,
        placeholder: plainText('정리 유형 선택'),
        options: [
          {
            text: plainText('회의에서 해결됨'),
            value: 'resolved_in_meeting'
          },
          {
            text: plainText('task로 하지 않음'),
            value: 'not_a_task'
          },
          {
            text: plainText('중복/기존 task에 흡수'),
            value: 'merged_into_existing_task'
          }
        ]
      }
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
  ];
}

function normalizeFile(file) {
  return {
    id: file.id,
    name: file.name,
    mimetype: file.mimetype,
    filetype: file.filetype,
    size: file.size
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
    blocks: actionId === 'task_change_request' ? [
      {
        type: 'section',
        text: mrkdwn(`*${taskTitle}*`)
      }
    ].concat(changeInputBlocks()) : actionId === TASK_CLEANUP_ACTION_ID ? [
      {
        type: 'section',
        text: mrkdwn(`*${taskTitle}*`)
      }
    ].concat(cleanupInputBlocks(action)) : [
      {
        type: 'section',
        text: mrkdwn(`*${taskTitle}*`)
      }
    ].concat(action.requiresResultTypeSelect ? [resultTypeSelectBlock()] : []).concat([
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
    ]).concat(action.acceptsAttachments ? attachmentBlocks() : [])
  };
}

function inputValue(view, blockId, actionId) {
  return (view.state.values?.[blockId]?.[actionId]?.value ?? '').trim();
}

export function extractTaskActionSubmissionText(view, actionId = null) {
  if (actionId === 'task_change_request') {
    const why = inputValue(view, TASK_CHANGE_WHY_BLOCK_ID, TASK_CHANGE_WHY_ACTION_ID);
    const neededInfo = inputValue(view, TASK_CHANGE_NEEDED_INFO_BLOCK_ID, TASK_CHANGE_NEEDED_INFO_ACTION_ID);
    const doneCriteria = inputValue(view, TASK_CHANGE_DONE_CRITERIA_BLOCK_ID, TASK_CHANGE_DONE_CRITERIA_ACTION_ID);
    if (!why && !neededInfo && !doneCriteria) {
      return '';
    }

    return [
      '[해야 할 일 변경]',
      why,
      '',
      '[확인할 것 추가/수정]',
      neededInfo,
      '',
      '[완료 기준 변경 제안]',
      doneCriteria
    ].join('\n').trim();
  }

  if (actionId === TASK_CLEANUP_ACTION_ID) {
    const selectedOption = view.state.values?.[TASK_CLEANUP_TYPE_BLOCK_ID]?.[TASK_CLEANUP_TYPE_ACTION_ID]?.selected_option;
    const cleanupType = selectedOption?.text?.text || selectedOption?.value || '';
    const reason = inputValue(view, TASK_ACTION_INPUT_BLOCK_ID, TASK_ACTION_INPUT_ACTION_ID);
    if (!cleanupType || !reason) {
      return '';
    }

    return [
      '[정리 유형]',
      cleanupType,
      '',
      '[정리 사유]',
      reason
    ].join('\n').trim();
  }

  return view.state.values[TASK_ACTION_INPUT_BLOCK_ID][TASK_ACTION_INPUT_ACTION_ID].value.trim();
}

export function extractTaskActionSubmissionAttachments(view) {
  const fileInput = view.state.values?.[TASK_ACTION_FILE_BLOCK_ID]?.[TASK_ACTION_FILE_ACTION_ID];
  const files = fileInput?.files ?? fileInput?.selected_files ?? [];
  return files.map(normalizeFile);
}

export function extractTaskActionSubmissionAttachmentNote(view) {
  return (view.state.values?.[TASK_ACTION_ATTACHMENT_NOTE_BLOCK_ID]?.[TASK_ACTION_ATTACHMENT_NOTE_ACTION_ID]?.value ?? '').trim();
}

export function extractTaskActionSubmissionActionId(view, fallbackActionId) {
  return fallbackActionId;
}
