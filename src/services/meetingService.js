import { getUserBySlackId } from '../config.js';
import { buildMeetingTranscriptionReadyText, normalizeMeetingTranscript } from '../domain/meetingTranscript.js';
import {
  areAllSpeakersMapped,
  buildMeetingTaskCandidateReviewText,
  buildMeetingTaskApprovalResultText,
  buildParticipantTaskInputDmText,
  buildParticipantTaskInputSavedText,
  buildParticipantTaskInputThreadText,
  getMappedParticipantUserKeys
} from '../domain/meetingTasks.js';
import {
  buildMeetingUploadThreadText,
  getMeetingAudioFile,
  isMeetingUploadMessage
} from '../domain/meetingUploads.js';
import { formatDisplayName, getUserByKey } from '../domain/users.js';
import { buildSpeakerMappingBlocks } from '../slack/meetingBlocks.js';
import {
  buildMeetingCandidateReviewBlocks,
  buildMeetingParticipantInputBlocks,
  buildMeetingParticipantSkipBlocks
} from '../slack/meetingTaskBlocks.js';

function sourceFromMessage(message) {
  return {
    sourceChannelId: message.channel,
    sourceMessageTs: message.ts
  };
}

function buildFailureText(error) {
  return [
    '회의 전사에 실패했습니다.',
    `- 원인: ${error.message}`,
    'Render 로그를 확인한 뒤 같은 파일을 다시 업로드해 주세요.'
  ].join('\n');
}

function shouldExtractTaskCandidates({ meeting }) {
  return meeting?.status !== 'needs_participant_input'
    && meeting?.status !== 'participant_inputs_ready'
    && meeting?.status !== 'needs_candidate_review'
    && meeting?.status !== 'candidate_reviewed'
    && meeting?.status !== 'needs_task_approval'
    && meeting?.status !== 'tasks_created'
    && areAllSpeakersMapped({
      transcript: meeting?.summary?.transcript,
      speakerMapping: meeting?.speakerMapping
    });
}

function isMeetingTaskFlowEnabled(config) {
  return config?.features?.enableMeetingTaskFlow === true;
}

const ROADMAP_REFLECTION_MARKER = '로드맵 반영 완료';

function slackTsNumber(value) {
  return Number.parseFloat(String(value || '0'));
}

function isRoadmapReflectionMarker(message) {
  return String(message?.text || '').includes(ROADMAP_REFLECTION_MARKER);
}

function isReflectableMeetingMaterial(message) {
  if (isRoadmapReflectionMarker(message)) return false;
  const text = String(message?.text || '').trim();
  return Boolean(text) || (Array.isArray(message?.files) && message.files.length > 0);
}

function buildRoadmapReflectionCompletedText({ materialCount, ambiguityCardCount = 0 }) {
  return [
    ROADMAP_REFLECTION_MARKER,
    `- 참고 자료: ${materialCount}개`,
    `- 생성된 애매함 카드: ${ambiguityCardCount}개`,
    '- 다음 반영 기준: 이 메시지 이후 자료'
  ].join('\n');
}

function buildRoadmapReflectionEntryText({ materials }) {
  return [
    '회의 자료를 기존 IDEA CRUISE 로드맵에 반영하고, 회의 때 바로 확인해야 할 애매함 카드를 생성하세요.',
    '기존 로드맵 구조는 유지하고, 새로 결정해야 할 것/제외해야 할 것/나중에 확인할 것을 우선순위로 분리하세요.',
    '',
    '새 회의 자료:',
    ...materials.map((material, index) => {
      const text = String(material.text || '').trim();
      return [
        `## 자료 ${index + 1}`,
        text || '[첨부 파일만 있는 자료]'
      ].join('\n');
    })
  ].join('\n');
}

