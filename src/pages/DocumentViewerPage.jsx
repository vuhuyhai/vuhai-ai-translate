import { useState, useEffect } from 'react';
import { libraryService } from '../services/libraryService';
import { runTranslationPipeline, extractTail } from '../services/agentPipeline.js';
import { getTopic, getAudience } from '../constants/config';
import useKeyStore from '../stores/keyStore';
import { buildExportText, downloadTextFile, downloadDocFile, copyToClipboard } from '../utils/textUtils';
import { FormattedText } from '../components/FormattedText';
import { ShareModal } from '../components/library/ShareModal';

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}

export function DocumentViewerPage({ documentId, onBack }) {
  const [document, setDocument] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('translated');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    libraryService.getDocument(documentId).then(doc => {
      setDocument(doc);
      setIsLoading(false);
    });
  }, [documentId]);

  const selectedSection = document?.sections?.[selectedIdx] || null;

  const handleSaveEdit = async () => {
    if (!selectedSection) return;
    await libraryService.saveManualEdit(documentId, selectedSection.id, editValue, selectedSection.translatedText);
    setDocument(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === selectedSection.id ? { ...s, translatedText: editValue, lastEditedAt: Date.now() } : s
      ),
    }));
    setIsEditing(false);
  };

  const handleRetranslate = async () => {
    if (!selectedSection) return;
    setIsRetranslating(true);
    try {
      // M1.6: Build previousContext from previous section (fix continuity bug from audit E1)
      let previousContext = null;
      if (selectedIdx > 0) {
        const prevSection = document.sections[selectedIdx - 1];
        if (prevSection?.translatedText) {
          previousContext = { translatedTail: extractTail(prevSection.translatedText) };
        }
      }
      const keyTier = useKeyStore.getState().keyTier;
      const config = { topic: getTopic(), audience: getAudience(), mode: document.mode || 'quick', keyTier };
      const result = await runTranslationPipeline(selectedSection.originalText, config, () => {}, { previousContext });
      const newText = result.translated || '';
      await libraryService.saveManualEdit(documentId, selectedSection.id, newText, selectedSection.translatedText);
      setDocument(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === selectedSection.id ? { ...s, translatedText: newText } : s
        ),
      }));
    } finally {
      setIsRetranslating(false);
    }
  };

  const handleExport = (format) => {
    if (!document) return;
    const sectionStates = {};
    document.sections.forEach(s => {
      sectionStates[s.id] = { translated: s.translatedText, status: 'translated' };
    });
    const fakeSections = document.sections.map(s => ({ id: s.id, title: s.title }));
    const baseName = (document.customTitle || document.title || 'document').replace('.pdf', '');
    if (format === 'txt') {
      const text = buildExportText(fakeSections, sectionStates, 'translated');
      downloadTextFile(text, `${baseName}.txt`);
    } else if (format === 'doc') {
      downloadDocFile(fakeSections, sectionStates, 'translated', `${baseName}.doc`);
    } else if (format === 'copy') {
      const text = buildExportText(fakeSections, sectionStates, 'translated');
      copyToClipboard(text);
    }
  };

  if (isLoading) {
    return (
      <div className="bento-viewer-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="bento-viewer-error">
        <h2 className="bento-viewer-error-message">Không tìm thấy tài liệu</h2>
        <button onClick={onBack} className="bento-viewer-btn ghost">← Quay lại</button>
      </div>
    );
  }

  const total = document.totalSections || 1;
  const completed = document.completedSections || 0;
  const progressPercent = Math.round((completed / total) * 100);
  const docTitle = (document.customTitle || document.title || '').replace('.pdf', '');

  const isDocComplete = document.status === 'complete';

  return (
    <div className="bento-viewer-layout">
      {/* ── SIDEBAR ── */}
      <aside className="bento-viewer-sidebar">
        <div className="bento-viewer-sidebar-top">
          <button onClick={onBack} className="bento-viewer-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Thư viện
          </button>

          <div className="bento-viewer-doc-info">
            <h2 className="bento-viewer-doc-title">{docTitle}</h2>
            <div className="bento-viewer-doc-meta">
              <span className="bento-viewer-tag">{document.topic}</span>
              <span className="bento-viewer-meta-text">{document.fileMetadata?.pages || '?'} trang</span>
              <span className="bento-viewer-meta-text">{completed}/{total} đoạn</span>
            </div>
            <div className="bento-viewer-progress">
              <div
                className={`bento-viewer-progress-fill${isDocComplete ? ' complete' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="bento-viewer-section-list">
          {document.sections?.map((section, idx) => {
            const isActive = idx === selectedIdx;
            const isDone = section.status === 'done';
            return (
              <button
                key={section.id}
                onClick={() => { setSelectedIdx(idx); setIsEditing(false); setActiveTab('translated'); }}
                className={`bento-viewer-section-item${isActive ? ' active' : ''}`}
              >
                <span className={`bento-viewer-section-dot${isDone ? ' done' : ''}`}>
                  {isDone && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span className="bento-viewer-section-label">
                  {section.title || `Phần ${idx + 1}`}
                </span>
                {section.lastEditedAt && <span className="bento-viewer-edited-badge">Sửa</span>}
              </button>
            );
          })}
        </nav>

        <div className="bento-viewer-sidebar-footer">
          <button onClick={() => handleExport('doc')} className="bento-viewer-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            DOC
          </button>
          <button onClick={() => handleExport('txt')} className="bento-viewer-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            TXT
          </button>
          <button onClick={() => handleExport('copy')} className="bento-viewer-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy
          </button>
          <button onClick={() => setShowShareModal(true)} className="bento-viewer-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Chia sẻ
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="bento-viewer-main">
        {selectedSection ? (
          <>
            <div className="bento-viewer-toolbar">
              <div className="bento-viewer-tabs">
                <button className={`bento-viewer-tab${activeTab === 'translated' ? ' active' : ''}`} onClick={() => setActiveTab('translated')}>
                  Bản dịch
                </button>
                <button className={`bento-viewer-tab${activeTab === 'original' ? ' active' : ''}`} onClick={() => setActiveTab('original')}>
                  Văn bản gốc
                </button>
                {selectedSection.editHistory?.length > 0 && (
                  <button className={`bento-viewer-tab${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>
                    Lịch sử ({selectedSection.editHistory.length})
                  </button>
                )}
              </div>

              {activeTab === 'translated' && !isEditing && (
                <div className="bento-viewer-toolbar-actions">
                  <button onClick={() => { setEditValue(selectedSection.translatedText); setIsEditing(true); }} className="bento-viewer-btn ghost">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    Sửa
                  </button>
                  <button onClick={handleRetranslate} disabled={isRetranslating} className="bento-viewer-btn ghost">
                    {isRetranslating ? (
                      <><span className="bento-viewer-btn-spinner" aria-hidden="true" /> Đang dịch...</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Dịch lại</>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="bento-viewer-content">
              {activeTab === 'translated' && (
                isEditing ? (
                  <div className="bento-viewer-edit-wrap">
                    <textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="bento-viewer-textarea" autoFocus />
                    <div className="bento-viewer-edit-actions">
                      <button onClick={() => setIsEditing(false)} className="bento-viewer-btn ghost">Hủy</button>
                      <button onClick={handleSaveEdit} className="bento-viewer-btn primary">Lưu thay đổi</button>
                    </div>
                  </div>
                ) : selectedSection.translatedText ? (
                  <article className="bento-viewer-article">
                    <FormattedText text={selectedSection.translatedText} />
                  </article>
                ) : (
                  <div className="bento-viewer-empty">
                    <p>Đoạn này chưa được dịch.</p>
                  </div>
                )
              )}

              {activeTab === 'original' && (
                <article className="bento-viewer-article original">
                  <pre className="bento-viewer-original-text">{selectedSection.originalText}</pre>
                </article>
              )}

              {activeTab === 'history' && (
                <div className="bento-viewer-history">
                  {[...(selectedSection.editHistory || [])].reverse().map(record => (
                    <div key={record.id} className="bento-viewer-history-item">
                      <div className="bento-viewer-history-header">
                        <span className={`bento-viewer-history-badge ${record.editedBy === 'ai' ? 'ai' : 'manual'}`}>
                          {record.editedBy === 'ai' ? 'AI dịch lại' : 'Chỉnh sửa tay'}
                        </span>
                        <span className="bento-viewer-history-time">{formatRelativeTime(record.editedAt)}</span>
                      </div>
                      <p className="bento-viewer-history-text">
                        {record.newText.slice(0, 300)}{record.newText.length > 300 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bento-viewer-empty">Chọn một đoạn văn để xem</div>
        )}
      </main>

      {showShareModal && (
        <ShareModal
          document={document}
          onClose={() => setShowShareModal(false)}
          onShareCreated={(shareInfo) => {
            setDocument(prev => ({ ...prev, shareSettings: { ...prev.shareSettings, ...shareInfo } }));
          }}
        />
      )}
    </div>
  );
}
