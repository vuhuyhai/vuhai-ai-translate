# HANDOFF — VuHai AI Translate

> Tài liệu này cung cấp toàn bộ context và cấu trúc của app để một Claude session khác có thể tiếp tục làm việc ngay mà không cần khám phá lại từ đầu.

---

## 1. Tổng quan dự án

**Tên:** `vuhai-ai-translate` (v1.0.0)
**Mục đích:** Web app dịch tài liệu **PDF / URL** từ **Anh → Việt** bằng **Google Gemini AI**, tối ưu cho marketing nhưng hỗ trợ 10 chủ đề (marketing, technology, finance, medical, legal, education, ecommerce, realestate, science, general).
**Tác giả:** Vũ Hải (Business Consultant) — `contact@vuhai.com`
**Repo path:** `c:\Users\ASUS\Desktop\Translate\vuhai-translate`
**Không phải Git repo** (theo environment metadata).

### Tech stack
- **Frontend:** React 19 + Vite 7 (ESM, JSX, không TypeScript)
- **State:** Zustand 5 (với `persist` middleware → localStorage)
- **Backend:** Firebase (Auth + Firestore + Storage). Không có server riêng — chạy hoàn toàn client-side, người dùng dùng API key Gemini của chính mình.
- **PDF:** `pdfjs-dist` (extract) + `@react-pdf/renderer` (export PDF)
- **Toast:** `sonner`
- **Charts:** `recharts` (dashboard)
- **Desktop wrapper:** Tauri 2 (`src-tauri/` — có script `tauri:dev`, `tauri:build`)
- **Compression:** `pako` (cho large payload?)

### Scripts (`package.json`)
- `npm run dev` — Vite dev server
- `npm run build` — Vite build (output → `dist/`)
- `npm run preview` — preview build
- `npm run lint` — ESLint
- `npm run tauri:dev` / `tauri:build` — desktop app
- `npm run icons` — generate icons (`scripts/generate-icons.mjs`)

---

## 2. Cấu trúc thư mục

