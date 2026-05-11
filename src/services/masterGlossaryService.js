import { db, auth } from './firebase';
import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, query, orderBy, writeBatch,
} from 'firebase/firestore';

const col = (uid) => collection(db, 'master_glossary', uid, 'terms');

export const masterGlossaryService = {

  async getAll({ topic = null, status = null } = {}) {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const q = query(col(uid), orderBy('termEN', 'asc'));
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (topic) results = results.filter(t => t.topic === topic);
    if (status) results = results.filter(t => t.status === status);

    return results;
  },

  async upsertTerm(entry) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Cần đăng nhập');

    const id = entry.id || crypto.randomUUID();
    await setDoc(doc(col(uid), id), {
      ...entry,
      id,
      ownerUid: uid,
      updatedAt: Date.now(),
      createdAt: entry.createdAt || Date.now(),
    }, { merge: true });
    return id;
  },

  async mergeFromDocument(documentGlossary, documentId, documentTitle) {
    const uid = auth.currentUser?.uid;
    if (!uid) return { added: 0, skipped: 0 };

    const existing = await masterGlossaryService.getAll();
    const existingENSet = new Set(existing.map(e => (e.termEN || '').toLowerCase().trim()));

    const batch = writeBatch(db);
    let added = 0, skipped = 0;

    for (const entry of documentGlossary) {
      const termEN = (entry.termEN || entry.en || '').trim();
      const termVI = (entry.termVI || entry.vi || '').trim();
      if (!termEN) continue;

      const key = termEN.toLowerCase();
      if (existingENSet.has(key)) {
        const found = existing.find(e => (e.termEN || '').toLowerCase().trim() === key);
        if (found) {
          batch.update(doc(col(uid), found.id), {
            usageCount: (found.usageCount || 0) + 1,
            updatedAt: Date.now(),
          });
        }
        skipped++;
        continue;
      }

      const id = crypto.randomUUID();
      batch.set(doc(col(uid), id), {
        id,
        ownerUid: uid,
        termEN,
        termVI,
        termVIAlts: entry.termVIAlts || [],
        topic: entry.topic || 'general',
        notes: entry.notes || '',
        status: entry.status === 'approved' ? 'approved' : 'suggested',
        sourceDocumentId: documentId || null,
        sourceDocumentTitle: documentTitle || null,
        usageCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      existingENSet.add(key);
      added++;
    }

    if (added > 0 || skipped > 0) await batch.commit();
    return { added, skipped };
  },

  async deleteTerm(termId) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await deleteDoc(doc(col(uid), termId));
  },

  async updateTerm(termId, changes) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(col(uid), termId), { ...changes, updatedAt: Date.now() });
  },

  exportCSV(terms) {
    const headers = ['Thuật ngữ (EN)', 'Dịch (VI)', 'Bản thay thế', 'Chủ đề', 'Trạng thái', 'Số lần dùng', 'Ghi chú'];
    const rows = terms.map(t => [
      t.termEN, t.termVI, (t.termVIAlts || []).join(' / '),
      t.topic, t.status, t.usageCount || 0, (t.notes || '').replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-glossary.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
