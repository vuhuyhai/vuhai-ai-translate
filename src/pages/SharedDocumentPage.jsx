import { useState, useEffect } from 'react';
import { libraryService } from '../services/libraryService';

export function SharedDocumentPage({ shareId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    libraryService.getSharedDocument(shareId).then(result => {
      if (!result) { setStatus('notfound'); return; }
      if (result.expired) { setStatus('expired'); return; }
      setData(result);
      setSelectedSection(result.sections?.[0] || null);
      setStatus('found');
    }).catch(() => setStatus('notfound'));
  }, [shareId]);

  if (status === 'loading') {
    return (
      <div style={styles.center}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={styles.center}>
        <p style={{ fontSize: 48 }}>⏰</p>
        <p style={styles.msgTitle}>Link đã hết hạn</p>
        <p style={styles.msgDesc}>Link chia sẻ này không còn hiệu lực.</p>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div style={styles.center}>
        <p style={{ fontSize: 48 }}>🔍</p>
        <p style={styles.msgTitle}>Không tìm thấy tài liệu</p>
        <p style={styles.msgDesc}>Link không hợp lệ hoặc đã bị xóa.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Watermark banner */}
      <div style={styles.watermark}>
        <span>Bản dịch này được tạo bởi VuHai AI Translate</span>
        <a href="https://aitranslate.space" style={styles.tryLink}>Dịch tài liệu của bạn — Miễn phí →</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100vh - 44px)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={{ padding: '16px 16px 12px' }}>
            <p style={styles.docTitle}>
              {(data.customTitle || data.title || '').replace('.pdf', '')}
            </p>
            <p style={styles.docMeta}>
              {data.completedSections || 0} đoạn · {data.fileMetadata?.pages || '?'} trang
            </p>
            {data.viewCount > 0 && (
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                👁 {data.viewCount} lượt xem
              </p>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {data.sections?.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section)}
                style={{
                  ...styles.sectionItem,
                  background: selectedSection?.id === section.id ? 'var(--color-background-info)' : 'none',
                  color: selectedSection?.id === section.id ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                }}
              >
                {section.title || `Đoạn ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>

        {/* Content — read only */}
        <div style={styles.content}>
          {selectedSection ? (
            <>
              <div style={styles.tabBar}>
                <span style={styles.activeTab}>Bản dịch</span>
              </div>
              <div style={styles.contentArea}>
                <div style={styles.translatedText}>
                  {selectedSection.translatedText || (
                    <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                      Đoạn này chưa được dịch.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ ...styles.center, height: '100%' }}>
              Chọn một đoạn văn để xem
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
    color: 'var(--color-text-tertiary)',
  },
  msgTitle: { fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' },
  msgDesc: { fontSize: 14, color: 'var(--color-text-tertiary)', margin: 0 },
  watermark: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 24px', fontSize: 13,
    background: 'var(--color-primary)', color: '#fff',
  },
  tryLink: {
    color: '#fff', fontWeight: 500, textDecoration: 'underline',
    fontSize: 13,
  },
  sidebar: {
    background: 'var(--color-background-primary)',
    borderRight: '1px solid var(--color-border-secondary)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  docTitle: {
    fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)',
    margin: '0 0 4px', lineHeight: 1.3,
  },
  docMeta: { fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 4px' },
  sectionItem: {
    display: 'block', width: '100%', padding: '8px 16px',
    border: 'none', cursor: 'pointer', fontSize: 13,
    textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    transition: 'background 0.15s',
  },
  content: {
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    background: 'var(--color-bg-app)',
  },
  tabBar: {
    padding: '10px 24px', borderBottom: '1px solid var(--color-border-secondary)',
    background: 'var(--color-background-primary)',
  },
  activeTab: {
    padding: '6px 14px', fontSize: 13, fontWeight: 500,
    background: 'var(--color-background-info)', color: 'var(--color-text-info)',
    borderRadius: 'var(--border-radius-md)',
  },
  contentArea: {
    flex: 1, overflowY: 'auto', padding: '20px 24px',
  },
  translatedText: {
    fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-primary)',
    whiteSpace: 'pre-wrap',
  },
};
