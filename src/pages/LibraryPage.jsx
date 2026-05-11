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
      <div style={styles.emptyState}>
        <p style={{ fontSize: 48, margin: '0 0 8px' }}>📚</p>
        <p style={styles.emptyTitle}>Chưa có tài liệu nào</p>
        <p style={styles.emptyDesc}>Dịch một tài liệu để bắt đầu xây dựng thư viện.</p>
        <button onClick={onNewTranslation} style={styles.primaryBtn}>
          Dịch tài liệu đầu tiên →
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.pageTitle}>
          Thư viện tài liệu
          <span style={styles.countBadge}>{documents.length} tài liệu</span>
        </h1>
        <button onClick={onNewTranslation} style={styles.primaryBtn}>
          + Dịch tài liệu mới
        </button>
      </div>

      {/* Filters */}
      <LibraryFilters filters={filters} onChange={setFilters} />

      {/* Grid */}
      <div style={styles.grid}>
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
          <div key={`skeleton-${i}`} style={styles.skeleton} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && !isLoading && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => loadDocuments(false)} style={styles.secondaryBtn}>
            Tải thêm
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageTitle: {
    fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)',
  },
  countBadge: {
    fontSize: 13, fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16, marginTop: 16,
  },
  skeleton: {
    height: 180, borderRadius: 'var(--border-radius-lg)',
    background: 'var(--color-background-secondary)',
    animation: 'shimmer 1.5s infinite',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px',
  },
  emptyDesc: {
    fontSize: 14, color: 'var(--color-text-tertiary)', margin: '0 0 20px',
  },
  primaryBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 500,
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--border-radius-md)',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '9px 20px', fontSize: 13,
    background: 'none', color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
  },
};