function normalizeRoadmapReflectionCards(cards) {
  return (Array.isArray(cards) ? cards : []).slice(0, 5).map((card) => ({
    kind: ['answer', 'research', 'experiment', 'decision', 'filter'].includes(card?.kind) ? card.kind : 'research',
    type: String(card?.type || 'AI 애매함 검토'),
    tag: ['info', 'warn', ''].includes(card?.tag) ? card.tag : '',
    title: String(card?.title || '회의 후 확인할 애매함'),
    body: String(card?.body || ''),
    suggestion: String(card?.suggestion || ''),
    details: Array.isArray(card?.details) ? card.details : [],
    choices: Array.isArray(card?.choices) ? card.choices : []
  })).filter((card) => card.body || card.suggestion);
}

async function analyzeRoadmapReflectionCards({ cardAnalyzer, materials }) {
  if (!cardAnalyzer?.analyze) {
    return [];
  }

  const entryText = buildRoadmapReflectionEntryText({ materials });
  const cards = await cardAnalyzer.analyze({
    entryText,
    completedEntries: [],
    meetingContexts: materials.map((material) => String(material.text || '').trim()).filter(Boolean),
    githubOrganization: 'https://github.com/SAFIRA-ondevice'
  });

  return normalizeRoadmapReflectionCards(cards);
}

function candidateReviewMessages({ taskCandidates, sourceChannelId, sourceMessageTs, config }) {
  const grouped = new Map();

  taskCandidates.forEach((taskCandidate, candidateIndex) => {
    const userKey = taskCandidate.assigneeUserKey;
    if (!grouped.has(userKey)) {
      grouped.set(userKey, []);
    }

    grouped.get(userKey).push({
      ...taskCandidate,
      candidateIndex
    });
  });

  return [...grouped.entries()]
    .map(([userKey, candidates]) => {
      const user = getUserByKey(config.users, userKey);
      if (!user?.slackId) {
        return null;
      }

      const text = buildMeetingTaskCandidateReviewText({
        user,
        taskCandidates: candidates
      });

      return {
        userKey,
        slackId: user.slackId,
        text,
        blocks: buildMeetingCandidateReviewBlocks({
          text,
          taskCandidates: candidates,
          sourceChannelId,
          sourceMessageTs,
          assigneeUserKey: userKey
        })
      };
    })
    .filter(Boolean);
}

