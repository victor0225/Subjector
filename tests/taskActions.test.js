import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TASK_ACTION_CALLBACK_ID,
  extractTaskActionSubmissionAttachments,
  extractTaskActionSubmissionAttachmentNote,
  buildTaskActionModalView,
  parseTaskActionMetadata,
  taskActionFromActionId
} from '../src/domain/taskActions.js';

test('taskActionFromActionId maps the three MVP task actions', () => {
  assert.equal(taskActionFromActionId('task_complete').status, '완료');
  assert.equal(taskActionFromActionId('task_stop_today').status, '오늘은 여기까지');
  assert.equal(taskActionFromActionId('task_change_request').status, '변경 요청 중');
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

  assert.match(stopView.blocks[1].label.text, /오늘의 진행 상태/);
  assert.match(changeView.blocks[1].label.text, /변경 요청 초안/);
});

test('completion and stop-for-today modals accept optional evidence files', () => {
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

  assert.equal(completeView.blocks[2].element.type, 'file_input');
  assert.equal(completeView.blocks[3].element.action_id, 'attachment_note');
  assert.equal(stopView.blocks[2].element.type, 'file_input');
  assert.equal(stopView.blocks[3].element.action_id, 'attachment_note');
  assert.equal(changeView.blocks.some((block) => block.element?.type === 'file_input'), false);
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

test('change request modal asks for the Codex draft structure', () => {
  const view = buildTaskActionModalView({
    actionId: 'task_change_request',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '센서 후보 정리'
  });

  const placeholder = view.blocks[1].element.placeholder.text;

  assert.match(placeholder, /Codex가 작성한 변경 요청 초안/);
  assert.match(placeholder, /\[변경 제안\]/);
  assert.match(placeholder, /\[주장\]/);
  assert.match(placeholder, /\[근거\]/);
});
