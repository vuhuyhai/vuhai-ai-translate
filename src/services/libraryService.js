import { db, auth } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy,
  limit, startAfter, increment,
} from 'firebase/firestore';

const COLLECTION = 'translated_documents';
const SHARE_COLLECTION = 'share_links';

export const libraryService = {

  // ── SAVE ──────────────────────────────────────────

  async saveDocument(documentData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Cần đăng nhập để lưu tài liệu');

    const docId = documentData.id || crypto.randomUUID();
    const docRef = doc(db, COLLECTION, docId);

    const payload = {
      ...documentData,
      id: docId,
      ownerUid: user.uid,
      ownerName: user.displayName || null,
      ownerEmail: user.email || null,
      updatedAt: Date.now(),
      createdAt: documentData.createdAt || Date.now(),
      shareSettings: documentData.shareSettings || {
        isPublic: false,
        shareId: null,
        shareUrl: null,
        allowRetranslate: false,
        expiresAt: null,
        viewCount: 0,
      },
    };

    await setDoc(docRef, payload, { merge: true });
    return docId;
  },

  async updateSection(documentId, sectionId, sectionData) {
    const docRef = doc(db, COLLECTION, documentId);
    const existing = await getDoc(docRef);
    if (!existing.exists()) return;

    const sections = existing.data().sections || [];
    const idx = sections.findIndex(s => s.id === sectionId);

    if (idx >= 0) {
      sections[idx] = { ...sections[idx], ...sectionData };
    } else {
      sections.push(sectionData);
    }

    const completedSections = sections.filter(s => s.status === 'done').length;
    const translatedWords = sections
      .filter(s => s.status === 'done')
      .reduce((sum, s) => sum + (s.wordCount || 0), 0);

    await updateDoc(docRef, {
      sections,
      completedSections,
      translatedWords,
      updatedAt: Date.now(),
      status: completedSections === sections.length ? 'complete' : 'partial',
      ...(completedSections === sections.length && { completedAt: Date.now() }),
    });
  },

  // ── READ ──────────────────────────────────────────

  async getMyDocuments({
    pageSize = 20,
    lastDoc = null,
    sortBy = 'updatedAt',
    topic = null,
    status = null,
    searchTitle = null,
  } = {}) {
    const user = auth.currentUser;
    if (!user) return { documents: [], hasMore: false };

    const constraints = [
      where('ownerUid', '==', user.uid),
      orderBy(sortBy, 'desc'),
      limit(pageSize + 1),
    ];

    if (lastDoc) constraints.push(startAfter(lastDoc));

    let q = query(collection(db, COLLECTION), ...constraints);

    const snapshot = await getDocs(q);
    let documents = snapshot.docs.map(d => ({
      ...d.data(),
      _firebaseDoc: d,
    }));

    // Client-side filters (Firestore compound query limits)
    if (topic) {
      documents = documents.filter(d => d.topic === topic);
    }
    if (status) {
      documents = documents.filter(d => d.status === status);
    }
    if (searchTitle) {
      const lower = searchTitle.toLowerCase();
      documents = documents.filter(d =>
        d.title?.toLowerCase().includes(lower) ||
        d.customTitle?.toLowerCase().includes(lower)
      );
    }

    const hasMore = documents.length > pageSize;
    return {
      documents: documents.slice(0, pageSize),
      hasMore,
      lastDoc: snapshot.docs[Math.min(snapshot.docs.length - 1, pageSize - 1)] || null,
    };
  },

  async getDocument(documentId) {
    const snap = await getDoc(doc(db, COLLECTION, documentId));
    if (!snap.exists()) return null;
    return snap.data();
  },

  async renameDocument(documentId, newTitle) {
    await updateDoc(doc(db, COLLECTION, documentId), {
      customTitle: newTitle,
      updatedAt: Date.now(),
    });
  },

  async deleteDocument(documentId) {
    const docSnap = await getDoc(doc(db, COLLECTION, documentId));
    if (docSnap.exists()) {
      const { shareSettings } = docSnap.data();
      if (shareSettings?.shareId) {
        await deleteDoc(doc(db, SHARE_COLLECTION, shareSettings.shareId)).catch(() => {});
      }
    }
    await deleteDoc(doc(db, COLLECTION, documentId));
  },

  // ── SECTION EDIT ──────────────────────────────────

  async saveManualEdit(documentId, sectionId, newText, previousText) {
    const docRef = doc(db, COLLECTION, documentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const sections = snap.data().sections;
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;

    const editRecord = {
      id: crypto.randomUUID(),
      previousText,
      newText,
      editedAt: Date.now(),
      editedBy: 'user',
    };

    sections[idx] = {
      ...sections[idx],
      translatedText: newText,
      lastEditedAt: Date.now(),
      editHistory: [...(sections[idx].editHistory || []), editRecord],
    };

    await updateDoc(docRef, { sections, updatedAt: Date.now() });
  },

  // ── SHARE ─────────────────────────────────────────

  async createShareLink(documentId, options = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error('Cần đăng nhập để chia sẻ');

    const shareId = crypto.randomUUID().slice(0, 12);
    const shareUrl = `${window.location.origin}/share/${shareId}`;

    await setDoc(doc(db, SHARE_COLLECTION, shareId), {
      shareId,
      documentId,
      ownerUid: user.uid,
      isPublic: true,
      allowRetranslate: options.allowRetranslate ?? false,
      expiresAt: options.expiresAt ?? null,
      viewCount: 0,
      createdAt: Date.now(),
    });

    await updateDoc(doc(db, COLLECTION, documentId), {
      'shareSettings.isPublic': true,
      'shareSettings.shareId': shareId,
      'shareSettings.shareUrl': shareUrl,
      'shareSettings.allowRetranslate': options.allowRetranslate ?? false,
      'shareSettings.expiresAt': options.expiresAt ?? null,
    });

    return { shareId, shareUrl };
  },

  async revokeShareLink(documentId, shareId) {
    await deleteDoc(doc(db, SHARE_COLLECTION, shareId));
    await updateDoc(doc(db, COLLECTION, documentId), {
      'shareSettings.isPublic': false,
      'shareSettings.shareId': null,
      'shareSettings.shareUrl': null,
    });
  },

  async getSharedDocument(shareId) {
    const shareSnap = await getDoc(doc(db, SHARE_COLLECTION, shareId));
    if (!shareSnap.exists()) return null;

    const { documentId, expiresAt, viewCount } = shareSnap.data();

    if (expiresAt && Date.now() > expiresAt) return { expired: true };

    await updateDoc(doc(db, SHARE_COLLECTION, shareId), {
      viewCount: increment(1),
    }).catch(() => {});

    const document = await getDoc(doc(db, COLLECTION, documentId));
    if (!document.exists()) return null;

    return { ...document.data(), viewCount: (viewCount || 0) + 1 };
  },
};
