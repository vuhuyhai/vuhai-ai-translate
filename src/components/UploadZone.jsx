import React, { useRef, useState, useCallback } from 'react';

const UploadIcon = ({ isDragging }) => (
  <svg className={`upload-svg-icon ${isDragging ? 'bouncing' : ''}`} width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="8" y="12" width="48" height="44" rx="6" fill="var(--color-primary-light)" stroke="var(--color-primary)" strokeWidth="2" />
    <path d="M24 36l8-8 8 8" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 28v18" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="18" y="8" width="28" height="8" rx="3" fill="var(--color-primary)" opacity="0.15" />
    <text x="32" y="14.5" textAnchor="middle" fill="var(--color-primary)" fontSize="7" fontWeight="700" fontFamily="var(--font-sans)">PDF</text>
  </svg>
);

const FeaturePill = ({ icon, text }) => (
  <span className="upload-feature-pill">
    <span>{icon}</span>
    <span>{text}</span>
  </span>
);

export const UploadZone = React.memo(function UploadZone({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) onFileSelected(droppedFile);
  }, [onFileSelected]);
  const handleInputChange = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) onFileSelected(selectedFile);
  }, [onFileSelected]);
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); }
  }, []);

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Khu vực upload file PDF. Nhấn Enter hoặc Space để chọn file"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        aria-label="Chọn file PDF từ máy tính"
        aria-describedby="upload-hint"
      />

      <div className="upload-zone-glow" />

      <UploadIcon isDragging={isDragging} />

      <div className="upload-zone-title">
        {isDragging ? 'Thả file tại đây' : 'Tải tài liệu tiếng Anh của bạn lên'}
      </div>
      <div className="upload-zone-subtitle">
        Kéo thả file PDF vào đây hoặc <span className="upload-zone-link">click để chọn file</span>
      </div>

      <div className="upload-feature-pills">
        <FeaturePill icon="🎯" text="10 chuyên ngành" />
        <FeaturePill icon="🤖" text="4 AI chuyên gia" />
        <FeaturePill icon="📄" text="Xuất PDF" />
      </div>

      <div id="upload-hint" className="upload-zone-hint">
        PDF · Tối đa 100MB · Hỗ trợ tới 500 trang
      </div>
    </div>
  );
});
