import { createGeminiFinalsNarrator } from './geminiFinalsNarrator.js';
import { createOpenAiFinalsNarrator } from './openaiFinalsNarrator.js';

export function createFinalsNarrator({ config, fetchImpl = globalThis.fetch } = {}) {
  const provider = config?.ai?.finalsSummaryProvider ?? config?.ai?.meetingTaskProvider ?? 'openai';

  if (provider === 'gemini') {
    return createGeminiFinalsNarrator({
      apiKey: config.gemini.apiKey,
      model: config.gemini.finalsSummaryModel,
      fetchImpl
    });
  }

  if (provider === 'openai') {
    return createOpenAiFinalsNarrator({
      apiKey: config.openai.apiKey,
      model: config.openai.finalsSummaryModel,
      fetchImpl
    });
  }

  throw new Error(`Unknown finals summary provider: ${provider}`);
}
