import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { masterGlossaryService } from '../../services/masterGlossaryService';
import { activityService } from '../../services/activityService';
import useGlossaryStore from '../../stores/glossaryStore';
import { DOMAINS, groupByDomain, classifyDomain } from '../../constants/domains';

export function GlossaryTab() {
  const [allTerms, setAllTerms] = useState([]);
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
    data = data.map(t => ({
      ...t,
      domain: t.domain || classifyDomain(t.termEN, t.termVI),
    }));
    setAllTerms(data);
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

  const documentSources = [...new Set(allTerms.map(t => t.sourceDocumentTitle || 'Không rõ nguồn'))].sort();
  const docCounts = {};
  for (const t of allTerms) {
    const src = t.sourceDocumentTitle || 'Không rõ nguồn';
    docCounts[src] = (docCounts[src] || 0) + 1;
  }

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

  const handleDeleteWithConfirm = async (term) => {
    const ok = window.confirm(`Xoá thuật ngữ "${term.termEN}"?`);
    if (!ok) return;
    await masterGlossaryService.deleteTerm(term.id);
    setTerms(t => t.filter(x => x.id !== term.id));
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
    <div className="bento-dash-tab">
      <div className="bento-gloss-header">
        <div className="bento-gloss-header-text">
          <h2 className="bento-dash-tab-title">Bảng thuật ngữ</h2>
          <p className="bento-gloss-subtitle">
            {terms.length} thuật ngữ · {grouped.length} chuyên ngành
            {docFilter && <> · từ <strong>{docFilter.replace('.pdf', '')}</strong></>}
            {documentSources.length > 0 && !docFilter && <> · {documentSources.length} tài liệu</>}
          </p>
        </div>
        <div className="bento-gloss-header-actions">
          <button
            type="button"
            className="bento-gloss-btn"
            onClick={handleMergeFromSession}
            disabled={isMerging}
          >
            {isMerging ? 'Đang sync...' : '↑ Sync từ phiên dịch'}
          </button>
          <button
            type="button"
            className="bento-gloss-btn"
            onClick={() => masterGlossaryService.exportCSV(terms)}
          >
            ↓ Xuất CSV
          </button>
        </div>
      </div>

      <div className="bento-gloss-filters">
        <div className="bento-gloss-search-wrap">
          <input
            type="text"
            className="bento-gloss-search"
            placeholder="Tìm thuật ngữ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Tìm thuật ngữ"
          />
          {search && (
            <button
              type="button"
              className="bento-gloss-search-clear"
              onClick={() => setSearch('')}
              aria-label="Xoá tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="bento-gloss-chips">
          <button
            type="button"
            className={`bento-gloss-chip${!domainFilter ? ' active' : ''}`}
            onClick={() => setDomainFilter('')}
            aria-pressed={!domainFilter}
          >
            Tất cả
          </button>
          {DOMAINS.filter(d => d.id !== 'general' && domainCounts[d.id]).map(d => (
            <button
              key={d.id}
              type="button"
              className={`bento-gloss-chip${domainFilter === d.id ? ' active' : ''}`}
              onClick={() => setDomainFilter(domainFilter === d.id ? '' : d.id)}
              aria-pressed={domainFilter === d.id}
            >
              <span aria-hidden="true">{d.icon}</span>
              {d.label}
              <span className="bento-gloss-chip-count">{domainCounts[d.id] || 0}</span>
            </button>
          ))}
          {domainCounts['general'] > 0 && (
            <button
              type="button"
              className={`bento-gloss-chip${domainFilter === 'general' ? ' active' : ''}`}
              onClick={() => setDomainFilter(domainFilter === 'general' ? '' : 'general')}
              aria-pressed={domainFilter === 'general'}
            >
              General
              <span className="bento-gloss-chip-count">{domainCounts['general']}</span>
            </button>
          )}
        </div>

        {documentSources.length > 1 && (
          <div className="bento-gloss-doc-filter">
            <select
              value={docFilter}
              onChange={e => setDocFilter(e.target.value)}
              className="bento-gloss-doc-select"
              aria-label="Lọc theo tài liệu nguồn"
            >
              <option value="">Tất cả tài liệu ({allTerms.length})</option>
              {documentSources.map(src => (
                <option key={src} value={src}>{src.replace('.pdf', '')} ({docCounts[src]})</option>
              ))}
            </select>
            {docFilter && (
              <button
                type="button"
                className="bento-gloss-search-clear"
                onClick={() => setDocFilter('')}
                aria-label="Xoá lọc tài liệu"
                style={{ position: 'static', transform: 'none' }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bento-dash-shimmer" style={{ height: 64, marginBottom: 10, borderRadius: 16 }} />
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="bento-gloss-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p>Chưa có thuật ngữ nào.</p>
          <p className="bento-gloss-empty-sub">Dịch tài liệu để bắt đầu xây dựng bảng thuật ngữ.</p>
        </div>
      ) : (
        <div className="bento-gloss-groups">
          {grouped.map(({ domain, terms: groupTerms }) => {
            const isCollapsed = collapsedGroups[domain.id];
            return (
              <div key={domain.id} className="bento-gloss-group">
                <button
                  type="button"
                  className="bento-gloss-group-header"
                  onClick={() => toggleGroup(domain.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`bento-gloss-table-${domain.id}`}
                >
                  <div className="bento-gloss-group-left">
                    <span
                      className="bento-gloss-group-icon"
                      style={{ background: `${domain.color}18`, color: domain.color }}
                      aria-hidden="true"
                    >
                      {domain.icon}
                    </span>
                    <span className="bento-gloss-group-label">{domain.label}</span>
                  </div>
                  <span className="bento-gloss-group-count">{groupTerms.length}</span>
                  <svg
                    className="bento-gloss-group-chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {!isCollapsed && (
                  <div
                    className="bento-gloss-table"
                    id={`bento-gloss-table-${domain.id}`}
                  >
                    <div className="bento-gloss-table-head">
                      <div>English</div>
                      <div>Tiếng Việt</div>
                      <div></div>
                    </div>
                    {groupTerms.map(term => (
                      <div key={term.id} className="bento-gloss-row">
                        <div>
                          <p className="bento-gloss-term-en">{term.termEN}</p>
                          {term.sourceDocumentTitle && !docFilter && (
                            <p className="bento-gloss-term-source">
                              {term.sourceDocumentTitle.replace('.pdf', '')}
                            </p>
                          )}
                        </div>
                        <div>
                          {editingId === term.id ? (
                            <div className="bento-gloss-edit-row">
                              <input
                                type="text"
                                className="bento-gloss-edit-input"
                                value={editValue.termVI || ''}
                                onChange={e => setEditValue(v => ({ ...v, termVI: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                aria-label="Sửa nghĩa tiếng Việt"
                              />
                              <button type="button" className="bento-gloss-edit-save" onClick={handleSaveEdit}>
                                Lưu
                              </button>
                              <button
                                type="button"
                                className="bento-gloss-edit-cancel"
                                onClick={() => setEditingId(null)}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <p className="bento-gloss-term-vi">{term.termVI}</p>
                          )}
                        </div>
                        <div className="bento-gloss-actions">
                          {editingId !== term.id && (
                            <>
                              <button
                                type="button"
                                className="bento-gloss-action-btn"
                                onClick={() => { setEditingId(term.id); setEditValue({ termVI: term.termVI }); }}
                                aria-label={`Sửa "${term.termEN}"`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="bento-gloss-action-btn delete"
                                onClick={() => handleDeleteWithConfirm(term)}
                                aria-label={`Xoá "${term.termEN}"`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
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
