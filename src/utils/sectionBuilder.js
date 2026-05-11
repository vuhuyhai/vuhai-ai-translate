import {
  SECTION_MIN_WORDS,
  SECTION_MAX_WORDS,
  SECTION_TARGET_WORDS,
} from '../constants/config';

// ── SENTENCE BREAK PATTERNS (priority high → low) ──
const BREAK_PATTERNS = [
  // 1. Chapter/Part headers
  /\n(?=(?:Chapter|Part|Section|Chương|Phần)\s+\d)/gi,
  // 2. Double newline (paragraph break)
  /\n\n+/g,
  // 3. Sentence-ending punctuation followed by uppercase letter (new sentence)
  /(?<=[.!?])\s+(?=[A-ZÁÀẢÃẠĂẮẶẰẲẴÂẤẬẦẨẪĐÉÈẺẼẸÊẾỆỀỂỄÍÌỈĨỊÓÒỎÕỌÔỐỘỒỔỖƠỚỢỜỞỠÚÙỦŨỤƯỨỰỪỬỮÝỲỶỸỴ])/g,
  // 4. Sentence-ending punctuation followed by space
  /(?<=[.!?])\s/g,
  // 5. Single newline
  /\n/g,
];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Convert word index → character index in text.
 */
function getCharIndex(text, wordIndex) {
  const tokens = text.split(/(\s+)/);
  let charCount = 0;
  let wIdx = 0;

  for (const token of tokens) {
    if (!/^\s+$/.test(token) && token.length > 0) {
      if (wIdx >= wordIndex) return charCount;
      wIdx++;
    }
    charCount += token.length;
  }
  return text.length;
}

/**
 * Find the best cut point in text near targetWords,
 * ensuring the cut happens at a sentence boundary.
 */
function findSentenceCutPoint(text, targetWords) {
  // Search zone: 70% → 128% of target (in characters)
  const minChar = getCharIndex(text, Math.floor(targetWords * 0.70));
  const maxChar = getCharIndex(text, Math.min(Math.floor(targetWords * 1.28), countWords(text) - 1));

  if (maxChar <= minChar) return maxChar;

  const searchZone = text.slice(minChar, maxChar);

  // Try each pattern (highest priority first)
  for (const pattern of BREAK_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    const matches = [...searchZone.matchAll(pattern)];
    if (matches.length > 0) {
      // Pick the match closest to target (prefer later = closer to target)
      const targetChar = getCharIndex(text, targetWords) - minChar;
      let bestMatch = matches[0];
      let bestDist = Math.abs(bestMatch.index - targetChar);

      for (let i = 1; i < matches.length; i++) {
        const dist = Math.abs(matches[i].index - targetChar);
        if (dist <= bestDist) {
          bestDist = dist;
          bestMatch = matches[i];
        }
      }

      return minChar + bestMatch.index + bestMatch[0].length;
    }
  }

  // Fallback: cut at word boundary closest to target
  return getCharIndex(text, targetWords);
}

/**
 * Extract a meaningful title from text.
 */
