export function generateMeetingRecord({ entries = [], decisions = [] }) {
  const decisionLines = decisions.length > 0
    ? decisions.map((decision) => `- ${decision}`).join('\n')
    : entries.map((entry) => `- ${entry.text}`).join('\n');
  const evidenceLines = entries.map((entry) => `- ${entry.text}`).join('\n');

  return {
    channel: '#project-log',
    title: `[회의 결과문] ${new Date().toISOString().slice(0, 10)} IDEA CRUISE 회의`,
    body: [
      '[역할]',
      '이 회의 결과문은 task 생성 입력이 아니라 IDEA CRUISE가 어떤 판단으로 task를 만들었는지 남기는 감사 기록입니다.',
      '',
      '[확정 결정]',
      decisionLines,
      '',
      '[근거]',
      evidenceLines,
      '',
      '[Subjector 연계]',
      '- Subjector는 IDEA CRUISE가 승인한 task만 in-process로 반영합니다.'
    ].join('\n')
  };
}
