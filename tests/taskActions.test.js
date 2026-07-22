import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TASK_ACTION_CALLBACK_ID,
  extractTaskActionSubmissionActionId,
  extractTaskActionSubmissionAttachments,
  extractTaskActionSubmissionAttachmentNote,
  extractTaskActionSubmissionText,
  buildTaskActionModalView,
  parseTaskActionMetadata,
  taskActionFromActionId
} from '../src/domain/taskActions.js';

test('taskActionFromActionId maps the simplified task actions', () => {
  assert.equal(taskActionFromActionId('task_complete').status, '완료');
  assert.equal(taskActionFromActionId('task_stop_today').status, '오늘은 여기까지');
  assert.equal(taskActionFromActionId('task_change_request').status, '수락');
  assert.equal(taskActionFromActionId('task_file_submission').status, '추가 진행 예정');
  assert.equal(taskActionFromActionId('task_cleanup').status, '정리됨');
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
  assert.match(changeView.blocks[1].text.text, /완료 기준이 바뀌면/);
  assert.match(changeView.blocks[2].label.text, /해야 할 일 변경/);
  assert.match(changeView.blocks[3].label.text, /확인할 것 추가\/수정/);
  assert.match(changeView.blocks[4].label.text, /완료 기준 변경 제안/);
});

test('cleanup modal lets a team member choose one of three cleanup types and explain why', () => {
  const view = buildTaskActionModalView({
    actionId: 'task_cleanup',
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon',
    taskTitle: '회의에서 이미 정리한 기준'
  });

  const cleanupTypeBlock = view.blocks.find((block) => block.block_id === 'task_cleanup_type');
  const reasonBlock = view.blocks.find((block) => block.block_id === 'task_action_input');

  assert.equal(view.title.text, '정리');
  assert.equal(cleanupTypeBlock.element.type, 'static_select');
  assert.deepEqual(cleanupTypeBlock.element.options.map((option) => option.text.text), [
    '회의에서 해결됨',
    'task로 하지 않음',
    '중복/기존 task에 흡수'
  ]);
  assert.match(reasonBlock.label.text, /정리 사유/);
  assert.match(reasonBlock.element.placeholder.text, /로드맵에 구멍이 남아도/);
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

  const labels = view.blocks.map((block) => block.label?.text).filter(Boolean).join('\n');

  assert.match(labels, /해야 할 일 변경/);
  assert.match(labels, /확인할 것 추가\/수정/);
  assert.match(labels, /완료 기준 변경 제안/);
});

test('extractTaskActionSubmissionText combines the three change fields', () => {
  const view = {
    state: {
      values: {
        task_change_why: {
          why: { value: 'ESP32 기준 비교로 좁힘' }
        },
        task_change_needed_info: {
          needed_info: { value: '가격과 전력 확인' }
        },
        task_change_done_criteria: {
          done_criteria: { value: '추천 후보 1개 제시' }
        }
      }
    }
  };

  const text = extractTaskActionSubmissionText(view, 'task_change_request');

  assert.match(text, /\[해야 할 일 변경\]/);
  assert.match(text, /ESP32 기준 비교로 좁힘/);
  assert.match(text, /\[확인할 것 추가\/수정\]/);
  assert.match(text, /가격과 전력 확인/);
  assert.match(text, /\[완료 기준 변경 제안\]/);
  assert.match(text, /추천 후보 1개 제시/);
});

test('extractTaskActionSubmissionText rejects an empty change modal', () => {
  const view = {
    state: {
      values: {
        task_change_why: {
          why: { value: '' }
        },
        task_change_needed_info: {
          needed_info: { value: '   ' }
        },
        task_change_done_criteria: {
          done_criteria: { value: '' }
        }
      }
    }
  };

  assert.equal(extractTaskActionSubmissionText(view, 'task_change_request'), '');
});

test('extractTaskActionSubmissionText records cleanup type and reason', () => {
  const view = {
    state: {
      values: {
        task_cleanup_type: {
          cleanup_type: {
            selected_option: {
              text: { text: 'task로 하지 않음' },
              value: 'not_a_task'
            }
          }
        },
        task_action_input: {
          raw_text: {
            value: '오늘 회의에서 정리한 내용이라 별도 진행 부담을 만들지 않기로 함'
          }
        }
      }
    }
  };

  const text = extractTaskActionSubmissionText(view, 'task_cleanup');

  assert.match(text, /\[정리 유형\]/);
  assert.match(text, /task로 하지 않음/);
  assert.match(text, /\[정리 사유\]/);
  assert.match(text, /별도 진행 부담/);
});
