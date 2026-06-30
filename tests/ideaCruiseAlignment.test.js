import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAlignmentMarkdown,
  createAlignmentPacket,
  detectAlignmentWarnings
} from '../src/domain/ideaCruiseAlignment.js';

test('createAlignmentPacket normalizes criteria-aligned task fields', () => {
  const packet = createAlignmentPacket({
    title: '전술 헤드셋 드론 데이터셋 후보 판단',
    purpose: '모델 테스트를 시작할 수 있도록 현실적인 후보를 좁힌다.',
    outputLevel: 'quick_validation',
    successCriteria: '상위 후보 3개와 탈락 이유를 남긴다.',
    mustDo: '라이선스\nannotation 형식\n드론 크기',
    canSkip: '전체 학습\n예쁜 보고서',
    assigneeDiscretion: '검색 출처와 후보 순서',
    handoffNotes: '다음 사람이 바로 작은 모델 테스트 후보를 고를 수 있어야 한다.',
    ambiguousCriteria: '실시간 탐지용인지 사후 분석용인지 애매함',
    leadQuestions: '탐지와 분류 중 무엇이 우선인가?'
  });

  assert.equal(packet.outputLevelLabel, '빠른 검증용');
  assert.deepEqual(packet.mustDo, ['라이선스', 'annotation 형식', '드론 크기']);
  assert.deepEqual(packet.canSkip, ['전체 학습', '예쁜 보고서']);
  assert.equal(packet.handoffNotes, '다음 사람이 바로 작은 모델 테스트 후보를 고를 수 있어야 한다.');
});

test('detectAlignmentWarnings explains missing alignment context without scores', () => {
  const packet = createAlignmentPacket({
    title: '데이터셋 판단',
    purpose: '후보를 찾는다.',
    outputLevel: '',
    successCriteria: '',
    handoffNotes: ''
  });

  const warnings = detectAlignmentWarnings(packet);

  assert.ok(warnings.some((warning) => /산출물 수준/.test(warning)));
  assert.ok(warnings.some((warning) => /성공 기준/.test(warning)));
  assert.ok(warnings.some((warning) => /다음 사람/.test(warning)));
  assert.equal(warnings.some((warning) => /상\/중\/하|점수/.test(warning)), false);
});

test('buildAlignmentMarkdown exports a Subjector-ready criteria packet', () => {
  const packet = createAlignmentPacket({
    title: '전술 헤드셋 드론 데이터셋 후보 판단',
    purpose: '현실적인 후보를 좁힌다.',
    outputLevel: 'quick_validation',
    successCriteria: '상위 후보 3개를 남긴다.',
    mustDo: ['라이선스 확인', 'annotation 형식 확인'],
    canSkip: ['전체 학습'],
    assigneeDiscretion: ['후보 순서'],
    handoffNotes: '다음 사람이 작은 모델 테스트를 시작할 수 있어야 한다.',
    ambiguousCriteria: ['실시간 탐지 여부'],
    leadQuestions: ['탐지와 분류 중 무엇이 우선인가?']
  });

  const markdown = buildAlignmentMarkdown(packet);

  assert.match(markdown, /# IDEA CRUISE 기준 정렬 패킷/);
  assert.match(markdown, /전술 헤드셋 드론 데이터셋 후보 판단/);
  assert.match(markdown, /빠른 검증용/);
  assert.match(markdown, /라이선스 확인/);
  assert.match(markdown, /다음 사람이 작은 모델 테스트를 시작/);
  assert.doesNotMatch(markdown, /점수|상\/중\/하/);
});
