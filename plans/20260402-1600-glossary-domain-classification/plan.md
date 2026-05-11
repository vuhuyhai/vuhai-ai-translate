# Glossary Domain/Category Classification

## Problem

Glossary terms currently carry a `topic` field representing the *document's* topic at extraction time, but have no dedicated field for the *term's own* specialty domain. A marketing document might contain finance terms (e.g., "ROI"), and those terms inherit `topic: 'marketing'` despite belonging to the finance domain. This weakens glossary injection accuracy during translation.

## Goal

Add a `domain` field per glossary term so the system can:
1. Auto-classify each term's domain via AI during extraction
2. Let users view, filter, and edit domains in both GlossaryTab and GlossaryPanel
3. Prioritize domain-matched terms when injecting glossary into translation prompts
4. Support user-created custom domains

## Architecture Overview

```
                  AI Extraction (Phase 2)
                  glossaryService.js
                        |
                        v
          +------ domain field ------+
          |                          |
    Zustand Store            Firestore (master)
    glossaryStore.js         masterGlossaryService.js
          |                          |
          v                          v
    GlossaryPanel            GlossaryTab
    (sidebar, Phase 3)      (dashboard, Phase 3)
          |                          |
          +--- Smart Injection ------+
               useTranslationPipeline.js (Phase 4)
```

## Phases

| Phase | Scope | Files | Est. Effort |
|-------|-------|-------|-------------|
| 1 | Data model + constants | `constants/domains.js`, `glossaryStore.js`, `masterGlossaryService.js`, `glossaryService.js` | Small |
| 2 | AI extraction prompt | `glossaryService.js` | Small |
| 3 | UI: view/filter/edit | `GlossaryTab.jsx`, `GlossaryPanel.jsx` | Medium |
| 4 | Smart injection | `glossaryService.js`, `useTranslationPipeline.js` | Small |

Custom domains (Req #5) is folded into Phases 1 + 3 -- a Firestore subcollection + UI input, no separate phase needed.

## Key Decisions

- **Domain vs Topic**: `topic` = document context at extraction time (unchanged). `domain` = the term's intrinsic specialty area. Both coexist.
- **Default domains**: Reuse the existing TOPICS list as initial domain options (marketing, technology, finance, medical, legal, education, ecommerce, realestate, science, general). Add a few cross-cutting ones: "Management", "Statistics".
- **AI classification**: Single extraction prompt already asks AI for terms; add `domain` to the JSON schema. Cost: zero extra API calls.
- **Backward compat**: Existing terms without `domain` default to `'general'`. No migration needed -- reads fall back gracefully.
- **Custom domains**: Stored per-user in Firestore `user_settings/{uid}/custom_domains`. Merged with built-in list at render time.

## Detailed Phase Plans

- [Phase 1: Data Model](./phase-01-data-model.md)
- [Phase 2: AI Extraction](./phase-02-ai-extraction.md)
- [Phase 3: UI Updates](./phase-03-ui-updates.md)
- [Phase 4: Smart Injection](./phase-04-smart-injection.md)

## Risks

| Risk | Mitigation |
|------|-----------|
| AI returns invalid domain values | Validate against known list; fallback to `'general'` |
| Existing terms lack `domain` | Default `'general'` at read time; no migration |
| Domain filter adds clutter to UI | Collapse into a single filter row; use compact badges |

## Out of Scope

- Shared/team glossaries
- Batch re-classification of existing terms
- Domain auto-detection from document content (only from individual terms)
