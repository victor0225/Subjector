import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIdeaCruisePage } from '../src/domain/ideaCruisePage.js';

test('renderIdeaCruisePage exposes the two-layer roadmap desk', () => {
  const html = renderIdeaCruisePage();

  assert.doesNotMatch(html, /<<<<<<<|=======|>>>>>>>/);
  assert.match(html, /IDEA CRUISE Roadmap Desk/);
  assert.match(html, /1F Topic Root Layer/);
  assert.match(html, /2층 상세/);
  assert.match(html, /card-popover/);
  assert.match(html, /Task Candidates/);
  assert.match(html, /Public Questions/);
  assert.match(html, /id="load-roadmap"/);
  assert.match(html, /id="refresh-roadmap"/);
  assert.doesNotMatch(html, /Meeting Record|generate-record|copy-record/);
  assert.doesNotMatch(html, /간단 메모 붙여넣기/);
  assert.doesNotMatch(html, /라이브 회의/);
  assert.doesNotMatch(html, /Completed Brainstorming Inputs/);
});

test('renderIdeaCruisePage keeps model labels out of the top-right header', () => {
  const html = renderIdeaCruisePage();

  const headerStatus = html.match(/<div class="status">([\s\S]*?)<\/div>/)?.[1] || '';
  assert.match(headerStatus, /id="open-question-drawer"[^>]*>질문/);
  assert.doesNotMatch(headerStatus, /로드맵 생성: GPT-5\.4/);
  assert.doesNotMatch(headerStatus, /Task 후보 생성: GPT-5\.4/);
  assert.doesNotMatch(headerStatus, /감지 예민도 기본/);
  assert.match(html, /자료조사, 검증, 구현/);
  assert.doesNotMatch(html, /회의록 생성: Gemini 2\.5 Flash-Lite/);
  assert.doesNotMatch(html, /Task 최종 정제: Gemini 2\.5 Flash-Lite/);
});

test('renderIdeaCruisePage stores topic/root state locally', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /topics: defaultTopics\(\)/);
  assert.match(html, /activeTopicId: null/);
  assert.match(html, /function activeTopic\(\)/);
  assert.match(html, /function addTopic\(/);
  assert.match(html, /function removeActiveTopic\(\)/);
  assert.match(html, /parentId/);
  assert.match(html, /root-line/);
  assert.match(html, /impact-line/);
});

test('renderIdeaCruisePage supports fixed topics as hard editing boundaries', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /topic\.fixed = !topic\.fixed/);
  assert.match(html, /고정된 기준 카드입니다/);
  assert.match(html, /고정된 topic은 고정 해제 후 수정할 수 있습니다/);
});

test('renderIdeaCruisePage prioritizes split and conflict cards', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function localSplitCard\(topic\)/);
  assert.match(html, /기능별 topic 분리 제안/);
  assert.match(html, /childTopics/);
  assert.match(html, /function localConflictCard\(topic\)/);
  assert.match(html, /고정 topic과 충돌/);
  assert.match(html, /ensurePriorityCards\(topic\)/);
});

test('renderIdeaCruisePage keeps second floor as roadmap detail without old topic editor or AI card stack', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /renderRoadmapDetailSections\(topic\)/);
  assert.doesNotMatch(html, /Topic 제목<input data-topic-title/);
  assert.doesNotMatch(html, /Topic 내용<textarea data-topic-text/);
  assert.doesNotMatch(html, /renderPrimaryCard\(topic, card, pendingCount\)/);
  assert.doesNotMatch(html, /data-toggle-pending|data-promote-card|data-apply-card|data-dismiss-card/);
  assert.doesNotMatch(html, /AI 수정안 초안|우리가 하기로 한 것|대기 카드/);
});

test('renderIdeaCruisePage shows conflict explanation in the second floor detail', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function conflictDetailSections\(topic\)/);
  assert.match(html, /conflict-detail/);
  assert.match(html, /conflict-meeting-question/);
  assert.match(html, /affectedTopicIds/);
});

