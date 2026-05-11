import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const VALID_EVENTS = [
  'session_start',
  'session_end',
  'pdf_upload',
  'translation_start',
  'translation_complete',
  'translation_error',
  'review_start',
  'review_complete',
  'export_txt',
  'export_doc',
  'copy_clipboard',
  'glossary_approve',
  'upgrade_to_google',
];

function getSessionId() {
  let id = sessionStorage.getItem('vuhai_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('vuhai_session_id', id);
  }
  return id;
}

function sanitizeProperties(props) {
  const safe = { ...props };
  delete safe.apiKey;
  delete safe.content;
  delete safe.text;
  return safe;
}

export const analyticsService = {
  async track(eventName, properties = {}) {
    if (!VALID_EVENTS.includes(eventName)) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, 'analytics_events'), {
        eventName,
        uid: user.uid,
        isAnonymous: user.isAnonymous,
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0],
        sessionId: getSessionId(),
        properties: sanitizeProperties(properties),
      });
    } catch {
      // Analytics must never crash the app
    }
  },
};
