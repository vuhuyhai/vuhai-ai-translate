# Phase 2: AI Extraction -- Domain Classification

## Objective

Update the glossary extraction prompt so AI auto-classifies each term's domain during extraction. Zero extra API calls.

## Tasks

### 2.1 Update `buildExtractPrompt` in `glossaryService.js`

Current prompt asks AI to return `termEN`, `termVI`, `termVIAlts`, `context`, `notes`. Add `domain` to the JSON schema in the prompt.

**Before** (line 12-21):
```
Tra ve JSON array...
[
  {
    "termEN": "Customer Lifetime Value",
    "termVI": "Gia tri vong doi khach hang",
    "termVIAlts": [...],
    "context": "...",
    "notes": "..."
  }
]
```

**After**:
```
Tra ve JSON array...
[
  {
    "termEN": "Customer Lifetime Value",
    "termVI": "Gia tri vong doi khach hang",
    "termVIAlts": ["CLV", "Gia tri tron doi khach hang"],
    "domain": "marketing",
    "context": "cau trich dan chua thuat ngu nay",
    "notes": "viet tat: CLV, CLTV"
  }
]

"domain" phai la MOT trong cac gia tri sau: marketing, technology, finance, medical, legal, education, ecommerce, realestate, science, management, statistics, general.
Chon domain PHU HOP NHAT voi ban chat cua thuat ngu, KHONG phai chu de cua van ban.
```

Import `DOMAINS` from `constants/domains.js` and build the valid domain list dynamically:

```js
const domainIds = DOMAINS.map(d => d.id).join(', ');
```

This way, when new built-in domains are added, the prompt stays in sync.

### 2.2 Update `parseTermsResponse`

Already covered in Phase 1 (1.2). The `domain` field from AI response gets normalized via `normalizeDomain()` -- invalid values fall back to `'general'`.

## Files Changed

| File | Change |
|------|--------|
| `src/services/glossaryService.js` | Update `buildExtractPrompt` to include domain in JSON schema and valid values list |

## Edge Cases

- AI returns a domain not in the list (e.g., "healthcare" instead of "medical") -- `normalizeDomain` maps to `'general'`. Acceptable; user can manually correct.
- AI omits `domain` entirely -- defaults to `'general'` via `t.domain || ''` path.
- Custom domains are NOT passed to the extraction prompt. AI only classifies into built-in domains. Users reclassify manually into custom domains if needed. This keeps the prompt stable and simple.
