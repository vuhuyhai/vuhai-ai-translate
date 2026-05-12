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
    <div
      className="bento-share-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bento-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bento-share-modal-title"
      >
        <div className="bento-share-modal-header">
          <h2 id="bento-share-modal-title" className="bento-share-modal-title">
            Chia sẻ bản dịch
          </h2>
          <button
            type="button"
            className="bento-share-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="bento-share-modal-body">
          <p className="bento-share-modal-doc-preview">
            📄 {(document.customTitle || document.title || '').replace('.pdf', '')}
          </p>

          {!shareUrl ? (
            <>
              <div className="bento-share-modal-option-row">
                <div className="bento-share-modal-option-text">
                  <p className="bento-share-modal-option-title">Cho phép người xem dịch lại</p>
                  <p className="bento-share-modal-option-desc">
                    Người xem có thể trigger dịch lại những đoạn chưa hài lòng (dùng quota của họ)
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="bento-share-modal-checkbox"
                  checked={allowRetranslate}
                  onChange={e => setAllowRetranslate(e.target.checked)}
                  aria-label="Cho phép người xem dịch lại"
                />
              </div>

              <div className="bento-share-modal-info-note">
                Link chia sẻ công khai — bất kỳ ai có link đều xem được. Không cần đăng nhập.
              </div>

              <button
                type="button"
                className="bento-share-modal-primary-btn"
                onClick={handleCreateLink}
                disabled={isCreating}
              >
                {isCreating ? 'Đang tạo link...' : '🔗 Tạo link chia sẻ'}
              </button>
            </>
          ) : (
            <>
              <div className="bento-share-modal-url-box">
                <p className="bento-share-modal-url-text">{shareUrl}</p>
                <button
                  type="button"
                  className={`bento-share-modal-copy-btn${copied ? ' copied' : ''}`}
                  onClick={handleCopy}
                  aria-label={copied ? 'Đã copy link' : 'Copy link'}
                >
                  {copied ? '✓ Đã copy' : 'Copy'}
                </button>
              </div>

              <div className="bento-share-modal-stats">
                Đã xem: {document.shareSettings?.viewCount || 0} lần
              </div>

              <button
                type="button"
                className="bento-share-modal-danger-btn"
                onClick={handleRevoke}
                disabled={isCreating}
              >
                Thu hồi link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
