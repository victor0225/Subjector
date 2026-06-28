import { getUserBySlackId } from '../config.js';
import {
  buildMeetingUploadThreadText,
  getMeetingAudioFile,
  isMeetingUploadMessage
} from '../domain/meetingUploads.js';

export function createMeetingService({ store, config }) {
  async function handleMeetingFileMessage({ message }) {
    if (!isMeetingUploadMessage({
      message,
      meetingChannelId: config.channels.meeting
    })) {
      return null;
    }

    const file = getMeetingAudioFile(message);
    const uploader = getUserBySlackId(config.users, message.user);

    await store.createMeetingFromAudioUpload({
      sourceChannelId: message.channel,
      sourceMessageTs: message.ts,
      uploaderUserKey: uploader?.key ?? null,
      audioFileName: file.name || file.title || file.id || null
    });

    return {
      channel: message.channel,
      threadTs: message.thread_ts ?? message.ts,
      text: buildMeetingUploadThreadText({ file, uploader })
    };
  }

  return {
    handleMeetingFileMessage
  };
}
