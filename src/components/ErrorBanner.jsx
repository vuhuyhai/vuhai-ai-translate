import React from 'react';

export const ErrorBanner = React.memo(function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="fade-in" role="alert" aria-live="assertive" style={{
      background: 'var(--status-error-bg)', border: '1px solid var(--color-danger)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginTop: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <span style={{ fontSize: 'var(--font-base)', color: 'var(--status-error-text)', fontWeight: 500 }}>{message}</span>
      </div>
      <button className="btn btn-primary" onClick={onRetry} aria-label="Thử lại">Thử lại</button>
    </div>
  );
});
