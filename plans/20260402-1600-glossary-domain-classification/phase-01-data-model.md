# Phase 1: Data Model

## Objective

Define domain constants, add `domain` field to term schema, update stores and services.

## Tasks

### 1.1 Create `src/constants/domains.js`

New file exporting built-in domain list and helper utilities.

```js
export const DOMAINS = [
  { id: 'marketing',   label: 'Marketing' },
  { id: 'technology',  label: 'Technology' },
  { id: 'finance',     label: 'Finance' },
  { id: 'medical',     label: 'Medical' },
  { id: 'legal',       label: 'Legal' },
  { id: 'education',   label: 'Education' },
  { id: 'ecommerce',   label: 'E-Commerce' },
  { id: 'realestate',  label: 'Real Estate' },
  { id: 'science',     label: 'Science' },
  { id: 'management',  label: 'Management' },
  { id: 'statistics',  label: 'Statistics' },
  { id: 'general',     label: 'General' },
];

export const DOMAIN_IDS = new Set(DOMAINS.map(d => d.id));

export function isValidDomain(id) {
  return DOMAIN_IDS.has(id);
}

export function normalizeDomain(id, customDomains = []) {
  if (DOMAIN_IDS.has(id)) return id;
  if (customDomains.some(d => d.id === id)) return id;
  return 'general';
}
```

### 1.2 Update `glossaryService.js` -- `parseTermsResponse`

Add `domain` to the mapped term object (line 46-58):

```js
// In the .map() callback, add:
domain: normalizeDomain(String(t.domain || '').trim().toLowerCase()),
```

Import `normalizeDomain` from `constants/domains.js`.

### 1.3 Update `masterGlossaryService.js`

**`mergeFromDocument`** (line 69-85): include `domain` when writing new terms:

```js
domain: entry.domain || 'general',
```

**`getAll`**: add optional `domain` filter param alongside existing `topic`/`status`:

```js
async getAll({ topic = null, status = null, domain = null } = {}) {
  // ... existing code ...
  if (domain) results = results.filter(t => t.domain === domain);
  return results;
}
```

**`exportCSV`**: add "Domain" column to headers and rows.

### 1.4 Update `glossaryStore.js`

No structural changes needed. The `domain` field flows through `mergeNewTerms` and `addEntries` automatically since they spread the term object. Verify `mergeNewTerms` in `glossaryService.js` preserves all fields (it does -- uses spread/map).

Add a getter for filtering:

```js
getByDomain: (domain) => get().entries.filter(e => e.domain === domain),
```

### 1.5 Custom domains storage

Add to `masterGlossaryService.js`:

```js
async getCustomDomains() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDoc(doc(db, 'user_settings', uid));
  return snap.exists() ? (snap.data().customDomains || []) : [];
},

async addCustomDomain(domain) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Need login');
  const existing = await this.getCustomDomains();
  if (existing.some(d => d.id === domain.id)) return;
  await setDoc(doc(db, 'user_settings', uid), {
    customDomains: [...existing, domain],
  }, { merge: true });
},
```

## Files Changed

| File | Change |
|------|--------|
| `src/constants/domains.js` | **NEW** -- domain constants + helpers |
| `src/services/glossaryService.js` | Add `domain` to `parseTermsResponse` output |
| `src/services/masterGlossaryService.js` | Add `domain` to writes, add domain filter to `getAll`, add custom domain CRUD, add CSV column |
| `src/stores/glossaryStore.js` | Add `getByDomain` getter |

## Backward Compatibility

- Existing Firestore documents without `domain` field: reads default to `'general'` via `normalizeDomain`.
- Zustand persisted state: existing entries without `domain` are fine -- UI and filters treat missing `domain` as `'general'`.
