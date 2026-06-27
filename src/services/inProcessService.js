import { buildInProcessBoardMessage, buildInProcessMessagePurpose, formatKstDate } from '../domain/inProcessBoard.js';
import { formatDisplayName } from '../domain/users.js';

export function createInProcessService({ store, slackClient, config, clock = () => new Date() }) {
  async function handleStartWork({ user }) {
    const now = clock();
    const workDate = formatKstDate(now);
    const channelId = config.channels.inProcess;
    const purpose = buildInProcessMessagePurpose(user);

    await store.startWorkSession({
      userKey: user.key,
      workDate,
      startedAt: now.toISOString()
    });

    const tasks = await store.listOpenTasksForUser(user.key);
    const message = buildInProcessBoardMessage({
      user,
      tasks,
      workDate
    });

    const existingMessage = await store.findSlackMessage({
      purpose,
      channelId
    });

    if (existingMessage?.messageTs) {
      await slackClient.chat.update({
        channel: channelId,
        ts: existingMessage.messageTs,
        text: message.text,
        blocks: message.blocks
      });

      return {
        action: 'updated',
        taskCount: tasks.length,
        dmText: `${formatDisplayName(user)}, 출근 확인했습니다. #in-process의 오늘 task 영역을 업데이트했습니다.`
      };
    }

    const posted = await slackClient.chat.postMessage({
      channel: channelId,
      text: message.text,
      blocks: message.blocks
    });

    await store.upsertSlackMessage({
      purpose,
      channelId,
      messageTs: posted.ts,
      threadTs: posted.ts
    });

    return {
      action: 'posted',
      taskCount: tasks.length,
      dmText: `${formatDisplayName(user)}, 출근 확인했습니다. #in-process에 오늘 task 영역을 만들었습니다.`
    };
  }

  return {
    handleStartWork
  };
}