```
vuhai-translate/
├── src/
│   ├── App.jsx                        # Root: auth gate + page routing (hash + path based)
│   ├── main.jsx                       # ReactDOM entry
│   ├── index.css                      # Global CSS (uses CSS variables: --color-bg-app, --font-body, etc.)
│   ├── components/
│   │   ├── ActionToolbar.jsx          # Translate/Review/Copy/Download buttons + tab switcher
│   │   ├── AdminGuard.jsx             # Gate cho /#admin (lazy)
│   │   ├── ApiErrorCard.jsx           # Hiển thị lỗi API có structure (kèm hành động fix)
│   │   ├── ApiKeyScreen.jsx           # Layer 2 auth: nhập Gemini API key + topic + audience
│   │   ├── AttachmentUploader.jsx     # Upload attachment (cho feedback?)
│   │   ├── ErrorBanner.jsx
│   │   ├── FeedbackButton.jsx + FeedbackModal.jsx
│   │   ├── FileInfoBar.jsx            # Hiển thị tên file, kích thước, số trang, đoạn
│   │   ├── FormattedText.jsx          # Render markdown output từ AI
│   │   ├── GlossaryPanel.jsx          # Side panel quản lý từ điển thuật ngữ
│   │   ├── Header.jsx                 # Top bar: logo + Library/Dashboard/Glossary/User
│   │   ├── LoginScreen.jsx            # Layer 1 auth: Google sign-in
│   │   ├── PaidKeyScreen.jsx          # Có thể là legacy/wizard cho paid tier
│   │   ├── PdfProgressModal.jsx       # Progress khi extract PDF
│   │   ├── QuickGuide.jsx             # Inline hướng dẫn
│   │   ├── QuotaBanner.jsx            # Banner cảnh báo quota free tier (250 req/ngày)
│   │   ├── SectionCard.jsx            # Card cho mỗi đoạn: source + translated + review
│   │   ├── ShimmerLoader.jsx
│   │   ├── TabBar.jsx                 # Translation / Review tabs
│   │   ├── UpgradeFromQuotaModal.jsx  # Modal khi hết quota → hướng dẫn paid key
│   │   ├── UpgradeGuideModal.jsx      # Hướng dẫn nâng cấp paid key
│   │   ├── UploadZone.jsx             # Drag-drop PDF
│   │   ├── UrlInputZone.jsx           # Input URL để extract content
│   │   ├── UserBadge.jsx              # Avatar + dropdown
│   │   ├── admin/                     # Admin dashboard (lazy)
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AnalyticsTab.jsx
│   │   │   ├── TicketsTab.jsx         # Feedback tickets
│   │   │   └── UsersTab.jsx
│   │   ├── dashboard/                 # User dashboard
│   │   │   ├── OverviewTab.jsx
│   │   │   ├── DocumentsTab.jsx
│   │   │   ├── ActivityTab.jsx
│   │   │   ├── GlossaryTab.jsx
│   │   │   └── styles.js
│   │   └── library/
│   │       ├── DocumentCard.jsx
│   │       ├── LibraryFilters.jsx
│   │       └── ShareModal.jsx
│   ├── pages/                         # Top-level "page" views (lazy)
│   │   ├── DashboardPage.jsx          # User stats dashboard
│   │   ├── DocumentViewerPage.jsx     # View 1 doc đã lưu
│   │   ├── LibraryPage.jsx            # List tất cả doc đã lưu
│   │   └── SharedDocumentPage.jsx     # Public view qua /share/:id
│   ├── hooks/
│   │   ├── useTheme.js                # Theme context (light/dark?)
│   │   ├── useToast.js                # Sonner wrapper
│   │   └── useTranslationPipeline.js  # ❤️ CORE: dịch + lưu Firestore + glossary
│   ├── services/
│   │   ├── firebase.js                # Init Firebase app (auth/db/storage)
│   │   ├── authService.js             # Google sign-in, anonymous, upgrade-to-google
│   │   ├── userService.js             # CRUD user profile + stats
│   │   ├── aiService.js               # Wrapper mỏng: gọi geminiApi
│   │   ├── geminiApi.js               # fetch/stream Gemini API + retry logic
│   │   ├── claudeApi.js               # Có thể là legacy (chỉ Gemini đang dùng)
│   │   ├── agentPipeline.js           # Pipeline 3 agent: Analyst → Translator → Editor
│   │   ├── apiErrorParser.js          # Parse error → ApiError class với code
│   │   ├── keyDetector.js             # Detect FREE/PAID/UNKNOWN tier qua API call
│   │   ├── pdfExtractor.js            # pdfjs-dist → pages[{page, text}]
│   │   ├── pdfBuilder.jsx             # @react-pdf/renderer → export translated PDF
│   │   ├── pdfMonkeyService.js        # External PDF service?
│   │   ├── urlExtractor.js            # Fetch + parse URL → text
│   │   ├── uploadService.js           # Firebase Storage upload
│   │   ├── glossaryService.js         # Extract terms từ text + merge logic
│   │   ├── masterGlossaryService.js   # Sync glossary → Firestore subcollection
│   │   ├── harmonizerService.js       # ?
│   │   ├── libraryService.js          # CRUD translated_documents + share_links
│   │   ├── activityService.js         # Log events → activity_log subcollection
│   │   ├── analyticsService.js        # Track events (probably to Firestore)
│   │   ├── ticketService.js           # Feedback tickets
│   │   └── adminService.js            # Admin queries (read users/tickets)
│   ├── stores/                        # Zustand
│   │   ├── keyStore.js                # Gemini key + tier + quota tracking (persist)
│   │   └── glossaryStore.js           # Local glossary entries (persist)
│   ├── constants/
│   │   ├── config.js                  # localStorage keys + API URLs + getters/setters
│   │   ├── prompts.js                 # TOPICS, AUDIENCES + getReviewPrompt
│   │   ├── agentPrompts.js            # Analyst/Translator/Editor/QA prompts
│   │   ├── harmonizerPrompt.js
│   │   ├── modelConfig.js             # Model → RPM/RPD limits + tier routing
│   │   ├── apiErrors.js               # API_ERROR_CODES enum + messages
│   │   └── domains.js
│   ├── utils/
│   │   ├── sectionBuilder.js          # Chia PDF thành sections 2000-3000 từ
│   │   ├── fileValidation.js
│   │   ├── textUtils.js               # buildExportText, downloadDocFile, copyToClipboard
│   │   ├── contentCleaner.js
│   │   └── costEstimator.js
│   └── types/                         # JSDoc type defs?
├── public/
├── scripts/
│   └── generate-icons.mjs
├── src-tauri/                         # Tauri 2 desktop config (Rust)
├── plans/
│   └── 20260402-1600-glossary-domain-classification/   # Plan tài liệu
├── firebase.json
├── firestore.rules                    # Security rules cho 5 collections
├── firestore.indexes.json
├── service-account.json               # ⚠️ Firebase admin key (KHÔNG commit)
├── vite.config.js
├── eslint.config.js
├── index.html
└── package.json
```

