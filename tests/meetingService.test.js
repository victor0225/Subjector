import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeetingService } from '../src/services/meetingService.js';

const config = {
  channels: {
    meeting: 'C_MEETING'
  },
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' }
  ]
};

const teamConfig = {
  channels: {
    meeting: 'C_MEETING'
  },
  leadUserKey: 'suhyeon',
  features: {
    enableMeetingTaskFlow: true
  },
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' },
    { key: 'joeun', slackId: 'U2', fullName: '김조은', displayName: '조은' }
  ]
};

test('handleMeetingFileMessage records a meeting upload and returns a thread reply', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async createMeetingFromAudioUpload(input) {
        calls.push(input);
      }
    }
  });

  const result = await service.handleMeetingFileMessage({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [
        {
          name: '졸작회의.m4a',
          mimetype: 'audio/mp4',
          filetype: 'm4a'
        }
      ]
    }
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    uploaderUserKey: 'suhyeon',
    audioFileName: '졸작회의.m4a'
  });
  assert.equal(result.channel, 'C_MEETING');
  assert.equal(result.threadTs, '1710000000.000100');
  assert.match(result.text, /회의 녹음 업로드를 확인했습니다/);
  assert.match(result.text, /IDEA CRUISE 참고 맥락/);
});

test('handleMeetingFileMessage ignores non-meeting messages', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async createMeetingFromAudioUpload(input) {
        calls.push(input);
      }
    }
  });

  const result = await service.handleMeetingFileMessage({
    message: {
      channel: 'C_OTHER',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    }
  });

  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test('handleRawMeetingText records manual meeting text and asks participants for input', async () => {
  const calls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async createMeetingFromRawText(input) {
        calls.push(input);
      }
    }
  });

  const result = await service.handleRawMeetingText({
    sourceChannelId: 'D_LEAD',
    sourceMessageTs: '1710000000.000200',
    submittedByUserKey: 'suhyeon',
    rawText: 'ESP32 기준으로 진행하기로 함'
  });

  assert.equal(calls[0].sourceChannelId, 'D_LEAD');
  assert.equal(calls[0].sourceMessageTs, '1710000000.000200');
  assert.equal(calls[0].uploaderUserKey, 'suhyeon');
  assert.deepEqual(calls[0].participantUserKeys, ['suhyeon', 'joeun']);
  assert.match(result.text, /수동 회의 기록을 저장했습니다/);
  assert.equal(result.directMessages.length, 2);
  assert.equal(result.directMessages[0].blocks[1].elements[0].action_id, 'meeting_participant_task_input');
});

test('handleRawMeetingText stores context only when meeting task flow is disabled', async () => {
  const calls = [];
  const service = createMeetingService({
    config: {
      ...teamConfig,
      features: {
        enableMeetingTaskFlow: false
      }
    },
    store: {
      async createMeetingFromRawText(input) {
        calls.push(input);
      }
    }
  });

  const result = await service.handleRawMeetingText({
    sourceChannelId: 'D_LEAD',
    sourceMessageTs: '1710000000.000200',
    submittedByUserKey: 'suhyeon',
    rawText: 'ESP32 기준으로 진행하기로 함'
  });

  assert.equal(calls[0].sourceChannelId, 'D_LEAD');
  assert.deepEqual(calls[0].participantUserKeys, ['suhyeon', 'joeun']);
  assert.match(result.text, /IDEA CRUISE 참고 맥락으로 저장했습니다/);
  assert.equal(result.directMessages, undefined);
});

