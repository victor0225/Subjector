import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseStore } from '../src/services/supabaseStore.js';

function createFakeSupabase({ tableData = {}, singleData = {}, errors = {} } = {}) {
  const calls = [];

  function query(table) {
    const builder = {
      select(columns) {
        calls.push([table, 'select', columns]);
        return builder;
      },
      eq(column, value) {
        calls.push([table, 'eq', column, value]);
        return builder;
      },
      like(column, value) {
        calls.push([table, 'like', column, value]);
        return builder;
      },
      ilike(column, value) {
        calls.push([table, 'ilike', column, value]);
        return builder;
      },
      in(column, values) {
        calls.push([table, 'in', column, values]);
        return builder;
      },
      gte(column, value) {
        calls.push([table, 'gte', column, value]);
        return builder;
      },
      lt(column, value) {
        calls.push([table, 'lt', column, value]);
        return builder;
      },
      order(column, options) {
        calls.push([table, 'order', column, options]);
        return builder;
      },
      limit(count) {
        calls.push([table, 'limit', count]);
        return builder;
      },
      maybeSingle() {
        calls.push([table, 'maybeSingle']);
        return Promise.resolve({ data: singleData[table] ?? null, error: errors[table] ?? null });
      },
      insert(row) {
        calls.push([table, 'insert', row]);
        return Promise.resolve({ data: null, error: errors[table] ?? null });
      },
      update(row) {
        calls.push([table, 'update', row]);
        return builder;
      },
      delete() {
        calls.push([table, 'delete']);
        return builder;
      },
      upsert(row, options) {
        calls.push([table, 'upsert', row, options]);
        return Promise.resolve({ data: null, error: errors[table] ?? null });
      },
      then(resolve, reject) {
        return Promise.resolve({ data: tableData[table] ?? [], error: errors[table] ?? null }).then(resolve, reject);
      }
    };

    return builder;
  }

  return {
    calls,
    from(table) {
      calls.push([table, 'from']);
      return query(table);
    }
  };
}

test('startWorkSession upserts by user and work date', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.startWorkSession({
    userKey: 'suhyeon',
    workDate: '2026-06-28',
    startedAt: '2026-06-28T01:00:00.000Z'
  });

  const upsert = supabase.calls.find((call) => call[1] === 'upsert');
  assert.equal(upsert[0], 'daily_work_sessions');
  assert.equal(upsert[2].user_key, 'suhyeon');
  assert.equal(upsert[2].work_date, '2026-06-28');
  assert.equal(upsert[3].onConflict, 'user_key,work_date');
});

test('createMeetingFromAudioUpload inserts an uploaded meeting record', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createMeetingFromAudioUpload({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    uploaderUserKey: 'suhyeon',
    audioFileName: '졸작회의.m4a'
  });

  const insert = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'insert');
  assert.equal(insert[2].source_channel_id, 'C_MEETING');
  assert.equal(insert[2].source_message_ts, '1710000000.000100');
  assert.equal(insert[2].uploader_user_key, 'suhyeon');
  assert.equal(insert[2].status, 'uploaded');
  assert.equal(insert[2].audio_file_name, '졸작회의.m4a');
});

test('createMeetingFromRawText inserts a manual meeting record that waits for participant input', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createMeetingFromRawText({
    sourceChannelId: 'D_LEAD',
    sourceMessageTs: '1710000000.000200',
    uploaderUserKey: 'suhyeon',
    rawText: 'ESP32 기준으로 진행하기로 함',
    participantUserKeys: ['suhyeon', 'joeun']
  });

  const insert = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'insert');
  assert.equal(insert[2].source_channel_id, 'D_LEAD');
  assert.equal(insert[2].source_message_ts, '1710000000.000200');
  assert.equal(insert[2].uploader_user_key, 'suhyeon');
  assert.equal(insert[2].status, 'needs_participant_input');
  assert.equal(insert[2].summary.rawText, 'ESP32 기준으로 진행하기로 함');
  assert.deepEqual(insert[2].summary.participantUserKeys, ['suhyeon', 'joeun']);
  assert.equal(insert[2].summary.transcript.meetingTitle, '수동 회의 기록');
});

test('markMeetingTranscribing updates a meeting by source message', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.markMeetingTranscribing({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100'
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'transcribing');
  assert.equal(update[2].error_message, null);
  assert.ok(supabase.calls.some((call) => call[0] === 'meetings' && call[1] === 'eq' && call[2] === 'source_channel_id' && call[3] === 'C_MEETING'));
  assert.ok(supabase.calls.some((call) => call[0] === 'meetings' && call[1] === 'eq' && call[2] === 'source_message_ts' && call[3] === '1710000000.000100'));
});

