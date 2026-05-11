import { useState, useEffect } from 'react';
import { libraryService } from '../../services/libraryService';
import { tabContent, tabTitle, filterRow, searchInput, filterSelect, countLabel, tableHeader, tableRow, emptyRow, topicBadge, statusBadge, actionSmallBtn, formatRelativeTime } from './styles';

const TOPIC_LABELS = {
  '': 'Tất cả chủ đề', marketing: 'Marketing', technology: 'Công nghệ', tech: 'Công nghệ',
  finance: 'Tài chính', medical: 'Y tế', health: 'Y tế', legal: 'Pháp luật',
  education: 'Giáo dục', ecommerce: 'TMĐT', realestate: 'BĐS', science: 'Khoa học', general: 'Chung',
};

export function DocumentsTab({ onOpenDocument }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');

  useEffect(() => {
    setLoading(true);
    libraryService.getMyDocuments({
      pageSize: 50, searchTitle: search || null,
      topic: topicFilter || null, sortBy,
    }).then(r => { setDocuments(r.documents); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, topicFilter, sortBy]);

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa tài liệu này?')) return;
    await libraryService.deleteDocument(id);
    setDocuments(d => d.filter(x => x.id !== id));
  };

  return (
    <div style={tabContent}>
      <h2 style={tabTitle}>Tài liệu đã dịch</h2>

      <div style={filterRow}>
        <input type="text" placeholder="Tìm theo tên..." value={search} onChange={e => setSearch(e.target.value)} style={searchInput} />
        <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} style={filterSelect}>
          {Object.entries(TOPIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={filterSelect}>
          <option value="updatedAt">Mới nhất</option>
          <option value="createdAt">Cũ nhất</option>
        </select>
      </div>

      <p style={countLabel}>{documents.length} tài liệu</p>

      {loading ? (
        <div>{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shimmer" style={{ height: 44, borderRadius: 'var(--border-radius-sm)', marginBottom: 6 }} />
        ))}</div>
      ) : (
        <div>
          <div style={tableHeader}>
            <span style={{ flex: 3 }}>Tên tài liệu</span>
            <span style={{ flex: 1 }}>Chủ đề</span>
            <span style={{ flex: 1 }}>Trạng thái</span>
            <span style={{ flex: 1 }}>Đoạn</span>
            <span style={{ flex: 1 }}>Cập nhật</span>
            <span style={{ width: 100 }}>Thao tác</span>
          </div>
          {documents.length === 0 ? (
            <div style={emptyRow}>Không tìm thấy tài liệu nào</div>
          ) : documents.map(doc => (
            <div key={doc.id} style={tableRow}>
              <span style={{ flex: 3, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(doc.customTitle || doc.title || '').replace('.pdf', '')}
              </span>
              <span style={{ flex: 1 }}><span style={topicBadge}>{TOPIC_LABELS[doc.topic] || doc.topic}</span></span>
              <span style={{ flex: 1 }}><span style={statusBadge(doc.status)}>
                {doc.status === 'complete' ? 'Hoàn thành' : doc.status === 'partial' ? 'Đang dịch' : 'Nháp'}
              </span></span>
              <span style={{ flex: 1, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {doc.completedSections}/{doc.totalSections}
              </span>
              <span style={{ flex: 1, color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                {formatRelativeTime(doc.updatedAt)}
              </span>
              <div style={{ width: 100, display: 'flex', gap: 6 }}>
                <button onClick={() => onOpenDocument(doc.id)} style={actionSmallBtn}>Mở</button>
                <button onClick={() => handleDelete(doc.id)} style={{ ...actionSmallBtn, color: 'var(--color-text-danger)' }}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
