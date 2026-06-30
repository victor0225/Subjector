const OUTPUT_LEVEL_LABELS = new Map([
  ['quick_validation', '빠른 검증용'],
  ['internal_draft', '내부 사용 가능한 초안'],
  ['final_deliverable', '완성도 있는 최종 산출물']
]);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function markdownSection(title, value) {
  const lines = Array.isArray(value) ? value : normalizeList(value);
  if (lines.length === 0) {
    return `## ${title}\n- 아직 정리되지 않음`;
  }

  return `## ${title}\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

export function createAlignmentPacket(input = {}) {
  const outputLevel = normalizeText(input.outputLevel);

  return {
    title: normalizeText(input.title),
    purpose: normalizeText(input.purpose),
    outputLevel,
    outputLevelLabel: OUTPUT_LEVEL_LABELS.get(outputLevel) ?? '정하지 않음',
    successCriteria: normalizeText(input.successCriteria),
    mustDo: normalizeList(input.mustDo),
    canSkip: normalizeList(input.canSkip),
    assigneeDiscretion: normalizeList(input.assigneeDiscretion),
    handoffNotes: normalizeText(input.handoffNotes),
    ambiguousCriteria: normalizeList(input.ambiguousCriteria),
    leadQuestions: normalizeList(input.leadQuestions)
  };
}

export function detectAlignmentWarnings(packet) {
  const warnings = [];

  if (!packet.outputLevel || packet.outputLevelLabel === '정하지 않음') {
    warnings.push('산출물 수준이 아직 정해지지 않았습니다. 빠른 검증용인지, 내부 사용 가능한 초안인지, 최종 산출물인지 먼저 맞추면 작업 범위가 덜 흔들립니다.');
  }

  if (!packet.successCriteria) {
    warnings.push('성공 기준이 비어 있습니다. 무엇이 되면 충분한지 한 문장으로 정하면 담당자가 과하게 만들거나 너무 적게 조사하는 일을 줄일 수 있습니다.');
  }

  if (!packet.handoffNotes) {
    warnings.push('다음 사람이 이어받을 정보가 아직 없습니다. 다음 사람이 무엇을 보고 바로 움직이면 되는지 적어두면 재검색과 재설명을 줄일 수 있습니다.');
  }

  if (packet.mustDo.length === 0 && packet.canSkip.length === 0) {
    warnings.push('반드시 해야 할 것과 생략해도 되는 것이 나뉘지 않았습니다. 이 둘을 나누면 성실한 작업이 불필요한 완성도 경쟁으로 흐르는 것을 막을 수 있습니다.');
  }

  return warnings;
}

export function buildAlignmentMarkdown(packet) {
  return [
    '# IDEA CRUISE 기준 정렬 패킷',
    '',
    '## Task',
    packet.title || '제목 없음',
    '',
    '## 목적',
    packet.purpose || '아직 정리되지 않음',
    '',
    '## 산출물 수준',
    packet.outputLevelLabel,
    '',
    '## 성공 기준',
    packet.successCriteria || '아직 정리되지 않음',
    '',
    markdownSection('반드시 해야 하는 것', packet.mustDo),
    '',
    markdownSection('생략해도 되는 것', packet.canSkip),
    '',
    markdownSection('담당자 재량 영역', packet.assigneeDiscretion),
    '',
    '## 다음 사람에게 넘길 정보',
    packet.handoffNotes || '아직 정리되지 않음',
    '',
    markdownSection('아직 애매한 기준', packet.ambiguousCriteria),
    '',
    markdownSection('팀장에게 확인할 질문', packet.leadQuestions)
  ].join('\n');
}
