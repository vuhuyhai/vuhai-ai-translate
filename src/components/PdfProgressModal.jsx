export function PdfProgressModal({ isOpen, steps, currentStepIndex, percent, onClose }) {
  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const isDone = percent >= 100;

  return (
    <div className="pdf-modal-overlay">
      <div className="pdf-modal">
        {/* Close button — visible when done */}
        {(isDone || onClose) && (
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, lineHeight: 1, fontSize: 18, color: '#999',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}

        {/* Icon */}
        <div className="pdf-modal-icon">
          {isDone ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <div className="spinner spinner-lg" />
          )}
        </div>

        {/* Current step */}
        <p className="pdf-modal-label">{isDone ? 'Xuất PDF thành công!' : currentStep?.label || 'Đang xử lý...'}</p>
        {!isDone && currentStep?.desc && <p className="pdf-modal-desc">{currentStep.desc}</p>}

        {/* Progress bar */}
        <div className="pdf-modal-bar">
          <div className="pdf-modal-bar-fill" style={{
            width: `${Math.min(percent, 100)}%`,
            background: isDone ? 'var(--color-success)' : 'var(--color-primary)',
          }} />
        </div>

        {/* Meta */}
        <div className="pdf-modal-meta">
          <span className="pdf-modal-percent" style={{ color: isDone ? 'var(--color-success)' : 'var(--color-primary)' }}>{percent}%</span>
          <span className="pdf-modal-steps-count">Bước {currentStepIndex + 1} / {steps.length}</span>
        </div>

        {/* Steps list */}
        <div className="pdf-modal-steps">
          {steps.map((step, i) => {
            const stepDone = i < currentStepIndex || isDone;
            const isActive = i === currentStepIndex && !isDone;
            return (
              <div key={i} className="pdf-modal-step-row">
                <div className={`pdf-modal-dot ${stepDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                  {stepDone && (
                    <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                  )}
                </div>
                <span className={`pdf-modal-step-label ${stepDone ? 'done' : isActive ? 'active' : ''}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
