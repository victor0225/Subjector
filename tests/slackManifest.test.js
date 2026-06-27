import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = fs.readFileSync(new URL('../slack/manifest.yaml', import.meta.url), 'utf8');

test('Slack manifest enables app DMs for 출근 and 퇴근 commands', () => {
  assert.match(manifest, /app_home:/);
  assert.match(manifest, /messages_tab_enabled:\s*true/);
  assert.match(manifest, /message\.im/);
  assert.match(manifest, /im:write/);
});

test('Slack manifest includes file read and write scopes for meeting transcripts', () => {
  assert.match(manifest, /files:read/);
  assert.match(manifest, /files:write/);
  assert.match(manifest, /file_shared/);
});
