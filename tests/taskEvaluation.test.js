import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEvaluationFeedbackMessage,
  normalizeTaskEvaluation
} from '../src/domain/taskEvaluation.js';

test('normalizeTaskEvaluation normalizes a sufficient completion verdict', () => {
  const evaluation = normalizeTaskEvaluation({
    verdict: 'sufficient',
    score: 88,
    summary: '과제 목표를 충족했습니다.',
    reasons: ['근거가 명확합니다.'],
    missingItems: [],
    feedbackToUser: '완료 처리해도 됩니다.'
  });

  assert.equal(evaluation.verdict, 'sufficient');
  assert.equal(evaluation.score, 88);
  assert.equal(evaluation.blocksCompletion, false);
});

test('normalizeTaskEvaluation marks weak completion as blocking', () => {
  const evaluation = normalizeTaskEvaluation({
    verdict: 'needs_revision',
    score: 35,
    summary: '근거가 부족합니다.',
    reasons: ['수행 결과가 모호합니다.'],
    missingItems: ['산출물 위치', '판단 근거'],
    feedbackToUser: '근거와 산출물을 보완해 주세요.'
  });

  assert.equal(evaluation.blocksCompletion, true);
});

test('buildEvaluationFeedbackMessage explains the result to the assignee', () => {
  const message = buildEvaluationFeedbackMessage({
    actionLabel: '완료',
    taskTitle: '센서 후보 정리',
    finalStatus: '보완 필요',
    evaluation: normalizeTaskEvaluation({
      verdict: 'needs_revision',
      score: 40,
      summary: '완료로 보기에는 부족합니다.',
      reasons: ['결론은 있으나 근거가 부족합니다.'],
      missingItems: ['비교 기준'],
      feedbackToUser: '비교 기준을 추가해 주세요.'
    })
  });

  assert.match(message, /센서 후보 정리/);
  assert.match(message, /보완 필요/);
  assert.match(message, /40/);
  assert.match(message, /비교 기준/);
});