test('renderIdeaCruisePage clamps topic nodes and opens details from the fixed card size', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /\.topic-node \{/);
  assert.match(html, /height: 158px/);
  assert.match(html, /overflow: hidden/);
  assert.match(html, /\.topic-summary/);
  assert.match(html, /<span class="topic-summary">/);
  assert.match(html, /data-toggle-topic-detail/);
  assert.match(html, /detail-focus/);
});

test('renderIdeaCruisePage consumes split cards after apply or dismiss', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /topic\.splitApplied = true/);
  assert.match(html, /topic\.splitDismissed = true/);
  assert.match(html, /!topic\.splitApplied && !topic\.splitDismissed/);
});

test('renderIdeaCruisePage keeps roadmap cards as reference criteria instead of task handoff', () => {
  const html = renderIdeaCruisePage();

  assert.doesNotMatch(html, /data-complete-topic|Task 후보로 보냄|Task 후보 대상/);
  assert.doesNotMatch(html, /function completeTopic\(/);
  assert.doesNotMatch(html, /완료된 topic이 없습니다/);
});

test('renderIdeaCruisePage calls existing IDEA CRUISE APIs', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /fetch\('\/idea-cruise\/roadmap-patch'/);
  assert.match(html, /fetch\('\/idea-cruise\/cards'/);
  assert.match(html, /fetch\('\/idea-cruise\/questions'/);
  assert.match(html, /fetch\('\/idea-cruise\/task-candidates'/);
  assert.match(html, /fetch\('\/idea-cruise\/tasks'/);
  assert.match(html, /fetch\('\/idea-cruise\/task-updates'/);
  assert.match(html, /completedTopics\(\)\.map/);
  assert.doesNotMatch(html, /idea-cruise-refresh-pin|로드맵 반영 PIN/);
});

test('renderIdeaCruisePage merges refreshed Subjector context without overwriting fixed topics', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function mergeRoadmapContext\(topics\)/);
  assert.match(html, /sourceExternalId/);
  assert.match(html, /externalUpdateCard\(existing, incoming\)/);
  assert.match(html, /고정 topic에 최신 변경이 도착했습니다/);
  assert.match(html, /로드맵 기준: 회의에서 확정된 내용 우선/);
  assert.match(html, /hasTeamOpinion/);
});

test('renderIdeaCruisePage supports fixed activity panels, anonymous questions, and roadmap controls', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /grid-template-columns: minmax\(720px, 2fr\) minmax\(340px, 1fr\)/);
  assert.match(html, /\.roadmap-panel \{ display: flex; flex-direction: column; height: calc\(100vh - 150px\)/);
  assert.match(html, /\.roadmap-shell \{[\s\S]*flex: 1/);
  assert.doesNotMatch(html, /height: calc\(100% - 272px\)/);
  assert.match(html, /\.task-panel, \.question-drawer \.question-panel \{ height:/);
  assert.match(html, /id="question-log"/);
  assert.match(html, /id="clear-questions"/);
  assert.match(html, /질문 기록 지우기/);
  assert.match(html, /id="task-list"/);
  assert.match(html, /회의 자료로 task 생성/);
  assert.doesNotMatch(html, /grid-template-rows: minmax\(380px, 6fr\) minmax\(260px, 4fr\)/);
  assert.doesNotMatch(html, /감지 예민도 기본/);
  assert.match(html, /id="zoom-in"/);
  assert.match(html, /id="zoom-out"/);
  assert.match(html, /data-move-topic/);
  assert.doesNotMatch(html, /질문자|담당자 지정|질문에서 task/);
});

test('renderIdeaCruisePage keeps public questions in a right drawer opened from the top right', () => {
  const html = renderIdeaCruisePage();
  const sideStack = html.match(/<section class="side-stack">([\s\S]*?)<\/section>\s*<\/main>/)?.[1] || '';
  const questionDrawer = html.match(/<aside id="question-drawer"[\s\S]*?<\/aside>/)?.[0] || '';

  assert.match(html, /id="open-question-drawer"[^>]*>질문/);
  assert.match(html, /id="question-drawer"/);
  assert.match(html, /class="question-drawer/);
  assert.match(html, /id="close-question-drawer"/);
  assert.match(html, /\.question-drawer \.question-panel \{[\s\S]*display: flex;[\s\S]*flex-direction: column/);
  assert.match(html, /\.question-area \{[\s\S]*flex: 1/);
  assert.doesNotMatch(html, /\.question-area \{[\s\S]*height: calc\(100% - 78px\)/);
  assert.match(html, /state\.questionDrawerOpen/);
  assert.match(html, /document\.body\.classList\.toggle\('question-drawer-open'/);
  assert.match(html, /document\.getElementById\('open-question-drawer'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('close-question-drawer'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('question-drawer-backdrop'\)\.addEventListener/);
  assert.match(sideStack, /Task Candidates|task-panel/);
  assert.doesNotMatch(sideStack, /Public Questions|question-panel/);
  assert.match(questionDrawer, /Public Questions/);
  assert.match(questionDrawer, /id="question-form"/);
});

test('renderIdeaCruisePage color codes roadmap card states', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /\.topic-node\.existing-card/);
  assert.match(html, /background: #effaf4/);
  assert.match(html, /\.topic-node\.action-card/);
  assert.match(html, /background: #fff3cf/);
  assert.match(html, /\.topic-node\.conflict/);
  assert.match(html, /background: #ffe3e1/);
  assert.match(html, /function topicVisualState\(topic, currentCard\)/);
  assert.match(html, /topic\.fixed/);
});

test('renderIdeaCruisePage matches the pinned roadmap card mockup behavior', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /id="save-roadmap"/);
  assert.match(html, /로드맵 저장/);
  assert.match(html, /id="load-roadmap"/);
  assert.match(html, /저장본 불러오기/);
  assert.match(html, /id="refresh-roadmap"/);
  assert.match(html, /최신 반영 불러오기/);
  assert.match(html, /saveRoadmapSnapshot\(\)/);
  assert.match(html, /loadRoadmapSnapshot\(\)/);
  assert.match(html, /refreshRoadmapContext\(\)/);
  assert.match(html, /카드 고정 = 기준 확정/);
  assert.match(html, /로드맵 저장 = 회의 마침 기준 보관/);
  assert.match(html, /function roadmapDetailSections\(topic\)/);
  assert.match(html, /기준 내용/);
  assert.match(html, /회의에서 확정된 근거/);
  assert.match(html, /적용 범위/);
  assert.match(html, /현재 정리된 내용/);
  assert.match(html, /아직 결정 안 된 부분/);
  assert.match(html, /if \(topic\.fixed\) \{[\s\S]*기준 내용[\s\S]*회의에서 확정된 근거[\s\S]*적용 범위/);
  assert.match(html, /return \[[\s\S]*현재 정리된 내용[\s\S]*아직 결정 안 된 부분/);
  assert.match(html, /data-toggle-fixed/);
});

test('renderIdeaCruisePage starts with the tactical headset first-floor roadmap shape', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /idea-cruise-roadmap-v6/);
  assert.match(html, /pinned-roadmap-v6/);
  assert.match(html, /function defaultTopics\(\)/);
  assert.match(html, /전술 헤드셋 MVP 기준/);
  assert.match(html, /소리 수집 장치부/);
  assert.match(html, /라즈베리 파이 학습부/);
  assert.match(html, /헤드셋 통신부/);
  assert.match(html, /데이터 기준/);
  assert.match(html, /parentId: 'roadmap-goal'/);
  assert.match(html, /parentId: 'roadmap-learning'/);
  assert.match(html, /position: \{ x: 56, y: 280 \}/);
  assert.match(html, /position: \{ x: 366, y: 96 \}/);
  assert.match(html, /position: \{ x: 676, y: 238 \}/);
});

test('renderIdeaCruisePage task candidates use the approved editable fields and source reason', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /data-field="title"/);
  assert.match(html, /data-field="neededInfo"/);
  assert.match(html, /data-field="doneCriteria"/);
  assert.match(html, /data-field="assignee"/);
  assert.match(html, /data-field="importance"/);
  assert.match(html, /생성 맥락/);
  assert.match(html, /<option>미배정<\/option><option>조수현<\/option><option>김조은<\/option><option>배민성<\/option>/);
  assert.doesNotMatch(html, /Task 보완 기준/);
});

test('renderIdeaCruisePage removes successfully applied tasks and preserves failures', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /state\.tasks = state\.tasks\.filter\(function\(item\) \{ return item\.id !== task\.id; \}\)/);
  assert.match(html, /task\.error = error\.message/);
  assert.match(html, /반영 실패/);
});

test('renderIdeaCruisePage separates final task refinement buckets', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /state\.existingTaskUpdates/);
  assert.match(html, /기존 task 보강/);
  assert.match(html, /확인할 것만 보강/);
  assert.match(html, /완료 기준 변경 포함/);
  assert.match(html, /data-remove-not-task/);
  assert.match(html, /data-remove-task-update/);
  assert.match(html, /data-remove-task/);
});

test('renderIdeaCruisePage removes the old meeting record workflow from the desk', () => {
  const html = renderIdeaCruisePage();

  assert.doesNotMatch(html, /function buildMeetingRecord\(\)/);
  assert.doesNotMatch(html, /오늘 판단한 것|로드맵 변화|다음 회의로 넘길 맥락/);
  assert.doesNotMatch(html, /Meeting Record|회의록 생성 버튼|결과록 복사/);
  assert.doesNotMatch(html, /document\.getElementById\('generate-record'\)|document\.getElementById\('copy-record'\)/);
});


test('renderIdeaCruisePage prioritizes decision and exclusion lanes in the roadmap', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /pinned-roadmap-v6/);
  assert.match(html, /function priorityScore\(card\)/);
  assert.match(html, /function prioritizedCards\(cards, selectedIndex\)/);
  assert.doesNotMatch(html, /먼저 판단: 지금 결정해야 다음으로 감|보류\/제외: 지금은 다른 생각 먼저|branch-now|branch-later|선택하면 이쪽으로 심화/);
});

test('renderIdeaCruisePage keeps roadmap creation focused without the old process explainer', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /GitHub와 회의 자료를 바탕으로 로드맵을 생성하고 갱신합니다/);
  assert.match(html, /로드맵 기준: 회의에서 확정된 내용 우선/);
  assert.match(html, /고정 카드는 보존/);
  assert.match(html, /소리 수집·학습·통신·데이터 기준/);
  assert.doesNotMatch(html, /meeting-flow|회의 전 로드맵 반영|기존 로드맵 보며 회의·녹음|회의 녹음본 업로드|#finals/);
});

test('renderIdeaCruisePage documents strict roadmap reflection criteria in code', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /ROADMAP_REFLECTION_CRITERIA/);
  assert.match(html, /targetId: 'roadmap-comm'[\s\S]*통신/);
  assert.match(html, /targetId: 'roadmap-data'[\s\S]*데이터/);
  assert.match(html, /targetId: 'roadmap-learning'[\s\S]*학습/);
  assert.match(html, /targetId: 'roadmap-sound'[\s\S]*ESP32/);
  assert.match(html, /for \(const criterion of ROADMAP_REFLECTION_CRITERIA\)/);
});

