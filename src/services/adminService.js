import { db } from './firebase';
import {
  collection, query, orderBy, limit, getDocs,
  where, Timestamp, getCountFromServer,
} from 'firebase/firestore';

export const adminService = {
  // ── ANALYTICS ──

  async getDailyActiveUsers(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const q = query(
        collection(db, 'analytics_events'),
        where('eventName', '==', 'session_start'),
        where('timestamp', '>=', Timestamp.fromDate(since)),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const byDate = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        if (!byDate[date]) byDate[date] = new Set();
        byDate[date].add(data.uid);
      });

      return Object.entries(byDate).map(([date, uids]) => ({
        date,
        dau: uids.size,
      }));
    } catch (error) {
      console.error('[Admin] DAU error:', error);
      return [];
    }
  },

  async getEventCounts(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const q = query(
        collection(db, 'analytics_events'),
        where('timestamp', '>=', Timestamp.fromDate(since))
      );

      const snapshot = await getDocs(q);
      const counts = {};

      snapshot.forEach(doc => {
        const { eventName } = doc.data();
        counts[eventName] = (counts[eventName] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('[Admin] Event counts error:', error);
      return {};
    }
  },

  async getTotalUserCount() {
    try {
      const anonSnap = await getCountFromServer(
        query(collection(db, 'users'), where('isAnonymous', '==', true))
      );
      const regSnap = await getCountFromServer(
        query(collection(db, 'users'), where('isAnonymous', '==', false))
      );
      const anon = anonSnap.data().count;
      const reg = regSnap.data().count;
      return { anonymous: anon, registered: reg, total: anon + reg };
    } catch (error) {
      console.error('[Admin] User count error:', error);
      return { anonymous: 0, registered: 0, total: 0 };
    }
  },

  // ── USERS ──

  async getUsers({ pageSize = 50, filterAnonymous = null } = {}) {
    try {
      let q;
      if (filterAnonymous !== null) {
        q = query(
          collection(db, 'users'),
          where('isAnonymous', '==', filterAnonymous),
          orderBy('lastSeen', 'desc'),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, 'users'),
          orderBy('lastSeen', 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        firstSeen: doc.data().firstSeen?.toDate(),
        lastSeen: doc.data().lastSeen?.toDate(),
      }));
    } catch (error) {
      console.error('[Admin] Users error:', error);
      return [];
    }
  },

  async getUserEvents(uid, maxEvents = 20) {
    try {
      const q = query(
        collection(db, 'analytics_events'),
        where('uid', '==', uid),
        orderBy('timestamp', 'desc'),
        limit(maxEvents)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate(),
      }));
    } catch (error) {
      console.error('[Admin] User events error:', error);
      return [];
    }
  },

  async searchUserByEmail(email) {
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email),
        limit(5)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        firstSeen: d.data().firstSeen?.toDate(),
        lastSeen: d.data().lastSeen?.toDate(),
      }));
    } catch (error) {
      console.error('[Admin] Search error:', error);
      return [];
    }
  },
};
