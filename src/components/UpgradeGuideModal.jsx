import { useState } from 'react';
import useKeyStore from '../stores/keyStore';
import { KEY_TIERS } from '../services/keyDetector';

const STEPS = [
  {
    title: 'Mở Google Cloud Console',
    desc: 'Đăng nhập bằng tài khoản Google của bạn.',
    url: 'https://console.cloud.google.com/apis/credentials',
    btnText: 'Mở Google Cloud Console →',
    note: 'Dùng cùng tài khoản với AI Studio để dễ quản lý',
  },
  {
    title: 'Bật thanh toán (Billing)',
    desc: 'Vào Billing → Link a billing account. Google tặng $300 credit cho tài khoản mới — bạn sẽ không bị tính tiền nếu dùng ít.',
    url: 'https://console.cloud.google.com/billing',
    btnText: 'Mở Billing Settings →',
    note: 'Chi phí thực tế: ~$0.30/1M token. Dùng cá nhân thường < $1/tháng',
  },
  {
    title: 'Tạo API Key mới',
    desc: 'Vào APIs & Services → Credentials → Create Credentials → API Key.',
    url: 'https://console.cloud.google.com/apis/credentials',
    btnText: 'Tạo API Key →',
    note: 'Đặt tên dễ nhớ, ví dụ: "AI Translate Key"',
  },
  {
    title: 'Dán key mới vào đây',
    desc: 'Copy key vừa tạo và dán vào ô bên dưới. App sẽ tự xác nhận đây là Paid key.',
    note: 'Key được lưu cục bộ trong trình duyệt, không gửi lên server',
  },
];

export function UpgradeGuideModal({ isOpen, onClose, onKeyEntered }) {
  const [step, setStep] = useState(0);
  const [newKey, setNewKey] = useState('');
  const [checking, setChecking] = useState(false);
  const { setGeminiKey, keyTier } = useKeyStore();

  if (!isOpen) return null;

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const handleCheckKey = async () => {
    if (newKey.length < 20) return;
    setChecking(true);
    await setGeminiKey(newKey);
    setChecking(false);
    const tier = useKeyStore.getState().keyTier;
    if (tier === KEY_TIERS.PAID) {
      onKeyEntered?.();
      onClose();
    }
  };

  return (
    <>
      <div className="gloss-overlay" onClick={onClose} />
      <div className="upgrade-modal fade-in">
        {/* Header */}
        <div className="upgrade-modal-header">
          <h2 className="upgrade-modal-title">Nâng cấp lên Paid Key</h2>
          <button className="gloss-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="upgrade-steps-bar">
          {STEPS.map((_, i) => (
            <div key={i} className="upgrade-step-indicator">
              <div className={`upgrade-step-dot ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`upgrade-step-line ${i < step ? 'active' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="upgrade-modal-body">
          <h3 className="upgrade-step-title">Bước {step + 1}: {current.title}</h3>
          <p className="upgrade-step-desc">{current.desc}</p>

          {!isLastStep ? (
            <button
              className="btn btn-primary-lg upgrade-action-btn"
              onClick={() => {
                window.open(current.url, '_blank');
                setStep(s => s + 1);
              }}
            >
              {current.btnText}
            </button>
          ) : (
            <div className="upgrade-key-input-area">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="AIza..."
                className="setup-input"
                autoFocus
              />
              <button
                className="btn btn-primary-lg upgrade-action-btn"
                onClick={handleCheckKey}
                disabled={checking || newKey.length < 20}
              >
                {checking ? 'Đang xác minh...' : 'Xác nhận key ⭐'}
              </button>
              {keyTier === KEY_TIERS.INVALID && (
                <p className="upgrade-error">Key không hợp lệ. Kiểm tra lại.</p>
              )}
            </div>
          )}

          <p className="upgrade-note">💡 {current.note}</p>
        </div>

        {/* Footer */}
        <div className="upgrade-modal-footer">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Quay lại</button>
          )}
          <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>Để sau</button>
        </div>
      </div>
    </>
  );
}