test('renderIdeaCruisePage removes old ambiguity card editing controls from the second floor', () => {
  const html = renderIdeaCruisePage();

  assert.doesNotMatch(html, /AI 수정안 초안/);
  assert.doesNotMatch(html, /우리가 하기로 한 것/);
  assert.doesNotMatch(html, /data-card-decision-note/);
  assert.doesNotMatch(html, /data-apply-card/);
  assert.doesNotMatch(html, /data-dismiss-card/);
  assert.doesNotMatch(html, />무시</);
  assert.doesNotMatch(html, /수정 후 반영/);
  assert.doesNotMatch(html, /활동창|활동 창/);
});

test('renderIdeaCruisePage imports reflected roadmap cards from context topics', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /incoming\.cards/);
  assert.match(html, /mapApiCard\(card/);
  assert.match(html, /sourceType === 'roadmap-reflection'/);
});

test('renderIdeaCruisePage overlays old roadmap reflections onto existing first-floor cards', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function mergeIncomingRoadmapReflection\(incoming\)/);
  assert.match(html, /const target = matchRoadmapTopicForIncoming\(incoming\)/);
  assert.match(html, /target\.hasTeamOpinion = true/);
  assert.match(html, /incoming\.sourceType === 'roadmap-reflection'[\s\S]*mergeIncomingRoadmapReflection\(incoming\);[\s\S]*return;/);
  assert.match(html, /function shouldSkipIncomingContext\(incoming\)/);
  assert.match(html, /incoming\.sourceType === 'github'/);
  assert.match(html, /조회 실패/);
  assert.match(html, /return;\s*\n\s*\}/);
  assert.doesNotMatch(html, /firstReflectedTopicId = topic\.id/);
});