test('completeMeetingTranscription stores transcript summary and waits for speaker mapping', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.completeMeetingTranscription({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    transcript: {
      meetingTitle: '졸작 회의',
      speakers: [{ label: 'Speaker A' }],
      segments: []
    }
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'needs_speaker_mapping');
  assert.equal(update[2].summary.transcript.meetingTitle, '졸작 회의');
  assert.equal(update[2].error_message, null);
});

test('listRecentMeetingContexts reads transcript summaries for IDEA CRUISE cards', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      meetings: [
        {
          id: 'meeting-1',
          status: 'needs_speaker_mapping',
          audio_file_name: '회의.m4a',
          summary: {
            transcript: {
              meetingTitle: '하드웨어 방향 회의',
              conciseSummary: '공사현장용과 전장용 목적 충돌을 논의함',
              decisions: ['개발 보드는 라즈베리파이로 시작'],
              actionItems: ['ESP32 전환 가능성 확인']
            }
          },
          created_at: '2026-07-02T08:00:00.000Z'
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const contexts = await store.listRecentMeetingContexts({ limit: 5 });

  assert.equal(contexts.length, 1);
  assert.match(contexts[0], /하드웨어 방향 회의/);
  assert.match(contexts[0], /공사현장용과 전장용/);
  assert.match(contexts[0], /라즈베리파이/);
  assert.ok(supabase.calls.some((call) => call[0] === 'meetings' && call[1] === 'order' && call[2] === 'created_at'));
  assert.ok(supabase.calls.some((call) => call[0] === 'meetings' && call[1] === 'limit' && call[2] === 5));
});

test('failMeetingTranscription stores the error message', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.failMeetingTranscription({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    errorMessage: 'download failed'
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'transcription_failed');
  assert.equal(update[2].error_message, 'download failed');
});

test('saveMeetingSpeakerMapping merges a new speaker mapping', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        status: 'needs_speaker_mapping',
        speaker_mapping: {
          'Speaker B': 'joeun'
        },
        summary: {
          transcript: { meetingTitle: '졸작 회의' }
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.saveMeetingSpeakerMapping({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    speakerLabel: 'Speaker A',
    userKey: 'suhyeon'
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'needs_speaker_mapping');
  assert.equal(update[2].speaker_mapping['Speaker A'], 'suhyeon');
  assert.equal(update[2].speaker_mapping['Speaker B'], 'joeun');
  assert.equal(result.speakerMapping['Speaker A'], 'suhyeon');
  assert.equal(result.meeting.id, 'meeting-1');
  assert.equal(result.meeting.summary.transcript.meetingTitle, '졸작 회의');
});

test('saveMeetingTaskCandidates stores task candidates in the meeting summary', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        summary: {
          transcript: { meetingTitle: '졸작 회의' }
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  await store.saveMeetingTaskCandidates({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    taskCandidates: [
      {
        assigneeUserKey: 'suhyeon',
        title: '회의 처리 흐름 점검',
        importance: '🟡 중',
        coordination: '🟢 하',
        context: { source: '회의 결과록: 졸작 회의' }
      }
    ]
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'needs_task_approval');
  assert.equal(update[2].summary.transcript.meetingTitle, '졸작 회의');
  assert.equal(update[2].summary.taskCandidates[0].title, '회의 처리 흐름 점검');
});

test('requestMeetingParticipantTaskInputs stores participant list in the meeting summary', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        summary: {
          transcript: { meetingTitle: '졸작 회의' }
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.requestMeetingParticipantTaskInputs({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    participantUserKeys: ['suhyeon', 'joeun']
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'needs_participant_input');
  assert.deepEqual(update[2].summary.participantUserKeys, ['suhyeon', 'joeun']);
  assert.deepEqual(update[2].summary.participantTaskInputs, {});
  assert.equal(result.status, 'needs_participant_input');
});

test('saveMeetingParticipantTaskInput stores one answer and reports remaining users', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        status: 'needs_participant_input',
        summary: {
          participantUserKeys: ['suhyeon', 'joeun'],
          participantTaskInputs: {
            suhyeon: '나는 회의 흐름을 점검한다.'
          }
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.saveMeetingParticipantTaskInput({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    userKey: 'joeun',
    rawText: '나는 센서 후보를 비교한다.'
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'participant_inputs_ready');
  assert.equal(update[2].summary.participantTaskInputs.joeun, '나는 센서 후보를 비교한다.');
  assert.deepEqual(result.remainingUserKeys, []);
});

test('saveMeetingTaskCandidatesForReview stores pending per-assignee review state', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        summary: {
          transcript: { meetingTitle: '졸작 회의' },
          participantTaskInputs: { suhyeon: '먼저 할 일' }
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  await store.saveMeetingTaskCandidatesForReview({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    taskCandidates: [
      {
        assigneeUserKey: 'suhyeon',
        title: '회의 처리 흐름 점검',
        importance: '🟡 중',
        coordination: '🟢 하',
        context: { source: '회의 결과록: 졸작 회의' }
      }
    ]
  });

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'needs_candidate_review');
  assert.equal(update[2].summary.taskCandidates[0].review.status, 'pending');
  assert.equal(update[2].summary.participantTaskInputs.suhyeon, '먼저 할 일');
});

test('reviewMeetingTaskCandidate accepts one candidate and creates a task', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        status: 'needs_candidate_review',
        summary: {
          taskCandidates: [
            {
              assigneeUserKey: 'joeun',
              title: '센서 후보 비교',
              importance: '🔴 상',
              coordination: '🟡 중',
              context: { why: '조은님이 먼저 할 일로 답했다.' },
              review: { status: 'pending' }
            }
          ]
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.reviewMeetingTaskCandidate({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    candidateIndex: 0,
    reviewedByUserKey: 'joeun',
    decision: 'accepted'
  });

  const upsert = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'upsert');
  assert.equal(upsert[2].assignee_user_key, 'joeun');
  assert.equal(upsert[2].title, '센서 후보 비교');
  assert.equal(upsert[2].source_id, 'meeting-1');
  assert.equal(upsert[2].external_key, 'meeting:meeting-1:candidate:0');
  assert.equal(upsert[2].context.meetingCandidateIndex, 0);
  assert.equal(upsert[3].onConflict, 'external_key');
  assert.equal(upsert[3].ignoreDuplicates, true);

  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].status, 'candidate_reviewed');
  assert.equal(update[2].summary.taskCandidates[0].review.status, 'accepted');
  assert.equal(result.taskCandidate.title, '센서 후보 비교');
});

test('reviewMeetingTaskCandidate does not write a new task when the candidate was already reviewed', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        status: 'candidate_reviewed',
        summary: {
          taskCandidates: [
            {
              assigneeUserKey: 'joeun',
              title: '센서 후보 비교',
              importance: '🔴 상',
              coordination: '🟡 중',
              context: {},
              review: { status: 'accepted' }
            }
          ]
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.reviewMeetingTaskCandidate({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    candidateIndex: 0,
    reviewedByUserKey: 'joeun',
    decision: 'accepted'
  });

  assert.equal(result.alreadyReviewed, true);
  assert.equal(supabase.calls.some((call) => call[0] === 'tasks' && ['insert', 'upsert'].includes(call[1])), false);
  assert.equal(supabase.calls.some((call) => call[0] === 'meetings' && call[1] === 'update'), false);
});

test('reviewMeetingTaskCandidate can reject a candidate without creating a task', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        status: 'needs_candidate_review',
        summary: {
          taskCandidates: [
            {
              assigneeUserKey: 'joeun',
              title: '농담성 자문 요청',
              importance: '🟡 중',
              coordination: '🟡 중',
              context: {},
              review: { status: 'pending' }
            }
          ]
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  await store.reviewMeetingTaskCandidate({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100',
    candidateIndex: 0,
    reviewedByUserKey: 'joeun',
    decision: 'rejected'
  });

  assert.equal(supabase.calls.some((call) => call[0] === 'tasks' && ['insert', 'upsert'].includes(call[1])), false);
  const update = supabase.calls.find((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(update[2].summary.taskCandidates[0].review.status, 'rejected');
});

test('approveMeetingTasks inserts stored candidates into tasks and marks the meeting complete', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      meetings: {
        id: 'meeting-1',
        status: 'needs_task_approval',
        summary: {
          transcript: { meetingTitle: '졸작 회의' },
          taskCandidates: [
            {
              assigneeUserKey: 'suhyeon',
              title: '회의 처리 흐름 점검',
              importance: '🟡 중',
              coordination: '🟢 하',
              context: { source: '회의 결과록: 졸작 회의' }
            }
          ]
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.approveMeetingTasks({
    sourceChannelId: 'C_MEETING',
    sourceMessageTs: '1710000000.000100'
  });

  const insert = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'insert');
  assert.equal(insert[2][0].assignee_user_key, 'suhyeon');
  assert.equal(insert[2][0].title, '회의 처리 흐름 점검');
  assert.equal(insert[2][0].source_type, 'meeting');
  assert.equal(insert[2][0].source_id, 'meeting-1');
  assert.equal(insert[2][0].status, '미시작');

  const meetingUpdates = supabase.calls.filter((call) => call[0] === 'meetings' && call[1] === 'update');
  assert.equal(meetingUpdates.at(-1)[2].status, 'tasks_created');
  assert.equal(result.taskCandidates[0].title, '회의 처리 흐름 점검');
});

test('createIdeaCruiseTask inserts a task from the meeting desk', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createIdeaCruiseTask({
    assigneeUserKey: 'joeun',
    title: 'ESP32와 라즈베리 파이 비교',
    importance: '높음',
    context: {
      neededInfo: '가격, 전력, 구현 난이도',
      doneCriteria: '비교표와 추천안이 정리됨',
      meetingRecord: '오늘은 후보 기준을 정했다.'
    }
  });

  const insert = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'insert');
  assert.equal(insert[2].assignee_user_key, 'joeun');
  assert.equal(insert[2].title, 'ESP32와 라즈베리 파이 비교');
  assert.equal(insert[2].status, '미시작');
  assert.equal(insert[2].importance, '높음');
  assert.equal(insert[2].coordination, '🟡 중');
  assert.equal(insert[2].source_type, 'idea_cruise');
  assert.equal(insert[2].source_id, null);
  assert.equal(insert[2].context.neededInfo, '가격, 전력, 구현 난이도');
  assert.equal(insert[2].context.doneCriteria, '비교표와 추천안이 정리됨');
});

test('updateIdeaCruiseTaskContext boosts an existing task context', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      tasks: {
        id: 'task-1',
        assignee_user_key: 'suhyeon',
        context: {
          source: 'IDEA CRUISE',
          neededInfo: '가격, 전력',
          doneCriteria: '비교표 작성'
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.updateIdeaCruiseTaskContext({
    taskId: 'task-1',
    addNeededInfo: '1차 개발 보드와 최종 목표 보드 분리',
    doneCriteriaChange: '최종 추천 후보 1개 포함',
    includeDoneCriteriaChange: true,
    meetingRecord: '하드웨어 방향 보강'
  });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(result.assigneeUserKey, 'suhyeon');
  assert.match(update[2].context.neededInfo, /가격, 전력/);
  assert.match(update[2].context.neededInfo, /1차 개발 보드와 최종 목표 보드 분리/);
  assert.match(update[2].context.doneCriteria, /비교표 작성/);
  assert.match(update[2].context.doneCriteria, /최종 추천 후보 1개 포함/);
  assert.equal(update[2].context.ideaCruiseBoosts[0].meetingRecord, '하드웨어 방향 보강');
});

test('updateTaskContextFromChange replaces execution fields and records change history', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      tasks: {
        id: 'task-1',
        assignee_user_key: 'suhyeon',
        context: {
          why: '기존 해야 할 일',
          neededInfo: '기존 확인할 것',
          doneCriteria: '기존 완료 기준'
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.updateTaskContextFromChange({
    taskId: 'task-1',
    proposerUserKey: 'suhyeon',
    why: 'ESP32 기준 비교로 좁힘',
    neededInfo: '가격과 전력 확인',
    doneCriteria: '추천 후보 1개 제시',
    rawText: '[해야 할 일 변경]\nESP32 기준 비교로 좁힘'
  });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(result.assigneeUserKey, 'suhyeon');
  assert.equal(update[2].context.why, 'ESP32 기준 비교로 좁힘');
  assert.equal(update[2].context.neededInfo, '가격과 전력 확인');
  assert.equal(update[2].context.doneCriteria, '추천 후보 1개 제시');
  assert.equal(update[2].context.changeHistory[0].proposerUserKey, 'suhyeon');
});

test('updateTaskContextFromCleanup records cleanup history without rewriting execution criteria', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      tasks: {
        id: 'task-1',
        assignee_user_key: 'suhyeon',
        context: {
          why: '기존 해야 할 일',
          neededInfo: '기존 확인할 것',
          doneCriteria: '기존 완료 기준'
        }
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const result = await store.updateTaskContextFromCleanup({
    taskId: 'task-1',
    cleanedByUserKey: 'joeun',
    cleanupType: 'task로 하지 않음',
    reason: '회의에서 정리한 내용이라 별도 진행 부담을 만들지 않음',
    rawText: '[정리 유형]\ntask로 하지 않음'
  });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(result.assigneeUserKey, 'suhyeon');
  assert.equal(update[2].context.why, '기존 해야 할 일');
  assert.equal(update[2].context.doneCriteria, '기존 완료 기준');
  assert.equal(update[2].context.cleanupHistory[0].cleanedByUserKey, 'joeun');
  assert.equal(update[2].context.cleanupHistory[0].cleanupType, 'task로 하지 않음');
  assert.match(update[2].context.cleanupHistory[0].reason, /별도 진행 부담/);
  assert.equal(update[2].context.changeHistory[0].cleanupType, 'task로 하지 않음');
});

test('endWorkSession upserts by user and work date with ended time', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.endWorkSession({
    userKey: 'suhyeon',
    workDate: '2026-06-28',
    endedAt: '2026-06-28T12:00:00.000Z'
  });

  const upsert = supabase.calls.find((call) => call[1] === 'upsert');
  assert.equal(upsert[0], 'daily_work_sessions');
  assert.equal(upsert[2].user_key, 'suhyeon');
  assert.equal(upsert[2].work_date, '2026-06-28');
  assert.equal(upsert[2].ended_at, '2026-06-28T12:00:00.000Z');
  assert.equal(upsert[3].onConflict, 'user_key,work_date');
});

test('listEndedWorkSessionsForDate reads ended sessions for a work date', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      daily_work_sessions: [
        {
          user_key: 'suhyeon',
          work_date: '2026-06-28',
          ended_at: '2026-06-28T10:00:00.000Z'
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const sessions = await store.listEndedWorkSessionsForDate({ workDate: '2026-06-28' });

  assert.equal(sessions[0].userKey, 'suhyeon');
  assert.equal(sessions[0].endedAt, '2026-06-28T10:00:00.000Z');
  assert.ok(supabase.calls.some((call) => call[0] === 'daily_work_sessions' && call[1] === 'eq' && call[2] === 'work_date' && call[3] === '2026-06-28'));
});

test('listOpenTasksForUser reads open tasks and maps database columns', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      tasks: [
        {
          id: 'task-1',
          title: '센서 후보 정리',
          status: '미시작',
          importance: '🔴 상',
          coordination: '🟡 중',
          source_type: 'meeting',
          context: { source: '회의 결과록' },
          created_at: '2026-06-28T01:00:00.000Z'
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const tasks = await store.listOpenTasksForUser('suhyeon');

  assert.equal(tasks[0].sourceType, 'meeting');
  assert.equal(tasks[0].context.source, '회의 결과록');
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'eq' && call[2] === 'assignee_user_key'));
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'in' && call[2] === 'status'));
  assert.equal(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'in' && call[3].includes('완료')), false);
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'in' && call[3].includes('보완 필요')));
});