export function createMeetingService({
  store,
  config,
  slackClient = null,
  fileDownloader = null,
  audioTranscriber = null,
  taskExtractor = null,
  cardAnalyzer = null
}) {
  async function handleMeetingFileMessage({ message }) {
    if (!isMeetingUploadMessage({
      message,
      meetingChannelId: config.channels.meeting
    })) {
      return null;
    }

    const file = getMeetingAudioFile(message);
    const uploader = getUserBySlackId(config.users, message.user);
    const source = sourceFromMessage(message);

    await store.createMeetingFromAudioUpload({
      sourceChannelId: source.sourceChannelId,
      sourceMessageTs: source.sourceMessageTs,
      uploaderUserKey: uploader?.key ?? null,
      audioFileName: file.name || file.title || file.id || null
    });

    return {
      channel: message.channel,
      threadTs: message.thread_ts ?? message.ts,
      text: buildMeetingUploadThreadText({ file, uploader })
    };
  }

  async function handleRawMeetingText({ sourceChannelId, sourceMessageTs, submittedByUserKey, rawText }) {
    const participantUserKeys = config.users.map((user) => user.key);

    await store.createMeetingFromRawText({
      sourceChannelId,
      sourceMessageTs,
      uploaderUserKey: submittedByUserKey,
      rawText,
      participantUserKeys
    });

    if (!isMeetingTaskFlowEnabled(config)) {
      return {
        text: '수동 회의 기록을 IDEA CRUISE 참고 맥락으로 저장했습니다. 자동 task 생성은 진행하지 않습니다.'
      };
    }

    return {
      text: '수동 회의 기록을 저장했습니다. 팀원에게 중요하다고 보는 일을 입력하라는 DM을 보냈습니다.',
      directMessages: config.users
        .filter((participant) => participant?.slackId)
        .map((participant) => {
          const dmText = buildParticipantTaskInputDmText({
            user: participant,
            meetingTitle: '수동 회의 기록'
          });

          return {
            userKey: participant.key,
            slackId: participant.slackId,
            text: dmText,
            blocks: buildMeetingParticipantInputBlocks({
              text: dmText,
              sourceChannelId,
              sourceMessageTs,
              userKey: participant.key
            })
          };
        })
    };
  }

  async function processMeetingAudioUpload({ message }) {
    if (!isMeetingUploadMessage({
      message,
      meetingChannelId: config.channels.meeting
    })) {
      return null;
    }

    const source = sourceFromMessage(message);
    const file = getMeetingAudioFile(message);

    try {
      if (!fileDownloader || !audioTranscriber) {
        throw new Error('Gemini transcription is not configured');
      }

      await store.markMeetingTranscribing(source);

      const downloaded = await fileDownloader.downloadFile({ file });
      const transcript = normalizeMeetingTranscript(await audioTranscriber.transcribeMeeting({
        bytes: downloaded.bytes,
        mimeType: downloaded.mimeType,
        fileName: downloaded.fileName,
        teamMembers: config.users
      }));

      await store.completeMeetingTranscription({
        ...source,
        transcript
      });

      const text = buildMeetingTranscriptionReadyText({ transcript });

      return {
        channel: message.channel,
        threadTs: message.thread_ts ?? message.ts,
        text,
        blocks: isMeetingTaskFlowEnabled(config)
          ? buildSpeakerMappingBlocks({
            text,
            transcript,
            users: config.users,
            sourceChannelId: source.sourceChannelId,
            sourceMessageTs: source.sourceMessageTs
          })
          : [{ type: 'section', text: { type: 'mrkdwn', text } }]
      };
    } catch (error) {
      await store.failMeetingTranscription({
        ...source,
        errorMessage: error.message
      });

      return {
        channel: message.channel,
        threadTs: message.thread_ts ?? message.ts,
        text: buildFailureText(error)
      };
    }
  }

  async function handleSpeakerMapping({ sourceChannelId, sourceMessageTs, speakerLabel, userKey }) {
    const result = await store.saveMeetingSpeakerMapping({
      sourceChannelId,
      sourceMessageTs,
      speakerLabel,
      userKey
    });
    const user = getUserByKey(config.users, userKey);
    const response = {
      speakerMapping: result.speakerMapping,
      text: `${speakerLabel}를 ${formatDisplayName(user)}으로 저장했습니다.`
    };
    const mappedMeeting = {
      ...result.meeting,
      speakerMapping: result.speakerMapping
    };

    if (!isMeetingTaskFlowEnabled(config) || !taskExtractor || !shouldExtractTaskCandidates({ meeting: mappedMeeting })) {
      return response;
    }

    const participantUserKeys = getMappedParticipantUserKeys({
      transcript: mappedMeeting.summary?.transcript,
      speakerMapping: mappedMeeting.speakerMapping
    });

    await store.requestMeetingParticipantTaskInputs({
      sourceChannelId,
      sourceMessageTs,
      participantUserKeys
    });

    const text = buildParticipantTaskInputThreadText({
      participantUserKeys,
      users: config.users
    });

    return {
      ...response,
      threadMessage: {
        channel: sourceChannelId,
        threadTs: sourceMessageTs,
        text
      },
      directMessages: participantUserKeys
        .map((participantUserKey) => getUserByKey(config.users, participantUserKey))
        .filter((participant) => participant?.slackId)
        .map((participant) => {
          const dmText = buildParticipantTaskInputDmText({
            user: participant,
            meetingTitle: mappedMeeting.summary?.transcript?.meetingTitle
          });

          return {
            userKey: participant.key,
            slackId: participant.slackId,
            text: dmText,
            blocks: buildMeetingParticipantInputBlocks({
              text: dmText,
              sourceChannelId,
              sourceMessageTs,
              userKey: participant.key
            })
          };
        })
    };
  }

  async function handleParticipantTaskInput({ sourceChannelId, sourceMessageTs, userKey, rawText }) {
    const result = await store.saveMeetingParticipantTaskInput({
      sourceChannelId,
      sourceMessageTs,
      userKey,
      rawText
    });

    const text = buildParticipantTaskInputSavedText({
      remainingUserKeys: result.remainingUserKeys,
      users: config.users
    });

    if (result.remainingUserKeys.length > 0 || !taskExtractor) {
      const response = { text };
      if (result.remainingUserKeys.length > 0 && config.features?.enableTestParticipantSkip) {
        const leadUser = getUserByKey(config.users, config.leadUserKey);
        if (leadUser?.slackId) {
          const skipText = [
            '[테스트용]',
            '아직 답변하지 않은 사람이 있지만 현재 저장된 답변만으로 task 후보 생성을 진행할 수 있습니다.',
            '실제 운영에서는 모든 참여자의 답변을 받은 뒤 진행하는 것을 권장합니다.'
          ].join('\n');
          response.directMessages = [
            {
              userKey: leadUser.key,
              slackId: leadUser.slackId,
              text: skipText,
              blocks: buildMeetingParticipantSkipBlocks({
                text: skipText,
                sourceChannelId,
                sourceMessageTs
              })
            }
          ];
        }
      }

      return response;
    }

    const taskCandidates = await taskExtractor.extractTasks({
      meeting: result.meeting,
      users: config.users
    });

    await store.saveMeetingTaskCandidatesForReview({
      sourceChannelId,
      sourceMessageTs,
      taskCandidates
    });

    return {
      text: `${text}\n담당자별 task 후보 검토 DM을 보냈습니다.`,
      candidateReviewMessages: candidateReviewMessages({
        taskCandidates,
        sourceChannelId,
        sourceMessageTs,
        config
      })
    };
  }

  async function handleParticipantSkipWaiting({ sourceChannelId, sourceMessageTs, requestedByUserKey }) {
    if (requestedByUserKey !== config.leadUserKey) {
      return {
        text: '테스트용 진행은 수현님만 실행할 수 있습니다.'
      };
    }

    const meeting = await store.getMeetingBySource({
      sourceChannelId,
      sourceMessageTs
    });
    const participantTaskInputs = meeting?.summary?.participantTaskInputs ?? {};

    if (Object.keys(participantTaskInputs).length === 0) {
      return {
        text: '아직 저장된 답변이 없어 현재 답변만으로 진행할 수 없습니다.'
      };
    }

    if (!taskExtractor) {
      return {
        text: 'task 후보 생성 모델이 설정되어 있지 않아 현재 답변만으로 진행할 수 없습니다.'
      };
    }

    const taskCandidates = await taskExtractor.extractTasks({
      meeting,
      users: config.users
    });

    await store.saveMeetingTaskCandidatesForReview({
      sourceChannelId,
      sourceMessageTs,
      taskCandidates
    });

    return {
      text: '테스트용으로 현재 답변만으로 task 후보를 생성했습니다. 담당자별 task 후보 검토 DM을 보냈습니다.',
      candidateReviewMessages: candidateReviewMessages({
        taskCandidates,
        sourceChannelId,
        sourceMessageTs,
        config
      })
    };
  }

  async function getMeetingTaskCandidate(input) {
    return store.getMeetingTaskCandidate(input);
  }

  async function handleCandidateReview({ sourceChannelId, sourceMessageTs, candidateIndex, assigneeUserKey, reviewedByUserKey, decision, editedCandidate = null }) {
    if (assigneeUserKey !== reviewedByUserKey) {
      return {
        text: '이 task 후보는 담당자 본인만 처리할 수 있습니다.'
      };
    }

    const result = await store.reviewMeetingTaskCandidate({
      sourceChannelId,
      sourceMessageTs,
      candidateIndex,
      reviewedByUserKey,
      decision,
      editedCandidate
    });

    if (result.alreadyReviewed) {
      return {
        text: '이미 처리된 task 후보입니다.'
      };
    }

    if (decision === 'rejected') {
      return {
        text: `*${result.taskCandidate.title}* 후보를 제외했습니다.`
      };
    }

    return {
      text: `*${result.taskCandidate.title}* task를 #in-process에 저장했습니다. DM에 \`최신화\`를 보내면 task 보드에서 확인할 수 있습니다.`
    };
  }

  async function handleTaskApproval({ sourceChannelId, sourceMessageTs }) {
    const result = await store.approveMeetingTasks({
      sourceChannelId,
      sourceMessageTs
    });

    return {
      text: buildMeetingTaskApprovalResultText({
        taskCandidates: result.taskCandidates
      })
    };
  }

  async function handleRoadmapReflectionRequest({ submittedByUserKey }) {
    if (slackClient?.conversations?.history && slackClient?.chat?.postMessage) {
      const history = await slackClient.conversations.history({
        channel: config.channels.meeting,
        limit: 100
      });
      const messages = Array.isArray(history?.messages) ? history.messages : [];
      const latestMarker = messages.find(isRoadmapReflectionMarker);
      const markerTs = slackTsNumber(latestMarker?.ts);
      const materials = messages
        .filter((message) => slackTsNumber(message.ts) > markerTs)
        .filter(isReflectableMeetingMaterial)
        .sort((a, b) => slackTsNumber(a.ts) - slackTsNumber(b.ts));

      if (materials.length === 0) {
        return {
          text: '#회의-결과록에서 새로 반영할 자료가 없습니다.',
          materialCount: 0
        };
      }

      const roadmapReflectionCards = await analyzeRoadmapReflectionCards({
        cardAnalyzer,
        materials
      });

      for (const [index, material] of materials.entries()) {
        const rawText = String(material.text || '').trim();
        if (!rawText) continue;
        await store.createMeetingFromRawText({
          sourceChannelId: config.channels.meeting,
          sourceMessageTs: material.ts,
          uploaderUserKey: submittedByUserKey,
          rawText,
          participantUserKeys: config.users.map((user) => user.key),
          roadmapReflection: index === 0 && roadmapReflectionCards.length > 0
            ? {
              source: 'dm-roadmap-reflection',
              materialCount: materials.length,
              cards: roadmapReflectionCards
            }
            : null
        });
      }

      const completionText = buildRoadmapReflectionCompletedText({
        materialCount: materials.length,
        ambiguityCardCount: roadmapReflectionCards.length
      });
      await slackClient.chat.postMessage({
        channel: config.channels.meeting,
        text: completionText
      });

      return {
        text: `로드맵 반영을 완료했습니다. #회의-결과록에 "${ROADMAP_REFLECTION_MARKER}" 일반 메시지를 남겼습니다.`,
        materialCount: materials.length,
        ambiguityCardCount: roadmapReflectionCards.length
      };
    }

    return {
      text: [
        '로드맵 반영 요청을 확인했습니다.',
        '#회의-결과록에서 가장 최근의 봇 일반 메시지 "로드맵 반영 완료" 이후 자료를 기준으로 IDEA CRUISE에 반영합니다.',
        '반영이 끝나면 Subjector가 일반 메시지 "로드맵 반영 완료"를 남기고, 그 메시지가 다음 반영 기준이 됩니다.'
      ].join('\n'),
      submittedByUserKey
    };
  }

  return {
    handleMeetingFileMessage,
    handleRawMeetingText,
    processMeetingAudioUpload,
    handleSpeakerMapping,
    handleParticipantTaskInput,
    handleParticipantSkipWaiting,
    getMeetingTaskCandidate,
    handleCandidateReview,
    handleTaskApproval,
    handleRoadmapReflectionRequest
  };
}
