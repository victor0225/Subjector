import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildBootHealthStatus,
  registerIdeaCruiseRoute,
  handleDirectDmMessage,
  handleCodexPromptCopyButton,
  handleMeetingCandidateDecisionButton,
  handleMeetingCandidateEditButton,
  handleMeetingCandidateEditViewSubmission,
  handleMeetingFileMessage,
  handleMeetingParticipantInputButton,
  handleMeetingParticipantInputViewSubmission,
  handleMeetingParticipantSkipWaitingButton,
  handleMeetingSpeakerMappingButton,
  handleMeetingTaskApprovalButton,
  handleTaskAcceptButton,
  handleTaskAcceptDirectButton,
  handleTaskActionButton,
  handleTaskActionViewSubmission
} from '../src/slack/app.js';

const config = {
  leadUserKey: 'suhyeon',
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' }
  ]
};

const teamConfig = {
  leadUserKey: 'suhyeon',
  users: [
    { key: 'suhyeon', slackId: 'U1', fullName: '조수현', displayName: '수현' },
    { key: 'joeun', slackId: 'U2', fullName: '김조은', displayName: '조은' },
    { key: 'minsung', slackId: 'U3', fullName: '배민성', displayName: '민성' }
  ]
};

function createJsonResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function createHtmlResponse() {
  return {
    statusCode: null,
    contentType: null,
    body: '',
    cookies: [],
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(type) {
      this.contentType = type;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    }
  };
}

test('buildBootHealthStatus reports OpenAI when meeting task extraction uses OpenAI', () => {
  const status = buildBootHealthStatus({
    supabase: { url: 'https://example.supabase.co', serviceRoleKey: 'service-key' },
    ai: { evaluationProvider: 'gemini', meetingTaskProvider: 'openai' },
    openai: { apiKey: 'sk-key' },
    channels: { meeting: 'C1', inProcess: 'C2', finals: 'C3' },
    deployment: { commit: 'c8ca660668af4a73e0e8db9e8e77d7fbc83517e9' }
  });

  assert.equal(status.openai.ok, true);
  assert.match(status.openai.message, /task extraction/);
  assert.equal(status.deployment.ok, true);
  assert.match(status.deployment.message, /c8ca660/);
});

test('createSlackApp wires IDEA CRUISE roadmap and task candidates to OpenAI GPT-5.4 while transcription stays Gemini', () => {
  const source = readFileSync(new URL('../src/slack/app.js', import.meta.url), 'utf8');

  assert.match(source, /createOpenAiIdeaCruiseTaskGenerator/);
  assert.match(source, /createOpenAiIdeaCruiseRoadmapPatchGenerator/);
  assert.match(source, /model: config\.openai\.taskExtractionModel/);
  assert.doesNotMatch(source, /createGeminiIdeaCruiseTaskGenerator/);
  assert.match(source, /createGeminiMeetingTranscriber/);
});


