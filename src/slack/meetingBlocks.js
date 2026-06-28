function mrkdwn(text) {
  return {
    type: 'mrkdwn',
    text
  };
}

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true
  };
}

function buttonValue({ sourceChannelId, sourceMessageTs, speakerLabel, userKey }) {
  return JSON.stringify({
    sourceChannelId,
    sourceMessageTs,
    speakerLabel,
    userKey
  });
}

function actionIdPart(value) {
  return String(value ?? '')
    .trim()
    .replaceAll(/[^A-Za-z0-9_-]/g, '_')
    .replaceAll(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function speakerMappingActionId({ speakerLabel, userKey }) {
  return `meeting_map_speaker_${actionIdPart(speakerLabel)}_${actionIdPart(userKey)}`;
}

export function buildSpeakerMappingBlocks({ text, transcript, users, sourceChannelId, sourceMessageTs }) {
  const blocks = [
    {
      type: 'section',
      text: mrkdwn(text)
    }
  ];

  for (const speaker of transcript.speakers) {
    blocks.push({
      type: 'section',
      text: mrkdwn(`*${speaker.label}*\n${speaker.evidence || '전사 내용 기준으로 실제 사람을 지정해 주세요.'}`)
    });

    blocks.push({
      type: 'actions',
      block_id: `meeting_map_${speaker.label.replaceAll(' ', '_')}`,
      elements: users.map((user) => ({
        type: 'button',
        action_id: speakerMappingActionId({
          speakerLabel: speaker.label,
          userKey: user.key
        }),
        text: plainText(`${user.displayName}님`),
        value: buttonValue({
          sourceChannelId,
          sourceMessageTs,
          speakerLabel: speaker.label,
          userKey: user.key
        })
      }))
    });
  }

  return blocks;
}