test('markAcceptedTasksUnresolvedForUser changes accepted tasks to unresolved', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.markAcceptedTasksUnresolvedForUser({ userKey: 'suhyeon' });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(update[2].status, '미정리');
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'eq' && call[2] === 'assignee_user_key' && call[3] === 'suhyeon'));
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'eq' && call[2] === 'status' && call[3] === '수락'));
});

test('archiveTestTasks hides open test tasks from in-process boards', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.archiveTestTasks({ keyword: '테스트' });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(update[2].status, '보관');
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'ilike' && call[2] === 'title' && call[3] === '%테스트%'));
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'in' && call[2] === 'status'));
});

test('listDailyTasksForUser reads task states for a user summary', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      tasks: [
        {
          id: 'task-1',
          title: '센서 후보 정리',
          status: '완료',
          importance: '🔴 상',
          coordination: '🟡 중',
          source_type: 'manual',
          context: {},
          created_at: '2026-06-28T01:00:00.000Z'
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const tasks = await store.listDailyTasksForUser({ userKey: 'suhyeon' });

  assert.equal(tasks[0].title, '센서 후보 정리');
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'eq' && call[2] === 'assignee_user_key'));
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'in' && call[2] === 'status'));
});

test('listAllTasks reads cumulative task states for finals preview', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      tasks: [
        {
          id: 'task-1',
          title: '센서 후보 정리',
          status: '완료',
          importance: '🔴 상',
          coordination: '🟡 중',
          source_type: 'manual',
          context: {},
          created_at: '2026-06-28T01:00:00.000Z'
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const tasks = await store.listAllTasks({ limit: 50 });

  assert.equal(tasks[0].title, '센서 후보 정리');
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'select' && call[2].includes('assignee_user_key')));
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'order' && call[2] === 'created_at'));
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'limit' && call[2] === 50));
});

