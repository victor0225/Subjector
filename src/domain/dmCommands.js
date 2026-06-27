import { formatDisplayName } from './users.js';

export function normalizeCommand(text) {
  return String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildHelpText(displayName) {
  return [
    `${displayName}, 사용할 수 있는 명령어입니다.`,
    '',
    '- `출근`: 오늘 할 일 맥락을 받고 #in-process를 갱신합니다.',
    '- `퇴근`: 오늘 한 일 요약을 받습니다.',
    '- `finals 업데이트`: 수현님만 사용할 수 있는 #finals 미리보기 강제 생성 명령입니다.'
  ].join('\n');
}

export function handleDmCommand({ text, user, config }) {
  const command = normalizeCommand(text);
  const displayName = formatDisplayName(user);

  if (command === '출근') {
    return {
      type: 'start_work',
      text: `${displayName}, 오늘 할 일 맥락을 정리했습니다. #in-process에도 최신 task를 반영하겠습니다.`,
      updateInProcess: true
    };
  }

  if (command === '퇴근') {
    return {
      type: 'end_work',
      text: `${displayName}, 오늘 한 일 요약입니다. 완료, 오늘은 여기까지, 미정리 task를 함께 정리하겠습니다.`,
      createDailySummary: true
    };
  }

  if (command === 'finals 업데이트') {
    if (user?.key !== config.leadUserKey) {
      return {
        type: 'not_allowed',
        text: `${displayName}, finals 업데이트는 수현님만 실행할 수 있습니다.`
      };
    }

    return {
      type: 'force_finals_preview',
      text: `${displayName}, #finals 업데이트 미리보기를 생성하겠습니다.`,
      createFinalsPreview: true
    };
  }

  return {
    type: 'help',
    text: buildHelpText(displayName)
  };
}
