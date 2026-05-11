import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { fetchAICompletion } from '../services/aiService';
import {
  runTranslationPipeline as runTranslationPipelineService,
  extractTail,
  findTranslationEnd,
} from '../services/agentPipeline.js';
import { getReviewPrompt } from '../constants/prompts';
import { getTopic, getAudience, getProvider } from '../constants/config';
import useGlossaryStore from '../stores/glossaryStore';
import { analyticsService } from '../services/analyticsService';
import { ApiError } from '../services/apiErrorParser';
import { API_ERROR_CODES } from '../constants/apiErrors';
import { libraryService } from '../services/libraryService';
import { masterGlossaryService } from '../services/masterGlossaryService';
import { activityService } from '../services/activityService';
import { auth } from '../services/firebase';

const STOP_CODES = [API_ERROR_CODES.INVALID_KEY, API_ERROR_CODES.KEY_REVOKED, API_ERROR_CODES.API_NOT_ENABLED, API_ERROR_CODES.RATE_LIMIT_RPD];

function buildPromptWithGlossary(basePrompt) {
  const glossaryPrompt = useGlossaryStore.getState().getGlossaryPrompt();
  return glossaryPrompt ? basePrompt + glossaryPrompt : basePrompt;
}

export function useTranslationPipeline(sections, fileMetadata = null) {
  const [sectionStates, setSectionStates] = useState({});
  const [glossaryNotice, setGlossaryNotice] = useState(null);
  const translationMode = 'quick'; // simplified — single mode
  const abortControllerRef = useRef(null);
  const libraryDocIdRef = useRef(null);
  const [libraryDocId, setLibraryDocId] = useState(null);

  // Track previous section context for continuity bridging
  const prevContextRef = useRef(null);

  // ─── Library auto-save helpers ───
  const initLibraryDocument = useCallback(async () => {
    if (!auth.currentUser) {
      console.warn('[Library] Skip init: no auth user');
      return null;
    }
    if (!fileMetadata) {
      console.warn('[Library] Skip init: no fileMetadata');
      return null;
    }
    if (sections.length === 0) {
      console.warn('[Library] Skip init: no sections');
      return null;
    }

    // Retry up to 2 times
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const totalWords = sections.reduce((sum, s) => {
          const text = s.text || s.pages?.map(p => p.text).join(' ') || '';
          return sum + text.split(/\s+/).filter(Boolean).length;
        }, 0);

        const docId = await libraryService.saveDocument({
          title: fileMetadata.name,
          customTitle: null,
          topic: getTopic(),
          audience: getAudience(),
          provider: getProvider(),
          mode: translationMode,
          status: 'draft',
          totalSections: sections.length,
          completedSections: 0,
          totalWords,
          translatedWords: 0,
          sections: sections.map(s => ({
            id: s.id,
            title: s.title || '',
            originalText: '', // saved per-section in updateSection to avoid 1MB Firestore limit
            translatedText: '',
            wordCount: (s.text || s.pages?.map(p => p.text).join(' ') || '').split(/\s+/).filter(Boolean).length,
            status: 'pending',
          })),
          fileMetadata: {
            name: fileMetadata.name,
            size: fileMetadata.size,
            pages: fileMetadata.pages || 0,
          },
        });
        libraryDocIdRef.current = docId;
        setLibraryDocId(docId);
        return docId;
      } catch (err) {
        lastError = err;
        console.warn(`[Library] Init document failed (attempt ${attempt + 1}):`, err?.message || err);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    const errMsg = lastError?.message || '';
    const hint = errMsg.includes('permission') ? ' (Lỗi quyền truy cập)'
      : errMsg.includes('quota') ? ' (Hết quota Firestore)'
      : errMsg.includes('size') || errMsg.includes('too large') ? ' (Tài liệu quá lớn)'
      : '';
    toast.error(`Không thể lưu tài liệu vào thư viện${hint}. Bạn có thể lưu thủ công sau khi dịch xong.`);
    return null;
  }, [sections, fileMetadata]);

  const saveTranslatedSection = useCallback(async (section, result) => {
    if (!auth.currentUser) return;

    // If doc not yet initialized, try one more time
    if (!libraryDocIdRef.current) {
      try {
        await initLibraryDocument();
      } catch { /* already handled */ }
    }
    if (!libraryDocIdRef.current) return;

    try {
      const sourceText = section.text || section.pages?.map(p => p.text).join('\n\n') || '';
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
    } catch (err) {
      console.warn('[Library] Auto-save section failed:', err);
    }
  }, [initLibraryDocument]);

  const updateSectionState = useCallback((sectionId, patch) => {
    setSectionStates(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], ...patch },
    }));
  }, []);

  const resetAllStates = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setSectionStates({});
    setGlossaryNotice(null);
    prevContextRef.current = null;
  }, []);

  const changeMode = useCallback(() => {}, []); // no-op, kept for compat

  // ─── Streaming chunk handler — throttled to avoid excessive re-renders ───
  const streamThrottleRef = useRef({});

  const createStreamHandler = useCallback((sectionId) => {
    return (_chunk, fullText) => {
      const now = Date.now();
      const last = streamThrottleRef.current[sectionId] || 0;
      // Throttle to max ~15fps (66ms) to keep UI smooth
      if (now - last < 66) return;
      streamThrottleRef.current[sectionId] = now;

      // ─── M1.3: Filter out TERMS section from streaming UI ───
      // If output uses unified format with separators, only show text
      // between ---TRANSLATION--- and ---TERMS---
      let displayText = fullText;
      const transStart = fullText.search(/---TRANSLATION---/i);
      if (transStart !== -1) {
        const contentStart = transStart + '---TRANSLATION---'.length;
        const termsEnd = findTranslationEnd(fullText);
        const contentEnd = termsEnd !== -1 ? termsEnd : fullText.length;
        displayText = fullText.slice(contentStart, contentEnd).trimStart();
      }
      // If no TRANSLATION marker found, leave fullText as-is (legacy pipeline)

      setSectionStates(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          streamingTranslated: displayText,
        },
      }));
    };
  }, []);

  // ─── Ensure library doc exists (lazy init) ───
  const ensureLibraryDoc = useCallback(async () => {
    if (libraryDocIdRef.current) return libraryDocIdRef.current;
    return await initLibraryDocument();
  }, [initLibraryDocument]);

  // ─── Helper to run translation for a single section ───
  // previousContext param allows explicit override (for batch), otherwise uses ref
  const runSectionTranslation = useCallback(async (section, controller, previousContext) => {
    updateSectionState(section.id, {
      status: 'translating', translated: null, reviewed: null,
      agentProgress: {}, apiError: null, streamingTranslated: null,
    });

    const sourceText = section.text || section.pages.map(p => p.text).join('\n\n');
    const config = { topic: getTopic(), audience: getAudience() };
    const onStreamChunk = createStreamHandler(section.id);

    // Use explicit previousContext if provided, otherwise fall back to ref
    const ctxToPass = previousContext !== undefined ? previousContext : prevContextRef.current;

    const result = await runTranslationPipelineService(sourceText, config, (progress) => {
      setSectionStates(prev => {
        const current = prev[section.id] || {};
        const patch = {
          agentProgress: { ...current.agentProgress, [progress.agent]: progress.status },
        };
        if (progress.status === 'done' && progress.agent === 'translator') {
          patch.streamingTranslated = null;
        }
        return { ...prev, [section.id]: { ...current, ...patch } };
      });
    }, { signal: controller.signal, onStreamChunk, previousContext: ctxToPass });

    // ─── M1.5: Push newly extracted terms from unified output to glossary store ───
    if (result.newTerms && result.newTerms.length > 0) {
      const now = Date.now();
      const newEntries = result.newTerms
        .filter(t => t && t.termEN && t.termVI)
        .map(t => ({
          id: crypto.randomUUID(),
          termEN: t.termEN,
          termVI: t.termVI,
          termVIAlts: [],
          topic: getTopic(),
          context: '',
          notes: t.notes || '',
          status: 'suggested',
          usageCount: 1,
          createdAt: now,
          updatedAt: now,
        }));
      if (newEntries.length > 0) {
        useGlossaryStore.getState().addEntries(newEntries);
        setGlossaryNotice(prev => (prev || 0) + newEntries.length);
      }
    }

    // Store context for next section
    prevContextRef.current = {
      translatedTail: extractTail(result.translated),
    };

    updateSectionState(section.id, {
      status: 'translated',
      translated: result.translated,
      agentProgress: null,
      streamingTranslated: null,
    });

    // Auto-save to library (non-blocking)
    saveTranslatedSection(section, result);

    // Log activity per section (non-blocking)
    const wordsTranslated = result.translated
      ? result.translated.split(/\s+/).filter(Boolean).length
      : 0;
    activityService.log('translation_completed', {
      documentId: libraryDocIdRef.current,
      documentTitle: fileMetadata?.name || section.title,
      sectionsCount: 1,
      wordsTranslated,
      topic: getTopic(),
      provider: getProvider(),
    }).catch(() => {});

    return result;
  }, [updateSectionState, createStreamHandler, saveTranslatedSection, fileMetadata]);

  // ─── Translate single section ───
  const translateSection = useCallback(async (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Ensure library doc exists for saving
    await ensureLibraryDoc();

    // Build context from the previous section (by order in sections array)
    const sectionIdx = sections.indexOf(section);
    let previousContext = null;
    if (sectionIdx > 0) {
      const prevSection = sections[sectionIdx - 1];
      const prevState = sectionStates[prevSection.id];
      if (prevState?.translated) {
        previousContext = {
          translatedTail: extractTail(prevState.translated),
        };
      }
    }

    try {
      await runSectionTranslation(section, controller, previousContext);
    } catch (error) {
      if (error.name === 'AbortError') return;
      const apiError = error instanceof ApiError ? error : new ApiError(API_ERROR_CODES.UNKNOWN, { message: error.message });
      updateSectionState(sectionId, {
        status: 'error',
        translated: `[Lỗi: ${apiError.info.title}]`,
        apiError,
        agentProgress: null,
        streamingTranslated: null,
      });
    }
  }, [sections, sectionStates, updateSectionState, runSectionTranslation, ensureLibraryDoc]);

  // ─── Review single section ───
  const reviewSection = useCallback(async (sectionId) => {
    const currentState = sectionStates[sectionId];
    const textToReview = currentState?.translated;
    if (!textToReview) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    updateSectionState(sectionId, { status: 'reviewing', reviewed: null });

    try {
      const prompt = buildPromptWithGlossary(getReviewPrompt(getTopic(), getAudience()));
      const reviewedText = await fetchAICompletion(
        prompt, textToReview, { signal: controller.signal }
      );
      updateSectionState(sectionId, { status: 'reviewed', reviewed: reviewedText });

      // Auto-save reviewed text to Firestore
      if (libraryDocIdRef.current && auth.currentUser) {
        const section = sections.find(s => s.id === sectionId);
        const sourceText = section?.text || section?.pages?.map(p => p.text).join('\n\n') || '';
        libraryService.updateSection(libraryDocIdRef.current, sectionId, {
          id: sectionId,
          title: section?.title || '',
          originalText: sourceText,
          translatedText: reviewedText,
          wordCount: sourceText.split(/\s+/).filter(Boolean).length,
          status: 'done',
          lastEditedAt: Date.now(),
        }).catch(err => console.warn('[Library] Auto-save reviewed section failed:', err));
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      updateSectionState(sectionId, { status: 'reviewed', reviewed: textToReview });
    }
  }, [sectionStates, sections, updateSectionState]);

  // ─── Batch translate all ───
  const runTranslationPipeline = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    analyticsService.track('translation_start', { sectionCount: sections.length, topic: getTopic() });

    // Ensure library document exists for auto-save
    await ensureLibraryDoc();

    // Reset context chain at start of batch
    prevContextRef.current = null;

    for (const section of sections) {
      if (controller.signal.aborted) return;

      const currentState = sectionStates[section.id];
      if (currentState?.translated && currentState.status !== 'error') {
        // Section already done — still update context chain for continuity
        prevContextRef.current = {
          translatedTail: extractTail(currentState.translated),
        };
        continue;
      }

      try {
        await runSectionTranslation(section, controller, prevContextRef.current);
      } catch (error) {
        if (error.name === 'AbortError') return;
        const apiError = error instanceof ApiError ? error : new ApiError(API_ERROR_CODES.UNKNOWN, { message: error.message });
        updateSectionState(section.id, {
          status: 'error',
          translated: `[Lỗi: ${apiError.info.title}]`,
          apiError,
          agentProgress: null,
          streamingTranslated: null,
        });
        // On error, clear context chain — next section starts fresh
        prevContextRef.current = null;
        if (STOP_CODES.includes(apiError.code)) return;
      }
    }

    // Post-batch: merge glossary + update document status
    setSectionStates(currentStates => {
      const doneCount = sections.filter(s => {
        const st = currentStates[s.id];
        return st?.translated && st.status !== 'error';
      }).length;

      if (doneCount > 0 && fileMetadata) {
        // Merge all glossary terms to Firebase (non-blocking)
        const allTerms = useGlossaryStore.getState().entries;
        if (allTerms.length > 0) {
          masterGlossaryService.mergeFromDocument(
            allTerms,
            libraryDocIdRef.current || null,
            fileMetadata.name?.replace('.pdf', '') || 'Untitled',
          ).catch(err => console.warn('[Glossary] Merge failed:', err));
        }

        // Update document status to complete if all done
        if (libraryDocIdRef.current && doneCount === sections.length) {
          const totalWords = sections.reduce((sum, s) => {
            const t = currentStates[s.id]?.translated;
            return sum + (t ? t.split(/\s+/).filter(Boolean).length : 0);
          }, 0);

          libraryService.saveDocument({
            id: libraryDocIdRef.current,
            status: 'complete',
            completedSections: doneCount,
            translatedWords: totalWords,
            completedAt: Date.now(),
          }).catch(err => console.warn('[Library] Status update failed:', err));
        }
      }

      return currentStates;
    });
  }, [sections, sectionStates, updateSectionState, ensureLibraryDoc, runSectionTranslation, fileMetadata]);

  // ─── Batch review all ───
  const runReviewPipeline = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    for (const section of sections) {
      if (controller.signal.aborted) return;
      const currentState = sectionStates[section.id];
      const textToReview = currentState?.translated;
      if (!textToReview || currentState.status === 'error') continue;
      if (currentState.reviewed) continue;

      updateSectionState(section.id, { status: 'reviewing' });

      try {
        const prompt = buildPromptWithGlossary(getReviewPrompt(getTopic(), getAudience()));
        const reviewedText = await fetchAICompletion(
          prompt, textToReview, { signal: controller.signal }
        );
        updateSectionState(section.id, { status: 'reviewed', reviewed: reviewedText });
      } catch (error) {
        if (error.name === 'AbortError') return;
        updateSectionState(section.id, { status: 'reviewed', reviewed: textToReview });
      }
    }
  }, [sections, sectionStates, updateSectionState]);

  // ─── Stats ───
  const totalSections = sections.length;
  const translatedCount = sections.filter(s => sectionStates[s.id]?.translated).length;
  const reviewedCount = sections.filter(s => sectionStates[s.id]?.reviewed).length;
  const hasAnyTranslation = translatedCount > 0;
  const hasAnyReview = reviewedCount > 0;
  const allTranslated = translatedCount === totalSections && totalSections > 0;
  const isAnyWorking = sections.some(s => {
    const status = sectionStates[s.id]?.status;
    return status === 'translating' || status === 'reviewing';
  });

  const clearGlossaryNotice = useCallback(() => setGlossaryNotice(null), []);

  // ─── Resume after key upgrade (only pending/error sections) ───
  const resumeWithNewKey = useCallback(async () => {
    const pending = sections.filter(s => {
      const state = sectionStates[s.id];
      return !state || state.status === 'error' || !state.translated;
    });

    if (pending.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Rebuild context from the last successfully translated section before the first pending
    const firstPendingIdx = sections.indexOf(pending[0]);
    if (firstPendingIdx > 0) {
      const prevSection = sections[firstPendingIdx - 1];
      const prevState = sectionStates[prevSection.id];
      if (prevState?.translated) {
        prevContextRef.current = {
          translatedTail: extractTail(prevState.translated),
        };
      }
    } else {
      prevContextRef.current = null;
    }

    for (const section of pending) {
      if (controller.signal.aborted) return;

      try {
        await runSectionTranslation(section, controller, prevContextRef.current);
      } catch (error) {
        if (error.name === 'AbortError') return;
        const apiError = error instanceof ApiError ? error : new ApiError(API_ERROR_CODES.UNKNOWN, { message: error.message });
        updateSectionState(section.id, {
          status: 'error',
          translated: `[Lỗi: ${apiError.info.title}]`,
          apiError,
          agentProgress: null,
        });
        prevContextRef.current = null;
        if (STOP_CODES.includes(apiError.code)) return;
      }
    }
  }, [sections, sectionStates, updateSectionState, runSectionTranslation]);

  // ─── Manual save — snapshot full state to Firebase ───
  const manualSave = useCallback(async () => {
    if (!auth.currentUser || sections.length === 0) {
      throw new Error('Cần đăng nhập và có nội dung để lưu');
    }

    const sectionsForSave = sections.map(s => {
      const state = sectionStates[s.id] || {};
      const sourceText = s.text || s.pages?.map(p => p.text).join('\n\n') || '';
      return {
        id: s.id,
        title: s.title || '',
        originalText: sourceText,
        translatedText: state.reviewed || state.translated || '',
        wordCount: sourceText.split(/\s+/).filter(Boolean).length,
        status: state.translated ? 'done' : 'pending',
        lastEditedAt: state.translated ? Date.now() : null,
        editHistory: [],
      };
    });

    const completedSections = sectionsForSave.filter(s => s.status === 'done').length;
    const totalWords = sectionsForSave
      .filter(s => s.status === 'done')
      .reduce((sum, s) => sum + s.wordCount, 0);

    const glossary = useGlossaryStore.getState().entries
      .filter(e => e.status === 'approved')
      .map(e => ({ en: e.termEN || e.en, vi: e.termVI || e.vi }));

    // Save metadata first (without full section text to stay under 1MB Firestore limit)
    const sectionsLite = sectionsForSave.map(s => ({
      ...s,
      originalText: '', // will be saved per-section below
      translatedText: s.translatedText?.slice(0, 200) || '', // preview only in main doc
    }));

    const docId = await libraryService.saveDocument({
      id: libraryDocIdRef.current || undefined,
      title: fileMetadata?.name || 'Untitled',
      customTitle: null,
      topic: getTopic(),
      audience: getAudience(),
      provider: getProvider(),
      mode: translationMode,
      status: completedSections === sections.length ? 'complete' : completedSections > 0 ? 'partial' : 'draft',
      totalSections: sections.length,
      completedSections,
      totalWords,
      translatedWords: totalWords,
      sections: sectionsLite,
      glossary,
      fileMetadata: fileMetadata ? {
        name: fileMetadata.name,
        size: fileMetadata.size,
        pages: fileMetadata.pages || 0,
      } : null,
      savedManually: true,
      savedAt: Date.now(),
    });

    // Save full section content individually
    for (const sec of sectionsForSave) {
      if (sec.status === 'done') {
        await libraryService.updateSection(docId, sec.id, sec);
      }
    }

    libraryDocIdRef.current = docId;
    setLibraryDocId(docId);
    return docId;
  }, [sections, sectionStates, fileMetadata]);

  return {
    sectionStates,
    translateSection,
    reviewSection,
    runTranslationPipeline,
    runReviewPipeline,
    resumeWithNewKey,
    resetAllStates,
    manualSave,
    glossaryNotice,
    clearGlossaryNotice,
    translationMode,
    changeMode,
    libraryDocId,
    stats: {
      totalSections, translatedCount, reviewedCount,
      hasAnyTranslation, hasAnyReview, allTranslated, isAnyWorking,
    },
  };
}
