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
    '- `출근`: DM 개인 task 보드를 엽니다.',
    '- `퇴근`: DM 개인 task 보드를 접습니다.',
    '- `최신화`: 팀 전체 #in-process 진행 과정 보드를 한 번에 갱신합니다.',
    '- `로드맵 반영`: 수현님만 사용할 수 있는 명령입니다. #회의-결과록의 일반 메시지 "로드맵 반영 완료" 이후 자료를 IDEA CRUISE에 반영합니다.',
    '- `오늘 요약` 또는 `일일 정리`: 오늘 한 일 요약을 DM으로 받습니다.',
    '- `finals 업데이트`: 수현님만 사용할 수 있는 명령입니다. #finals 누적 정리를 바로 업데이트합니다.'
  ].join('\n');
}

export function handleDmCommand({ text, user, config }) {
  const command = normalizeCommand(text);
  const displayName = formatDisplayName(user);

  if (command === '출근') {
    return {
      type: 'start_work',
      text: `${displayName}, 출근 명령을 확인했습니다. DM 개인 task 보드를 열겠습니다.`,
      openPersonalTaskBoard: true
    };
  }

  if (command === '최신화' || command === '전체 최신화') {
    return {
      type: 'refresh_all_in_process',
      text: `${displayName}, 최신화 명령을 확인했습니다. 팀 전체 #in-process 팀 진행 과정 보드를 모두 갱신하겠습니다.`,
      refreshAllInProcess: true
    };
  }
  if (command === '로드맵 반영') {
    if (user?.key !== config.leadUserKey) {
      return {
        type: 'not_allowed',
        text: `${displayName}, 로드맵 반영은 수현님만 실행할 수 있습니다.`
      };
    }

    return {
      type: 'roadmap_reflection',
      text: `${displayName}, 로드맵 반영 명령을 확인했습니다. #회의-결과록의 일반 메시지 "로드맵 반영 완료" 이후 자료를 반영하겠습니다.`,
      reflectRoadmap: true
    };
  }

  if (command === '오늘 요약' || command === '일일 정리') {
    return {
      type: 'daily_summary',
      text: `${displayName}, 오늘 한 일 요약을 생성하겠습니다.`,
      createDailySummary: true
    };
  }

  if (command === '퇴근') {
    return {
      type: 'end_work',
      text: `${displayName}, 퇴근 명령을 확인했습니다. DM 개인 task 보드를 접겠습니다.`,
      closePersonalTaskBoard: true
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
      type: 'force_finals_update',
      text: `${displayName}, finals 업데이트 명령을 확인했습니다. #finals 누적 정리를 바로 반영하겠습니다.`,
      createFinalsUpdate: true
    };
  }

  return {
    type: 'help',
    text: buildHelpText(displayName)
  };
}
