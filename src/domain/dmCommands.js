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
    '- `출근`: Slack/서버 연결을 확인합니다. #in-process 갱신은 다음 구현 단계에서 연결됩니다.',
    '- `퇴근`: Slack/서버 연결을 확인합니다. 오늘 요약 생성은 다음 구현 단계에서 연결됩니다.',
    '- `finals 업데이트`: 수현님만 사용할 수 있는 명령입니다. #finals 미리보기 생성은 다음 구현 단계에서 연결됩니다.'
  ].join('\n');
}

export function handleDmCommand({ text, user, config }) {
  const command = normalizeCommand(text);
  const displayName = formatDisplayName(user);

  if (command === '출근') {
    return {
      type: 'start_work',
      text: `${displayName}, 출근 명령을 확인했습니다. Slack/Render 연결은 정상입니다. #in-process task 갱신은 다음 구현 단계에서 연결됩니다.`,
      updateInProcess: false
    };
  }

  if (command === '퇴근') {
    return {
      type: 'end_work',
      text: `${displayName}, 퇴근 명령을 확인했습니다. 오늘 한 일 요약 생성은 다음 구현 단계에서 연결됩니다.`,
      createDailySummary: false
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
      text: `${displayName}, finals 업데이트 명령을 확인했습니다. #finals 미리보기 생성은 다음 구현 단계에서 연결됩니다.`,
      createFinalsPreview: false
    };
  }

  return {
    type: 'help',
    text: buildHelpText(displayName)
  };
}
