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
  assert.ok(supabase.calls.some((call) => call[0] === 'tasks' && call[1] === 'in' && call[3].includes('완료')));
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
    submittedByUserKey: 'suhyeon'
  });

  const insert = supabase.calls.find((call) => call[0] === 'task_results' && call[1] === 'insert');
  assert.equal(insert[2].task_id, 'task-1');
  assert.equal(insert[2].result_type, '완료');
  assert.equal(insert[2].submitted_by_user_key, 'suhyeon');
});

test('listDailyTaskResultsForUser reads Codex outputs submitted today', async () => {
  const supabase = createFakeSupabase({
    tableData: {
      task_results: [
        {
          task_id: 'task-1',
          result_type: '완료',
          raw_text: '[완료 제출 결과]',
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
  assert.ok(supabase.calls.some((call) => call[0] === 'task_results' && call[1] === 'gte' && call[2] === 'created_at'));
  assert.ok(supabase.calls.some((call) => call[0] === 'task_results' && call[1] === 'lt' && call[2] === 'created_at'));
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