---

## 3. Kiến trúc & flow chính

### 3.1. Routing (App.jsx)
3 entry points, dựa vào URL:
- `/` (default) → `AppContent` (main workspace)
- `/#admin` → `AdminPage` (lazy, có `AdminGuard`)
- `/share/:shareId` → `SharedDocumentPage` (public read-only view)

Trong `AppContent`, `stage` state quyết định view:
- `idle` — upload zone
- `extracting` — đang đọc PDF
- `ready` — đã có sections, hiển thị toolbar + cards
- `library` — `LibraryPage`
- `viewer` — `DocumentViewerPage`
- `dashboard` — `DashboardPage`

### 3.2. Auth gate 2 lớp (App.jsx:43-118)
`authGate` state:
1. `checking` — đang kiểm tra Firebase auth
2. `login` — chưa đăng nhập → `LoginScreen` (Google sign-in via popup/redirect; anonymous fallback ở `authService.initSession`)
3. `key` — đã đăng nhập nhưng chưa có Gemini API key (kiểm tra `useKeyStore.geminiKey.length > 20`) → `ApiKeyScreen` (nhập key + chọn topic + audience)
4. `ready` — vào app

User profile được sync vào Firestore `users/{uid}` qua `userService.createOrUpdateUser`. Anonymous user có thể upgrade lên Google qua `authService.upgradeToGoogle` (dùng `linkWithPopup`, fallback `signInWithPopup` nếu credential conflict).

### 3.3. PDF / URL ingest
- **PDF:** `handleFileSelected` → `validatePdfFile` → `extractPdfContent` (pdfjs-dist) → `pages: [{page, text}]` → `buildSections` chia thành đoạn 2000-3000 từ tại sentence boundary (xem `sectionBuilder.js`).
- **URL:** `handleUrlExtracted` → fetch + clean → 1 page → `buildSections`.

### 3.4. Translation pipeline (🔥 file quan trọng nhất: `hooks/useTranslationPipeline.js`)

Mỗi section đi qua **3-agent pipeline** (`services/agentPipeline.js`):

```
sectionText
   ↓
[Analyst] gemini-2.5-flash (free) | gemini-2.5-flash-lite (paid)
   → JSON: {documentType, mainTheme, keyPoints, technicalLevel, translationNotes}
   → format thành analystContext string
   ↓
[Translator] QUICK_MODE_MODEL (gemini-2.5-flash) free | gemini-2.5-pro paid
   → prompt: topic + audience + glossary table + analystContext + previousContext
   → STREAMING via SSE (onChunk → throttled 15fps UI update)
   ↓
[Editor] gemini-2.5-flash
   → polish Vietnamese, giữ thuật ngữ
   ↓
result: { translated, rawTranslated, analysis }
```

**Continuity bridging:** `prevContextRef` lưu `originalTail` + `translatedTail` (600 ký tự cuối, cắt tại sentence boundary) của section trước → truyền vào prompt translator/editor để giữ mạch văn liên tục giữa các sections.

**Auto-save:** Mỗi section sau khi dịch xong:
1. `saveTranslatedSection` → `libraryService.updateSection` (Firestore)
2. `extractAndStoreTerms` (background) → glossary store
3. `activityService.log('translation_completed', ...)`

