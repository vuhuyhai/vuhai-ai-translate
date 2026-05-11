# Phase 3: UI Updates

## Objective

Show, filter, and edit `domain` in both GlossaryTab (dashboard) and GlossaryPanel (sidebar).

## Tasks

### 3.1 GlossaryTab (dashboard) -- `src/components/dashboard/GlossaryTab.jsx`

#### 3.1.1 Add domain filter state

```js
const [domainFilter, setDomainFilter] = useState('');
```

Pass to `masterGlossaryService.getAll`:
```js
let data = await masterGlossaryService.getAll({
  topic: topicFilter || null,
  status: statusFilter || null,
  domain: domainFilter || null,
});
```

Add `domainFilter` to `useEffect` deps (line 34).

#### 3.1.2 Add domain filter dropdown

After the existing topic filter `<select>` (line 107-112), add:

```jsx
<select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} style={filterSelect}>
  <option value="">All domains</option>
  {allDomains.map(d => (
    <option key={d.id} value={d.id}>{d.label}</option>
  ))}
</select>
```

`allDomains` = `[...DOMAINS, ...customDomains]`. Load custom domains on mount.

#### 3.1.3 Display domain badge per term

In the term row (line 132-163), add a domain badge next to the existing topic badge. Reuse `topicBadge` style with a different background color to distinguish.

```jsx
<span style={{ ...topicBadge, background: 'var(--color-background-tertiary)' }}>
  {term.domain || 'general'}
</span>
```

#### 3.1.4 Edit domain inline

When editing a term (`editingId === term.id`), add a domain `<select>` dropdown:

```jsx
<select
  value={editValue.domain || 'general'}
  onChange={e => setEditValue(v => ({ ...v, domain: e.target.value }))}
  style={{ fontSize: 13, padding: '4px', ... }}
>
  {allDomains.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
</select>
```

Update `handleSaveEdit` -- `editValue` already spreads to `masterGlossaryService.updateTerm`, so `domain` is included automatically.

Update the edit button handler to also capture `domain`:
```js
setEditValue({ termVI: term.termVI, notes: term.notes, domain: term.domain || 'general' });
```

#### 3.1.5 CSV export

Already handled in Phase 1 -- `exportCSV` gets a new column.

### 3.2 GlossaryPanel (sidebar) -- `src/components/GlossaryPanel.jsx`

#### 3.2.1 Show domain label

In `GlossaryEntry` component, below the status badge (line 45-47), add a domain label:

```jsx
{entry.domain && entry.domain !== 'general' && (
  <span className="gloss-domain-badge">{entry.domain}</span>
)}
```

Only show non-general domains to reduce noise in the sidebar.

#### 3.2.2 Domain filter (optional, lightweight)

Add a domain dropdown above the status filter tabs, or add domain-based grouping. Given the sidebar is compact, a simple grouping header is better than another filter row:

```jsx
// Group entries by domain before rendering
const grouped = useMemo(() => {
  const map = new Map();
  for (const e of filteredEntries) {
    const d = e.domain || 'general';
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(e);
  }
  return map;
}, [filteredEntries]);
```

Render with domain headers only when entries span 2+ domains. Otherwise flat list.

#### 3.2.3 Inline domain edit

In `GlossaryEntry`, add domain to the editable fields. Use the existing edit pattern (`startEdit`/`saveEdit`). Add a clickable domain badge that cycles through domains or opens a small select.

Simpler approach: clicking the domain badge opens a select overlay. On change, call `updateEntry(entry.id, { domain: newDomain })`.

### 3.3 Custom domain creation UI

Add a small "+" button next to the domain filter dropdown in GlossaryTab. On click, prompt for a new domain label. Call `masterGlossaryService.addCustomDomain({ id: slugify(label), label })`. Refresh the domain list.

### 3.4 CSS additions

Add to the existing glossary CSS:

```css
.gloss-domain-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--color-background-tertiary);
  color: var(--color-text-secondary);
  margin-left: 4px;
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/GlossaryTab.jsx` | Domain filter, domain badge, domain edit, custom domain "+" |
| `src/components/GlossaryPanel.jsx` | Domain badge, optional grouping, inline domain edit |
| CSS file for glossary styles | `.gloss-domain-badge` |

## UX Notes

- Domain badge uses muted styling to avoid competing with the status badge visually
- GlossaryPanel only shows domain when it differs from "general" -- keeps sidebar clean
- Custom domain creation is gated behind GlossaryTab (dashboard) only, not the sidebar