test('findSlackMessage maps the latest stored Slack message', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      slack_messages: {
        channel_id: 'C_IN_PROCESS',
        message_ts: '1700000000.000001',
        thread_ts: '1700000000.000001'
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const message = await store.findSlackMessage({
    purpose: 'in_process:suhyeon',
    channelId: 'C_IN_PROCESS'
  });

  assert.deepEqual(message, {
    channelId: 'C_IN_PROCESS',
    messageTs: '1700000000.000001',
    threadTs: '1700000000.000001'
  });
});

test('findSlackMessage can find a personal DM board by purpose only', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      slack_messages: {
        purpose: 'dm_task_board:suhyeon',
        channel_id: 'D_SUHYEON',
        message_ts: '1700000000.000010',
        thread_ts: '1700000000.000010'
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const message = await store.findSlackMessage({
    purpose: 'dm_task_board:suhyeon'
  });

  assert.equal(message.channelId, 'D_SUHYEON');
  assert.equal(message.messageTs, '1700000000.000010');
  assert.ok(supabase.calls.some((call) => call[0] === 'slack_messages' && call[1] === 'eq' && call[2] === 'purpose'));
  assert.equal(supabase.calls.some((call) => call[0] === 'slack_messages' && call[1] === 'eq' && call[2] === 'channel_id'), false);
});
test('listTaskDetailMessagesForThread reads stored task detail messages', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      slack_messages: [
        {
          purpose: 'task_detail:task-1',
          channel_id: 'C_IN_PROCESS',
          message_ts: '1700000000.000011',
          thread_ts: '1700000000.000001'
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const messages = await store.listTaskDetailMessagesForThread({
    channelId: 'C_IN_PROCESS',
    threadTs: '1700000000.000001'
  });

  assert.deepEqual(messages[0], {
    purpose: 'task_detail:task-1',
    channelId: 'C_IN_PROCESS',
    messageTs: '1700000000.000011',
    threadTs: '1700000000.000001'
  });
  assert.ok(supabase.calls.some((call) => call[0] === 'slack_messages' && call[1] === 'like' && call[2] === 'purpose' && call[3] === 'task_detail:%'));
});

test('getTaskById reads task ownership for action submissions', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      tasks: {
        id: 'task-1',
        assignee_user_key: 'suhyeon',
        title: '센서 후보 정리',
        status: '미시작',
        importance: '🔴 상',
        coordination: '🟡 중',
        source_type: 'manual',
        context: {},
        created_at: '2026-06-28T01:00:00.000Z'
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const task = await store.getTaskById('task-1');

  assert.equal(task.id, 'task-1');
  assert.equal(task.assigneeUserKey, 'suhyeon');
  assert.equal(task.title, '센서 후보 정리');
});

test('submitTaskResult inserts a raw Codex result', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.submitTaskResult({
    taskId: 'task-1',
    resultType: '완료',
    rawText: '[완료 제출 결과]',
    submittedByUserKey: 'suhyeon',
    parsedSummary: {
      verdict: 'sufficient',
      score: 92
    }
  });

  const insert = supabase.calls.find((call) => call[0] === 'task_results' && call[1] === 'insert');
  assert.equal(insert[2].task_id, 'task-1');
  assert.equal(insert[2].result_type, '완료');
  assert.equal(insert[2].submitted_by_user_key, 'suhyeon');
  assert.equal(insert[2].parsed_summary.verdict, 'sufficient');
});

