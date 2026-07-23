const DEFAULT_ORGANIZATION_URL = 'https://github.com/SAFIRA-ondevice';
const DEFAULT_REPOSITORIES = ['SAFIRA-ondevice/Soohyun'];
const DEFAULT_FILE_LIMIT = 8;
const DEFAULT_FILE_BYTE_LIMIT = 3200;
const MAX_FETCHABLE_FILE_SIZE = 80_000;
const EXCLUDED_PATH_SEGMENTS = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'target',
  'vendor',
  '__pycache__'
]);
const EXCLUDED_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb'
]);
const TEXT_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.css',
  '.h',
  '.hpp',
  '.html',
  '.ino',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.py',
  '.ts',
  '.tsx',
  '.txt',
  '.toml',
  '.yaml',
  '.yml'
]);

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

function basename(path) {
  return path.split('/').filter(Boolean).at(-1) || '';
}

function extensionOf(path) {
  const name = basename(path).toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function encodeContentPath(path) {
  return path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function isExcludedPath(path) {
  const normalized = String(path || '').trim();
  if (!normalized) return true;
  const lowerPath = normalized.toLowerCase();
  const parts = lowerPath.split('/').filter(Boolean);
  const fileName = parts.at(-1) || '';
  if (parts.some((part) => EXCLUDED_PATH_SEGMENTS.has(part))) return true;
  if (EXCLUDED_FILENAMES.has(fileName)) return true;
  if (/(^|\/)(secret|secrets|credentials?|private-key)(\/|\.|$)/i.test(normalized)) return true;
  if (/\.(aac|avif|bin|bmp|dll|exe|gif|ico|jpg|jpeg|mp3|mp4|ogg|pdf|png|so|wav|webp|zip)$/i.test(normalized)) return true;
  return false;
}

function isUsefulTextFile(entry) {
  if (!entry || entry.type !== 'blob' || !entry.path) return false;
  if (isExcludedPath(entry.path)) return false;
  if (Number(entry.size || 0) > MAX_FETCHABLE_FILE_SIZE) return false;
  const fileName = basename(entry.path).toLowerCase();
  if (fileName === 'readme' || fileName.startsWith('readme.')) return true;
  if (fileName === 'dockerfile' || fileName === 'makefile') return true;
  return TEXT_EXTENSIONS.has(extensionOf(entry.path));
}

function filePriority(entry) {
  const path = entry.path.toLowerCase();
  const fileName = basename(path);
  if (fileName.startsWith('readme')) return 0;
  if (path.startsWith('docs/')) return 1;
  if (path.includes('roadmap') || path.includes('meeting')) return 2;
  if (['package.json', 'pyproject.toml', 'requirements.txt'].includes(fileName)) return 3;
  if (path.startsWith('src/')) return 4;
  return 5;
}

function selectRepositoryFiles(tree, limit) {
  return (Array.isArray(tree) ? tree : [])
    .filter(isUsefulTextFile)
    .sort((a, b) => filePriority(a) - filePriority(b) || a.path.localeCompare(b.path))
    .slice(0, Math.max(0, limit));
}

function decodeGitHubContent(payload) {
  if (!payload || payload.type !== 'file' || payload.encoding !== 'base64' || !payload.content) {
    return '';
  }
  const normalized = String(payload.content).replace(/\s/g, '');
  const text = Buffer.from(normalized, 'base64').toString('utf8');
  if (text.includes('\u0000')) return '';
  return text;
}

function compactExcerpt(text, byteLimit) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, Math.max(0, byteLimit));
}

async function fetchJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${body.slice(0, 160)}`.trim());
  }
  return response.json();
}

function formatRepositoryAccessError(repository, error, hasToken) {
  const message = error.message || String(error);
  if (/^404\b/.test(message)) {
    const hint = hasToken
      ? '토큰이 이 private repository에 read-only 접근 권한이 없거나 GitHub fine-grained token의 repository access 선택에 포함되지 않았습니다.'
      : 'GITHUB_TOKEN 미설정 상태라 private repository를 읽을 수 없습니다. Render 환경변수에 SAFIRA-ondevice read-only token을 추가해야 합니다.';
    return `${repository} 조회 실패: ${message} (${hint})`;
  }
  if (/^401\b/.test(message) || /Bad credentials/i.test(message)) {
    return `${repository} 조회 실패: ${message} (GITHUB_TOKEN이 만료되었거나 잘못되었습니다.)`;
  }
  if (/^403\b/.test(message)) {
    return `${repository} 조회 실패: ${message} (GITHUB_TOKEN 권한 또는 SAFIRA organization 승인 상태를 확인해야 합니다.)`;
  }
  return `${repository} 조회 실패: ${message}`;
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

  async function listContext({
    repoLimit = 6,
    issueLimit = 4,
    fileLimit = DEFAULT_FILE_LIMIT,
    fileByteLimit = DEFAULT_FILE_BYTE_LIMIT
  } = {}) {
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

      try {
        const branch = repo.default_branch || 'main';
        const tree = await fetchJson(
          fetchImpl,
          `https://api.github.com/repos/${repo.full_name}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
          headers
        );
        const files = selectRepositoryFiles(tree.tree, fileLimit);
        for (const file of files) {
          try {
            const payload = await fetchJson(
              fetchImpl,
              `https://api.github.com/repos/${repo.full_name}/contents/${encodeContentPath(file.path)}?ref=${encodeURIComponent(branch)}`,
              headers
            );
            const excerpt = compactExcerpt(decodeGitHubContent(payload), fileByteLimit);
            if (excerpt) {
              contexts.push(`${repo.full_name} file ${file.path}: ${excerpt}`);
            }
          } catch (error) {
            contexts.push(`${repo.full_name} file ${file.path} 조회 실패: ${error.message}`);
          }
        }
      } catch (error) {
        contexts.push(`${repo.full_name} 파일 목록 조회 실패: ${error.message}`);
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
        contexts.push(formatRepositoryAccessError(repository, error, Boolean(token)));
      }
    }

    try {
      const repos = await fetchJson(
        fetchImpl,
        `https://api.github.com/orgs/${organization}/repos?type=all&per_page=${repoLimit}&sort=updated`,
        headers
      );

      if (!Array.isArray(repos) || repos.length === 0) {
        if (contexts.length > 0) return contexts;
        return [`GitHub organization ${organizationUrl}: repository가 없거나 read-only 접근 권한이 없습니다.`];
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
