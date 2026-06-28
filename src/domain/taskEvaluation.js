const VALID_VERDICTS = new Set(['sufficient', 'needs_revision', 'informational']);

function asArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

export function normalizeTaskEvaluation(raw = {}) {
  const verdict = VALID_VERDICTS.has(raw.verdict) ? raw.verdict : 'needs_revision';
  const score = Number.isInteger(raw.score)
    ? Math.max(0, Math.min(100, raw.score))
    : 0;

  return {
    verdict,
    score,
    summary: String(raw.summary ?? '검수 결과 요약 없음'),
    reasons: asArray(raw.reasons),
    missingItems: asArray(raw.missingItems),
    feedbackToUser: String(raw.feedbackToUser ?? '보완할 내용을 확인해 주세요.'),
    blocksCompletion: verdict === 'needs_revision'
  };
}

function bulletRows(items) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- 없음';
}

export function buildEvaluationFeedbackMessage({ actionLabel, taskTitle, finalStatus, evaluation }) {
  const normalized = normalizeTaskEvaluation(evaluation);

  return [
    `*${taskTitle}* ${actionLabel} 제출 검수 결과입니다.`,
    `상태: ${finalStatus}`,
    `점수: ${normalized.score}/100`,
    '',
    `[판정]`,
    normalized.summary,
    '',
    `[근거]`,
    bulletRows(normalized.reasons),
    '',
    `[보완 필요]`,
    bulletRows(normalized.missingItems),
    '',
    `[피드백]`,
    normalized.feedbackToUser
  ].join('\n');
}
