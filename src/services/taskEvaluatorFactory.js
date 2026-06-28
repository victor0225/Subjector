import { createGeminiTaskEvaluator } from './geminiTaskEvaluator.js';
import { createOpenAiTaskEvaluator } from './openaiTaskEvaluator.js';

export function createTaskEvaluator({ config, fetchImpl = globalThis.fetch } = {}) {
  const provider = config?.ai?.evaluationProvider ?? 'openai';

  if (provider === 'gemini') {
    return createGeminiTaskEvaluator({
      apiKey: config.gemini.apiKey,
      model: config.gemini.evaluationModel,
      fetchImpl
    });
  }

  if (provider === 'openai') {
    return createOpenAiTaskEvaluator({
      apiKey: config.openai.apiKey,
      model: config.openai.evaluationModel,
      fetchImpl
    });
  }

  throw new Error(`Unknown task evaluation provider: ${provider}`);
}
