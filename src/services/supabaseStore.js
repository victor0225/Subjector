const OPEN_TASK_STATUSES = [
  '미시작',
  '수락',
  '오늘은 여기까지',
  '미정리',
  '변경 요청 중',
  '회의 필요'
];

function throwIfError(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
}

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    importance: row.importance,
    coordination: row.coordination,
    sourceType: row.source_type,
    context: row.context ?? {},
    createdAt: row.created_at
  };
}

function mapSlackMessage(row) {
  if (!row) {
    return null;
  }

  return {
    channelId: row.channel_id,
    messageTs: row.message_ts,
    threadTs: row.thread_ts
  };
}

export function createSupabaseStore(supabase) {
  async function startWorkSession({ userKey, workDate, startedAt }) {
    const result = await supabase
      .from('daily_work_sessions')
      .upsert({
        user_key: userKey,
        work_date: workDate,
        started_at: startedAt
      }, {
        onConflict: 'user_key,work_date'
      });

    throwIfError(result, 'Failed to start work session');
  }

  async function listOpenTasksForUser(userKey) {
    const result = await supabase
      .from('tasks')
      .select('id,title,status,importance,coordination,source_type,context,created_at')
      .eq('assignee_user_key', userKey)
      .in('status', OPEN_TASK_STATUSES)
      .order('created_at', { ascending: true })
      .limit(10);

    throwIfError(result, 'Failed to list open tasks');
    return result.data.map(mapTask);
  }

  async function findSlackMessage({ purpose, channelId }) {
    const result = await supabase
      .from('slack_messages')
      .select('channel_id,message_ts,thread_ts')
      .eq('purpose', purpose)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result, 'Failed to find Slack message');
    return mapSlackMessage(result.data);
  }

  async function upsertSlackMessage({ purpose, channelId, messageTs, threadTs }) {
    const result = await supabase
      .from('slack_messages')
      .upsert({
        purpose,
        channel_id: channelId,
        message_ts: messageTs,
        thread_ts: threadTs
      }, {
        onConflict: 'channel_id,message_ts'
      });

    throwIfError(result, 'Failed to upsert Slack message');
  }

  return {
    startWorkSession,
    listOpenTasksForUser,
    findSlackMessage,
    upsertSlackMessage
  };
}
