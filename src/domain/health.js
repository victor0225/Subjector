function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusRow(label, status) {
  const state = status?.ok ? '정상' : '확인 필요';
  const className = status?.ok ? 'ok' : 'warn';
  return `<tr><th>${escapeHtml(label)}</th><td class="${className}">${state}</td><td>${escapeHtml(status?.message ?? '')}</td></tr>`;
}

export function createDefaultHealthStatus() {
  return {
    slack: { ok: false, message: 'not checked' },
    supabase: { ok: false, message: 'not checked' },
    openai: { ok: false, message: 'not checked' },
    deployment: { ok: false, message: 'not checked' },
    channels: {
      meeting: { ok: false, message: '#회의-결과록 not checked' },
      inProcess: { ok: false, message: '#in-process not checked' },
      finals: { ok: false, message: '#finals not checked' }
    },
    web: {
      ideaCruise: { ok: false, message: '/idea-cruise not checked' }
    },
    recentEvents: []
  };
}

export function isHealthPinValid(pin, config) {
  return String(pin ?? '') === String(config.healthPin ?? '');
}

export function renderHealthPage({ pin, config, status = createDefaultHealthStatus() }) {
  const valid = isHealthPinValid(pin, config);

  if (!valid) {
    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subjector Health</title>
</head>
<body>
  <main>
    <h1>Subjector Health</h1>
    <form method="GET" action="/health">
      <label>PIN <input name="pin" type="password" autocomplete="current-password"></label>
      <button type="submit">보기</button>
    </form>
  </main>
</body>
</html>`;
  }

  const recentEvents = status.recentEvents?.length
    ? status.recentEvents.map((event) => `<li>${escapeHtml(event)}</li>`).join('')
    : '<li>최근 이벤트 없음</li>';

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subjector Health</title>
  <style>
    body { font-family: Arial, "Malgun Gothic", sans-serif; margin: 24px; color: #17202a; }
    table { border-collapse: collapse; min-width: 640px; max-width: 100%; }
    th, td { border: 1px solid #d8e0ea; padding: 10px; text-align: left; }
    th { background: #f8fafc; }
    .ok { color: #027a48; font-weight: 700; }
    .warn { color: #b42318; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>Subjector Health</h1>
    <p>URL: ${escapeHtml(config.baseUrl ?? '')}/health</p>
    <table>
      <tbody>
        ${statusRow('Slack', status.slack)}
        ${statusRow('Supabase', status.supabase)}
        ${statusRow('OpenAI', status.openai)}
        ${statusRow('Deployment', status.deployment)}
        ${statusRow('IDEA CRUISE', status.web?.ideaCruise)}
        ${statusRow('#회의-결과록', status.channels?.meeting)}
        ${statusRow('#in-process', status.channels?.inProcess)}
        ${statusRow('#finals', status.channels?.finals)}
      </tbody>
    </table>
    <h2>Recent Events</h2>
    <ul>${recentEvents}</ul>
  </main>
</body>
</html>`;
}
