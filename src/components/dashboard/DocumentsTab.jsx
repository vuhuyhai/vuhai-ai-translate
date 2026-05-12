import { useState, useEffect } from 'react';
import { libraryService } from '../../services/libraryService';
import { formatRelativeTime } from './styles';

const TOPIC_LABELS = {
  '': 'Tất cả chủ đề', marketing: 'Marketing', technology: 'Công nghệ', tech: 'Công nghệ',
  finance: 'Tài chính', medical: 'Y tế', health: 'Y tế', legal: 'Pháp luật',
  education: 'Giáo dục', ecommerce: 'TMĐT', realestate: 'BĐS', science: 'Khoa học', general: 'Chung',
};

const STATUS_LABELS = {
  complete: 'Hoàn thành',
  partial: 'Đang dịch',
  draft: 'Nháp',
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
    <div className="bento-dash-tab">
      <h2 className="bento-dash-tab-title">Tài liệu đã dịch</h2>

      <div className="bento-dash-filters">
        <input
          type="text"
          className="bento-dash-filter-search"
          placeholder="Tìm theo tên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Tìm kiếm tài liệu"
        />
        <select
          className="bento-dash-filter-select"
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          aria-label="Lọc theo chủ đề"
        >
          {Object.entries(TOPIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          className="bento-dash-filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label="Sắp xếp"
        >
          <option value="updatedAt">Mới nhất</option>
          <option value="createdAt">Cũ nhất</option>
        </select>
      </div>

      <p className="bento-dash-count-label">{documents.length} tài liệu</p>

      {loading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bento-dash-shimmer" style={{ height: 48, marginBottom: 6, borderRadius: 10 }} />
          ))}
        </div>
      ) : (
        <div className="bento-dash-table">
          <div className="bento-dash-table-head">
            <span style={{ flex: 3 }}>Tên tài liệu</span>
            <span style={{ flex: 1 }}>Chủ đề</span>
            <span style={{ flex: 1 }}>Trạng thái</span>
            <span style={{ flex: 1 }}>Đoạn</span>
            <span style={{ flex: 1 }}>Cập nhật</span>
            <span style={{ width: 110 }}>Thao tác</span>
          </div>
          {documents.length === 0 ? (
            <div className="bento-dash-table-empty">Không tìm thấy tài liệu nào</div>
          ) : documents.map(doc => (
            <div key={doc.id} className="bento-dash-table-row">
              <div style={{ flex: 3, minWidth: 0 }}>
                <p className="bento-dash-doc-title">
                  {(doc.customTitle || doc.title || '').replace('.pdf', '')}
                </p>
              </div>
              <span style={{ flex: 1 }}>
                <span className="bento-dash-doc-badge topic">{TOPIC_LABELS[doc.topic] || doc.topic}</span>
              </span>
              <span style={{ flex: 1 }}>
                <span className={`bento-dash-doc-badge status-${doc.status || 'draft'}`}>
                  {STATUS_LABELS[doc.status] || 'Nháp'}
                </span>
              </span>
              <span className="bento-dash-doc-meta" style={{ flex: 1 }}>
                {doc.completedSections}/{doc.totalSections}
              </span>
              <span className="bento-dash-doc-meta" style={{ flex: 1 }}>
                {formatRelativeTime(doc.updatedAt)}
              </span>
              <div className="bento-dash-doc-actions" style={{ width: 110 }}>
                <button
                  type="button"
                  className="bento-dash-doc-action-btn"
                  onClick={() => onOpenDocument(doc.id)}
                >
                  Mở
                </button>
                <button
                  type="button"
                  className="bento-dash-doc-action-btn delete"
                  onClick={() => handleDelete(doc.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
