import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleDirectDmMessage,
  handleTaskActionButton,
  handleTaskActionViewSubmission
} from '../src/slack/app.js';

const config = {
  leadUserKey: 'suhyeon',
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' }
  ]
};

test('handleDirectDmMessage updates #in-process for 출근 commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '출근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleStartWork(input) {
        serviceCalls.push(input);
        return {
          action: 'posted',
          taskCount: 0,
          dmText: '수현님, 출근 확인했습니다. #in-process에 오늘 task 영역을 만들었습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /#in-process/);
  assert.match(replies[0].text, /만들었습니다/);
});

test('handleDirectDmMessage reports #in-process update failures to the user', async () => {
  const replies = [];
  const errors = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '출근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error(error) { errors.push(error); } },
    inProcessService: {
      async handleStartWork() {
        throw new Error('Slack post failed');
      }
    }
  });

  assert.equal(errors.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /#in-process 업데이트에 실패했습니다/);
  assert.match(replies[0].text, /Render 로그/);
});

test('handleTaskActionButton opens the matching Slack modal', async () => {
  let acked = false;
  const opened = [];

  await handleTaskActionButton({
    ack: async () => { acked = true; },
    body: {
      trigger_id: 'trigger-1',
      actions: [
        {
          action_id: 'task_complete',
          value: JSON.stringify({
            actionId: 'task_complete',
            taskId: 'task-1',
            assigneeUserKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      views: {
        open: async (input) => opened.push(input)
      }
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async getTaskTitle() {
        return '센서 후보 정리';
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].trigger_id, 'trigger-1');
  assert.equal(opened[0].view.callback_id, 'task_action_submission');
  assert.match(opened[0].view.blocks[0].text.text, /센서 후보 정리/);
});

test('handleTaskActionViewSubmission stores modal input through the in-process service', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_complete',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '[완료 제출 결과]'
            }
          }
        }
      }
    },
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        serviceCalls.push(input);
        return {
          status: '완료',
          responseText: '수현님, task 상태를 완료로 변경했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].submittedByUserKey, 'suhyeon');
  assert.equal(serviceCalls[0].rawText, '[완료 제출 결과]');
});
