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
  const summary = normalized.conciseSummary || '요약은 Speaker 매핑 이후 task 추출 단계에서 보강합니다.';

  return [
    '전사가 완료되었습니다.',
    `- 회의: ${normalized.meetingTitle}`,
    `- 요약: ${summary}`,
    '- 상태: Speaker A/B/C 매핑 필요',
    'task 추출 전, 아래 버튼으로 각 Speaker가 실제로 누구인지 지정해 주세요.'
  ].join('\n');
}
