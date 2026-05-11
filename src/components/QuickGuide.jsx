import React, { useState } from 'react';

const STEPS = [
  { num: '1', text: 'Upload PDF' },
  { num: '2', text: 'Dịch tất cả' },
  { num: '3', text: 'Duyệt lại' },
  { num: '4', text: 'Xuất file' },
];

export const QuickGuide = React.memo(function QuickGuide() {
  const [visible, setVisible] = useState(() =>
    localStorage.getItem('vuhai-guide-collapsed') !== '1'
  );

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('vuhai-guide-collapsed', '1');
  };

  if (!visible) return null;

  return (
    <div className="quick-guide fade-in">
      <div className="qg-content">
        <div className="qg-left">
          <h2 className="qg-title">Dịch tài liệu chuyên ngành Anh → Việt</h2>
          <p className="qg-desc">4 AI chuyên gia phân tích, dịch, biên tập và kiểm định cho bản dịch chuẩn xuất bản.</p>
        </div>
        <div className="qg-steps">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.num}>
              {i > 0 && <div className="qg-step-line" />}
              <div className="qg-step">
                <span className="qg-step-num">{step.num}</span>
                <span className="qg-step-text">{step.text}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      <button className="qg-dismiss" onClick={dismiss} aria-label="Ẩn hướng dẫn" title="Ẩn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
});
