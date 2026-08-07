export function renderIdeaCruisePage() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IDEA CRUISE Roadmap Desk</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #edf3f5;
      --surface: #ffffff;
      --panel: #f8fbfc;
      --line: #d3e0e7;
      --line-strong: #9eb8c4;
      --text: #132530;
      --muted: #617484;
      --teal: #0b7769;
      --blue: #285fc6;
      --amber: #a96512;
      --red: #b8424a;
      --violet: #6a51b8;
      --teal-soft: #e6f6f0;
      --blue-soft: #eaf1ff;
      --amber-soft: #fff3dd;
      --red-soft: #fff0f1;
      --violet-soft: #f2efff;
      --shadow: 0 16px 34px rgba(19, 37, 48, 0.12);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }

    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 4px; font-size: 22px; line-height: 1.2; }
    h2 { margin-bottom: 4px; font-size: 15px; }
    h3 { margin-bottom: 8px; font-size: 15px; line-height: 1.35; }
    p { color: var(--muted); font-size: 13px; line-height: 1.48; }

    button, input, textarea, select { font: inherit; }
    button {
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 8px 10px;
      background: #fff;
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    button.primary { border-color: var(--teal); background: var(--teal); color: #fff; }
    button.danger { border-color: #efbdc2; background: #fff8f8; color: var(--red); }
    button:disabled, input:disabled, textarea:disabled { cursor: not-allowed; opacity: 0.62; }

    input, textarea, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 9px 10px;
      background: #fff;
      color: var(--text);
      font-size: 13px;
      line-height: 1.45;
    }
    textarea { min-height: 92px; resize: vertical; }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 22px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    header p { margin-bottom: 0; }

    .status, .actions, .topic-meta, .card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .status { justify-content: flex-end; }
    .status span, .tag {
      display: inline-flex;
      align-items: center;
      width: max-content;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 8px;
      background: #fff;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .tag.strong, .tag.teal { border-color: #a6d9d1; background: var(--teal-soft); color: var(--teal); }
    .tag.blue { border-color: #b7c9f6; background: var(--blue-soft); color: var(--blue); }
    .tag.amber { border-color: #efca8a; background: var(--amber-soft); color: var(--amber); }
    .tag.rose { border-color: #efbdc2; background: var(--red-soft); color: var(--red); }
    .tag.violet { border-color: #c9c0f4; background: var(--violet-soft); color: var(--violet); }

    .app-shell {
      display: grid;
      grid-template-columns: minmax(720px, 2fr) minmax(340px, 1fr);
      gap: 16px;
      padding: 18px 22px;
    }
    .side-stack {
      height: calc(100vh - 150px);
      min-height: 720px;
    }

    .panel {
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      min-height: 78px;
      padding: 14px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .panel-head p { margin-bottom: 0; }

    .roadmap-panel { display: flex; flex-direction: column; height: calc(100vh - 150px); min-height: 720px; }
    .task-panel, .question-drawer .question-panel { height: 100%; min-height: 0; }
    .question-drawer .question-panel { display: flex; flex-direction: column; }
    .roadmap-shell {
      position: relative;
      flex: 1;
      min-height: 420px;
      overflow: auto;
      background:
        linear-gradient(#dfe8ee 1px, transparent 1px),
        linear-gradient(90deg, #dfe8ee 1px, transparent 1px);
      background-size: 34px 34px;
      cursor: grab;
    }
    .roadmap-shell.dragging { cursor: grabbing; }
    .zoom-tools {
      position: sticky;
      top: 14px;
      right: 14px;
      z-index: 8;
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin: 14px 14px -46px auto;
      width: max-content;
    }
    .zoom-tools button {
      width: 34px;
      height: 34px;
      padding: 0;
    }
    .layer-label {
      position: sticky;
      top: 14px;
      left: 14px;
      z-index: 8;
      display: flex;
      align-items: center;
      gap: 8px;
      width: max-content;
      max-width: calc(100% - 28px);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 7px 10px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 8px 20px rgba(19, 37, 48, 0.08);
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .roadmap {
      position: relative;
      min-width: 980px;
      min-height: 560px;
      transform-origin: 0 0;
    }
    .root-lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }
    .root-line {
      fill: none;
      stroke: var(--line-strong);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .impact-line {
      fill: none;
      stroke: var(--red);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 8 8;
    }

    .topic-node {
      position: absolute;
      width: 220px;
      height: 158px;
      border: 1px solid var(--line);
      border-left: 5px solid var(--teal);
      border-radius: 8px;
      background: #effaf4;
      box-shadow: 0 12px 24px rgba(19, 37, 48, 0.12);
      padding: 12px;
      overflow: hidden;
      text-align: left;
      transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease, box-shadow 160ms ease;
    }
    .topic-node:hover { transform: translateY(-1px); box-shadow: 0 18px 30px rgba(19, 37, 48, 0.16); }
    .topic-node.active { outline: 3px solid rgba(11, 119, 105, 0.18); box-shadow: 0 20px 38px rgba(11, 119, 105, 0.2); }
    .topic-node.focused-detail { z-index: 9; height: 254px; box-shadow: 0 30px 60px rgba(19, 37, 48, 0.22); }
    .topic-node.existing-card {
      border-color: #bfe2d1;
      background: #effaf4;
    }
    .topic-node.action-card {
      border-color: #eed79a;
      border-left-color: var(--amber);
      background: #fff3cf;
    }
    .topic-node.fixed { border-left-color: var(--teal); }
    .topic-node.conflict { border-color: #efbdc2; border-left-color: var(--red); background: #ffe3e1; }
    .roadmap.card-layer-on .topic-node:not(.active) { opacity: 0.52; filter: grayscale(0.18); }
    .roadmap.detail-focus .topic-node:not(.focused-detail) { opacity: 0.22; filter: blur(1px) grayscale(0.22); }
    .move-handle {
      position: absolute;
      top: 9px;
      right: 9px;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--muted) !important;
      cursor: grab;
      font-size: 11px !important;
      font-weight: 900 !important;
      line-height: 1 !important;
    }
    .team-opinion-badge {
      position: absolute;
      top: 9px;
      right: 40px;
      display: inline-flex !important;
      width: auto !important;
      border: 1px solid #efca8a;
      border-radius: 999px;
      padding: 3px 6px;
      background: var(--amber-soft);
      color: var(--amber) !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      line-height: 1.1 !important;
    }
    .topic-node small {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .topic-node strong {
      display: -webkit-box;
      margin-bottom: 8px;
      overflow: hidden;
      font-size: 16px;
      line-height: 1.35;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .topic-node span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.45;
    }
    .topic-summary {
      display: -webkit-box;
      max-height: 52px;
      overflow: hidden;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
    .topic-reflection, .topic-detail-text {
      display: -webkit-box;
      overflow: hidden;
      margin-top: 6px;
      color: var(--amber) !important;
      font-size: 11px !important;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .topic-detail-text {
      max-height: 94px;
      color: var(--text) !important;
      -webkit-line-clamp: 5;
    }
    .topic-controls {
      display: flex !important;
      gap: 6px;
      margin-top: 6px;
    }
    .topic-controls span {
      display: inline-flex !important;
      width: auto;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 7px;
      background: #fff;
      color: var(--muted) !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
    }
    .topic-meta {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 10px;
      margin-top: 0;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.98));
      padding-top: 4px;
    }

    .empty-roadmap {
      position: absolute;
      left: 56px;
      top: 90px;
      width: 360px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.95);
      padding: 14px;
    }

    .card-popover {
      position: absolute;
      z-index: 12;
      width: 460px;
      max-height: calc(100vh - 190px);
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 24px 48px rgba(19, 37, 48, 0.2);
      opacity: 0;
      pointer-events: none;
      transform: translateY(10px);
      transition: opacity 160ms ease, transform 160ms ease;
    }
    .card-popover.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
    .popover-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 13px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfd;
      border-radius: 10px 10px 0 0;
    }
    .popover-head p { margin-bottom: 0; }
    .topic-actions-panel, .ai-card { display: grid; gap: 10px; padding: 12px; }
    .topic-actions-panel { border-top: 1px solid var(--line); background: #fbfdff; }
    .detail-sections {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    .detail-sections article {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfd;
      padding: 10px;
    }
    .detail-sections article.conflict-detail {
      border-color: #efbdc2;
      background: #fff0f1;
    }
    .detail-sections article.conflict-detail strong {
      color: var(--red);
    }
    .detail-sections strong {
      display: block;
      margin-bottom: 7px;
      font-size: 12px;
    }
    .detail-sections p,
    .detail-sections ul {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.48;
    }
    .detail-sections ul { padding-left: 18px; }
    .ai-card { border-left: 4px solid var(--teal); }
    .ai-card.conflict { border-left-color: var(--red); }
    .ai-card.split { border-left-color: var(--violet); }
    .ai-card.research, .ai-card.experiment { border-left-color: var(--amber); }
    .ai-card.answer { border-left-color: var(--blue); }
    .ai-card p { margin-bottom: 0; }
    .hint, .impact, .quiet-box, .task-reason, .error-log {
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #f8fbfc;
      color: var(--muted);
      padding: 9px;
      font-size: 12px;
      line-height: 1.45;
    }
    .error-log { border-color: #efbdc2; background: #fff8f8; color: var(--red); }
    .impact strong { color: var(--text); }
    .child-preview { display: grid; gap: 8px; max-height: 190px; overflow: auto; }
    .child-preview div { border: 1px solid var(--line); border-radius: 7px; padding: 9px; background: #fff; }
    .child-preview strong { display: block; margin-bottom: 5px; }
    .child-preview p { margin-bottom: 0; font-size: 12px; }
    .pending-count { align-self: center; color: var(--muted); font-size: 12px; font-weight: 800; }
    .pending-list {
      display: grid;
      gap: 7px;
      max-height: 210px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #fbfcfd;
      padding: 8px;
    }
    .pending-card-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #fff;
      padding: 8px;
    }
    .pending-card-row strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    .pending-card-row span {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
    }

    .tasks {
      display: grid;
      gap: 12px;
      max-height: calc(100% - 78px);
      min-height: 0;
      overflow: auto;
      padding: 14px;
    }
    .question-area {
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 12px;
      flex: 1;
      min-height: 0;
      padding: 14px;
    }
    .question-log {
      display: grid;
      align-content: start;
      gap: 9px;
      min-height: 0;
      overflow: auto;
    }
    .question-message {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fff;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .question-message.answer { border-left: 4px solid var(--teal); background: #fbfffd; }
    .question-message.question { border-left: 4px solid var(--blue); }
    .question-message strong {
      display: block;
      margin-bottom: 5px;
      color: var(--text);
      font-size: 12px;
    }
    .question-form {
      display: grid;
      gap: 8px;
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    .question-form textarea { min-height: 74px; }
    .task-card, .update-card, .not-task-card {
      display: grid;
      gap: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .task-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .task-card p, .update-card p, .not-task-card p { margin-bottom: 0; }
    .criteria, .task-grid, .split-update { display: grid; gap: 8px; }
    .task-grid { grid-template-columns: 1fr 1fr; }
    .criteria textarea { min-height: 72px; }
    .split-update { grid-template-columns: 1fr 1fr; }
    .update-part { border: 1px solid var(--line); border-radius: 7px; padding: 9px; background: #fbfcfd; }
    .task-filter { display: flex; flex-wrap: wrap; gap: 7px; }
    .task-filter button.active { border-color: var(--teal); background: var(--teal-soft); color: var(--teal); }
    .task-generation {
      display: grid;
      gap: 9px;
      margin-bottom: 10px;
      padding: 11px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfdff;
    }
    .task-generation textarea { min-height: 82px; }

    .question-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
      background: rgba(19, 37, 48, 0.32);
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease;
    }
    .question-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 21;
      width: min(560px, 100vw);
      height: 100vh;
      padding: 16px;
      background: var(--bg);
      box-shadow: -22px 0 44px rgba(19, 37, 48, 0.18);
      transform: translateX(100%);
      transition: transform 180ms ease;
    }
    .question-drawer[aria-hidden="true"] { pointer-events: none; }
    body.question-drawer-open { overflow: hidden; }
    body.question-drawer-open .question-drawer-backdrop {
      opacity: 1;
      pointer-events: auto;
    }
    body.question-drawer-open .question-drawer {
      transform: translateX(0);
    }

    .meeting-panel { margin: 0 22px 22px; }
    .record {
      margin: 14px;
      padding: 12px;
      min-height: 190px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
      white-space: pre-wrap;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    dialog {
      width: min(620px, calc(100vw - 40px));
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0;
    }
    dialog form { display: grid; gap: 12px; padding: 16px; }
    dialog textarea { min-height: 180px; }

    @media (max-width: 1120px) {
      header, .panel-head { flex-direction: column; }
      .app-shell { grid-template-columns: 1fr; }
      .roadmap-panel, .side-stack { height: auto; min-height: auto; }
      .task-panel { min-height: 360px; }
      .question-drawer { width: 100vw; padding: 10px; }
      .roadmap-shell, .tasks { max-height: none; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IDEA CRUISE Roadmap Desk</h1>
      <p>1층은 회의 기준 로드맵입니다. 카드 고정 = 기준 확정, 로드맵 저장 = 회의 마침 기준 보관입니다.</p>
    </div>
    <div class="status">
      <button id="open-question-drawer" class="primary" type="button">질문</button>
    </div>
  </header>

  <main class="app-shell">
    <section class="panel roadmap-panel">
      <div class="panel-head">
        <div>
          <h2>1F Topic Root Layer</h2>
          <p>GitHub와 회의 자료를 바탕으로 로드맵을 생성하고 갱신합니다. topic을 클릭하면 2층 상세가 열립니다.</p>
        </div>
        <div class="actions">
          <button id="add-topic" class="primary" type="button">Topic 추가</button>
          <button id="refresh-roadmap" type="button">최신 반영 불러오기</button>
          <button id="load-roadmap" type="button">저장본 불러오기</button>
          <button id="save-roadmap" type="button">로드맵 저장</button>
        </div>
      </div>
      <div class="hint">로드맵 기준: 회의에서 확정된 내용 우선, 고정 카드는 보존, 소리 수집·학습·통신·데이터 기준에 맞춰 왼쪽에서 오른쪽 진행 방향으로 붙입니다.</div>
      <div class="roadmap-shell">
        <div class="zoom-tools" aria-label="로드맵 확대 축소">
          <button id="zoom-out" type="button" title="축소">-</button>
          <button id="zoom-reset" type="button" title="원래 크기">1:1</button>
          <button id="zoom-in" type="button" title="확대">+</button>
        </div>
        <div class="layer-label">
          <span class="tag strong">1층</span>
          <span id="layer-state">topic을 추가하거나 클릭하세요.</span>
        </div>
        <div id="roadmap" class="roadmap">
          <svg id="root-lines" class="root-lines" aria-hidden="true"></svg>
          <div id="topic-nodes"></div>
          <section id="card-popover" class="card-popover" aria-live="polite"></section>
        </div>
      </div>
    </section>

    <section class="side-stack">
      <aside class="panel task-panel">
        <div class="panel-head">
          <div>
            <h2>Task Candidates</h2>
            <p>회의록, 회의 녹음본 전사, 현재 로드맵을 기준으로 자료조사, 검증, 구현처럼 시간이 필요한 일만 task 후보로 만듭니다.</p>
          </div>
          <button id="refresh-tasks" class="primary" type="button">회의 자료로 task 생성</button>
        </div>
        <div class="tasks">
          <div class="task-generation">
            <label>회의 자료 보충<textarea id="task-meeting-record" placeholder="회의-결과록에 올린 회의록/전사문이 있으면 자동 참고합니다. 여기에 보충 메모를 붙여도 됩니다."></textarea></label>
          </div>
          <div id="task-filter" class="task-filter"></div>
          <div id="task-generation-error"></div>
          <div id="task-list"></div>
          <div id="task-update-list"></div>
          <div id="not-task-list"></div>
        </div>
      </aside>
    </section>
  </main>

  <div id="question-drawer-backdrop" class="question-drawer-backdrop" hidden></div>
  <aside id="question-drawer" class="question-drawer" aria-hidden="true">
    <section class="panel question-panel">
      <div class="panel-head">
        <div>
          <h2>Public Questions</h2>
          <p>로드맵, GitHub, 회의록 맥락으로 바로 묻고 답합니다. 질문과 답변은 팀 전체에게 같은 로그로 보입니다.</p>
        </div>
        <div class="actions">
          <button id="clear-questions" type="button">질문 기록 지우기</button>
          <button id="close-question-drawer" type="button">닫기</button>
        </div>
      </div>
      <div class="question-area">
        <div id="question-log" class="question-log" aria-live="polite"></div>
        <form id="question-form" class="question-form">
          <label>질문<textarea id="question-input" placeholder="예: 이번 MVP에서 주변음 보존까지 같이 봐야 하나?"></textarea></label>
          <div class="actions">
            <button id="submit-question" class="primary" type="submit">질문 보내기</button>
            <span id="question-status" class="pending-count"></span>
          </div>
        </form>
      </div>
    </section>
  </aside>

  <dialog id="topic-dialog">
    <form id="topic-form" method="dialog">
      <h2>Topic 추가</h2>
      <p>새 topic은 선택한 topic 밑에 자동 root로 연결됩니다. 선택 topic이 없으면 최상위 topic으로 생성됩니다.</p>
      <label>Parent topic
        <select id="parent-topic"></select>
      </label>
      <label>Topic 제목
        <input id="topic-title-input" placeholder="예: 전술 헤드셋">
      </label>
      <label>Topic 내용
        <textarea id="topic-text-input" placeholder="회의에서 다룰 생각, 기준, 질문을 적으세요."></textarea>
      </label>
      <div class="actions">
        <button id="close-topic-dialog" type="button">닫기</button>
        <button class="primary" type="submit">추가</button>
      </div>
    </form>
  </dialog>

  <script>
    const STORAGE_KEY = 'idea-cruise-roadmap-v6';
    const ROADMAP_UI_VERSION = 'pinned-roadmap-v6';
    const ROADMAP_REFLECTION_CRITERIA = [
      {
        targetId: 'roadmap-comm',
        label: '헤드셋 통신부',
        keywords: ['통신', '거리', '채널링', '송수신', '패킷', '네트워크']
      },
      {
        targetId: 'roadmap-data',
        label: '데이터 기준',
        keywords: ['데이터', '데이터셋', '말소리', '드론', '총소리', '전투기', '헬리콥터', '라벨']
      },
      {
        targetId: 'roadmap-learning',
        label: '라즈베리 파이 학습부',
        keywords: ['학습', '모델', '정확도', '지연율', '추론', '라즈베리파이']
      },
      {
        targetId: 'roadmap-sound',
        label: '소리 수집 장치부',
        keywords: ['ESP32', '오디오', '마이크', '스피커', '헤드셋', '소리 수집', '입출력']
      }
    ];
    const state = loadState();
    let layoutCache = new Map();
    let questionMessages = [];
    let dragState = null;

    const roadmapShellEl = document.querySelector('.roadmap-shell');
    const roadmapEl = document.getElementById('roadmap');
    const rootLinesEl = document.getElementById('root-lines');
    const topicNodesEl = document.getElementById('topic-nodes');
    const cardPopoverEl = document.getElementById('card-popover');
    const layerStateEl = document.getElementById('layer-state');
    const taskListEl = document.getElementById('task-list');
    const taskUpdateListEl = document.getElementById('task-update-list');
    const notTaskListEl = document.getElementById('not-task-list');
    const taskFilterEl = document.getElementById('task-filter');
    const questionDrawerEl = document.getElementById('question-drawer');
    const questionDrawerBackdropEl = document.getElementById('question-drawer-backdrop');
    const topicDialog = document.getElementById('topic-dialog');
    const parentTopicEl = document.getElementById('parent-topic');
    const questionLogEl = document.getElementById('question-log');
    const questionInputEl = document.getElementById('question-input');
    const questionStatusEl = document.getElementById('question-status');
    const taskMeetingRecordEl = document.getElementById('task-meeting-record');

    function defaultTopics() {
      return [
        {
          id: 'roadmap-goal',
          title: '전술 헤드셋 MVP 기준',
          text: '전술 환경에서 위험 소리는 감지하고 필요한 음성 정보는 놓치지 않는 MVP 기준입니다. 회의에서 확정된 큰 방향을 먼저 고정하고, 하위 장치/학습/통신 기준을 오른쪽으로 확장합니다.',
          parentId: null,
          fixed: true,
          completed: false,
          splitApplied: false,
          splitDismissed: false,
          cards: [],
          fixedItems: ['전술 헤드셋을 Subjector MVP의 중심 주제로 둡니다.', '왼쪽에서 오른쪽으로 진행 방향을 읽습니다.'],
          scope: 'MVP 목적, 회의 기준, 이후 하위 topic의 공통 전제',
          position: { x: 56, y: 280 }
        },
        {
          id: 'roadmap-sound',
          title: '소리 수집 장치부',
          text: '헤드셋과 ESP32 또는 유사 장치를 연결해 실제 소리를 수집하는 파트입니다. 어떤 센서와 보드 조합으로 시작할지, 수집 품질을 어느 정도로 볼지 기준을 잡습니다.',
          parentId: 'roadmap-goal',
          fixed: true,
          completed: false,
          splitApplied: false,
          splitDismissed: false,
          cards: [],
          fixedItems: ['소리 입력 장치와 보드 연결을 MVP 선행 기준으로 봅니다.'],
          scope: '마이크/헤드셋 입력, ESP32 연결, 수집 안정성',
          position: { x: 366, y: 96 }
        },
        {
          id: 'roadmap-learning',
          title: '라즈베리 파이 학습부',
          text: '라즈베리 파이에서 소리 데이터를 학습하고 분류하는 파트입니다. 드론 소리, 말소리 등 실제로 학습에 넣을 데이터 기준을 오른쪽 하위 카드로 확장합니다.',
          parentId: 'roadmap-goal',
          fixed: true,
          completed: false,
          splitApplied: false,
          splitDismissed: false,
          cards: [],
          fixedItems: ['라즈베리 파이를 학습/분류 실험의 기준 장치로 둡니다.'],
          scope: '데이터셋 선정, 라벨 기준, 라즈베리 파이 추론 가능성',
          position: { x: 366, y: 280 }
        },
        {
          id: 'roadmap-comm',
          title: '헤드셋 통신부',
          text: '헤드셋 통신을 위해 라즈베리 파이끼리 또는 장치 간 통신하는 방법을 정리하는 파트입니다. 학습부와 별개로 통신 방식, 지연, 안정성을 확인합니다.',
          parentId: 'roadmap-goal',
          fixed: false,
          completed: false,
          splitApplied: false,
          splitDismissed: false,
          cards: [],
          fixedItems: [],
          scope: '라즈베리 파이 간 통신, 네트워크 방식, 지연 시간',
          position: { x: 366, y: 464 }
        },
        {
          id: 'roadmap-data',
          title: '데이터 기준',
          text: '학습부에서 실제로 사용할 소리 데이터의 종류와 출처를 정합니다. 드론 소리 데이터, 말소리 데이터처럼 학습 대상이 확정되면 하위 카드로 나눕니다.',
          parentId: 'roadmap-learning',
          fixed: false,
          completed: false,
          splitApplied: false,
          splitDismissed: false,
          cards: [],
          fixedItems: [],
          scope: '드론 소리 데이터, 말소리 데이터, 라벨/출처 기준',
          position: { x: 676, y: 238 }
        }
      ];
    }

    function defaultState() {
      return {
        topics: defaultTopics(),
        activeTopicId: null,
        tasks: [],
        existingTaskUpdates: [],
        notTasks: [],
        taskFilter: 'all',
        taskGenerationError: '',
        refreshMessage: '',
        roadmapUiVersion: ROADMAP_UI_VERSION,
        roadmapSnapshot: null,
        taskMeetingRecord: '',
        focusedDetailTopicId: null,
        roadmapScale: 1,
        questionDrawerOpen: false
      };
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        return Object.assign(defaultState(), JSON.parse(raw));
      } catch (error) {
        return defaultState();
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function saveRoadmapSnapshot() {
      const fixedCount = state.topics.filter(function(topic) { return topic.fixed; }).length;
      state.roadmapSnapshot = {
        savedAt: new Date().toISOString(),
        topics: state.topics.map(function(topic) {
          return {
            id: topic.id,
            title: topic.title,
            text: topic.text,
            parentId: topic.parentId || null,
            fixed: Boolean(topic.fixed),
            completed: Boolean(topic.completed),
            position: topic.position || null,
            hasTeamOpinion: Boolean(topic.hasTeamOpinion),
            reflectionSummary: topic.reflectionSummary || '',
            fixedItems: Array.isArray(topic.fixedItems) ? topic.fixedItems : [],
            scope: topic.scope || '',
            meetingEvidence: Array.isArray(topic.meetingEvidence) ? topic.meetingEvidence : []
          };
        }),
        fixedCount: fixedCount,
        unfixedCount: state.topics.length - fixedCount,
        taskCount: state.tasks.length + state.existingTaskUpdates.length,
        questionCount: questionMessages.length
      };
      state.refreshMessage = '로드맵 저장됨: 고정 ' + state.roadmapSnapshot.fixedCount + '개, 미고정 ' + state.roadmapSnapshot.unfixedCount + '개';
      saveState();
    }

    function normalizeSnapshotTopic(topic) {
      return Object.assign({
        id: createId('topic'),
        title: '저장된 topic',
        text: '',
        parentId: null,
        fixed: false,
        completed: false,
        splitApplied: false,
        splitDismissed: false,
        fixedItems: [],
        scope: '',
        meetingEvidence: [],
        cards: []
      }, topic, {
        cards: [],
        position: topic.position || null
      });
    }

    function loadRoadmapSnapshot() {
      const savedTopics = Array.isArray(state.roadmapSnapshot?.topics) ? state.roadmapSnapshot.topics : [];
      state.topics = savedTopics.length
        ? savedTopics.map(normalizeSnapshotTopic)
        : defaultTopics();
      const defaultById = new Map(defaultTopics().map(function(topic) { return [topic.id, topic]; }));
      const currentIds = new Set(state.topics.map(function(topic) { return topic.id; }));
      defaultById.forEach(function(topic, id) {
        if (!currentIds.has(id)) {
          state.topics.push(topic);
        }
      });
      state.activeTopicId = null;
      state.focusedDetailTopicId = null;
      state.refreshMessage = savedTopics.length ? '저장된 로드맵을 불러왔습니다.' : '기본 로드맵을 불러왔습니다.';
      saveState();
    }

    function createId(prefix) {
      return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }

    function activeTopic() {
      return state.topics.find(function(topic) { return topic.id === state.activeTopicId; }) || null;
    }

    function completedTopics() {
      return state.topics.filter(function(topic) { return topic.completed; });
    }

    function compactText(text, length) {
      return String(text || '').replace(/\\s+/g, ' ').trim().slice(0, length || 160);
    }

    function titleFromText(text) {
      const first = compactText(text, 80).split(/[.?!]/)[0].trim();
      return first.length > 28 ? first.slice(0, 28) + '...' : first;
    }

    function includesAny(text, terms) {
      return terms.some(function(term) { return text.indexOf(term) >= 0; });
    }

    function broadTopicScore(text) {
      return [
        ['마이크', '환경음', '주변음', '음성', '무전'],
        ['스피커', '출력', '안내'],
        ['데이터', '데이터셋', '학습', '라벨'],
        ['하드웨어', '보드', '라즈베리', 'ESP32', 'Seeed'],
        ['검증', '실험', '테스트', '성능']
      ].filter(function(terms) { return includesAny(text, terms); }).length;
    }

    function localSplitCard(topic) {
      return {
        id: 'split-' + topic.id,
        kind: 'split',
        type: 'topic 분리 제안',
        title: '기능별 topic 분리 제안',
        body: '이 topic에는 입력, 출력, 데이터, 검증이 섞여 있습니다. 먼저 기능별 초안으로 나누면 회의 중 어떤 부분이 고정됐고 어떤 부분이 아직 열려 있는지 더 잘 보입니다.',
        suggestion: topic.text,
        impact: '현재 topic은 parent로 유지하고, child topic들이 root로 연결됩니다. 각 child topic에는 AI 초안 내용만 들어갑니다.',
        childTopics: [
          { title: '마이크 (환경음)', text: '총성, 폭발음, 장비 충격음처럼 줄이거나 감지해야 하는 외부 위험 소리를 다룬다. 첫 MVP에서는 총성/폭발음 중심으로 좁힌다.' },
          { title: '마이크 (주변음)', text: '팀원 목소리, 무전, 경고음처럼 사용자가 놓치면 안 되는 주변 정보를 다룬다. 환경음 차단과 충돌하지 않도록 보존 기준을 정한다.' },
          { title: '내부 스피커', text: '차단되거나 줄어든 위험 정보를 사용자에게 어떤 방식으로 다시 전달할지 정한다. 안내음이 주변음 인지를 방해하지 않아야 한다.' },
          { title: '학습 데이터', text: '환경음 감지와 분류에 필요한 공개 데이터셋 후보, 라벨 구조, 라이선스를 확인한다.' },
          { title: '검증 실험', text: '소음 감소, 위험 인지 유지, 음성 보존, 지연 시간을 확인할 최소 실험 기준을 정한다.' }
        ]
      };
    }

    function localConflictCard(topic) {
      const fixedTopic = state.topics.find(function(item) {
        return item.id !== topic.id && item.fixed && includesAny(item.text, ['전장', '전술', '군용', '폭음', '총성', '폭발음']);
      });
      if (!fixedTopic || !includesAny(topic.text, ['공사현장', '건설', '장비 소음', '산업'])) return null;
      return {
        id: 'conflict-' + topic.id,
        kind: 'conflict',
        type: '충돌 경고',
        title: '고정 topic과 충돌',
        body: '고정된 "' + fixedTopic.title + '"은 전장용 폭음 차단을 기준으로 삼고 있는데, 현재 topic에는 공사현장/산업 소음 기준이 섞여 있습니다.',
        suggestion: topic.text,
        impact: '영향 topic: ' + fixedTopic.title,
        affectedTopicIds: [fixedTopic.id]
      };
    }

    function externalUpdateCard(topic, incoming) {
      return {
        id: 'external-update-' + incoming.externalId,
        kind: 'conflict',
        type: '최신 변경 반영 필요',
        title: '고정 topic에 최신 변경이 도착했습니다',
        body: 'Subjector에서 변경된 내용이 있지만 이 topic은 고정되어 있어 자동으로 덮어쓰지 않았습니다. 고정 해제 후 반영하거나 별도 topic으로 유지하세요.',
        suggestion: incoming.text,
        impact: '최신화 source: ' + (incoming.sourceType || 'Subjector')
      };
    }

    function normalizeKind(kind) {
      if (['answer', 'research', 'experiment', 'decision', 'filter', 'split', 'conflict'].includes(kind)) return kind;
      return 'research';
    }

    function priorityScore(card) {
      const kind = normalizeKind(card.kind);
      return { decision: 0, filter: 1, research: 2, experiment: 3, answer: 4, split: 5, conflict: 6 }[kind] ?? 7;
    }

    function prioritizedCards(cards, selectedIndex) {
      return (cards || [])
        .map(function(card, index) { return { card: card, index: index }; })
        .sort(function(a, b) {
          if (a.index === selectedIndex) return -1;
          if (b.index === selectedIndex) return 1;
          return priorityScore(a.card) - priorityScore(b.card);
        })
        .map(function(item) { return item.card; });
    }

    function mapApiCard(card, index) {
      const kindMap = { info: 'answer', warn: 'research' };
      return {
        id: 'api-card-' + Date.now() + '-' + index,
        kind: card.kind || kindMap[card.tag] || 'research',
        type: card.type || 'AI 고려',
        title: card.title || 'AI 고려 사항',
        body: card.body || '',
        suggestion: card.suggestion || '',
        details: Array.isArray(card.details) ? card.details : [],
        choices: Array.isArray(card.choices) ? card.choices : [],
        impact: card.impact || card.reason || '',
        fromTeamOpinion: Boolean(card.fromTeamOpinion)
      };
    }

    function mapIncomingCards(incoming) {
      return Array.isArray(incoming.cards)
        ? incoming.cards.map(function(card, index) {
            const mapped = mapApiCard(card, index);
            mapped.fromTeamOpinion = mapped.fromTeamOpinion || incoming.sourceType === 'roadmap-reflection';
            return mapped;
          })
        : [];
    }

    function ensurePriorityCards(topic) {
      const conflict = localConflictCard(topic);
      if (conflict) {
        topic.cards = [conflict].concat((topic.cards || []).filter(function(card) { return card.kind !== 'conflict'; }));
        return;
      }
      if (broadTopicScore(topic.text) >= 3 && !topic.splitApplied && !topic.splitDismissed && !(topic.cards || []).some(function(card) { return card.kind === 'split'; })) {
        topic.cards = [localSplitCard(topic)].concat(topic.cards || []);
      }
      topic.cards = prioritizedCards(topic.cards, 0);
    }

    async function requestCardsForTopic(topic) {
      ensurePriorityCards(topic);
      if (topic.cards && topic.cards[0] && (topic.cards[0].kind === 'conflict' || topic.cards[0].kind === 'split')) {
        return;
      }
      const response = await fetch('/idea-cruise/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryText: topic.text,
          completedEntries: completedTopics().map(function(item) { return item.text; })
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        throw new Error(result.error || 'AI Analysis 연결에 실패했습니다.');
      }
      topic.cards = (result.cards || []).map(mapApiCard);
      ensurePriorityCards(topic);
    }

    async function requestTaskCandidates({ meetingRecord = '' } = {}) {
      const completed = state.topics.length ? state.topics : completedTopics();
      if (completed.length === 0) {
        state.taskGenerationError = 'Task 후보 생성에 사용할 로드맵 topic이 없습니다.';
        return;
      }
      const response = await fetch('/idea-cruise/task-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedPages: completed.map(function(topic, index) {
            return { id: topic.id, number: index + 1, title: topic.title, text: topic.text };
          }),
          meetingRecord: meetingRecord
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        state.taskGenerationError = result.error || 'Task 후보를 만들지 못했습니다.';
        return;
      }
      state.tasks = Array.isArray(result.tasks) ? result.tasks.map(function(task, index) {
        return {
          id: task.id || 'task-' + Date.now() + '-' + index,
          pageId: task.pageId || '',
          pageNumber: task.pageNumber || 0,
          title: task.title || '',
          neededInfo: task.neededInfo || '',
          doneCriteria: task.doneCriteria || '',
          reason: task.reason || task.sourceReason || '',
          assignee: task.assignee || '미배정',
          importance: task.importance || '보통',
          kind: task.kind || 'research',
          error: ''
        };
      }) : [];
      state.existingTaskUpdates = Array.isArray(result.existingTaskUpdates) ? result.existingTaskUpdates.map(function(item, index) {
        return {
          id: item.id || 'task-update-' + Date.now() + '-' + index,
          taskId: item.taskId || '',
          existingTaskTitle: item.existingTaskTitle || '',
          addNeededInfo: item.addNeededInfo || '',
          doneCriteriaChange: item.doneCriteriaChange || '',
          reason: item.reason || '',
          error: ''
        };
      }) : [];
      state.notTasks = Array.isArray(result.notTasks) ? result.notTasks.map(function(item, index) {
        if (typeof item === 'string') return { id: 'not-task-' + Date.now() + '-' + index, content: item, reason: '' };
        return { id: item.id || 'not-task-' + Date.now() + '-' + index, content: item.content || '', reason: item.reason || '' };
      }) : [];
      state.taskGenerationError = '';
      if (state.taskFilter !== 'all' && !state.tasks.some(function(task) { return task.pageId === state.taskFilter; })) {
        state.taskFilter = 'all';
      }
    }

    function topicVisualState(topic, currentCard) {
      if (currentCard && currentCard.kind === 'conflict') return 'conflict';
      if (topic.fixed) return 'existing-card';
      return 'action-card';
    }

    function topicListFrom(value, fallback) {
      if (Array.isArray(value) && value.length) return value;
      return fallback ? [fallback] : [];
    }

    function appendMeetingEvidence(topic, sections) {
      if (Array.isArray(topic.meetingEvidence) && topic.meetingEvidence.length) {
        sections.push({
          title: '회의 근거',
          items: topic.meetingEvidence
        });
      }
      return sections;
    }

    function titleForTopicId(topicId) {
      const target = state.topics.find(function(item) { return item.id === topicId; });
      return target ? target.title : topicId;
    }

    function conflictDetailSections(topic) {
      const conflicts = (topic.cards || []).filter(function(card) { return card.kind === 'conflict'; });
      if (!conflicts.length) return [];
      return conflicts.map(function(card) {
        const connectedTopics = (card.affectedTopicIds || [])
          .filter(function(topicId) { return topicId && topicId !== topic.id; })
          .map(titleForTopicId)
          .filter(Boolean);
        return {
          title: card.title || '충돌 발생 내용',
          className: 'conflict-detail conflict-meeting-question',
          items: [
            card.body ? '감지 내용: ' + card.body : '',
            connectedTopics.length ? '연결된 충돌 카드: ' + connectedTopics.join(', ') : (card.impact || ''),
            '회의에서 확인할 것: 어떤 기준을 유지할지, 어느 topic을 수정할지, 별도 브랜치로 분리할지 결정합니다.'
          ].filter(Boolean)
        };
      });
    }
    function roadmapDetailSections(topic) {
      const conflictSections = conflictDetailSections(topic);
      if (topic.fixed) {
        return appendMeetingEvidence(topic, conflictSections.concat([
          { title: '기준 내용', body: topic.text || '고정된 기준입니다.' },
          {
            title: '회의에서 확정된 근거',
            items: topicListFrom(topic.fixedItems, topic.reflectionSummary || '회의에서 기준으로 고정했습니다.')
          },
          {
            title: '적용 범위',
            body: topic.scope || '이 카드와 연결된 하위 브랜치 및 task 후보의 기준으로 사용합니다.'
          }
        ]));
      }

      return appendMeetingEvidence(topic, conflictSections.concat([
        { title: '현재 정리된 내용', body: topic.text || '아직 정리 중인 카드입니다.' },
        {
          title: '아직 결정 안 된 부분',
          items: topicListFrom(topic.openItems, '회의에서 마무리되면 고정 버튼으로 기준화합니다.')
        }
      ]));
    }

    function renderRoadmapDetailSections(topic) {
      return '<div class="detail-sections">' + roadmapDetailSections(topic).map(function(section) {
        return '<article class="' + escapeHtml(section.className || '') + '"><strong>' + escapeHtml(section.title) + '</strong>' +
          (section.items
            ? '<ul>' + section.items.map(function(item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>'
            : '<p>' + escapeHtml(section.body) + '</p>') +
          '</article>';
      }).join('') + '</div>';
    }

    function matchRoadmapTopicForIncoming(incoming) {
      const text = [incoming.title, incoming.text].filter(Boolean).join(' ');
      const byId = function(id) {
        return state.topics.find(function(topic) { return topic.id === id; }) || null;
      };
      for (const criterion of ROADMAP_REFLECTION_CRITERIA) {
        const target = byId(criterion.targetId);
        if (target && includesAny(text, criterion.keywords)) {
          return target;
        }
      }
      return byId('roadmap-goal') || state.topics[0] || null;
    }

    function shouldSkipIncomingContext(incoming) {
      if (incoming.sourceType === 'github' && includesAny(incoming.text || '', ['조회 실패', '접근 권한', 'Not Found'])) {
        return true;
      }
      if (['meeting-context', 'subjector-task', 'subjector-change', 'change-request'].includes(incoming.sourceType)) {
        return true;
      }
      return false;
    }

    function mergeIncomingRoadmapReflection(incoming) {
      const target = matchRoadmapTopicForIncoming(incoming);
      if (!target) return;
      const summary = compactText(incoming.text || incoming.title || '', 150);
      target.hasTeamOpinion = true;
      target.reflectionSummary = summary || target.reflectionSummary || '';
      target.sourceExternalId = target.sourceExternalId || incoming.externalId;
      if (!target.fixedItems) target.fixedItems = [];
      if (summary && !target.fixedItems.includes(summary)) {
        target.fixedItems = target.fixedItems.concat(summary).slice(-4);
      }
    }

    function mergeUniqueStrings(current, incoming, limit) {
      const merged = [];
      (Array.isArray(current) ? current : []).concat(Array.isArray(incoming) ? incoming : []).forEach(function(item) {
        const value = compactText(item, 320);
        if (value && !merged.includes(value)) {
          merged.push(value);
        }
      });
      return merged.slice(-(limit || 8));
    }

    function topicPositionNearParent(parentId, index) {
      const parent = state.topics.find(function(topic) { return topic.id === parentId; });
      const base = parent?.position || { x: 80, y: 220 };
      return {
        x: base.x + 300,
        y: Math.max(80, base.y + (index * 116))
      };
    }

    function applyRoadmapPatch(roadmapPatch) {
      const updated = [];
      const created = [];
      const warningCards = [];
      const currentIds = new Set(state.topics.map(function(topic) { return topic.id; }));

      (roadmapPatch?.updatedTopics || []).forEach(function(patch) {
        const target = state.topics.find(function(topic) { return topic.id === patch.targetId; });
        if (!target) return;
        if (patch.title) target.title = patch.title;
        if (patch.text) target.text = patch.text;
        target.fixedItems = mergeUniqueStrings(target.fixedItems, patch.fixedItems, 8);
        target.meetingEvidence = mergeUniqueStrings(target.meetingEvidence, patch.meetingEvidence, 8);
        target.scope = patch.scope || target.scope || '';
        target.hasTeamOpinion = target.hasTeamOpinion || Boolean(patch.hasTeamOpinion) || target.meetingEvidence.length > 0;
        target.reflectionSummary = compactText(target.meetingEvidence[0] || patch.text || patch.title || target.reflectionSummary, 140);
        updated.push(target.title);
        ensurePriorityCards(target);
      });

      (roadmapPatch?.createdTopics || []).forEach(function(patch, index) {
        const requestedId = String(patch.clientId || '').trim();
        const id = requestedId && !currentIds.has(requestedId) ? requestedId : createId('topic');
        const parentId = state.topics.some(function(topic) { return topic.id === patch.parentId; }) ? patch.parentId : null;
        const topic = {
          id: id,
          title: patch.title || '새 로드맵 카드',
          text: patch.text || patch.title || '',
          parentId: parentId,
          fixed: false,
          completed: true,
          splitApplied: false,
          splitDismissed: false,
          cards: [],
          sourceType: 'roadmap-patch',
          hasTeamOpinion: true,
          reflectionSummary: compactText((patch.meetingEvidence || [])[0] || patch.text || '', 140),
          fixedItems: mergeUniqueStrings([], patch.fixedItems, 8),
          scope: patch.scope || '',
          meetingEvidence: mergeUniqueStrings([], patch.meetingEvidence, 8),
          position: topicPositionNearParent(parentId, index)
        };
        state.topics.push(topic);
        currentIds.add(id);
        created.push(topic.title);
        ensurePriorityCards(topic);
      });

      (roadmapPatch?.warnings || []).forEach(function(warning, index) {
        (warning.targetIds || []).forEach(function(targetId) {
          const topic = state.topics.find(function(item) { return item.id === targetId; });
          if (!topic) return;
          const cardId = 'roadmap-warning-' + index + '-' + targetId;
          topic.cards = [{
            id: cardId,
            kind: 'conflict',
            type: '충돌 감지',
            title: warning.title || '충돌 감지',
            body: warning.body || '',
            suggestion: '',
            impact: '연결 topic: ' + warning.targetIds.join(', '),
            affectedTopicIds: warning.targetIds || []
          }].concat((topic.cards || []).filter(function(card) { return card.id !== cardId; }));
          warningCards.push(topic.title);
          ensurePriorityCards(topic);
        });
      });

      state.refreshMessage = [
        updated.length ? 'patch 갱신 ' + updated.length + '개' : '',
        created.length ? 'patch 추가 ' + created.length + '개' : '',
        warningCards.length ? '충돌 감지 ' + warningCards.length + '개' : ''
      ].filter(Boolean).join(' · ') || '새로 반영할 roadmapPatch가 없습니다.';

      if (!state.activeTopicId && state.topics.length) {
        state.activeTopicId = state.topics[0].id;
      }
    }

    function addTopic({ title, text, parentId }) {
      const topic = {
        id: createId('topic'),
        title: title || titleFromText(text) || '새 topic',
        text: text || title || '새 topic',
        parentId: parentId || null,
        fixed: false,
        completed: false,
        splitApplied: false,
        splitDismissed: false,
        cards: []
      };
      ensurePriorityCards(topic);
      state.topics.push(topic);
      state.activeTopicId = topic.id;
    }

    function mergeRoadmapContext(topics) {
      const externalIdToTopicId = new Map();
      state.topics.forEach(function(topic) {
        if (topic.sourceExternalId) {
          externalIdToTopicId.set(topic.sourceExternalId, topic.id);
        }
      });

      const created = [];
      const updated = [];
      const waiting = [];
      (topics || []).forEach(function(incoming) {
        if (shouldSkipIncomingContext(incoming)) return;
        if (incoming.sourceType === 'roadmap-reflection') {
          mergeIncomingRoadmapReflection(incoming);
          updated.push('회의 반영 요약');
          return;
        }
        const existingId = externalIdToTopicId.get(incoming.externalId);
        const matchedParent = matchRoadmapTopicForIncoming(incoming);
        const parentId = incoming.parentExternalId
          ? externalIdToTopicId.get(incoming.parentExternalId) || matchedParent?.id || null
          : matchedParent?.id || null;
        const incomingCards = mapIncomingCards(incoming);
        const isTeamOpinion = incoming.sourceType === 'roadmap-reflection';
        const reflectionSummary = compactText(
          incomingCards[0]?.suggestion || incomingCards[0]?.body || incoming.text || '',
          120
        );

        if (existingId) {
          const existing = state.topics.find(function(topic) { return topic.id === existingId; });
          if (!existing) return;
          if (existing.fixed) {
            existing.cards = [externalUpdateCard(existing, incoming)].concat((existing.cards || []).filter(function(card) {
              return card.id !== 'external-update-' + incoming.externalId;
            }));
            waiting.push(existing.title);
            return;
          }
          existing.title = incoming.title || existing.title;
          if (isTeamOpinion && incoming.text && existing.text && !existing.text.includes(incoming.text)) {
            existing.text = existing.text + '\\n\\n[팀원 의견 반영]\\n' + incoming.text;
          } else {
            existing.text = incoming.text || existing.text;
          }
          existing.parentId = parentId;
          existing.sourceType = incoming.sourceType || existing.sourceType;
          existing.hasTeamOpinion = existing.hasTeamOpinion || isTeamOpinion;
          existing.reflectionSummary = reflectionSummary || existing.reflectionSummary || '';
          if (incomingCards.length) {
            existing.cards = incomingCards.concat((existing.cards || []).filter(function(card) {
              return !card.id.startsWith('api-card-');
            }));
          }
          updated.push(existing.title);
          ensurePriorityCards(existing);
          return;
        }

        const topic = {
          id: createId('topic'),
          title: incoming.title || 'Subjector 최신 항목',
          text: incoming.text || '',
          parentId: parentId,
          fixed: false,
          completed: false,
          splitApplied: false,
          splitDismissed: false,
          cards: incomingCards,
          sourceExternalId: incoming.externalId,
          sourceType: incoming.sourceType || 'external',
          hasTeamOpinion: isTeamOpinion,
          reflectionSummary: reflectionSummary
        };
        state.topics.push(topic);
        externalIdToTopicId.set(incoming.externalId, topic.id);
        created.push(topic.title);
        ensurePriorityCards(topic);
      });

      state.refreshMessage = [
        created.length ? '추가 ' + created.length + '개' : '',
        updated.length ? '갱신 ' + updated.length + '개' : '',
        waiting.length ? '고정 topic 대기 ' + waiting.length + '개' : ''
      ].filter(Boolean).join(' · ') || '새로 반영할 항목이 없습니다.';

      if (!state.activeTopicId && state.topics.length) {
        state.activeTopicId = state.topics[0].id;
      }
    }

    async function refreshRoadmapContext() {
      const response = await fetch('/idea-cruise/roadmap-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapSnapshot: state.topics.map(function(topic) {
            return {
              id: topic.id,
              title: topic.title,
              text: topic.text,
              parentId: topic.parentId || '',
              fixed: Boolean(topic.fixed),
              fixedItems: Array.isArray(topic.fixedItems) ? topic.fixedItems : [],
              scope: topic.scope || '',
              meetingEvidence: Array.isArray(topic.meetingEvidence) ? topic.meetingEvidence : [],
              position: topic.position || null
            };
          })
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        throw new Error(result.error || '로드맵 반영에 실패했습니다.');
      }
      applyRoadmapPatch(result.roadmapPatch || {});
      mergeRoadmapContext(result.topics || []);
    }

    function removeActiveTopic() {
      const topic = activeTopic();
      if (!topic) return;
      const removeIds = new Set([topic.id]);
      let changed = true;
      while (changed) {
        changed = false;
        state.topics.forEach(function(item) {
          if (item.parentId && removeIds.has(item.parentId) && !removeIds.has(item.id)) {
            removeIds.add(item.id);
            changed = true;
          }
        });
      }
      state.topics = state.topics.filter(function(item) { return !removeIds.has(item.id); });
      state.tasks = state.tasks.filter(function(task) { return !removeIds.has(task.pageId); });
      state.existingTaskUpdates = [];
      state.notTasks = [];
      state.activeTopicId = state.topics[0]?.id || null;
    }

    function applyCard(topic, card, content) {
      if (topic.fixed && card.kind !== 'conflict') {
        throw new Error('고정된 topic은 고정 해제 후 수정할 수 있습니다.');
      }
      if (card.kind === 'split') {
        topic.splitApplied = true;
        const existing = new Set(state.topics.filter(function(item) { return item.parentId === topic.id; }).map(function(item) { return item.title; }));
        (card.childTopics || []).forEach(function(child) {
          if (!existing.has(child.title)) {
            addTopic({ title: child.title, text: child.text, parentId: topic.id });
          }
        });
        state.activeTopicId = topic.id;
      } else if (content && content.trim()) {
        topic.text = content.trim();
        topic.title = titleFromText(topic.text) || topic.title;
      }
      topic.cards = (topic.cards || []).filter(function(item) { return item.id !== card.id; });
      ensurePriorityCards(topic);
    }

    function dismissSplitSuggestion(topic) {
      topic.splitDismissed = true;
      ensurePriorityCards(topic);
    }

    function computeLayout() {
      const childrenByParent = new Map();
      state.topics.forEach(function(topic) {
        const parent = topic.parentId || 'root';
        if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
        childrenByParent.get(parent).push(topic);
      });
      const positioned = [];
      const roots = childrenByParent.get('root') || [];
      function place(topic, depth, rowHint) {
        const row = positioned.length + rowHint;
        positioned.push({ topic: topic, depth: depth, row: row });
        (childrenByParent.get(topic.id) || []).forEach(function(child, index) { place(child, depth + 1, index); });
      }
      roots.forEach(function(topic, index) { place(topic, 0, index); });
      const positions = new Map();
      positioned.forEach(function(item) {
        const autoPosition = { x: 56 + item.depth * 310, y: 82 + item.row * 172 };
        const manualPosition = item.topic.position && Number.isFinite(item.topic.position.x) && Number.isFinite(item.topic.position.y)
          ? item.topic.position
          : null;
        positions.set(item.topic.id, manualPosition || autoPosition);
      });
      const maxDepth = Math.max(0, ...positioned.map(function(item) { return item.depth; }));
      const maxRow = Math.max(0, ...positioned.map(function(item) { return item.row; }));
      const maxX = Math.max(0, ...Array.from(positions.values()).map(function(position) { return position.x; }));
      const maxY = Math.max(0, ...Array.from(positions.values()).map(function(position) { return position.y; }));
      return {
        positions: positions,
        width: Math.max(980, 56 + (maxDepth + 1) * 310 + 260, maxX + 300),
        height: Math.max(560, 82 + (maxRow + 1) * 172 + 190, maxY + 300)
      };
    }

    function applyRoadmapTransform() {
      state.roadmapScale = Math.min(1.45, Math.max(0.68, Number(state.roadmapScale) || 1));
      roadmapEl.style.transform = 'scale(' + state.roadmapScale + ')';
      roadmapEl.style.marginRight = Math.round(roadmapEl.offsetWidth * (state.roadmapScale - 1)) + 'px';
      roadmapEl.style.marginBottom = Math.round(roadmapEl.offsetHeight * (state.roadmapScale - 1)) + 'px';
    }

    function renderRoadmap() {
      state.topics.forEach(ensurePriorityCards);
      const layout = computeLayout();
      layoutCache = layout.positions;
      roadmapEl.style.width = layout.width + 'px';
      roadmapEl.style.height = layout.height + 'px';
      rootLinesEl.setAttribute('viewBox', '0 0 ' + layout.width + ' ' + layout.height);
      rootLinesEl.setAttribute('width', layout.width);
      rootLinesEl.setAttribute('height', layout.height);
      rootLinesEl.innerHTML = renderRootLines(layout.positions);
      roadmapEl.classList.toggle('detail-focus', Boolean(state.focusedDetailTopicId));
      applyRoadmapTransform();

      if (!state.topics.length) {
        topicNodesEl.innerHTML = '<article class="empty-roadmap"><strong>아직 topic이 없습니다.</strong><p>먼저 "전술 헤드셋" 같은 큰 topic을 추가하세요.</p></article>';
        layerStateEl.textContent = '첫 topic을 추가하세요.';
        roadmapEl.classList.remove('card-layer-on');
        return;
      }

      roadmapEl.classList.toggle('card-layer-on', Boolean(state.activeTopicId));
      layerStateEl.textContent = state.activeTopicId
        ? (activeTopic()?.title || '선택 topic') + ' topic의 2층 상세가 켜져 있습니다.'
        : (state.refreshMessage || 'topic을 클릭하면 2층 상세가 켜집니다.');

      topicNodesEl.innerHTML = state.topics.map(function(topic) {
        const position = layout.positions.get(topic.id);
        const currentCard = topic.cards && topic.cards[0];
        const conflict = currentCard && currentCard.kind === 'conflict';
        const visualState = topicVisualState(topic, currentCard);
        const detailOpen = state.focusedDetailTopicId === topic.id;
        const teamBadge = topic.hasTeamOpinion ? '<span class="team-opinion-badge">팀원 의견</span>' : '';
        const reflection = topic.reflectionSummary ? '<span class="topic-reflection">반영됨: ' + escapeHtml(topic.reflectionSummary) + '</span>' : '';
        const detailText = detailOpen ? '<span class="topic-detail-text">' + escapeHtml(topic.text) + '</span>' : '';
        return '<button class="topic-node ' + visualState + ' ' + (topic.fixed ? 'fixed ' : '') + (conflict ? 'conflict ' : '') + (detailOpen ? 'focused-detail ' : '') + (topic.id === state.activeTopicId ? 'active' : '') + '" style="left:' + position.x + 'px;top:' + position.y + 'px" data-topic="' + topic.id + '" type="button">' +
          teamBadge +
          '<span class="move-handle" data-move-topic="' + topic.id + '" title="카드 위치 이동">move</span>' +
          '<small>' + (topic.parentId ? 'Topic' : 'Project Topic') + '</small>' +
          '<strong>' + escapeHtml(topic.title) + '</strong>' +
          '<span class="topic-summary">' + escapeHtml(compactText(topic.text, 112)) + '</span>' +
          reflection +
          detailText +
          '<span class="topic-controls"><span data-toggle-topic-detail="' + topic.id + '">' + (detailOpen ? '간략히' : '자세히') + '</span></span>' +
          '<span class="topic-meta">' +
            tag(topic.fixed ? '고정' : '초안', topic.fixed ? 'blue' : '') +
            tag('회의 참고') +
            (conflict ? tag('충돌', 'rose') : '') +
          '</span>' +
        '</button>';
      }).join('');
    }

    function renderRootLines(positions) {
      const lines = [];
      state.topics.forEach(function(topic) {
        if (!topic.parentId || !positions.has(topic.parentId) || !positions.has(topic.id)) return;
        const from = positions.get(topic.parentId);
        const to = positions.get(topic.id);
        const startX = from.x + 220;
        const startY = from.y + 72;
        const endX = to.x;
        const endY = to.y + 72;
        const midX = (startX + endX) / 2;
        lines.push('<path class="root-line" d="M ' + startX + ' ' + startY + ' C ' + midX + ' ' + startY + ', ' + midX + ' ' + endY + ', ' + endX + ' ' + endY + '" />');
      });
      const topic = activeTopic();
      const card = topic && topic.cards && topic.cards[0];
      (card?.affectedTopicIds || []).forEach(function(id) {
        if (!positions.has(topic.id) || !positions.has(id)) return;
        const from = positions.get(topic.id);
        const to = positions.get(id);
        const startX = from.x + 110;
        const startY = from.y + 144;
        const endX = to.x + 110;
        const endY = to.y;
        const midY = (startY + endY) / 2;
        lines.push('<path class="impact-line" d="M ' + startX + ' ' + startY + ' C ' + startX + ' ' + midY + ', ' + endX + ' ' + midY + ', ' + endX + ' ' + endY + '" />');
      });
      return lines.join('');
    }

    function renderCardPopover() {
      const topic = activeTopic();
      if (!topic) {
        cardPopoverEl.classList.remove('open');
        cardPopoverEl.innerHTML = '';
        return;
      }
      const position = layoutCache.get(topic.id) || { x: 60, y: 80 };
      const left = Math.max(24, Math.min(position.x + 250, Number.parseInt(roadmapEl.style.width, 10) - 480));
      const top = Math.max(64, position.y - 18);
      cardPopoverEl.style.left = left + 'px';
      cardPopoverEl.style.top = top + 'px';
      cardPopoverEl.classList.add('open');
      cardPopoverEl.innerHTML =
        '<div class="popover-head"><div><h2>2F Detail: ' + escapeHtml(topic.title) + '</h2><p>' + (topic.fixed ? '고정된 기준 카드입니다. 기준 변경은 고정 해제 후 사람이 직접 저장합니다.' : '아직 회의에서 마무리되지 않은 카드입니다. 정리 후 고정하면 기준이 됩니다.') + '</p></div><button data-close-popover type="button">닫기</button></div>' +
        renderRoadmapDetailSections(topic) +
        '<div class="topic-actions-panel">' +
          '<div class="actions"><button data-toggle-fixed type="button">' + (topic.fixed ? '고정 해제' : '고정') + '</button><button class="danger" data-remove-topic type="button">제거</button></div>' +
        '</div>';
    }

    function kindLabel(kind) {
      return {
        answer: '즉시 답변',
        research: '확인 필요',
        experiment: '실험 필요',
        decision: '지금 결정',
        filter: '제외/보류',
        split: 'topic 분리 제안',
        conflict: '충돌 경고'
      }[kind] || 'card';
    }

    function renderTaskFilters() {
      taskFilterEl.innerHTML = '<button class="' + (state.taskFilter === 'all' ? 'active' : '') + '" data-task-filter="all" type="button">전체</button>';
    }

    function visibleTasks() {
      if (state.taskFilter === 'all') return state.tasks;
      return state.tasks.filter(function(task) { return task.pageId === state.taskFilter; });
    }

    function renderTasks() {
      const tasks = visibleTasks();
      taskListEl.innerHTML = tasks.length ? tasks.map(function(task) {
        return '<article class="task-card" data-task-id="' + task.id + '">' +
          '<div class="task-head"><div><h3>' + escapeHtml(task.title) + '</h3><p>Page ' + (task.pageNumber || '-') + ' · 실제 확인 필요</p></div><span class="tag amber">task</span></div>' +
          '<label>Task 제목<input data-field="title" value="' + escapeHtml(task.title) + '"></label>' +
          '<label>필요 정보<textarea data-field="neededInfo">' + escapeHtml(task.neededInfo) + '</textarea></label>' +
          '<label>완료기준<textarea data-field="doneCriteria">' + escapeHtml(task.doneCriteria) + '</textarea></label>' +
          '<div class="task-reason"><strong>생성 맥락</strong><br>' + escapeHtml(task.reason || '이 topic에서 시간을 써야 확인할 일이 생겼습니다.') + '</div>' +
          '<div class="task-grid"><label>담당자<select data-field="assignee"><option>미배정</option><option>조수현</option><option>김조은</option><option>배민성</option></select></label><label>중요도<select data-field="importance"><option>높음</option><option>보통</option><option>낮음</option></select></label></div>' +
          '<div class="actions"><button class="primary" data-apply-task="' + task.id + '" type="button">Subjector in-process에 적용</button><button class="danger" data-remove-task="' + task.id + '" type="button">제거</button></div>' +
          (task.error ? '<div class="error-log">반영 실패: ' + escapeHtml(task.error) + '</div>' : '') +
        '</article>';
      }).join('') : '<div class="quiet-box">회의 자료와 현재 로드맵에서 시간이 필요한 항목만 task 후보로 생성됩니다.</div>';

      taskListEl.querySelectorAll('.task-card').forEach(function(card) {
        const task = state.tasks.find(function(item) { return item.id === card.dataset.taskId; });
        if (!task) return;
        card.querySelector('[data-field="assignee"]').value = task.assignee;
        card.querySelector('[data-field="importance"]').value = task.importance;
      });
    }

    function renderTaskUpdates() {
      taskUpdateListEl.innerHTML = state.existingTaskUpdates.map(function(update) {
        return '<article class="update-card" data-task-update-id="' + update.id + '">' +
          '<div class="task-head"><div><span class="tag amber">기존 task 보강</span><h3>' + escapeHtml(update.existingTaskTitle || update.taskId) + '</h3></div><button class="danger" data-remove-task-update="' + update.id + '" type="button">제거</button></div>' +
          '<p>' + escapeHtml(update.reason || '새 task가 아니라 기존 task를 더 선명하게 만드는 내용입니다.') + '</p>' +
          '<div class="split-update"><div class="update-part"><strong>확인할 것에 추가</strong><p>' + escapeHtml(update.addNeededInfo || '추가할 확인 항목 없음') + '</p></div><div class="update-part"><strong>완료 기준 변경 제안</strong><p>' + escapeHtml(update.doneCriteriaChange || '완료 기준 변경 없음') + '</p></div></div>' +
          '<div class="actions"><button data-apply-task-update="' + update.id + '" data-include-done="false" type="button">확인할 것만 보강</button><button class="primary" data-apply-task-update="' + update.id + '" data-include-done="true" type="button">완료 기준 변경 포함</button></div>' +
          (update.error ? '<div class="error-log">보강 실패: ' + escapeHtml(update.error) + '</div>' : '') +
        '</article>';
      }).join('');
    }

    function renderNotTasks() {
      notTaskListEl.innerHTML = state.notTasks.map(function(item) {
        return '<article class="not-task-card" data-not-task-id="' + item.id + '"><div class="task-head"><div><span class="tag">task 아님</span><h3>' + escapeHtml(item.content) + '</h3></div><button class="danger" data-remove-not-task="' + item.id + '" type="button">제거</button></div>' + (item.reason ? '<p>' + escapeHtml(item.reason) + '</p>' : '') + '</article>';
      }).join('');
      document.getElementById('task-generation-error').innerHTML = state.taskGenerationError ? '<div class="error-log">' + escapeHtml(state.taskGenerationError) + '</div>' : '';
    }

    function renderQuestionDrawer() {
      document.body.classList.toggle('question-drawer-open', Boolean(state.questionDrawerOpen));
      questionDrawerEl.setAttribute('aria-hidden', state.questionDrawerOpen ? 'false' : 'true');
      questionDrawerBackdropEl.hidden = !state.questionDrawerOpen;
    }

    function renderQuestions() {
      questionLogEl.innerHTML = questionMessages.length
        ? questionMessages.map(function(message) {
            return '<article class="question-message ' + escapeHtml(message.role) + '">' +
              '<strong>' + (message.role === 'answer' ? '답변' : '질문') + '</strong>' +
              escapeHtml(message.text) +
            '</article>';
          }).join('')
        : '<div class="quiet-box">아직 공개 질문이 없습니다. 회의 중 궁금한 점을 짧게 남기면 같은 답변 로그가 팀 전체에 보입니다.</div>';
    }

    async function loadQuestions() {
      const response = await fetch('/idea-cruise/questions');
      const result = await response.json().catch(function() { return {}; });
      if (response.ok) {
        questionMessages = Array.isArray(result.messages) ? result.messages : [];
        renderQuestions();
      }
    }

    async function submitQuestion(question) {
      const response = await fetch('/idea-cruise/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          roadmapSnapshot: state.topics.map(function(topic) {
            return { title: topic.title, text: topic.text };
          })
        })
      });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        throw new Error(result.error || '질문 답변을 만들지 못했습니다.');
      }
      questionMessages = Array.isArray(result.messages) ? result.messages : [];
    }

    async function clearQuestions() {
      const response = await fetch('/idea-cruise/questions', { method: 'DELETE' });
      const result = await response.json().catch(function() { return {}; });
      if (!response.ok) {
        throw new Error(result.error || '질문 기록을 지우지 못했습니다.');
      }
      questionMessages = Array.isArray(result.messages) ? result.messages : [];
    }

    function render() {
      renderRoadmap();
      renderCardPopover();
      renderTaskFilters();
      renderTasks();
      renderTaskUpdates();
      renderNotTasks();
      renderQuestionDrawer();
      renderQuestions();
      if (document.activeElement !== taskMeetingRecordEl) {
        taskMeetingRecordEl.value = state.taskMeetingRecord || '';
      }
      saveState();
    }

    function openTopicDialog() {
      parentTopicEl.innerHTML = '<option value="">최상위 topic</option>' + state.topics.map(function(topic) {
        return '<option value="' + topic.id + '" ' + (state.activeTopicId === topic.id ? 'selected' : '') + '>' + escapeHtml(topic.title) + '</option>';
      }).join('');
      document.getElementById('topic-title-input').value = '';
      document.getElementById('topic-text-input').value = '';
      topicDialog.showModal();
    }

    function tag(text, tone) {
      return '<span class="tag ' + (tone || '') + '">' + escapeHtml(text) + '</span>';
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.getElementById('add-topic').addEventListener('click', openTopicDialog);
    document.getElementById('open-question-drawer').addEventListener('click', function() {
      state.questionDrawerOpen = true;
      render();
    });
    document.getElementById('close-question-drawer').addEventListener('click', function() {
      state.questionDrawerOpen = false;
      render();
    });
    document.getElementById('question-drawer-backdrop').addEventListener('click', function() {
      state.questionDrawerOpen = false;
      render();
    });
    document.getElementById('refresh-roadmap').addEventListener('click', async function(event) {
      event.target.disabled = true;
      try {
        await refreshRoadmapContext();
        saveState();
      } catch (error) {
        state.refreshMessage = error.message;
      }
      event.target.disabled = false;
      render();
    });

    document.getElementById('load-roadmap').addEventListener('click', function() {
      loadRoadmapSnapshot();
      render();
    });
    document.getElementById('save-roadmap').addEventListener('click', function() {
      saveRoadmapSnapshot();
      render();
    });
    document.getElementById('close-topic-dialog').addEventListener('click', function() { topicDialog.close(); });
    document.getElementById('topic-form').addEventListener('submit', function(event) {
      event.preventDefault();
      const title = document.getElementById('topic-title-input').value.trim();
      const text = document.getElementById('topic-text-input').value.trim();
      if (!title && !text) return;
      addTopic({ title: title, text: text || title, parentId: parentTopicEl.value || null });
      topicDialog.close();
      render();
    });

    document.getElementById('zoom-out').addEventListener('click', function() {
      state.roadmapScale = Math.max(0.68, state.roadmapScale - 0.1);
      render();
    });
    document.getElementById('zoom-reset').addEventListener('click', function() {
      state.roadmapScale = 1;
      render();
    });
    document.getElementById('zoom-in').addEventListener('click', function() {
      state.roadmapScale = Math.min(1.45, state.roadmapScale + 0.1);
      render();
    });

    document.getElementById('question-form').addEventListener('submit', async function(event) {
      event.preventDefault();
      const question = questionInputEl.value.trim();
      if (!question) return;
      questionStatusEl.textContent = '답변 생성 중';
      document.getElementById('submit-question').disabled = true;
      try {
        await submitQuestion(question);
        questionInputEl.value = '';
        questionStatusEl.textContent = '';
      } catch (error) {
        questionStatusEl.textContent = error.message;
      }
      document.getElementById('submit-question').disabled = false;
      renderQuestions();
    });

    document.getElementById('clear-questions').addEventListener('click', async function(event) {
      event.target.disabled = true;
      try {
        await clearQuestions();
        questionStatusEl.textContent = '';
      } catch (error) {
        questionStatusEl.textContent = error.message;
      }
      event.target.disabled = false;
      renderQuestions();
    });

    taskMeetingRecordEl.addEventListener('input', function() {
      state.taskMeetingRecord = taskMeetingRecordEl.value;
      saveState();
    });

    roadmapShellEl.addEventListener('pointerdown', function(event) {
      if (event.target.closest('.topic-node') || event.target.closest('.card-popover') || event.target.closest('.layer-label') || event.target.closest('.zoom-tools')) return;
      dragState = {
        type: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: roadmapShellEl.scrollLeft,
        scrollTop: roadmapShellEl.scrollTop
      };
      roadmapShellEl.classList.add('dragging');
    });

    roadmapEl.addEventListener('pointerdown', function(event) {
      const handle = event.target.closest('[data-move-topic]');
      if (!handle) return;
      const topic = state.topics.find(function(item) { return item.id === handle.dataset.moveTopic; });
      const position = layoutCache.get(handle.dataset.moveTopic);
      if (!topic || !position) return;
      dragState = {
        type: 'topic',
        topicId: topic.id,
        startX: event.clientX,
        startY: event.clientY,
        initialX: position.x,
        initialY: position.y
      };
      event.preventDefault();
      event.stopPropagation();
    });

    document.addEventListener('pointermove', function(event) {
      if (!dragState) return;
      if (dragState.type === 'pan') {
        roadmapShellEl.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.startX);
        roadmapShellEl.scrollTop = dragState.scrollTop - (event.clientY - dragState.startY);
        return;
      }
      const topic = state.topics.find(function(item) { return item.id === dragState.topicId; });
      if (!topic) return;
      topic.position = {
        x: Math.max(16, Math.round(dragState.initialX + (event.clientX - dragState.startX) / state.roadmapScale)),
        y: Math.max(56, Math.round(dragState.initialY + (event.clientY - dragState.startY) / state.roadmapScale))
      };
      renderRoadmap();
      renderCardPopover();
      saveState();
    });

    document.addEventListener('pointerup', function() {
      if (!dragState) return;
      dragState = null;
      roadmapShellEl.classList.remove('dragging');
    });

    roadmapEl.addEventListener('click', async function(event) {
      const closeButton = event.target.closest('[data-close-popover]');
      if (closeButton) {
        state.activeTopicId = null;
        state.focusedDetailTopicId = null;
        render();
        return;
      }

      if (event.target.closest('[data-move-topic]')) return;

      const detailButton = event.target.closest('[data-toggle-topic-detail]');
      if (detailButton) {
        const topicId = detailButton.dataset.toggleTopicDetail;
        state.focusedDetailTopicId = state.focusedDetailTopicId === topicId ? null : topicId;
        state.activeTopicId = topicId;
        render();
        return;
      }

      const topicButton = event.target.closest('[data-topic]');
      if (topicButton) {
        const topicId = topicButton.dataset.topic;
        state.activeTopicId = state.activeTopicId === topicId ? null : topicId;
        if (state.activeTopicId !== topicId) state.focusedDetailTopicId = null;
        render();
        return;
      }

      const topic = activeTopic();
      if (!topic) return;

      const fixedButton = event.target.closest('[data-toggle-fixed]');
      if (fixedButton) {
        topic.fixed = !topic.fixed;
        render();
        return;
      }

      const removeButton = event.target.closest('[data-remove-topic]');
      if (removeButton) {
        removeActiveTopic();
        render();
        return;
      }

    });

    taskFilterEl.addEventListener('click', function(event) {
      const button = event.target.closest('[data-task-filter]');
      if (!button) return;
      state.taskFilter = button.dataset.taskFilter;
      render();
    });

    document.getElementById('refresh-tasks').addEventListener('click', async function(event) {
      event.target.disabled = true;
      try {
        state.taskMeetingRecord = taskMeetingRecordEl.value;
        await requestTaskCandidates({ meetingRecord: taskMeetingRecordEl.value });
      } catch (error) {
        state.taskGenerationError = error.message;
      }
      event.target.disabled = false;
      render();
    });

    taskListEl.addEventListener('input', function(event) {
      const card = event.target.closest('[data-task-id]');
      if (!card) return;
      const task = state.tasks.find(function(item) { return item.id === card.dataset.taskId; });
      if (!task) return;
      task[event.target.dataset.field] = event.target.value;
      task.error = '';
      saveState();
    });

    taskListEl.addEventListener('click', async function(event) {
      const removeButton = event.target.closest('[data-remove-task]');
      if (removeButton) {
        state.tasks = state.tasks.filter(function(item) { return item.id !== removeButton.dataset.removeTask; });
        render();
        return;
      }
      const button = event.target.closest('[data-apply-task]');
      if (!button) return;
      const task = state.tasks.find(function(item) { return item.id === button.dataset.applyTask; });
      if (!task) return;
      if (task.assignee === '미배정') {
        task.error = '담당자를 먼저 선택해 주세요.';
        render();
        return;
      }
      button.disabled = true;
      try {
        const response = await fetch('/idea-cruise/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            neededInfo: task.neededInfo,
            doneCriteria: task.doneCriteria,
            reason: task.reason,
            assignee: task.assignee,
            importance: task.importance,
            meetingRecord: ''
          })
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) throw new Error(result.error || 'Subjector 반영에 실패했습니다.');
        state.tasks = state.tasks.filter(function(item) { return item.id !== task.id; });
      } catch (error) {
        task.error = error.message;
      }
      render();
    });

    taskUpdateListEl.addEventListener('click', async function(event) {
      const removeButton = event.target.closest('[data-remove-task-update]');
      if (removeButton) {
        state.existingTaskUpdates = state.existingTaskUpdates.filter(function(item) { return item.id !== removeButton.dataset.removeTaskUpdate; });
        render();
        return;
      }
      const applyButton = event.target.closest('[data-apply-task-update]');
      if (!applyButton) return;
      const update = state.existingTaskUpdates.find(function(item) { return item.id === applyButton.dataset.applyTaskUpdate; });
      if (!update) return;
      applyButton.disabled = true;
      try {
        const response = await fetch('/idea-cruise/task-updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: update.taskId,
            addNeededInfo: update.addNeededInfo,
            doneCriteriaChange: update.doneCriteriaChange,
            includeDoneCriteriaChange: applyButton.dataset.includeDone === 'true',
            meetingRecord: ''
          })
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) throw new Error(result.error || '기존 task 보강에 실패했습니다.');
        state.existingTaskUpdates = state.existingTaskUpdates.filter(function(item) { return item.id !== update.id; });
      } catch (error) {
        update.error = error.message;
      }
      render();
    });

    notTaskListEl.addEventListener('click', function(event) {
      const button = event.target.closest('[data-remove-not-task]');
      if (!button) return;
      state.notTasks = state.notTasks.filter(function(item) { return item.id !== button.dataset.removeNotTask; });
      render();
    });

    render();
    loadQuestions().catch(function(error) {
      questionStatusEl.textContent = error.message;
    });
  </script>
</body>
</html>`;
}
