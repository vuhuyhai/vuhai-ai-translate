import { useState, useEffect, useCallback } from 'react';
import { libraryService } from '../services/libraryService';
import { DocumentCard } from '../components/library/DocumentCard';
import { LibraryFilters } from '../components/library/LibraryFilters';

export function LibraryPage({ onOpenDocument, onNewTranslation }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    topic: null,
    status: null,
    sortBy: 'updatedAt',
  });

  const loadDocuments = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const result = await libraryService.getMyDocuments({
        pageSize: 12,
        lastDoc: reset ? null : lastDoc,
        sortBy: filters.sortBy,
        topic: filters.topic,
        status: filters.status,
        searchTitle: filters.search,
      });
      setDocuments(prev => reset ? result.documents : [...prev, ...result.documents]);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lastDoc]);

  useEffect(() => {
    loadDocuments(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.topic, filters.status, filters.sortBy]);

  const handleDelete = async (docId) => {
    if (!window.confirm('Xóa tài liệu này? Không thể hoàn tác.')) return;
    await libraryService.deleteDocument(docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleRename = async (docId, newTitle) => {
    await libraryService.renameDocument(docId, newTitle);
    setDocuments(prev => prev.map(d =>
      d.id === docId ? { ...d, customTitle: newTitle } : d
    ));
  };

  if (!isLoading && documents.length === 0) {
    return (
      <div className="bento-library-empty">
        <div className="bento-library-empty-icon">📚</div>
        <h2 className="bento-library-empty-title">Chưa có tài liệu nào</h2>
        <p className="bento-library-empty-desc">Dịch một tài liệu để bắt đầu xây dựng thư viện.</p>
        <button onClick={onNewTranslation} className="bento-library-empty-cta">
          Dịch tài liệu đầu tiên →
        </button>
      </div>
    );
  }

  return (
    <div className="bento-library-page">
      {/* Header */}
      <div className="bento-library-header">
        <h1 className="bento-library-title">
          Thư viện tài liệu
          <span className="bento-library-count">{documents.length} tài liệu</span>
        </h1>
        <button onClick={onNewTranslation} className="bento-library-new-btn">
          + Dịch tài liệu mới
        </button>
      </div>

      {/* Filters */}
      <LibraryFilters filters={filters} onChange={setFilters} />

      {/* Grid */}
      <div className="bento-library-grid">
        {documents.map(doc => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onOpen={() => onOpenDocument(doc.id)}
            onDelete={() => handleDelete(doc.id)}
            onRename={(title) => handleRename(doc.id, title)}
          />
        ))}

        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="bento-library-skeleton" />
        ))}
      </div>

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="bento-library-load-more-wrap">
          <button onClick={() => loadDocuments(false)} className="bento-library-load-more-btn">
            Tải thêm
          </button>
        </div>
      )}
    </div>
  );
}
