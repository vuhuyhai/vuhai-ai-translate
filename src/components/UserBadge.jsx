import React, { useState, useRef, useEffect } from 'react';

export const UserBadge = React.memo(function UserBadge({ user, onUpgrade, onSignOut, onOpenDashboard }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const isAnon = user.isAnonymous;
  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : null) || 'Khách';
  const initial = isAnon ? '?' : (displayName[0] || '?').toUpperCase();
  const avatarUrl = user.photoURL || (!isAnon ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e04544&color=fff&size=64&bold=true` : null);

  return (
    <div className="user-badge" ref={dropdownRef}>
      {/* Upgrade button for anonymous */}
      {isAnon && (
        <button className="user-upgrade-btn" onClick={onUpgrade} title="Đăng nhập để lưu lịch sử">
          Đăng nhập
        </button>
      )}

      {/* Avatar */}
      <button
        className="user-avatar-btn"
        onClick={() => setOpen(v => !v)}
        title={isAnon ? 'Khách vãng lai' : (user.email || displayName)}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="user-avatar-img" referrerPolicy="no-referrer" />
        ) : (
          <span className="user-avatar-initial">{initial}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="user-dropdown fade-in">
          <div className="user-dropdown-header">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="user-dropdown-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="user-dropdown-avatar-placeholder">{initial}</div>
            )}
            <div>
              <div className="user-dropdown-name">{displayName}</div>
              <div className="user-dropdown-email">
                {isAnon ? 'Khách vãng lai' : (user.email || '')}
              </div>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {isAnon ? (
            <button className="user-dropdown-item" onClick={() => { setOpen(false); onUpgrade(); }}>
              <span>🔗</span> Đăng nhập với Google
            </button>
          ) : (
            <>
              {onOpenDashboard && (
                <button className="user-dropdown-item" onClick={() => { setOpen(false); onOpenDashboard(); }}>
                  <span>◈</span> Trang cá nhân
                </button>
              )}
              <button className="user-dropdown-item" onClick={() => { setOpen(false); onSignOut(); }}>
                <span>🚪</span> Đăng xuất
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
