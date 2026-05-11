import { useState } from 'react';
import useKeyStore from '../stores/keyStore';
import { KEY_TIERS } from '../services/keyDetector';
import { auth } from '../services/firebase';
import { TOPICS, AUDIENCES } from '../constants/prompts';
import { getTopic, setTopic, getAudience, setAudience } from '../constants/config';

const GUIDE_STEPS = [
  {
    step: 1,
    title: 'Mở Google AI Studio',
    desc: 'Truy cập aistudio.google.com — đăng nhập bằng tài khoản Google.',
    action: { label: 'Mở AI Studio →', url: 'https://aistudio.google.com' },
  },
  {
    step: 2,
    title: 'Tạo API Key',
    desc: 'Click "Get API key" ở góc trái → "Create API key" → Chọn project → Copy key.',
    action: { label: 'Mở trang tạo key →', url: 'https://aistudio.google.com/app/apikey' },
  },
  {
    step: 3,
    title: 'Bật Billing (thanh toán)',
    desc: 'Vào Google Cloud Console → Billing → Liên kết thẻ ngân hàng. Google tặng $300 credit miễn phí cho tài khoản mới.',
    action: { label: 'Mở Cloud Billing →', url: 'https://console.cloud.google.com/billing' },
    note: 'Chi phí thực tế: dịch 500 trang ~ $0.10 USD (~2.500đ)',
  },
  {
    step: 4,
    title: 'Dán key vào ô bên dưới',
    desc: 'App tự động xác minh key trong vài giây.',
  },
];

