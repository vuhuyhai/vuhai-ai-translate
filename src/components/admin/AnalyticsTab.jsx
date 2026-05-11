import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { adminService } from '../../services/adminService';

const EVENT_LABELS = {
  session_start: 'Phiên truy cập',
  pdf_upload: 'Upload PDF',
  translation_start: 'Bắt đầu dịch',
  translation_complete: 'Dịch hoàn thành',
  export_doc: 'Xuất .doc',
  export_txt: 'Xuất .txt',
  copy_clipboard: 'Copy clipboard',
  session_end: 'Kết thúc phiên',
  upgrade_to_google: 'Đăng ký Google',
  review_start: 'Bắt đầu duyệt',
  review_complete: 'Duyệt hoàn thành',
  glossary_approve: 'Duyệt thuật ngữ',
};

function StatCard({ label, value, detail }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {detail && <div className="admin-stat-detail">{detail}</div>}
    </div>
  );
}

export function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [userCounts, setUserCounts] = useState({ anonymous: 0, registered: 0, total: 0 });
  const [eventCounts, setEventCounts] = useState({});
  const [dauData, setDauData] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminService.getTotalUserCount(),
      adminService.getEventCounts(days),
      adminService.getDailyActiveUsers(days),
    ]).then(([users, events, dau]) => {
      setUserCounts(users);
      setEventCounts(events);
      setDauData(dau);
      setLoading(false);
    });
  }, [days]);

  const chartData = useMemo(() =>
    dauData.map(d => ({
      ...d,
      label: d.date.slice(5).replace('-', '/'),
    })),
  [dauData]);

  const eventRows = useMemo(() =>
    Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => {
        const total = Object.values(eventCounts).reduce((s, v) => s + v, 0);
        return { name, label: EVENT_LABELS[name] || name, count, pct: total ? ((count / total) * 100).toFixed(1) : 0 };
      }),
  [eventCounts]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="shimmer" style={{ height: 80, marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 200, marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 160 }} />
      </div>
    );
  }

  return (
    <div className="admin-analytics">
      {/* Filter */}
      <div className="admin-filter-bar">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            className={`admin-filter-btn ${days === d ? 'active' : ''}`}
            onClick={() => setDays(d)}
          >
            {d} ngày
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <StatCard label="Tổng người dùng" value={userCounts.total.toLocaleString()} detail={`${userCounts.registered} đã đăng ký`} />
        <StatCard label="Đã đăng ký" value={userCounts.registered.toLocaleString()} detail={userCounts.total ? `${((userCounts.registered / userCounts.total) * 100).toFixed(1)}%` : '0%'} />
        <StatCard label="Bản dịch" value={(eventCounts.translation_start || 0).toLocaleString()} detail={`${days} ngày qua`} />
        <StatCard label="PDF đã upload" value={(eventCounts.pdf_upload || 0).toLocaleString()} detail={`${days} ngày qua`} />
      </div>

      {/* DAU Chart */}
      <div className="admin-chart-card">
        <h3 className="admin-section-title">Người dùng hoạt động hàng ngày</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" fontSize={11} tick={{ fill: 'var(--color-text-muted)' }} />
              <YAxis fontSize={11} tick={{ fill: 'var(--color-text-muted)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ fontWeight: 700 }}
              />
              <Line type="monotone" dataKey="dau" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} name="Người dùng" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="admin-empty">Chưa có dữ liệu trong khoảng thời gian này</div>
        )}
      </div>

      {/* Event Table */}
      <div className="admin-chart-card">
        <h3 className="admin-section-title">Sự kiện phổ biến</h3>
        {eventRows.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr><th>Sự kiện</th><th>Số lần</th><th>%</th></tr>
            </thead>
            <tbody>
              {eventRows.map(row => (
                <tr key={row.name}>
                  <td>{row.label}</td>
                  <td className="admin-table-num">{row.count.toLocaleString()}</td>
                  <td className="admin-table-num">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">Chưa có sự kiện nào</div>
        )}
      </div>
    </div>
  );
}