test('createCodexPrompt inserts a generated prompt with Slack location', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createCodexPrompt({
    taskId: 'task-1',
    prompt: 'Codex prompt',
    slackChannelId: 'C_IN_PROCESS',
    slackMessageTs: '1710000000.000001'
  });

  const insert = supabase.calls.find((call) => call[0] === 'codex_prompts' && call[1] === 'insert');
  assert.equal(insert[2].task_id, 'task-1');
  assert.equal(insert[2].prompt, 'Codex prompt');
  assert.equal(insert[2].slack_channel_id, 'C_IN_PROCESS');
  assert.equal(insert[2].slack_message_ts, '1710000000.000001');
});

test('getLatestCodexPromptForTask reads the newest prompt for a task', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      codex_prompts: {
        task_id: 'task-1',
        prompt: 'Codex prompt',
        slack_channel_id: 'C_IN_PROCESS',
        slack_message_ts: '1710000000.000001',
        created_at: '2026-06-28T02:00:00.000Z'
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const prompt = await store.getLatestCodexPromptForTask('task-1');

  assert.equal(prompt.taskId, 'task-1');
  assert.equal(prompt.prompt, 'Codex prompt');
  assert.equal(prompt.slackChannelId, 'C_IN_PROCESS');
  assert.ok(supabase.calls.some((call) => call[0] === 'codex_prompts' && call[1] === 'eq' && call[2] === 'task_id' && call[3] === 'task-1'));
  assert.ok(supabase.calls.some((call) => call[0] === 'codex_prompts' && call[1] === 'order' && call[2] === 'created_at'));
  assert.ok(supabase.calls.some((call) => call[0] === 'codex_prompts' && call[1] === 'maybeSingle'));
});

