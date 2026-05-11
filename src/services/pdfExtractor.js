import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ── Constants for structure detection ──
const LINE_GAP_THRESHOLD = 1.8;    // y-gap > fontSize * this → new paragraph
const HEADING_SIZE_RATIO = 1.15;   // fontSize > bodySize * this → heading
const BULLET_REGEX = /^[\u2022\u2023\u25E6\u2043\u2219•●○◦‣⁃►▸▹–—-]\s*/;
const NUMBERED_REGEX = /^(\d+[.)]\s|\([a-z]\)\s|[a-z][.)]\s|[ivxlcdm]+[.)]\s)/i;
const MIN_ITEMS_FOR_STATS = 3;

/**
 * Extract structured text from each page of a PDF file.
 * Reconstructs paragraphs, headings, and lists from positional data.
 * Returns array of { page: number, text: string }.
 */
export async function extractPdfContent(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const extractedPages = [];
  for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex++) {
    const page = await pdfDocument.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = reconstructPageStructure(textContent.items);
    extractedPages.push({ page: pageIndex, text: pageText });
  }

  return extractedPages;
}

/**
 * Group text items into lines based on Y position.
 * Items on the same Y (within tolerance) belong to the same line.
 */
function groupIntoLines(items) {
  if (items.length === 0) return [];

  // Filter out empty items and extract positional data
  const positioned = items
    .filter(item => item.str && item.str.trim())
    .map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      fontSize: Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12,
      fontName: item.fontName || '',
      width: item.width || 0,
      height: item.height || 0,
    }));

  if (positioned.length === 0) return [];

  // Sort by Y descending (top of page first), then X ascending (left to right)
  positioned.sort((a, b) => b.y - a.y || a.x - b.x);

  // Group into lines: items within fontSize * 0.3 of each other vertically
  const lines = [];
  let currentLine = [positioned[0]];

  for (let i = 1; i < positioned.length; i++) {
    const item = positioned[i];
    const prevItem = currentLine[currentLine.length - 1];
    const yTolerance = Math.max(prevItem.fontSize, item.fontSize) * 0.3;

    if (Math.abs(item.y - prevItem.y) <= yTolerance) {
      currentLine.push(item);
    } else {
      // Sort current line by X before pushing
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = [item];
    }
  }
  // Don't forget the last line
  currentLine.sort((a, b) => a.x - b.x);
  lines.push(currentLine);

  return lines;
}

/**
 * Compute the median body font size from all lines.
 */
function computeBodyFontSize(lines) {
  const allSizes = [];
  for (const line of lines) {
    for (const item of line) {
      allSizes.push(item.fontSize);
    }
  }

  if (allSizes.length < MIN_ITEMS_FOR_STATS) {
    return allSizes.length > 0 ? allSizes[0] : 12;
  }

  allSizes.sort((a, b) => a - b);
  return allSizes[Math.floor(allSizes.length / 2)];
}

/**
 * Compute the median left X (indent baseline) from all lines.
 */
function computeBaseIndent(lines) {
  const leftXs = lines.map(line => Math.min(...line.map(item => item.x)));
  if (leftXs.length === 0) return 0;
  leftXs.sort((a, b) => a - b);
  return leftXs[Math.floor(leftXs.length / 2)];
}

/**
 * Detect if a line is a heading based on font size and style.
 */
function isHeading(line, bodyFontSize) {
  const avgFontSize = line.reduce((sum, item) => sum + item.fontSize, 0) / line.length;
  if (avgFontSize < bodyFontSize * HEADING_SIZE_RATIO) return false;

  const lineText = line.map(item => item.text).join(' ').trim();
  // Headings are typically short (< 120 chars) and don't end with common sentence-ending patterns
  if (lineText.length > 120) return false;

  return true;
}

/**
 * Detect heading level based on font size relative to body.
 */
function getHeadingLevel(line, bodyFontSize) {
  const avgFontSize = line.reduce((sum, item) => sum + item.fontSize, 0) / line.length;
  const ratio = avgFontSize / bodyFontSize;
  if (ratio >= 1.6) return 1;
  if (ratio >= 1.3) return 2;
  return 3;
}

/**
 * Detect if a line is bold (heuristic: font name contains Bold/Black/Heavy).
 */
function isBoldLine(line) {
  const boldItems = line.filter(item =>
    /bold|black|heavy|semibold|demibold/i.test(item.fontName)
  );
  return boldItems.length > line.length * 0.5;
}

/**
 * Detect if a line starts a bullet or numbered list item.
 */
