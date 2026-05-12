import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { userService } from '../services/userService';

function mapFirebaseError(code) {
  const map = {
    'auth/email-already-in-use':    'Email này đã được đăng ký. Hãy đăng nhập.',
    'auth/invalid-email':           'Email không đúng định dạng.',
    'auth/weak-password':           'Mật khẩu quá yếu. Dùng ít nhất 6 ký tự.',
    'auth/user-not-found':          'Không tìm thấy tài khoản với email này. Hãy đăng ký.',
    'auth/wrong-password':          'Mật khẩu không đúng.',
    'auth/invalid-credential':      'Email hoặc mật khẩu không đúng.',
    'auth/invalid-login-credentials': 'Email hoặc mật khẩu không đúng.',
    'auth/too-many-requests':       'Quá nhiều lần thử. Vui lòng đợi vài phút.',
    'auth/popup-closed-by-user':    'Cửa sổ đăng nhập bị đóng. Thử lại nhé.',
    'auth/network-request-failed':  'Lỗi kết nối mạng. Kiểm tra internet.',
    'auth/operation-not-allowed':   'Đăng nhập bằng email chưa được bật. Vui lòng dùng Google hoặc liên hệ admin.',
    'auth/user-disabled':           'Tài khoản đã bị vô hiệu hóa.',
    'auth/account-exists-with-different-credential': 'Email này đã đăng ký bằng phương thức khác (Google). Hãy dùng Google để đăng nhập.',
  };
  return map[code] || `Đã xảy ra lỗi (${code || 'unknown'}). Vui lòng thử lại.`;
}

export function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await userService.createOrUpdateUser(result.user);
      onLogin();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapFirebaseError(err.code));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e?.preventDefault?.();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      setError('Vui lòng nhập tên của bạn.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (tab === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name.trim() });
        await userService.createOrUpdateUser(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await userService.createOrUpdateUser(result.user);
      }
      onLogin();
    } catch (err) {
      setError(mapFirebaseError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ─── Brand zone ─── */}
      <div className="login-logo">
        <div className="login-logo-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
          </svg>
        </div>
        <span className="login-eyebrow">AI Translate</span>
        <h1 className="login-app-name">Dịch tài liệu Anh → Việt</h1>
        <p className="login-tagline">AI chuyên ngành · Chuẩn xuất bản</p>
      </div>

      {/* ─── Login card ─── */}
      <div className="login-card">
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`login-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="login-form">
          {tab === 'register' && (
            <div className="login-field">
              <label className="login-label">Tên của bạn</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="login-input"
              />
            </div>
          )}

          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="login-input"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">Mật khẩu</label>
            <div className="login-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Tối thiểu 6 ký tự' : '••••••••'}
                className="login-input"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="login-eye-btn"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={isLoading} className="login-submit">
            {isLoading
              ? 'Đang xử lý...'
              : tab === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">hoặc</span>
          <div className="login-divider-line" />
        </div>

        <button onClick={handleGoogle} disabled={isLoading} className="login-google-btn">
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Tiếp tục với Google
        </button>

        <p className="login-privacy">
          API Key chỉ lưu trong trình duyệt · Không gửi lên server
        </p>
      </div>

      {/* ─── Stat strip (social proof) ─── */}
      <div className="login-stats">
        <div className="login-stat">
          <div className="login-stat-num">10</div>
          <div className="login-stat-label">Chuyên ngành</div>
        </div>
        <div className="login-stat">
          <div className="login-stat-num">4</div>
          <div className="login-stat-label">AI Agents</div>
        </div>
        <div className="login-stat">
          <div className="login-stat-num">100%</div>
          <div className="login-stat-label">Lưu local</div>
        </div>
      </div>
    </div>
  );
}