Sau batch: nếu hết tất cả sections → status='complete', merge glossary lên `masterGlossaryService.mergeFromDocument`.

### 3.5. Error handling
- `geminiApi.js` retry 429/5xx với backoff (parse "retry in Xs" từ message).
- `parseGeminiError` → `ApiError` instance có `code` từ `API_ERROR_CODES`.
- STOP_CODES = `[INVALID_KEY, KEY_REVOKED, API_NOT_ENABLED, RATE_LIMIT_RPD]` → dừng batch, không retry.
- `resumeWithNewKey` — sau khi user upgrade key, chỉ dịch lại sections pending/error, rebuild context chain từ section trước đó.

### 3.6. Glossary system
- **Local (Zustand persist):** `glossaryStore.entries` — terms `{id, en, vi, status: suggested|approved|rejected, ...}`.
- **Auto extract:** sau mỗi section translated, `extractTermsFromSection` gọi AI để rút terms.
- **Inject vào prompt:** `getGlossaryPrompt` → tất cả approved terms được nhúng vào prompt translator với chỉ thị "dùng đúng 100%".
- **Master glossary (Firestore):** `master_glossary/{uid}/terms/*` — sync cross-document.

---

## 4. Firebase (Firestore) schema

5 collections (từ `firestore.rules`):

| Collection | Path | Quyền |
|---|---|---|
| `users` | `users/{uid}` | Owner only |
| `translated_documents` | `translated_documents/{docId}` | Owner only |
| `share_links` | `share_links/{linkId}` | Public read, owner write |
| `master_glossary` | `master_glossary/{uid}/terms/{termId}` | Owner only |
| `activity_log` | `activity_log/{uid}/events/{eventId}` | Owner only |

### `translated_documents/{docId}` schema (xem `libraryService.saveDocument`)
```js
{
  id, ownerUid, ownerName, ownerEmail,
  title, customTitle, topic, audience, provider, mode,
  status: 'draft' | 'partial' | 'complete',
  totalSections, completedSections, totalWords, translatedWords,
  sections: [{
    id, title, originalText, translatedText, wordCount,
    status: 'pending' | 'done', lastEditedAt, editHistory: []
  }],
  glossary: [{en, vi}],
  fileMetadata: {name, size, pages},
  shareSettings: {isPublic, shareId, shareUrl, allowRetranslate, expiresAt, viewCount},
  createdAt, updatedAt, completedAt
}
```

⚠️ **Lưu ý 1MB limit của Firestore:** `saveDocument` chỉ lưu `translatedText` (preview 200 ký tự) trong main doc. Full text được lưu per-section qua `updateSection` (mỗi gọi nó pull doc, sửa array, set lại — KHÔNG phải subcollection).

### Sharing
- `createShareLink` → tạo `share_links/{shareId}` (12 ký tự UUID) + update `shareSettings` trong main doc.
- `getSharedDocument(shareId)` → trả về doc data + increment `viewCount`.
- `expiresAt` check ở client.

---

## 5. Configuration & state

### Gemini API key & tier (`stores/keyStore.js`)
- `geminiKey` — lưu trong localStorage qua persist.
- `keyTier`: `'free' | 'paid' | 'unknown'` — detect qua `keyDetector.detectKeyTier` (gọi API thử để xem rate limit headers).
- Free tier quota: **250 req/ngày** (`quotaLimit`).
- Paid tier: **99999** (effectively unlimited).
- `incrementQuota()` được gọi sau mỗi successful Gemini call.
- `quotaDate` reset đầu ngày mới (so sánh `YYYY-MM-DD`).

### Other localStorage keys (`constants/config.js`)
- `vuhai-gemini-api-key`
- `vuhai-topic` (default `'marketing'`)
- `vuhai-audience` (default `'beginner'`)
- `vuhai_key_config` (zustand persist)
- `vuhai_glossary` (zustand persist)

### Topics (`constants/prompts.js`)
`marketing, technology, finance, medical, legal, education, ecommerce, realestate, science, general` — mỗi cái có `TOPIC_EXPERTISE` (terminology hints cho prompt).