test('handleRoadmapReflectionRequest uses the meeting channel checkpoint message', async () => {
  const service = createMeetingService({
    config: teamConfig,
    store: {}
  });

  const result = await service.handleRoadmapReflectionRequest({
    submittedByUserKey: 'suhyeon'
  });

  assert.equal(result.submittedByUserKey, 'suhyeon');
  assert.match(result.text, /로드맵 반영 요청/);
  assert.match(result.text, /#회의-결과록/);
  assert.match(result.text, /봇 일반 메시지 "로드맵 반영 완료" 이후 자료/);
  assert.match(result.text, /그 메시지가 다음 반영 기준/);
});

test('handleRoadmapReflectionRequest reflects messages after the latest completion marker', async () => {
  const storedRawTexts = [];
  const postedMessages = [];
  const analyzerCalls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async createMeetingFromRawText(input) {
        storedRawTexts.push(input);
      }
    },
    cardAnalyzer: {
      async analyze(input) {
        analyzerCalls.push(input);
        return [
          {
            kind: 'decision',
            type: 'AI 애매함 검토',
            title: '소음 차단 범위 결정',
            body: '회의록에는 소음 차단 범위가 넓게 남아 있어 지금 기준을 좁혀야 합니다.',
            suggestion: '소음 차단은 우선 폭음/충격음 중심으로 좁히고 음성 보존은 별도 기준으로 검토한다.',
            details: [],
            choices: []
          },
          {
            kind: 'filter',
            type: 'AI 제외 제안',
            title: '회의 중 제외한 선택지 확인',
            body: '팀이 제외한 공사장 일반 소음까지 task로 만들지 확인이 필요합니다.',
            suggestion: '공사장 일반 소음 대응은 이번 MVP 범위에서 제외한다.',
            details: [],
            choices: []
          }
        ];
      }
    },
    slackClient: {
      conversations: {
        async history(input) {
          assert.equal(input.channel, 'C_MEETING');
          return {
            messages: [
              { ts: '1710000000.000400', text: '회의 중 말고 짧게 논의한 메모' },
              { ts: '1710000000.000300', text: '로드맵 반영 완료\n- 참고 자료: 2개' },
              { ts: '1710000000.000200', text: '이미 반영된 예전 회의록' }
            ]
          };
        }
      },
      chat: {
        async postMessage(input) {
          postedMessages.push(input);
          return { ts: '1710000000.000500' };
        }
      }
    }
  });

  const result = await service.handleRoadmapReflectionRequest({
    submittedByUserKey: 'suhyeon'
  });

  assert.equal(storedRawTexts.length, 1);
  assert.equal(storedRawTexts[0].sourceChannelId, 'C_MEETING');
  assert.equal(storedRawTexts[0].sourceMessageTs, '1710000000.000400');
  assert.equal(storedRawTexts[0].rawText, '회의 중 말고 짧게 논의한 메모');
  assert.equal(storedRawTexts[0].roadmapReflection.cards.length, 2);
  assert.equal(storedRawTexts[0].roadmapReflection.cards[0].kind, 'decision');
  assert.match(analyzerCalls[0].entryText, /회의 중 말고 짧게 논의한 메모/);
  assert.match(analyzerCalls[0].entryText, /회의 자료를 기존 IDEA CRUISE 로드맵에 반영/);
  assert.equal(postedMessages.length, 1);
  assert.equal(postedMessages[0].channel, 'C_MEETING');
  assert.match(postedMessages[0].text, /^로드맵 반영 완료/);
  assert.match(postedMessages[0].text, /참고 자료: 1개/);
  assert.match(postedMessages[0].text, /생성된 애매함 카드: 2개/);
  assert.match(result.text, /로드맵 반영을 완료했습니다/);
  assert.equal(result.ambiguityCardCount, 2);
});

test('handleRoadmapReflectionRequest reports no new meeting materials without posting a marker', async () => {
  const postedMessages = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async createMeetingFromRawText() {
        throw new Error('should not store old materials');
      }
    },
    slackClient: {
      conversations: {
        async history() {
          return {
            messages: [
              { ts: '1710000000.000300', text: '로드맵 반영 완료\n- 참고 자료: 2개' },
              { ts: '1710000000.000200', text: '이미 반영된 예전 회의록' }
            ]
          };
        }
      },
      chat: {
        async postMessage(input) {
          postedMessages.push(input);
        }
      }
    }
  });

  const result = await service.handleRoadmapReflectionRequest({
    submittedByUserKey: 'suhyeon'
  });

  assert.equal(postedMessages.length, 0);
  assert.equal(result.text, '#회의-결과록에서 새로 반영할 자료가 없습니다.');
});

