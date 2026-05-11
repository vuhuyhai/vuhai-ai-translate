import { useState, useEffect } from 'react';
import { libraryService } from '../../services/libraryService';
import { activityService } from '../../services/activityService';
import { masterGlossaryService } from '../../services/masterGlossaryService';
import useKeyStore from '../../stores/keyStore';
import { KEY_TIERS } from '../../services/keyDetector';
import { tabContent, tabTitle, statGrid, statCard, statLabel, statValue, statSub, sectionTitle, quotaBarOuter, quotaBarInner, formatRelativeTime } from './styles';

const TIER_LABELS = {
  [KEY_TIERS.PAID]: { label: 'Paid Key', color: 'var(--color-success)' },
  [KEY_TIERS.FREE]: { label: 'Free Key', color: 'var(--color-warning)' },
  [KEY_TIERS.UNKNOWN]: { label: 'Chưa xác định', color: 'var(--color-text-muted)' },
  [KEY_TIERS.INVALID]: { label: 'Key không hợp lệ', color: 'var(--color-danger)' },
};

export function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { quotaUsedToday, quotaLimit, keyTier, rpmLimit, ensureDateFresh } = useKeyStore();

  // Reset quota if date changed
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

  if (loading) return (
    <div style={tabContent}>
      <div style={statGrid}>{Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 80, borderRadius: 'var(--border-radius-md)' }} />
      ))}</div>
      <div className="shimmer" style={{ height: 60, borderRadius: 'var(--border-radius-md)', marginBottom: 16 }} />
      <div className="shimmer" style={{ height: 100, borderRadius: 'var(--border-radius-md)' }} />
    </div>
  );

  const isPaid = keyTier === KEY_TIERS.PAID;
  const tierInfo = TIER_LABELS[keyTier] || TIER_LABELS[KEY_TIERS.UNKNOWN];
  const quotaPercent = quotaLimit > 0 ? Math.round((quotaUsedToday / quotaLimit) * 100) : 0;

  return (
    <div style={tabContent}>
      <h2 style={tabTitle}>Tổng quan</h2>

      <div style={statGrid}>
        {[
          { label: 'Tài liệu đã dịch', value: stats?.totalDocuments || 0, sub: `${stats?.completedDocuments || 0} hoàn thành` },
          { label: 'Tổng từ đã dịch', value: (stats?.totalWords || 0).toLocaleString('vi-VN'), sub: 'từ tiếng Việt' },
          { label: 'Bảng thuật ngữ', value: stats?.masterGlossarySize || 0, sub: 'thuật ngữ tổng hợp' },
          { label: 'Streak', value: `${activityStats?.streak || 0} ngày`, sub: 'liên tiếp có dịch' },
        ].map((card, i) => (
          <div key={i} style={statCard}>
            <p style={statLabel}>{card.label}</p>
            <p style={statValue}>{card.value}</p>
            <p style={statSub}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* API Key Status */}
      <div style={{ ...statCard, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={sectionTitle}>Gemini API Key</p>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: tierInfo.color, color: '#fff',
          }}>
            {tierInfo.label}
          </span>
        </div>

        {/* Key info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rate Limit</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
              {rpmLimit > 0 ? `${rpmLimit} RPM` : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Daily Limit</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
              {isPaid ? 'Không giới hạn' : `${quotaLimit} req`}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Billing</p>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: isPaid ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              {isPaid ? 'Trả phí' : 'Miễn phí'}
            </p>
          </div>
        </div>

        {/* Quota usage — only show bar for free tier */}
        {!isPaid && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>Đã dùng hôm nay</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{quotaUsedToday} / {quotaLimit} request</p>
            </div>
            <div style={quotaBarOuter}>
              <div style={{ ...quotaBarInner, width: `${Math.min(quotaPercent, 100)}%`, background: quotaPercent >= 95 ? 'var(--color-danger)' : quotaPercent >= 80 ? 'var(--color-warning)' : 'var(--color-success)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Còn ~{Math.max(0, quotaLimit - quotaUsedToday)} request · Reset lúc 14:00 (giờ Hà Nội)
            </p>
          </>
        )}

        {isPaid && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '8px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
            Đã dùng hôm nay: <strong>{quotaUsedToday} request</strong> · Paid key không giới hạn quota hàng ngày
          </div>
        )}
      </div>

      {/* Activity chart 7 days */}
      <div style={{ ...statCard, marginBottom: 20 }}>
        <p style={sectionTitle}>Hoạt động 7 ngày gần nhất</p>
        <ActivityMiniChart activityByDay={activityStats?.activityByDay || {}} />
      </div>

      {/* Recent docs */}
      {recentDocs.length > 0 && (
        <div>
          <p style={sectionTitle}>Tài liệu gần đây</p>
          {recentDocs.map(doc => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {(doc.customTitle || doc.title || '').replace('.pdf', '')}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {doc.completedSections}/{doc.totalSections} đoạn · {doc.topic}
                </p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatRelativeTime(doc.updatedAt)}</span>
            </div>
          ))}
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
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80, padding: '8px 0' }}>
      {days.map((day, i) => {
        const words = activityByDay[day] || 0;
        const heightPct = words / maxWords;
        const isToday = i === 6;
        const label = new Date(day).toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '');
        return (
          <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>
              {words > 0 ? words.toLocaleString() : ''}
            </p>
            <div style={{
              width: '100%', height: Math.max(heightPct * 52, words > 0 ? 4 : 2),
              borderRadius: 3,
              background: isToday ? 'var(--color-primary)' : words > 0 ? 'var(--color-primary-muted)' : 'var(--color-bg-subtle)',
              transition: 'height 0.3s',
            }} />
            <p style={{ fontSize: 10, margin: 0, color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: isToday ? 500 : 400 }}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}
