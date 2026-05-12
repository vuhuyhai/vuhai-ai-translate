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
    <div className="bento-lib-filters">
      <div className="bento-lib-filter-search-wrap">
        <span className="bento-lib-filter-search-icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Tìm kiếm tài liệu..."
          aria-label="Tìm kiếm tài liệu"
          className="bento-lib-filter-search"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); onChange({ ...filters, search: '' }); }}
            aria-label="Xoá tìm kiếm"
            className="bento-lib-filter-clear"
          >✕</button>
        )}
      </div>

      <select
        value={filters.topic || ''}
        onChange={e => handleChange('topic', e.target.value || null)}
        aria-label="Lọc theo chủ đề"
        className="bento-lib-filter-select"
      >
        {TOPIC_OPTIONS.map(o => (
          <option key={o.value || 'all'} value={o.value || ''}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.status || ''}
        onChange={e => handleChange('status', e.target.value || null)}
        aria-label="Lọc theo trạng thái"
        className="bento-lib-filter-select"
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value || 'all'} value={o.value || ''}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.sortBy}
        onChange={e => handleChange('sortBy', e.target.value)}
        aria-label="Sắp xếp"
        className="bento-lib-filter-select"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
