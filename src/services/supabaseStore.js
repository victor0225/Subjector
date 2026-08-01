const OPEN_TASK_STATUSES = [
  '미시작',
  '수락',
  '오늘은 여기까지',
  '추가 진행 예정',
  '보완 필요',
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
    externalKey: row.external_key,
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

  const message = {
    channelId: row.channel_id,
    messageTs: row.message_ts,
    threadTs: row.thread_ts
  };

  if (row.purpose) {
    message.purpose = row.purpose;
  }

  return message;
}

function appendContextText(currentValue, addition) {
  const current = String(currentValue ?? '').trim();
  const next = String(addition ?? '').trim();
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  if (current.includes(next)) {
    return current;
  }
  return `${current}\n- ${next}`;
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
    parsedSummary: row.parsed_summary ?? {},
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

function mapCodexPrompt(row) {
  if (!row) {
    return null;
  }

  return {
    taskId: row.task_id,
    prompt: row.prompt,
    slackChannelId: row.slack_channel_id,
    slackMessageTs: row.slack_message_ts,
    createdAt: row.created_at
  };
}

function mapMeeting(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    sourceChannelId: row.source_channel_id,
    sourceMessageTs: row.source_message_ts,
    status: row.status,
    speakerMapping: row.speaker_mapping ?? {},
    summary: row.summary ?? {}
  };
}

function candidateCompletionCriteria(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  const text = String(value ?? '').trim();
  return text ? [text] : [];
}

function mergeEditedCandidate(candidate, editedCandidate = {}) {
  const title = String(editedCandidate.title ?? '').trim();
  const why = String(editedCandidate.why ?? '').trim();
  const completionCriteria = candidateCompletionCriteria(editedCandidate.completionCriteria);

  return {
    ...candidate,
    title: title || candidate.title,
    context: {
      ...(candidate.context ?? {}),
      why: why || candidate.context?.why,
      completionCriteria: completionCriteria.length > 0
        ? completionCriteria
        : candidate.context?.completionCriteria
    }
  };
}

function candidateTaskExternalKey({ meeting, candidateIndex }) {
  return `meeting:${meeting.id}:candidate:${candidateIndex}`;
}

function candidateTaskRow({ meeting, candidate, candidateIndex }) {
  return {
    external_key: candidateTaskExternalKey({ meeting, candidateIndex }),
    assignee_user_key: candidate.assigneeUserKey,
    title: candidate.title,
    status: '미시작',
    importance: candidate.importance,
    coordination: candidate.coordination,
    source_type: 'meeting',
    source_id: meeting.id,
    context: {
      ...(candidate.context ?? {}),
      meetingCandidateIndex: candidateIndex
    }
  };
}