test('renderIdeaCruisePage applies roadmap patches instead of turning meeting context or tasks into first-floor cards', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /function applyRoadmapPatch\(roadmapPatch\)/);
  assert.match(html, /fetch\('\/idea-cruise\/roadmap-patch'/);
  assert.match(html, /method: 'POST'/);
  assert.match(html, /roadmapSnapshot: state\.topics\.map/);
  assert.match(html, /applyRoadmapPatch\(result\.roadmapPatch/);
  assert.match(html, /meetingEvidence/);
  assert.match(html, /회의 근거/);
  assert.doesNotMatch(html, /incoming\.sourceType === 'meeting-context'[\s\S]*state\.topics\.push/);
  assert.doesNotMatch(html, /title: 'Task: '/);
});

test('renderIdeaCruisePage makes meeting-material task generation the main task workflow', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /회의 자료로 task 생성/);
  assert.match(html, /id="task-meeting-record"/);
  assert.match(html, /const taskMeetingRecordEl = document\.getElementById\('task-meeting-record'\)/);
  assert.match(html, /requestTaskCandidates\(\{ meetingRecord: taskMeetingRecordEl\.value/);
  assert.match(html, /meetingRecord: meetingRecord/);
  assert.doesNotMatch(html, /이번 회의만 예외|수기 회의록과 task 분배안/);
  assert.doesNotMatch(html, /완료된 topic에서/);
});

test('renderIdeaCruisePage binds visible controls without removed DOM references', () => {
  const html = renderIdeaCruisePage();

  assert.match(html, /document\.getElementById\('add-topic'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('refresh-roadmap'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('load-roadmap'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('refresh-tasks'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('question-form'\)\.addEventListener/);
  assert.match(html, /document\.getElementById\('clear-questions'\)\.addEventListener/);
  assert.doesNotMatch(html, /document\.getElementById\('direct-meeting-text'\)|document\.getElementById\('generate-direct-tasks'\)/);
});

test('renderIdeaCruisePage emits parseable inline JavaScript with existing DOM ids', () => {
  const html = renderIdeaCruisePage();
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
  const refs = [...html.matchAll(/document\.getElementById\('([^']+)'\)/g)].map((match) => match[1]);
  const missing = refs.filter((id) => !ids.has(id));
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] || '';

  assert.deepEqual(missing, []);
  assert.doesNotThrow(() => new Function(script));
});
