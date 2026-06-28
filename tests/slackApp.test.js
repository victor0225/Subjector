import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleDirectDmMessage,
  handleCodexPromptCopyButton,
  handleFinalsApproveButton,
  handleTaskAcceptButton,
  handleTaskActionButton,
  handleTaskActionViewSubmission
} from '../src/slack/app.js';

const config = {
  leadUserKey: 'suhyeon',
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' }
  ]
};

const teamConfig = {
  leadUserKey: 'suhyeon',
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' },
    { key: 'joeun', slackId: 'U2', fullName: '김조은', displayName: '조은' },
    { key: 'minsung', slackId: 'U3', fullName: '배민성', displayName: '민성' }
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

test('handleDirectDmMessage sends a daily summary for 퇴근 commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '퇴근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleEndWork(input) {
        serviceCalls.push(input);
        return {
          dmText: '수현님, 오늘 한 일 요약입니다.\n- 센서 후보 정리'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /오늘 한 일 요약/);
});

test('handleDirectDmMessage sends an automatic finals preview to the lead after everyone ends work', async () => {
  const replies = [];
  const openedDms = [];
  const postedMessages = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U3',
      text: '퇴근'
    },
    say: async (payload) => replies.push(payload),
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: 'D_LEAD' } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleEndWork(input) {
        return {
          dmText: `${input.user.displayName}님, 오늘 한 일 요약입니다.`,
          finalsPreviewDmText: '#finals 누적 업데이트 미리보기\n아직 #finals에는 반영하지 않았습니다.',
          leadUser: teamConfig.users[0]
        };
      }
    }
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /민성님, 오늘 한 일 요약입니다/);
  assert.equal(openedDms[0].users, 'U1');
  assert.equal(postedMessages[0].channel, 'D_LEAD');
  assert.match(postedMessages[0].text, /#finals 누적 업데이트 미리보기/);
  assert.equal(postedMessages[0].blocks[1].elements[0].action_id, 'finals_approve_latest');
});

test('handleDirectDmMessage reports daily summary failures to the user', async () => {
  const replies = [];
  const errors = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '퇴근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error(error) { errors.push(error); } },
    inProcessService: {
      async handleEndWork() {
        throw new Error('summary failed');
      }
    }
  });

  assert.equal(errors.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /오늘 한 일 요약 생성에 실패했습니다/);
  assert.match(replies[0].text, /Render 로그/);
});

test('handleDirectDmMessage sends a finals preview for lead finals update commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: 'finals 업데이트'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleFinalsPreview(input) {
        serviceCalls.push(input);
        return {
          dmText: '#finals 누적 업데이트 미리보기\n아직 #finals에는 반영하지 않았습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /#finals 누적 업데이트 미리보기/);
  assert.equal(replies[0].blocks[1].elements[0].action_id, 'finals_approve_latest');
});

test('handleDirectDmMessage reports finals preview failures to the lead', async () => {
  const replies = [];
  const errors = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: 'finals 업데이트'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error(error) { errors.push(error); } },
    inProcessService: {
      async handleFinalsPreview() {
        throw new Error('finals failed');
      }
    }
  });

  assert.equal(errors.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /#finals 미리보기 생성에 실패했습니다/);
  assert.match(replies[0].text, /Render 로그/);
});

test('handleFinalsApproveButton lets the lead approve the latest finals preview', async () => {
  let acked = false;
  const serviceCalls = [];
  const replies = [];

  await handleFinalsApproveButton({
    ack: async () => { acked = true; },
    body: {
      user: { id: 'U1' },
      channel: { id: 'D1' }
    },
    client: {
      chat: {
        postMessage: async (input) => replies.push(input)
      }
    },
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleFinalsApproval(input) {
        serviceCalls.push(input);
        return {
          responseText: '#finals 누적 정리를 반영했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].approvedByUserKey, 'suhyeon');
  assert.equal(replies[0].channel, 'D1');
  assert.match(replies[0].text, /반영했습니다/);
});

test('handleFinalsApproveButton rejects non-lead users', async () => {
  let acked = false;
  const replies = [];

  await handleFinalsApproveButton({
    ack: async () => { acked = true; },
    body: {
      user: { id: 'U2' },
      channel: { id: 'D2' }
    },
    client: {
      chat: {
        postMessage: async (input) => replies.push(input)
      }
    },
    config: {
      ...config,
      users: [
        ...config.users,
        { key: 'joeun', slackId: 'U2', fullName: '김조은', displayName: '조은' }
      ]
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleFinalsApproval() {
        throw new Error('should not be called');
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /수현님만/);
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

test('handleTaskAcceptButton accepts a task and generates a Codex prompt', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskAcceptButton({
    ack: async () => { acked = true; },
    body: {
      actions: [
        {
          action_id: 'task_accept_generate_prompt',
          value: JSON.stringify({
            actionId: 'task_accept_generate_prompt',
            taskId: 'task-1',
            assigneeUserKey: 'suhyeon'
          })
        }
      ]
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskAcceptAndPrompt(input) {
        serviceCalls.push(input);
        return {
          status: '수락',
          responseText: '수현님, Codex 프롬프트를 생성했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].taskId, 'task-1');
  assert.equal(serviceCalls[0].assigneeUserKey, 'suhyeon');
});

test('handleCodexPromptCopyButton acknowledges and sends a copyable ephemeral prompt', async () => {
  let acked = false;
  const serviceCalls = [];
  const ephemeralMessages = [];

  await handleCodexPromptCopyButton({
    ack: async () => { acked = true; },
    body: {
      user: { id: 'U1' },
      channel: { id: 'C_IN_PROCESS' },
      actions: [
        {
          action_id: 'copy_codex_prompt',
          value: 'task-1'
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => ephemeralMessages.push(input)
      }
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleCodexPromptCopyRequest(input) {
        serviceCalls.push(input);
        return {
          text: 'Codex 프롬프트 복사용 본문입니다.',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '```Subjector Codex prompt```'
              }
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.deepEqual(serviceCalls[0], { taskId: 'task-1' });
  assert.equal(ephemeralMessages[0].channel, 'C_IN_PROCESS');
  assert.equal(ephemeralMessages[0].user, 'U1');
  assert.match(ephemeralMessages[0].text, /Codex 프롬프트/);
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

test('handleTaskActionViewSubmission acknowledges before evaluation and sends ephemeral feedback', async () => {
  let acked = false;
  const events = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = true;
      events.push(['ack', payload]);
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
    client: {
      chat: {
        async postEphemeral(input) {
          events.push(['postEphemeral', input]);
        }
      }
    },
    config: {
      ...config,
      channels: {
        inProcess: 'C_IN_PROCESS'
      }
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        events.push(['service', { ackedBeforeService: acked, input }]);
        return {
          status: '보완 필요',
          responseText: '*센서 후보 정리* 완료 제출 검수 결과입니다.'
        };
      }
    }
  });

  assert.deepEqual(events.map((event) => event[0]), ['ack', 'service', 'postEphemeral']);
  assert.equal(events[1][1].ackedBeforeService, true);
  assert.equal(events[2][1].channel, 'C_IN_PROCESS');
  assert.equal(events[2][1].user, 'U1');
  assert.match(events[2][1].text, /검수 결과/);
});