test('listDailyTaskResultsForUser reads Codex outputs submitted today', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      task_results: [
        {
          task_id: 'task-1',
          result_type: '완료',
          raw_text: '[완료 제출 결과]',
          parsed_summary: { verdict: 'sufficient' },
          created_at: '2026-06-28T02:00:00.000Z',
          tasks: {
            title: '센서 후보 정리'
          }
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const results = await store.listDailyTaskResultsForUser({
    userKey: 'suhyeon',
    fromIso: '2026-06-27T15:00:00.000Z',
    toIso: '2026-06-28T15:00:00.000Z'
  });

  assert.equal(results[0].taskTitle, '센서 후보 정리');
  assert.equal(results[0].resultType, '완료');
  assert.equal(results[0].parsedSummary.verdict, 'sufficient');
  assert.ok(supabase.calls.some((call) => call[0] === 'task_results' && call[1] === 'gte' && call[2] === 'created_at'));
  assert.ok(supabase.calls.some((call) => call[0] === 'task_results' && call[1] === 'lt' && call[2] === 'created_at'));
});

test('listAllTaskResults reads cumulative Codex outputs for finals preview', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      task_results: [
        {
          task_id: 'task-1',
          result_type: '완료',
          raw_text: '[완료 제출 결과]',
          parsed_summary: { verdict: 'sufficient' },
          created_at: '2026-06-28T02:00:00.000Z',
          tasks: {
            title: '센서 후보 정리'
          }
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const results = await store.listAllTaskResults({ limit: 50 });

  assert.equal(results[0].taskTitle, '센서 후보 정리');
  assert.equal(results[0].resultType, '완료');
  assert.ok(supabase.calls.some((call) => call[0] === 'task_results' && call[1] === 'limit' && call[2] === 50));
});

test('createChangeRequest inserts a task change request', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createChangeRequest({
    taskId: 'task-1',
    proposerUserKey: 'suhyeon',
    rawText: '[변경 요청]'
  });

  const insert = supabase.calls.find((call) => call[0] === 'change_requests' && call[1] === 'insert');
  assert.equal(insert[2].task_id, 'task-1');
  assert.equal(insert[2].proposer_user_key, 'suhyeon');
  assert.equal(insert[2].status, '투표 중');
});

test('listDailyChangeRequestsForUser reads change requests proposed today', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      change_requests: [
        {
          task_id: 'task-2',
          status: '투표 중',
          raw_text: '[변경 제안]',
          created_at: '2026-06-28T03:00:00.000Z',
          tasks: {
            title: 'UI 흐름 검토'
          }
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const requests = await store.listDailyChangeRequestsForUser({
    userKey: 'suhyeon',
    fromIso: '2026-06-27T15:00:00.000Z',
    toIso: '2026-06-28T15:00:00.000Z'
  });

  assert.equal(requests[0].taskTitle, 'UI 흐름 검토');
  assert.equal(requests[0].status, '투표 중');
  assert.ok(supabase.calls.some((call) => call[0] === 'change_requests' && call[1] === 'eq' && call[2] === 'proposer_user_key'));
});

test('listAllChangeRequests reads cumulative change history for finals preview', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      change_requests: [
        {
          task_id: 'task-2',
          status: '투표 중',
          raw_text: '[변경 제안]',
          created_at: '2026-06-28T03:00:00.000Z',
          tasks: {
            title: 'UI 흐름 검토'
          }
        }
      ]
    }
  });
  const store = createSupabaseStore(supabase);

  const requests = await store.listAllChangeRequests({ limit: 50 });

  assert.equal(requests[0].taskTitle, 'UI 흐름 검토');
  assert.equal(requests[0].status, '투표 중');
  assert.ok(supabase.calls.some((call) => call[0] === 'change_requests' && call[1] === 'limit' && call[2] === 50));
});

