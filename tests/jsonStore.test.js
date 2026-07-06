import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStore } from '../src/storage/jsonStore.js';

test('JsonStore persists and reloads app state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'idea-cruise-'));
  const file = join(dir, 'state.json');

  const store = new JsonStore(file);
  await store.save({ entries: [{ id: 'entry_1', text: 'hello' }] });

  const loaded = await store.load();
  assert.deepEqual(loaded.entries, [{ id: 'entry_1', text: 'hello' }]);

  const raw = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(raw.entries[0].id, 'entry_1');

  await rm(dir, { recursive: true, force: true });
});
