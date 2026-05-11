import { MAX_OUTPUT_TOKENS } from '../constants/config';
import { parseClaudeError } from './apiErrorParser';

// Claude support kept for potential future use. Not active in the UI.
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export async function fetchClaudeCompletion(systemPrompt, userText, { signal, maxRetries = 3 } = {}) {
  const apiKey = localStorage.getItem('vuhai-claude-api-key') || '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let response;
    try {
      response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        signal,
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: userText }],
        }),
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') throw fetchError;
      throw parseClaudeError(null, null, fetchError);
    }

    if (response.ok) {
      const data = await response.json();
      const text = data.content?.[0]?.text;
      if (!text) throw parseClaudeError(200, data);
      return text;
    }

    const errorBody = await response.json().catch(() => ({}));

    // 429 — retry
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? (parseInt(retryAfter, 10) + 2) * 1000 : 30000 * (attempt + 1);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    // 500+ — retry
    if (response.status >= 500 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }

    throw parseClaudeError(response.status, errorBody);
  }
}
