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
    '- `출근`: 오늘 업무 시작을 기록하고 #in-process task 영역을 만들거나 갱신합니다.',
    '- `최신화`: 출근 기록은 건드리지 않고 #in-process task 영역만 갱신합니다.',
    '- `퇴근`: 오늘 한 일 요약을 DM으로 받습니다.',
    '- `finals 업데이트`: 수현님만 사용할 수 있는 명령입니다. #finals 미리보기 생성은 다음 구현 단계에서 연결됩니다.'
  ].join('\n');
}

export function handleDmCommand({ text, user, config }) {
  const command = normalizeCommand(text);
  const displayName = formatDisplayName(user);

  if (command === '출근') {
    return {
      type: 'start_work',
      text: `${displayName}, 출근 명령을 확인했습니다. #in-process task 영역을 업데이트하겠습니다.`,
      updateInProcess: true
    };
  }

  if (command === '최신화') {
    return {
      type: 'refresh_in_process',
      text: `${displayName}, 최신화 명령을 확인했습니다. #in-process task 영역을 갱신하겠습니다.`,
      refreshInProcess: true
    };
  }

  if (command === '퇴근') {
    return {
      type: 'end_work',
      text: `${displayName}, 퇴근 명령을 확인했습니다. 오늘 한 일 요약을 생성하겠습니다.`,
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
      text: `${displayName}, finals 업데이트 명령을 확인했습니다. #finals 누적 업데이트 미리보기를 생성하겠습니다.`,
      createFinalsPreview: true
    };
  }

  return {
    type: 'help',
    text: buildHelpText(displayName)
  };
}
