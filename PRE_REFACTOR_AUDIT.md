# PRE_REFACTOR_AUDIT — vuhai-ai-translate

> Mục tiêu: verify giả thuyết về codebase hiện tại trước khi refactor để giảm 60% token Gemini API.
> Phạm vi: CHỈ ĐỌC. Không sửa file nào.
> Ngày audit: 2026-05-11

---

## Mục lục (Table of Contents)

- [Nhóm B — Pipeline & Stream architecture](#nhóm-b--pipeline--stream-architecture)
  - [B1 — runAgentPipeline structure](#b1--runagentpipeline-structure)
  - [B2 — Streaming function & throttle](#b2--streaming-function--throttle)
  - [B3 — MAX_OUTPUT_TOKENS & generationConfig](#b3--max_output_tokens--generationconfig)
  - [B4 — previousContext format](#b4--previouscontext-format)
- [Nhóm C — Glossary schema](#nhóm-c--glossary-schema)
  - [C1 — glossaryStore.entries shape](#c1--glossarystoreentries-shape)
  - [C2 — glossaryService functions](#c2--glossaryservice-functions)
  - [C3 — masterGlossaryService schema](#c3--masterglossaryservice-schema)
- [Nhóm D — Constants & Model config](#nhóm-d--constants--model-config)
  - [D1 — agentPrompts exports](#d1--agentprompts-exports)
  - [D2 — prompts.js shapes](#d2--promptsjs-shapes)
  - [D3 — modelConfig exports & usage](#d3--modelconfig-exports--usage)
  - [D4 — config.js constants](#d4--configjs-constants)
- [Nhóm E — Call sites & Backward compat](#nhóm-e--call-sites--backward-compat)
  - [E1 — Impact search](#e1--impact-search)
  - [E2 — useTranslationPipeline internals](#e2--usetranslationpipeline-internals)
  - [E3 — Viewer/Library schema reads](#e3--viewerlibrary-schema-reads)
- [Nhóm F — Analytics & Logging](#nhóm-f--analytics--logging)
  - [F1 — analyticsService API](#f1--analyticsservice-api)
  - [F2 — Token usage tracking](#f2--token-usage-tracking)
  - [F3 — AnalyticsTab fields](#f3--analyticstab-fields)
- [Tóm tắt phát hiện bất thường](#tóm-tắt-phát-hiện-bất-thường)

---

## Nhóm B — Pipeline & Stream architecture

### B1 — runAgentPipeline structure
- **Kết luận**: YES (có 3 bước, có parser & formatter cho analyst, có `extractTail`)
- **Bằng chứng**: [src/services/agentPipeline.js](src/services/agentPipeline.js)
  - Khai báo: `agentPipeline.js:70` `export async function runAgentPipeline(sectionText, config, onProgress, options = {})`
  - 3 bước:
    1. **Analyst** (`agentPipeline.js:84-97`) → `fetchAICompletion(analystPrompt, sectionText, {model: analystModel})` → `parseAnalystResponse` → `formatAnalystContext`
    2. **Translator** (`agentPipeline.js:102-119`) → `streamAICompletion` (nếu có `onStreamChunk`) hoặc `fetchAICompletion`
    3. **Editor** (`agentPipeline.js:124-135`) → `fetchAICompletion(editorPrompt, translatedText, {model: editorModel})`
  - Model routing (`agentPipeline.js:75-78`):
    ```js
    const translatorModel = keyTier === 'paid' ? 'gemini-2.5-pro' : QUICK_MODE_MODEL;
    const analystModel = keyTier === 'paid' ? ANALYST_MODEL_PAID : ANALYST_MODEL_FREE;
    const editorModel = keyTier === 'paid' ? EDITOR_MODEL_PAID : EDITOR_MODEL_FREE;
    ```
    Với các hằng số khai báo cứng trong cùng file (`agentPipeline.js:8-11`):
    ```js
    const ANALYST_MODEL_PAID = 'gemini-2.5-flash-lite';
    const ANALYST_MODEL_FREE = 'gemini-2.5-flash';
    const EDITOR_MODEL_PAID  = 'gemini-2.5-flash';
    const EDITOR_MODEL_FREE  = 'gemini-2.5-flash';
    ```
  - `parseAnalystResponse` (`agentPipeline.js:30-40`) — strip ```` ```json ```` fence rồi `JSON.parse`.
  - `formatAnalystContext` (`agentPipeline.js:45-57`) — concat các field của analysis thành string nhiều dòng có prefix tiếng Việt.
  - Analyst output structure (theo prompt `agentPrompts.js:8-20`): `{documentType, mainTheme, keyPoints[], technicalLevel, translationNotes[], structureNotes}`.
  - `extractTail` (`agentPipeline.js:19-25`): cắt 600 ký tự cuối, tìm sentence boundary đầu tiên qua regex `/\n\n|(?<=[.!?])\s/`, trả về phần sau boundary đó (`.trim()`). Nếu không tìm thấy boundary, dùng nguyên `tail`.
- **Ảnh hưởng refactor**: Việc giảm token có thể nhắm vào analyst (1 call) hoặc editor (1 call) — cả hai đều `try/catch` silent (skip nếu lỗi), nên có thể bật/tắt bằng feature flag mà không break translator. Models hardcoded trong file thay vì đọc từ `modelConfig.js` → cần dedup.

### B2 — Streaming function & throttle
- **Kết luận**: PARTIAL (function tồn tại đúng signature; throttle 66ms KHÔNG ở geminiApi.js mà ở hook)
- **Bằng chứng**:
  - Tên function: `streamGeminiCompletion` ở [src/services/geminiApi.js:73](src/services/geminiApi.js#L73). Signature đầy đủ:
    ```js
    export async function streamGeminiCompletion(
      systemPrompt, userText,
      { signal, onChunk, maxRetries = 3, model } = {}
    )
    ```
  - Wrapper: `streamAICompletion` ở [src/services/aiService.js:14](src/services/aiService.js#L14) chỉ pass-through.
  - **Throttle 66ms ở [src/hooks/useTranslationPipeline.js:158-173](src/hooks/useTranslationPipeline.js#L158)** — không ở geminiApi:
    ```js
    const streamThrottleRef = useRef({});
    const createStreamHandler = useCallback((sectionId) => {
      return (_chunk, fullText) => {
        const now = Date.now();
        const last = streamThrottleRef.current[sectionId] || 0;
        if (now - last < 66) return;            // ← throttle 66ms (~15fps)
        streamThrottleRef.current[sectionId] = now;
        setSectionStates(prev => ({ ... streamingTranslated: fullText }));
      };
    }, []);
    ```
    Cơ chế: `setTimeout`-free — chỉ check `Date.now()` delta, **drop intermediate chunks**, không gom lại.
  - `onChunk` signature: `(chunk: string, fullText: string)` — 2 args, đều là `string` (xem `geminiApi.js:121` và `geminiApi.js:140`):
    ```js
    onChunk?.(chunk, fullText);
    ```
    KHÔNG phải object `{type, text}`.
  - Stream emit ngay khi nhận được mỗi SSE event (`geminiApi.js:101-126`): đọc reader → parse line `data: {...}` → trích `data.candidates[0].content.parts[0].text` → gọi `onChunk` ngay. Có buffer nhưng chỉ để gom dòng SSE chưa hoàn chỉnh (giữ phần cuối sau `split('\n')`).
- **Ảnh hưởng refactor**: Throttle nằm ở consumer (hook), nên có thể giảm số lượng setState mà không phải đổi API layer. Nếu muốn batch chunks để tiết kiệm UI rerender — đã có sẵn; muốn streaming tốt hơn cho UX có thể nâng từ 66ms → adaptive.

### B3 — MAX_OUTPUT_TOKENS & generationConfig
- **Kết luận**: PARTIAL (có maxOutputTokens, KHÔNG có temperature)
- **Bằng chứng**:
  - `MAX_OUTPUT_TOKENS = 65536` tại [src/constants/config.js:4](src/constants/config.js#L4).
  - Dùng tại [src/services/geminiApi.js:18](src/services/geminiApi.js#L18) (fetch) và [src/services/geminiApi.js:86](src/services/geminiApi.js#L86) (stream):
    ```js
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS }
    ```
  - Grep `temperature` toàn bộ `src/` → KHÔNG có match.
  - `keyDetector.js:25` cũng dùng `generationConfig: { maxOutputTokens: 1 }` cho detect call.
- **Ảnh hưởng refactor**: Không có `temperature` → mặc định Gemini (~1.0). Translation cần determinism cao nên có thể giảm token bằng cách set `temperature: 0.2-0.3` + `topP` thấp. `maxOutputTokens=65536` rất rộng → an toàn, không bottleneck.

### B4 — previousContext format
- **Kết luận**: YES (cắt 600 ký tự, pass vào translator + editor prompt)
- **Bằng chứng**:
  - Constant: [src/services/agentPipeline.js:14](src/services/agentPipeline.js#L14) `const CONTEXT_TAIL_CHARS = 600;`
  - `extractTail(text, maxChars = 600)` — `agentPipeline.js:19-25`. Nếu `text.length <= 600` trả về nguyên. Ngược lại slice 600 ký tự cuối, search sentence break `\n\n|(?<=[.!?])\s`, cắt sau boundary đó.
  - Shape của `previousContext`: `{ originalTail: string, translatedTail: string }` (`agentPipeline.js:66` comment + `useTranslationPipeline.js:211-213` build).
  - Inject vào **2 prompt** — translator và editor:
    - **Translator prompt** (`agentPrompts.js:32-40`):
      ```
      BỐI CẢNH LIÊN TỤC — Đoạn trước (để hiểu mạch văn, KHÔNG dịch lại):
      --- CUỐI ĐOẠN TRƯỚC (gốc) ---
      ${previousContext.originalTail}
      --- CUỐI ĐOẠN TRƯỚC (đã dịch) ---
      ${previousContext.translatedTail}
      ---
      Hãy dịch đoạn mới bên dưới sao cho mạch văn NỐI TIẾP tự nhiên...
      ```
    - **Editor prompt** (`agentPrompts.js:58-64`) chỉ dùng `translatedTail`:
      ```
      BỐI CẢNH LIÊN TỤC — Cuối bản dịch đoạn trước:
      ---
      ${previousContext.translatedTail}
      ---
      ```
- **Ảnh hưởng refactor**: 600 ký tự × 2 (original+translated) = ~1.2k chars ≈ ~400 tokens overhead **mỗi section** ở translator + ~200 tokens ở editor → **~600 tokens duplicate context cost / section**. Giảm xuống 300 ký tự hoặc chỉ pass `translatedTail` cho translator có thể save 30-40% prompt overhead trong batch.

---

## Nhóm C — Glossary schema

### C1 — glossaryStore.entries shape
- **Kết luận**: YES (shape rõ ràng, không có validation runtime)
- **Bằng chứng**:
  - Element shape (từ `glossaryService.js:46-58` trong `parseTermsResponse`):
    ```js
    {
      id: string,            // crypto.randomUUID()
      termEN: string,
      termVI: string,
      termVIAlts: string[],
      topic: string,         // topic id
      context: string,
      notes: string,
      status: 'suggested' | 'approved' | 'rejected',
      usageCount: number,    // start 1
      createdAt: number,     // Date.now()
      updatedAt: number,
    }
    ```
  - `addEntries(arr)` ([src/stores/glossaryStore.js:9-15](src/stores/glossaryStore.js#L9)) **KHÔNG validate shape**, chỉ check `newEntries.length`, rồi gọi `mergeNewTerms(get().entries, newEntries)` và set lại.
  - localStorage key: `vuhai_glossary` ([src/stores/glossaryStore.js:65](src/stores/glossaryStore.js#L65)) qua zustand `persist`.
- **Ảnh hưởng refactor**: Schema được implicit định nghĩa ở 2 nơi (parser + store). Nếu đổi shape (vd thêm field `domain` hoặc gộp `termVIAlts`), cần đổi cả parser, `buildGlossaryContext`, `mergeNewTerms` (dedup theo `termEN.toLowerCase()`), và mọi nơi đọc.

### C2 — glossaryService functions
- **Kết luận**: YES (có gọi Gemini riêng cho extract; 3 helper export)
- **Bằng chứng** ([src/services/glossaryService.js](src/services/glossaryService.js)):
  - `extractTermsFromSection(sectionText, topic, options = {})` (`glossaryService.js:68-76`) → **CÓ gọi Gemini riêng** qua `fetchAICompletion(buildExtractPrompt(topic), sectionText, options)`. Đây là **1 call API thêm mỗi section** (ngoài 3 call của pipeline). Return: `GlossaryEntry[]` (shape ở C1) hoặc `[]` nếu fail.
  - `buildGlossaryContext(entries)` (`glossaryService.js:82-96`) — filter `status === 'approved'`, sort theo `termEN`, return markdown table `| English | Vietnamese | Ghi chú |` (string). Empty string nếu không có approved.
  - `mergeNewTerms(existing, newTerms)` (`glossaryService.js:102-125`) — dedup theo `termEN.toLowerCase()`. Nếu trùng: tăng `usageCount` + update `updatedAt`. Trả về **mảng mới**.
  - `getGlossaryPrompt()` thực ra ở [src/stores/glossaryStore.js:55-59](src/stores/glossaryStore.js#L55) (KHÔNG ở `glossaryService.js`):
    ```js
    getGlossaryPrompt: () => {
      const context = buildGlossaryContext(get().entries);
      if (!context) return '';
      return `\n---\nBẢNG THUẬT NGỮ BẮT BUỘC (dùng đúng 100%, không dịch khác):\n${context}`;
    }
    ```
  - Extract prompt return shape per term (theo JSON prompt `glossaryService.js:13-21`):
    ```json
    { "termEN", "termVI", "termVIAlts": [], "context", "notes" }
    ```
    Sau đó `parseTermsResponse` enrich thêm `id, topic, status='suggested', usageCount=1, createdAt, updatedAt`.
- **Ảnh hưởng refactor**: 🔥 **Mỗi section dịch xong sẽ tốn thêm 1 call Gemini cho extract terms** (xem `useTranslationPipeline.js:239-241`: gọi background không block). Đây là **chi phí ẩn lớn** — có thể disable theo flag, hoặc batch (gộp nhiều section gọi 1 lần), hoặc chỉ extract khi user explicitly request.

### C3 — masterGlossaryService schema
- **Kết luận**: YES
- **Bằng chứng** ([src/services/masterGlossaryService.js:40-90](src/services/masterGlossaryService.js#L40)):
  - Đường dẫn collection: `master_glossary/{uid}/terms/{termId}` (`masterGlossaryService.js:7`).
  - `mergeFromDocument(documentGlossary, documentId, documentTitle)`:
    - **Đọc**: query toàn bộ `master_glossary/{uid}/terms` qua `getAll()` (sort by `termEN`).
    - **Ghi** (per term) — write batch:
      ```js
      {
        id, ownerUid, termEN, termVI,
        termVIAlts: [],
        topic: 'general' (fallback),
        notes: '',
        status: 'suggested' | 'approved',
        sourceDocumentId, sourceDocumentTitle,
        usageCount: 1,
        createdAt, updatedAt
      }
      ```
    - **Update** khi trùng `termEN` (case-insensitive): chỉ tăng `usageCount` và `updatedAt`.
  - Backward-compat: chấp nhận cả `entry.termEN || entry.en` và `entry.termVI || entry.vi` (`masterGlossaryService.js:51-52`).
- **Ảnh hưởng refactor**: Schema đã ổn định, không có index Firestore phụ thuộc field nào ngoài `orderBy('termEN')`. Nếu refactor thêm field (e.g. `domain`), an toàn vì `setDoc({merge: true})`.

---

## Nhóm D — Constants & Model config

### D1 — agentPrompts exports
- **Kết luận**: YES (4 function export, không có constant export)
- **Bằng chứng** ([src/constants/agentPrompts.js](src/constants/agentPrompts.js)):
  - Tất cả exports:
    - `export function getAnalystPrompt(topic)` — line 7
    - `export function getTranslatorPrompt(topic, audience, glossaryTable, analystOutput, previousContext)` — line 23
    - `export function getEditorPrompt(topic, previousContext)` — line 57
    - `export function getQAPrompt(topic, glossaryTable)` — line 83
  - Không có export constant nào. Có 1 helper internal: `function getTopicLabel(topicId)` (line 3, không export).
  - **`getQAPrompt` được export nhưng KHÔNG có import nào** trong codebase (grep verify) → dead code.
- **Ảnh hưởng refactor**: `getQAPrompt` có thể xóa an toàn (-21 lines). Signature của `getTranslatorPrompt` nhận 5 args theo positional — nếu thêm/bớt arg cần update call site duy nhất ở `agentPipeline.js:104`.

### D2 — prompts.js shapes
- **Kết luận**: YES (tất cả 3 field có; 10 topics)
- **Bằng chứng** ([src/constants/prompts.js](src/constants/prompts.js)):
  - `TOPIC_EXPERTISE` shape (`prompts.js:78-129`): **CÓ đầy đủ** `expertise`, `tone`, `terms` cho mỗi entry. Verify với marketing entry (`prompts.js:79-83`):
    ```js
    marketing: {
      expertise: `advertising language, marketing terminology...`,
      tone: `natural, persuasive yet professional tone...`,
      terms: `Keep common marketing terms in English...`,
    }
    ```
    Lưu ý: `TOPIC_EXPERTISE` được khai báo với `const` (không `export`) — chỉ dùng nội bộ qua `getTranslatePrompt`/`getReviewPrompt`.
  - `AUDIENCE_INSTRUCTIONS` shape (`prompts.js:23-61`): **CÓ đầy đủ** `translate` và `review` cho mỗi entry (`beginner`, `expert`, `explorer`). Cũng `const`, không export.
  - 10 topic keys: `marketing, technology, finance, medical, legal, education, ecommerce, realestate, science, general`.
  - Exports: `AUDIENCES` (array), `TOPICS` (array), `getTranslatePrompt`, `getReviewPrompt`. Lưu ý `getTranslatePrompt` được export nhưng **KHÔNG dùng ở đâu** (pipeline dùng `getTranslatorPrompt` ở `agentPrompts.js`). `getReviewPrompt` thì có dùng tại `useTranslationPipeline.js:299, 423`.
- **Ảnh hưởng refactor**: `getTranslatePrompt` là dead code (≈30 lines). Có chồng chéo giữa `getTranslatePrompt` (prompts.js) và `getTranslatorPrompt` (agentPrompts.js) — confusing naming, cần xóa cái thừa.

### D3 — modelConfig exports & usage
- **Kết luận**: PARTIAL (nhiều export là dead code)
- **Bằng chứng** ([src/constants/modelConfig.js](src/constants/modelConfig.js)):
  - Tất cả exports:
    - `AGENT_MODEL_MAP_FREE` (line 4)
    - `AGENT_MODEL_MAP` (line 12)
    - `AGENT_MODEL_MAP_ULTRA` (line 20)
    - `QUICK_MODE_MODEL = 'gemini-2.5-flash'` (line 28)
    - `MODEL_RPM` (line 31)
    - `MODEL_RPD` (line 37)
    - `MODEL_MIN_INTERVAL_MS` (line 43)
    - `getAgentModelMap(keyTier, quality)` (line 50)
  - Usage qua grep toàn bộ `src/`:
    - `QUICK_MODE_MODEL` → import 1 nơi: `agentPipeline.js:6` (line 76 sử dụng làm translator cho free tier).
    - `AGENT_MODEL_MAP_ULTRA` → **chỉ tồn tại trong `modelConfig.js` (lines 20, 52)**, KHÔNG import ngoài file → **dead code**.
    - `AGENT_MODEL_MAP_FREE` / `AGENT_MODEL_MAP` → cũng chỉ ở `modelConfig.js`, không có import ngoài → **dead code**.
    - `MODEL_MIN_INTERVAL_MS` → grep toàn `src/` chỉ thấy ở `modelConfig.js:43`, **KHÔNG ai import** → **dead code** (đã ghi nhận trong handoff.md nhưng confirm: client-side throttle chưa enforce).
    - `MODEL_RPM` / `MODEL_RPD` → grep không thấy import → **dead code**.
    - `getAgentModelMap` → grep không thấy import → **dead code**.
  - `agentPipeline.js` dùng hằng số nội bộ (ANALYST_MODEL_PAID/FREE, EDITOR_MODEL_PAID/FREE) thay vì đọc từ `modelConfig.js` → trùng lặp.
- **Ảnh hưởng refactor**: ~95% của `modelConfig.js` là dead code. Refactor có thể: (a) xóa hết unused exports; (b) hoặc rewire `agentPipeline.js` để dùng `getAgentModelMap()` → đơn nguồn sự thật. Option (b) tốt hơn cho việc nâng cấp model sau này.

### D4 — config.js constants
- **Kết luận**: YES
- **Bằng chứng** ([src/constants/config.js](src/constants/config.js)):
  - Section sizing (lines 71-73):
    - `SECTION_MIN_WORDS = 2000`
    - `SECTION_MAX_WORDS = 3000`
    - `SECTION_TARGET_WORDS = 2500`
  - `MAX_OUTPUT_TOKENS = 65536` (line 4).
  - `MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024` (= 100MB, line 3).
  - `GEMINI_MODEL = 'gemini-2.5-pro'` (line 21) — default model nếu không truyền explicit.
  - localStorage keys:
    - `API_KEY_STORAGE_KEY = 'vuhai-gemini-api-key'` (line 22)
    - `TOPIC_STORAGE_KEY = 'vuhai-topic'` (line 49) — default `'marketing'`
    - `AUDIENCE_STORAGE_KEY = 'vuhai-audience'` (line 60) — default `'beginner'`
    - (gián tiếp qua zustand persist): `vuhai_key_config` ([keyStore.js:99](src/stores/keyStore.js#L99)), `vuhai_glossary` ([glossaryStore.js:65](src/stores/glossaryStore.js#L65)).
  - `getProvider()` luôn return `'gemini'` (line 8) — `setProvider()` là no-op (line 11). Multi-provider đã bị disable.
- **Ảnh hưởng refactor**: Section 2000-3000 từ → mỗi section vào ~3-4k tokens input. Giảm section size có thể tăng số call API. Giảm `MAX_OUTPUT_TOKENS` xuống ~16k (đủ cho output ~10k tokens) không ảnh hưởng vì Gemini không charge theo `maxOutputTokens` mà theo output thực.

---

## Nhóm E — Call sites & Backward compat

### E1 — Impact search
- **Kết luận**: YES (số call site nhỏ, an toàn refactor)
- **Bằng chứng** (grep toàn `src/`):
  - **`runAgentPipeline`** — 2 import + 2 call:
    - [src/hooks/useTranslationPipeline.js:4](src/hooks/useTranslationPipeline.js#L4) (import) và line 196 (call trong `runSectionTranslation`)
    - [src/pages/DocumentViewerPage.jsx:3](src/pages/DocumentViewerPage.jsx#L3) (import) và line 56 (call trong `handleRetranslate`) — ⚠️ **gọi mà KHÔNG truyền `previousContext`** → mỗi section "dịch lại" trong viewer mất context với section trước.
  - **`originalTail` / `translatedTail`** — 11 vị trí:
    - `agentPipeline.js:66` (doc comment shape)
    - `agentPrompts.js:35, 37, 61` (inject vào prompt)
    - `useTranslationPipeline.js:211-212, 266-267, 345-346, 469-470` (4 nơi build object, đều cùng pattern `{originalTail: extractTail(source), translatedTail: extractTail(state.translated)}`)
  - **`extractTermsFromSection`** — 1 import + 1 call:
    - [src/hooks/useTranslationPipeline.js:5](src/hooks/useTranslationPipeline.js#L5) (import) và line 26 (gọi từ helper `extractAndStoreTerms`, được trigger ở line 239 trong `runSectionTranslation` background — không block).
- **Ảnh hưởng refactor**:
  - Đổi shape `previousContext` → cập nhật 4 build site trong hook + 2 inject site trong prompt + 1 type-comment.
  - Disable extract terms → chỉ comment dòng 239-241 ở hook.
  - Sửa `runAgentPipeline` signature → cập nhật 2 call site (chú ý `DocumentViewerPage` truyền config thiếu mode default).

### E2 — useTranslationPipeline internals
- **Kết luận**: YES
- **Bằng chứng** ([src/hooks/useTranslationPipeline.js](src/hooks/useTranslationPipeline.js)):
  - **`resumeWithNewKey` rebuild prevContextRef** (lines 462-475):
    ```js
    const firstPendingIdx = sections.indexOf(pending[0]);
    if (firstPendingIdx > 0) {
      const prevSection = sections[firstPendingIdx - 1];
      const prevState = sectionStates[prevSection.id];
      if (prevState?.translated) {
        const prevSource = prevSection.text || prevSection.pages?.map(p => p.text).join('\n\n') || '';
        prevContextRef.current = {
          originalTail: extractTail(prevSource),
          translatedTail: extractTail(prevState.translated),
        };
      }
    } else { prevContextRef.current = null; }
    ```
    → Đọc field: `prevSection.text || prevSection.pages[].text` (source) và `prevState.translated` (output từ pipeline).
  - **`runSectionTranslation` push terms vào glossary** (lines 238-242):
    ```js
    extractAndStoreTerms(sourceText, getTopic()).then(count => {
      if (count > 0) setGlossaryNotice(prev => (prev || 0) + count);
    });
    ```
    `extractAndStoreTerms` (lines 24-30) gọi `extractTermsFromSection` → `useGlossaryStore.getState().addEntries(terms)` → return số term mới thêm (delta length).
  - **`saveTranslatedSection` Firestore shape** (lines 124-134):
    ```js
    await libraryService.updateSection(libraryDocIdRef.current, section.id, {
      id: section.id,
      title: section.title || '',
      originalText: sourceText,
      translatedText: result.translated || '',
      wordCount: sourceText.split(/\s+/).filter(Boolean).length,
      status: 'done',
      lastEditedAt: Date.now(),
      editHistory: [],
    });
    ```
    → ⚠️ Mỗi gọi `updateSection` sẽ pull cả doc → modify array → set lại (xem `libraryService.js:46-71`). Trên doc dài thì rất tốn.
- **Ảnh hưởng refactor**: Khi đổi shape `previousContext`, sửa cùng pattern ở 4 nơi (đã list ở E1). Khi disable extract terms, dòng 239-241 có thể wrap bằng feature flag.

### E3 — Viewer/Library schema reads
- **Kết luận**: YES (viewer đọc nhiều field, sẽ break nếu schema đổi)
- **Bằng chứng**:
  - [src/pages/DocumentViewerPage.jsx](src/pages/DocumentViewerPage.jsx) đọc các field section sau:
    - `section.id` (key)
    - `section.title` (line 148)
    - `section.status === 'done'` (line 137 — render dot done)
    - `section.lastEditedAt` (line 150 — badge "Sửa")
    - `section.translatedText` (lines 41, 197, 222, 224)
    - `section.originalText` (line 56, 235)
    - `section.editHistory` (line 188, 241)
  - Document-level: `document.totalSections`, `document.completedSections`, `document.topic`, `document.customTitle`, `document.title`, `document.mode`, `document.fileMetadata.pages`, `document.shareSettings`.
  - [src/pages/LibraryPage.jsx](src/pages/LibraryPage.jsx) chỉ pass `doc.id, doc.customTitle` qua handlers → dùng `DocumentCard` để render. Không đọc trực tiếp `sections[]`.
  - Nếu refactor section schema (bỏ `originalText`/`translatedText`, đổi thành subcollection), **viewer sẽ break** ở cả 3 tab (translated/original/history) và retranslate. Library page an toàn vì không đọc per-section.
- **Ảnh hưởng refactor**:
  - Nếu giữ shape current → an toàn.
  - Nếu migrate sang Firestore subcollection (giải quyết 1MB limit): cần update viewer để fetch lazy per-section.
  - `DocumentViewerPage.handleRetranslate` (line 56) gọi `runAgentPipeline` với chỉ `{topic, audience, mode}` — không `previousContext`, không `onProgress`, không `onStreamChunk`. Nếu refactor signature, kiểm tra backward compat hoặc explicit wrapper.

---

## Nhóm F — Analytics & Logging

### F1 — analyticsService API
- **Kết luận**: PARTIAL (chỉ 1 method `track`, không có `getEvents` hay aggregator client-side)
- **Bằng chứng** ([src/services/analyticsService.js](src/services/analyticsService.js)):
  - Exports: `analyticsService = { track }` — 1 method duy nhất (lines 37-58).
  - Signature: `async track(eventName, properties = {})` — push lên Firestore collection `analytics_events` với schema:
    ```js
    {
      eventName, uid, isAnonymous,
      timestamp: serverTimestamp(),
      date: 'YYYY-MM-DD',
      sessionId,
      properties: sanitizeProperties(props)   // strip apiKey/content/text
    }
    ```
  - Whitelist event names (lines 4-18): 13 event names (không có `translation_complete` cho từng section, chỉ `translation_start`).
  - Anonymous user **sẽ KHÔNG được tracked**: `if (!user) return;` cho non-existent, nhưng anonymous user vẫn có `user.uid` → vẫn được log với `isAnonymous: true`.
  - Phía admin: `adminService.getEventCounts(days)`, `getDailyActiveUsers(days)`, `getTotalUserCount()` (xem `AnalyticsTab.jsx:39-43`).
- **Ảnh hưởng refactor**: Để track token usage hiện tại cần (1) thêm event vào whitelist; (2) thêm field `tokens` vào `properties`; (3) update `AnalyticsTab` để aggregate.

### F2 — Token usage tracking
- **Kết luận**: NO (chưa có)
- **Bằng chứng**:
  - Grep `usageMetadata` toàn `src/` → **0 match**.
  - `geminiApi.js:27-32` chỉ extract `data.candidates[0].content.parts[0].text`, không đọc `data.usageMetadata.promptTokenCount` hay `candidatesTokenCount`.
  - `useKeyStore.incrementQuota()` chỉ +1 mỗi request, không track tokens.
- **Ảnh hưởng refactor**: 🔥 **Không có baseline measurement** cho mục tiêu "giảm 60% token". Cần thêm:
  1. `geminiApi.js` đọc `data.usageMetadata` (Gemini response chuẩn có field này: `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`).
  2. Lưu vào keyStore hoặc analytics để đo before/after.
  3. Stream API cũng emit `usageMetadata` ở chunk cuối → cần parse riêng.

### F3 — AnalyticsTab fields
- **Kết luận**: NO (chỉ event count + DAU; KHÔNG có token usage)
- **Bằng chứng** ([src/components/admin/AnalyticsTab.jsx](src/components/admin/AnalyticsTab.jsx)):
  - Query qua `adminService`:
    - `getTotalUserCount()` → `{anonymous, registered, total}`
    - `getEventCounts(days)` → `{eventName: count, ...}`
    - `getDailyActiveUsers(days)` → `[{date, dau}, ...]`
  - Render: 4 StatCards (total users / registered / translations / pdf uploads), LineChart DAU, table top events.
  - **Không có UI cho token usage, không có chart cost, không có metric prompt/candidate token**.
- **Ảnh hưởng refactor**: Cần thêm tab "Token Usage" mới (hoặc card mới) sau khi có baseline measurement từ F2.

---

## Tóm tắt phát hiện bất thường

So với giả thuyết trong file câu hỏi:

1. ✅ **B1 verified** — `runAgentPipeline` đúng 3 bước Analyst→Translator→Editor, có parse + format analyst output.
2. ⚠️ **B2 partial** — Throttle 66ms **KHÔNG** ở `geminiApi.js` mà ở [useTranslationPipeline.js:158-173](src/hooks/useTranslationPipeline.js#L158). Cơ chế: drop chunks bằng `Date.now()` delta, không dùng `setTimeout`/`rAF`/lodash. `onChunk` nhận **2 args** `(chunk, fullText)`, không phải object.
3. ⚠️ **B3 partial** — Có `maxOutputTokens=65536` nhưng **KHÔNG có `temperature`** (Gemini dùng default ~1.0). Đây là thiếu sót cho dịch thuật cần determinism.
4. ✅ **B4 verified** — `extractTail` cắt 600 ký tự + sentence boundary. Pass vào **cả translator và editor prompt** (không chỉ translator).
5. ⚠️ **C1 partial** — Element shape có 11 fields (nhiều hơn giả thuyết). `addEntries` **KHÔNG validate** input.
6. 🔥 **C2 critical** — `extractTermsFromSection` **gọi Gemini API riêng cho mỗi section** (background, không block) → **chi phí ẩn ~25% mỗi section** ngoài 3 call pipeline. Đây là điểm tiềm năng cao để giảm token.
7. ⚠️ **D1 partial** — `getQAPrompt` được export nhưng **dead code** (-21 lines tiềm năng). Có 4 function export, không có constant export.
8. ⚠️ **D2 partial** — `getTranslatePrompt` (ở `prompts.js`) **dead code** — duplicate với `getTranslatorPrompt` (ở `agentPrompts.js`). Confusing naming.
9. 🔥 **D3 critical** — **~95% của `modelConfig.js` là dead code**: `AGENT_MODEL_MAP_FREE`, `AGENT_MODEL_MAP`, `AGENT_MODEL_MAP_ULTRA`, `MODEL_RPM`, `MODEL_RPD`, `MODEL_MIN_INTERVAL_MS`, `getAgentModelMap` đều **không có import nào** ngoài file. Models thực tế hardcoded trong `agentPipeline.js:8-11`.
10. ✅ **D4 verified** — Section 2000-3000 từ, `MAX_OUTPUT_TOKENS=65536`, localStorage keys đầy đủ.
11. ⚠️ **E1 critical** — `DocumentViewerPage.handleRetranslate` (line 56) gọi `runAgentPipeline` **không truyền `previousContext`** → mỗi lần "dịch lại" 1 section trong viewer sẽ mất continuity với section trước.
12. ✅ **E2 verified** — Schema save Firestore khớp giả thuyết.
13. ⚠️ **E3 risk** — Nếu refactor section schema (chuyển sang subcollection cho 1MB issue), `DocumentViewerPage` đọc 6 field per-section sẽ break. Library page an toàn.
14. ✅ **F1 partial** — Chỉ 1 method `track`; whitelist 13 event names; anonymous user **VẪN được track** (không như có thể hiểu nhầm là không track).
15. 🔥 **F2 critical** — **Hoàn toàn không track token usage**. `usageMetadata` không được đọc từ Gemini response. Không có baseline → cần thêm trước khi refactor để đo lường mục tiêu 60%.
16. 🔥 **F3 critical** — Admin AnalyticsTab không hiển thị token usage. Sau khi thêm F2, cần update F3 để visualize.

### Khuyến nghị ưu tiên trước refactor

| Ưu tiên | Hành động | Lý do |
|---|---|---|
| P0 | Thêm token usage tracking (`usageMetadata` parse) | Không có baseline thì không đo được 60% |
| P0 | Disable / batch `extractTermsFromSection` qua flag | Tiết kiệm ~25% calls/section ngay lập tức |
| P1 | Bỏ analyst hoặc editor bằng flag (cả 2 đều silent-fail) | Tiết kiệm 1 trong 3 call/section ~33% |
| P1 | Set `temperature: 0.2-0.3` + `topP: 0.8` | Giảm output token vì ít rephrase |
| P1 | Giảm `CONTEXT_TAIL_CHARS` từ 600 → 300 | Tiết kiệm ~50% context overhead/section |
| P2 | Xóa dead code `modelConfig.js` + `getQAPrompt` + `getTranslatePrompt` | Sạch code, dễ refactor |
| P2 | Fix `DocumentViewerPage.handleRetranslate` truyền previousContext | Bug có sẵn về continuity |
| P3 | Migrate `sections[]` → Firestore subcollection | Giải quyết 1MB limit, không liên quan token |

---

*End of audit. Tất cả file gốc KHÔNG bị sửa đổi.*
