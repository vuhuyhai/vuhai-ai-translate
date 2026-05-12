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
      <div className="bento-dash-login-gate">
        <p className="bento-dash-login-emoji">🔒</p>
        <h2 className="bento-dash-login-title">Yêu cầu đăng nhập</h2>
        <p className="bento-dash-login-desc">
          Lưu tài liệu, quản lý bảng thuật ngữ và xem lịch sử dịch của bạn.
        </p>
        <button
          type="button"
          className="bento-dash-google-btn"
          onClick={() => authService.upgradeToGoogle()}
        >
          Đăng nhập với Google
        </button>
        <button type="button" className="bento-dash-login-back" onClick={onBack}>
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="bento-dash-layout">
      <aside className="bento-dash-sidebar">
        <div className="bento-dash-user-info">
          <img
            className="bento-dash-avatar"
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || '?')}&background=e04544&color=fff&size=96&bold=true`}
            alt={`${user.displayName || 'Người dùng'} avatar`}
            referrerPolicy="no-referrer"
          />
          <h1 className="bento-dash-user-name">{user.displayName || 'Người dùng'}</h1>
          <p className="bento-dash-user-email">{user.email}</p>
        </div>

        <div className="bento-dash-back-wrap">
          <button type="button" className="bento-dash-back-btn" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Dịch tài liệu
          </button>
        </div>

        <nav className="bento-dash-nav" role="tablist" aria-label="Dashboard sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`bento-dash-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`bento-dash-panel-${tab.id}`}
              className="bento-dash-nav-item"
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="bento-dash-nav-icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div
        className="bento-dash-content"
        role="tabpanel"
        id={`bento-dash-panel-${activeTab}`}
        aria-labelledby={`bento-dash-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'documents' && <DocumentsTab onOpenDocument={onOpenDocument} />}
        {activeTab === 'glossary' && <GlossaryTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}
