import { useState, useEffect } from 'react';
import { activityService } from '../../services/activityService';

const EVENT_LABELS = {
  translation_started:   { icon: '▶', label: 'Bắt đầu dịch', severity: 'translating' },
  translation_completed: { icon: '✓', label: 'Dịch hoàn thành', severity: 'success' },
  translation_partial:   { icon: '◑', label: 'Dịch một phần', severity: 'translating' },
  pdf_exported:          { icon: '↓', label: 'Xuất PDF', severity: 'translating' },
  docx_exported:         { icon: '↓', label: 'Xuất Word', severity: 'translating' },
  glossary_merged:       { icon: '⊕', label: 'Merge thuật ngữ', severity: 'success' },
  document_deleted:      { icon: '✕', label: 'Xóa tài liệu', severity: 'error' },
  document_shared:       { icon: '⤴', label: 'Chia sẻ', severity: 'translating' },
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
    <div className="bento-dash-tab">
      <h2 className="bento-dash-tab-title">Lịch sử hoạt động</h2>

      {loading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bento-dash-shimmer" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bento-act-empty">
          <p className="bento-act-empty-icon" aria-hidden="true">📋</p>
          <p>Chưa có hoạt động nào được ghi lại.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, dayEvents]) => (
          <div key={day} className="bento-act-day-group">
            <h3 className="bento-act-day-label">{day}</h3>
            {dayEvents.map(event => {
              const config = EVENT_LABELS[event.eventType] || { icon: '·', label: event.eventType, severity: 'translating' };
              const words = event.stats?.wordsTranslated || 0;
              return (
                <div key={event.id} className="bento-act-event">
                  <div className={`bento-act-event-icon ${config.severity}`} aria-hidden="true">
                    {config.icon}
                  </div>
                  <div className="bento-act-event-body">
                    <p className="bento-act-event-label">{config.label}</p>
                    {event.documentTitle && (
                      <p className="bento-act-event-doc">{event.documentTitle}</p>
                    )}
                  </div>
                  <div className="bento-act-event-meta-wrap">
                    {words > 0 && (
                      <p className="bento-act-event-meta strong">
                        {words.toLocaleString('vi-VN')} từ
                      </p>
                    )}
                    <p className="bento-act-event-meta">
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
