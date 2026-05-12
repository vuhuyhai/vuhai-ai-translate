import React, { useMemo } from 'react';
import { markdownToHtml } from '../utils/textUtils';

export const FormattedText = React.memo(function FormattedText({ text, isError }) {
  const html = useMemo(() => markdownToHtml(text), [text]);
  if (!text) return null;

  return (
    <div
      className={`formatted-text fade-slide-in ${isError ? 'is-error' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
