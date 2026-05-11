export const KEY_TIERS = {
  UNKNOWN: 'unknown',
  FREE: 'free',
  PAID: 'paid',
  INVALID: 'invalid',
};

/**
 * Detect whether a Gemini API key is free (AI Studio) or paid (Cloud Console).
 * Uses a minimal 1-token request to flash-lite to minimize cost.
 */
export async function detectKeyTier(apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    clearTimeout(timeout);

    if (response.status === 400 || response.status === 403) {
      const err = await response.json().catch(() => null);
      const status = err?.error?.status;
      if (status === 'INVALID_ARGUMENT' || status === 'PERMISSION_DENIED') {
        return { tier: KEY_TIERS.INVALID, error: err?.error?.message };
      }
    }

    if (response.status === 429) {
      return { tier: KEY_TIERS.FREE, rateLimited: true, rpmLimit: 10 };
    }

    if (!response.ok) {
      return { tier: KEY_TIERS.UNKNOWN };
    }

    // Read rate limit headers to determine tier
    const rpmLimit = parseInt(response.headers.get('x-ratelimit-limit-requests') || '0');
    const rpdLimit = parseInt(response.headers.get('x-ratelimit-limit-requests-per-day') || '0');

    if (rpmLimit >= 100) {
      return { tier: KEY_TIERS.PAID, rpmLimit, rpdLimit: rpdLimit || 99999 };
    } else if (rpmLimit > 0) {
      return { tier: KEY_TIERS.FREE, rpmLimit, rpdLimit: rpdLimit || 250 };
    }

    // No headers → assume free (safe default)
    return { tier: KEY_TIERS.FREE, rpmLimit: 10, rpdLimit: 250 };
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { tier: KEY_TIERS.UNKNOWN, error: 'Hết thời gian chờ. Thử lại.' };
    }
    if (error.message?.includes('Failed to fetch')) {
      return { tier: KEY_TIERS.UNKNOWN, error: 'Không thể kết nối. Kiểm tra mạng.' };
    }
    return { tier: KEY_TIERS.UNKNOWN, error: error.message };
  }
}
