import React from 'react';
import { formatFileSize } from '../utils/textUtils';

const PdfIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="3" fill="var(--color-primary-light)" stroke="var(--color-primary)" strokeWidth="1.5" />
    <text x="12" y="14" textAnchor="middle" fill="var(--color-primary)" fontSize="7" fontWeight="700" fontFamily="var(--font-sans)">PDF</text>
  </svg>
);

export const FileInfoBar = React.memo(function FileInfoBar({
  fileName, fileSize, pageCount, sectionCount,
  translatedCount, reviewedCount, hasAnyReview, onReset, onNewUrl,
}) {
  const progress = sectionCount > 0 ? Math.round((translatedCount / sectionCount) * 100) : 0;

  return (
    <div className="card file-info-bar" style={{
      padding: '16px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PdfIcon />
        </div>
        <div>
          <div style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{fileName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
            <span>{pageCount} trang</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{formatFileSize(fileSize)}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{sectionCount} đoạn</span>
            {progress > 0 && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{progress}% hoàn thành</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: 'var(--status-translated-bg)', color: 'var(--status-translated-text)' }}>
          Đã dịch: {translatedCount}/{sectionCount}
        </span>
        {hasAnyReview && (
          <span className="badge" style={{ background: 'var(--status-reviewed-bg)', color: 'var(--status-reviewed-text)' }}>
            Đã duyệt: {reviewedCount}/{sectionCount}
          </span>
        )}
        {onNewUrl && (
          <button className="btn btn-ghost" onClick={onNewUrl} aria-label="Dịch URL mới">
            🔗 Dịch URL mới
          </button>
        )}
        <button className="btn btn-ghost" onClick={onReset} aria-label="Upload file mới">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload file mới
        </button>
      </div>
    </div>
  );
});
