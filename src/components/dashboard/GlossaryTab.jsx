import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { masterGlossaryService } from '../../services/masterGlossaryService';
import { activityService } from '../../services/activityService';
import useGlossaryStore from '../../stores/glossaryStore';
import { DOMAINS, getDomainById, groupByDomain, classifyDomain } from '../../constants/domains';
import { tabContent } from './styles';

export function GlossaryTab() {
  const [allTerms, setAllTerms] = useState([]); // unfiltered
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('');
  const [docFilter, setDocFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState({});
  const [isMerging, setIsMerging] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const loadTerms = async () => {
    setLoading(true);
    let data = await masterGlossaryService.getAll({});
    // Auto-classify domain for terms that don't have one
    data = data.map(t => ({
      ...t,
      domain: t.domain || classifyDomain(t.termEN, t.termVI),
    }));
    setAllTerms(data);
    // Apply filters
    let filtered = data;
    if (domainFilter) filtered = filtered.filter(t => t.domain === domainFilter);
    if (docFilter) filtered = filtered.filter(t => (t.sourceDocumentTitle || 'Không rõ nguồn') === docFilter);
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(t => t.termEN?.toLowerCase().includes(lower) || t.termVI?.toLowerCase().includes(lower));
    }
    setTerms(filtered);
    setLoading(false);
    return filtered;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTerms(); }, [domainFilter, docFilter, search]);

  // Build unique document sources list from all terms
  const documentSources = [...new Set(allTerms.map(t => t.sourceDocumentTitle || 'Không rõ nguồn'))].sort();
  const docCounts = {};
  for (const t of allTerms) {
    const src = t.sourceDocumentTitle || 'Không rõ nguồn';
    docCounts[src] = (docCounts[src] || 0) + 1;
  }

  // Auto-sync local → Firestore on first open
  const [autoSynced, setAutoSynced] = useState(false);
  useEffect(() => {
    if (autoSynced || loading || isMerging) return;
    const localCount = useGlossaryStore.getState().entries.length;
    if (terms.length === 0 && localCount > 0) {
      setAutoSynced(true);
      handleMergeFromSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, terms.length, autoSynced]);

  const handleSaveEdit = async () => {
    await masterGlossaryService.updateTerm(editingId, editValue);
    setTerms(t => t.map(x => x.id === editingId ? { ...x, ...editValue } : x));
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await masterGlossaryService.deleteTerm(id);
    setTerms(t => t.filter(x => x.id !== id));
  };

  const handleMergeFromSession = async () => {
    const localEntries = useGlossaryStore.getState().entries;
    if (localEntries.length === 0) {
      toast.info('Phiên dịch hiện tại chưa có thuật ngữ nào');
      return;
    }
    setIsMerging(true);
    try {
      const result = await masterGlossaryService.mergeFromDocument(localEntries, null, 'Phiên dịch hiện tại');
      toast.success(`Đã thêm ${result.added} thuật ngữ · Bỏ qua ${result.skipped} trùng`);
      if (result.added > 0) {
        await activityService.log('glossary_merged', { wordsTranslated: result.added });
      }
      await loadTerms();
    } catch (err) {
      toast.error('Không thể merge thuật ngữ: ' + (err.message || 'Lỗi không xác định'));
    }
    setIsMerging(false);
  };

  const toggleGroup = (domainId) => {
    setCollapsedGroups(prev => ({ ...prev, [domainId]: !prev[domainId] }));
  };

  const grouped = groupByDomain(terms);
  const domainCounts = {};
  for (const g of grouped) {
    domainCounts[g.domain.id] = g.terms.length;
  }

  return (
    <div style={tabContent}>
      {/* Header */}
      <div className="gt-header">
        <div>
          <h2 className="gt-title">Bảng thuật ngữ</h2>
          <p className="gt-subtitle">
            {terms.length} thuật ngữ · {grouped.length} chuyên ngành
            {docFilter && <> · từ <strong>{docFilter.replace('.pdf', '')}</strong></>}
            {documentSources.length > 0 && !docFilter && <> · {documentSources.length} tài liệu</>}
          </p>
        </div>
        <div className="gt-actions">
          <button onClick={handleMergeFromSession} disabled={isMerging} className="btn btn-ghost">
            {isMerging ? 'Đang sync...' : '↑ Sync từ phiên dịch'}
          </button>
          <button onClick={() => masterGlossaryService.exportCSV(terms)} className="btn btn-ghost">
            ↓ Xuất CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="gt-filters">
        <div className="gt-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Tìm thuật ngữ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gt-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="gt-search-clear">×</button>
          )}
        </div>
        <div className="gt-domain-chips">
          <button
            className={`gt-chip ${!domainFilter ? 'active' : ''}`}
            onClick={() => setDomainFilter('')}
          >
            Tất cả
          </button>
          {DOMAINS.filter(d => d.id !== 'general' && domainCounts[d.id]).map(d => (
            <button
              key={d.id}
              className={`gt-chip ${domainFilter === d.id ? 'active' : ''}`}
              onClick={() => setDomainFilter(domainFilter === d.id ? '' : d.id)}
              style={domainFilter === d.id ? { '--chip-color': d.color } : {}}
            >
              {d.icon} {d.label}
              <span className="gt-chip-count">{domainCounts[d.id] || 0}</span>
            </button>
          ))}
          {domainCounts['general'] > 0 && (
            <button
              className={`gt-chip ${domainFilter === 'general' ? 'active' : ''}`}
              onClick={() => setDomainFilter(domainFilter === 'general' ? '' : 'general')}
            >
              General
              <span className="gt-chip-count">{domainCounts['general']}</span>
            </button>
          )}
        </div>

        {/* Document source filter */}
        {documentSources.length > 1 && (
          <div className="gt-doc-filter">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
            <select
              value={docFilter}
              onChange={e => setDocFilter(e.target.value)}
              className="gt-doc-select"
            >
              <option value="">Tất cả tài liệu ({allTerms.length})</option>
              {documentSources.map(src => (
                <option key={src} value={src}>{src.replace('.pdf', '')} ({docCounts[src]})</option>
              ))}
            </select>
            {docFilter && (
              <button onClick={() => setDocFilter('')} className="gt-search-clear" style={{ position: 'static' }}>×</button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="gt-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 40, borderRadius: 'var(--radius-sm)', marginBottom: 6 }} />
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="gt-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <p>Chưa có thuật ngữ nào.</p>
          <p className="gt-empty-sub">Dịch tài liệu để bắt đầu xây dựng bảng thuật ngữ.</p>
        </div>
      ) : (
        <div className="gt-groups">
          {grouped.map(({ domain, terms: groupTerms }) => {
            const isCollapsed = collapsedGroups[domain.id];
            return (
              <div key={domain.id} className="gt-group">
                <button className="gt-group-header" onClick={() => toggleGroup(domain.id)}>
                  <div className="gt-group-left">
                    <span className="gt-group-icon" style={{ background: domain.color + '18', color: domain.color }}>
                      {domain.icon}
                    </span>
                    <span className="gt-group-label">{domain.label}</span>
                    <span className="gt-group-count">{groupTerms.length}</span>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {!isCollapsed && (
                  <div className="gt-table">
                    <div className="gt-table-head">
                      <div className="gt-col-en">English</div>
                      <div className="gt-col-vi">Tiếng Việt</div>
                      <div className="gt-col-actions"></div>
                    </div>
                    {groupTerms.map(term => (
                      <div key={term.id} className="gt-row">
                        <div className="gt-col-en">
                          <span className="gt-term-en">{term.termEN}</span>
                          {term.sourceDocumentTitle && !docFilter && (
                            <span className="gt-term-source">{term.sourceDocumentTitle.replace('.pdf', '')}</span>
                          )}
                        </div>
                        <div className="gt-col-vi">
                          {editingId === term.id ? (
                            <div className="gt-edit-row">
                              <input
                                value={editValue.termVI || ''}
                                onChange={e => setEditValue(v => ({ ...v, termVI: e.target.value }))}
                                autoFocus
                                className="gt-edit-input"
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              />
                              <button onClick={handleSaveEdit} className="gt-btn-save">Lưu</button>
                              <button onClick={() => setEditingId(null)} className="gt-btn-cancel">Hủy</button>
                            </div>
                          ) : (
                            <span className="gt-term-vi">{term.termVI}</span>
                          )}
                        </div>
                        <div className="gt-col-actions">
                          {editingId !== term.id && (
                            <>
                              <button
                                onClick={() => { setEditingId(term.id); setEditValue({ termVI: term.termVI }); }}
                                className="gt-action-btn" title="Sửa"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                              </button>
                              <button
                                onClick={() => handleDelete(term.id)}
                                className="gt-action-btn gt-action-delete" title="Xóa"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
