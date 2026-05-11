import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';

function timeAgo(date) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function UserDetail({ user, onClose }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    adminService.getUserEvents(user.id).then(setEvents);
  }, [user.id]);

  return (
    <>
      <div className="gloss-overlay" onClick={onClose} />
      <aside className="admin-detail-panel">
        <div className="admin-detail-header">
          <h3>Chi tiết người dùng</h3>
          <button className="gloss-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="admin-detail-body custom-scrollbar">
          {/* Profile */}
          <div className="admin-detail-section">
            <div className="admin-detail-avatar-row">
              {user.photoURL ? (
                <img src={user.photoURL} className="admin-detail-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="admin-detail-avatar-placeholder">
                  {(user.displayName?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div>
                <div className="admin-detail-name">{user.displayName || 'Khách'}</div>
                <div className="admin-detail-email">{user.email || 'Ẩn danh'}</div>
              </div>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item"><span>UID</span><code>{user.id}</code></div>
              <div className="admin-detail-item"><span>Loại</span><span>{user.isAnonymous ? 'Khách' : 'Đã đăng ký'}</span></div>
              <div className="admin-detail-item"><span>Lần đầu</span><span>{timeAgo(user.firstSeen)}</span></div>
              <div className="admin-detail-item"><span>Lần cuối</span><span>{timeAgo(user.lastSeen)}</span></div>
              <div className="admin-detail-item"><span>Sessions</span><span>{user.sessionCount || 0}</span></div>
              <div className="admin-detail-item"><span>Bản dịch</span><span>{user.translationCount || 0}</span></div>
              <div className="admin-detail-item"><span>PDF upload</span><span>{user.pdfUploadCount || 0}</span></div>
              <div className="admin-detail-item"><span>Ngôn ngữ</span><span>{user.language || '—'}</span></div>
            </div>
          </div>

          {/* Activity */}
          <div className="admin-detail-section">
            <h4>Hoạt động gần đây</h4>
            {events === null ? (
              <div className="shimmer" style={{ height: 100 }} />
            ) : events.length === 0 ? (
              <div className="admin-empty">Chưa có hoạt động nào</div>
            ) : (
              <div className="admin-activity-list">
                {events.map(ev => (
                  <div key={ev.id} className="admin-activity-item">
                    <span className="admin-activity-name">{ev.eventName}</span>
                    <span className="admin-activity-time">{timeAgo(ev.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export function UsersTab() {
  const [users, setUsers] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setUsers(null);
    const filterAnonymous = filter === 'anonymous' ? true : filter === 'registered' ? false : null;
    const data = await adminService.getUsers({ filterAnonymous });
    setUsers(data);
  }, [filter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSearch = async () => {
    if (!search.trim()) { loadUsers(); return; }
    setUsers(null);
    const results = await adminService.searchUserByEmail(search.trim());
    setUsers(results);
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="admin-users">
      {/* Filters */}
      <div className="admin-users-toolbar">
        <div className="admin-filter-bar">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'registered', label: 'Đã đăng ký' },
            { id: 'anonymous', label: 'Khách vãng lai' },
          ].map(f => (
            <button
              key={f.id}
              className={`admin-filter-btn ${filter === f.id ? 'active' : ''}`}
              onClick={() => { setFilter(f.id); setSearch(''); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="admin-search">
          <input
            className="admin-search-input"
            placeholder="Tìm theo email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          <button className="btn btn-primary admin-search-btn" onClick={handleSearch}>Tìm</button>
        </div>
      </div>

      {/* Table */}
      {users === null ? (
        <div className="admin-loading">
          <div className="shimmer" style={{ height: 40, marginBottom: 8 }} />
          <div className="shimmer" style={{ height: 40, marginBottom: 8 }} />
          <div className="shimmer" style={{ height: 40, marginBottom: 8 }} />
          <div className="shimmer" style={{ height: 40 }} />
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty">Không tìm thấy người dùng nào</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-users-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Loại</th>
                <th>Lần đầu</th>
                <th>Lần cuối</th>
                <th>Sessions</th>
                <th>Bản dịch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-cell">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="admin-user-avatar" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="admin-user-avatar-placeholder">
                          {(user.displayName?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="admin-user-name">{user.displayName || 'Khách'}</div>
                        <div className="admin-user-email">{user.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-user-badge ${user.isAnonymous ? 'anon' : 'reg'}`}>
                      {user.isAnonymous ? 'Khách' : 'Đăng ký'}
                    </span>
                  </td>
                  <td className="admin-table-muted">{timeAgo(user.firstSeen)}</td>
                  <td className="admin-table-muted">{timeAgo(user.lastSeen)}</td>
                  <td className="admin-table-num">{user.sessionCount || 0}</td>
                  <td className="admin-table-num">{user.translationCount || 0}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => setSelectedUser(user)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
