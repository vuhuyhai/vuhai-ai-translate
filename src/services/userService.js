import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

export const userService = {
  async createOrUpdateUser(firebaseUser) {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const existing = await getDoc(userRef);

      if (!existing.exists()) {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          isAnonymous: firebaseUser.isAnonymous,
          firstSeen: serverTimestamp(),
          lastSeen: serverTimestamp(),
          sessionCount: 1,
          translationCount: 0,
          pdfUploadCount: 0,
          totalPagesTranslated: 0,
          userAgent: navigator.userAgent,
          language: navigator.language,
        });
      } else {
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          sessionCount: increment(1),
          ...(firebaseUser.email && { email: firebaseUser.email }),
          ...(firebaseUser.displayName && { displayName: firebaseUser.displayName }),
          isAnonymous: firebaseUser.isAnonymous,
        });
      }
    } catch (error) {
      console.error('[UserService] Error:', error);
    }
  },

  async updateUserProfile(firebaseUser) {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        isAnonymous: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[UserService] Profile update error:', error);
    }
  },

  async incrementStat(uid, field, amount = 1) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        [field]: increment(amount),
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error('[UserService] Stat increment error:', error);
    }
  },
};
