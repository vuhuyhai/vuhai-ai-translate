import { useState } from 'react';
import { extractTextFromUrl } from '../services/urlExtractor';

export function UrlInputZone({ onExtracted }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError] = useState('');

  const isValid = url.trim().startsWith('http');

  const handleSubmit = async () => {
    if (!isValid) {
      setError('URL phải bắt đầu bằng https://');
      return;
    }
    setStatus('loading');
    setError('');

    try {
      const result = await extractTextFromUrl(url.trim());
      setStatus('idle');
      onExtracted({
        ...result,
        sourceUrl: url.trim(),
        sourceType: 'url',
      });
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div className="url-input-zone">
      <div className="url-input-icon">🔗</div>

      <p className="url-input-title">Dán đường link bài viết tiếng Anh</p>
      <p className="url-input-sub">
        Wikipedia · Medium · BBC · Reuters · Blog · Hầu hết trang web
      </p>

      <div className="url-input-row">
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && isValid && handleSubmit()}
          placeholder="https://en.wikipedia.org/wiki/..."
          disabled={status === 'loading'}
          className={`url-input-field ${error ? 'error' : ''}`}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid || status === 'loading'}
          className="url-input-btn"
        >
          {status === 'loading' ? (
            <>
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
              Đang đọc...
            </>
          ) : 'Đọc & Dịch →'}
        </button>
      </div>

      {status === 'loading' && (
        <div className="url-input-loading">
          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
          <span>Đang tải nội dung từ URL...</span>
        </div>
      )}

      {error && (
        <p className="url-input-error">⚠ {error}</p>
      )}

      <p className="url-input-note">
        Không hỗ trợ: trang yêu cầu đăng nhập · trang chỉ dùng JavaScript
      </p>
    </div>
  );
}