### Audiences
- `beginner` — giải thích kèm tiếng Anh, câu ngắn
- `expert` — giữ thuật ngữ chuyên sâu, không simplify
- `explorer` — thêm ghi chú trong `[brackets]`

### Section sizing
- `SECTION_MIN_WORDS=2000`, `SECTION_TARGET=2500`, `SECTION_MAX=3000`
- Cut tại sentence boundary, ưu tiên `\n(?=Chapter|Part|Section|Chương|Phần)` rồi tới `\n\n` rồi tới `.!?` + uppercase.

### Model routing (`constants/modelConfig.js`)
| Tier | Analyst | Translator | Editor | QA |
|---|---|---|---|---|
| Free | flash | flash | flash | flash |
| Paid (standard) | flash-lite | flash | flash-lite | flash |
| Paid (ultra) | flash-lite | **2.5-pro** | flash-lite | pro |
| Quick mode | — | flash | — | — |

`MAX_OUTPUT_TOKENS = 65536`.

---

## 6. Quy ước code

- **JSX, không TypeScript.** ESLint config có `react-hooks` + `react-refresh`.
- **CSS:** dùng CSS variables global trong `src/index.css` (`--color-bg-app`, `--color-primary`, `--font-body`, `--font-heading`, `--radius-lg`, ...). Inline `style={{}}` rất phổ biến.
- **Toast:** dùng `useToast()` hook trả về `{success, error, info, warning}` từ sonner.
- **Lazy loading:** Tất cả page và admin → `lazy(() => import(...).then(m => ({ default: m.X })))` vì các module dùng **named exports**.
- **Tiếng Việt:** UI strings, comments, prompt instructions tới AI — đều bằng tiếng Việt.
- **No semicolons missing, dùng single quotes, 2 spaces indent.**
- **Comments:** ngắn gọn, dùng `// ─── Header ───` để chia block.

---

## 7. Những thứ cần cẩn thận khi tiếp tục

1. **Không commit `service-account.json`** — đây là Firebase Admin SDK private key.
2. **Firestore 1MB document limit** — nếu doc có nhiều sections to thì `updateSection` (pull-modify-set toàn array) sẽ tốn bandwidth và có thể vượt limit. Hiện workaround là chỉ giữ preview 200 ký tự trong main doc, nhưng full `originalText`/`translatedText` vẫn được nhét vào `sections[]` qua `updateSection`. **Có rủi ro hit limit khi doc dài.** Cần migrate sang subcollection nếu cần.
3. **Gemini rate limits free tier:**
   - pro: 5 RPM / 100 RPD
   - flash: 10 RPM / 500 RPD
   - flash-lite: 15 RPM / 1500 RPD
   - Hiện chưa có client-side throttle giữa các section — chỉ dựa vào 429 retry. Có thể cần thêm `MODEL_MIN_INTERVAL_MS` enforcement.
4. **Streaming có thể bị cắt giữa chừng** — `streamGeminiCompletion` trả về partial text nếu read fail mà đã có text.
5. **Anonymous → Google upgrade** có thể fail với `auth/credential-already-in-use` (Google account đã có anonymous khác link sang) — đã có fallback dùng `signInWithPopup`.
6. **State `pdfFile` được tái dùng cho URL** — set `pdfFile = {name: title, size: text.length, pages: 1, sourceUrl, sourceType}` từ URL flow. Naming hơi confusing nhưng dùng để chia sẻ chung downstream code (FileInfoBar, export, library save).
7. **`changeMode` và `translationMode='quick'`** — code có dấu vết của multi-mode (quick/ultra) nhưng đã simplified xuống single mode. `changeMode` là no-op giữ compat.
8. **`claudeApi.js`** tồn tại nhưng `aiService.js` chỉ wrap Gemini — Claude provider đã bị disable, `PROVIDERS` chỉ có gemini.

---

## 7.5. M1 Refactor — Token Optimization (COMPLETE 2026-05-11)

### Trạng thái
- **Branch active:** `refactor/token-optimization`
- **Latest commit:** xem `git log --oneline -1`
- **Smoke test result:** PASS 7/7 — xem `SMOKE_TEST_M1.md`
- **Token saving achieved:** -53.5% (150,459 → 69,987 trên baseline.pdf 3 sections)
- **API calls reduction:** 12 → 3 (default mode no review)