function detectListPrefix(lineText) {
  const bulletMatch = lineText.match(BULLET_REGEX);
  if (bulletMatch) return { type: 'bullet', prefix: bulletMatch[0], rest: lineText.slice(bulletMatch[0].length) };

  const numMatch = lineText.match(NUMBERED_REGEX);
  if (numMatch) return { type: 'numbered', prefix: numMatch[0], rest: lineText.slice(numMatch[0].length) };

  return null;
}

/**
 * Main reconstruction: convert positioned text items into structured Markdown text.
 */
function reconstructPageStructure(items) {
  const lines = groupIntoLines(items);
  if (lines.length === 0) return '';

  const bodyFontSize = computeBodyFontSize(lines);
  const baseIndent = computeBaseIndent(lines);
  const INDENT_THRESHOLD = bodyFontSize * 1.5; // indentation detection threshold

  const outputParts = [];
  let prevLineY = null;
  let prevFontSize = bodyFontSize;
  let inListBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineText = line.map(item => item.text).join(' ').trim();
    if (!lineText) continue;

    const lineY = Math.max(...line.map(item => item.y));
    const lineFontSize = line.reduce((sum, item) => sum + item.fontSize, 0) / line.length;
    const lineLeftX = Math.min(...line.map(item => item.x));
    const isIndented = (lineLeftX - baseIndent) > INDENT_THRESHOLD;

    // Detect vertical gap from previous line
    let hasLargeGap = false;
    if (prevLineY !== null) {
      const yGap = prevLineY - lineY; // positive because Y decreases downward
      hasLargeGap = yGap > prevFontSize * LINE_GAP_THRESHOLD;
    }

    // ── Heading detection ──
    if (isHeading(line, bodyFontSize)) {
      const level = getHeadingLevel(line, bodyFontSize);
      const prefix = '#'.repeat(level);

      if (outputParts.length > 0) outputParts.push('');  // blank line before heading
      outputParts.push(`${prefix} ${lineText}`);
      outputParts.push('');  // blank line after heading
      inListBlock = false;
      prevLineY = lineY;
      prevFontSize = lineFontSize;
      continue;
    }

    // Bold short line that looks like a sub-heading (not a list item)
    if (isBoldLine(line) && lineText.length < 80 && !detectListPrefix(lineText)) {
      if (outputParts.length > 0) outputParts.push('');
      outputParts.push(`### ${lineText}`);
      outputParts.push('');
      inListBlock = false;
      prevLineY = lineY;
      prevFontSize = lineFontSize;
      continue;
    }

    // ── List detection ──
    const listInfo = detectListPrefix(lineText);
    if (listInfo) {
      if (!inListBlock && outputParts.length > 0) outputParts.push('');
      if (listInfo.type === 'bullet') {
        outputParts.push(`- ${listInfo.rest}`);
      } else {
        outputParts.push(`${listInfo.prefix}${listInfo.rest}`);
      }
      inListBlock = true;
      prevLineY = lineY;
      prevFontSize = lineFontSize;
      continue;
    }

    // ── Indented continuation (sub-item or continuation of list) ──
    if (isIndented && inListBlock) {
      // Append to previous list item
      const lastIdx = outputParts.length - 1;
      if (lastIdx >= 0 && outputParts[lastIdx]) {
        outputParts[lastIdx] += ' ' + lineText;
      } else {
        outputParts.push(`  ${lineText}`);
      }
      prevLineY = lineY;
      prevFontSize = lineFontSize;
      continue;
    }

    // ── Regular paragraph text ──
    if (inListBlock) {
      outputParts.push('');  // blank line to end list block
      inListBlock = false;
    }

    if (hasLargeGap) {
      // Large gap → new paragraph
      outputParts.push('');
      outputParts.push(lineText);
    } else {
      // Small gap → same paragraph, append to previous line
      const lastIdx = outputParts.length - 1;
      if (lastIdx >= 0 && outputParts[lastIdx] && outputParts[lastIdx] !== '') {
        // Check if previous line looks like a complete paragraph that shouldn't be merged
        const prevText = outputParts[lastIdx];
        if (prevText.startsWith('#') || prevText.startsWith('-') || prevText.startsWith('  ')) {
          outputParts.push(lineText);
        } else {
          outputParts[lastIdx] += ' ' + lineText;
        }
      } else {
        outputParts.push(lineText);
      }
    }

    prevLineY = lineY;
    prevFontSize = lineFontSize;
  }

  // Clean up: collapse multiple blank lines into one
  const result = [];
  let prevBlank = false;
  for (const part of outputParts) {
    if (part === '') {
      if (!prevBlank) {
        result.push('');
        prevBlank = true;
      }
    } else {
      result.push(part);
      prevBlank = false;
    }
  }

  return result.join('\n').trim();
}