function meetingStatusAfterCandidateReview(taskCandidates) {
  return taskCandidates.every((candidate) => Boolean(candidate.review?.status) && candidate.review.status !== 'pending')
    ? 'candidate_reviewed'
    : 'needs_candidate_review';
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

  async function createMeetingFromAudioUpload({ sourceChannelId, sourceMessageTs, uploaderUserKey, audioFileName }) {
    const result = await supabase
      .from('meetings')
      .insert({
        source_channel_id: sourceChannelId,
        source_message_ts: sourceMessageTs,
        uploader_user_key: uploaderUserKey,
        status: 'uploaded',
        audio_file_name: audioFileName
      });

    throwIfError(result, 'Failed to create meeting from audio upload');
  }

  async function createMeetingFromRawText({ sourceChannelId, sourceMessageTs, uploaderUserKey, rawText, participantUserKeys, roadmapReflection = null }) {
    const result = await supabase
      .from('meetings')
      .insert({
        source_channel_id: sourceChannelId,
        source_message_ts: sourceMessageTs,
        uploader_user_key: uploaderUserKey,
        status: 'needs_participant_input',
        summary: {
          rawText,
          participantUserKeys,
          participantTaskInputs: {},
          ...(roadmapReflection ? { roadmapReflection } : {}),
          transcript: {
            meetingTitle: '수동 회의 기록',
            conciseSummary: rawText,
            speakers: [],
            segments: [
              {
                speaker: uploaderUserKey,
                text: rawText
              }
            ],
            decisions: [],
            actionItems: []
          }
        }
      });

    throwIfError(result, 'Failed to create meeting from raw text');
  }

  async function updateMeetingBySource({ sourceChannelId, sourceMessageTs, update, context }) {
    const result = await supabase
      .from('meetings')
      .update(update)
      .eq('source_channel_id', sourceChannelId)
      .eq('source_message_ts', sourceMessageTs);

    throwIfError(result, context);
  }

  async function markMeetingTranscribing({ sourceChannelId, sourceMessageTs }) {
    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'transcribing',
        error_message: null
      },
      context: 'Failed to mark meeting transcribing'
    });
  }

  async function completeMeetingTranscription({ sourceChannelId, sourceMessageTs, transcript }) {
    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'needs_speaker_mapping',
        summary: {
          transcript
        },
        error_message: null
      },
      context: 'Failed to complete meeting transcription'
    });
  }

  async function failMeetingTranscription({ sourceChannelId, sourceMessageTs, errorMessage }) {
    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'transcription_failed',
        error_message: errorMessage
      },
      context: 'Failed to mark meeting transcription failed'
    });
  }

  async function getMeetingBySource({ sourceChannelId, sourceMessageTs }) {
    const result = await supabase
      .from('meetings')
      .select('id,source_channel_id,source_message_ts,status,speaker_mapping,summary')
      .eq('source_channel_id', sourceChannelId)
      .eq('source_message_ts', sourceMessageTs)
      .maybeSingle();

    throwIfError(result, 'Failed to get meeting by source');
    return mapMeeting(result.data);
  }

  async function listRecentMeetingContexts({ limit = 5 } = {}) {
    const result = await supabase
      .from('meetings')
      .select('id,status,audio_file_name,summary,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    throwIfError(result, 'Failed to list recent meeting contexts');
    return result.data
      .map((row) => {
        const transcript = row.summary?.transcript ?? {};
        const title = transcript.meetingTitle || row.audio_file_name || '회의 기록';
        const summary = transcript.conciseSummary || row.summary?.rawText || '';
        const decisions = Array.isArray(transcript.decisions) ? transcript.decisions : [];
        const actionItems = Array.isArray(transcript.actionItems) ? transcript.actionItems : [];
        const pieces = [
          `회의: ${title}`,
          summary ? `요약: ${summary}` : '',
          decisions.length ? `결정: ${decisions.slice(0, 5).join(' / ')}` : '',
          actionItems.length ? `확인할 것: ${actionItems.slice(0, 5).join(' / ')}` : ''
        ].filter(Boolean);

        return pieces.join('\n');
      })
      .filter(Boolean);
  }

  async function listRecentRoadmapReflections({ limit = 10 } = {}) {
    const result = await supabase
      .from('meetings')
      .select('source_message_ts,summary,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    throwIfError(result, 'Failed to list recent roadmap reflections');
    return result.data
      .map((row) => {
        const reflection = row.summary?.roadmapReflection;
        const cards = Array.isArray(reflection?.cards) ? reflection.cards : [];
        if (cards.length === 0) return null;
        const primary = cards[0];
        return {
          externalId: `roadmap-reflection-${row.source_message_ts}`,
          parentExternalId: '',
          sourceType: 'roadmap-reflection',
          title: `회의 반영: ${primary.title || '애매함 검토'}`,
          text: primary.suggestion || primary.body || row.summary?.rawText || '',
          cards
        };
      })
      .filter(Boolean);
  }

  async function saveMeetingSpeakerMapping({ sourceChannelId, sourceMessageTs, speakerLabel, userKey }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const speakerMapping = {
      ...(meeting?.speakerMapping ?? {}),
      [speakerLabel]: userKey
    };

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        speaker_mapping: speakerMapping,
        status: 'needs_speaker_mapping'
      },
      context: 'Failed to save meeting speaker mapping'
    });

    return {
      speakerMapping,
      meeting: {
        ...meeting,
        speakerMapping
      }
    };
  }

  async function saveMeetingTaskCandidates({ sourceChannelId, sourceMessageTs, taskCandidates }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const summary = {
      ...(meeting?.summary ?? {}),
      taskCandidates
    };

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'needs_task_approval',
        summary
      },
      context: 'Failed to save meeting task candidates'
    });
  }

  async function requestMeetingParticipantTaskInputs({ sourceChannelId, sourceMessageTs, participantUserKeys }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const summary = {
      ...(meeting?.summary ?? {}),
      participantUserKeys,
      participantTaskInputs: meeting?.summary?.participantTaskInputs ?? {}
    };

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'needs_participant_input',
        summary
      },
      context: 'Failed to request meeting participant task inputs'
    });

    return {
      ...meeting,
      status: 'needs_participant_input',
      summary
    };
  }

  async function saveMeetingParticipantTaskInput({ sourceChannelId, sourceMessageTs, userKey, rawText }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const participantUserKeys = meeting?.summary?.participantUserKeys ?? [];
    const participantTaskInputs = {
      ...(meeting?.summary?.participantTaskInputs ?? {}),
      [userKey]: rawText
    };
    const remainingUserKeys = participantUserKeys.filter((participantUserKey) => !participantTaskInputs[participantUserKey]);
    const summary = {
      ...(meeting?.summary ?? {}),
      participantUserKeys,
      participantTaskInputs
    };

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: remainingUserKeys.length === 0 ? 'participant_inputs_ready' : 'needs_participant_input',
        summary
      },
      context: 'Failed to save meeting participant task input'
    });

    return {
      meeting: {
        ...meeting,
        status: remainingUserKeys.length === 0 ? 'participant_inputs_ready' : 'needs_participant_input',
        summary
      },
      remainingUserKeys
    };
  }

  async function saveMeetingTaskCandidatesForReview({ sourceChannelId, sourceMessageTs, taskCandidates }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const summary = {
      ...(meeting?.summary ?? {}),
      taskCandidates: taskCandidates.map((candidate) => ({
        ...candidate,
        review: candidate.review ?? { status: 'pending' }
      }))
    };

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'needs_candidate_review',
        summary
      },
      context: 'Failed to save meeting task candidates for review'
    });

    return {
      ...meeting,
      status: 'needs_candidate_review',
      summary
    };
  }

  async function getMeetingTaskCandidate({ sourceChannelId, sourceMessageTs, candidateIndex }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const index = Number(candidateIndex);
    const taskCandidate = meeting?.summary?.taskCandidates?.[index] ?? null;

    return {
      meeting,
      taskCandidate,
      candidateIndex: index
    };
  }

  async function reviewMeetingTaskCandidate({
    sourceChannelId,
    sourceMessageTs,
    candidateIndex,
    reviewedByUserKey,
    decision,
    editedCandidate = null
  }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const index = Number(candidateIndex);
    const taskCandidates = [...(meeting?.summary?.taskCandidates ?? [])];
    const existingCandidate = taskCandidates[index];

    if (!existingCandidate) {
      throw new Error('Meeting task candidate not found');
    }

    if (existingCandidate.review?.status && existingCandidate.review.status !== 'pending') {
      return {
        taskCandidate: existingCandidate,
        alreadyReviewed: true
      };
    }

    const acceptedCandidate = editedCandidate
      ? mergeEditedCandidate(existingCandidate, editedCandidate)
      : existingCandidate;

    if (decision === 'accepted' || decision === 'edited_accepted') {
      const upsert = await supabase
        .from('tasks')
        .upsert(candidateTaskRow({
          meeting,
          candidate: acceptedCandidate,
          candidateIndex: index
        }), {
          onConflict: 'external_key',
          ignoreDuplicates: true
        });

      throwIfError(upsert, 'Failed to create reviewed meeting task');
    }

    const reviewedCandidate = {
      ...acceptedCandidate,
      review: {
        status: decision,
        reviewedByUserKey,
        reviewedAt: new Date().toISOString()
      }
    };
    taskCandidates[index] = reviewedCandidate;
    const summary = {
      ...(meeting?.summary ?? {}),
      taskCandidates
    };

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: meetingStatusAfterCandidateReview(taskCandidates),
        summary
      },
      context: 'Failed to review meeting task candidate'
    });

    return {
      taskCandidate: reviewedCandidate,
      alreadyReviewed: false
    };
  }

  async function approveMeetingTasks({ sourceChannelId, sourceMessageTs }) {
    const meeting = await getMeetingBySource({ sourceChannelId, sourceMessageTs });
    const taskCandidates = meeting?.summary?.taskCandidates ?? [];

    const rows = taskCandidates.map((task) => ({
      assignee_user_key: task.assigneeUserKey,
      title: task.title,
      status: '미시작',
      importance: task.importance,
      coordination: task.coordination,
      source_type: 'meeting',
      source_id: meeting.id,
      context: task.context ?? {}
    }));

    if (rows.length > 0) {
      const insert = await supabase
        .from('tasks')
        .insert(rows);

      throwIfError(insert, 'Failed to create meeting tasks');
    }

    await updateMeetingBySource({
      sourceChannelId,
      sourceMessageTs,
      update: {
        status: 'tasks_created'
      },
      context: 'Failed to mark meeting tasks created'
    });

    return {
      taskCandidates
    };
  }

  async function createIdeaCruiseTask({ assigneeUserKey, title, importance, context = {} }) {
    const result = await supabase
      .from('tasks')
      .insert({
        assignee_user_key: assigneeUserKey,
        title,
        status: '미시작',
        importance,
        coordination: '🟡 중',
        source_type: 'idea_cruise',
        source_id: null,
        context
      });

    throwIfError(result, 'Failed to create IDEA CRUISE task');
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

  async function archiveTestTasks({ keyword = '테스트' }) {
    const result = await supabase
      .from('tasks')
      .update({ status: '보관' })
      .ilike('title', `%${keyword}%`)
      .in('status', OPEN_TASK_STATUSES);

    throwIfError(result, 'Failed to archive test tasks');
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
      .select('id,assignee_user_key,title,status,importance,coordination,source_type,context,created_at')
      .order('created_at', { ascending: true })
      .limit(limit);

    throwIfError(result, 'Failed to list all tasks');
    return result.data.map(mapTask);
  }

  async function updateIdeaCruiseTaskContext({
    taskId,
    addNeededInfo = '',
    doneCriteriaChange = '',
    includeDoneCriteriaChange = false,
    meetingRecord = ''
  }) {
    const existingResult = await supabase
      .from('tasks')
      .select('id,assignee_user_key,context')
      .eq('id', taskId)
      .maybeSingle();

    throwIfError(existingResult, 'Failed to read IDEA CRUISE task for update');
    if (!existingResult.data) {
      throw new Error('Failed to read IDEA CRUISE task for update: task not found');
    }

    const context = existingResult.data.context ?? {};
    const boost = {
      addNeededInfo,
      doneCriteriaChange: includeDoneCriteriaChange ? doneCriteriaChange : '',
      includeDoneCriteriaChange: Boolean(includeDoneCriteriaChange),
      meetingRecord,
      createdAt: new Date().toISOString()
    };
    const nextContext = {
      ...context,
      source: context.source ?? 'IDEA CRUISE',
      neededInfo: appendContextText(context.neededInfo, addNeededInfo),
      doneCriteria: includeDoneCriteriaChange
        ? appendContextText(context.doneCriteria, doneCriteriaChange)
        : (context.doneCriteria ?? ''),
      ideaCruiseBoosts: [
        ...(Array.isArray(context.ideaCruiseBoosts) ? context.ideaCruiseBoosts : []),
        boost
      ]
    };

    const updateResult = await supabase
      .from('tasks')
      .update({ context: nextContext })
      .eq('id', taskId);

    throwIfError(updateResult, 'Failed to update IDEA CRUISE task context');

    return {
      assigneeUserKey: existingResult.data.assignee_user_key
    };
  }

  async function updateTaskContextFromChange({
    taskId,
    proposerUserKey,
    why = '',
    neededInfo = '',
    doneCriteria = '',
    rawText = ''
  }) {
    const existingResult = await supabase
      .from('tasks')
      .select('id,assignee_user_key,context')
      .eq('id', taskId)
      .maybeSingle();

    throwIfError(existingResult, 'Failed to read task for change context update');
    if (!existingResult.data) {
      throw new Error('Failed to read task for change context update: task not found');
    }

    const context = existingResult.data.context ?? {};
    const changeRecord = {
      proposerUserKey,
      why,
      neededInfo,
      doneCriteria,
      rawText,
      createdAt: new Date().toISOString()
    };
    const nextContext = {
      ...context,
      why: String(why || context.why || context.reason || '').trim(),
      neededInfo: String(neededInfo || context.neededInfo || '').trim(),
      doneCriteria: String(doneCriteria || context.doneCriteria || context.completionCriteria || '').trim(),
      changeHistory: [
        ...(Array.isArray(context.changeHistory) ? context.changeHistory : []),
        changeRecord
      ]
    };

    const updateResult = await supabase
      .from('tasks')
      .update({ context: nextContext })
      .eq('id', taskId);

    throwIfError(updateResult, 'Failed to update task context from change request');

    return {
      taskId,
      assigneeUserKey: existingResult.data.assignee_user_key,
      context: nextContext
    };
  }

  async function updateTaskContextFromCleanup({
    taskId,
    cleanedByUserKey,
    cleanupType = '',
    reason = '',
    rawText = ''
  }) {
    const existingResult = await supabase
      .from('tasks')
      .select('id,assignee_user_key,context')
      .eq('id', taskId)
      .maybeSingle();

    throwIfError(existingResult, 'Failed to read task for cleanup context update');
    if (!existingResult.data) {
      throw new Error('Failed to read task for cleanup context update: task not found');
    }

    const context = existingResult.data.context ?? {};
    const cleanupRecord = {
      cleanedByUserKey,
      cleanupType,
      reason,
      rawText,
      createdAt: new Date().toISOString()
    };
    const nextContext = {
      ...context,
      cleanupHistory: [
        ...(Array.isArray(context.cleanupHistory) ? context.cleanupHistory : []),
        cleanupRecord
      ],
      changeHistory: [
        ...(Array.isArray(context.changeHistory) ? context.changeHistory : []),
        {
          type: 'cleanup',
          cleanupType,
          reason,
          rawText,
          proposerUserKey: cleanedByUserKey,
          createdAt: cleanupRecord.createdAt
        }
      ]
    };

    const updateResult = await supabase
      .from('tasks')
      .update({ context: nextContext })
      .eq('id', taskId);

    throwIfError(updateResult, 'Failed to update task context from cleanup');

    return {
      taskId,
      assigneeUserKey: existingResult.data.assignee_user_key,
      context: nextContext
    };
  }

  async function findSlackMessage({ purpose, channelId = null }) {
    let query = supabase
      .from('slack_messages')
      .select('purpose,channel_id,message_ts,thread_ts')
      .eq('purpose', purpose);

    if (channelId) {
      query = query.eq('channel_id', channelId);
    }

    const result = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result, 'Failed to find Slack message');
    return mapSlackMessage(result.data);
  }

  async function listTaskDetailMessagesForThread({ channelId, threadTs }) {
    const result = await supabase
      .from('slack_messages')
      .select('purpose,channel_id,message_ts,thread_ts')
      .eq('channel_id', channelId)
      .eq('thread_ts', threadTs)
      .like('purpose', 'task_detail:%')
      .order('created_at', { ascending: true });

    throwIfError(result, 'Failed to list task detail Slack messages');
    return result.data.map(mapSlackMessage);
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

  async function submitTaskResult({ taskId, resultType, rawText, submittedByUserKey, parsedSummary = {} }) {
    const result = await supabase
      .from('task_results')
      .insert({
        task_id: taskId,
        result_type: resultType,
        raw_text: rawText,
        submitted_by_user_key: submittedByUserKey,
        parsed_summary: parsedSummary
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

  async function getLatestCodexPromptForTask(taskId) {
    const result = await supabase
      .from('codex_prompts')
      .select('task_id,prompt,slack_channel_id,slack_message_ts,created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result, 'Failed to get latest Codex prompt');
    return mapCodexPrompt(result.data);
  }

  async function listDailyTaskResultsForUser({ userKey, fromIso, toIso }) {
    const result = await supabase
      .from('task_results')
      .select('task_id,result_type,raw_text,parsed_summary,created_at,tasks(title)')
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
      .select('task_id,result_type,raw_text,parsed_summary,created_at,tasks(title)')
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

  async function createFinalsUpdate({ workDate, preview, approvedByUserKey = null, approvedAt = null }) {
    const result = await supabase
      .from('finals_updates')
      .insert({
        work_date: workDate,
        status: '승인됨',
        preview,
        approved_by_user_key: approvedByUserKey,
        approved_at: approvedAt
      });

    throwIfError(result, 'Failed to create finals update');
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

  async function deleteSlackMessage({ channelId, messageTs }) {
    const result = await supabase
      .from('slack_messages')
      .delete()
      .eq('channel_id', channelId)
      .eq('message_ts', messageTs);

    throwIfError(result, 'Failed to delete Slack message record');
  }

  return {
    startWorkSession,
    endWorkSession,
    createMeetingFromAudioUpload,
    createMeetingFromRawText,
    listRecentRoadmapReflections,
    markMeetingTranscribing,
    completeMeetingTranscription,
    failMeetingTranscription,
    getMeetingBySource,
    listRecentMeetingContexts,
    saveMeetingSpeakerMapping,
    saveMeetingTaskCandidates,
    requestMeetingParticipantTaskInputs,
    saveMeetingParticipantTaskInput,
    saveMeetingTaskCandidatesForReview,
    getMeetingTaskCandidate,
    reviewMeetingTaskCandidate,
    approveMeetingTasks,
    createIdeaCruiseTask,
    listEndedWorkSessionsForDate,
    listOpenTasksForUser,
    markAcceptedTasksUnresolvedForUser,
    archiveTestTasks,
    listDailyTasksForUser,
    listAllTasks,
    updateIdeaCruiseTaskContext,
    updateTaskContextFromChange,
    updateTaskContextFromCleanup,
    findSlackMessage,
    listTaskDetailMessagesForThread,
    getTaskById,
    submitTaskResult,
    createCodexPrompt,
    getLatestCodexPromptForTask,
    listDailyTaskResultsForUser,
    listAllTaskResults,
    createChangeRequest,
    listDailyChangeRequestsForUser,
    listAllChangeRequests,
    createFinalsPreview,
    createFinalsUpdate,
    getLatestFinalsPreview,
    getFinalsUpdateForDate,
    approveFinalsUpdate,
    updateTaskStatus,
    upsertSlackMessage,
    deleteSlackMessage
  };
}
