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

  // Streaming text (shown during translation)
  const streamingText = state.streamingTranslated;
  const isStreaming = isTranslating && !!streamingText;

  // Display text: review tab → reviewed text, otherwise → translated
  const displayText = activeTab === 'review' && hasReview ? state.reviewed : state.translated;

  return (
    <div className={`card section-card ${isWorking ? 'working' : ''}`}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
        background: isWorking ? 'var(--color-primary-light)' : 'transparent',
        transition: 'background var(--transition-base)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 18 }}>📑</span>
          <div>
            <div style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {section.title}
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
              ~{section.wordCount.toLocaleString()} từ
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge" style={{
            background: `var(--status-${statusKey}-bg)`,
            color: `var(--status-${statusKey}-text)`,
          }}>
            {isWorking && <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
            {STATUS_LABELS[statusKey]}
          </span>

          {!hasTranslation && !isWorking && (
            <button className="btn btn-primary" onClick={() => onTranslate(section.id)}>🔄 Dịch đoạn này</button>
          )}
          {hasTranslation && !isWorking && (
            <button className="btn btn-ghost" onClick={() => onTranslate(section.id)}>🔄 Dịch lại</button>
          )}
          {hasTranslation && !hasReview && !isWorking && (
            <button className="btn btn-review" onClick={() => onReview(section.id)}>✨ Duyệt lại</button>
          )}
          {hasReview && !isWorking && (
            <button className="btn btn-ghost" onClick={() => onReview(section.id)}>✨ Duyệt lại</button>
          )}
        </div>
      </div>

      {/* Content */}
      {(hasTranslation || isWorking) && (
        <div className="section-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
          {/* English column */}
          <div className="panel-en" style={{ borderRight: '1px solid var(--color-border)', padding: '16px 20px' }}>
            <div style={{
              fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
            }}>
              🇺🇸 Tiếng Anh gốc
            </div>
            <div style={{ fontSize: 'var(--font-base)', color: 'var(--color-text-primary)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
              {section.text || section.pages.map(p => p.text).join('\n\n')}
            </div>
          </div>

          {/* Translation column */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{
              fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
            }}>
              🇻🇳 {isStreaming ? 'Đang dịch...' :
                activeTab === 'review' && hasReview ? 'Đã duyệt lại' : 'Bản dịch'}
            </div>
            {/* Agent progress steps */}
            {isTranslating && state.agentProgress && !isStreaming && (
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(state.agentProgress).map(([agent, status]) => {
                  const label = AGENT_LABELS[agent]?.[status];
                  if (!label) return null;
                  const isRunning = status === 'running';
                  return (
                    <div key={agent} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)',
                    }}>
                      {isRunning && <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Streaming text — realtime display during translation */}
            {isStreaming && (
              <div className="streaming-container">
                <FormattedText text={streamingText} />
                <span className="streaming-cursor" />
              </div>
            )}
            {/* Shimmer only when translating and no streaming text yet */}
            {isTranslating && !hasTranslation && !isStreaming && <ShimmerLoader lineCount={5} />}
            {/* Error display */}
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