test('createFinalsPreview stores a pending finals preview', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createFinalsPreview({
    workDate: '2026-06-28',
    preview: {
      workDate: '2026-06-28',
      confirmed: ['센서 후보 정리']
    }
  });

  const insert = supabase.calls.find((call) => call[0] === 'finals_updates' && call[1] === 'insert');
  assert.equal(insert[2].work_date, '2026-06-28');
  assert.equal(insert[2].status, '미리보기');
  assert.equal(insert[2].preview.confirmed[0], '센서 후보 정리');
});

test('createFinalsUpdate stores an approved finals update without extra schema columns', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.createFinalsUpdate({
    workDate: '2026-06-28',
    preview: {
      workDate: '2026-06-28',
      confirmed: ['센서 후보 정리']
    },
    approvedByUserKey: 'suhyeon',
    approvedAt: '2026-06-28T09:00:00.000Z',
    reason: 'scheduled'
  });

  const insert = supabase.calls.find((call) => call[0] === 'finals_updates' && call[1] === 'insert');
  assert.equal(insert[2].work_date, '2026-06-28');
  assert.equal(insert[2].status, '승인됨');
  assert.equal(insert[2].preview.confirmed[0], '센서 후보 정리');
  assert.equal(insert[2].approved_by_user_key, 'suhyeon');
  assert.equal(insert[2].approved_at, '2026-06-28T09:00:00.000Z');
  assert.equal(Object.hasOwn(insert[2], 'metadata'), false);
});