export function PaidKeyScreen({ onKeyConfirmed }) {
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [topicId, setTopicId] = useState(getTopic());
  const [audienceId, setAudienceId] = useState(getAudience());
  const { setGeminiKey } = useKeyStore();
  const user = auth.currentUser;

  const handleKeyChange = async (value) => {
    setApiKey(value);
    setKeyStatus('idle');
    setErrorMsg('');

    if (value.startsWith('AIza') && value.length >= 39) {
      setKeyStatus('detecting');
      try {
        await setGeminiKey(value);
        const { keyTier } = useKeyStore.getState();
        if (keyTier === KEY_TIERS.PAID) {
          setKeyStatus('paid');
        } else if (keyTier === KEY_TIERS.FREE) {
          setKeyStatus('free');
          setErrorMsg('Đây là Free key. Bạn cần Paid key (có bật Billing) để dùng app.');
        } else if (keyTier === KEY_TIERS.INVALID) {
          setKeyStatus('invalid');
          setErrorMsg('Key không hợp lệ hoặc đã bị xóa. Kiểm tra lại hoặc tạo key mới.');
        } else {
          setKeyStatus('invalid');
          setErrorMsg('Không xác minh được key. Thử lại.');
        }
      } catch {
        setKeyStatus('invalid');
        setErrorMsg('Không xác minh được key. Kiểm tra kết nối mạng.');
      }
    }
  };

  const handleConfirm = () => {
    if (keyStatus !== 'paid') return;
    setTopic(topicId);
    setAudience(audienceId);
    onKeyConfirmed(apiKey, topicId, audienceId);
  };

  const borderColor =
    keyStatus === 'paid' ? 'var(--color-text-success)' :
    keyStatus === 'free' || keyStatus === 'invalid' ? 'var(--color-text-danger)' :
    'var(--color-border-secondary)';

  return (
    <div style={styles.outer}>
      <div style={styles.wrap}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Nhập Gemini API Key</h1>
          <p style={styles.subtitle}>
            Xin chào {user?.displayName?.split(' ').pop() || 'bạn'}! App cần Paid key để hoạt động.
          </p>
        </div>

        {/* Guide */}
        <div style={styles.guideBox}>
          <p style={styles.guideTitle}>Cách lấy Paid key — 4 bước, khoảng 5 phút</p>
          {GUIDE_STEPS.map(item => (
            <div key={item.step} style={styles.guideStep}>
              <div style={styles.stepNum}>{item.step}</div>
              <div style={{ flex: 1 }}>
                <p style={styles.stepTitle}>{item.title}</p>
                <p style={styles.stepDesc}>{item.desc}</p>
                {item.note && <p style={styles.stepNote}>{item.note}</p>}
                {item.action && (
                  <a href={item.action.url} target="_blank" rel="noopener noreferrer" style={styles.stepLink}>
                    {item.action.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Key input */}
        <div style={styles.inputArea}>
          <label style={styles.inputLabel}>Gemini API Key</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => handleKeyChange(e.target.value)}
              placeholder="AIza... (dán key vào đây)"
              style={{ ...styles.input, borderColor }}
              autoFocus
            />
            {keyStatus === 'detecting' && <span style={styles.icon}>⏳</span>}
            {keyStatus === 'paid' && <span style={{ ...styles.icon, color: 'var(--color-text-success)' }}>✓</span>}
            {(keyStatus === 'free' || keyStatus === 'invalid') && <span style={{ ...styles.icon, color: 'var(--color-text-danger)' }}>✗</span>}
          </div>
          {keyStatus === 'detecting' && <p style={styles.infoMsg}>Đang xác minh key...</p>}
          {keyStatus === 'paid' && <p style={styles.successMsg}>Paid key xác nhận — sẵn sàng dịch không giới hạn!</p>}
          {errorMsg && <p style={styles.errorMsg}>{errorMsg}</p>}
        </div>

        {/* Topic selector — only show after key confirmed */}
        {keyStatus === 'paid' && (
          <>
            <div style={styles.inputArea}>
              <label style={styles.inputLabel}>Chủ đề tài liệu</label>
              <div style={styles.topicGrid}>
                {TOPICS.map(topic => (
                  <button key={topic.id} type="button" onClick={() => setTopicId(topic.id)}
                    style={{
                      ...styles.topicBtn,
                      background: topicId === topic.id ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                      color: topicId === topic.id ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                      borderColor: topicId === topic.id ? 'var(--color-text-info)' : 'var(--color-border-secondary)',
                    }}>
                    <span>{topic.icon}</span> {topic.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.inputArea}>
              <label style={styles.inputLabel}>Đối tượng đọc</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {AUDIENCES.map(aud => (
                  <button key={aud.id} type="button" onClick={() => setAudienceId(aud.id)}
                    style={{
                      ...styles.audienceBtn,
                      background: audienceId === aud.id ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                      borderColor: audienceId === aud.id ? 'var(--color-text-info)' : 'var(--color-border-secondary)',
                    }}>
                    <span>{aud.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: audienceId === aud.id ? 'var(--color-text-info)' : 'var(--color-text-primary)' }}>{aud.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{aud.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CTA */}
        <button onClick={handleConfirm} disabled={keyStatus !== 'paid'}
          style={{ ...styles.ctaBtn, opacity: keyStatus === 'paid' ? 1 : 0.4, cursor: keyStatus === 'paid' ? 'pointer' : 'not-allowed' }}>
          Vào app dịch →
        </button>

        <p style={styles.securityNote}>
          🔒 Key chỉ lưu trong trình duyệt của bạn · Không gửi lên server · Hoàn toàn riêng tư
        </p>
      </div>
    </div>
  );
}

const styles = {
  outer: {
    minHeight: '100vh', background: 'var(--color-bg-app)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '40px 16px',
  },
  wrap: { width: '100%', maxWidth: 560 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 },
  guideBox: {
    background: 'var(--color-background-primary)',
    border: '1px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-lg)', padding: '20px 24px', marginBottom: 20,
  },
  guideTitle: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 16px' },
  guideStep: { display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  stepNum: {
    width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
    background: 'var(--color-background-info)', color: 'var(--color-text-info)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
  },
  stepTitle: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 3px' },
  stepDesc: { fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 6px', lineHeight: 1.6 },
  stepNote: {
    fontSize: 12, color: 'var(--color-text-success)', margin: '0 0 6px',
    background: 'var(--color-status-translated-bg)', padding: '4px 8px',
    borderRadius: 6, display: 'inline-block',
  },
  stepLink: { fontSize: 12, color: 'var(--color-text-info)', textDecoration: 'none' },
  inputArea: { marginBottom: 16 },
  inputLabel: { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 40px 10px 14px', fontSize: 14,
    border: '1px solid', borderRadius: 'var(--border-radius-md)',
    background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
    boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s',
  },
  icon: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 },
  infoMsg: { fontSize: 12, color: 'var(--color-text-secondary)', margin: '6px 0 0' },
  successMsg: { fontSize: 12, color: 'var(--color-text-success)', margin: '6px 0 0' },
  errorMsg: { fontSize: 12, color: 'var(--color-text-danger)', margin: '6px 0 0', lineHeight: 1.5 },
  topicGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6,
  },
  topicBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
    border: '1px solid', borderRadius: 'var(--border-radius-md)',
    fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
  },
  audienceBtn: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    border: '1px solid', borderRadius: 'var(--border-radius-md)',
    cursor: 'pointer', transition: 'all 0.15s', background: 'none',
  },
  ctaBtn: {
    display: 'block', width: '100%', padding: '12px 16px',
    background: '#DC2626', color: '#fff', border: 'none',
    borderRadius: 'var(--border-radius-md)', fontSize: 15, fontWeight: 500,
    marginBottom: 12, transition: 'opacity 0.15s',
  },
  securityNote: {
    fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: 0, lineHeight: 1.6,
  },
};
