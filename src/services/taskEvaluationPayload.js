export const OPENAI_EVALUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: {
      type: 'string',
      enum: ['sufficient', 'needs_revision', 'informational']
    },
    score: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },
    summary: { type: 'string' },
    reasons: {
      type: 'array',
      items: { type: 'string' }
    },
    missingItems: {
      type: 'array',
      items: { type: 'string' }
    },
    feedbackToUser: { type: 'string' }
  },
  required: ['verdict', 'score', 'summary', 'reasons', 'missingItems', 'feedbackToUser']
};

export const GEMINI_EVALUATION_SCHEMA = {
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      enum: ['sufficient', 'needs_revision', 'informational']
    },
    score: {
      type: 'integer'
    },
    summary: { type: 'string' },
    reasons: {
      type: 'array',
      items: { type: 'string' }
    },
    missingItems: {
      type: 'array',
      items: { type: 'string' }
    },
    feedbackToUser: { type: 'string' }
  },
  required: ['verdict', 'score', 'summary', 'reasons', 'missingItems', 'feedbackToUser']
};

export function buildEvaluationSystemPrompt() {
  return [
    'You are Subjector, a strict but practical task submission evaluator for a 3-person graduation-project team.',
    'Evaluate whether the submitted Slack/Codex result meaningfully satisfies the assigned task.',
    'For actionId task_complete or task_file_submission, return verdict sufficient only when the submission satisfies the task done criteria.',
    'For actionId task_file_submission, return verdict informational when the assignee made real progress but the done criteria are not fully satisfied yet.',
    'For actionId task_complete or task_file_submission, return verdict needs_revision when the submission is vague, off-topic, lacks evidence, lacks output details, or does not address the task goal.',
    'For actionId task_stop_today, return informational unless the content is empty or unusable; provide practical feedback without blocking progress.',
    'Write Korean feedback. Be concise, concrete, and action-oriented.',
    'Never invent completed work. Judge only from the task context and submitted text.'
  ].join('\n');
}

export function buildEvaluationInput({ actionId, actionLabel, task, rawText }) {
  return {
    actionId,
    actionLabel,
    task: {
      id: task?.id,
      title: task?.title,
      status: task?.status,
      importance: task?.importance,
      coordination: task?.coordination,
      context: task?.context ?? {}
    },
    submittedText: rawText
  };
}
