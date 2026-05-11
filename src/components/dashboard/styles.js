export const tabContent = { padding: '24px clamp(16px, 3vw, 48px)' };
export const tabTitle = { fontSize: 20, fontWeight: 500, margin: '0 0 20px', color: 'var(--color-text-primary)' };
export const sectionTitle = { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 10px' };
export const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 };
export const statCard = { padding: '14px 16px', background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)' };
export const statLabel = { fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' };
export const statValue = { fontSize: 24, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)' };
export const statSub = { fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 };
export const filterRow = { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' };
export const searchInput = { flex: 1, padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', minWidth: 160, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' };
export const filterSelect = { padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' };
export const countLabel = { fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 10px' };

export const tableHeader = { display: 'flex', gap: 8, padding: '8px 12px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '0.5px solid var(--color-border-secondary)' };
export const tableRow = { display: 'flex', gap: 8, padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)', alignItems: 'center', borderBottom: '0.5px solid var(--color-border-tertiary)', transition: 'background 0.1s' };
export const emptyRow = { padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 };

export const topicBadge = { padding: '2px 8px', borderRadius: 'var(--border-radius-full)', fontSize: 11, background: 'var(--color-background-info)', color: 'var(--color-text-info)' };
export const statusBadge = (status) => ({ padding: '2px 8px', borderRadius: 'var(--border-radius-full)', fontSize: 11, background: status === 'complete' ? 'var(--color-status-translated-bg)' : status === 'partial' ? 'var(--color-status-translating-bg)' : 'var(--color-background-secondary)', color: status === 'complete' ? 'var(--color-status-translated-text)' : status === 'partial' ? 'var(--color-status-translating-text)' : 'var(--color-text-tertiary)' });

export const actionSmallBtn = { padding: '4px 10px', fontSize: 12, border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-sm)', background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' };

export const quotaBarOuter = { height: 6, background: 'var(--color-background-secondary)', borderRadius: 3 };
export const quotaBarInner = { height: '100%', borderRadius: 3, transition: 'width 0.3s' };

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}
