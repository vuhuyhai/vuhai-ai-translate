import { fetchAICompletion, streamAICompletion } from './aiService';
import {
  getUnifiedTranslatorPrompt,
  getReviewerPrompt,
} from '../constants/agentPrompts';
import { getTranslatorModel, getReviewerModel } from '../constants/modelConfig.js';

// How many trailing characters to pass as context bridge
const CONTEXT_TAIL_CHARS = 600;

/**
 * Extract the tail portion of text for context bridging.
 */
export function extractTail(text, maxChars = CONTEXT_TAIL_CHARS) {
  if (!text || text.length <= maxChars) return text || '';
  // Cut at the last paragraph/sentence boundary within the range
  const tail = text.slice(-maxChars);
  const breakIdx = tail.search(/\n\n|(?<=[.!?])\s/);
  return breakIdx > 0 ? tail.slice(breakIdx).trim() : tail.trim();
}

// ─── M1: Parse Unified Translator output with separators ───
// Output format from getUnifiedTranslatorPrompt:
//   ---TRANSLATION---
//   <vietnamese markdown>
//   ---TERMS---
//   <JSON array of terms>
//   ---END---
//
// Robust to partial outputs (streaming cutoff, missing END, etc.)
export function parseStreamedOutput(fullText) {
  if (typeof fullText !== 'string' || !fullText) {
    return { translated: '', newTerms: [] };
  }

  // Find separators (case-insensitive, allow surrounding whitespace)
  const transStart = fullText.search(/---TRANSLATION---/i);
  const termsStart = fullText.search(/---TERMS---/i);
  const endMarker = fullText.search(/---END---/i);

  // Case 1: no separators at all -> treat entire text as translation
  if (transStart === -1 && termsStart === -1) {
    return { translated: fullText.trim(), newTerms: [] };
  }

  // Case 2: has TRANSLATION marker, extract content between TRANSLATION and TERMS (or end)
  let translated = '';
  if (transStart !== -1) {
    const transContentStart = transStart + '---TRANSLATION---'.length;
    const transContentEnd = termsStart !== -1 ? termsStart : fullText.length;
    translated = fullText.slice(transContentStart, transContentEnd).trim();
  } else {
    // Has TERMS but no TRANSLATION header -> take everything before TERMS as translation
    translated = fullText.slice(0, termsStart).trim();
  }

  // Case 3: extract TERMS JSON
  let newTerms = [];
  if (termsStart !== -1) {
    const termsContentStart = termsStart + '---TERMS---'.length;
    const termsContentEnd = endMarker !== -1 ? endMarker : fullText.length;
    const termsRaw = fullText.slice(termsContentStart, termsContentEnd).trim();

    if (termsRaw) {
      try {
        // Strip optional ```json fences
        let cleaned = termsRaw;
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          newTerms = parsed.filter(t => t && typeof t === 'object' && t.termEN && t.termVI);
        }
      } catch {
        // Malformed JSON -> silently ignore terms, keep translation
        newTerms = [];
      }
    }
  }

  return { translated, newTerms };
}

// Helper: detect if a streaming chunk has passed the TRANSLATION/TERMS boundary
// Returns the position where translation text ends in the cumulative stream
export function findTranslationEnd(fullText) {
  if (typeof fullText !== 'string') return -1;
  const idx = fullText.search(/---TERMS---/i);
  return idx === -1 ? -1 : idx;
}

// ─── M1.4: Single-call unified translator ───
async function runUnifiedTranslator(sectionText, config, previousContext, options = {}) {
  const { topic, audience, keyTier = 'free' } = config;
  const { onStreamChunk, signal, glossaryTable = '' } = options;

  const systemPrompt = getUnifiedTranslatorPrompt(topic, audience, glossaryTable, previousContext);
  const model = getTranslatorModel(keyTier);

  let rawText = '';

  if (onStreamChunk) {
    // Streaming mode — pass chunks through; hook already filters ---TERMS--- block
    rawText = await streamAICompletion(systemPrompt, sectionText, {
      signal,
      onChunk: (chunk, fullText) => {
        rawText = fullText;
        onStreamChunk(chunk, fullText);
      },
      model,
    });
  } else {
    rawText = await fetchAICompletion(systemPrompt, sectionText, { signal, model });
  }

  // Parse out translation and newTerms from separator-formatted output
  const { translated, newTerms } = parseStreamedOutput(rawText);

  return {
    translated: translated || rawText,
    rawTranslated: rawText,
    newTerms: Array.isArray(newTerms) ? newTerms : [],
  };
}

// ─── M1.4: Optional reviewer (only when options.enableReview=true) ───
async function runReviewer(translatedText, config, previousContext, options = {}) {
  const { topic, audience, keyTier = 'free' } = config;
  const { signal } = options;

  const systemPrompt = getReviewerPrompt(topic, audience, previousContext);
  // Reviewer doesn't need Pro — flash is enough for polishing
  const model = getReviewerModel(keyTier);

  const polished = await fetchAICompletion(systemPrompt, translatedText, { signal, model });
  return polished;
}

// ─── M1.4: New unified pipeline entry point ───
// Unified pipeline: default 1 API call (translator). With enableReview=true: 2 calls (+reviewer).
export async function runTranslationPipeline(sectionText, config, onProgress, options = {}) {
  const { enableReview = false, previousContext = null } = options;

  // Step 1: Translator (mandatory)
  onProgress?.({ agent: 'translator', status: 'running' });
  const result = await runUnifiedTranslator(sectionText, config, previousContext, options);
  onProgress?.({ agent: 'translator', status: 'done' });

  // Step 2: Reviewer (optional)
  if (enableReview && result.translated) {
    onProgress?.({ agent: 'editor', status: 'running' });
    try {
      const polished = await runReviewer(result.translated, config, previousContext, options);
      onProgress?.({ agent: 'editor', status: 'done' });
      return {
        translated: polished,
        rawTranslated: result.rawTranslated,
        newTerms: result.newTerms,
        analysis: null, // backward compat with old pipeline return shape
      };
    } catch (err) {
      console.warn('[runTranslationPipeline] Reviewer failed, returning unrevised translation:', err);
      onProgress?.({ agent: 'editor', status: 'error', error: err.message });
      // Fall through to return without polish
    }
  }

  return {
    translated: result.translated,
    rawTranslated: result.rawTranslated,
    newTerms: result.newTerms,
    analysis: null,
  };
}
