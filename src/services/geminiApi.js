import { getGeminiApiUrl, getGeminiStreamUrl, MAX_OUTPUT_TOKENS } from '../constants/config';
import { parseGeminiError } from './apiErrorParser';
import useKeyStore from '../stores/keyStore';

// ─── M2.2: Dynamic generation config ───

// Estimate output tokens budget based on input length.
// Vietnamese output ~1.3x English; buffer 1.2x for safety.
function calculateMaxOutputTokens(userText) {
  if (typeof userText !== 'string' || !userText) return 2048;
  const inputChars = userText.length;
  const estimated = Math.ceil((inputChars / 4) * 1.3 * 1.2);
  return Math.min(Math.max(estimated, 2048), MAX_OUTPUT_TOKENS);
}

// Build generationConfig object with model-aware optimizations.
// - Always: temperature 0.3 (translation needs determinism)
// - Always: dynamic maxOutputTokens
// - Flash family only: thinkingBudget=0 (saves ~55% tokens; Pro doesn't support disabling)
function buildGenerationConfig(model, userText) {
  const config = {
    temperature: 0.3,
    maxOutputTokens: calculateMaxOutputTokens(userText),
  };
  const m = (model || '').toLowerCase();
  // gemini-2.5-flash and flash-lite support thinkingBudget=0
  // gemini-2.5-pro does NOT (min 128); leave thinking on dynamic for Pro
  if (m.includes('flash')) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

// ─── Token logging (M0.5 baseline) ───
function logTokenUsage(model, usageMetadata, label = 'gemini') {
  if (!usageMetadata) return;
  const {
    promptTokenCount: prompt = 0,
    candidatesTokenCount: output = 0,
    totalTokenCount: total = 0,
  } = usageMetadata;
  console.log(`[GEMINI-TOKENS] ${label} | model=${model} | prompt=${prompt} | output=${output} | total=${total}`);
}

export async function fetchGeminiCompletion(systemPrompt, userText, { signal, maxRetries = 3, model } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let response;
    try {
      response = await fetch(getGeminiApiUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userText }] }],
          generationConfig: buildGenerationConfig(model, userText),
        }),
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') throw fetchError;
      throw parseGeminiError(null, null, fetchError);
    }

    if (response.ok) {
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text || text.trim() === '') {
        // Safety block or empty response
        throw parseGeminiError(200, data);
      }

      logTokenUsage(model, data.usageMetadata, 'fetch');
      useKeyStore.getState().incrementQuota();
      return text;
    }

    const errorBody = await response.json().catch(() => ({}));

    // 429 — retry with backoff
    if (response.status === 429 && attempt < maxRetries) {
      const parsed = parseGeminiError(response.status, errorBody);
      // Daily quota → don't retry, throw immediately
      if (parsed.code === 'RATE_LIMIT_RPD') throw parsed;

      const msg = errorBody?.error?.message || '';
      const retryMatch = msg.match(/retry in ([\d.]+)s/);
      const waitMs = retryMatch
        ? (Math.ceil(parseFloat(retryMatch[1])) + 3) * 1000
        : 45000 * (attempt + 1);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    // 500/503 — retry
    if (response.status >= 500 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }

    // All other errors — throw structured ApiError
    throw parseGeminiError(response.status, errorBody);
  }
}

/**
 * Streaming Gemini completion — yields text chunks via onChunk callback.
 * Uses Server-Sent Events (SSE) via streamGenerateContent endpoint.
 * Returns the full concatenated text when done.
 */
export async function streamGeminiCompletion(systemPrompt, userText, { signal, onChunk, maxRetries = 3, model } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let response;
    try {
      response = await fetch(getGeminiStreamUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userText }] }],
          generationConfig: buildGenerationConfig(model, userText),
        }),
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') throw fetchError;
      throw parseGeminiError(null, null, fetchError);
    }

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      let finalUsageMetadata = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete last line

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);
              const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                fullText += chunk;
                onChunk?.(chunk, fullText);
              }
              if (data.usageMetadata) finalUsageMetadata = data.usageMetadata;
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const remaining = buffer.trim();
          if (remaining.startsWith('data: ')) {
            const jsonStr = remaining.slice(6).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const data = JSON.parse(jsonStr);
                const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunk) {
                  fullText += chunk;
                  onChunk?.(chunk, fullText);
                }
                if (data.usageMetadata) finalUsageMetadata = data.usageMetadata;
              } catch { /* skip */ }
            }
          }
        }
      } catch (readError) {
        if (readError.name === 'AbortError') throw readError;
        // If we already have partial text, return it
        if (fullText.trim()) return fullText;
        throw parseGeminiError(null, null, readError);
      }

      if (!fullText.trim()) {
        throw parseGeminiError(200, { candidates: [{ content: { parts: [{ text: '' }] } }] });
      }

      logTokenUsage(model, finalUsageMetadata, 'stream');
      useKeyStore.getState().incrementQuota();
      return fullText;
    }

    const errorBody = await response.json().catch(() => ({}));

    if (response.status === 429 && attempt < maxRetries) {
      const parsed = parseGeminiError(response.status, errorBody);
      if (parsed.code === 'RATE_LIMIT_RPD') throw parsed;

      const msg = errorBody?.error?.message || '';
      const retryMatch = msg.match(/retry in ([\d.]+)s/);
      const waitMs = retryMatch
        ? (Math.ceil(parseFloat(retryMatch[1])) + 3) * 1000
        : 45000 * (attempt + 1);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    if (response.status >= 500 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }

    throw parseGeminiError(response.status, errorBody);
  }
}