function extractTitle(text) {
  const firstLine = text.trim().split('\n')[0].trim();

  const isMetadata = /^(Chapter|Part|Section|Phần|Chương|Bài)\s+\d/i.test(firstLine)
    || /^(Trang|Page)\s+\d/i.test(firstLine)
    || /^\d+$/.test(firstLine);

  if (isMetadata || firstLine.length > 100) {
    const firstSentence = text.trim().match(/^[^.!?\n]+[.!?]/);
    if (firstSentence) return firstSentence[0].slice(0, 80).trim();
    return firstLine.slice(0, 60).trim();
  }

  return firstLine.replace(/^#+\s*/, '');
}

/**
 * Build logical sections from extracted PDF pages.
 * Cuts at sentence boundaries to avoid mid-sentence splits.
 *
 * @param {Array<{page: number, text: string}>} pages
 * @returns {Array<{id, title, pages, startPage, endPage, wordCount}>}
 */
export function buildSections(pages) {
  const nonEmptyPages = pages.filter(p => p.text.trim());
  if (nonEmptyPages.length === 0) return [];

  // Concatenate all text, tracking page boundaries
  const fullText = nonEmptyPages.map(p => p.text.trim()).join('\n\n');
  const totalWords = countWords(fullText);

  // Small document → single section
  if (totalWords <= SECTION_MAX_WORDS) {
    const startPage = nonEmptyPages[0].page;
    const endPage = nonEmptyPages[nonEmptyPages.length - 1].page;
    return [{
      id: `section-${startPage}-${endPage}`,
      title: extractTitle(fullText),
      text: fullText,
      pages: nonEmptyPages,
      startPage,
      endPage,
      wordCount: totalWords,
    }];
  }

  // ── Split text at sentence boundaries ──
  const textChunks = [];
  let remaining = fullText;

  while (remaining.length > 0) {
    const remainingWords = countWords(remaining);

    // If remaining fits in one section, take it all
    if (remainingWords <= SECTION_MAX_WORDS) {
      textChunks.push(remaining.trim());
      break;
    }

    const cutPoint = findSentenceCutPoint(remaining, SECTION_TARGET_WORDS);

    if (cutPoint <= 0) {
      textChunks.push(remaining.trim());
      break;
    }

    const chunk = remaining.slice(0, cutPoint).trim();
    remaining = remaining.slice(cutPoint).trim();

    if (chunk.length > 0) {
      textChunks.push(chunk);
    }
  }

  // Merge last chunk if too small
  if (textChunks.length >= 2) {
    const last = textChunks[textChunks.length - 1];
    if (countWords(last) < SECTION_MIN_WORDS) {
      textChunks[textChunks.length - 2] += '\n\n' + last;
      textChunks.pop();
    }
  }

  // ── Map text chunks back to pages ──
  // Build a char→page mapping from the concatenated fullText
  const pageCharRanges = []; // { page, pageObj, startChar, endChar }
  let charOffset = 0;
  for (let i = 0; i < nonEmptyPages.length; i++) {
    const pageText = nonEmptyPages[i].text.trim();
    const start = charOffset;
    const end = charOffset + pageText.length;
    pageCharRanges.push({
      pageObj: nonEmptyPages[i],
      startChar: start,
      endChar: end,
    });
    charOffset = end + 2; // +2 for '\n\n' separator
  }

  // For each text chunk, find which pages overlap
  const sections = [];
  let chunkCharStart = 0;

  for (let ci = 0; ci < textChunks.length; ci++) {
    const chunk = textChunks[ci];
    const chunkCharEnd = chunkCharStart + chunk.length;

    // Find pages that overlap with this chunk's char range
    const sectionPages = [];
    for (const range of pageCharRanges) {
      // Page overlaps if: pageStart < chunkEnd AND pageEnd > chunkStart
      if (range.startChar < chunkCharEnd && range.endChar > chunkCharStart) {
        sectionPages.push(range.pageObj);
      }
    }

    // Fallback: if no pages found (shouldn't happen), assign at least one
    if (sectionPages.length === 0 && nonEmptyPages.length > 0) {
      sectionPages.push(nonEmptyPages[Math.min(ci, nonEmptyPages.length - 1)]);
    }

    const startPage = sectionPages[0].page;
    const endPage = sectionPages[sectionPages.length - 1].page;
    const wc = countWords(chunk);

    sections.push({
      id: `section-${startPage}-${endPage}`,
      title: `Phần ${ci + 1}: ${buildPageRangeLabel(startPage, endPage)}`,
      text: chunk,
      pages: sectionPages,
      startPage,
      endPage,
      wordCount: wc,
    });

    // Move chunkCharStart forward: chunk length + separator between chunks
    // The separator was consumed during split, so we need to account for it
    chunkCharStart = chunkCharEnd;
    // Skip whitespace/newlines between chunks in the original text
    while (chunkCharStart < fullText.length && /\s/.test(fullText[chunkCharStart])) {
      chunkCharStart++;
    }
  }

  return sections;
}

function buildPageRangeLabel(startPage, endPage) {
  return startPage === endPage ? `Trang ${startPage}` : `Trang ${startPage} – ${endPage}`;
}
