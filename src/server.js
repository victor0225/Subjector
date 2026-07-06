import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEntry, applyCardToEntry } from './domain/entries.js';
import { generateCardsForEntry } from './domain/cards.js';
import { generateMeetingRecord } from './domain/meetingRecord.js';
import { generateTaskCandidates } from './domain/taskCandidates.js';
import { applyTaskToSubjector } from './domain/subjectorHandoff.js';
import { JsonStore } from './storage/jsonStore.js';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(rootDir, 'src', 'public');
const store = new JsonStore(join(rootDir, 'data', 'state.json'));
const port = Number(process.env.PORT ?? 3000);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function loadState() {
  const state = await store.load();
  return {
    entries: state.entries ?? [],
    meetingRecord: state.meetingRecord ?? null,
    tasks: state.tasks ?? [],
    handoffs: state.handoffs ?? []
  };
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/state') {
    return json(response, 200, await loadState());
  }

  if (request.method === 'POST' && url.pathname === '/api/entries') {
    const input = await readJson(request);
    const state = await loadState();
    const entry = createEntry({ text: input.text, mode: input.mode ?? 'live' });
    entry.cards = generateCardsForEntry({
      entry,
      existingTasks: state.tasks.map((task) => task.title)
    });
    state.entries.push(entry);
    await store.save(state);
    return json(response, 201, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/simple-memo') {
    const input = await readJson(request);
    const state = await loadState();
    const entry = createEntry({ text: input.text, mode: 'memo', kind: 'structured' });
    entry.cards = [];
    state.entries.push(entry);
    await store.save(state);
    return json(response, 201, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/apply-card') {
    const input = await readJson(request);
    const state = await loadState();
    state.entries = state.entries.map((entry) => (
      entry.id === input.entryId
        ? applyCardToEntry({ entry, cardId: input.cardId, improvedText: input.improvedText })
        : entry
    ));
    await store.save(state);
    return json(response, 200, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/meeting-record') {
    const state = await loadState();
    state.meetingRecord = generateMeetingRecord({
      entries: state.entries,
      decisions: state.entries.filter((entry) => entry.kind === 'strengthened').map((entry) => entry.text)
    });
    await store.save(state);
    return json(response, 200, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/task-candidates') {
    const state = await loadState();
    state.tasks = generateTaskCandidates({ meetingRecord: state.meetingRecord, entries: state.entries });
    await store.save(state);
    return json(response, 200, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/apply-task') {
    const input = await readJson(request);
    const state = await loadState();
    const task = state.tasks.find((candidate) => candidate.id === input.taskId);
    if (!task) {
      return json(response, 404, { error: 'Task not found' });
    }
    const updatedTask = { ...task, ...input.patch, applied: true };
    state.tasks = state.tasks.map((candidate) => candidate.id === task.id ? updatedTask : candidate);
    state.handoffs.push(applyTaskToSubjector({ task: updatedTask }));
    await store.save(state);
    return json(response, 200, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/reflect-task') {
    const input = await readJson(request);
    const state = await loadState();
    state.tasks = state.tasks.map((candidate) => (
      candidate.id === input.taskId
        ? { ...candidate, reflected: true, applied: false }
        : candidate
    ));
    await store.save(state);
    return json(response, 200, state);
  }

  if (request.method === 'POST' && url.pathname === '/api/remove-task') {
    const input = await readJson(request);
    const state = await loadState();
    state.tasks = state.tasks.filter((candidate) => candidate.id !== input.taskId);
    await store.save(state);
    return json(response, 200, state);
  }

  return json(response, 404, { error: 'Not found' });
}

async function serveStatic(response, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(publicDir, safePath);
  const data = await readFile(filePath);
  const type = contentTypes[extname(filePath)] ?? 'application/octet-stream';
  response.writeHead(200, { 'content-type': type });
  response.end(data);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error) {
    if (error.code === 'ENOENT') {
      json(response, 404, { error: 'Not found' });
      return;
    }
    json(response, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`IDEA CRUISE running at http://localhost:${port}`);
});
