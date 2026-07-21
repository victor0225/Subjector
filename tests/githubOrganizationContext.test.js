import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubOrganizationContextProvider } from '../src/services/githubOrganizationContext.js';

test('GitHub context includes explicit SAFIRA Soohyun repo before organization repositories', async () => {
  const calls = [];
  const provider = createGitHubOrganizationContextProvider({
    organizationUrl: 'https://github.com/SAFIRA-ondevice',
    repositories: ['SAFIRA-ondevice/Soohyun'],
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun/issues')) {
        return jsonResponse([]);
      }
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun')) {
        return jsonResponse({
          full_name: 'SAFIRA-ondevice/Soohyun',
          description: 'tactical headset repo',
          default_branch: 'main',
          updated_at: '2026-07-22T00:00:00Z'
        });
      }
      if (url.includes('/orgs/SAFIRA-ondevice/repos')) {
        return jsonResponse([
          {
            full_name: 'SAFIRA-ondevice/Other',
            description: '',
            default_branch: 'main',
            updated_at: '2026-07-21T00:00:00Z'
          }
        ]);
      }
      if (url.includes('/repos/SAFIRA-ondevice/Other/issues')) {
        return jsonResponse([]);
      }
      throw new Error(`unexpected url ${url}`);
    }
  });

  const context = await provider.listContext({ repoLimit: 6, issueLimit: 4 });

  assert.match(context[0], /repo SAFIRA-ondevice\/Soohyun/);
  assert.ok(context.some((line) => /repo SAFIRA-ondevice\/Other/.test(line)));
  assert.equal(calls[0], 'https://api.github.com/repos/SAFIRA-ondevice/Soohyun');
  assert.ok(calls.includes('https://api.github.com/orgs/SAFIRA-ondevice/repos?per_page=6&sort=updated'));
});

test('GitHub context still reports explicit repo access failure clearly', async () => {
  const provider = createGitHubOrganizationContextProvider({
    organizationUrl: 'https://github.com/SAFIRA-ondevice',
    repositories: ['SAFIRA-ondevice/Soohyun'],
    fetchImpl: async (url) => {
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun')) {
        return {
          ok: false,
          status: 404,
          async text() {
            return 'not found';
          }
        };
      }
      return jsonResponse([]);
    }
  });

  const context = await provider.listContext();

  assert.match(context[0], /SAFIRA-ondevice\/Soohyun 조회 실패/);
});

function jsonResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    }
  };
}