test('processMeetingAudioUpload downloads, transcribes, stores, and asks for speaker mapping', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async markMeetingTranscribing(input) {
        calls.push(['markMeetingTranscribing', input]);
      },
      async completeMeetingTranscription(input) {
        calls.push(['completeMeetingTranscription', input]);
      },
      async failMeetingTranscription(input) {
        calls.push(['failMeetingTranscription', input]);
      }
    },
    fileDownloader: {
      async downloadFile(input) {
        calls.push(['downloadFile', input.file.name]);
        return {
          bytes: new Uint8Array([1, 2, 3]),
          mimeType: 'audio/mp4',
          fileName: '졸작회의.m4a'
        };
      }
    },
    audioTranscriber: {
      async transcribeMeeting(input) {
        calls.push(['transcribeMeeting', input.fileName, input.teamMembers.length]);
        return {
          meetingTitle: '졸작 회의',
          conciseSummary: '회의 전사 테스트',
          speakers: [{ label: 'Speaker A', evidence: '회의를 시작함' }],
          segments: [{ speaker: 'Speaker A', startTime: '00:00:01', endTime: '00:00:04', text: '시작하겠습니다.' }],
          decisions: ['전사를 진행한다.'],
          actionItems: ['Speaker 매핑을 확인한다.']
        };
      }
    }
  });

  const result = await service.processMeetingAudioUpload({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    }
  });

  assert.equal(calls[0][0], 'markMeetingTranscribing');
  assert.equal(calls[1][0], 'downloadFile');
  assert.equal(calls[2][0], 'transcribeMeeting');
  assert.equal(calls[3][0], 'completeMeetingTranscription');
  assert.equal(calls[3][1].transcript.meetingTitle, '졸작 회의');
  assert.equal(result.channel, 'C_MEETING');
  assert.equal(result.threadTs, '1710000000.000100');
  assert.match(result.text, /전사가 완료되었습니다/);
  assert.match(result.text, /IDEA CRUISE가 참고할 회의 맥락/);
  assert.equal(result.blocks.some((block) => block.type === 'actions'), false);
});

test('processMeetingAudioUpload marks the meeting failed when transcription fails', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async markMeetingTranscribing(input) {
        calls.push(['markMeetingTranscribing', input]);
      },
      async completeMeetingTranscription(input) {
        calls.push(['completeMeetingTranscription', input]);
      },
      async failMeetingTranscription(input) {
        calls.push(['failMeetingTranscription', input]);
      }
    },
    fileDownloader: {
      async downloadFile() {
        throw new Error('Slack download failed');
      }
    },
    audioTranscriber: {
      async transcribeMeeting() {
        throw new Error('should not transcribe');
      }
    }
  });

  const result = await service.processMeetingAudioUpload({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    }
  });

  assert.equal(calls[0][0], 'markMeetingTranscribing');
  assert.equal(calls[1][0], 'failMeetingTranscription');
  assert.match(calls[1][1].errorMessage, /Slack download failed/);
  assert.match(result.text, /회의 전사에 실패했습니다/);
});

test('handleSpeakerMapping stores a lead-approved speaker mapping', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async saveMeetingSpeakerMapping(input) {
        calls.push(input);
        return {
          speakerMapping: {
            'Speaker A': 'suhyeon'
          }
        };
      }
    }
  });

  const result = await service.handleSpeakerMapping({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    speakerLabel: 'Speaker A',
    userKey: 'suhyeon'
  });

  assert.equal(calls[0].speakerLabel, 'Speaker A');
  assert.equal(calls[0].userKey, 'suhyeon');
  assert.match(result.text, /Speaker A/);
  assert.match(result.text, /수현님/);
});

test('handleSpeakerMapping asks mapped participants for their first tasks before extraction', async () => {
  const calls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async saveMeetingSpeakerMapping(input) {
        calls.push(['saveMeetingSpeakerMapping', input]);
        return {
          speakerMapping: {
            'Speaker A': 'suhyeon',
            'Speaker B': 'joeun'
          },
          meeting: {
            id: 'meeting-1',
            status: 'needs_speaker_mapping',
            summary: {
              transcript: {
                meetingTitle: '졸작 회의',
                speakers: [{ label: 'Speaker A' }, { label: 'Speaker B' }],
                segments: [{ speaker: 'Speaker A', text: '수현님이 회의 처리 흐름을 점검한다.' }]
              }
            }
          }
        };
      },
      async requestMeetingParticipantTaskInputs(input) {
        calls.push(['requestMeetingParticipantTaskInputs', input]);
      }
    },
    taskExtractor: {
      async extractTasks(input) {
        calls.push(['extractTasks', input.meeting.id]);
        return [];
      }
    }
  });

  const result = await service.handleSpeakerMapping({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    speakerLabel: 'Speaker A',
    userKey: 'suhyeon'
  });

  assert.equal(calls[1][0], 'requestMeetingParticipantTaskInputs');
  assert.deepEqual(calls[1][1].participantUserKeys, ['suhyeon', 'joeun']);
  assert.equal(calls.some((call) => call[0] === 'extractTasks'), false);
  assert.match(result.text, /Speaker A를 수현님으로 저장했습니다/);
  assert.match(result.threadMessage.text, /회의 참여자에게 DM/);
  assert.equal(result.threadMessage.channel, 'C_MEETING');
  assert.equal(result.threadMessage.threadTs, '1710000000.000100');
  assert.equal(result.directMessages.length, 2);
  assert.match(result.directMessages[0].text, /중요하다고 보는 일/);
  assert.equal(result.directMessages[0].blocks[1].elements[0].action_id, 'meeting_participant_task_input');
});

