// Single source of truth for Gemini model selection.
// Used by agentPipeline.js to pick translator/reviewer model based on key tier.

// ─── Translator model (mandatory call per section) ───
// Free tier: gemini-2.5-flash (good quality, supports thinkingBudget=0)
// Paid tier: gemini-2.5-pro (highest quality; thinking always on for Pro)
const TRANSLATOR_MODELS = {
  free: 'gemini-2.5-flash',
  paid: 'gemini-2.5-pro',
};

// ─── Reviewer model (optional polish call when enableReview=true) ───
// Flash is sufficient for polishing; Pro not needed even on paid tier.
const REVIEWER_MODELS = {
  free: 'gemini-2.5-flash',
  paid: 'gemini-2.5-flash',
};

export function getTranslatorModel(keyTier) {
  return TRANSLATOR_MODELS[keyTier] || TRANSLATOR_MODELS.free;
}

export function getReviewerModel(keyTier) {
  return REVIEWER_MODELS[keyTier] || REVIEWER_MODELS.free;
}

// ─── Legacy export kept for backward compat with agentPipeline.js ───
// agentPipeline.js still imports QUICK_MODE_MODEL directly (will be migrated to
// getTranslatorModel in M2.4 when removing runAgentPipeline).
export const QUICK_MODE_MODEL = 'gemini-2.5-flash';

// ─── Reference: Gemini rate limits (Jan 2026, free tier) ───
// Kept as comments for documentation; not enforced programmatically.
// gemini-2.5-pro:        5 RPM,  100 RPD
// gemini-2.5-flash:     10 RPM,  500 RPD
// gemini-2.5-flash-lite:15 RPM, 1500 RPD
