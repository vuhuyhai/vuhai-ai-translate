import React from 'react';

export const TabBar = React.memo(function TabBar({ activeTab, onTabChange, hasAnyReview }) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Chọn phiên bản bản dịch">
      <button
        className={`tab-btn ${activeTab === 'translation' ? 'tab-active' : ''}`}
        role="tab"
        aria-selected={activeTab === 'translation'}
        onClick={() => onTabChange('translation')}
      >
        🔄 Bản dịch
      </button>
      <button
        className={`tab-btn ${activeTab === 'review' ? 'tab-active' : ''}`}
        role="tab"
        aria-selected={activeTab === 'review'}
        disabled={!hasAnyReview}
        onClick={() => hasAnyReview && onTabChange('review')}
      >
        ✨ Đã duyệt
      </button>
    </div>
  );
});
