const AUDIO_FILETYPES = new Set([
  'aac',
  'm4a',
  'mp3',
  'mp4',
  'mpeg',
  'mpeg4',
  'mpga',
  'mov',
  'wav'
]);

const AUDIO_EXTENSIONS = [
  '.aac',
  '.m4a',
  '.mp3',
  '.mp4',
  '.mpeg',
  '.mpeg4',
  '.mpga',
  '.mov',
  '.wav'
];

function normalized(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasAudioExtension(file) {
  const name = normalized(file?.name || file?.title);
  return AUDIO_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function isMeetingAudioFile(file) {
  if (!file) {
    return false;
  }

  const mimetype = normalized(file.mimetype);
  const filetype = normalized(file.filetype);

  return mimetype.startsWith('audio/')
    || AUDIO_FILETYPES.has(filetype)
    || hasAudioExtension(file);
}

export function getMeetingAudioFile(message) {
  return (message?.files ?? []).find(isMeetingAudioFile) ?? null;
}

export function isMeetingUploadMessage({ message, meetingChannelId }) {
  return Boolean(
    message
    && meetingChannelId
    && message.channel === meetingChannelId
    && message.user
    && !message.bot_id
    && message.subtype !== 'bot_message'
    && getMeetingAudioFile(message)
  );
}

export function buildMeetingUploadThreadText({ file, uploader }) {
  const fileName = file?.name || file?.title || '회의 녹음 파일';
  const uploaderName = uploader?.displayName ? `${uploader.displayName}님` : '등록되지 않은 사용자';

  return [
    '회의 녹음 업로드를 확인했습니다.',
    `- 업로더: ${uploaderName}`,
    `- 파일: ${fileName}`,
    '- 상태: 업로드 기록 완료',
    '다음 단계에서 전사를 진행하고 IDEA CRUISE 참고 맥락으로 저장합니다.'
  ].join('\n');
}
