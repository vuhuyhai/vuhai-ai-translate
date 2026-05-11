import React from 'react';

const SHIMMER_WIDTHS = ['100%', '90%', '75%', '85%', '60%', '95%', '70%'];

export const ShimmerLoader = React.memo(function ShimmerLoader({ lineCount = 5, showPageLabel = false }) {
  return (
    <div style={{ opacity: 0.8 }}>
      {showPageLabel && (
        <div className="shimmer" style={{ height: 12, width: 120, marginBottom: 16 }} />
      )}
      {SHIMMER_WIDTHS.slice(0, lineCount).map((width, i) => (
        <div key={i} className="shimmer" style={{
          height: 14, width, marginBottom: i < lineCount - 1 ? 10 : 0,
        }} />
      ))}
    </div>
  );
});

export const SkeletonParagraphs = React.memo(function SkeletonParagraphs({ count = 2 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, paraIdx) => (
        <div key={paraIdx} style={{ marginBottom: 24 }}>
          <ShimmerLoader lineCount={4 + (paraIdx % 2)} showPageLabel={paraIdx === 0} />
        </div>
      ))}
    </div>
  );
});