### Architecture changes
1. **Pipeline mới:** `runTranslationPipeline` ở `agentPipeline.js:272` thay thế `runAgentPipeline` (cũ còn tồn tại line 147, sẽ xóa ở M2).
   - 1 call default (translator only)
   - `enableReview: true` → +1 call reviewer (optional)
   - Return shape giữ `analysis: null` cho backward compat
2. **Unified prompt:** `getUnifiedTranslatorPrompt` (English) ở `agentPrompts.js:109` output theo format separator:
   ```
   ---TRANSLATION---
   <vietnamese markdown>
   ---TERMS---
   <JSON array>
   ---END---
   ```
3. **Parse:** `parseStreamedOutput` + `findTranslationEnd` ở `agentPipeline.js:42, 92`.
4. **Stream filter:** `createStreamHandler` ở `useTranslationPipeline.js:164` lọc bỏ phần TERMS khỏi UI khi streaming.
5. **Glossary extraction:** không còn call API riêng. Terms được Gemini extract trong cùng output unified, push thẳng vào `glossaryStore` qua `addEntries` (xem `useTranslationPipeline.js:234-256`).
6. **previousContext:** chỉ còn `translatedTail` (đã bỏ `originalTail` — tiết kiệm ~150 token/section). Build sites: `useTranslationPipeline.js:260, 308, 385, 507`.
7. **DocumentViewerPage.handleRetranslate:** đã fix bug previousContext thiếu (audit E1).
8. **Token logging:** `geminiApi.js:logTokenUsage` log `[GEMINI-TOKENS]` cho mọi call (fetch + stream), parse `usageMetadata.{prompt,candidates,total}TokenCount`.

### Naming convention deviation
Hook `useTranslationPipeline()` export 1 function named `runTranslationPipeline` (batch pipeline, public API). Service `runTranslationPipeline` ở agentPipeline.js trùng tên → import vào hook với alias `runTranslationPipelineService` để tránh shadow conflict. Search-replace cẩn thận khi đụng vào.

### Files đã sửa (M1)
- `src/services/geminiApi.js` — token logging
- `src/services/agentPipeline.js` — parser + new pipeline
- `src/constants/prompts.js` — export TOPIC_EXPERTISE, AUDIENCE_INSTRUCTIONS
- `src/constants/agentPrompts.js` — 2 prompt mới
- `src/hooks/useTranslationPipeline.js` — wire to new pipeline, drop originalTail + glossary call, push newTerms
- `src/pages/DocumentViewerPage.jsx` — migrate + fix previousContext bug

### Code chết còn nguyên (xóa ở M2)
- `runAgentPipeline` ở `agentPipeline.js:147`
- `getAnalystPrompt`, `getEditorPrompt`, `getQAPrompt` ở `agentPrompts.js`
- `getTranslatePrompt` ở `prompts.js` (legacy duplicate)
- `extractTermsFromSection`, `extractAndStoreTerms` helpers
- ~95% của `modelConfig.js` (dead exports `AGENT_MODEL_MAP_*`, `MODEL_RPM`, `MODEL_RPD`, etc.)

### Pre-existing bugs đã note (chưa fix)
- `useTranslationPipeline.js:101+107` — `lastError` scope leak ngoài try-catch (no-undef + no-unused-vars). Fix ở M2 cleanup.

### Next milestone — M2 (Section optimization + cleanup)
1. SECTION_*_WORDS: 2000-3000 → 6000-10000 (target 8000)
2. `generationConfig.temperature: 0.3` + dynamic maxOutputTokens
3. **`thinkingConfig.thinkingBudget: 0`** cho translator (verified hiệu quả vì thinking chiếm 55% sau M1)
4. Cleanup dead code (xem mục trên)
5. Simplify `modelConfig.js` → `MODELS`, `getTranslatorModel`, `getReviewerModel`
6. Fix pre-existing `lastError` bug

---

## 7.6. M2 Refactor — Section Sizing + Thinking Off + Cleanup (COMPLETE 2026-05-11)

