import { createGeminiMeetingTaskExtractor } from './geminiMeetingTaskExtractor.js';
import { createOpenAiMeetingTaskExtractor } from './openaiMeetingTaskExtractor.js';

export function createMeetingTaskExtractor({ config, fetchImpl = globalThis.fetch } = {}) {
  const provider = config?.ai?.meetingTaskProvider ?? 'openai';

  if (provider === 'gemini') {
    return createGeminiMeetingTaskExtractor({
      apiKey: config.gemini.apiKey,
      model: config.gemini.taskExtractionModel,
      fetchImpl
    });
  }

  if (provider === 'openai') {
    return createOpenAiMeetingTaskExtractor({
      apiKey: config.openai.apiKey,
      model: config.openai.taskExtractionModel,
      fetchImpl
    });
  }

  throw new Error(`Unknown meeting task provider: ${provider}`);
}
