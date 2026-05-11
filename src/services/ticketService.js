import { db, auth } from './firebase';
import {
  collection, addDoc, query, where, orderBy, getDocs,
  doc, updateDoc, serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import { analyticsService } from './analyticsService';

const CATEGORIES = {
  bug: 'Báo lỗi',
  quality: 'Chất lượng dịch',
  feature: 'Đề xuất tính năng',
  other: 'Câu hỏi khác',
};

export { CATEGORIES };

export const ticketService = {
  async createTicket({ category, subject, message, attachments = [] }) {
    const user = auth.currentUser;
    if (!user) throw new Error('Cần đăng nhập để gửi feedback');

    const ticket = await addDoc(collection(db, 'feedback_tickets'), {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Khách vãng lai',
      photoURL: user.photoURL || null,
      isAnonymous: user.isAnonymous,
      category,
      subject,
      priority: 'normal',
      status: 'open',
      messages: [{
        id: crypto.randomUUID(),
        content: message,
        authorUid: user.uid,
        authorName: user.displayName || 'Khách vãng lai',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        attachments,
      }],
      attachments,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      resolvedAt: null,
      tags: [],
      internalNote: '',
    });

    analyticsService.track('feedback_submit', { category, ticketId: ticket.id, hasAttachments: attachments.length > 0 });
    return ticket.id;
  },

  async getMyTickets() {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const q = query(
        collection(db, 'feedback_tickets'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      }));
    } catch (error) {
      console.error('[Ticket] getMyTickets error:', error);
      return [];
    }
  },

  async adminReply(ticketId, replyContent) {
    const user = auth.currentUser;
    const newMessage = {
      id: crypto.randomUUID(),
      content: replyContent,
      authorUid: user.uid,
      authorName: 'AI Translate Support',
      isAdmin: true,
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'feedback_tickets', ticketId), {
      messages: arrayUnion(newMessage),
      status: 'in-progress',
      updatedAt: serverTimestamp(),
    });
    return newMessage;
  },

  async updateTicket(ticketId, changes) {
    const update = { ...changes, updatedAt: serverTimestamp() };
    if (changes.status === 'resolved' || changes.status === 'closed') {
      update.resolvedAt = serverTimestamp();
    }
    await updateDoc(doc(db, 'feedback_tickets', ticketId), update);
  },

  async updateInternalNote(ticketId, note) {
    await updateDoc(doc(db, 'feedback_tickets', ticketId), {
      internalNote: note,
      updatedAt: serverTimestamp(),
    });
  },

  // Admin: get all tickets
  async getTickets({ status = null } = {}) {
    try {
      let q;
      if (status) {
        q = query(
          collection(db, 'feedback_tickets'),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'feedback_tickets'),
          orderBy('createdAt', 'desc')
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      }));
    } catch (error) {
      console.error('[Ticket] getTickets error:', error);
      return [];
    }
  },
};
