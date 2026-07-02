import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TASK_ACTION_CALLBACK_ID,
  extractTaskActionSubmissionActionId,
  extractTaskActionSubmissionAttachments,
  extractTaskActionSubmissionAttachmentNote,
  buildTaskActionModalView,
  parseTaskActionMetadata,
  taskActionFromActionId
} from '../src/domain/taskActions.js';

test('taskActionFromActionId maps the simplified task actions', () => {
  assert.equal(taskActionFromActionId('task_complete').status, '완료');
  assert.equal(taskActionFromActionId('task_stop_today').status, '오늘은 여기까지');
  assert.equal(taskActionFromActionId('task_change_request').status, '변경 요청 중');
  assert.equal(taskActionFromActionId('task_file_submission').status, '추가 진행 예정');
  assert.equal(taskActionFromActionId('unknown'), null);
});

test('buildTaskActionModalView builds a Slack modal with private metadata', () => {
  const view = buildTaskActionModalView({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });

  assert.equal(view.type, 'modal');
  assert.equal(view.callback_id, TASK_ACTION_CALLBACK_ID);
  assert.equal(view.title.text, '완료');
  assert.equal(view.submit.text, '제출');
  assert.match(view.blocks[0].text.text, /센서 후보 정리/);

  const metadata = parseTaskActionMetadata(view.private_metadata);
  assert.equal(metadata.actionId, 'task_complete');
  assert.equal(metadata.taskId, 'task-1');
  assert.equal(metadata.assigneeUserKey, 'suhyeon');
});

test('buildTaskActionModalView customizes prompt labels for each action', () => {
  const submitView = buildTaskActionModalView({
    actionId: 'task_file_submission',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });
  const changeView = buildTaskActionModalView({
    actionId: 'task_change_request',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });

  assert.match(submitView.blocks[1].label.text, /제출 내용/);
  assert.match(changeView.blocks[1].label.text, /^변경$/);
});

test('completion and stop-for-today modals stay text-only so empty attachments do not block submit', () => {
  const completeView = buildTaskActionModalView({
    actionId: 'task_complete',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });
  const stopView = buildTaskActionModalView({
    actionId: 'task_stop_today',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });
  const changeView = buildTaskActionModalView({
    actionId: 'task_change_request',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });

  assert.equal(completeView.blocks.some((block) => block.element?.type === 'file_input'), false);
  assert.equal(stopView.blocks.some((block) => block.element?.type === 'file_input'), false);
  assert.equal(changeView.blocks.some((block) => block.element?.type === 'file_input'), false);
});

test('work submission modal accepts text and optional files without result type select', () => {
  const view = buildTaskActionModalView({
    actionId: 'task_file_submission',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });

  assert.equal(view.title.text, '작업 제출');
  assert.equal(view.blocks.some((block) => block.element?.type === 'static_select'), false);
  assert.equal(view.blocks[1].element.action_id, 'raw_text');
  assert.equal(view.blocks[2].element.type, 'file_input');
  assert.equal(view.blocks[2].optional, true);
  assert.equal(view.blocks.some((block) => block.element?.action_id === 'attachment_note'), false);
});

test('extractTaskActionSubmissionAttachments reads Slack file input state', () => {
  const view = {
    state: {
      values: {
        task_action_files: {
          files: {
            files: [
              {
                id: 'F1',
                name: '정리.docx',
                mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filetype: 'docx',
                size: 12000
              }
            ]
          }
        },
        task_action_attachment_note: {
          attachment_note: {
            value: 'Word 파일에 비교표를 정리했습니다.'
          }
        }
      }
    }
  };

  assert.deepEqual(extractTaskActionSubmissionAttachments(view), [
    {
      id: 'F1',
      name: '정리.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filetype: 'docx',
      size: 12000
    }
  ]);
  assert.equal(extractTaskActionSubmissionAttachmentNote(view), 'Word 파일에 비교표를 정리했습니다.');
});

test('extractTaskActionSubmissionActionId keeps work submissions as work submissions', () => {
  const view = {
    state: {
      values: {
        task_action_result_type: {
          result_type: {
            selected_option: {
              value: 'task_stop_today'
            }
          }
        }
      }
    }
  };

  assert.equal(extractTaskActionSubmissionActionId(view, 'task_file_submission'), 'task_file_submission');
  assert.equal(extractTaskActionSubmissionActionId(view, 'task_complete'), 'task_complete');
});

test('change modal asks for bounded task adjustment', () => {
  const view = buildTaskActionModalView({
    actionId: 'task_change_request',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });

  const placeholder = view.blocks[1].element.placeholder.text;

  assert.match(placeholder, /완료 기준 안에서/);
  assert.match(placeholder, /변경 내용/);
  assert.match(placeholder, /변경 이유/);
});