test('handleParticipantTaskInput waits until every mapped participant answers', async () => {
  const calls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async saveMeetingParticipantTaskInput(input) {
        calls.push(['saveMeetingParticipantTaskInput', input]);
        return {
          meeting: {
            id: 'meeting-1',
            summary: {
              participantUserKeys: ['suhyeon', 'joeun'],
              participantTaskInputs: {
                suhyeon: input.rawText
              }
            }
          },
          remainingUserKeys: ['joeun']
        };
      }
    },
    taskExtractor: {
      async extractTasks(input) {
        calls.push(['extractTasks', input]);
        return [];
      }
    }
  });

  const result = await service.handleParticipantTaskInput({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    userKey: 'suhyeon',
    rawText: '나는 회의 처리 흐름을 먼저 점검한다.'
  });

  assert.equal(calls[0][0], 'saveMeetingParticipantTaskInput');
  assert.equal(calls.some((call) => call[0] === 'extractTasks'), false);
  assert.match(result.text, /아직 답변 대기/);
  assert.match(result.text, /조은님/);
});

test('handleParticipantTaskInput sends a lead-only test skip button while waiting', async () => {
  const service = createMeetingService({
    config: {
      ...teamConfig,
      features: {
        enableTestParticipantSkip: true
      }
    },
    store: {
      async saveMeetingParticipantTaskInput(input) {
        return {
          meeting: {
            id: 'meeting-1',
            summary: {
              participantUserKeys: ['suhyeon', 'joeun'],
              participantTaskInputs: {
                suhyeon: input.rawText
              }
            }
          },
          remainingUserKeys: ['joeun']
        };
      }
    }
  });

  const result = await service.handleParticipantTaskInput({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    userKey: 'suhyeon',
    rawText: '나는 회의 처리 흐름을 먼저 점검한다.'
  });

  assert.equal(result.directMessages.length, 1);
  assert.equal(result.directMessages[0].slackId, 'U1');
  assert.match(result.directMessages[0].text, /테스트용/);
  assert.equal(result.directMessages[0].blocks[1].elements[0].action_id, 'meeting_participant_skip_waiting');
});

test('handleParticipantTaskInput extracts candidates and creates assignee review DMs after all answers', async () => {
  const calls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async saveMeetingParticipantTaskInput(input) {
        calls.push(['saveMeetingParticipantTaskInput', input]);
        return {
          meeting: {
            id: 'meeting-1',
            speakerMapping: {
              'Speaker A': 'suhyeon',
              'Speaker B': 'joeun'
            },
            summary: {
              transcript: {
                meetingTitle: '졸작 회의',
                speakers: [{ label: 'Speaker A' }, { label: 'Speaker B' }]
              },
              participantUserKeys: ['suhyeon', 'joeun'],
              participantTaskInputs: {
                suhyeon: '나는 회의 처리 흐름을 먼저 점검한다.',
                joeun: input.rawText
              }
            }
          },
          remainingUserKeys: []
        };
      },
      async saveMeetingTaskCandidatesForReview(input) {
        calls.push(['saveMeetingTaskCandidatesForReview', input]);
      }
    },
    taskExtractor: {
      async extractTasks(input) {
        calls.push(['extractTasks', input.meeting.summary.participantTaskInputs]);
        return [
          {
            assigneeUserKey: 'joeun',
            title: '센서 후보 비교',
            importance: '🔴 상',
            coordination: '🟡 중',
            context: {
              why: '조은님이 먼저 할 일로 언급했다.',
              assignmentReason: '회의에서 조은님이 비교를 맡았다.',
              completionCriteria: ['후보 3개 비교표 작성']
            }
          }
        ];
      }
    }
  });

  const result = await service.handleParticipantTaskInput({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    userKey: 'joeun',
    rawText: '나는 센서 후보 비교를 먼저 한다.'
  });

  assert.equal(calls[1][0], 'extractTasks');
  assert.equal(calls[2][0], 'saveMeetingTaskCandidatesForReview');
  assert.equal(calls[2][1].taskCandidates[0].title, '센서 후보 비교');
  assert.match(result.text, /task 후보 검토 DM/);
  assert.equal(result.candidateReviewMessages.length, 1);
  assert.equal(result.candidateReviewMessages[0].slackId, 'U2');
  assert.equal(result.candidateReviewMessages[0].blocks[2].elements[0].action_id, 'meeting_candidate_accept');
});

