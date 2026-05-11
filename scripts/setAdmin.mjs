/**
 * Set admin custom claim for a Firebase user.
 *
 * Usage:
 * 1. Download service account JSON from Firebase Console →
 *    Project settings → Service accounts → Generate new private key
 * 2. Save as ./service-account.json (gitignored)
 * 3. Replace YOUR_UID with your uid from Firebase Console → Authentication
 * 4. Run: node scripts/setAdmin.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({ credential: cert('./service-account.json') });
const authAdmin = getAuth(app);

const uid = process.argv[2] || 'YOUR_UID';

if (uid === 'YOUR_UID') {
  console.error('Usage: node scripts/setAdmin.mjs <USER_UID>');
  console.error('Get UID from Firebase Console → Authentication → Users');
  process.exit(1);
}

await authAdmin.setCustomUserClaims(uid, { admin: true });
console.log(`✅ Admin claim set for uid: ${uid}`);
console.log('Sign out and sign in again for changes to take effect.');
process.exit(0);
