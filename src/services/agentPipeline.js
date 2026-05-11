import { fetchAICompletion, streamAICompletion } from './aiService';
import { buildGlossaryContext } from './glossaryService';
import {
  getAnalystPrompt,
  getTranslatorPrompt,
  getEditorPrompt,
  getUnifiedTranslatorPrompt,
  getReviewerPrompt,
} from '../constants/agentPrompts';
import useGlossaryStore from '../stores/glossaryStore';
import useKeyStore from '../stores/keyStore';
import { QUICK_MODE_MODEL } from '../constants/modelConfig';

const ANALYST_MODEL_PAID = 'gemini-2.5-flash-lite';
const ANALYST_MODEL_FREE = 'gemini-2.5-flash';
const EDITOR_MODEL_PAID = 'gemini-2.5-flash';
const EDITOR_MODEL_FREE = 'gemini-2.5-flash';

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

/**
 * Parse analyst JSON response, handling markdown code fences.
 */
function parseAnalystResponse(text) {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Format analyst output into a concise context string for the translator.
 */
function formatAnalystContext(analysis) {
  if (!analysis) return null;

  const parts = [];
  if (analysis.documentType) parts.push(`Loại tài liệu: ${analysis.documentType}`);
  if (analysis.mainTheme) parts.push(`Chủ đề chính: ${analysis.mainTheme}`);
  if (analysis.technicalLevel) parts.push(`Mức độ chuyên môn: ${analysis.technicalLevel}`);
  if (analysis.keyPoints?.length) parts.push(`Điểm chính:\n${analysis.keyPoints.map(p => `- ${p}`).join('\n')}`);
  if (analysis.translationNotes?.length) parts.push(`Lưu ý dịch thuật:\n${analysis.translationNotes.map(n => `- ${n}`).join('\n')}`);
  if (analysis.structureNotes) parts.push(`Cấu trúc: ${analysis.structureNotes}`);

  return parts.join('\n');
}

/**
 * Run translation pipeline — Analyst → Translator → Editor, with streaming.
 *
 * @param {string} sectionText — source English text
 * @param {object} config — { topic, audience }
 * @param {function} onProgress — progress callback
 * @param {object} options — { signal, onStreamChunk, previousContext }
 *   previousContext: { originalTail: string, translatedTail: string } | null
 *
 * Returns { translated, finalText, analysis }.
 */
export async function runAgentPipeline(sectionText, config, onProgress, options = {}) {
  const { topic, audience } = config;
  const { onStreamChunk, previousContext } = options;
  const glossaryTable = buildGlossaryContext(useGlossaryStore.getState().entries);

  const { keyTier } = useKeyStore.getState();
  const translatorModel = keyTier === 'paid' ? 'gemini-2.5-pro' : QUICK_MODE_MODEL;
  const analystModel = keyTier === 'paid' ? ANALYST_MODEL_PAID : ANALYST_MODEL_FREE;
  const editorModel = keyTier === 'paid' ? EDITOR_MODEL_PAID : EDITOR_MODEL_FREE;

  // ── Step 1: Analyst — analyze document context ──
  let analystContext = null;
  let analysis = null;

  onProgress?.({ agent: 'analyst', status: 'running' });
  try {
    const analystPrompt = getAnalystPrompt(topic);
    const analystResponse = await fetchAICompletion(analystPrompt, sectionText, {
      signal: options.signal,
      model: analystModel,
    });
    analysis = parseAnalystResponse(analystResponse);
    analystContext = formatAnalystContext(analysis);
    onProgress?.({ agent: 'analyst', status: 'done' });
  } catch {
    // Non-blocking: if analyst fails, continue without context
    onProgress?.({ agent: 'analyst', status: 'skipped' });
  }

  // ── Step 2: Translator — translate with context from analyst + previous section ──
  let translatedText = null;

  onProgress?.({ agent: 'translator', status: 'running' });
  try {
    const prompt = getTranslatorPrompt(topic, audience, glossaryTable, analystContext, previousContext);

    if (onStreamChunk) {
      translatedText = await streamAICompletion(prompt, sectionText, {
        ...options,
        model: translatorModel,
        onChunk: (chunk, fullText) => onStreamChunk(chunk, fullText, 'translator'),
      });
    } else {
      translatedText = await fetchAICompletion(prompt, sectionText, { ...options, model: translatorModel });
    }
    onProgress?.({ agent: 'translator', status: 'done' });
  } catch (error) {
    onProgress?.({ agent: 'translator', status: 'error' });
    throw error;
  }

  // ── Step 3: Editor — polish Vietnamese output ──
  let editedText = translatedText;

  onProgress?.({ agent: 'editor', status: 'running' });
  try {
    const editorPrompt = getEditorPrompt(topic, previousContext);
    editedText = await fetchAICompletion(editorPrompt, translatedText, {
      signal: options.signal,
      model: editorModel,
    });
    onProgress?.({ agent: 'editor', status: 'done' });
  } catch {
    // Non-blocking: if editor fails, keep translator output
    onProgress?.({ agent: 'editor', status: 'skipped' });
  }

  return {
    translated: editedText,
    rawTranslated: translatedText,
    finalText: editedText,
    analysis,
  };
}

// ─── M1.4: Single-call unified translator ───
async function runUnifiedTranslator(sectionText, config, previousContext, options = {}) {
  const { topic, audience, keyTier = 'free' } = config;
  const { onStreamChunk, signal, glossaryTable = '' } = options;

  const systemPrompt = getUnifiedTranslatorPrompt(topic, audience, glossaryTable, previousContext);
  const model = keyTier === 'paid' ? 'gemini-2.5-pro' : QUICK_MODE_MODEL;

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
  const model = keyTier === 'paid' ? 'gemini-2.5-flash' : QUICK_MODE_MODEL;

  const polished = await fetchAICompletion(systemPrompt, translatedText, { signal, model });
  return polished;
}

// ─── M1.4: New unified pipeline entry point ───
// Mirror signature of runAgentPipeline for drop-in replacement.
// Default: 1 API call (translator). With options.enableReview=true: 2 calls (+reviewer).
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
