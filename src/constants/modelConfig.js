// ── Model routing per key tier ──

// Free key: gemini-2.5-flash for all agents
export const AGENT_MODEL_MAP_FREE = {
  analyst:    'gemini-2.5-flash',
  translator: 'gemini-2.5-flash',
  editor:     'gemini-2.5-flash',
  qa:         'gemini-2.5-flash',
};

// Paid key standard: flash-lite for lightweight, flash for main
export const AGENT_MODEL_MAP = {
  analyst:    'gemini-2.5-flash-lite',
  translator: 'gemini-2.5-flash',
  editor:     'gemini-2.5-flash-lite',
  qa:         'gemini-2.5-flash',
};

// Paid key ultra quality
export const AGENT_MODEL_MAP_ULTRA = {
  analyst:    'gemini-2.5-flash-lite',
  translator: 'gemini-2.5-pro',
  editor:     'gemini-2.5-flash-lite',
  qa:         'gemini-2.5-pro',
};

// Quick mode: single model for translator+qa only
export const QUICK_MODE_MODEL = 'gemini-2.5-flash';

// Rate limits
export const MODEL_RPM = {
  'gemini-2.5-pro':        5,
  'gemini-2.5-flash':      10,
  'gemini-2.5-flash-lite': 15,
};

export const MODEL_RPD = {
  'gemini-2.5-pro':        100,
  'gemini-2.5-flash':      500,
  'gemini-2.5-flash-lite': 1500,
};

export const MODEL_MIN_INTERVAL_MS = {
  'gemini-2.5-pro':        14000,
  'gemini-2.5-flash':       7000,
  'gemini-2.5-flash-lite':  5000,
};

// Helper: get the right model map for a key tier
export function getAgentModelMap(keyTier, quality = 'standard') {
  if (keyTier === 'free') return AGENT_MODEL_MAP_FREE;
  if (quality === 'ultra') return AGENT_MODEL_MAP_ULTRA;
  return AGENT_MODEL_MAP;
}
