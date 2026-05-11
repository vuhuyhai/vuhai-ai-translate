import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { TOPICS, AUDIENCES } from '../constants/prompts';
import { getTopic, getAudience } from '../constants/config';
import { UserBadge } from './UserBadge';

const TranslateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
    <path d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// SVG icons for header buttons — crisp on red background
const LibraryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

const GlossaryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </svg>
);

export const Header = React.memo(function Header({
  onChangeApiKey, onToggleGlossary, glossaryCount,
  currentUser, onUpgradeToGoogle, onSignOut,
  onOpenLibrary, onOpenDashboard,
}) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-header-logo">
          <TranslateIcon />
        </div>
        <span className="app-header-title">VuHai AI Translate</span>
        <span className="app-header-sep" />
        <span className="app-header-context">
          {(() => {
            const topic = TOPICS.find(t => t.id === getTopic());
            const aud = AUDIENCES.find(a => a.id === getAudience());
            const parts = [];
            if (topic) parts.push(`${topic.icon} ${topic.label}`);
            if (aud) parts.push(`${aud.icon} ${aud.label}`);
            return parts.length ? parts.join(' · ') : 'Dịch tài liệu kinh doanh';
          })()}
        </span>
      </div>

      <div className="app-header-right">
        {onOpenLibrary && (
          <button className="btn btn-icon" onClick={onOpenLibrary} aria-label="Thư viện tài liệu" title="Thư viện">
            <LibraryIcon />
          </button>
        )}
        {onToggleGlossary && (
          <button className="btn btn-icon gloss-toggle-btn" onClick={onToggleGlossary}
            aria-label="Bảng thuật ngữ" title="Thuật ngữ" style={{ position: 'relative' }}>
            <GlossaryIcon />
            {glossaryCount > 0 && <span className="gloss-header-count">{glossaryCount}</span>}
          </button>
        )}
        {onChangeApiKey && (
          <button className="btn btn-icon" onClick={onChangeApiKey} aria-label="Cài đặt" title="Cài đặt">
            <SettingsIcon />
          </button>
        )}
        <button className="btn btn-icon" onClick={toggleTheme}
          aria-label={isDark ? 'Light Mode' : 'Dark Mode'} title={isDark ? 'Light Mode' : 'Dark Mode'}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <UserBadge user={currentUser} onUpgrade={onUpgradeToGoogle} onSignOut={onSignOut} onOpenDashboard={onOpenDashboard} />
      </div>
    </header>
  );
});