test('createSlackApp logs Slack handler errors instead of letting them escape silently', () => {
  const source = readFileSync(new URL('../src/slack/app.js', import.meta.url), 'utf8');

  assert.match(source, /Direct DM handler failed/);
  assert.match(source, /app\.error\(async/);
  assert.match(source, /Slack app error/);
});
test('registerIdeaCruiseRoute prompts for the health PIN before serving IDEA CRUISE', () => {
  const routes = [];
  const receiver = {
    router: {
      get(path, handler) {
        routes.push({ method: 'get', path, handler });
      },
      post(path, handler) {
        routes.push({ method: 'post', path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: { ...teamConfig, healthPin: '1234' }
  });

  const route = routes.find((item) => item.method === 'get' && item.path === '/idea-cruise');
  assert.ok(route);

  const response = createHtmlResponse();
  route.handler({ query: {}, headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.contentType, 'html');
  assert.match(response.body, /IDEA CRUISE 접근 PIN/);
  assert.doesNotMatch(response.body, /1F Topic Root Layer/);
});

test('registerIdeaCruiseRoute accepts the health PIN and sets an IDEA CRUISE session cookie', () => {
  const routes = [];
  const receiver = {
    router: {
      get(path, handler) {
        routes.push({ method: 'get', path, handler });
      },
      post() {}
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: { ...teamConfig, healthPin: '1234' }
  });

  const route = routes.find((item) => item.method === 'get' && item.path === '/idea-cruise');
  const response = createHtmlResponse();
  route.handler({ query: { pin: '1234' }, headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.contentType, 'html');
  assert.match(response.body, /IDEA CRUISE/);
  assert.match(response.body, /1F Topic Root Layer/);
  assert.match(response.body, /2층 상세/);
  assert.match(response.body, /Task Candidates/);
  assert.match(response.body, /Public Questions/);
  assert.match(response.body, /card-popover/);
  assert.doesNotMatch(response.body, /Meeting Record|generate-record|copy-record/);
  assert.equal(response.cookies[0].name, 'idea_cruise_access');
  assert.equal(response.cookies[0].options.httpOnly, true);
  assert.equal(response.cookies[0].options.maxAge, 24 * 60 * 60 * 1000);
  assert.equal(response.cookies[0].options.path, '/idea-cruise');
});

test('registerIdeaCruiseRoute rejects IDEA CRUISE task apply without an assignee', async () => {
  const routes = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {},
    inProcessService: {}
  });

  const route = routes.find((item) => item.path === '/idea-cruise/tasks');
  const response = createJsonResponse();
  await route.handler({
    body: {
      title: '센서 후보 비교',
      assignee: '미배정'
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /담당자/);
});

test('registerIdeaCruiseRoute rejects roadmap refresh context without IDEA CRUISE access', async () => {
  const routes = [];
  const receiver = {
    router: {
      get(path, handler) {
        routes.push({ method: 'get', path, handler });
      },
      post() {}
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: { ...teamConfig, healthPin: '1234' },
    store: {
      async listAllTasks() {
        return [
          {
            id: 'task-1',
            assigneeUserKey: 'suhyeon',
            title: '하드웨어 후보 비교',
            status: '수락',
            context: {
              why: '초기 개발 보드를 정해야 함',
              neededInfo: '가격과 전력',
              doneCriteria: '추천 후보 1개',
              changeHistory: [
                {
                  why: 'ESP32 기준 비교로 좁힘',
                  neededInfo: '전력 확인',
                  doneCriteria: '추천 후보 1개 제시',
                  rawText: '[해야 할 일 변경]\nESP32 기준 비교',
                  createdAt: '2026-07-08T01:00:00.000Z'
                }
              ]
            }
          }
        ];
      },
      async listAllChangeRequests() {
        return [
          {
            taskId: 'task-1',
            taskTitle: '하드웨어 후보 비교',
            status: '기록됨',
            rawText: '[변경 제안]\nESP32 중심으로 비교',
            createdAt: '2026-07-08T02:00:00.000Z'
          }
        ];
      },
      async listRecentRoadmapReflections() {
        return [
          {
            externalId: 'roadmap-reflection-1710000000.000400',
            parentExternalId: '',
            sourceType: 'roadmap-reflection',
            title: '회의 반영: 소음 차단 범위 결정',
            text: '소음 차단은 우선 폭음/충격음 중심으로 좁힌다.',
            cards: [
              {
                kind: 'decision',
                type: 'AI 애매함 검토',
                title: '소음 차단 범위 결정',
                body: '회의록에서 차단 범위가 넓게 남아 있다.',
                suggestion: '폭음/충격음 중심으로 좁힌다.'
              }
            ]
          }
        ];
      },
      async listRecentMeetingContexts() {
        return [
          [
            '회의: Subjector 프로젝트 하드웨어 및 AI 모델 설계 회의',
            '요약: ESP32 기반의 무선 통신 헤드셋 제작과 EfficientAT 기반 소리 분류 AI 모델 구축 방안을 조율함.',
            '결정: 기성 차음 귀마개 개조 / MANET 통신 프로토콜 설계'
          ].join('\n')
        ];
      }
    },
    githubContextProvider: {
      async listContext() {
        return ['repo SAFIRA-ondevice/headset | updated: 2026-07-08'];
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/roadmap-context');
  const rejected = createJsonResponse();
  await route.handler({ query: {}, headers: {} }, rejected);
  assert.equal(rejected.statusCode, 401);
  assert.equal(rejected.body.ok, false);
  assert.match(rejected.body.error, /PIN/);
});

test('registerIdeaCruiseRoute serves roadmap refresh context with the health PIN', async () => {
  const routes = [];
  const receiver = {
    router: {
      get(path, handler) {
        routes.push({ method: 'get', path, handler });
      },
      post() {}
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: { ...teamConfig, healthPin: '1234' },
    store: {
      async listAllTasks() {
        return [
          {
            id: 'task-1',
            assigneeUserKey: 'suhyeon',
            title: '하드웨어 후보 비교',
            status: '수락',
            context: {
              why: '초기 개발 보드를 정해야 함',
              neededInfo: '가격과 전력',
              doneCriteria: '추천 후보 1개',
              changeHistory: [
                {
                  why: 'ESP32 기준 비교로 좁힘',
                  neededInfo: '전력 확인',
                  doneCriteria: '추천 후보 1개 제시',
                  rawText: '[해야 할 일 변경]\nESP32 기준 비교',
                  createdAt: '2026-07-08T01:00:00.000Z'
                }
              ]
            }
          }
        ];
      },
      async listAllChangeRequests() {
        return [
          {
            taskId: 'task-1',
            taskTitle: '하드웨어 후보 비교',
            status: '기록됨',
            rawText: '[변경 제안]\nESP32 중심으로 비교',
            createdAt: '2026-07-08T02:00:00.000Z'
          }
        ];
      },
      async listRecentRoadmapReflections() {
        return [
          {
            externalId: 'roadmap-reflection-1710000000.000400',
            parentExternalId: '',
            sourceType: 'roadmap-reflection',
            title: '회의 반영: 소음 차단 범위 결정',
            text: '소음 차단은 우선 폭음/충격음 중심으로 좁힌다.',
            cards: [
              {
                kind: 'decision',
                type: 'AI 애매함 검토',
                title: '소음 차단 범위 결정',
                body: '회의록에서 차단 범위가 넓게 남아 있다.',
                suggestion: '폭음/충격음 중심으로 좁힌다.'
              }
            ]
          }
        ];
      },
      async listRecentMeetingContexts() {
        return [
          [
            '회의: Subjector 프로젝트 하드웨어 및 AI 모델 설계 회의',
            '요약: ESP32 기반의 무선 통신 헤드셋 제작과 EfficientAT 기반 소리 분류 AI 모델 구축 방안을 조율함.',
            '결정: 기성 차음 귀마개 개조 / MANET 통신 프로토콜 설계'
          ].join('\n')
        ];
      }
    },
    githubContextProvider: {
      async listContext() {
        return ['repo SAFIRA-ondevice/headset | updated: 2026-07-08'];
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/roadmap-context');
  const accepted = createJsonResponse();
  await route.handler({ query: { pin: '1234' }, headers: {} }, accepted);
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.body.ok, true);
  assert.ok(accepted.body.topics.some((topic) => topic.title === 'GitHub 프로젝트 상태'));
  assert.ok(accepted.body.topics.every((topic) => !String(topic.title).startsWith('Task: ')));
  assert.ok(accepted.body.topics.every((topic) => topic.sourceType !== 'meeting-context'));
  assert.ok(accepted.body.topics.every((topic) => topic.sourceType !== 'subjector-task'));
  const reflection = accepted.body.topics.find((topic) => topic.sourceType === 'roadmap-reflection');
  assert.equal(reflection.title, '회의 반영: 소음 차단 범위 결정');
  assert.equal(reflection.cards[0].kind, 'decision');
});

test('registerIdeaCruiseRoute creates roadmap patches from the current roadmap and meeting evidence', async () => {
  const routes = [];
  const generatorCalls = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {
      async listAllTasks() {
        return [
          {
            id: 'task-1',
            assigneeUserKey: 'suhyeon',
            title: '하드웨어 후보 비교',
            status: '수락',
            context: {
              why: 'ESP32 통신 보드를 정해야 함',
              neededInfo: '거리별 지연',
              doneCriteria: 'MANET 방식 후보 비교'
            }
          },
          {
            id: 'task-cleaned',
            assigneeUserKey: 'joeun',
            title: '회의에서 정리한 임시 기준',
            status: '정리됨',
            context: {
              cleanupHistory: [
                {
                  cleanupType: 'task로 하지 않음',
                  reason: '로드맵 구멍을 인지하고 별도 task로 진행하지 않음'
                }
              ]
            }
          }
        ];
      },
      async listAllChangeRequests() {
        return [];
      },
      async listRecentMeetingContexts() {
        return [
          '회의: 하드웨어 및 AI 모델 설계\n결정: 기성 차음 귀마개 개조, EfficientAT 검토, MANET 통신 설계'
        ];
      }
    },
    githubContextProvider: {
      async listContext() {
        return ['repo SAFIRA-ondevice/Soohyun | updated'];
      }
    },
    roadmapPatchGenerator: {
      async generate(input) {
        generatorCalls.push(input);
        return {
          updatedTopics: [
            {
              targetId: 'roadmap-sound',
              text: '기성 차음 귀마개 개조와 ESP32 입력을 기준으로 소리 수집부를 정리한다.',
              meetingEvidence: ['회의: 기성 차음 귀마개 개조 결정']
            }
          ],
          createdTopics: []
        };
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/roadmap-patch');
  const response = createJsonResponse();
  await route.handler({
    body: {
      roadmapSnapshot: [
        { id: 'roadmap-sound', title: '헤드셋, ESP32 연결부', text: '소리 듣는 부분' }
      ]
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.roadmapPatch.updatedTopics[0].targetId, 'roadmap-sound');
  assert.match(generatorCalls[0].meetingMaterials, /기성 차음 귀마개/);
  assert.match(generatorCalls[0].taskSignals[0].text, /MANET 방식 후보 비교/);
  assert.match(generatorCalls[0].taskSignals.find((signal) => signal.id === 'subjector-task-task-cleaned').text, /task로 하지 않음/);
  assert.equal(generatorCalls[0].currentRoadmap[0].id, 'roadmap-sound');
  assert.ok(response.body.topics.every((topic) => !String(topic.title).startsWith('Task: ')));
  assert.ok(response.body.topics.every((topic) => topic.sourceType !== 'meeting-context'));
});

test('registerIdeaCruiseRoute rejects IDEA CRUISE task apply with an unknown assignee', async () => {
  const routes = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {},
    inProcessService: {}
  });

  const route = routes.find((item) => item.path === '/idea-cruise/tasks');
  const response = createJsonResponse();
  await route.handler({
    body: {
      title: '센서 후보 비교',
      assignee: '홍길동'
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /등록되지 않은 담당자/);
});

test('registerIdeaCruiseRoute creates an IDEA CRUISE task and refreshes the assignee board', async () => {
  const routes = [];
  const storeCalls = [];
  const refreshCalls = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {
      async createIdeaCruiseTask(input) {
        storeCalls.push(input);
      }
    },
    inProcessService: {
      async refreshBoardForUser(input) {
        refreshCalls.push(input);
        return { action: 'updated', taskCount: 3 };
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/tasks');
  const response = createJsonResponse();
  await route.handler({
    body: {
      title: 'ESP32와 라즈베리 파이 비교',
      neededInfo: '가격, 전력, 구현 난이도',
      doneCriteria: '비교표와 추천안이 정리됨',
      reason: '하드웨어 후보를 좁혀야 실제 구매와 구현이 가능하다.',
      assignee: '김조은',
      importance: '높음',
      meetingRecord: '오늘은 후보 기준을 정했다.'
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(storeCalls[0].assigneeUserKey, 'joeun');
  assert.equal(storeCalls[0].title, 'ESP32와 라즈베리 파이 비교');
  assert.equal(storeCalls[0].importance, '높음');
  assert.equal(storeCalls[0].context.source, 'IDEA CRUISE');
  assert.equal(storeCalls[0].context.why, '하드웨어 후보를 좁혀야 실제 구매와 구현이 가능하다.');
  assert.equal(storeCalls[0].context.neededInfo, '가격, 전력, 구현 난이도');
  assert.equal(storeCalls[0].context.doneCriteria, '비교표와 추천안이 정리됨');
  assert.equal(refreshCalls[0].user.key, 'joeun');
  assert.equal(response.body.board.taskCount, 3);
});

test('registerIdeaCruiseRoute boosts an existing IDEA CRUISE task and refreshes the assignee board', async () => {
  const routes = [];
  const storeCalls = [];
  const refreshCalls = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {
      async updateIdeaCruiseTaskContext(input) {
        storeCalls.push(input);
        return { assigneeUserKey: 'suhyeon' };
      }
    },
    inProcessService: {
      async refreshBoardForUser(input) {
        refreshCalls.push(input);
        return { action: 'updated', taskCount: 2 };
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/task-updates');
  const response = createJsonResponse();
  await route.handler({
    body: {
      taskId: 'task-1',
      addNeededInfo: '1차 개발 보드와 최종 목표 보드를 분리해서 비교',
      doneCriteriaChange: '비교표에 최종 추천 후보 1개 포함',
      includeDoneCriteriaChange: true,
      meetingRecord: '하드웨어 방향 보강'
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(storeCalls[0].taskId, 'task-1');
  assert.equal(storeCalls[0].includeDoneCriteriaChange, true);
  assert.equal(refreshCalls[0].user.key, 'suhyeon');
  assert.equal(response.body.board.taskCount, 2);
});

test('registerIdeaCruiseRoute creates live intervention cards through the analyzer', async () => {
  const routes = [];
  const analyzerCalls = [];
  const storeCalls = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {
      async listRecentMeetingContexts(input) {
        storeCalls.push(['listRecentMeetingContexts', input]);
        return ['최근 전사: 공사현장용과 전장용 목적이 충돌할 수 있음'];
      }
    },
    cardAnalyzer: {
      async analyze(input) {
        analyzerCalls.push(input);
        return [
          {
            type: '데이터 후보',
            tag: 'info',
            title: '폭음 정의부터 고정',
            body: '총성, 폭발음, 공사장 충격음을 구분해야 합니다.',
            suggestion: '전장 폭음 차단 목적이면 총성/폭발음 데이터 범주를 먼저 정합니다.'
          }
        ];
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/cards');
  const response = createJsonResponse();
  await route.handler({
    body: {
      entryText: '전장 상황에서 폭음을 막아주는 역할이라면 학습해야 할 데이터는 무엇인가?',
      completedEntries: ['헤드셋 목적은 전장 소음 대응']
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.cards[0].title, '폭음 정의부터 고정');
  assert.match(analyzerCalls[0].entryText, /폭음/);
  assert.equal(analyzerCalls[0].githubOrganization, 'https://github.com/SAFIRA-ondevice');
  assert.deepEqual(analyzerCalls[0].meetingContexts, ['최근 전사: 공사현장용과 전장용 목적이 충돌할 수 있음']);
  assert.deepEqual(storeCalls[0], ['listRecentMeetingContexts', { limit: 5 }]);
});

test('registerIdeaCruiseRoute stores anonymous public IDEA CRUISE questions', async () => {
  const routes = [];
  const analyzerCalls = [];
  const receiver = {
    router: {
      get(path, handler) {
        routes.push({ method: 'get', path, handler });
      },
      post(path, handler) {
        routes.push({ method: 'post', path, handler });
      },
      delete(path, handler) {
        routes.push({ method: 'delete', path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {
      async listRecentMeetingContexts() {
        return ['회의록: 폭음 차단 중심으로 좁힘'];
      }
    },
    cardAnalyzer: {
      async analyze(input) {
        analyzerCalls.push(input);
        return [
          {
            title: '로드맵 기준 답변',
            body: '현재 기준은 폭음/충격음 중심입니다.',
            suggestion: 'MVP에서는 소음 차단만 먼저 확인하세요.'
          }
        ];
      }
    }
  });

  const postRoute = routes.find((item) => item.method === 'post' && item.path === '/idea-cruise/questions');
  const getRoute = routes.find((item) => item.method === 'get' && item.path === '/idea-cruise/questions');
  const deleteRoute = routes.find((item) => item.method === 'delete' && item.path === '/idea-cruise/questions');

  const postResponse = createJsonResponse();
  await postRoute.handler({
    body: {
      question: '이번 MVP에서 주변음 보존도 같이 해야 하나?',
      roadmapSnapshot: [{ title: '마이크', text: '폭음/충격음 중심' }]
    }
  }, postResponse);

  assert.equal(postResponse.statusCode, 200);
  assert.equal(postResponse.body.ok, true);
  assert.equal(postResponse.body.messages.length, 2);
  assert.equal(postResponse.body.messages[0].role, 'question');
  assert.equal(postResponse.body.messages[1].role, 'answer');
  assert.match(postResponse.body.messages[1].text, /폭음/);
  assert.match(analyzerCalls[0].entryText, /이번 MVP/);
  assert.deepEqual(analyzerCalls[0].completedEntries, ['마이크: 폭음/충격음 중심']);

  const getResponse = createJsonResponse();
  await getRoute.handler({}, getResponse);
  assert.equal(getResponse.statusCode, 200);
  assert.equal(getResponse.body.messages.length, 2);

  const deleteResponse = createJsonResponse();
  await deleteRoute.handler({}, deleteResponse);
  assert.equal(deleteResponse.statusCode, 200);
  assert.deepEqual(deleteResponse.body.messages, []);
});

test('registerIdeaCruiseRoute creates IDEA CRUISE task candidates through the generator', async () => {
  const routes = [];
  const generatorCalls = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig,
    store: {
      async listAllTasks() {
        return [
          {
            id: 'task-cleaned',
            title: '회의에서 이미 정리한 기준',
            status: '정리됨',
            context: {
              cleanupHistory: [
                {
                  cleanupType: '회의에서 해결됨',
                  reason: '오늘 회의에서 기준을 정해서 추가 task로 진행하지 않음'
                }
              ]
            }
          }
        ];
      },
      async listRecentMeetingContexts() {
        return ['회의-결과록: 녹음본 전사에서 5~10m 통신 우선 확인'];
      }
    },
    taskCandidateGenerator: {
      async generate(input) {
        generatorCalls.push(input);
        return {
          tasks: [
            {
              pageId: 'page-1',
              pageNumber: 1,
              title: '폭음 데이터셋 라이선스 확인',
              neededInfo: 'AudioSet 라이선스와 라벨 구조',
              doneCriteria: '사용 가능 여부 표 작성',
              assignee: '미배정',
              importance: '높음'
            }
          ],
          notTasks: ['AudioSet 개념 설명']
        };
      }
    }
  });

  const route = routes.find((item) => item.path === '/idea-cruise/task-candidates');
  const response = createJsonResponse();
  await route.handler({
    body: {
      completedPages: [
        {
          id: 'page-1',
          number: 1,
          title: '폭음 데이터',
          text: '공사현장 위험음 감지로 좁힘'
        }
      ],
      meetingRecord: '수기 회의록: 데이터 기준은 학습부 아래에 둠'
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.tasks[0].title, '폭음 데이터셋 라이선스 확인');
  assert.deepEqual(response.body.notTasks, ['AudioSet 개념 설명']);
  assert.match(generatorCalls[0].completedPages[0].text, /공사현장/);
  assert.match(generatorCalls[0].meetingRecord, /수기 회의록/);
  assert.match(generatorCalls[0].meetingRecord, /회의-결과록: 녹음본 전사/);
  assert.match(generatorCalls[0].currentTasks[0].status, /정리됨/);
  assert.match(generatorCalls[0].currentTasks[0].context.cleanupHistory[0].reason, /추가 task로 진행하지 않음/);
});

test('registerIdeaCruiseRoute rejects task candidate generation when generator is missing', async () => {
  const routes = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig
  });

  const route = routes.find((item) => item.path === '/idea-cruise/task-candidates');
  const response = createJsonResponse();
  await route.handler({
    body: {
      completedPages: [{ id: 'page-1', number: 1, title: '테스트', text: '내용' }]
    }
  }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /Task 후보 생성/);
});

test('registerIdeaCruiseRoute rejects live intervention card analysis when analyzer is missing', async () => {
  const routes = [];
  const receiver = {
    router: {
      get() {},
      post(path, handler) {
        routes.push({ path, handler });
      }
    }
  };

  registerIdeaCruiseRoute(receiver, {
    config: teamConfig
  });

  const route = routes.find((item) => item.path === '/idea-cruise/cards');
  const response = createJsonResponse();
  await route.handler({
    body: {
      entryText: '테스트 질문'
    }
  }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /AI Analysis/);
});

test('handleDirectDmMessage opens the personal task board for 출근', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_SUHYEON',
      user: 'U1',
      text: '출근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleStartWork(input) {
        serviceCalls.push(input);
        return {
          action: 'posted',
          personalTaskCount: 2,
          dmText: '수현님, 개인 task 보드를 열었습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(serviceCalls[0].dmChannelId, 'D_SUHYEON');
  assert.equal(replies.length, 0);
});

test('handleDirectDmMessage reports personal task board open failures to the user', async () => {
  const replies = [];
  const errors = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '출근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error(error) { errors.push(error); } },
    inProcessService: {
      async handleStartWork() {
        throw new Error('Slack post failed');
      }
    }
  });

  assert.equal(errors.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /개인 task 보드를 열지 못했습니다/);
  assert.match(replies[0].text, /Render 로그/);
});

test('handleDirectDmMessage refreshes every team member board for 최신화', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_SUHYEON',
      user: 'U1',
      text: '최신화'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async refreshBoardForUser(input) {
        serviceCalls.push(input);
        return {
          action: 'updated',
          taskCount: 1
        };
      }
    }
  });

  assert.deepEqual(serviceCalls.map((call) => call.user.key), ['suhyeon', 'joeun', 'minsung']);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /팀 전체/);
  assert.match(replies[0].text, /3명/);
});

test('handleDirectDmMessage reports team refresh failures with the visible 최신화 command', async () => {
  const replies = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_SUHYEON',
      user: 'U1',
      text: '최신화'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async refreshBoardForUser() {
        throw new Error('slack failed');
      }
    }
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /다시 '최신화'/);
  assert.doesNotMatch(replies[0].text, /전체 최신화/);
});
test('handleDirectDmMessage lets the lead refresh every team member board', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '전체 최신화'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async refreshBoardForUser(input) {
        serviceCalls.push(input);
        return {
          action: 'updated',
          taskCount: 1
        };
      }
    }
  });

  assert.deepEqual(serviceCalls.map((call) => call.user.key), ['suhyeon', 'joeun', 'minsung']);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /팀 전체/);
  assert.match(replies[0].text, /3명/);
});

test('handleDirectDmMessage lets non-lead users refresh every team member board through the compatibility alias', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U2',
      text: '전체 최신화'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async refreshBoardForUser(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.deepEqual(serviceCalls.map((call) => call.user.key), ['suhyeon', 'joeun', 'minsung']);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /팀 전체/);
});

test('handleDirectDmMessage sends a daily summary for 오늘 요약 commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '오늘 요약'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleDailySummary(input) {
        serviceCalls.push(input);
        return {
          dmText: '수현님, 오늘 한 일 요약입니다.\n- 센서 후보 정리'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /오늘 한 일 요약/);
});

test('handleDirectDmMessage folds the personal task board for 퇴근', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_SUHYEON',
      user: 'U1',
      text: '퇴근'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleEndWork(input) {
        serviceCalls.push(input);
        return {
          dmText: '수현님, 오늘 작업을 종료했습니다. 미완료 task는 다음 출근 때 다시 표시됩니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].dmChannelId, 'D_SUHYEON');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /오늘 작업을 종료했습니다/);
  assert.doesNotMatch(replies[0].text, /오늘 한 일 요약/);
});

test('handleDirectDmMessage reports daily summary failures to the user', async () => {
  const replies = [];
  const errors = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: '오늘 요약'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error(error) { errors.push(error); } },
    inProcessService: {
      async handleDailySummary() {
        throw new Error('summary failed');
      }
    }
  });

  assert.equal(errors.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /오늘 한 일 요약 생성에 실패했습니다/);
  assert.match(replies[0].text, /Render 로그/);
});

test('handleDirectDmMessage directly updates finals for lead finals update commands', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: 'finals 업데이트'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleFinalsPreview(input) {
        serviceCalls.push(input);
        return {
          dmText: '#finals 누적 정리를 업데이트했습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].user.key, 'suhyeon');
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /#finals 누적 정리를 업데이트했습니다/);
  assert.equal(replies[0].blocks.some((block) => block.type === 'actions'), false);
});

test('handleDirectDmMessage no longer exposes test task cleanup as a DM command', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_LEAD',
      user: 'U1',
      text: '테스트 task 정리'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleArchiveTestTasks(input) {
        serviceCalls.push(input);
        return {
          dmText: '수현님, 테스트 task를 보관 처리했습니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /사용할 수 있는 명령어/);
  assert.doesNotMatch(replies[0].text, /테스트 task 정리/);
});

test('handleDirectDmMessage no longer records raw meeting text through a DM command', async () => {
  const replies = [];
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_LEAD',
      ts: '1710000000.000200',
      user: 'U1',
      text: '회의 기록: ESP32 기준으로 진행하기로 함'
    },
    say: async (payload) => replies.push(payload),
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleRawMeetingText(input) {
        serviceCalls.push(input);
        return {
          text: '수동 회의 기록을 저장했습니다.',
          directMessages: [
            {
              slackId: 'U1',
              text: '수현님, 중요하다고 보는 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '수현님' } }]
            },
            {
              slackId: 'U2',
              text: '조은님, 중요하다고 보는 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '조은님' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 0);
  assert.equal(openedDms.length, 0);
  assert.equal(postedMessages.length, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /사용할 수 있는 명령어/);
  assert.doesNotMatch(replies[0].text, /회의 기록/);
});

test('handleDirectDmMessage requests IDEA CRUISE roadmap reflection from the lead', async () => {
  const replies = [];
  const serviceCalls = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      channel: 'D_LEAD',
      ts: '1710000000.000300',
      user: 'U1',
      text: '로드맵 반영'
    },
    say: async (payload) => replies.push(payload),
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleRoadmapReflectionRequest(input) {
        serviceCalls.push(input);
        return {
          text: '로드맵 반영 요청을 확인했습니다. #회의-결과록의 일반 메시지 기준으로 반영합니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].submittedByUserKey, 'suhyeon');
  assert.match(replies[0].text, /로드맵 반영 요청/);
  assert.match(replies[0].text, /#회의-결과록/);
});

test('handleDirectDmMessage reports finals preview failures to the lead', async () => {
  const replies = [];
  const errors = [];

  await handleDirectDmMessage({
    message: {
      channel_type: 'im',
      user: 'U1',
      text: 'finals 업데이트'
    },
    say: async (payload) => replies.push(payload),
    config,
    logger: { info() {}, error(error) { errors.push(error); } },
    inProcessService: {
      async handleFinalsPreview() {
        throw new Error('finals failed');
      }
    }
  });

  assert.equal(errors.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /#finals 업데이트에 실패했습니다/);
  assert.match(replies[0].text, /Render 로그/);
});

test('handleMeetingFileMessage posts a processing thread reply for meeting audio uploads', async () => {
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingFileMessage({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    logger: { info() {}, error() {} },
    meetingService: {
      async handleMeetingFileMessage(input) {
        serviceCalls.push(input);
        return {
          channel: input.message.channel,
          threadTs: input.message.ts,
          text: '회의 녹음 업로드를 확인했습니다.\n다음 단계에서 전사와 Speaker A/B/C 매핑을 진행합니다.'
        };
      }
    }
  });

  assert.equal(serviceCalls.length, 1);
  assert.equal(postedMessages.length, 1);
  assert.equal(postedMessages[0].channel, 'C_MEETING');
  assert.equal(postedMessages[0].thread_ts, '1710000000.000100');
  assert.match(postedMessages[0].text, /회의 녹음 업로드를 확인했습니다/);
  assert.match(postedMessages[0].blocks[0].text.text, /Speaker A\/B\/C/);
});

test('handleMeetingFileMessage runs meeting transcription in the background', async () => {
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingFileMessage({
    message: {
      channel: 'C_MEETING',
      ts: '1710000000.000100',
      user: 'U1',
      files: [{ name: '졸작회의.m4a', mimetype: 'audio/mp4' }]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    logger: { info() {}, error() {} },
    backgroundRunner: async (task) => {
      await task();
    },
    meetingService: {
      async handleMeetingFileMessage(input) {
        serviceCalls.push(['upload', input]);
        return {
          channel: input.message.channel,
          threadTs: input.message.ts,
          text: '회의 녹음 업로드를 확인했습니다.'
        };
      },
      async processMeetingAudioUpload(input) {
        serviceCalls.push(['process', input]);
        return {
          channel: input.message.channel,
          threadTs: input.message.ts,
          text: '전사가 완료되었습니다. Speaker A/B/C를 실제 사람으로 지정해 주세요.',
          blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '전사가 완료되었습니다.' } }]
        };
      }
    }
  });

  assert.equal(serviceCalls[0][0], 'upload');
  assert.equal(serviceCalls[1][0], 'process');
  assert.equal(postedMessages.length, 3);
  assert.match(postedMessages[1].text, /회의 전사를 시작했습니다/);
  assert.match(postedMessages[1].text, /61MB 같은 긴 녹음/);
  assert.match(postedMessages[2].text, /전사가 완료되었습니다/);
});

test('handleMeetingSpeakerMappingButton lets only the lead map speakers', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker A',
            userKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping(input) {
        serviceCalls.push(input);
        return {
          text: 'Speaker A를 수현님으로 저장했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].speakerLabel, 'Speaker A');
  assert.match(postedMessages[0].text, /수현님으로 저장했습니다/);
});

test('handleMeetingSpeakerMappingButton posts task approval when task candidates are extracted', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker C',
            userKey: 'minsung'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(['ephemeral', input]),
        postMessage: async (input) => postedMessages.push(['message', input])
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping(input) {
        serviceCalls.push(input);
        return {
          text: 'Speaker C를 민성님으로 저장했습니다.',
          threadMessage: {
            channel: 'C_MEETING',
            threadTs: '1710000000.000100',
            text: 'task 후보 추출이 완료되었습니다.',
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'task 후보 추출이 완료되었습니다.' } }]
          }
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(postedMessages[0][0], 'ephemeral');
  assert.match(postedMessages[0][1].text, /민성님으로 저장했습니다/);
  assert.equal(postedMessages[1][0], 'message');
  assert.equal(postedMessages[1][1].thread_ts, '1710000000.000100');
  assert.match(postedMessages[1][1].text, /task 후보 추출이 완료되었습니다/);
});

test('handleMeetingSpeakerMappingButton sends participant task input DMs', async () => {
  let acked = false;
  const postedMessages = [];
  const openedDms = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker B',
            userKey: 'joeun'
          })
        }
      ]
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postEphemeral: async (input) => postedMessages.push(['ephemeral', input]),
        postMessage: async (input) => postedMessages.push(['message', input])
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping() {
        return {
          text: 'Speaker B를 조은님으로 저장했습니다.',
          threadMessage: {
            channel: 'C_MEETING',
            threadTs: '1710000000.000100',
            text: 'Speaker A/B/C 매핑이 완료되었습니다.'
          },
          directMessages: [
            {
              slackId: 'U1',
              text: '수현님, 먼저 해야 할 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '수현님' } }]
            },
            {
              slackId: 'U2',
              text: '조은님, 먼저 해야 할 일을 적어 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '조은님' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(openedDms.length, 2);
  assert.equal(openedDms[0].users, 'U1');
  assert.equal(openedDms[1].users, 'U2');
  assert.match(postedMessages.at(-1)[1].text, /조은님/);
});

test('handleMeetingParticipantInputButton opens the participant input modal', async () => {
  let acked = false;
  const openedViews = [];

  await handleMeetingParticipantInputButton({
    ack: async () => {
      acked = true;
    },
    body: {
      trigger_id: 'trigger-1',
      channel: { id: 'D_U1' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            userKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      views: {
        open: async (input) => openedViews.push(input)
      },
      chat: {
        postMessage: async () => {}
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} }
  });

  assert.equal(acked, true);
  assert.equal(openedViews[0].trigger_id, 'trigger-1');
  assert.equal(openedViews[0].view.callback_id, 'meeting_participant_task_input_submission');
});

test('handleMeetingParticipantInputViewSubmission stores the answer and sends candidate review DMs', async () => {
  let acked = false;
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleMeetingParticipantInputViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        sourceChannelId: 'C_MEETING',
        sourceMessageTs: '1710000000.000100',
        userKey: 'suhyeon'
      }),
      state: {
        values: {
          meeting_participant_task_input: {
            raw_text: {
              value: '나는 회의 처리 흐름을 먼저 점검한다.'
            }
          }
        }
      }
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleParticipantTaskInput(input) {
        serviceCalls.push(input);
        return {
          text: '답변을 저장했습니다. 담당자별 task 후보 검토 DM을 보냈습니다.',
          candidateReviewMessages: [
            {
              slackId: 'U2',
              text: '조은님, 후보를 확인해 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '후보' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].rawText, '나는 회의 처리 흐름을 먼저 점검한다.');
  assert.equal(openedDms[0].users, 'U1');
  assert.equal(openedDms[1].users, 'U2');
  assert.match(postedMessages[1].text, /후보/);
});

test('handleMeetingParticipantSkipWaitingButton lets the lead continue with collected answers', async () => {
  let acked = false;
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleMeetingParticipantSkipWaitingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'D_U1' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: `D_${input.users}` } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleParticipantSkipWaiting(input) {
        serviceCalls.push(input);
        return {
          text: '테스트용으로 현재 답변만으로 task 후보를 생성했습니다.',
          candidateReviewMessages: [
            {
              slackId: 'U1',
              text: '수현님, 후보를 확인해 주세요.',
              blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '후보' } }]
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].requestedByUserKey, 'suhyeon');
  assert.match(postedMessages[0].text, /현재 답변만으로/);
  assert.equal(openedDms[0].users, 'U1');
  assert.match(postedMessages[1].text, /후보/);
});

test('handleMeetingParticipantSkipWaitingButton rejects non-lead users', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingParticipantSkipWaitingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'D_U2' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleParticipantSkipWaiting(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 0);
  assert.match(postedMessages[0].text, /수현님만/);
});

test('handleMeetingCandidateDecisionButton stores an accepted candidate', async () => {
  let acked = false;
  const serviceCalls = [];
  const postedMessages = [];
  const updatedMessages = [];

  await handleMeetingCandidateDecisionButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'D_U2' },
      message: {
        ts: '1700000000.000200',
        text: '조은님, 후보를 확인해 주세요.',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '후보 안내' } },
          { type: 'section', text: { type: 'mrkdwn', text: '1. 센서 후보 비교' } },
          {
            type: 'actions',
            block_id: 'meeting_candidate_review_0',
            elements: [
              {
                type: 'button',
                action_id: 'meeting_candidate_accept',
                text: { type: 'plain_text', text: '채택' },
                value: JSON.stringify({
                  sourceChannelId: 'C_MEETING',
                  sourceMessageTs: '1710000000.000100',
                  candidateIndex: 0,
                  assigneeUserKey: 'joeun'
                })
              }
            ]
          }
        ]
      },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            candidateIndex: 0,
            assigneeUserKey: 'joeun'
          })
        }
      ]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input),
        update: async (input) => updatedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    decision: 'accepted',
    meetingService: {
      async handleCandidateReview(input) {
        serviceCalls.push(input);
        return {
          text: '센서 후보 비교 task를 #in-process에 저장했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].reviewedByUserKey, 'joeun');
  assert.equal(serviceCalls[0].decision, 'accepted');
  assert.match(postedMessages[0].text, /#in-process/);
  assert.equal(updatedMessages[0].channel, 'D_U2');
  assert.equal(updatedMessages[0].ts, '1700000000.000200');
  assert.equal(updatedMessages[0].blocks.some((block) => block.block_id === 'meeting_candidate_review_0'), false);
  assert.match(updatedMessages[0].blocks.at(-1).text.text, /처리 완료/);
});

test('handleMeetingCandidateEditButton opens a modal with the candidate text', async () => {
  let acked = false;
  const openedViews = [];

  await handleMeetingCandidateEditButton({
    ack: async () => {
      acked = true;
    },
    body: {
      trigger_id: 'trigger-edit',
      channel: { id: 'D_U2' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            candidateIndex: 0,
            assigneeUserKey: 'joeun'
          })
        }
      ]
    },
    client: {
      views: {
        open: async (input) => openedViews.push(input)
      },
      chat: {
        postMessage: async () => {}
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async getMeetingTaskCandidate() {
        return {
          taskCandidate: {
            title: '센서 후보 비교',
            importance: '🔴 상',
            coordination: '🟡 중',
            context: {
              why: '조은님이 먼저 할 일로 답했다.',
              completionCriteria: ['비교표 작성']
            }
          }
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(openedViews[0].trigger_id, 'trigger-edit');
  assert.equal(openedViews[0].view.callback_id, 'meeting_candidate_edit_submission');
  assert.equal(openedViews[0].view.blocks[0].element.initial_value, '센서 후보 비교');
});

test('handleMeetingCandidateEditViewSubmission saves an edited candidate as a task', async () => {
  let acked = false;
  const serviceCalls = [];
  const openedDms = [];
  const postedMessages = [];

  await handleMeetingCandidateEditViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U2' }
    },
    view: {
      private_metadata: JSON.stringify({
        sourceChannelId: 'C_MEETING',
        sourceMessageTs: '1710000000.000100',
        candidateIndex: 0,
        assigneeUserKey: 'joeun'
      }),
      state: {
        values: {
          meeting_candidate_title: {
            title: {
              value: '센서 후보 3개 비교'
            }
          },
          meeting_candidate_why: {
            why: {
              value: '회의에서 센서 선정이 먼저 필요하다고 정리했다.'
            }
          },
          meeting_candidate_completion: {
            completionCriteria: {
              value: '후보 3개 비교표 작성\n추천 후보 1개 제시'
            }
          }
        }
      }
    },
    client: {
      conversations: {
        open: async (input) => {
          openedDms.push(input);
          return { channel: { id: 'D_U2' } };
        }
      },
      chat: {
        postMessage: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleCandidateReview(input) {
        serviceCalls.push(input);
        return {
          text: '센서 후보 3개 비교 task를 #in-process에 저장했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].decision, 'edited_accepted');
  assert.equal(serviceCalls[0].editedCandidate.title, '센서 후보 3개 비교');
  assert.deepEqual(serviceCalls[0].editedCandidate.completionCriteria, ['후보 3개 비교표 작성', '추천 후보 1개 제시']);
  assert.equal(openedDms[0].users, 'U2');
  assert.match(postedMessages[0].text, /#in-process/);
});

test('handleMeetingTaskApprovalButton lets only the lead create extracted tasks', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingTaskApprovalButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U1' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      chat: {
        postMessage: async (input) => postedMessages.push(input),
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleTaskApproval(input) {
        serviceCalls.push(input);
        return {
          text: 'task 2개를 생성했습니다. 다음 출근 때 #in-process에서 확인할 수 있습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(postedMessages[0].thread_ts, '1710000000.000100');
  assert.match(postedMessages[0].text, /task 2개를 생성했습니다/);
});

test('handleMeetingTaskApprovalButton rejects non-lead users', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingTaskApprovalButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleTaskApproval(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 0);
  assert.match(postedMessages[0].text, /task 반영 승인은 수현님만/);
});

test('handleMeetingSpeakerMappingButton rejects non-lead users', async () => {
  let acked = false;
  const postedMessages = [];
  const serviceCalls = [];

  await handleMeetingSpeakerMappingButton({
    ack: async () => {
      acked = true;
    },
    body: {
      channel: { id: 'C_MEETING' },
      user: { id: 'U2' },
      actions: [
        {
          value: JSON.stringify({
            sourceChannelId: 'C_MEETING',
            sourceMessageTs: '1710000000.000100',
            speakerLabel: 'Speaker A',
            userKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => postedMessages.push(input)
      }
    },
    config: teamConfig,
    logger: { info() {}, error() {} },
    meetingService: {
      async handleSpeakerMapping(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 0);
  assert.match(postedMessages[0].text, /Speaker 매핑은 수현님만/);
});

test('handleTaskActionButton opens the matching Slack modal', async () => {
  let acked = false;
  const opened = [];

  await handleTaskActionButton({
    ack: async () => { acked = true; },
    body: {
      trigger_id: 'trigger-1',
      actions: [
        {
          action_id: 'task_complete',
          value: JSON.stringify({
            actionId: 'task_complete',
            taskId: 'task-1',
            assigneeUserKey: 'suhyeon'
          })
        }
      ]
    },
    client: {
      views: {
        open: async (input) => opened.push(input)
      }
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async getTaskTitle() {
        return '센서 후보 정리';
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].trigger_id, 'trigger-1');
  assert.equal(opened[0].view.callback_id, 'task_action_submission');
  assert.match(opened[0].view.blocks[0].text.text, /센서 후보 정리/);
});

test('handleTaskAcceptButton accepts a task and generates a Codex prompt', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskAcceptButton({
    ack: async () => { acked = true; },
    body: {
      actions: [
        {
          action_id: 'task_accept_generate_prompt',
          value: JSON.stringify({
            actionId: 'task_accept_generate_prompt',
            taskId: 'task-1',
            assigneeUserKey: 'suhyeon'
          })
        }
      ]
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskAcceptAndPrompt(input) {
        serviceCalls.push(input);
        return {
          status: '수락',
          responseText: '수현님, Codex 프롬프트를 생성했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].taskId, 'task-1');
  assert.equal(serviceCalls[0].assigneeUserKey, 'suhyeon');
});

test('handleTaskAcceptDirectButton accepts a task without generating a Codex prompt', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskAcceptDirectButton({
    ack: async () => { acked = true; },
    body: {
      actions: [
        {
          action_id: 'task_accept_direct',
          value: JSON.stringify({
            actionId: 'task_accept_direct',
            taskId: 'task-1',
            assigneeUserKey: 'suhyeon'
          })
        }
      ]
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskAcceptDirect(input) {
        serviceCalls.push(input);
        return {
          status: '수락',
          responseText: '수현님, 직접 진행으로 수락했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.deepEqual(serviceCalls[0], {
    taskId: 'task-1',
    assigneeUserKey: 'suhyeon'
  });
});

test('handleCodexPromptCopyButton acknowledges and sends a copyable ephemeral prompt', async () => {
  let acked = false;
  const serviceCalls = [];
  const ephemeralMessages = [];

  await handleCodexPromptCopyButton({
    ack: async () => { acked = true; },
    body: {
      user: { id: 'U1' },
      channel: { id: 'C_IN_PROCESS' },
      actions: [
        {
          action_id: 'copy_codex_prompt',
          value: 'task-1'
        }
      ]
    },
    client: {
      chat: {
        postEphemeral: async (input) => ephemeralMessages.push(input)
      }
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleCodexPromptCopyRequest(input) {
        serviceCalls.push(input);
        return {
          text: 'Codex 프롬프트 복사용 본문입니다.',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '```Subjector Codex prompt```'
              }
            }
          ]
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.deepEqual(serviceCalls[0], { taskId: 'task-1' });
  assert.equal(ephemeralMessages[0].channel, 'C_IN_PROCESS');
  assert.equal(ephemeralMessages[0].user, 'U1');
  assert.match(ephemeralMessages[0].text, /Codex 프롬프트/);
});

test('handleTaskActionViewSubmission stores modal input through the in-process service', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_complete',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '[완료 제출 결과]'
            }
          }
        }
      }
    },
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        serviceCalls.push(input);
        return {
          status: '완료',
          responseText: '수현님, task 상태를 완료로 변경했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].submittedByUserKey, 'suhyeon');
  assert.equal(serviceCalls[0].rawText, '[완료 제출 결과]');
});

test('handleTaskActionViewSubmission passes attachment metadata and note to the service', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_file_submission',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '직접 조사 결과를 정리했습니다.'
            }
          },
          task_action_files: {
            files: {
              files: [
                {
                  id: 'F1',
                  name: '조사정리.docx',
                  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  filetype: 'docx',
                  size: 12000
                }
              ]
            }
          }
        }
      }
    },
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        serviceCalls.push(input);
        return {
          status: '완료',
          responseText: '수현님, task 상태를 완료로 변경했습니다.'
        };
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls[0].actionId, 'task_file_submission');
  assert.equal(serviceCalls[0].attachmentNote, '');
  assert.equal(serviceCalls[0].attachments[0].id, 'F1');
  assert.equal(serviceCalls[0].attachments[0].name, '조사정리.docx');
});

test('handleTaskActionViewSubmission allows text-only work submission', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_file_submission',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '첨부 없이 제출합니다.'
            }
          },
          task_action_files: {
            files: {
              files: []
            }
          }
        }
      }
    },
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].rawText, '첨부 없이 제출합니다.');
  assert.deepEqual(serviceCalls[0].attachments, []);
});

test('handleTaskActionViewSubmission allows file work submission without a separate attachment note', async () => {
  let acked = false;
  const serviceCalls = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = payload ?? true;
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_file_submission',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '오늘 진행한 그림을 첨부합니다.'
            }
          },
          task_action_files: {
            files: {
              files: [
                {
                  id: 'F2',
                  name: '흐름도.png',
                  mimetype: 'image/png',
                  filetype: 'png',
                  size: 9000
                }
              ]
            }
          }
        }
      }
    },
    config,
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        serviceCalls.push(input);
      }
    }
  });

  assert.equal(acked, true);
  assert.equal(serviceCalls.length, 1);
  assert.equal(serviceCalls[0].attachments[0].name, '흐름도.png');
  assert.equal(serviceCalls[0].attachmentNote, '');
});

test('handleTaskActionViewSubmission acknowledges before evaluation and sends ephemeral feedback', async () => {
  let acked = false;
  const events = [];

  await handleTaskActionViewSubmission({
    ack: async (payload) => {
      acked = true;
      events.push(['ack', payload]);
    },
    body: {
      user: { id: 'U1' }
    },
    view: {
      private_metadata: JSON.stringify({
        actionId: 'task_complete',
        taskId: 'task-1',
        assigneeUserKey: 'suhyeon'
      }),
      state: {
        values: {
          task_action_input: {
            raw_text: {
              value: '[완료 제출 결과]'
            }
          }
        }
      }
    },
    client: {
      chat: {
        async postEphemeral(input) {
          events.push(['postEphemeral', input]);
        }
      }
    },
    config: {
      ...config,
      channels: {
        inProcess: 'C_IN_PROCESS'
      }
    },
    logger: { info() {}, error() {} },
    inProcessService: {
      async handleTaskActionSubmission(input) {
        events.push(['service', { ackedBeforeService: acked, input }]);
        return {
          status: '보완 필요',
          responseText: '*센서 후보 정리* 완료 제출 검수 결과입니다.'
        };
      }
    }
  });

  assert.deepEqual(events.map((event) => event[0]), ['ack', 'service', 'postEphemeral']);
  assert.equal(events[1][1].ackedBeforeService, true);
  assert.equal(events[2][1].channel, 'C_IN_PROCESS');
  assert.equal(events[2][1].user, 'U1');
  assert.match(events[2][1].text, /검수 결과/);
});
