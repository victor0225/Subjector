const OPEN_TASK_STATUSES = [
  '미시작',
  '수락',
  '완료',
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
    assigneeUserKey: row.assignee_user_key,
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

function mapWorkSession(row) {
  return {
    userKey: row.user_key,
    workDate: row.work_date,
    endedAt: row.ended_at
  };
}

function mapTaskResult(row) {
  return {
    taskId: row.task_id,
    taskTitle: row.tasks?.title ?? 'task',
    resultType: row.result_type,
    rawText: row.raw_text,
    createdAt: row.created_at
  };
}

function mapChangeRequest(row) {
  return {
    taskId: row.task_id,
    taskTitle: row.tasks?.title ?? 'task',
    status: row.status,
    rawText: row.raw_text,
    createdAt: row.created_at
  };
}

function mapFinalsPreview(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workDate: row.work_date,
    status: row.status,
    preview: row.preview ?? {},
    createdAt: row.created_at
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

  async function endWorkSession({ userKey, workDate, endedAt }) {
    const result = await supabase
      .from('daily_work_sessions')
      .upsert({
        user_key: userKey,
        work_date: workDate,
        ended_at: endedAt
      }, {
        onConflict: 'user_key,work_date'
      });

    throwIfError(result, 'Failed to end work session');
  }

  async function listEndedWorkSessionsForDate({ workDate }) {
    const result = await supabase
      .from('daily_work_sessions')
      .select('user_key,work_date,ended_at')
      .eq('work_date', workDate)
      .order('ended_at', { ascending: true });

    throwIfError(result, 'Failed to list ended work sessions');
    return result.data.map(mapWorkSession).filter((session) => session.endedAt);
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

  async function markAcceptedTasksUnresolvedForUser({ userKey }) {
    const result = await supabase
      .from('tasks')
      .update({ status: '미정리' })
      .eq('assignee_user_key', userKey)
      .eq('status', '수락');

    throwIfError(result, 'Failed to mark accepted tasks unresolved');
  }

  async function listDailyTasksForUser({ userKey }) {
    const result = await supabase
      .from('tasks')
      .select('id,title,status,importance,coordination,source_type,context,created_at')
      .eq('assignee_user_key', userKey)
      .in('status', OPEN_TASK_STATUSES)
      .order('created_at', { ascending: true })
      .limit(20);

    throwIfError(result, 'Failed to list daily tasks');
    return result.data.map(mapTask);
  }

  async function listAllTasks({ limit = 100 } = {}) {
    const result = await supabase
      .from('tasks')
      .select('id,title,status,importance,coordination,source_type,context,created_at')
      .order('created_at', { ascending: true })
      .limit(limit);

    throwIfError(result, 'Failed to list all tasks');
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

  async function getTaskById(taskId) {
    const result = await supabase
      .from('tasks')
      .select('id,assignee_user_key,title,status,importance,coordination,source_type,context,created_at')
      .eq('id', taskId)
      .maybeSingle();

    throwIfError(result, 'Failed to get task');
    return mapTask(result.data);
  }

  async function submitTaskResult({ taskId, resultType, rawText, submittedByUserKey }) {
    const result = await supabase
      .from('task_results')
      .insert({
        task_id: taskId,
        result_type: resultType,
        raw_text: rawText,
        submitted_by_user_key: submittedByUserKey
      });

    throwIfError(result, 'Failed to submit task result');
  }

  async function createCodexPrompt({ taskId, prompt, slackChannelId, slackMessageTs }) {
    const result = await supabase
      .from('codex_prompts')
      .insert({
        task_id: taskId,
        prompt,
        slack_channel_id: slackChannelId,
        slack_message_ts: slackMessageTs
      });

    throwIfError(result, 'Failed to create Codex prompt');
  }

  async function listDailyTaskResultsForUser({ userKey, fromIso, toIso }) {
    const result = await supabase
      .from('task_results')
      .select('task_id,result_type,raw_text,created_at,tasks(title)')
      .eq('submitted_by_user_key', userKey)
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: true });

    throwIfError(result, 'Failed to list daily task results');
    return result.data.map(mapTaskResult);
  }

  async function listAllTaskResults({ limit = 100 } = {}) {
    const result = await supabase
      .from('task_results')
      .select('task_id,result_type,raw_text,created_at,tasks(title)')
      .order('created_at', { ascending: true })
      .limit(limit);

    throwIfError(result, 'Failed to list all task results');
    return result.data.map(mapTaskResult);
  }

  async function createChangeRequest({ taskId, proposerUserKey, rawText }) {
    const result = await supabase
      .from('change_requests')
      .insert({
        task_id: taskId,
        proposer_user_key: proposerUserKey,
        status: '투표 중',
        raw_text: rawText
      });

    throwIfError(result, 'Failed to create change request');
  }

  async function listDailyChangeRequestsForUser({ userKey, fromIso, toIso }) {
    const result = await supabase
      .from('change_requests')
      .select('task_id,status,raw_text,created_at,tasks(title)')
      .eq('proposer_user_key', userKey)
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: true });

    throwIfError(result, 'Failed to list daily change requests');
    return result.data.map(mapChangeRequest);
  }

  async function listAllChangeRequests({ limit = 100 } = {}) {
    const result = await supabase
      .from('change_requests')
      .select('task_id,status,raw_text,created_at,tasks(title)')
      .order('created_at', { ascending: true })
      .limit(limit);

    throwIfError(result, 'Failed to list all change requests');
    return result.data.map(mapChangeRequest);
  }

  async function createFinalsPreview({ workDate, preview }) {
    const result = await supabase
      .from('finals_updates')
      .insert({
        work_date: workDate,
        status: '미리보기',
        preview
      });

    throwIfError(result, 'Failed to create finals preview');
  }

  async function getLatestFinalsPreview() {
    const result = await supabase
      .from('finals_updates')
      .select('id,work_date,preview,created_at')
      .eq('status', '미리보기')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result, 'Failed to get latest finals preview');
    return mapFinalsPreview(result.data);
  }

  async function getFinalsUpdateForDate({ workDate }) {
    const result = await supabase
      .from('finals_updates')
      .select('id,work_date,status,preview,created_at')
      .eq('work_date', workDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result, 'Failed to get finals update for date');
    return mapFinalsPreview(result.data);
  }

  async function approveFinalsUpdate({ id, approvedByUserKey, approvedAt }) {
    const result = await supabase
      .from('finals_updates')
      .update({
        status: '승인됨',
        approved_by_user_key: approvedByUserKey,
        approved_at: approvedAt
      })
      .eq('id', id);

    throwIfError(result, 'Failed to approve finals update');
  }

  async function updateTaskStatus({ taskId, status, completedAt = null, acceptedAt = null }) {
    const update = { status };
    if (completedAt) {
      update.completed_at = completedAt;
    }
    if (acceptedAt) {
      update.accepted_at = acceptedAt;
    }

    const result = await supabase
      .from('tasks')
      .update(update)
      .eq('id', taskId);

    throwIfError(result, 'Failed to update task status');
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
    endWorkSession,
    listEndedWorkSessionsForDate,
    listOpenTasksForUser,
    markAcceptedTasksUnresolvedForUser,
    listDailyTasksForUser,
    listAllTasks,
    findSlackMessage,
    getTaskById,
    submitTaskResult,
    createCodexPrompt,
    listDailyTaskResultsForUser,
    listAllTaskResults,
    createChangeRequest,
    listDailyChangeRequestsForUser,
    listAllChangeRequests,
    createFinalsPreview,
    getLatestFinalsPreview,
    getFinalsUpdateForDate,
    approveFinalsUpdate,
    updateTaskStatus,
    upsertSlackMessage
  };
}