### Trạng thái
- Hoàn thành 6 milestone: M2.1 → M2.6 (smoke test + deploy live).
- Token result: **baseline 150,459 → M1 69,987 → M2 ~28k** (≈81% giảm cumulative so với baseline).
- API calls: baseline 12 → M1 3 → **M2 1 call/doc** (test 7.8k từ short-circuit thành 1 section).
- Dead code đã xóa: ~530 dòng across 6 file.

### Architecture changes
- **M2.1** — `SECTION_TARGET_WORDS` 2,500 → 8,000; `SECTION_MAX_WORDS` 3,000 → 10,000 (`constants/config.js`). PDF baseline 7,867 từ → 1 section duy nhất (trước đó 3 sections).
- **M2.2** — `generationConfig.thinkingConfig.thinkingBudget = 0` cho gemini-2.5-flash (Pro luôn thinking, không tắt được); `temperature: 0.3`; `maxOutputTokens` dynamic theo input length thay vì hard 65,536. Thinking từ 55% (M1: 38,608) giảm còn ~0%.
- **M2.3** — `constants/modelConfig.js` rewrite: bỏ 7 export dead (`AGENT_MODEL_MAP*`, `MODEL_RPM`, `MODEL_RPD`, `MODEL_MIN_INTERVAL_MS`, `getAgentModelMap`), thêm 2 getter rõ ràng `getTranslatorModel(keyTier)` + `getReviewerModel(keyTier)`. File 55 → 36 dòng.
- **M2.4a** — Xóa `runAgentPipeline` (3-step legacy) khỏi `services/agentPipeline.js` + 4 hằng số model hardcoded (`ANALYST_MODEL_*`, `EDITOR_MODEL_*`) + 2 helper `parseAnalystResponse`/`formatAnalystContext` + import dead (`buildGlossaryContext`, `useGlossaryStore`, `useKeyStore`, 3 prompt getter). Migrate `runUnifiedTranslator`/`runReviewer` sang `getTranslatorModel`/`getReviewerModel`. File 305 → 152 dòng.
- **M2.4b** — Xóa dead export trong `constants/agentPrompts.js` (`getAnalystPrompt`, `getTranslatorPrompt`, `getEditorPrompt`, `getQAPrompt`, helper `getTopicLabel`) và `constants/prompts.js` (`getTranslatePrompt`, 3 const support `FORMAT_INSTRUCTIONS`/`NEGATIVE_CONSTRAINTS`/`OUTPUT_FORMAT`); xóa `QUICK_MODE_MODEL` khỏi `modelConfig.js`. Tổng -192 dòng across 3 file.
- **M2.4c** — Xóa `extractTermsFromSection` + 2 helper (`buildExtractPrompt`, `parseTermsResponse`) khỏi `services/glossaryService.js` (call site đã bỏ ở M1.5, function giờ orphan). File 126 → 41 dòng.
- **M2.5** — Fix pre-existing bug `lastError` scope leak trong `hooks/useTranslationPipeline.js`: `let lastError;` declared bên trong `for` loop body (fresh binding mỗi iteration) → lift ra ngoài loop + init `null`. Vá ESLint `no-undef` + `no-unused-vars`. Bonus: hint detect (`permission`/`quota`/`size`) trong toast error giờ mới thực sự hoạt động.
- **M2.6** — Smoke test PASS với 7/7 acceptance criteria; ~28k tokens (-81% vs baseline), 1 API call, 47 glossary terms, streaming UX ổn, không regression load doc cũ.

### Files đã sửa (M2)
- `src/constants/config.js` — section sizing (M2.1)
- `src/services/geminiApi.js` — thinking off + temperature + dynamic maxOutputTokens (M2.2)
- `src/constants/modelConfig.js` — rewrite (M2.3, M2.4b)
- `src/services/agentPipeline.js` — remove runAgentPipeline + migrate model getters (M2.4a)
- `src/constants/agentPrompts.js` — remove 5 dead exports + getTopicLabel (M2.4b)
- `src/constants/prompts.js` — remove getTranslatePrompt + 3 dead consts (M2.4b)
- `src/services/glossaryService.js` — remove extractTermsFromSection + 2 helpers (M2.4c)
- `src/hooks/useTranslationPipeline.js` — fix lastError scope (M2.5)
- `SMOKE_TEST_M2.md` — new file, M2.6 acceptance record

