import { useState } from 'react';

const TOPIC_LABELS = {
  marketing: 'Marketing', tech: 'Công nghệ', finance: 'Tài chính',
  health: 'Y tế', law: 'Pháp luật', education: 'Giáo dục',
  ecommerce: 'TMĐT', realestate: 'BĐS', science: 'Khoa học', general: 'Chung',
};

const STATUS_CONFIG = {
  complete: { label: 'Hoàn thành', color: 'var(--color-status-translated-bg)', text: 'var(--color-status-translated-text)' },
  partial:  { label: 'Đang dịch',  color: 'var(--color-status-translating-bg)', text: 'var(--color-status-translating-text)' },
  draft:    { label: 'Nháp',       color: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)' },
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
  const status = STATUS_CONFIG[document.status] || STATUS_CONFIG.draft;

  return (
    <div style={styles.card} onClick={onOpen}>
      {/* Progress bar top */}
      <div style={styles.progressTrack}>
        <div style={{
          ...styles.progressFill,
          width: `${progress}%`,
          background: progress === 100 ? 'var(--color-text-success)' : 'var(--color-text-info)',
        }} />
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ ...styles.badge, background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
            {TOPIC_LABELS[document.topic] || document.topic}
          </span>
          <span style={{ ...styles.badge, background: status.color, color: status.text }}>
            {status.label}
          </span>
          {document.shareSettings?.isPublic && (
            <span style={{ ...styles.badge, background: 'var(--color-status-translated-bg)', color: 'var(--color-text-success)' }}>
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
            style={styles.titleInput}
          />
        ) : (
          <p
            style={styles.title}
            onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}
            title="Double-click để đổi tên"
          >
            {displayTitle}
          </p>
        )}

        {/* Stats */}
        <div style={styles.statsRow}>
          <span>{completed}/{total} đoạn</span>
          <span>{(document.translatedWords || 0).toLocaleString()} từ</span>
          <span>{document.fileMetadata?.pages || '?'} trang</span>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {formatRelativeTime(document.updatedAt)}
          </span>
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button style={styles.iconBtn} onClick={onOpen} title="Mở">↗</button>
            <button
              style={{ ...styles.iconBtn, color: 'var(--color-text-danger)' }}
              onClick={onDelete}
              title="Xóa"
            >✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--color-background-primary)',
    borderRadius: 'var(--border-radius-lg)',
    border: '1px solid var(--color-border-secondary)',
    cursor: 'pointer',
    transition: 'box-shadow var(--transition-base), transform var(--transition-base)',
    overflow: 'hidden',
  },
  progressTrack: {
    height: 3, background: 'var(--color-background-secondary)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 'inherit',
    transition: 'width 0.3s',
  },
  badge: {
    padding: '2px 8px', borderRadius: 'var(--border-radius-full)',
    fontSize: 11, fontWeight: 500,
  },
  title: {
    fontSize: 14, fontWeight: 500, margin: '0 0 4px',
    color: 'var(--color-text-primary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  titleInput: {
    width: '100%', padding: '4px 8px', fontSize: 14, fontWeight: 500,
    border: '1px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-sm)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)', boxSizing: 'border-box',
    marginBottom: 4,
  },
  statsRow: {
    display: 'flex', gap: 12, fontSize: 12,
    color: 'var(--color-text-tertiary)', margin: '8px 0 12px',
  },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, color: 'var(--color-text-secondary)',
    padding: '4px 6px', borderRadius: 'var(--border-radius-sm)',
  },
};
