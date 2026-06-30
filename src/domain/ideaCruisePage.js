export function renderIdeaCruisePage() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IDEA CRUISE</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --surface: #ffffff;
      --surface-2: #eef3f7;
      --text: #17202a;
      --muted: #5f6b7a;
      --line: #d9e0e7;
      --accent: #176b87;
      --accent-2: #1b7f5f;
      --warn: #9b4d16;
      --shadow: 0 8px 22px rgba(23, 32, 42, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }

    h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
    }

    .subtitle {
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }

    .status {
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
    }

    main {
      display: grid;
      grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.1fr) minmax(320px, 1fr);
      gap: 16px;
      padding: 16px;
    }

    section {
      min-width: 0;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .section-head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-2);
    }

    .section-head h2 {
      margin: 0;
      font-size: 15px;
    }

    .section-head p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .section-body {
      display: grid;
      gap: 12px;
      padding: 14px 16px 16px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
      color: var(--text);
      background: #fff;
      font: inherit;
      font-size: 14px;
      line-height: 1.45;
    }

    textarea {
      min-height: 74px;
      resize: vertical;
    }

    .notes {
      min-height: 232px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    button {
      border: 1px solid var(--accent);
      border-radius: 6px;
      padding: 9px 12px;
      color: #fff;
      background: var(--accent);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    button.secondary {
      color: var(--accent);
      background: #fff;
    }

    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--accent-2);
      outline-offset: 2px;
    }

    .warning-list,
    .packet {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px;
      background: #fff;
      color: var(--text);
      white-space: pre-wrap;
    }

    .warning-list {
      color: var(--warn);
      line-height: 1.5;
    }

    .packet {
      min-height: 450px;
      overflow: auto;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    @media (max-width: 1080px) {
      main {
        grid-template-columns: 1fr;
      }

      .status {
        white-space: normal;
      }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IDEA CRUISE</h1>
      <div class="subtitle">회의 기준 정렬 workspace</div>
    </div>
    <div class="status" id="save-status">로컬 초안 저장 대기</div>
  </header>

  <main>
    <section>
      <div class="section-head">
        <h2>회의 입력</h2>
        <p>회의 중 나온 task 씨앗, 결정, 애매한 기준을 적습니다.</p>
      </div>
      <div class="section-body">
        <label>
          회의 메모
          <textarea class="notes" id="meetingNotes" data-field="meetingNotes" placeholder="예: 전술 헤드셋에 쓸 드론 데이터셋 후보를 먼저 좁혀야 함"></textarea>
        </label>
        <label>
          Task 제목
          <input id="title" data-field="title" placeholder="예: 전술 헤드셋 드론 데이터셋 후보 판단">
        </label>
        <label>
          목적
          <textarea id="purpose" data-field="purpose" placeholder="왜 이 task가 필요한지 적습니다."></textarea>
        </label>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>기준 정렬</h2>
        <p>작업 전에 충분한 수준과 넘겨야 할 정보를 맞춥니다.</p>
      </div>
      <div class="section-body">
        <label>
          산출물 수준
          <select id="outputLevel" data-field="outputLevel">
            <option value="">정하지 않음</option>
            <option value="quick_validation">빠른 검증용</option>
            <option value="internal_draft">내부 사용 가능한 초안</option>
            <option value="final_deliverable">완성도 있는 최종 산출물</option>
          </select>
        </label>
        <label>
          성공 기준
          <textarea id="successCriteria" data-field="successCriteria" placeholder="무엇이 되면 이번 task가 충분한지 적습니다."></textarea>
        </label>
        <label>
          반드시 해야 하는 것
          <textarea id="mustDo" data-field="mustDo" placeholder="한 줄에 하나씩 적습니다."></textarea>
        </label>
        <label>
          생략해도 되는 것
          <textarea id="canSkip" data-field="canSkip" placeholder="이번 단계에서 안 해도 되는 일을 적습니다."></textarea>
        </label>
        <label>
          담당자 재량 영역
          <textarea id="assigneeDiscretion" data-field="assigneeDiscretion" placeholder="담당자가 물어보지 않고 결정해도 되는 범위입니다."></textarea>
        </label>
        <label>
          다음 사람에게 넘길 정보
          <textarea id="handoffNotes" data-field="handoffNotes" placeholder="다음 사람이 무엇을 보면 바로 움직일 수 있는지 적습니다."></textarea>
        </label>
        <label>
          아직 애매한 기준
          <textarea id="ambiguousCriteria" data-field="ambiguousCriteria" placeholder="작업 전에 더 맞추면 좋은 기준입니다."></textarea>
        </label>
        <label>
          팀장에게 확인할 질문
          <textarea id="leadQuestions" data-field="leadQuestions" placeholder="결정권자에게 물어볼 질문입니다."></textarea>
        </label>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>정렬 결과</h2>
        <p>Subjector task 후보로 넘길 기준 정렬 패킷입니다.</p>
      </div>
      <div class="section-body">
        <div class="actions">
          <button id="copy-packet">기준 정렬 패킷 복사</button>
          <button class="secondary" id="clear-draft">초안 비우기</button>
        </div>
        <pre class="warning-list" id="warnings">정렬할 내용을 입력하면 기준 차이를 줄이기 위한 질문이 표시됩니다.</pre>
        <pre class="packet" id="packet-output"></pre>
      </div>
    </section>
  </main>

  <script>
    const storageKey = 'ideaCruiseAlignmentDraft';
    const fields = [
      'meetingNotes',
      'title',
      'purpose',
      'outputLevel',
      'successCriteria',
      'mustDo',
      'canSkip',
      'assigneeDiscretion',
      'handoffNotes',
      'ambiguousCriteria',
      'leadQuestions'
    ];

    const outputLabels = {
      quick_validation: '빠른 검증용',
      internal_draft: '내부 사용 가능한 초안',
      final_deliverable: '완성도 있는 최종 산출물'
    };

    function list(value) {
      return String(value || '')
        .split('\\n')
        .map((line) => line.replace(/^[-*]\\s*/, '').trim())
        .filter(Boolean);
    }

    function section(title, value) {
      const lines = Array.isArray(value) ? value : list(value);
      if (lines.length === 0) return '## ' + title + '\\n- 아직 정리되지 않음';
      return '## ' + title + '\\n' + lines.map((line) => '- ' + line).join('\\n');
    }

    function readDraft() {
      return Object.fromEntries(fields.map((field) => {
        const element = document.querySelector('[data-field="' + field + '"]');
        return [field, element ? element.value.trim() : ''];
      }));
    }

    function buildPacket(draft) {
      const outputLabel = outputLabels[draft.outputLevel] || '정하지 않음';
      return [
        '# IDEA CRUISE 기준 정렬 패킷',
        '',
        '## Task',
        draft.title || '제목 없음',
        '',
        '## 목적',
        draft.purpose || '아직 정리되지 않음',
        '',
        '## 산출물 수준',
        outputLabel,
        '',
        '## 성공 기준',
        draft.successCriteria || '아직 정리되지 않음',
        '',
        section('반드시 해야 하는 것', draft.mustDo),
        '',
        section('생략해도 되는 것', draft.canSkip),
        '',
        section('담당자 재량 영역', draft.assigneeDiscretion),
        '',
        '## 다음 사람에게 넘길 정보',
        draft.handoffNotes || '아직 정리되지 않음',
        '',
        section('아직 애매한 기준', draft.ambiguousCriteria),
        '',
        section('팀장에게 확인할 질문', draft.leadQuestions)
      ].join('\\n');
    }

    function buildWarnings(draft) {
      const warnings = [];
      if (!draft.outputLevel) {
        warnings.push('산출물 수준이 아직 정해지지 않았습니다. 빠른 검증용인지, 내부 사용 가능한 초안인지, 최종 산출물인지 먼저 맞추면 작업 범위가 덜 흔들립니다.');
      }
      if (!draft.successCriteria) {
        warnings.push('성공 기준이 비어 있습니다. 무엇이 되면 충분한지 한 문장으로 정하면 담당자가 과하게 만들거나 너무 적게 조사하는 일을 줄일 수 있습니다.');
      }
      if (!draft.handoffNotes) {
        warnings.push('다음 사람이 이어받을 정보가 아직 없습니다. 다음 사람이 무엇을 보고 바로 움직이면 되는지 적어두면 재검색과 재설명을 줄일 수 있습니다.');
      }
      if (list(draft.mustDo).length === 0 && list(draft.canSkip).length === 0) {
        warnings.push('반드시 해야 할 것과 생략해도 되는 것이 나뉘지 않았습니다. 이 둘을 나누면 성실한 작업이 불필요한 완성도 경쟁으로 흐르는 것을 막을 수 있습니다.');
      }
      return warnings.length ? warnings.map((warning) => '- ' + warning).join('\\n') : '다음 사람이 이어받기 위한 기준이 잘 정리되고 있습니다.';
    }

    function saveDraft() {
      const draft = readDraft();
      localStorage.setItem(storageKey, JSON.stringify(draft));
      document.getElementById('save-status').textContent = '이 브라우저에 초안 저장됨';
      render();
    }

    function loadDraft() {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      try {
        const draft = JSON.parse(saved);
        for (const field of fields) {
          const element = document.querySelector('[data-field="' + field + '"]');
          if (element && typeof draft[field] === 'string') element.value = draft[field];
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    function render() {
      const draft = readDraft();
      document.getElementById('warnings').textContent = buildWarnings(draft);
      document.getElementById('packet-output').textContent = buildPacket(draft);
    }

    for (const field of fields) {
      const element = document.querySelector('[data-field="' + field + '"]');
      if (element) element.addEventListener('input', saveDraft);
    }

    document.getElementById('copy-packet').addEventListener('click', async () => {
      const text = document.getElementById('packet-output').textContent;
      await navigator.clipboard.writeText(text);
      document.getElementById('save-status').textContent = '기준 정렬 패킷 복사됨';
    });

    document.getElementById('clear-draft').addEventListener('click', () => {
      localStorage.removeItem(storageKey);
      for (const field of fields) {
        const element = document.querySelector('[data-field="' + field + '"]');
        if (element) element.value = '';
      }
      document.getElementById('save-status').textContent = '초안 비움';
      render();
    });

    loadDraft();
    render();
  </script>
</body>
</html>`;
}
