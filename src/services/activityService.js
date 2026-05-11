import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

const col = (uid) => collection(db, 'activity_log', uid, 'events');

export const activityService = {

  async log(eventType, data = {}) {
    const uid = auth.currentUser?.uid;
    if (!uid || auth.currentUser?.isAnonymous) return;

    try {
      await addDoc(col(uid), {
        eventType,
        documentId: data.documentId || null,
        documentTitle: data.documentTitle || null,
        stats: {
          sectionsCount: data.sectionsCount || 0,
          wordsTranslated: data.wordsTranslated || 0,
          topic: data.topic || null,
          provider: data.provider || null,
          mode: data.mode || null,
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Activity] Log failed:', err);
    }
  },

  async getRecent(limitCount = 50) {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    try {
      const q = query(col(uid), orderBy('timestamp', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[Activity] getRecent failed:', err);
      return [];
    }
  },

  async getStats() {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const events = await activityService.getRecent(500);

    const totalWords = events
      .filter(e => e.eventType === 'translation_completed')
      .reduce((sum, e) => sum + (e.stats?.wordsTranslated || 0), 0);

    const activityByDay = {};
    events.forEach(e => {
      const day = new Date(e.timestamp).toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + (e.stats?.wordsTranslated || 0);
    });

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (activityByDay[key]) streak++;
      else if (i > 0) break;
    }

    return { totalWords, activityByDay, streak };
  },
};
