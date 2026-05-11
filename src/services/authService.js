import { auth, googleProvider } from './firebase';
import {
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  linkWithPopup,
  linkWithRedirect,
} from 'firebase/auth';
import { userService } from './userService';

export const authService = {
  initSession() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();

        // Handle redirect result first (user returning from Google sign-in page)
        try {
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult?.user) {
            await userService.updateUserProfile(redirectResult.user);
            resolve(redirectResult.user);
            return;
          }
        } catch { /* no redirect pending */ }

        if (user) {
          await userService.createOrUpdateUser(user);
          resolve(user);
        } else {
          try {
            const result = await signInAnonymously(auth);
            await userService.createOrUpdateUser(result.user);
            resolve(result.user);
          } catch (error) {
            console.error('[Auth] Anonymous sign-in failed:', error);
            resolve(null);
          }
        }
      });
    });
  },

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await userService.updateUserProfile({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
      return result.user;
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw error;
    }
  },

  async upgradeToGoogle() {
    const user = auth.currentUser;
    if (!user) return this.signInWithGoogle();

    let result;

    try {
      if (user.isAnonymous) {
        result = await linkWithPopup(user, googleProvider);
      } else {
        result = await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        if (user.isAnonymous) {
          await linkWithRedirect(user, googleProvider);
        } else {
          await signInWithRedirect(auth, googleProvider);
        }
        return null;
      }
      if (error.code === 'auth/credential-already-in-use' ||
          error.code === 'auth/email-already-in-use') {
        try {
          result = await signInWithPopup(auth, googleProvider);
        } catch (innerError) {
          if (innerError.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, googleProvider);
            return null;
          }
          throw innerError;
        }
      } else {
        throw error;
      }
    }

    const googleUser = result.user;
    // Sync full Google profile to Firestore
    await userService.updateUserProfile({
      uid: googleUser.uid,
      email: googleUser.email,
      displayName: googleUser.displayName,
      photoURL: googleUser.photoURL,
    });
    return googleUser;
  },

  async signOut() {
    await signOut(auth);
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  getAuth() {
    return auth;
  },
};
