import { useState } from 'react';
import { libraryService } from '../../services/libraryService';

export function ShareModal({ document, onClose, onShareCreated }) {
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState(document.shareSettings?.shareUrl || null);
  const [allowRetranslate, setAllowRetranslate] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const result = await libraryService.createShareLink(document.id, {
        allowRetranslate,
        expiresAt: null,
      });
      setShareUrl(result.shareUrl);
      onShareCreated?.(result);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Thu hồi link? Những ai đang có link sẽ không truy cập được nữa.')) return;
    await libraryService.revokeShareLink(document.id, document.shareSettings.shareId);
    setShareUrl(null);
    onShareCreated?.({ isPublic: false, shareId: null, shareUrl: null });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Chia sẻ bản dịch</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <p style={styles.docPreview}>
            📄 {(document.customTitle || document.title || '').replace('.pdf', '')}
          </p>

          {!shareUrl ? (
            <>
              <div style={styles.optionRow}>
                <div>
                  <p style={styles.optionTitle}>Cho phép người xem dịch lại</p>
                  <p style={styles.optionDesc}>
                    Người xem có thể trigger dịch lại những đoạn chưa hài lòng (dùng quota của họ)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowRetranslate}
                  onChange={e => setAllowRetranslate(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <div style={styles.infoNote}>
                Link chia sẻ công khai — bất kỳ ai có link đều xem được. Không cần đăng nhập.
              </div>

              <button onClick={handleCreateLink} disabled={isCreating} style={styles.primaryBtn}>
                {isCreating ? 'Đang tạo link...' : '🔗 Tạo link chia sẻ'}
              </button>
            </>
          ) : (
            <>
              <div style={styles.urlBox}>
                <p style={styles.urlText}>{shareUrl}</p>
                <button onClick={handleCopy} style={styles.copyBtn}>
                  {copied ? '✓ Đã copy' : 'Copy'}
                </button>
              </div>

              <div style={styles.shareStats}>
                <span>Đã xem: {document.shareSettings?.viewCount || 0} lần</span>
              </div>

              <button onClick={handleRevoke} style={styles.dangerBtn}>
                Thu hồi link
              </button>
            </>
          )}
        </div>
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
    width: '100%', maxWidth: 420, overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px 12px',
  },
  title: { fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 18, color: 'var(--color-text-secondary)',
  },
  body: { padding: '0 20px 20px' },
  docPreview: {
    fontSize: 13, color: 'var(--color-text-secondary)',
    margin: '0 0 14px', padding: '8px 12px',
    background: 'var(--color-background-secondary)',
    borderRadius: 'var(--border-radius-md)',
  },
  optionRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 12, marginBottom: 12,
  },
  optionTitle: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 2px' },
  optionDesc: { fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.5 },
  infoNote: {
    fontSize: 12, color: 'var(--color-text-tertiary)',
    padding: '8px 12px', marginBottom: 14, lineHeight: 1.5,
    background: 'var(--color-background-secondary)',
    borderRadius: 'var(--border-radius-md)',
  },
  primaryBtn: {
    display: 'block', width: '100%', padding: '10px 16px',
    background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
    border: 'none', borderRadius: 'var(--border-radius-md)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  urlBox: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
    padding: '8px 12px', background: 'var(--color-background-secondary)',
    borderRadius: 'var(--border-radius-md)',
  },
  urlText: {
    flex: 1, fontSize: 12, color: 'var(--color-text-primary)',
    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  copyBtn: {
    padding: '4px 10px', fontSize: 12, fontWeight: 500,
    background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
    border: 'none', borderRadius: 'var(--border-radius-sm)',
    cursor: 'pointer', flexShrink: 0,
  },
  shareStats: {
    fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12,
  },
  dangerBtn: {
    display: 'block', width: '100%', padding: '9px 16px',
    background: 'none', color: 'var(--color-text-danger)',
    border: '1px solid var(--color-text-danger)',
    borderRadius: 'var(--border-radius-md)',
    fontSize: 13, cursor: 'pointer',
  },
};
