export const TASK_ACTION_CALLBACK_ID = 'task_action_submission';
export const TASK_ACTION_INPUT_BLOCK_ID = 'task_action_input';
export const TASK_ACTION_INPUT_ACTION_ID = 'raw_text';
export const TASK_ACTION_FILE_BLOCK_ID = 'task_action_files';
export const TASK_ACTION_FILE_ACTION_ID = 'files';
export const TASK_ACTION_ATTACHMENT_NOTE_BLOCK_ID = 'task_action_attachment_note';
export const TASK_ACTION_ATTACHMENT_NOTE_ACTION_ID = 'attachment_note';

const TASK_ACTIONS = {
  task_complete: {
    actionId: 'task_complete',
    label: '완료',
    status: '완료',
    resultType: '완료',
    inputLabel: '완료 제출 결과',
    placeholder: 'Codex 결과, 직접 조사 결과, Word/그림/실험 결과를 알아볼 수 있게 요약해 주세요.',
    acceptsAttachments: true
  },
  task_stop_today: {
    actionId: 'task_stop_today',
    label: '오늘은 여기까지',
    status: '오늘은 여기까지',
    resultType: '오늘은 여기까지',
    inputLabel: '오늘의 진행 상태',
    placeholder: 'Codex 결과, 직접 진행한 내용, 남은 일, 이어서 볼 Word/그림/자료를 요약해 주세요.',
    acceptsAttachments: true
  },
  task_change_request: {
    actionId: 'task_change_request',
    label: '변경 요청',
    status: '변경 요청 중',
    resultType: '변경 요청',
    inputLabel: '변경 요청 초안',
    placeholder: 'Codex가 작성한 변경 요청 초안을 붙여넣어 주세요. 포함: [변경 제안] [주장] [근거]'
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
    },
    {
      type: 'input',
      block_id: TASK_ACTION_ATTACHMENT_NOTE_BLOCK_ID,
      optional: true,
      label: plainText('첨부 파일 설명'),
      element: {
        type: 'plain_text_input',
        action_id: TASK_ACTION_ATTACHMENT_NOTE_ACTION_ID,
        multiline: true,
        placeholder: plainText('파일을 첨부했다면 무엇을 보면 되는지, 어떤 결론/진행 상태가 담겼는지 적어 주세요.')
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
    ].concat(action.acceptsAttachments ? attachmentBlocks() : [])
  };
}

export function extractTaskActionSubmissionText(view) {
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