test('handleParticipantSkipWaiting extracts candidates from the answers collected so far', async () => {
  const calls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async getMeetingBySource(input) {
        calls.push(['getMeetingBySource', input]);
        return {
          id: 'meeting-1',
          speakerMapping: {
            'Speaker A': 'suhyeon',
            'Speaker B': 'joeun'
          },
          summary: {
            transcript: {
              meetingTitle: '졸작 회의',
              speakers: [{ label: 'Speaker A' }, { label: 'Speaker B' }]
            },
            participantUserKeys: ['suhyeon', 'joeun'],
            participantTaskInputs: {
              suhyeon: '나는 회의 처리 흐름을 먼저 점검한다.'
            }
          }
        };
      },
      async saveMeetingTaskCandidatesForReview(input) {
        calls.push(['saveMeetingTaskCandidatesForReview', input]);
      }
    },
    taskExtractor: {
      async extractTasks(input) {
        calls.push(['extractTasks', input.meeting.summary.participantTaskInputs]);
        return [
          {
            assigneeUserKey: 'suhyeon',
            title: '회의 처리 흐름 점검',
            importance: '🔴 상',
            coordination: '🟡 중',
            context: {
              why: '수현님 답변에서 우선순위로 제시되었다.'
            }
          }
        ];
      }
    }
  });

  const result = await service.handleParticipantSkipWaiting({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    requestedByUserKey: 'suhyeon'
  });

  assert.equal(calls[0][0], 'getMeetingBySource');
  assert.equal(calls[1][0], 'extractTasks');
  assert.equal(calls[2][0], 'saveMeetingTaskCandidatesForReview');
  assert.match(result.text, /현재 답변만으로/);
  assert.equal(result.candidateReviewMessages.length, 1);
  assert.equal(result.candidateReviewMessages[0].slackId, 'U1');
});

test('handleCandidateReview accepts only the assigned candidate owner', async () => {
  const calls = [];
  const service = createMeetingService({
    config: teamConfig,
    store: {
      async reviewMeetingTaskCandidate(input) {
        calls.push(input);
        return {
          alreadyReviewed: false,
          taskCandidate: {
            title: '센서 후보 비교'
          }
        };
      }
    }
  });

  const denied = await service.handleCandidateReview({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    candidateIndex: 0,
    assigneeUserKey: 'joeun',
    reviewedByUserKey: 'suhyeon',
    decision: 'accepted'
  });

  assert.equal(calls.length, 0);
  assert.match(denied.text, /담당자 본인만/);

  const accepted = await service.handleCandidateReview({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    candidateIndex: 0,
    assigneeUserKey: 'joeun',
    reviewedByUserKey: 'joeun',
    decision: 'accepted'
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].decision, 'accepted');
  assert.match(accepted.text, /#in-process/);
});

test('handleTaskApproval creates approved meeting tasks', async () => {
  const calls = [];
  const service = createMeetingService({
    config,
    store: {
      async approveMeetingTasks(input) {
        calls.push(input);
        return {
          taskCandidates: [
            { assigneeUserKey: 'suhyeon', title: '회의 처리 흐름 점검' },
            { assigneeUserKey: 'joeun', title: '센서 후보 비교' }
          ]
        };
      }
    }
  });

  const result = await service.handleTaskApproval({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100'
  });

  assert.equal(calls[0].sourceChannelId, 'C_MEETING');
  assert.match(result.text, /task 2개를 생성했습니다/);
  assert.match(result.text, /#in-process/);
});
