const PROMPT_CHUNK_LIMIT = 2900;

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

function chunkText(text, limit = PROMPT_CHUNK_LIMIT) {
  const chunks = [];
  let remaining = String(text ?? '');

  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf('\n', limit);
    if (splitAt < Math.floor(limit * 0.5)) {
      splitAt = limit;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.length ? chunks : [''];
}

function codeBlock(text) {
  return `\`\`\`\n${text}\n\`\`\``;
}

export function buildTextMessageBlocks(text) {
  return [
    {
      type: 'section',
      text: mrkdwn(text)
    }
  ];
}

export function buildFinalsPreviewBlocks(text) {
  return buildTextMessageBlocks(text);
}

export function buildCodexPromptBlocks({ taskId, prompt }) {
  const chunks = chunkText(prompt);

  return [
    {
      type: 'section',
      text: mrkdwn('*Codex 프롬프트가 생성되었습니다.*\n아래 버튼을 누르면 나에게만 복사용 본문이 다시 표시됩니다.')
    },
    {
      type: 'actions',
      block_id: `codex_prompt_actions_${taskId}`,
      elements: [
        {
          type: 'button',
          action_id: 'copy_codex_prompt',
          text: plainText('프롬프트 보기/복사'),
          value: taskId,
          style: 'primary'
        }
      ]
    },
    ...chunks.map((chunk, index) => ({
      type: 'section',
      block_id: `codex_prompt_body_${index + 1}`,
      text: mrkdwn(codeBlock(chunk))
    }))
  ];
}

export function buildCodexPromptCopyBlocks({ prompt }) {
  const chunks = chunkText(prompt);

  return [
    {
      type: 'section',
      text: mrkdwn('*Codex 프롬프트 복사용 본문*\nSlack 제한상 버튼이 직접 클립보드에 복사하지는 못합니다. 아래 본문을 선택해서 복사해 주세요.')
    },
    ...chunks.map((chunk, index) => ({
      type: 'section',
      block_id: `codex_prompt_copy_body_${index + 1}`,
      text: mrkdwn(codeBlock(chunk))
    }))
  ];
}
