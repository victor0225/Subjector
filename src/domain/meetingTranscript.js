function asString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeSpeaker(value, index) {
  const label = asString(value?.label, `Speaker ${String.fromCharCode(65 + index)}`);

  return {
    label,
    evidence: asString(value?.evidence)
  };
}

function normalizeSegment(value) {
  return {
    speaker: asString(value?.speaker, 'Speaker A'),
    startTime: asString(value?.startTime),
    endTime: asString(value?.endTime),
    text: asString(value?.text)
  };
}

export function normalizeMeetingTranscript(value = {}) {
  return {
    meetingTitle: asString(value.meetingTitle, '회의 전사'),
    conciseSummary: asString(value.conciseSummary),
    speakers: Array.isArray(value.speakers)
      ? value.speakers.map(normalizeSpeaker).filter((speaker) => speaker.label)
      : [],
    segments: Array.isArray(value.segments)
      ? value.segments.map(normalizeSegment).filter((segment) => segment.text)
      : [],
    decisions: asStringArray(value.decisions),
    actionItems: asStringArray(value.actionItems),
    openQuestions: asStringArray(value.openQuestions)
  };
}

export function buildMeetingTranscriptionReadyText({ transcript }) {
  const normalized = normalizeMeetingTranscript(transcript);
  const summary = normalized.conciseSummary || '요약은 IDEA CRUISE 카드 생성 시 참고 맥락으로 사용됩니다.';

  return [
    '전사가 완료되었습니다.',
    `- 회의: ${normalized.meetingTitle}`,
    `- 요약: ${summary}`,
    '- 상태: IDEA CRUISE 참고 맥락 저장 완료',
    'IDEA CRUISE가 참고할 회의 맥락으로 저장했습니다. 자동 task 생성은 진행하지 않습니다.'
  ].join('\n');
}
