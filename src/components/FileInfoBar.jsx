import React from 'react';
import { formatFileSize } from '../utils/textUtils';

const PdfIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="3" fill="var(--bento-accent-glow)" stroke="var(--bento-accent)" strokeWidth="1.5" />
    <text x="12" y="14" textAnchor="middle" fill="var(--bento-accent)" fontSize="7" fontWeight="700" fontFamily="var(--bento-font-display)">PDF</text>
  </svg>
);

export const FileInfoBar = React.memo(function FileInfoBar({
  fileName, fileSize, pageCount, sectionCount,
  translatedCount, reviewedCount, hasAnyReview, onReset, onNewUrl,
}) {
  const progress = sectionCount > 0 ? Math.round((translatedCount / sectionCount) * 100) : 0;

  return (
    <div className="file-info-bar">
      <div className="fi-left">
        <div className="fi-icon-box">
          <PdfIcon />
        </div>
        <div>
          <div className="fi-title">{fileName}</div>
          <div className="fi-meta">
            <span>{pageCount} trang</span>
            <span className="fi-meta-dot">·</span>
            <span>{formatFileSize(fileSize)}</span>
            <span className="fi-meta-dot">·</span>
            <span>{sectionCount} đoạn</span>
            {progress > 0 && (
              <>
                <span className="fi-meta-dot">·</span>
                <span className="fi-meta-progress">{progress}% hoàn thành</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="fi-right">
        <span className="fi-badge is-translated">
          Đã dịch: {translatedCount}/{sectionCount}
        </span>
        {hasAnyReview && (
          <span className="fi-badge is-reviewed">
            Đã duyệt: {reviewedCount}/{sectionCount}
          </span>
        )}
        {onNewUrl && (
          <button className="toolbar-btn-ghost" onClick={onNewUrl} aria-label="Dịch URL mới">
            🔗 Dịch URL mới
          </button>
        )}
        <button className="toolbar-btn-ghost" onClick={onReset} aria-label="Upload file mới">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload file mới
        </button>
      </div>
    </div>
  );
});
