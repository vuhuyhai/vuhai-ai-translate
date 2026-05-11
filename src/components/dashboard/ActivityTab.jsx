import { useState, useEffect } from 'react';
import { activityService } from '../../services/activityService';
import { tabContent, tabTitle } from './styles';

const EVENT_LABELS = {
  translation_started:   { icon: '▶', label: 'Bắt đầu dịch', color: 'info' },
  translation_completed: { icon: '✓', label: 'Dịch hoàn thành', color: 'success' },
  translation_partial:   { icon: '◑', label: 'Dịch một phần', color: 'warning' },
  pdf_exported:          { icon: '↓', label: 'Xuất PDF', color: 'info' },
  docx_exported:         { icon: '↓', label: 'Xuất Word', color: 'info' },
  glossary_merged:       { icon: '⊕', label: 'Merge thuật ngữ', color: 'success' },
  document_deleted:      { icon: '✕', label: 'Xóa tài liệu', color: 'danger' },
  document_shared:       { icon: '⤴', label: 'Chia sẻ', color: 'info' },
};

export function ActivityTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityService.getRecent(100).then(e => { setEvents(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grouped = events.reduce((acc, event) => {
    const day = new Date(event.timestamp).toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});

  return (
    <div style={tabContent}>
      <h2 style={tabTitle}>Lịch sử hoạt động</h2>

      {loading ? (
        <div>{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shimmer" style={{ height: 44, borderRadius: 'var(--border-radius-sm)', marginBottom: 8 }} />
        ))}</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
          <p>Chưa có hoạt động nào được ghi lại.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, dayEvents]) => (
          <div key={day} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)', margin: '0 0 10px', textTransform: 'capitalize' }}>{day}</p>
            {dayEvents.map(event => {
              const config = EVENT_LABELS[event.eventType] || { icon: '·', label: event.eventType, color: 'secondary' };
              return (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, background: `var(--color-status-${config.color === 'success' ? 'translated' : config.color === 'danger' ? 'error' : 'translating'}-bg)`,
                    color: `var(--color-status-${config.color === 'success' ? 'translated' : config.color === 'danger' ? 'error' : 'translating'}-text)`,
                  }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{config.label}</p>
                    {event.documentTitle && <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-tertiary)' }}>{event.documentTitle}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {event.stats?.wordsTranslated > 0 && (
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {event.stats.wordsTranslated.toLocaleString('vi-VN')} từ
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      {new Date(event.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
