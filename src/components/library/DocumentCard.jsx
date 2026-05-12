import { useState } from 'react';

const TOPIC_LABELS = {
  marketing: 'Marketing', tech: 'Công nghệ', finance: 'Tài chính',
  health: 'Y tế', law: 'Pháp luật', education: 'Giáo dục',
  ecommerce: 'TMĐT', realestate: 'BĐS', science: 'Khoa học', general: 'Chung',
};

const STATUS_LABELS = {
  complete: 'Hoàn thành',
  partial:  'Đang dịch',
  draft:    'Nháp',
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}

export function DocumentCard({ document, onOpen, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(document.customTitle || document.title);

  const displayTitle = (document.customTitle || document.title || '').replace('.pdf', '');
  const total = document.totalSections || 1;
  const completed = document.completedSections || 0;
  const progress = Math.round((completed / total) * 100);
  const statusKey = STATUS_LABELS[document.status] ? document.status : 'draft';
  const statusLabel = STATUS_LABELS[statusKey];

  return (
    <div
      className="bento-doc-card"
      role="article"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
    >
      {/* Progress bar top */}
      <div className="bento-doc-card-progress">
        <div
          className={`bento-doc-card-progress-fill${statusKey === 'complete' ? ' complete' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bento-doc-card-body">
        {/* Badges */}
        <div className="bento-doc-card-badges">
          <span className="bento-doc-card-badge topic">
            {TOPIC_LABELS[document.topic] || document.topic}
          </span>
          <span className={`bento-doc-card-badge status-${statusKey}`}>
            {statusLabel}
          </span>
          {document.shareSettings?.isPublic && (
            <span className="bento-doc-card-badge share">
              Đã chia sẻ
            </span>
          )}
        </div>

        {/* Title */}
        {isEditing ? (
          <input
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onBlur={() => { onRename(titleInput); setIsEditing(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { onRename(titleInput); setIsEditing(false); }
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            aria-label="Đổi tên tài liệu"
            className="bento-doc-card-title-edit"
          />
        ) : (
          <h3
            className="bento-doc-card-title"
            onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}
            title={displayTitle}
          >
            {displayTitle}
          </h3>
        )}

        {/* Stats */}
        <div className="bento-doc-card-stats">
          <span className="bento-doc-card-stat">{completed}/{total} đoạn</span>
          <span className="bento-doc-card-stat">{(document.translatedWords || 0).toLocaleString()} từ</span>
          <span className="bento-doc-card-stat">{document.fileMetadata?.pages || '?'} trang</span>
        </div>

        {/* Footer */}
        <div className="bento-doc-card-footer">
          <span className="bento-doc-card-time">
            {formatRelativeTime(document.updatedAt)}
          </span>
          <div className="bento-doc-card-actions" onClick={e => e.stopPropagation()}>
            <button
              className="bento-doc-card-action"
              onClick={onOpen}
              aria-label="Mở tài liệu"
            >↗</button>
            <button
              className="bento-doc-card-action delete"
              onClick={onDelete}
              aria-label="Xoá tài liệu"
            >✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}
