import React, { useState, useRef, useEffect } from 'react';
import { TOPICS, AUDIENCES } from '../constants/prompts';
import { getTopic, getAudience } from '../constants/config';
import useKeyStore from '../stores/keyStore';
import { KEY_TIERS } from '../services/keyDetector';

const TIER_STATUS = {
  [KEY_TIERS.UNKNOWN]: { icon: null, className: '', text: '' },
  [KEY_TIERS.FREE]: { icon: '✓', className: 'key-status-success', text: '✅ Free tier · ~250 đoạn/ngày · Reset 14:00 hàng ngày' },
  [KEY_TIERS.PAID]: { icon: '✓', className: 'key-status-success', text: '⭐ Paid tier · Không giới hạn · Chất lượng cao nhất' },
  [KEY_TIERS.INVALID]: { icon: '✗', className: 'key-status-error', text: '❌ Key không hợp lệ. Kiểm tra lại hoặc lấy key mới.' },
};

export function ApiKeyScreen({ onSubmit, initialApiKey }) {
  const { geminiKey, keyTier, isDetecting, setGeminiKey } = useKeyStore();

  const [apiKey, setApiKey] = useState(() => initialApiKey || geminiKey || localStorage.getItem('vuhai-gemini-api-key') || '');
  const [topicId, setTopicId] = useState(getTopic());
  const [audienceId, setAudienceId] = useState(getAudience());
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const detectTimeout = useRef(null);

  const handleKeyChange = (value) => {
    setApiKey(value);
    setError('');
    clearTimeout(detectTimeout.current);
    detectTimeout.current = setTimeout(() => {
      if (value.startsWith('AIza') && value.length > 30) {
        setGeminiKey(value);
      }
    }, 600);
  };

  useEffect(() => () => clearTimeout(detectTimeout.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) { setError('Vui lòng nhập API Key'); return; }
    if (keyTier === KEY_TIERS.INVALID) { setError('API Key không hợp lệ.'); return; }
    if (isDetecting) return;
    onSubmit(trimmed, topicId, audienceId, 'gemini');
  };

  const geminiStatus = isDetecting
    ? { icon: '🔄', className: 'key-status-detecting', text: 'Đang xác minh key...' }
    : TIER_STATUS[keyTier] || TIER_STATUS[KEY_TIERS.UNKNOWN];
  const showStatus = apiKey.length > 20;
  const canSubmit = !isDetecting && keyTier !== KEY_TIERS.INVALID && apiKey.trim().length > 20;

  return (
    <div className="setup-page">
      <header className="setup-header">
        <span className="setup-header-eyebrow">Bước 2 · API Key</span>
        <h1 className="setup-header-title">Nhập Gemini API Key</h1>
        <p className="setup-header-desc">
          Miễn phí · Không cần thẻ tín dụng · Bắt đầu ngay
        </p>
      </header>

      <div className="setup-grid">
        {/* ─── LEFT: Form ─── */}
        <div className="setup-col-left">
          <div className="card setup-card">
            <form onSubmit={handleSubmit} className="setup-form">
              {/* API Key */}
              <div className="setup-field">
                <label className="setup-label">Gemini API Key</label>
                <div className="setup-input-wrap">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder="AIza... (Lấy miễn phí tại aistudio.google.com)"
                    autoFocus
                    className={`setup-input ${error ? 'has-error' : ''} ${showStatus && keyTier === KEY_TIERS.INVALID ? 'has-error' : ''} ${showStatus && (keyTier === KEY_TIERS.FREE || keyTier === KEY_TIERS.PAID) ? 'has-success' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="setup-input-toggle"
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                  {showStatus && geminiStatus.icon && (
                    <span className={`setup-input-status ${geminiStatus.className}`}>
                      {isDetecting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : geminiStatus.icon}
                    </span>
                  )}
                </div>
                {showStatus && geminiStatus.text && (
                  <div className={`setup-key-status ${geminiStatus.className}`}>{geminiStatus.text}</div>
                )}
                {!apiKey && (
                  <div className="setup-key-hint">
                    Chưa có key?{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="setup-link">
                      Lấy miễn phí tại đây ↗
                    </a>
                    {' · '}
                    <button type="button" onClick={() => setShowGuide(v => !v)} className="setup-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
                      Xem hướng dẫn {showGuide ? '▴' : '▾'}
                    </button>
                  </div>
                )}

                {/* Collapsible guide */}
                {showGuide && (
                  <div className="apikey-guide fade-in">
                    <div className="apikey-guide-step"><span className="apikey-guide-num">1</span> Vào <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="setup-link">aistudio.google.com/apikey ↗</a></div>
                    <div className="apikey-guide-step"><span className="apikey-guide-num">2</span> Click <strong>"Create API key"</strong> → Copy key</div>
                    <div className="apikey-guide-step"><span className="apikey-guide-num">3</span> Dán vào ô bên trên</div>
                    <div className="apikey-guide-note">✅ Miễn phí hoàn toàn · Không cần thẻ tín dụng</div>
                  </div>
                )}
              </div>

              {/* Topic */}
              <div className="setup-field">
                <label className="setup-label">Chủ đề tài liệu</label>
                <div className="setup-topic-grid">
                  {TOPICS.map(topic => (
                    <button key={topic.id} type="button" onClick={() => setTopicId(topic.id)}
                      className={`setup-topic-btn ${topicId === topic.id ? 'active' : ''}`}>
                      <span className="setup-topic-icon">{topic.icon}</span>
                      <span>{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience */}
              <div className="setup-field">
                <label className="setup-label">Đối tượng sử dụng</label>
                <div className="setup-audience-list">
                  {AUDIENCES.map(aud => (
                    <button key={aud.id} type="button" onClick={() => setAudienceId(aud.id)}
                      className={`setup-audience-btn ${audienceId === aud.id ? 'active' : ''}`}>
                      <span className="setup-audience-icon">{aud.icon}</span>
                      <div>
                        <div className={`setup-audience-title ${audienceId === aud.id ? 'active' : ''}`}>{aud.label}</div>
                        <div className="setup-audience-desc">{aud.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="setup-error">{error}</div>}

              <button type="submit" className="setup-submit" disabled={isDetecting || !canSubmit}>
                {isDetecting ? (
                  <><span className="spinner spinner-inverse setup-spinner" /> Đang xác minh...</>
                ) : (
                  'Bắt đầu dịch →'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ─── RIGHT: Benefits ─── */}
        <div className="setup-col-right">
          <div className="card setup-card setup-benefits-card">
            <h2 className="setup-section-title">Tại sao chọn Gemini?</h2>
            <div className="setup-benefits-list">
              {[
                { icon: '🆓', title: 'Miễn phí hoàn toàn', desc: 'Dịch ~500 trang/ngày · Không cần thẻ tín dụng' },
                { icon: '🇻🇳', title: 'Tiếng Việt xuất sắc', desc: 'Hiểu ngữ cảnh tiếng Việt tự nhiên, ít lỗi dịch máy' },
                { icon: '📄', title: '1 triệu token context', desc: 'Xử lý tài liệu dài mà không bị cắt nội dung' },
                { icon: '⚡', title: 'Tốc độ nhanh', desc: 'Phản hồi nhanh, phù hợp dịch hàng loạt đoạn' },
              ].map((b, i) => (
                <div key={i} className="setup-benefit-item">
                  <span className="setup-benefit-icon">{b.icon}</span>
                  <div>
                    <div className="setup-benefit-title">{b.title}</div>
                    <div className="setup-benefit-desc">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="setup-security-note">
            <span className="setup-security-icon">🔒</span>
            <span>API Key lưu trong trình duyệt · Không gửi lên server · Hoàn toàn riêng tư</span>
          </div>
        </div>
      </div>
    </div>
  );
}
