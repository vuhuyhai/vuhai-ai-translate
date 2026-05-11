import { useState, useEffect } from 'react';
import useKeyStore from '../stores/keyStore';
import { KEY_TIERS } from '../services/keyDetector';
import { estimateCost } from '../utils/costEstimator';

export function UpgradeFromQuotaModal({
  isOpen,
  onClose,
  pendingSections,
  completedSections,
  projectName,
  onResumeWithNewKey,
  translationMode,
}) {
  const [step, setStep] = useState(1);
  const [newKey, setNewKey] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [, setDetectedTier] = useState(null);
  const [detectError, setDetectError] = useState('');
  const { setGeminiKey } = useKeyStore();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNewKey('');
      setDetectedTier(null);
      setDetectError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cost = estimateCost(pendingSections, translationMode || 'quick');
  const totalSections = completedSections + pendingSections;
  const progressPercent = totalSections > 0
    ? Math.round((completedSections / totalSections) * 100)
    : 0;

  const handleDetectKey = async () => {
    if (!newKey.startsWith('AIza') || newKey.length < 30) {
      setDetectError('Key kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng. Gemini key b\u1eaft \u0111\u1ea7u b\u1eb1ng "AIza..."');
      return;
    }
    setIsDetecting(true);
    setDetectError('');
    try {
      await setGeminiKey(newKey);
      const { keyTier } = useKeyStore.getState();
      setDetectedTier(keyTier);
      if (keyTier === KEY_TIERS.PAID) {
        setStep(5);
      } else if (keyTier === KEY_TIERS.FREE) {
        setDetectError('\u0110\u00e2y v\u1eabn l\u00e0 Free key. B\u1ea1n c\u1ea7n key t\u1eeb Google Cloud v\u1edbi Billing \u0111\u00e3 b\u1eadt.');
      } else if (keyTier === KEY_TIERS.INVALID) {
        setDetectError('Key kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 b\u1ecb x\u00f3a. Vui l\u00f2ng t\u1ea1o key m\u1edbi.');
      } else {
        setDetectError('Kh\u00f4ng th\u1ec3 x\u00e1c \u0111\u1ecbnh lo\u1ea1i key. Th\u1eed l\u1ea1i.');
      }
    } catch {
      setDetectError('Kh\u00f4ng th\u1ec3 x\u00e1c minh key. Ki\u1ec3m tra k\u1ebft n\u1ed1i m\u1ea1ng.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleResume = () => {
    onResumeWithNewKey();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>N\u00e2ng c\u1ea5p \u0111\u1ec3 ti\u1ebfp t\u1ee5c d\u1ecbch</h2>
            {projectName && (
              <p style={styles.subtitle}>
                \u0110ang d\u1ecbch: <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{projectName}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} style={styles.closeBtn}>{'\u2715'}</button>
        </div>

        {/* Progress bar */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
        </div>
        <div style={styles.progressLabel}>
          <span style={{ color: 'var(--color-text-success)' }}>
            {'\u2713'} {completedSections} \u0111o\u1ea1n \u0111\u00e3 d\u1ecbch
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {pendingSections} \u0111o\u1ea1n c\u00f2n l\u1ea1i
          </span>
        </div>

        {/* Step indicator */}
        <div style={styles.stepRow}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                ...styles.stepDot,
                background: n < step ? 'var(--color-text-success)'
                  : n === step ? 'var(--color-text-info)'
                    : 'var(--color-background-secondary)',
                color: n <= step ? '#fff' : 'var(--color-text-tertiary)',
                border: n > step ? '0.5px solid var(--color-border-secondary)' : 'none',
              }}>
                {n < step ? '\u2713' : n}
              </div>
              {n < 4 && <div style={{
                width: 32, height: 1,
                background: n < step ? 'var(--color-text-success)' : 'var(--color-border-tertiary)',
              }} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={styles.content}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div style={styles.infoBox}>
                <p style={styles.infoTitle}>{'\u0054\u1ea1i sao b\u1ecb d\u1eebng?'}</p>
                <p style={styles.infoBody}>
                  {'B\u1ea1n \u0111\u00e3 d\u1ecbch \u0111\u01b0\u1ee3c '}{completedSections}{' \u0111o\u1ea1n \u2014 th\u1eadt t\u1ed1t! '}
                  {'Gemini mi\u1ec5n ph\u00ed gi\u1edbi h\u1ea1n 250 request/ng\u00e0y \u0111\u1ec3 ki\u1ec3m so\u00e1t chi ph\u00ed. '}
                  {'C\u00f2n '}{pendingSections}{' \u0111o\u1ea1n n\u1eefa l\u00e0 xong ho\u00e0n to\u00e0n.'}
                </p>
              </div>

              <div style={styles.costBox}>
                <p style={styles.costTitle}>Chi ph\u00ed \u0111\u1ec3 d\u1ecbch {pendingSections} \u0111o\u1ea1n c\u00f2n l\u1ea1i</p>
                <div style={styles.costRow}>
                  <span style={styles.costLabel}>\u01af\u1edbc t\u00ednh tokens</span>
                  <span style={styles.costValue}>~{(cost.inputTokens / 1000).toFixed(0)}K tokens</span>
                </div>
                <div style={styles.costRow}>
                  <span style={styles.costLabel}>Chi ph\u00ed</span>
                  <span style={{ ...styles.costValue, color: 'var(--color-text-success)', fontWeight: 500 }}>
                    ~${cost.totalUSD.toFixed(4)} USD (~{cost.totalVND.toLocaleString('vi-VN')}\u0111)
                  </span>
                </div>
                <div style={styles.costRow}>
                  <span style={styles.costLabel}>Google t\u1eb7ng m\u1edbi</span>
                  <span style={{ ...styles.costValue, color: 'var(--color-text-success)' }}>
                    $300 credit {'\u2014'} \u0111\u1ee7 d\u00f9ng c\u1ea3 n\u0103m
                  </span>
                </div>
              </div>

              <button style={styles.primaryBtn} onClick={() => setStep(2)}>
                B\u1eaft \u0111\u1ea7u n\u00e2ng c\u1ea5p {'\u2192'}
              </button>
              <button style={styles.secondaryBtn} onClick={onClose}>
                Ch\u1edd reset l\u00fac 14:00 h\u00f4m nay
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <p style={styles.stepTitle}>B\u01b0\u1edbc 1 {'\u2014'} M\u1edf Google Cloud Console v\u00e0 b\u1eadt Billing</p>
              <p style={styles.stepDesc}>
                Billing l\u00e0 \u0111i\u1ec1u ki\u1ec7n \u0111\u1ec3 c\u00f3 Paid key. Google <strong>kh\u00f4ng t\u00ednh ti\u1ec1n</strong> cho
                \u0111\u1ebfn khi b\u1ea1n th\u1ef1c s\u1ef1 d\u00f9ng v\u01b0\u1ee3t $300 credit mi\u1ec5n ph\u00ed.
              </p>

              <div style={styles.instructionList}>
                {[
                  '\u0110\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n Google (\u01b0u ti\u00ean c\u00f9ng t\u00e0i kho\u1ea3n AI Studio)',
                  'V\u00e0o Billing \u2192 ch\u1ecdn "Create billing account"',
                  'Nh\u1eadp th\u00f4ng tin th\u1ebb (ch\u1ec9 \u0111\u1ec3 x\u00e1c minh, KH\u00d4NG b\u1ecb tr\u1eeb ti\u1ec1n)',
                  'Google t\u1ef1 \u0111\u1ed9ng c\u1ea5p $300 credit cho t\u00e0i kho\u1ea3n m\u1edbi',
                ].map((s, i) => (
                  <div key={i} style={styles.instructionItem}>
                    <div style={styles.instructionNum}>{i + 1}</div>
                    <p style={styles.instructionText}>{s}</p>
                  </div>
                ))}
              </div>

              <a
                href="https://console.cloud.google.com/billing"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.linkBtn}
                onClick={() => setTimeout(() => setStep(3), 1500)}
              >
                M\u1edf Google Cloud Billing {'\u2192'}
              </a>
              <button style={styles.secondaryBtn} onClick={() => setStep(3)}>
                \u0110\u00e3 c\u00f3 Billing r\u1ed3i, ti\u1ebfp t\u1ee5c
              </button>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <p style={styles.stepTitle}>B\u01b0\u1edbc 2 {'\u2014'} T\u1ea1o API Key m\u1edbi</p>
              <p style={styles.stepDesc}>
                T\u1ea1o key m\u1edbi t\u1eeb Google Cloud (kh\u00e1c v\u1edbi AI Studio) \u0111\u1ec3 c\u00f3 gi\u1edbi h\u1ea1n cao h\u01a1n.
              </p>

              <div style={styles.instructionList}>
                {[
                  'V\u00e0o "APIs & Services" \u2192 "Credentials"',
                  'Click "Create Credentials" \u2192 ch\u1ecdn "API Key"',
                  'Copy key v\u1eeba t\u1ea1o (b\u1eaft \u0111\u1ea7u b\u1eb1ng AIza...)',
                  'T\u00f9y ch\u1ecdn: Restrict key ch\u1ec9 cho Generative Language API',
                ].map((s, i) => (
                  <div key={i} style={styles.instructionItem}>
                    <div style={styles.instructionNum}>{i + 1}</div>
                    <p style={styles.instructionText}>{s}</p>
                  </div>
                ))}
              </div>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.linkBtn}
                onClick={() => setTimeout(() => setStep(4), 1500)}
              >
                M\u1edf Credentials {'\u2192'}
              </a>
              <button style={styles.secondaryBtn} onClick={() => setStep(4)}>
                \u0110\u00e3 c\u00f3 key, ti\u1ebfp t\u1ee5c
              </button>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <p style={styles.stepTitle}>B\u01b0\u1edbc 3 {'\u2014'} D\u00e1n key m\u1edbi v\u00e0o \u0111\u00e2y</p>
              <p style={styles.stepDesc}>
                App s\u1ebd t\u1ef1 x\u00e1c minh \u0111\u00e2y l\u00e0 Paid key v\u00e0 ti\u1ebfp t\u1ee5c d\u1ecbch ngay.
              </p>

              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input
                  type="password"
                  value={newKey}
                  onChange={e => { setNewKey(e.target.value); setDetectError(''); }}
                  placeholder="AIza..."
                  autoFocus
                  style={styles.keyInput}
                />
              </div>

              {detectError && (
                <p style={{ fontSize: 12, color: 'var(--color-text-danger)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  {'\u26a0'} {detectError}
                </p>
              )}

              <button
                onClick={handleDetectKey}
                disabled={isDetecting || newKey.length < 20}
                style={{
                  ...styles.primaryBtn,
                  opacity: (isDetecting || newKey.length < 20) ? 0.5 : 1,
                }}
              >
                {isDetecting ? '\u0110ang x\u00e1c minh...' : 'X\u00e1c minh key \u2192'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '10px 0 0', textAlign: 'center' }}>
                Key \u0111\u01b0\u1ee3c l\u01b0u trong tr\u00ecnh duy\u1ec7t {'\u2014'} kh\u00f4ng g\u1eedi l\u00ean b\u1ea5t k\u1ef3 server n\u00e0o
              </p>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{'\u2b50'}</div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
                  {'\u0054uy\u1ec7t v\u1eddi \u2014 b\u1ea1n \u0111\u00e3 m\u1edf kh\u00f3a kh\u00f4ng gi\u1edbi h\u1ea1n'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
                  {'S\u1eb5n s\u00e0ng ti\u1ebfp t\u1ee5c '}{pendingSections}{' \u0111o\u1ea1n c\u00f2n l\u1ea1i c\u1ee7a '}
                  <strong>{projectName}</strong>{'. '}
                  {'V\u1edbi Paid key, b\u1ea1n c\u00f3 th\u1ec3 d\u1ecbch bao nhi\u00eau t\u00e0i li\u1ec7u t\u00f9y th\u00edch.'}
                </p>
              </div>

              <div style={styles.costBox}>
                <div style={styles.costRow}>
                  <span style={styles.costLabel}>Gi\u1edbi h\u1ea1n m\u1edbi</span>
                  <span style={{ ...styles.costValue, color: 'var(--color-text-success)' }}>
                    150 request/ph\u00fat {'\u00b7'} Kh\u00f4ng gi\u1edbi h\u1ea1n ng\u00e0y
                  </span>
                </div>
                <div style={styles.costRow}>
                  <span style={styles.costLabel}>Chi ph\u00ed \u01b0\u1edbc t\u00ednh</span>
                  <span style={styles.costValue}>
                    ~${cost.totalUSD.toFixed(4)} cho {pendingSections} \u0111o\u1ea1n c\u00f2n l\u1ea1i
                  </span>
                </div>
              </div>

              <button style={styles.primaryBtn} onClick={handleResume}>
                Ti\u1ebfp t\u1ee5c d\u1ecbch ngay {'\u2192'}
              </button>
            </div>
          )}

        </div>

        {/* Footer nav */}
        {step > 1 && step < 5 && (
          <div style={styles.footer}>
            <button onClick={() => setStep(s => s - 1)} style={styles.backBtn}>
              {'\u2190'} Quay l\u1ea1i
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modal: {
    background: 'var(--color-background-primary)',
    borderRadius: 'var(--border-radius-xl)',
    width: '100%', maxWidth: 460,
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 24px 12px',
  },
  title: { fontSize: 17, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)' },
  subtitle: { fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 18, color: 'var(--color-text-secondary)', flexShrink: 0,
  },
  progressBar: {
    height: 4, background: 'var(--color-background-secondary)',
    margin: '0 24px',
  },
  progressFill: {
    height: '100%', background: 'var(--color-text-success)',
    borderRadius: 2, transition: 'width 0.3s',
  },
  progressLabel: {
    display: 'flex', justifyContent: 'space-between',
    padding: '4px 24px 12px', fontSize: 12,
  },
  stepRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 24px 16px', gap: 0,
  },
  stepDot: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 500,
  },
  content: { padding: '0 24px 20px' },
  infoBox: {
    background: 'var(--color-background-warning)',
    border: '0.5px solid var(--color-border-warning)',
    borderRadius: 'var(--border-radius-md)',
    padding: '10px 12px', marginBottom: 12,
  },
  infoTitle: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-warning)', margin: '0 0 4px' },
  infoBody: { fontSize: 12, color: 'var(--color-text-warning)', margin: 0, lineHeight: 1.6 },
  costBox: {
    background: 'var(--color-background-secondary)',
    borderRadius: 'var(--border-radius-md)',
    padding: '10px 12px', marginBottom: 14,
  },
  costTitle: {
    fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px',
  },
  costRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  costLabel: { fontSize: 12, color: 'var(--color-text-secondary)' },
  costValue: { fontSize: 12, color: 'var(--color-text-primary)' },
  stepTitle: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' },
  stepDesc: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 14px' },
  instructionList: { marginBottom: 14 },
  instructionItem: { display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  instructionNum: {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    background: 'var(--color-background-info)', color: 'var(--color-text-info)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 500,
  },
  instructionText: { fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6, paddingTop: 2 },
  primaryBtn: {
    display: 'block', width: '100%', padding: '11px 16px',
    background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
    border: 'none', borderRadius: 'var(--border-radius-md)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8,
    textAlign: 'center', textDecoration: 'none',
  },
  secondaryBtn: {
    display: 'block', width: '100%', padding: '9px 16px', textAlign: 'center',
    background: 'none', border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)', fontSize: 13, cursor: 'pointer',
    color: 'var(--color-text-secondary)',
  },
  linkBtn: {
    display: 'block', width: '100%', padding: '11px 16px',
    background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
    border: 'none', borderRadius: 'var(--border-radius-md)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8,
    textAlign: 'center', textDecoration: 'none',
  },
  keyInput: {
    width: '100%', padding: '10px 12px', fontSize: 14,
    border: '1px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)', boxSizing: 'border-box',
  },
  footer: {
    display: 'flex', padding: '12px 24px 16px',
    borderTop: '0.5px solid var(--color-border-tertiary)',
  },
  backBtn: {
    padding: '7px 14px', background: 'none', fontSize: 13,
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)',
    color: 'var(--color-text-secondary)', cursor: 'pointer',
  },
};
