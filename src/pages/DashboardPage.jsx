import { useState } from 'react';
import { auth } from '../services/firebase';
import { authService } from '../services/authService';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import { DocumentsTab } from '../components/dashboard/DocumentsTab';
import { GlossaryTab } from '../components/dashboard/GlossaryTab';
import { ActivityTab } from '../components/dashboard/ActivityTab';

const TABS = [
  { id: 'overview', icon: '◈', label: 'Tổng quan' },
  { id: 'documents', icon: '⊞', label: 'Tài liệu' },
  { id: 'glossary', icon: '⊟', label: 'Thuật ngữ' },
  { id: 'activity', icon: '◷', label: 'Lịch sử' },
];

export function DashboardPage({ onBack, onOpenDocument }) {
  const [activeTab, setActiveTab] = useState('overview');
  const user = auth.currentUser;

  if (!user || user.isAnonymous) {
    return (
      <div style={styles.loginGate}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔒</p>
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
          Đăng nhập để xem trang cá nhân
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Lưu tài liệu, quản lý bảng thuật ngữ và xem lịch sử dịch của bạn.
        </p>
        <button onClick={() => authService.upgradeToGoogle()} style={styles.googleBtn}>
          Đăng nhập với Google
        </button>
        <button onClick={onBack} style={styles.backLink}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 60px)' }}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.userInfo}>
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || '?')}&background=e04544&color=fff&size=96&bold=true`}
            alt="avatar"
            referrerPolicy="no-referrer"
            style={styles.avatar}
          />
          <p style={styles.userName}>{user.displayName || 'Người dùng'}</p>
          <p style={styles.userEmail}>{user.email}</p>
        </div>

        {/* Primary CTA — back to translate */}
        <div style={{ padding: '12px 14px 4px' }}>
          <button onClick={onBack} className="dash-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Dịch tài liệu
          </button>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.navItem,
                background: activeTab === tab.id ? 'var(--color-primary-light)' : 'none',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? 700 : 500,
              }}
            >
              <span style={{ fontSize: 16, marginRight: 10, opacity: 0.8 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'documents' && <DocumentsTab onOpenDocument={onOpenDocument} />}
        {activeTab === 'glossary' && <GlossaryTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}

const styles = {
  loginGate: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 24,
  },
  googleBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500,
    background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
    border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
    marginBottom: 12,
  },
  backLink: {
    background: 'none', border: 'none', fontSize: 13,
    color: 'var(--color-text-secondary)', cursor: 'pointer',
  },
  sidebar: {
    background: 'var(--color-background-primary)',
    borderRight: '0.5px solid var(--color-border-tertiary)',
    display: 'flex', flexDirection: 'column', padding: '0 0 16px',
  },
  userInfo: {
    padding: '20px 20px 16px', textAlign: 'center',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  },
  avatar: { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginBottom: 10 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: '50%', margin: '0 auto 10px',
    background: 'var(--color-primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 500,
  },
  userName: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 2px' },
  userEmail: { fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 },
  navItem: {
    display: 'flex', alignItems: 'center', width: '100%', padding: '10px 20px',
    border: 'none', cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
    textAlign: 'left', fontFamily: 'inherit', borderRadius: 0,
    background: 'none',
  },
  content: {
    background: 'var(--color-bg-app)', overflowY: 'auto',
  },
};
