/**
 * Convert Markdown text to sanitized HTML for display.
 */
export function markdownToHtml(text) {
  if (!text) return '';
  let html = text;

  // Escape HTML entities
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Headings (#### → h4, ### → h3, ## → h2, # → h1)
  html = html.replace(/^#{4,}\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr/>');

  // Blockquotes (restore escaped >)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold + italic combinations
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered list items
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');

  // Ordered list items (use temp tag <oli>)
  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');

  // Collapse blank lines between consecutive list items so they group correctly
  html = html.replace(/(<\/li>)\n\n+(<li>)/g, '$1\n$2');
  html = html.replace(/(<\/oli>)\n\n+(<oli>)/g, '$1\n$2');

  // Group consecutive <li> into <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Group consecutive <oli> into <ol>, replacing oli → li
  html = html.replace(/((?:<oli>.*<\/oli>\n?)+)/g, (match) =>
    '<ol>' + match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li')) + '</ol>'
  );

  // Simple markdown table support
  html = html.replace(
    /^(\|.+\|)\n(\|[-|: ]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_match, header, _sep, body) => {
      const headerCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const bodyRows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }
  );

  // Double newlines → paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p>');

  // Single newlines → <br/> (only between inline content)
  html = html.replace(
    /(?<!<\/h[1-4]>|<\/li>|<\/ul>|<\/ol>|<\/blockquote>|<hr\/>|<\/table>|<\/thead>|<\/tbody>|<\/tr>|<\/p>)\n(?!<h[1-4]|<li|<ul|<ol|<blockquote|<hr|<table|<thead|<tbody|<tr|<p)/g,
    '<br/>'
  );

  // Wrap in paragraph tags
  html = '<p>' + html + '</p>';

  // Clean up: remove empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  // Prevent block elements being wrapped inside <p>
  html = html.replace(/<p>\s*(<h[1-4]|<ul|<ol|<blockquote|<hr|<table)/g, '$1');
  html = html.replace(/(<\/h[1-4]>|<\/ul>|<\/ol>|<\/blockquote>|<hr\/>|<\/table>)\s*<\/p>/g, '$1');

  return html;
}

/**
 * Build export text from sections and their states.
 */
export function buildExportText(sections, sectionStates, exportField) {
  const parts = [];
  for (const section of sections) {
    const state = sectionStates[section.id];
    if (!state) continue;
    const text = state[exportField];
    if (!text) continue;
    parts.push(`═══ ${section.title} ═══\n\n${text}`);
  }
  return parts.join('\n\n');
}

/**
 * Download text content as a .txt file.
 */
export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Build export HTML from sections, converting markdown to styled HTML.
 */
export function buildExportHtml(sections, sectionStates, exportField) {
  const parts = [];
  for (const section of sections) {
    const state = sectionStates[section.id];
    if (!state) continue;
    const text = state[exportField];
    if (!text) continue;
    parts.push(`<h2 style="color:#c73937;border-bottom:2px solid #c73937;padding-bottom:6px;">${section.title}</h2>\n${markdownToHtml(text)}`);
  }
  return parts.join('\n<br/>\n');
}

/**
 * Download content as a .doc file (Word-compatible HTML).
 */
export function downloadDocFile(sections, sectionStates, exportField, filename) {
  const bodyHtml = buildExportHtml(sections, sectionStates, exportField);
  const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.8; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 22pt; color: #c73937; margin: 24px 0 12px; }
  h2 { font-size: 18pt; color: #c73937; margin: 20px 0 10px; }
  h3 { font-size: 15pt; color: #333; margin: 16px 0 8px; }
  p { margin: 8px 0; text-align: justify; }
  ul, ol { margin: 8px 0 8px 24px; }
  li { margin: 4px 0; }
  blockquote { border-left: 3px solid #c73937; padding-left: 12px; color: #555; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; }
  hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
  strong { font-weight: bold; }
  em { font-style: italic; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + doc], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard.
 */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
