import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AnalyticsTab } from './AnalyticsTab';
import { UsersTab } from './UsersTab';
import { TicketsTab } from './TicketsTab';

const TAB_TITLES = {
  analytics: '📊 Analytics',
  users: '👤 Người dùng',
  tickets: '🎫 Tickets',
};

function Sidebar({ activeTab, onTabChange, openTickets }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <span className="admin-sidebar-logo-icon">⚙️</span>
        <span className="admin-sidebar-logo-text">Admin</span>
      </div>

      <nav className="admin-sidebar-nav">
        <button
          className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onTabChange('analytics')}
        >
          <span className="admin-nav-icon">📊</span>
          <span>Analytics</span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => onTabChange('users')}
        >
          <span className="admin-nav-icon">👤</span>
          <span>Người dùng</span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => onTabChange('tickets')}
        >
          <span className="admin-nav-icon">🎫</span>
          <span>Tickets</span>
          {openTickets > 0 && (
            <span className="admin-nav-badge">{openTickets}</span>
          )}
        </button>
      </nav>

      <div className="admin-sidebar-footer">
        <a href="/" className="admin-nav-item admin-back-link">
          <span className="admin-nav-icon">←</span>
          <span>Về app chính</span>
        </a>
      </div>
    </aside>
  );
}

export function AdminLayout() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [openTickets, setOpenTickets] = useState(0);

  // Real-time open ticket count
  useEffect(() => {
    const q = query(
      collection(db, 'feedback_tickets'),
      where('status', '==', 'open')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setOpenTickets(snap.size);
    }, () => { /* ignore errors */ });
    return unsubscribe;
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} openTickets={openTickets} />
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">{TAB_TITLES[activeTab]}</h1>
          <span className="admin-header-badge">Admin</span>
        </header>
        <div className="admin-content">
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'tickets' && <TicketsTab />}
        </div>
      </main>
    </div>
  );
}
