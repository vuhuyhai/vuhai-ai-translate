import React, { useState, useEffect } from 'react';

export const ApiErrorCard = React.memo(function ApiErrorCard({
  error, onRetry, onSkip, onOpenSettings, onReport, compact = false,
}) {
  const [countdown, setCountdown] = useState(null);
  const info = error?.info;

  // Auto-countdown for retryable errors
  useEffect(() => {
    if (!info?.retryable || !info?.retryAfterMs || info.retryAfterMs <= 10000 || !onRetry) return;

    let seconds = Math.ceil(info.retryAfterMs / 1000);
    setCountdown(seconds);

    const interval = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(interval);
        setCountdown(null);
        onRetry();
      } else {
        setCountdown(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [info?.retryable, info?.retryAfterMs, onRetry, error?.code, error?.timestamp]);

  if (!info) return null;

  const isError = info.severity === 'error';

  const handleAction = (action) => {
    switch (action.type) {
      case 'retry': onRetry?.(); break;
      case 'skip': onSkip?.(); break;
      case 'export': break; // handled by parent
      case 'open-settings': onOpenSettings?.(); break;
      case 'upgrade': onOpenSettings?.(); break;
      case 'report': onReport?.(); break;
      case 'open-url': window.open(action.url, '_blank', 'noopener'); break;
    }
  };

  if (compact) {
    return (
      <div className={`api-error-compact ${isError ? 'api-error-danger' : 'api-error-warn'}`}>
        <div className="api-error-compact-body">
          <div className={`api-error-dot ${isError ? 'danger' : 'warn'}`} />
          <div className="api-error-compact-text">
            <span className="api-error-compact-title">{info.title}</span>
            <span className="api-error-compact-desc">{info.description}</span>
          </div>
        </div>
        <div className="api-error-compact-actions">
          {info.actions.slice(0, 2).map((action, i) => (
            <button key={i} className="api-error-action-btn"
              onClick={() => handleAction(action)}
              disabled={action.type === 'retry' && countdown !== null}>
              {action.type === 'retry' && countdown ? `${countdown}s` : action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`api-error-card ${isError ? 'api-error-danger' : 'api-error-warn'}`}>
      <div className="api-error-header">
        <div className={`api-error-dot ${isError ? 'danger' : 'warn'}`} />
        <div>
          <div className="api-error-title">{info.title}</div>
          <div className="api-error-desc">{info.description}</div>
        </div>
      </div>

      <div className="api-error-steps">
        <div className="api-error-steps-label">Cách khắc phục</div>
        {info.steps.map((step, i) => (
          <div key={i} className="api-error-step">
            <span className="api-error-step-num">{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div className="api-error-actions">
        {info.actions.map((action, i) => (
          <button key={i}
            className={`api-error-action-btn ${i === 0 ? 'primary' : ''}`}
            onClick={() => handleAction(action)}
            disabled={action.type === 'retry' && countdown !== null}>
            {action.type === 'retry' && countdown ? `Thử lại sau ${countdown}s` : action.label}
          </button>
        ))}
      </div>

      {error?.rawError && (
        <details className="api-error-details">
          <summary>Chi tiết kỹ thuật</summary>
          <pre>{JSON.stringify(error.rawError?.error || error.rawError, null, 2)}</pre>
        </details>
      )}
    </div>
  );
});
