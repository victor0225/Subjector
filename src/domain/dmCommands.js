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
    '- `로드맵 반영`: 수현님만 사용할 수 있는 명령입니다. #회의-결과록의 일반 메시지 "로드맵 반영 완료" 이후 자료를 IDEA CRUISE에 반영합니다.',
    '- `퇴근`: 오늘 한 일 요약을 DM으로 받습니다.',
    '- `finals 업데이트`: 수현님만 사용할 수 있는 명령입니다. #finals 누적 정리를 바로 업데이트합니다.',
    '- `회의 기록: 내용`: 녹음 없이 회의 내용을 텍스트로 저장하고 IDEA CRUISE 참고 맥락으로 사용합니다.',
    '- `테스트 task 정리`: 수현님만 사용할 수 있는 명령입니다. 제목에 테스트가 들어간 task를 보관 처리합니다.'
  ].join('\n');
}

export function handleDmCommand({ text, user, config }) {
  const command = normalizeCommand(text);
  const displayName = formatDisplayName(user);
  const rawMeetingMatch = command.match(/^회의\s*(?:기록|결과)\s*[:：]\s*(.+)$/);

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
      type: 'force_finals_update',
      text: `${displayName}, finals 업데이트 명령을 확인했습니다. #finals 누적 정리를 바로 반영하겠습니다.`,
      createFinalsUpdate: true
    };
  }

  if (command === '테스트 task 정리') {
    if (user?.key !== config.leadUserKey) {
      return {
        type: 'not_allowed',
        text: `${displayName}, 테스트 task 정리는 수현님만 실행할 수 있습니다.`
      };
    }

    return {
      type: 'archive_test_tasks',
      text: `${displayName}, 테스트 task 정리 명령을 확인했습니다. 제목에 테스트가 들어간 task를 보관 처리하겠습니다.`,
      archiveTestTasks: true
    };
  }

  if (rawMeetingMatch?.[1]) {
    return {
      type: 'raw_meeting_text',
      text: `${displayName}, 회의 기록을 확인했습니다. 팀원 의견 입력 흐름을 시작하겠습니다.`,
      createRawMeeting: true,
      rawMeetingText: rawMeetingMatch[1].trim()
    };
  }

  return {
    type: 'help',
    text: buildHelpText(displayName)
  };
}