### Code lines summary
| File | Trước | Sau | Delta |
|---|---|---|---|
| modelConfig.js | 55 | 26 | -29 |
| agentPipeline.js | 305 | 152 | -153 |
| agentPrompts.js | 169 | 50 | -119 |
| prompts.js | 244 | 181 | -63 |
| glossaryService.js | 126 | 41 | -85 |
| useTranslationPipeline.js | (fix scope) | — | 0 net |
| **Tổng** | — | — | **~-530** |

### Next milestone — M3 (OPTIONAL)
M2 đã chạm gần ceiling. Nếu cần đào sâu thêm:
1. **Monitoring** — log `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`) vào Firestore `analytics_events` để có baseline production thay vì chỉ Console.
2. **Context caching** — Gemini API hỗ trợ cached content cho prompt dài (system prompt + glossary). Section ngắn không lợi nhiều, nhưng doc dài (nhiều sections) sẽ tiết kiệm.
3. **AnalyticsTab admin** — thêm tab "Token Usage" hiển thị chart prompt/output/thinking theo ngày, top consumers, ước tính cost.
4. **Rate limit client-side** — `MODEL_MIN_INTERVAL_MS` đã xóa ở M2.3 nhưng chưa có thay thế; nếu user spam translate cùng key paid (5 RPM Pro) sẽ bị 429. Cân nhắc throttle ở keyStore.

### Deployment status
- **Deployed:** 2026-05-11
- **Production URL:** https://aitranslate.space
- **Bundle hash:** CPXGxylx
- **Backend:** Firebase Hosting (project `vuhai-translate`)
- **Firestore rules:** deployed (no changes from baseline)
- **Tags:**
  - `m1-complete` — after M1.7 smoke test PASS
  - `m2-complete` — after M2.6 close
  - `v1.1.0-token-opt` — release tag
- **Branch policy:** `refactor/token-optimization` đã merge vào `main`. Có thể giữ branch cho lịch sử hoặc xóa local + remote (lệnh: `git branch -d refactor/token-optimization && git push origin --delete refactor/token-optimization`).

### Production smoke test checklist (đã pass)
- [x] HTTP 200 trên aitranslate.space
- [x] Bundle hash match local build
- [x] UI render đúng: 7,867 từ -> 1 section duy nhất
- [x] 1 API call to generativelanguage.googleapis.com
- [x] Token logging visible in Console
- [x] No regression vs M2 functional test (28k tokens, 47 glossary terms)

---

## 8. Commands nhanh khi tiếp tục

```powershell
# Setup
npm install

# Dev
npm run dev

# Build
npm run build

# Lint
npm run lint

# Desktop dev (Tauri)
npm run tauri:dev

# Generate icons (sau khi đổi logo)
npm run icons

# Deploy Firestore rules
firebase deploy --only firestore:rules,firestore:indexes
```

### Env vars (cần `.env.local` hoặc tương đương)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 9. File quan trọng nhất cần đọc trước khi sửa

1. **`src/App.jsx`** (542 dòng) — root routing + auth gate + main workspace state
2. **`src/hooks/useTranslationPipeline.js`** (589 dòng) — translation orchestration + Firestore auto-save
3. **`src/services/agentPipeline.js`** (143 dòng) — 3-agent flow
4. **`src/services/geminiApi.js`** (183 dòng) — API call + retry + streaming
5. **`src/services/libraryService.js`** (235 dòng) — Firestore CRUD
6. **`src/constants/agentPrompts.js`** (105 dòng) — prompts gửi AI
7. **`src/utils/sectionBuilder.js`** (235 dòng) — chia text thành sections
8. **`firestore.rules`** (38 dòng) — security model

---

*End of handoff. Khi tiếp tục: hỏi user về mục tiêu cụ thể, đọc file relevant ở section 9, sau đó mới sửa.*
