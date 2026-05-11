// ─── App Configuration ───

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_OUTPUT_TOKENS = 65536;

// ─── Provider (Gemini only) ───
export function getProvider() {
  return 'gemini';
}

export function setProvider() {
  // no-op: only Gemini is supported
}

// Keep PROVIDERS export for backward compat
export const PROVIDERS = {
  gemini: { id: 'gemini', label: 'Google Gemini', model: 'gemini-2.5-pro' },
};

// ─── Gemini API ───
export const GEMINI_MODEL = 'gemini-2.5-pro';
export const API_KEY_STORAGE_KEY = 'vuhai-gemini-api-key';

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function setApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function getGeminiApiUrl(model) {
  const key = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  const m = model || GEMINI_MODEL;
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
}

export function getGeminiStreamUrl(model) {
  const key = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  const m = model || GEMINI_MODEL;
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${key}`;
}

export function getGeminiApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

// ─── Topic ───
export const TOPIC_STORAGE_KEY = 'vuhai-topic';

export function getTopic() {
  return localStorage.getItem(TOPIC_STORAGE_KEY) || 'marketing';
}

export function setTopic(topic) {
  localStorage.setItem(TOPIC_STORAGE_KEY, topic);
}

// ─── Audience ───
export const AUDIENCE_STORAGE_KEY = 'vuhai-audience';

export function getAudience() {
  return localStorage.getItem(AUDIENCE_STORAGE_KEY) || 'beginner';
}

export function setAudience(audience) {
  localStorage.setItem(AUDIENCE_STORAGE_KEY, audience);
}

// ─── Section splitting ───
export const SECTION_MIN_WORDS = 2000;
export const SECTION_MAX_WORDS = 3000;
export const SECTION_TARGET_WORDS = 2500;
