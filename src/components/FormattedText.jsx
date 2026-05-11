import React, { useMemo } from 'react';
import { markdownToHtml } from '../utils/textUtils';

export const FormattedText = React.memo(function FormattedText({ text, isError }) {
  const html = useMemo(() => markdownToHtml(text), [text]);
  if (!text) return null;

  return (
    <div
      className="formatted-text fade-slide-in"
      style={{
        fontSize: 'var(--font-base)',
        color: isError ? 'var(--color-danger)' : 'var(--color-text-primary)',
        lineHeight: 1.85,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
