import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvFile } from '../src/envFile.js';

test('parseEnvFile parses simple KEY=value lines', () => {
  const env = parseEnvFile('PORT=3000\nBASE_URL=https://subjector.onrender.com\n');

  assert.equal(env.PORT, '3000');
  assert.equal(env.BASE_URL, 'https://subjector.onrender.com');
});

test('parseEnvFile ignores comments and blank lines', () => {
  const env = parseEnvFile('\n# comment\nPORT=3000\n\n');

  assert.deepEqual(env, { PORT: '3000' });
});

test('parseEnvFile strips matching quotes', () => {
  const env = parseEnvFile('HEALTH_PIN="1234"\nNAME=\'Subjector\'\n');

  assert.equal(env.HEALTH_PIN, '1234');
  assert.equal(env.NAME, 'Subjector');
});
