import { useState, useEffect, useRef } from 'react';

const TOPIC_OPTIONS = [
  { value: null, label: 'Tất cả chủ đề' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'tech', label: 'Công nghệ' },
  { value: 'finance', label: 'Tài chính' },
  { value: 'health', label: 'Y tế' },
  { value: 'education', label: 'Giáo dục' },
  { value: 'ecommerce', label: 'TMĐT' },
  { value: 'general', label: 'Chung' },
];

const STATUS_OPTIONS = [
  { value: null, label: 'Tất cả trạng thái' },
  { value: 'complete', label: 'Hoàn thành' },
  { value: 'partial', label: 'Đang dịch' },
  { value: 'draft', label: 'Nháp' },
];

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Mới cập nhật' },
  { value: 'createdAt', label: 'Mới tạo' },
];

export function LibraryFilters({ filters, onChange }) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, filters, onChange]);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Tìm kiếm tài liệu..."
          style={styles.searchInput}
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); onChange({ ...filters, search: '' }); }}
            style={styles.clearBtn}
          >✕</button>
        )}
      </div>

      <select
        value={filters.topic || ''}
        onChange={e => handleChange('topic', e.target.value || null)}
        style={styles.select}
      >
        {TOPIC_OPTIONS.map(o => (
          <option key={o.value || 'all'} value={o.value || ''}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.status || ''}
        onChange={e => handleChange('status', e.target.value || null)}
        style={styles.select}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value || 'all'} value={o.value || ''}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.sortBy}
        onChange={e => handleChange('sortBy', e.target.value)}
        style={styles.select}
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
  },
  searchWrap: {
    position: 'relative', flex: '1 1 200px', minWidth: 200,
  },
  searchIcon: {
    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
    fontSize: 13, pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', padding: '8px 32px 8px 32px', fontSize: 13,
    border: '1px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)', boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: 'var(--color-text-tertiary)',
  },
  select: {
    padding: '8px 12px', fontSize: 13,
    border: '1px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)', cursor: 'pointer',
  },
};
