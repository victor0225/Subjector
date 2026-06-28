import { getUserBySlackId } from '../config.js';
import { buildMeetingTranscriptionReadyText, normalizeMeetingTranscript } from '../domain/meetingTranscript.js';
import {
  buildMeetingUploadThreadText,
  getMeetingAudioFile,
  isMeetingUploadMessage
} from '../domain/meetingUploads.js';
import { formatDisplayName, getUserByKey } from '../domain/users.js';
import { buildSpeakerMappingBlocks } from '../slack/meetingBlocks.js';

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

export function createMeetingService({ store, config, fileDownloader = null, audioTranscriber = null }) {
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

    return {
      speakerMapping: result.speakerMapping,
      text: `${speakerLabel}를 ${formatDisplayName(user)}으로 저장했습니다.`
    };
  }

  return {
    handleMeetingFileMessage,
    processMeetingAudioUpload,
    handleSpeakerMapping
  };
}
