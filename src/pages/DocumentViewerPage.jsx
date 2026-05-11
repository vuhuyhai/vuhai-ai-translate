import { useState, useEffect } from 'react';
import { libraryService } from '../services/libraryService';
import { runAgentPipeline } from '../services/agentPipeline';
import { getTopic, getAudience } from '../constants/config';
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
      const config = { topic: getTopic(), audience: getAudience(), mode: document.mode || 'quick' };
      const result = await runAgentPipeline(selectedSection.originalText, config, () => {});
      const newText = result.edited || result.translated || '';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!document) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Không tìm thấy tài liệu</p>
        <button onClick={onBack} className="btn btn-ghost" style={{ marginTop: 12 }}>← Quay lại</button>
      </div>
    );
  }

  const total = document.totalSections || 1;
  const completed = document.completedSections || 0;
  const progressPercent = Math.round((completed / total) * 100);
  const docTitle = (document.customTitle || document.title || '').replace('.pdf', '');

  return (
    <div className="dv-layout">
      {/* ── SIDEBAR ── */}
      <aside className="dv-sidebar">
        <div className="dv-sidebar-top">
          <button onClick={onBack} className="dv-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Thư viện
          </button>

          <div className="dv-doc-info">
            <h2 className="dv-doc-title">{docTitle}</h2>
            <div className="dv-doc-meta">
              <span className="dv-tag">{document.topic}</span>
              <span className="dv-meta-text">{document.fileMetadata?.pages || '?'} trang</span>
              <span className="dv-meta-text">{completed}/{total} đoạn</span>
            </div>
            <div className="dv-progress-bar">
              <div className="dv-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <nav className="dv-section-list custom-scrollbar">
          {document.sections?.map((section, idx) => {
            const isActive = idx === selectedIdx;
            const isDone = section.status === 'done';
            return (
              <button
                key={section.id}
                onClick={() => { setSelectedIdx(idx); setIsEditing(false); setActiveTab('translated'); }}
                className={`dv-section-item ${isActive ? 'active' : ''}`}
              >
                <span className={`dv-section-dot ${isDone ? 'done' : ''}`}>
                  {isDone && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span className="dv-section-label">
                  {section.title || `Phần ${idx + 1}`}
                </span>
                {section.lastEditedAt && <span className="dv-edited-badge">Sửa</span>}
              </button>
            );
          })}
        </nav>

        <div className="dv-sidebar-footer">
          <button onClick={() => handleExport('doc')} className="dv-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            DOC
          </button>
          <button onClick={() => handleExport('txt')} className="dv-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            TXT
          </button>
          <button onClick={() => handleExport('copy')} className="dv-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy
          </button>
          <button onClick={() => setShowShareModal(true)} className="dv-export-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Chia sẻ
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="dv-main">
        {selectedSection ? (
          <>
            <div className="dv-toolbar">
              <div className="dv-tabs">
                <button className={`dv-tab ${activeTab === 'translated' ? 'active' : ''}`} onClick={() => setActiveTab('translated')}>
                  Bản dịch
                </button>
                <button className={`dv-tab ${activeTab === 'original' ? 'active' : ''}`} onClick={() => setActiveTab('original')}>
                  Văn bản gốc
                </button>
                {selectedSection.editHistory?.length > 0 && (
                  <button className={`dv-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    Lịch sử ({selectedSection.editHistory.length})
                  </button>
                )}
              </div>

              {activeTab === 'translated' && !isEditing && (
                <div className="dv-toolbar-actions">
                  <button onClick={() => { setEditValue(selectedSection.translatedText); setIsEditing(true); }} className="btn btn-ghost">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    Sửa
                  </button>
                  <button onClick={handleRetranslate} disabled={isRetranslating} className="btn btn-ghost">
                    {isRetranslating ? (
                      <><div className="spinner" style={{ width: 12, height: 12 }} /> Đang dịch...</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Dịch lại</>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="dv-content custom-scrollbar">
              {activeTab === 'translated' && (
                isEditing ? (
                  <div className="dv-edit-wrap">
                    <textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="dv-textarea" autoFocus />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={handleSaveEdit} className="btn btn-primary">Lưu thay đổi</button>
                      <button onClick={() => setIsEditing(false)} className="btn btn-ghost">Hủy</button>
                    </div>
                  </div>
                ) : selectedSection.translatedText ? (
                  <article className="dv-article">
                    <FormattedText text={selectedSection.translatedText} />
                  </article>
                ) : (
                  <div className="dv-empty">
                    <p>Đoạn này chưa được dịch.</p>
                  </div>
                )
              )}

              {activeTab === 'original' && (
                <article className="dv-article dv-original">
                  <pre className="dv-original-text">{selectedSection.originalText}</pre>
                </article>
              )}

              {activeTab === 'history' && (
                <div className="dv-history">
                  {[...(selectedSection.editHistory || [])].reverse().map(record => (
                    <div key={record.id} className="dv-history-item">
                      <div className="dv-history-header">
                        <span className={`dv-history-badge ${record.editedBy === 'ai' ? 'ai' : 'manual'}`}>
                          {record.editedBy === 'ai' ? 'AI dịch lại' : 'Chỉnh sửa tay'}
                        </span>
                        <span className="dv-history-time">{formatRelativeTime(record.editedAt)}</span>
                      </div>
                      <p className="dv-history-text">
                        {record.newText.slice(0, 300)}{record.newText.length > 300 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="dv-empty">Chọn một đoạn văn để xem</div>
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