test('getLatestFinalsPreview reads the latest pending preview', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      finals_updates: {
        id: 'finals-1',
        work_date: '2026-06-28',
        preview: {
          workDate: '2026-06-28'
        },
        created_at: '2026-06-28T12:00:00.000Z'
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const preview = await store.getLatestFinalsPreview();

  assert.equal(preview.id, 'finals-1');
  assert.equal(preview.workDate, '2026-06-28');
  assert.equal(preview.preview.workDate, '2026-06-28');
  assert.ok(supabase.calls.some((call) => call[0] === 'finals_updates' && call[1] === 'eq' && call[2] === 'status' && call[3] === '미리보기'));
  assert.ok(supabase.calls.some((call) => call[0] === 'finals_updates' && call[1] === 'maybeSingle'));
});

test('getFinalsUpdateForDate reads any preview or approved update for a work date', async () => {
  const supabase = createFakeSupabase({
    singleData: {
      finals_updates: {
        id: 'finals-1',
        work_date: '2026-06-28',
        status: '승인됨',
        preview: {
          workDate: '2026-06-28'
        },
        created_at: '2026-06-28T12:00:00.000Z'
      }
    }
  });
  const store = createSupabaseStore(supabase);

  const preview = await store.getFinalsUpdateForDate({ workDate: '2026-06-28' });

  assert.equal(preview.id, 'finals-1');
  assert.equal(preview.status, '승인됨');
  assert.equal(preview.workDate, '2026-06-28');
  assert.ok(supabase.calls.some((call) => call[0] === 'finals_updates' && call[1] === 'eq' && call[2] === 'work_date' && call[3] === '2026-06-28'));
});

test('approveFinalsUpdate marks a preview approved', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.approveFinalsUpdate({
    id: 'finals-1',
    approvedByUserKey: 'suhyeon',
    approvedAt: '2026-06-28T12:00:00.000Z'
  });

  const update = supabase.calls.find((call) => call[0] === 'finals_updates' && call[1] === 'update');
  assert.equal(update[2].status, '승인됨');
  assert.equal(update[2].approved_by_user_key, 'suhyeon');
  assert.equal(update[2].approved_at, '2026-06-28T12:00:00.000Z');
  assert.ok(supabase.calls.some((call) => call[0] === 'finals_updates' && call[1] === 'eq' && call[2] === 'id' && call[3] === 'finals-1'));
});

test('updateTaskStatus updates task status and completion timestamp', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.updateTaskStatus({
    taskId: 'task-1',
    status: '완료',
    completedAt: '2026-06-28T02:00:00.000Z'
  });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(update[2].status, '완료');
  assert.equal(update[2].completed_at, '2026-06-28T02:00:00.000Z');
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'eq' && call[2] === 'id'));
});

test('updateTaskStatus can store accepted timestamp', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.updateTaskStatus({
    taskId: 'task-1',
    status: '수락',
    acceptedAt: '2026-06-28T02:00:00.000Z'
  });

  const update = supabase.calls.find((call) => call[0] === 'tasks' && call[1] === 'update');
  assert.equal(update[2].status, '수락');
  assert.equal(update[2].accepted_at, '2026-06-28T02:00:00.000Z');
});

test('upsertSlackMessage stores purpose and Slack timestamp', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.upsertSlackMessage({
    purpose: 'in_process:suhyeon',
    channelId: 'C_IN_PROCESS',
    messageTs: '1700000000.000001',
    threadTs: '1700000000.000001'
  });

  const upsert = supabase.calls.find((call) => call[0] === 'slack_messages' && call[1] === 'upsert');
  assert.equal(upsert[2].purpose, 'in_process:suhyeon');
  assert.equal(upsert[2].message_ts, '1700000000.000001');
  assert.equal(upsert[3].onConflict, 'channel_id,message_ts');
});

test('deleteSlackMessage removes a stored Slack message by channel and timestamp', async () => {
  const supabase = createFakeSupabase();
  const store = createSupabaseStore(supabase);

  await store.deleteSlackMessage({
    channelId: 'C_IN_PROCESS',
    messageTs: '1700000000.000011'
  });

  assert.ok(supabase.calls.some((call) => call[0] === 'slack_messages' && call[1] === 'delete'));
  assert.ok(supabase.calls.some((call) => call[0] === 'slack_messages' && call[1] === 'eq' && call[2] === 'channel_id' && call[3] === 'C_IN_PROCESS'));
  assert.ok(supabase.calls.some((call) => call[0] === 'slack_messages' && call[1] === 'eq' && call[2] === 'message_ts' && call[3] === '1700000000.000011'));
});

test('store methods throw Supabase errors with context', async () => {
  const supabase = createFakeSupabase({
    errors: {
      tasks: new Error('network failed')
    }
  });
  const store = createSupabaseStore(supabase);

  await assert.rejects(
    () => store.listOpenTasksForUser('suhyeon'),
    /Failed to list open tasks/
  );
});
