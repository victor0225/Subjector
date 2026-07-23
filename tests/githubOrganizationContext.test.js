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
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun/git/trees/main')) {
        return jsonResponse({ tree: [] });
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
      if (url.includes('/repos/SAFIRA-ondevice/Other/git/trees/main')) {
        return jsonResponse({ tree: [] });
      }
      throw new Error(`unexpected url ${url}`);
    }
  });

  const context = await provider.listContext({ repoLimit: 6, issueLimit: 4 });

  assert.match(context[0], /repo SAFIRA-ondevice\/Soohyun/);
  assert.ok(context.some((line) => /repo SAFIRA-ondevice\/Other/.test(line)));
  assert.equal(calls[0], 'https://api.github.com/repos/SAFIRA-ondevice/Soohyun');
  assert.ok(calls.includes('https://api.github.com/orgs/SAFIRA-ondevice/repos?type=all&per_page=6&sort=updated'));
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

test('GitHub context explains private repo failures when no token is configured', async () => {
  const provider = createGitHubOrganizationContextProvider({
    organizationUrl: 'https://github.com/SAFIRA-ondevice',
    repositories: ['SAFIRA-ondevice/Soohyun'],
    token: '',
    fetchImpl: async (url) => {
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun')) {
        return {
          ok: false,
          status: 404,
          async text() {
            return '{"message":"Not Found"}';
          }
        };
      }
      return jsonResponse([]);
    }
  });

  const context = await provider.listContext();

  assert.match(context[0], /GITHUB_TOKEN 미설정/);
});

test('GitHub context explains private repo failures when token lacks repo access', async () => {
  const provider = createGitHubOrganizationContextProvider({
    organizationUrl: 'https://github.com/SAFIRA-ondevice',
    repositories: ['SAFIRA-ondevice/Soohyun'],
    token: 'github_pat_readonly',
    fetchImpl: async (url) => {
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun')) {
        return {
          ok: false,
          status: 404,
          async text() {
            return '{"message":"Not Found"}';
          }
        };
      }
      return jsonResponse([]);
    }
  });

  const context = await provider.listContext();

  assert.match(context[0], /토큰이 이 private repository에 read-only 접근 권한이 없거나/);
});

test('GitHub context reads selected private repository files with token auth', async () => {
  const calls = [];
  const provider = createGitHubOrganizationContextProvider({
    organizationUrl: 'https://github.com/SAFIRA-ondevice',
    repositories: ['SAFIRA-ondevice/Soohyun'],
    token: 'github_pat_readonly',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, authorization: options.headers?.Authorization });
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun/issues')) {
        return jsonResponse([]);
      }
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun/git/trees/main')) {
        return jsonResponse({
          tree: [
            { path: 'README.md', type: 'blob', size: 120, sha: 'readme-sha' },
            { path: 'docs/meeting-roadmap.md', type: 'blob', size: 240, sha: 'docs-sha' },
            { path: 'src/headset.js', type: 'blob', size: 160, sha: 'src-sha' },
            { path: '.env', type: 'blob', size: 80, sha: 'secret-sha' },
            { path: 'pnpm-lock.yaml', type: 'blob', size: 80, sha: 'lock-sha' }
          ]
        });
      }
      if (url.includes('/contents/README.md')) {
        return jsonResponse(contentResponse('Subjector hardware repo\nESP32 headset integration'));
      }
      if (url.includes('/contents/docs/meeting-roadmap.md')) {
        return jsonResponse(contentResponse('회의에서 기성 차음 귀마개를 개조하기로 결정함'));
      }
      if (url.includes('/contents/src/headset.js')) {
        return jsonResponse(contentResponse('export function connectEsp32Headset() {}'));
      }
      if (url.includes('/repos/SAFIRA-ondevice/Soohyun')) {
        return jsonResponse({
          full_name: 'SAFIRA-ondevice/Soohyun',
          description: 'private SAFIRA headset repo',
          default_branch: 'main',
          updated_at: '2026-07-22T00:00:00Z'
        });
      }
      if (url.includes('/orgs/SAFIRA-ondevice/repos')) {
        return jsonResponse([]);
      }
      throw new Error(`unexpected url ${url}`);
    }
  });

  const context = await provider.listContext({ repoLimit: 6, issueLimit: 4, fileLimit: 4 });

  assert.ok(context.some((line) => /README\.md/.test(line) && /ESP32 headset integration/.test(line)));
  assert.ok(context.some((line) => /docs\/meeting-roadmap\.md/.test(line) && /기성 차음 귀마개/.test(line)));
  assert.ok(context.some((line) => /src\/headset\.js/.test(line) && /connectEsp32Headset/.test(line)));
  assert.equal(context.some((line) => /\.env|pnpm-lock/.test(line)), false);
  assert.ok(calls.every((call) => call.authorization === 'Bearer github_pat_readonly'));
});

function jsonResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    }
  };
}

function contentResponse(text) {
  return {
    type: 'file',
    encoding: 'base64',
    content: Buffer.from(text, 'utf8').toString('base64')
  };
}
