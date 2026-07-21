const DEFAULT_ORGANIZATION_URL = 'https://github.com/SAFIRA-ondevice';
const DEFAULT_REPOSITORIES = ['SAFIRA-ondevice/Soohyun'];

function parseOrganizationName(organizationUrl = DEFAULT_ORGANIZATION_URL) {
  const trimmed = String(organizationUrl || DEFAULT_ORGANIZATION_URL).trim();
  try {
    const url = new URL(trimmed);
    const [owner] = url.pathname.split('/').filter(Boolean);
    return owner || 'SAFIRA-ondevice';
  } catch {
    return trimmed.replace(/^@/, '') || 'SAFIRA-ondevice';
  }
}

function normalizeRepositoryName(repository) {
  return String(repository || '')
    .trim()
    .replace(/^https:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

async function fetchJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${body.slice(0, 160)}`.trim());
  }
  return response.json();
}

export function createGitHubOrganizationContextProvider({
  organizationUrl = DEFAULT_ORGANIZATION_URL,
  repositories = DEFAULT_REPOSITORIES,
  token = '',
  fetchImpl = globalThis.fetch
} = {}) {
  const organization = parseOrganizationName(organizationUrl);
  const explicitRepositories = (Array.isArray(repositories) ? repositories : DEFAULT_REPOSITORIES)
    .map(normalizeRepositoryName)
    .filter((repo) => repo.includes('/'));
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'subjector-idea-cruise'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  async function listContext({ repoLimit = 6, issueLimit = 4 } = {}) {
    if (!fetchImpl) {
      return [`GitHub organization ${organizationUrl} 조회 불가: fetch unavailable`];
    }

    const contexts = [];
    const seenRepos = new Set();

    async function addRepositoryContext(repo) {
      const repoLine = [
        `repo ${repo.full_name}`,
        repo.description ? `description: ${repo.description}` : '',
        repo.default_branch ? `default branch: ${repo.default_branch}` : '',
        repo.updated_at ? `updated: ${repo.updated_at}` : ''
      ].filter(Boolean).join(' | ');
      contexts.push(repoLine);
      seenRepos.add(repo.full_name);

      try {
        const issues = await fetchJson(
          fetchImpl,
          `https://api.github.com/repos/${repo.full_name}/issues?state=open&per_page=${issueLimit}`,
          headers
        );
        const issueLines = (Array.isArray(issues) ? issues : [])
          .slice(0, issueLimit)
          .map((issue) => `${issue.pull_request ? 'PR' : 'issue'} #${issue.number}: ${issue.title}`);
        if (issueLines.length > 0) {
          contexts.push(`${repo.full_name} open work: ${issueLines.join(' / ')}`);
        }
      } catch (error) {
        contexts.push(`${repo.full_name} issue 조회 실패: ${error.message}`);
      }
    }

    for (const repository of explicitRepositories) {
      try {
        const repo = await fetchJson(
          fetchImpl,
          `https://api.github.com/repos/${repository}`,
          headers
        );
        await addRepositoryContext(repo);
      } catch (error) {
        contexts.push(`${repository} 조회 실패: ${error.message}`);
      }
    }

    try {
      const repos = await fetchJson(
        fetchImpl,
        `https://api.github.com/orgs/${organization}/repos?per_page=${repoLimit}&sort=updated`,
        headers
      );

      if (!Array.isArray(repos) || repos.length === 0) {
        if (contexts.length > 0) return contexts;
        return [`GitHub organization ${organizationUrl}: 공개 repository가 없거나 접근 권한이 없습니다.`];
      }

      for (const repo of repos.slice(0, repoLimit)) {
        if (!repo.full_name || seenRepos.has(repo.full_name)) continue;
        await addRepositoryContext(repo);
      }

      return contexts;
    } catch (error) {
      if (contexts.length > 0) return contexts;
      return [`GitHub organization ${organizationUrl} 조회 실패: ${error.message}`];
    }
  }

  return {
    organizationUrl,
    repositories: explicitRepositories,
    listContext
  };
}
