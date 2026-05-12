import React from 'react';
import { FormattedText } from './FormattedText';
import { ShimmerLoader } from './ShimmerLoader';
import { ApiErrorCard } from './ApiErrorCard';

const STATUS_LABELS = {
  idle: 'Chưa dịch', translating: 'Đang dịch...', translated: 'Đã dịch',
  reviewing: 'Đang duyệt...', reviewed: 'Đã duyệt lại', error: 'Lỗi',
};

const AGENT_LABELS = {
  analyst: { running: '🔍 Đang phân tích...', done: '✅ Đã phân tích', skipped: '⏭️ Bỏ qua' },
  translator: { running: '✍️ Đang dịch...', done: '✅ Đã dịch' },
  editor: { running: '📝 Đang biên tập...', done: '✅ Đã biên tập', skipped: '⏭️ Bỏ qua' },
};

export const SectionCard = React.memo(function SectionCard({
  section, sectionState, onTranslate, onReview, activeTab,
}) {
  const state = sectionState || { status: 'idle' };
  const isTranslating = state.status === 'translating';
  const isReviewing = state.status === 'reviewing';
  const isWorking = isTranslating || isReviewing;
  const hasTranslation = !!state.translated;
  const hasReview = !!state.reviewed;
  const statusKey = state.status || 'idle';

  const streamingText = state.streamingTranslated;
  const isStreaming = isTranslating && !!streamingText;

  const displayText = activeTab === 'review' && hasReview ? state.reviewed : state.translated;

  return (
    <div className={`section-card ${isWorking ? 'working' : ''}`}>
      {/* Header */}
      <div className="section-card-header">
        <div className="section-card-head-left">
          <span className="section-card-icon">📑</span>
          <div>
            <div className="section-card-title">{section.title}</div>
            <div className="section-card-meta">~{section.wordCount.toLocaleString()} từ</div>
          </div>
        </div>

        <div className="section-card-actions">
          <span className={`section-badge is-${statusKey}`}>
            {isWorking && <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
            {STATUS_LABELS[statusKey]}
          </span>

          {!hasTranslation && !isWorking && (
            <button className="section-btn-primary" onClick={() => onTranslate(section.id)}>🔄 Dịch đoạn này</button>
          )}
          {hasTranslation && !isWorking && (
            <button className="section-btn-ghost" onClick={() => onTranslate(section.id)}>🔄 Dịch lại</button>
          )}
          {hasTranslation && !hasReview && !isWorking && (
            <button className="section-btn-review" onClick={() => onReview(section.id)}>✨ Duyệt lại</button>
          )}
          {hasReview && !isWorking && (
            <button className="section-btn-ghost" onClick={() => onReview(section.id)}>✨ Duyệt lại</button>
          )}
        </div>
      </div>

      {/* Content */}
      {(hasTranslation || isWorking) && (
        <div className="section-panels">
          {/* English column */}
          <div className="section-panel section-panel-en">
            <div className="panel-label">🇺🇸 Tiếng Anh gốc</div>
            <div className="panel-text">
              {section.text || section.pages.map(p => p.text).join('\n\n')}
            </div>
          </div>

          {/* Translation column */}
          <div className="section-panel">
            <div className="panel-label">
              🇻🇳 {isStreaming ? 'Đang dịch...' :
                activeTab === 'review' && hasReview ? 'Đã duyệt lại' : 'Bản dịch'}
            </div>

            {isTranslating && state.agentProgress && !isStreaming && (
              <div className="agent-progress-list">
                {Object.entries(state.agentProgress).map(([agent, status]) => {
                  const label = AGENT_LABELS[agent]?.[status];
                  if (!label) return null;
                  const isRunning = status === 'running';
                  return (
                    <div key={agent} className="agent-progress-row">
                      {isRunning && <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {isStreaming && (
              <div className="streaming-container">
                <FormattedText text={streamingText} />
                <span className="streaming-cursor" />
              </div>
            )}

            {isTranslating && !hasTranslation && !isStreaming && <ShimmerLoader lineCount={5} />}

            {state.status === 'error' && state.apiError ? (
              <ApiErrorCard error={state.apiError} compact onRetry={() => onTranslate(section.id)} onSkip={() => {}} />
            ) : hasTranslation && !isStreaming ? (
              <FormattedText text={displayText} isError={state.status === 'error'} />
            ) : null}

            {isReviewing && hasTranslation && !hasReview && (
              <div style={{ marginTop: 12 }}><ShimmerLoader lineCount={3} /></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
