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
  buildMeetingParticipantInputBlocks
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
  fileDownloader = null,
  audioTranscriber = null,
  taskExtractor = null
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
        blocks: buildSpeakerMappingBlocks({
          text,
          transcript,
          users: config.users,
          sourceChannelId: source.sourceChannelId,
          sourceMessageTs: source.sourceMessageTs
        })
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

    if (!taskExtractor || !shouldExtractTaskCandidates({ meeting: mappedMeeting })) {
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
      return {
        text
      };
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

  return {
    handleMeetingFileMessage,
    processMeetingAudioUpload,
    handleSpeakerMapping,
    handleParticipantTaskInput,
    getMeetingTaskCandidate,
    handleCandidateReview,
    handleTaskApproval
  };
}
