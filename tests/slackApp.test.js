import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBootHealthStatus,
  handleDirectDmMessage,
  handleCodexPromptCopyButton,
  handleFinalsApproveButton,
  handleMeetingCandidateDecisionButton,
  handleMeetingCandidateEditButton,
  handleMeetingCandidateEditViewSubmission,
  handleMeetingFileMessage,
  handleMeetingParticipantInputButton,
  handleMeetingParticipantInputViewSubmission,
  handleMeetingParticipantSkipWaitingButton,
  handleMeetingSpeakerMappingButton,
  handleMeetingTaskApprovalButton,
  handleTaskAcceptButton,
  handleTaskAcceptDirectButton,
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

test('buildBootHealthStatus reports OpenAI when meeting task extraction uses OpenAI', () => {
  const status = buildBootHealthStatus({
    supabase: { url: 'https://example.supabase.co', serviceRoleKey: 'service-key' },
    ai: { evaluationProvider: 'gemini', meetingTaskProvider: 'openai' },
    openai: { apiKey: 'sk-key' },
    channels: { meeting: 'C1', inProcess: 'C2', finals: 'C3' }
  });

  assert.equal(status.openai.ok, true);
  assert.match(status.openai.message, /task extraction/);
});

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

test('handleDirectDmMessage refreshes #in-process for 최신화 commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '최신화'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleRefreshInProcess(input) {
        serviceCalls.push(input);
        return {
          action: 'updated',
          taskCount: 2,
          dmText: '수현님, #in-process task 영역을 최신화했습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /최신화했습니다/);
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

test('handleDirectDmMessage archives test tasks for lead cleanup commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_LEAD',
      user: 'U1',
      text: '테스트 task 정리'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleArchiveTestTasks(input) {
        serviceCalls.push(input);
        return {
          dmText: '수현님, 테스트 task를 보관 처리했습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.match(replies[0].text, /보관 처리/);
});

test('handleDirectDmMessage records raw meeting text and sends participant input DMs', async () => {
  const replies = [];
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_LEAD',
      ts: '1710000000.000200',
      user: 'U1',
      text: '회의 기록: ESP32 기준으로 진행하기로 함'
    },
    say: async (payload) => replies.push(payload),
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleRawMeetingText(input) {
        serviceCalls.push(input);
        return {
          text: '수동 회의 기록을 저장했습니다.',
          directMessages: [
            {
              slackId: 'U1',
              text: '수현님, 중요하다고 보는 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '수현님' } }]
            },
            {
              slackId: 'U2',
              text: '조은님, 중요하다고 보는 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '조은님' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].sourceChannelId, 'D_LEAD');
  assert.equal(serviceCalls[0].sourceMessageTs, '1710000000.000200');
  assert.equal(serviceCalls[0].submittedByUserKey, 'suhyeon');
  assert.equal(serviceCalls[0].rawText, 'ESP32 기준으로 진행하기로 함');
  assert.match(replies[0].text, /저장했습니다/);
  assert.equal(openedDms.length, 2);
  assert.match(postedMessages[1].text, /조은님/);
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

test('handleMeetingFileMessage posts a processing thread reply for meeting audio uploads', async () => {
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingFileMessage({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    logger: { info() {}, error() {} },
    meetingService: {
      async handleMeetingFileMessage(input) {
        serviceCalls.push(input);
        return {
          channel: input.message.channel,
          threadTs: input.message.ts,
          text: '회의 녹음 업로드를 확인했습니다.\n다음 단계에서 전사와 Speaker A/B/C 매핑을 진행합니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(postedMessages.length, 1);
  assert.equal(postedMessages[0].channel, 'C_MEETING');
  assert.equal(postedMessages[0].thread_ts, '1710000000.000100');
  assert.match(postedMessages[0].text, /회의 녹음 업로드를 확인했습니다/);
  assert.match(postedMessages[0].blocks[0].text.text, /Speaker A\/B\/C/);
});

test('handleMeetingFileMessage runs meeting transcription in the background', async () => {
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingFileMessage({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    logger: { info() {}, error() {} },
    backgroundRunner: async (task) => {
      await task();
    },
    meetingService: {
      async handleMeetingFileMessage(input) {
        serviceCalls.push(['upload', input]);
        return {
          channel: input.message.channel,
          threadTs: input.message.ts,
          text: '회의 녹음 업로드를 확인했습니다.'
        };
      },
      async processMeetingAudioUpload(input) {
        serviceCalls.push(['process', input]);
        return {
          channel: input.message.channel,
          threadTs: input.message.ts,
          text: '전사가 완료되었습니다. Speaker A/B/C를 실제 사람으로 지정해 주세요.',
          blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '전사가 완료되었습니다.' } }]
        };
      }
    }
  });

  assert.equal(serviceCalls[0][0], 'upload');
  assert.equal(serviceCalls[1][0], 'process');
  assert.equal(postedMessages.length, 3);
  assert.match(postedMessages[1].text, /회의 전사를 시작했습니다/);
  assert.match(postedMessages[1].text, /61MB 같은 긴 녹음/);
  assert.match(postedMessages[2].text, /전사가 완료되었습니다/);
});

test('handleMeetingSpeakerMappingButton lets only the lead map speakers', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker A',
            userKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping(input) {
        serviceCalls.push(input);
        return {
          text: 'Speaker A를 수현님으로 저장했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].speakerLabel, 'Speaker A');
  assert.match(postedMessages[0].text, /수현님으로 저장했습니다/);
});

test('handleMeetingSpeakerMappingButton posts task approval when task candidates are extracted', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker C',
            userKey: 'minsung'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(['ephemeral', input]),
        postMessage: async (input) => postedMessages.push(['message', input])
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping(input) {
        serviceCalls.push(input);
        return {
          text: 'Speaker C를 민성님으로 저장했습니다.',
          threadMessage: {
            channel: 'C_MEETING',
            threadTs: '1710000000.000100',
            text: 'task 후보 추출이 완료되었습니다.',
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'task 후보 추출이 완료되었습니다.' } }]
          }
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(postedMessages[0][0], 'ephemeral');
  assert.match(postedMessages[0][1].text, /민성님으로 저장했습니다/);
  assert.equal(postedMessages[1][0], 'message');
  assert.equal(postedMessages[1][1].thread_ts, '1710000000.000100');
  assert.match(postedMessages[1][1].text, /task 후보 추출이 완료되었습니다/);
});

test('handleMeetingSpeakerMappingButton sends participant task input DMs', async () => {
  let acked = false;
  const postedMessages = [];
  const openedDms = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker B',
            userKey: 'joeun'
          })
        }
      ]
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postEphemeral: async (input) => postedMessages.push(['ephemeral', input]),
        postMessage: async (input) => postedMessages.push(['message', input])
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping() {
        return {
          text: 'Speaker B를 조은님으로 저장했습니다.',
          threadMessage: {
            channel: 'C_MEETING',
            threadTs: '1710000000.000100',
            text: 'Speaker A/B/C 매핑이 완료되었습니다.'
          },
          directMessages: [
            {
              slackId: 'U1',
              text: '수현님, 먼저 해야 할 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '수현님' } }]
            },
            {
              slackId: 'U2',
              text: '조은님, 먼저 해야 할 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '조은님' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(openedDms.length, 2);
  assert.equal(openedDms[0].users, 'U1');
  assert.equal(openedDms[1].users, 'U2');
  assert.match(postedMessages.at(-1)[1].text, /조은님/);
});

test('handleMeetingParticipantInputButton opens the participant input modal', async () => {
  let acked = false;
  const openedViews = [];

  await handleMeetingParticipantInputButton({
    ack: async () => {
      acked = true;
    },
    body: {
      trigger_id: 'trigger-1',
      channel: { id: 'D_U1' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            userKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      views: {
        open: async (input) => openedViews.push(input)
      },
      chat: {
        postMessage: async () => {}
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} }
  });

  assert.equal(acked, true);
  assert.equal(openedViews[0].trigger_id, 'trigger-1');
  assert.equal(openedViews[0].view.callback_id, 'meeting_participant_task_input_submission');
});

test('handleMeetingParticipantInputViewSubmission stores the answer and sends candidate review DMs', async () => {
  let acked = false;
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleMeetingParticipantInputViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        sourceChannelId: 'C_MEETING',
        sourceMessageTs: '1710000000.000100',
        userKey: 'suhyeon'
      }),
      state: {
        values: {
          meeting_participant_task_input: {
            raw_text: {
              value: '나는 회의 처리 흐름을 먼저 점검한다.'
            }
          }
        }
      }
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleParticipantTaskInput(input) {
        serviceCalls.push(input);
        return {
          text: '답변을 저장했습니다. 담당자별 task 후보 검토 DM을 보냈습니다.',
          candidateReviewMessages: [
            {
              slackId: 'U2',
              text: '조은님, 후보를 확인해 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '후보' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].rawText, '나는 회의 처리 흐름을 먼저 점검한다.');
  assert.equal(openedDms[0].users, 'U1');
  assert.equal(openedDms[1].users, 'U2');
  assert.match(postedMessages[1].text, /후보/);
});

test('handleMeetingParticipantSkipWaitingButton lets the lead continue with collected answers', async () => {
  let acked = false;
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleMeetingParticipantSkipWaitingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'D_U1' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleParticipantSkipWaiting(input) {
        serviceCalls.push(input);
        return {
          text: '테스트용으로 현재 답변만으로 task 후보를 생성했습니다.',
          candidateReviewMessages: [
            {
              slackId: 'U1',
              text: '수현님, 후보를 확인해 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '후보' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].requestedByUserKey, 'suhyeon');
  assert.match(postedMessages[0].text, /현재 답변만으로/);
  assert.equal(openedDms[0].users, 'U1');
  assert.match(postedMessages[1].text, /후보/);
});

test('handleMeetingParticipantSkipWaitingButton rejects non-lead users', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingParticipantSkipWaitingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'D_U2' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleParticipantSkipWaiting(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 0);
  assert.match(postedMessages[0].text, /수현님만/);
});

test('handleMeetingCandidateDecisionButton stores an accepted candidate', async () => {
  let acked = false;
  const serviceCalls = [];
  const postedMessages = [];
  const updatedMessages = [];

  await handleMeetingCandidateDecisionButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'D_U2' },
      message: {
        ts: '1700000000.000200',
        text: '조은님, 후보를 확인해 주세요.',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '후보 안내' } },
          { type: 'section', text: { type: 'mrkdwn', text: '1. 센서 후보 비교' } },
          {
            type: 'actions',
            block_id: 'meeting_candidate_review_0',
            elements: [
              {
                type: 'button',
                action_id: 'meeting_candidate_accept',
                text: { type: 'plain_text', text: '채택' },
                value: JSON.stringify({
                  sourceChannelId: 'C_MEETING',
                  sourceMessageTs: '1710000000.000100',
                  candidateIndex: 0,
                  assigneeUserKey: 'joeun'
                })
              }
            ]
          }
        ]
      },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            candidateIndex: 0,
            assigneeUserKey: 'joeun'
          })
        }
      ]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input),
        update: async (input) => updatedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    decision: 'accepted',
    meetingService: {
      async handleCandidateReview(input) {
        serviceCalls.push(input);
        return {
          text: '센서 후보 비교 task를 #in-process에 저장했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].reviewedByUserKey, 'joeun');
  assert.equal(serviceCalls[0].decision, 'accepted');
  assert.match(postedMessages[0].text, /#in-process/);
  assert.equal(updatedMessages[0].channel, 'D_U2');
  assert.equal(updatedMessages[0].ts, '1700000000.000200');
  assert.equal(updatedMessages[0].blocks.some((block) => block.block_id === 'meeting_candidate_review_0'), false);
  assert.match(updatedMessages[0].blocks.at(-1).text.text, /처리 완료/);
});

test('handleMeetingCandidateEditButton opens a modal with the candidate text', async () => {
  let acked = false;
  const openedViews = [];

  await handleMeetingCandidateEditButton({
    ack: async () => {
      acked = true;
    },
    body: {
      trigger_id: 'trigger-edit',
      channel: { id: 'D_U2' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            candidateIndex: 0,
            assigneeUserKey: 'joeun'
          })
        }
      ]
    },
    client: {
      views: {
        open: async (input) => openedViews.push(input)
      },
      chat: {
        postMessage: async () => {}
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async getMeetingTaskCandidate() {
        return {
          taskCandidate: {
            title: '센서 후보 비교',
            importance: '🔴 상',
            coordination: '🟡 중',
            context: {
              why: '조은님이 먼저 할 일로 답했다.',
              completionCriteria: ['비교표 작성']
            }
          }
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(openedViews[0].trigger_id, 'trigger-edit');
  assert.equal(openedViews[0].view.callback_id, 'meeting_candidate_edit_submission');
  assert.equal(openedViews[0].view.blocks[0].element.initial_value, '센서 후보 비교');
});

test('handleMeetingCandidateEditViewSubmission saves an edited candidate as a task', async () => {
  let acked = false;
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleMeetingCandidateEditViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U2' }
    },
    view: {
      private_metadata: JSON.stringify({
        sourceChannelId: 'C_MEETING',
        sourceMessageTs: '1710000000.000100',
        candidateIndex: 0,
        assigneeUserKey: 'joeun'
      }),
      state: {
        values: {
          meeting_candidate_title: {
            title: {
              value: '센서 후보 3개 비교'
            }
          },
          meeting_candidate_why: {
            why: {
              value: '회의에서 센서 선정이 먼저 필요하다고 정리했다.'
            }
          },
          meeting_candidate_completion: {
            completionCriteria: {
              value: '후보 3개 비교표 작성\n추천 후보 1개 제시'
            }
          }
        }
      }
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: 'D_U2' } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleCandidateReview(input) {
        serviceCalls.push(input);
        return {
          text: '센서 후보 3개 비교 task를 #in-process에 저장했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].decision, 'edited_accepted');
  assert.equal(serviceCalls[0].editedCandidate.title, '센서 후보 3개 비교');
  assert.deepEqual(serviceCalls[0].editedCandidate.completionCriteria, ['후보 3개 비교표 작성', '추천 후보 1개 제시']);
  assert.equal(openedDms[0].users, 'U2');
  assert.match(postedMessages[0].text, /#in-process/);
});

test('handleMeetingTaskApprovalButton lets only the lead create extracted tasks', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingTaskApprovalButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input),
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleTaskApproval(input) {
        serviceCalls.push(input);
        return {
          text: 'task 2개를 생성했습니다. 다음 출근 때 #in-process에서 확인할 수 있습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(postedMessages[0].thread_ts, '1710000000.000100');
  assert.match(postedMessages[0].text, /task 2개를 생성했습니다/);
});

test('handleMeetingTaskApprovalButton rejects non-lead users', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingTaskApprovalButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleTaskApproval(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 0);
  assert.match(postedMessages[0].text, /task 반영 승인은 수현님만/);
});

test('handleMeetingSpeakerMappingButton rejects non-lead users', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker A',
            userKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 0);
  assert.match(postedMessages[0].text, /Speaker 매핑은 수현님만/);
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

test('handleTaskAcceptDirectButton accepts a task without generating a Codex prompt', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskAcceptDirectButton({
    ack: async () => { acked = true; },
    body: {
      actions: [
        {
          action_id: 'task_accept_direct',
          value: JSON.stringify({
            actionId: 'task_accept_direct',
            taskId: 'task-1',
            assigneeUserKey: 'suhyeon'
          })
        }
      ]
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskAcceptDirect(input) {
        serviceCalls.push(input);
        return {
          status: '수락',
          responseText: '수현님, 직접 진행으로 수락했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.deepEqual(serviceCalls[0], {
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon'
  });
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

test('handleTaskActionViewSubmission passes attachment metadata and note to the service', async () => {
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
              value: '직접 조사 결과를 정리했습니다.'
            }
          },
          task_action_files: {
            files: {
              files: [
                {
                  id: 'F1',
                  name: '조사정리.docx',
                  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  filetype: 'docx',
                  size: 12000
                }
              ]
            }
          },
          task_action_attachment_note: {
            attachment_note: {
              value: '첨부 Word 파일에 표와 결론이 있습니다.'
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
  assert.equal(serviceCalls[0].attachmentNote, '첨부 Word 파일에 표와 결론이 있습니다.');
  assert.equal(serviceCalls[0].attachments[0].id, 'F1');
  assert.equal(serviceCalls[0].attachments[0].name, '조사정리.docx');
});

test('handleTaskActionViewSubmission requires a note when files are attached', async () => {
  let ackPayload = null;
  const serviceCalls = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      ackPayload = payload;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_stop_today',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '오늘 진행한 그림을 첨부합니다.'
            }
          },
          task_action_files: {
            files: {
              files: [
                {
                  id: 'F2',
                  name: '흐름도.png',
                  mimetype: 'image/png',
                  filetype: 'png',
                  size: 9000
                }
              ]
            }
          },
          task_action_attachment_note: {
            attachment_note: {
              value: ' '
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
      }
    }
  });

  assert.equal(ackPayload.response_action, 'errors');
  assert.match(ackPayload.errors.task_action_attachment_note, /첨부 파일 설명/);
  assert.equal(serviceCalls.length, 0);
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
