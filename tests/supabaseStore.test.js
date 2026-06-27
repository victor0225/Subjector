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
