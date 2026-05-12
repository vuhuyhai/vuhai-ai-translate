export function PdfProgressModal({ isOpen, steps, currentStepIndex, percent, onClose }) {
  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const isDone = percent >= 100;

  return (
    <div className="bento-pdf-modal-overlay">
      <div
        className="bento-pdf-modal"
        role="dialog"
        aria-labelledby="bento-pdf-modal-title"
        aria-modal="true"
      >
        {/* Close button — visible when done */}
        {(isDone || onClose) && (
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="bento-pdf-modal-close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}

        {/* Icon */}
        <div className={`bento-pdf-modal-icon${isDone ? ' done' : ''}`}>
          {isDone ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <div className="spinner spinner-lg" />
          )}
        </div>

        {/* Current step */}
        <h2 id="bento-pdf-modal-title" className="bento-pdf-modal-label">
          {isDone ? 'Xuất PDF thành công!' : currentStep?.label || 'Đang xử lý...'}
        </h2>
        {!isDone && currentStep?.desc && <p className="bento-pdf-modal-desc">{currentStep.desc}</p>}

        {/* Progress bar */}
        <div className="bento-pdf-modal-bar">
          <div
            className={`bento-pdf-modal-bar-fill${isDone ? ' done' : ''}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        {/* Meta */}
        <div className="bento-pdf-modal-meta">
          <span className={`bento-pdf-modal-percent${isDone ? ' done' : ''}`}>{percent}%</span>
          <span className="bento-pdf-modal-steps-count">Bước {currentStepIndex + 1} / {steps.length}</span>
        </div>

        {/* Steps list */}
        <div className="bento-pdf-modal-steps">
          {steps.map((step, i) => {
            const stepDone = i < currentStepIndex || isDone;
            const isActive = i === currentStepIndex && !isDone;
            return (
              <div key={i} className="bento-pdf-modal-step-row">
                <div className={`bento-pdf-modal-dot ${stepDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                  {stepDone && (
                    <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                  )}
                </div>
                <span className={`bento-pdf-modal-step-label ${stepDone ? 'done' : isActive ? 'active' : ''}`}>
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
