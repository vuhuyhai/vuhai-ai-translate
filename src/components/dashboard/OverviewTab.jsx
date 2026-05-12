import { useState, useEffect } from 'react';
import { libraryService } from '../../services/libraryService';
import { activityService } from '../../services/activityService';
import { masterGlossaryService } from '../../services/masterGlossaryService';
import useKeyStore from '../../stores/keyStore';
import { KEY_TIERS } from '../../services/keyDetector';
import { formatRelativeTime } from './styles';

const TIER_LABELS = {
  [KEY_TIERS.PAID]: { label: 'Paid Key', className: 'paid' },
  [KEY_TIERS.FREE]: { label: 'Free Key', className: 'free' },
  [KEY_TIERS.UNKNOWN]: { label: 'Chưa xác định', className: 'unknown' },
  [KEY_TIERS.INVALID]: { label: 'Key không hợp lệ', className: 'unknown' },
};

export function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { quotaUsedToday, quotaLimit, keyTier, rpmLimit, ensureDateFresh } = useKeyStore();

  useEffect(() => { ensureDateFresh(); }, [ensureDateFresh]);

  useEffect(() => {
    Promise.all([
      libraryService.getMyDocuments({ pageSize: 100 }),
      activityService.getStats(),
      masterGlossaryService.getAll(),
    ]).then(([docs, actStats, glossary]) => {
      const completed = docs.documents.filter(d => d.status === 'complete');
      const docsWords = docs.documents.reduce((s, d) => s + (d.translatedWords || 0), 0);
      setStats({
        totalDocuments: docs.documents.length,
        completedDocuments: completed.length,
        totalWords: actStats?.totalWords || docsWords,
        masterGlossarySize: glossary.length,
      });
      setRecentDocs(docs.documents.slice(0, 5));
      setActivityStats(actStats);
      setLoading(false);
    }).catch(err => {
      console.error('[Dashboard] Failed to load stats:', err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bento-dash-tab">
        <div className="bento-dash-stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bento-dash-shimmer" style={{ height: 92 }} />
          ))}
        </div>
        <div className="bento-dash-shimmer" style={{ height: 180, borderRadius: 20 }} />
        <div className="bento-dash-shimmer" style={{ height: 180, borderRadius: 20 }} />
      </div>
    );
  }

  const isPaid = keyTier === KEY_TIERS.PAID;
  const tierInfo = TIER_LABELS[keyTier] || TIER_LABELS[KEY_TIERS.UNKNOWN];
  const quotaPercent = quotaLimit > 0 ? Math.round((quotaUsedToday / quotaLimit) * 100) : 0;
  const quotaSeverity = quotaPercent >= 95 ? 'danger' : quotaPercent >= 80 ? 'warn' : '';

  const statCards = [
    { label: 'Tài liệu đã dịch', value: stats?.totalDocuments || 0, sub: `${stats?.completedDocuments || 0} hoàn thành` },
    { label: 'Tổng từ đã dịch', value: (stats?.totalWords || 0).toLocaleString('vi-VN'), sub: 'từ tiếng Việt' },
    { label: 'Bảng thuật ngữ', value: stats?.masterGlossarySize || 0, sub: 'thuật ngữ tổng hợp' },
    { label: 'Streak', value: `${activityStats?.streak || 0} ngày`, sub: 'liên tiếp có dịch' },
  ];

  return (
    <div className="bento-dash-tab">
      <h2 className="bento-dash-tab-title">Tổng quan</h2>

      <div className="bento-dash-stat-grid">
        {statCards.map((card, i) => (
          <div key={i} className="bento-dash-stat-card">
            <p className="bento-dash-stat-label">{card.label}</p>
            <p className="bento-dash-stat-value">{card.value}</p>
            <p className="bento-dash-stat-sub">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bento-dash-info-card">
        <div className="bento-dash-info-header">
          <h3 className="bento-dash-info-card-title">Gemini API Key</h3>
          <span className={`bento-dash-tier-badge ${tierInfo.className}`}>
            {tierInfo.label}
          </span>
        </div>

        <div className="bento-dash-info-grid">
          <div className="bento-dash-info-cell">
            <p className="bento-dash-info-label">Rate Limit</p>
            <p className="bento-dash-info-value">{rpmLimit > 0 ? `${rpmLimit} RPM` : '—'}</p>
          </div>
          <div className="bento-dash-info-cell">
            <p className="bento-dash-info-label">Daily Limit</p>
            <p className="bento-dash-info-value">{isPaid ? 'Không giới hạn' : `${quotaLimit} req`}</p>
          </div>
          <div className="bento-dash-info-cell">
            <p className="bento-dash-info-label">Billing</p>
            <p className="bento-dash-info-value">{isPaid ? 'Trả phí' : 'Miễn phí'}</p>
          </div>
        </div>

        {!isPaid ? (
          <div className="bento-dash-quota-wrap">
            <div className="bento-dash-quota-meta">
              <span>{quotaUsedToday} / {quotaLimit} requests</span>
              <span>{quotaPercent}%</span>
            </div>
            <div className="bento-dash-quota-bar">
              <div
                className={`bento-dash-quota-fill${quotaSeverity ? ` ${quotaSeverity}` : ''}`}
                style={{ width: `${Math.min(quotaPercent, 100)}%` }}
              />
            </div>
            <p className="bento-dash-quota-meta" style={{ justifyContent: 'flex-start' }}>
              Còn ~{Math.max(0, quotaLimit - quotaUsedToday)} request · Reset lúc 14:00 (giờ Hà Nội)
            </p>
          </div>
        ) : (
          <p className="bento-dash-paid-msg">
            Đã dùng hôm nay: <strong>{quotaUsedToday} request</strong> · Paid key không giới hạn quota hàng ngày
          </p>
        )}
      </div>

      <div className="bento-dash-info-card bento-dash-chart-wrap">
        <h3 className="bento-dash-info-card-title">Hoạt động 7 ngày gần nhất</h3>
        <ActivityMiniChart activityByDay={activityStats?.activityByDay || {}} />
      </div>

      {recentDocs.length > 0 && (
        <div>
          <h3 className="bento-dash-section-title">Tài liệu gần đây</h3>
          <div className="bento-dash-recent-list">
            {recentDocs.map(doc => (
              <div key={doc.id} className="bento-dash-recent-item">
                <div className="bento-dash-recent-text">
                  <p className="bento-dash-recent-title">
                    {(doc.customTitle || doc.title || '').replace('.pdf', '')}
                  </p>
                  <p className="bento-dash-recent-meta" style={{ flexShrink: 1 }}>
                    {doc.completedSections}/{doc.totalSections} đoạn · {doc.topic}
                  </p>
                </div>
                <span className="bento-dash-recent-meta">{formatRelativeTime(doc.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityMiniChart({ activityByDay }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const maxWords = Math.max(...days.map(d => activityByDay[d] || 0), 1);

  return (
    <div className="bento-dash-chart">
      {days.map((day, i) => {
        const words = activityByDay[day] || 0;
        const heightPct = words / maxWords;
        const isToday = i === 6;
        const isEmpty = words === 0;
        const barHeight = Math.max(heightPct * 60, words > 0 ? 6 : 3);
        const label = new Date(day).toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '');
        const barClass = isToday
          ? 'bento-dash-chart-bar today'
          : isEmpty
            ? 'bento-dash-chart-bar empty'
            : 'bento-dash-chart-bar';
        return (
          <div key={day} className="bento-dash-chart-bar-wrap">
            <p className="bento-dash-chart-count">
              {words > 0 ? words.toLocaleString() : ''}
            </p>
            <div className={barClass} style={{ height: `${barHeight}px` }} />
            <p className="bento-dash-chart-label">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
