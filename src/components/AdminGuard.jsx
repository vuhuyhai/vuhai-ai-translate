import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function AdminGuard({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus('unauthorized');
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult();
        setStatus(tokenResult.claims.admin ? 'authorized' : 'unauthorized');
      } catch {
        setStatus('unauthorized');
      }
    });
    return unsubscribe;
  }, []);

  if (status === 'checking') {
    return (
      <div className="admin-guard-loading">
        <div className="spinner spinner-lg" />
        <p>Đang xác thực quyền truy cập...</p>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="admin-guard-denied">
        <div className="admin-guard-denied-icon">🔒</div>
        <h2>Không có quyền truy cập</h2>
        <p>Bạn cần quyền admin để xem trang này.</p>
        <a href="/" className="btn btn-primary">← Về trang chính</a>
      </div>
    );
  }

  return children;
}
