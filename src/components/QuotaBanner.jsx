import React, { useState } from 'react';
import { UpgradeFromQuotaModal } from './UpgradeFromQuotaModal';

export const QuotaBanner = React.memo(function QuotaBanner({
  percent, remaining, tier, onUpgradeClick,
  pendingSections, completedSections, projectName,
  onResumeTranslation, translationMode,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [showQuotaUpgrade, setShowQuotaUpgrade] = useState(false);

  if (tier === 'paid' || tier === 'unknown') return null;

  // Level 3: Exhausted (95%+) — cannot dismiss
  if (percent >= 95) {
    return (
      <>
        <div className="quota-banner quota-critical">
          <div className="quota-banner-content">
            <span className="quota-banner-icon">🚫</span>
            <div>
              <div className="quota-banner-title">Đã dùng hết quota hôm nay</div>
              <div className="quota-banner-desc">
                Quota free tier reset lúc <strong>14:00 hàng ngày</strong> (giờ VN).
                Những đoạn chưa dịch đã được lưu — bạn có thể tiếp tục ngày mai.
              </div>
            </div>
          </div>
          <div className="quota-banner-actions">
            <button className="quota-banner-btn" onClick={() => setShowQuotaUpgrade(true)}>
              Nâng cấp Paid Key — dịch ngay
            </button>
          </div>
        </div>
        <UpgradeFromQuotaModal
          isOpen={showQuotaUpgrade}
          onClose={() => setShowQuotaUpgrade(false)}
          pendingSections={pendingSections || 0}
          completedSections={completedSections || 0}
          projectName={projectName || ''}
          translationMode={translationMode}
          onResumeWithNewKey={() => {
            setShowQuotaUpgrade(false);
            onResumeTranslation?.();
          }}
        />
      </>
    );
  }

  // Level 2: Warning (80-94%) — dismissable
  if (percent >= 80 && !dismissed) {
    return (
      <div className="quota-banner quota-warning">
        <span className="quota-banner-icon">⚡</span>
        <div className="quota-banner-text">
          Đã dùng <strong>{percent}% quota</strong> hôm nay
          {remaining > 0 && <> — còn khoảng <strong>{remaining} đoạn</strong></>}.
          <button className="quota-inline-link" onClick={onUpgradeClick}>
            Nâng cấp để không bị gián đoạn
          </button>
        </div>
        <button className="quota-dismiss" onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  return null;
});
