import { fetchGeminiCompletion, streamGeminiCompletion } from './geminiApi';

/**
 * Unified AI completion service — Gemini only.
 */
export async function fetchAICompletion(systemPrompt, userText, options = {}) {
  return fetchGeminiCompletion(systemPrompt, userText, options);
}

/**
 * Streaming AI completion — yields chunks via onChunk callback.
 * Returns full text when complete.
 */
export async function streamAICompletion(systemPrompt, userText, options = {}) {
  return streamGeminiCompletion(systemPrompt, userText, options);
}
