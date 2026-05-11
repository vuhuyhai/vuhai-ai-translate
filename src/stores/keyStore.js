import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectKeyTier, KEY_TIERS } from '../services/keyDetector';

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // "2026-04-02"
}

const useKeyStore = create(persist(
  (set, get) => ({
    geminiKey: '',
    keyTier: KEY_TIERS.UNKNOWN,
    isDetecting: false,
    detectionError: null,
    rpmLimit: 0,       // actual RPM from API header
    rpdLimit: 0,       // daily request limit (from API or estimated)

    // Per-day tracking
    quotaUsedToday: 0,
    quotaDate: '',     // "2026-04-02" — reset when date changes
    quotaLimit: 250,
    quotaPercent: 0,

    setGeminiKey: async (newKey) => {
      if (!newKey || newKey.length < 20) {
        set({ geminiKey: newKey, keyTier: KEY_TIERS.UNKNOWN, isDetecting: false, rpmLimit: 0, rpdLimit: 0 });
        return;
      }

      set({ geminiKey: newKey, isDetecting: true, detectionError: null });

      const result = await detectKeyTier(newKey);
      const isPaid = result.tier === KEY_TIERS.PAID;
      const quotaLimit = isPaid ? 99999 : 250;

      set({
        keyTier: result.tier,
        isDetecting: false,
        detectionError: result.error || null,
        rpmLimit: result.rpmLimit || 0,
        rpdLimit: result.rpdLimit || (isPaid ? 99999 : 250),
        quotaLimit,
      });
    },

    // Call this after every successful Gemini API request
    incrementQuota: () => {
      const { quotaDate, quotaLimit } = get();
      const today = getTodayKey();

      // Reset if new day
      if (quotaDate !== today) {
        set({
          quotaUsedToday: 1,
          quotaDate: today,
          quotaPercent: Math.min(100, Math.round((1 / quotaLimit) * 100)),
        });
      } else {
        const used = get().quotaUsedToday + 1;
        set({
          quotaUsedToday: used,
          quotaPercent: Math.min(100, Math.round((used / quotaLimit) * 100)),
        });
      }
    },

    // Ensure date is current (call on app load / dashboard open)
    ensureDateFresh: () => {
      const { quotaDate } = get();
      const today = getTodayKey();
      if (quotaDate !== today) {
        set({ quotaUsedToday: 0, quotaDate: today, quotaPercent: 0 });
      }
    },

    updateQuotaUsage: (used) => {
      const { quotaLimit } = get();
      set({
        quotaUsedToday: used,
        quotaPercent: Math.min(100, Math.round((used / quotaLimit) * 100)),
      });
    },

    clearKeys: () => set({
      geminiKey: '',
      keyTier: KEY_TIERS.UNKNOWN,
      quotaUsedToday: 0,
      quotaPercent: 0,
      rpmLimit: 0,
      rpdLimit: 0,
    }),

    isFreeTier: () => get().keyTier === KEY_TIERS.FREE,
    isPaidTier: () => get().keyTier === KEY_TIERS.PAID,
    isQuotaLow: () => get().quotaPercent >= 80,
    isQuotaExhausted: () => get().quotaPercent >= 95,
  }),
  {
    name: 'vuhai_key_config',
    partialize: (state) => ({
      geminiKey: state.geminiKey,
      keyTier: state.keyTier,
      quotaLimit: state.quotaLimit,
      rpmLimit: state.rpmLimit,
      rpdLimit: state.rpdLimit,
      quotaUsedToday: state.quotaUsedToday,
      quotaDate: state.quotaDate,
    }),
  }
));

export default useKeyStore;
