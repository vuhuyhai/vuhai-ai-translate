# Phase 4: Smart Injection

## Objective

When translating, prioritize glossary terms whose `domain` matches the current document topic, improving translation accuracy.

## Current Flow

1. `useTranslationPipeline.js` calls `buildPromptWithGlossary(basePrompt)` (line 19-22)
2. This calls `glossaryStore.getGlossaryPrompt()` (line 55-59)
3. Which calls `buildGlossaryContext(entries)` from `glossaryService.js` (line 82-96)
4. `buildGlossaryContext` filters to `status === 'approved'`, sorts alphabetically, builds markdown table
5. All approved terms get injected regardless of domain

## Proposed Change

Update `buildGlossaryContext` to accept the current topic and prioritize domain-matched terms.

### 4.1 Update `buildGlossaryContext` signature

```js
export function buildGlossaryContext(entries, { currentTopic = null, maxTerms = 50 } = {}) {
```

### 4.2 Scoring and sorting logic

Replace simple alphabetical sort with domain-aware scoring:

```js
const approved = entries
  .filter(e => e.status === 'approved')
  .map(e => {
    let score = 0;
    const domain = e.domain || 'general';
    // Exact domain match to current topic
    if (currentTopic && domain === currentTopic) score += 10;
    // General domain terms always useful
    if (domain === 'general') score += 5;
    // Higher usage = more important
    score += Math.min(e.usageCount || 0, 5);
    return { ...e, _score: score };
  })
  .sort((a, b) => b._score - a._score || a.termEN.localeCompare(b.termEN))
  .slice(0, maxTerms);
```

This ensures:
- Terms from the matching domain appear first
- General terms come next
- Cross-domain terms still included if space allows
- `maxTerms` cap prevents prompt bloat

### 4.3 Update `getGlossaryPrompt` in `glossaryStore.js`

Accept `currentTopic` parameter:

```js
getGlossaryPrompt: (currentTopic) => {
  const context = buildGlossaryContext(get().entries, { currentTopic });
  if (!context) return '';
  return `\n---\nBANG THUAT NGU BAT BUOC (dung dung 100%, khong dich khac):\n${context}`;
},
```

### 4.4 Update `buildPromptWithGlossary` in `useTranslationPipeline.js`

Pass the current topic:

```js
function buildPromptWithGlossary(basePrompt) {
  const glossaryPrompt = useGlossaryStore.getState().getGlossaryPrompt(getTopic());
  return glossaryPrompt ? basePrompt + glossaryPrompt : basePrompt;
}
```

Import `getTopic` from `constants/config.js` (already imported in the file).

### 4.5 Section headers in glossary table (optional enhancement)

When domain-matched terms exist, add a section header to the markdown table:

```
| English | Vietnamese | Notes |
|---|---|---|
**Domain-matched terms:**
| ROI | Ty suat hoan von | ... |
| CTA | Loi keu goi hanh dong | ... |
**Other approved terms:**
| API | Giao dien lap trinh | ... |
```

This helps the AI understand which terms are highest priority. Implementation: split `approved` into two arrays (matched vs rest), render with headers.

## Files Changed

| File | Change |
|------|--------|
| `src/services/glossaryService.js` | Update `buildGlossaryContext` with scoring, topic param, maxTerms cap |
| `src/stores/glossaryStore.js` | Update `getGlossaryPrompt` to accept and pass `currentTopic` |
| `src/hooks/useTranslationPipeline.js` | Pass `getTopic()` to `getGlossaryPrompt` |

## Impact

- No extra API calls
- Prompt gets better-prioritized glossary terms
- Cross-domain terms still available (not excluded)
- `maxTerms = 50` cap prevents token waste as glossary grows

## Testing

- Translate a marketing document; verify marketing-domain terms appear first in the injected glossary table
- Translate a tech document; verify tech-domain terms are prioritized
- Verify terms without `domain` (legacy) still appear as `general` and rank second tier
