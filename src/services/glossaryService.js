/**
 * Build a markdown table from approved glossary entries
 * to inject into translation prompts.
 */
export function buildGlossaryContext(entries) {
  const approved = entries
    .filter(e => e.status === 'approved')
    .sort((a, b) => a.termEN.localeCompare(b.termEN));

  if (approved.length === 0) return '';

  const header = '| English | Vietnamese | Ghi chú |\n|---|---|---|';
  const rows = approved.map(e => {
    const notes = e.notes || (e.termVIAlts.length ? `Alt: ${e.termVIAlts.join(', ')}` : '');
    return `| ${e.termEN} | ${e.termVI} | ${notes} |`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Merge new terms into existing array.
 * Dedup by termEN (case-insensitive). If duplicate, keep old entry + increment usageCount.
 */
export function mergeNewTerms(existing, newTerms) {
  const existingMap = new Map(
    existing.map(e => [e.termEN.toLowerCase(), e])
  );

  const toAdd = [];

  for (const term of newTerms) {
    const key = term.termEN.toLowerCase();
    const found = existingMap.get(key);
    if (found) {
      found.usageCount += 1;
      found.updatedAt = Date.now();
    } else {
      existingMap.set(key, term);
      toAdd.push(term);
    }
  }

  return [...existing.map(e => {
    const updated = existingMap.get(e.termEN.toLowerCase());
    return updated || e;
  }), ...toAdd];
}
