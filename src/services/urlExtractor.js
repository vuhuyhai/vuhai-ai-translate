/**
 * URL Text Extractor — client-side only, no API key needed.
 *
 * Strategy:
 *   1. Jina Reader (r.jina.ai) — returns clean markdown, handles JS-rendered pages
 *   2. AllOrigins proxy — returns raw HTML, we parse it ourselves
 */

export async function extractTextFromUrl(url) {
  const errors = [];

  // ── Strategy 1: Jina Reader (best quality) ──
  try {
    const result = await fetchViaJina(url);
    if (result) return result;
  } catch (err) {
    errors.push(err.message);
  }

  // ── Strategy 2: AllOrigins HTML proxy ──
  try {
    const result = await fetchViaAllOrigins(url);
    if (result) return result;
  } catch (err) {
    errors.push(err.message);
  }

  // All strategies failed
  throw new Error(
    'Không thể đọc nội dung URL này.\n' +
    'Nguyên nhân có thể: trang chặn truy cập tự động, yêu cầu đăng nhập, hoặc dùng JavaScript.\n' +
    'Thử với URL khác (Wikipedia, blog, báo chí...).'
  );
}

// ── JINA READER ──────────────────────────────────────────

async function fetchViaJina(url) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { 'Accept': 'text/plain' },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return null;

  const text = await res.text();

  // Check for error/block indicators
  if (text.includes('SecurityCompromiseError') ||
      text.includes('Target URL returned error') ||
      text.includes('requiring CAPTCHA')) {
    return null;
  }

  // Parse Jina response format:
  // Title: ...
  // URL Source: ...
  // Markdown Content:
  // ...actual content...
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : extractTitleFallback(url);

  // Skip "Just a moment..." Cloudflare pages
  if (title === 'Just a moment...' || title === 'Attention Required!') {
    return null;
  }

  // Extract content after "Markdown Content:" marker
  const contentMarker = text.indexOf('Markdown Content:');
  let content = contentMarker >= 0
    ? text.slice(contentMarker + 'Markdown Content:'.length).trim()
    : text;

  // Clean markdown artifacts
  content = cleanMarkdown(content);

  // Prepend title so it gets translated
  const fullText = `${title}\n\n${content}`;

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) return null;

  return { title, text: fullText, wordCount };
}

// ── ALLORIGINS PROXY ─────────────────────────────────────

async function fetchViaAllOrigins(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const html = data.contents;

  if (!html || html.length < 500) return null;

  // Check for Cloudflare block pages
  if (html.includes('Just a moment...') ||
      html.includes('Attention Required!') ||
      html.includes('Enable JavaScript and cookies')) {
    return null;
  }

  const title = extractTitleFromHtml(html);
  const bodyText = extractMainText(html);
  const fullText = `${title}\n\n${bodyText}`;

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) return null;

  return { title, text: fullText, wordCount };
}

// ── MARKDOWN CLEANUP ─────────────────────────────────────

function cleanMarkdown(text) {
  // Step 1: Cut off at "noise" sections (everything after these is not main content)
  const cutPatterns = [
    // Markdown headings with noise keywords
    /\n#{1,4}\s*(?:See [Aa]lso|References|External [Ll]inks|Further [Rr]eading|Notes|Footnotes|Bibliography|Sources|Related [Aa]rticles?|Xem thêm|Tham khảo|Bài viết liên quan|Đọc thêm)\s*\n/,
    // Plain text noise keywords
    /\n(?:See [Aa]lso|References|External [Ll]inks|Related [Pp]osts?|Recommended|You (?:may|might) also (?:like|enjoy)|More (?:from|stories|articles)|Popular (?:posts?|articles?)|Share this|Comments?|Leave a (?:comment|reply)|Tags?:|Categories?:)\s*\n/,
    // Markdown italic/bold variants: _Xem thêm_, *Xem thêm*, **See also**, _See also_:
    /\n[^a-zA-Z\n]*[_*]{1,2}(?:Xem thêm|See [Aa]lso|Read [Mm]ore|Related|Đọc thêm|Bài viết liên quan)[_*]{1,2}\s*[:.]?\s*/,
    // Emoji prefixed: 📎 Xem thêm, 👉 See also
    /\n[^\n]{0,5}(?:Xem thêm|See [Aa]lso|Read [Mm]ore|Đọc thêm)\s*[:.]?\s/,
  ];

  for (const pattern of cutPatterns) {
    const match = text.match(pattern);
    if (match) {
      text = text.slice(0, match.index);
    }
  }

  // Step 2: Remove non-content lines
  const lines = text.split('\n');
  const cleaned = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines (keep for paragraph breaks)
    if (!trimmed) { cleaned.push(''); continue; }

    // Skip image markdown ![alt](url)
    if (/^!\[/.test(trimmed)) continue;

    // Skip lines that are just URLs
    if (/^https?:\/\/\S+$/.test(trimmed)) continue;

    // Skip metadata lines (date, author, reading time, etc.)
    if (/^(?:By |Written by |Author:|Published|Updated|Date:|Posted|Photo by )/i.test(trimmed)) continue;
    if (/^\d{1,2}\s*(?:min|minute|phút)\s*read$/i.test(trimmed)) continue;
    if (/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4}/i.test(trimmed)) continue;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) continue;

    // Skip social/share buttons
    if (/^(?:Share|Tweet|Pin|Email|Print|Copy link|Follow|Subscribe|Sign up|Log in|Sign in)/i.test(trimmed) && trimmed.length < 40) continue;

    // Skip ad/promo indicators
    if (/^(?:Advertisement|Sponsored|Promoted|Ad|ADVERTISEMENT)/i.test(trimmed)) continue;

    // Skip navigation-like short lines (many consecutive short lines = nav menu)
    if (trimmed.length < 25 && /^[A-Z]/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes(',')) {
      // Check if it looks like a heading (preceded by blank line, followed by content)
      const prevLine = cleaned[cleaned.length - 1]?.trim();
      if (prevLine === '' || prevLine === undefined) {
        // Could be a heading — keep it
        cleaned.push(line);
        continue;
      }
      // Otherwise likely nav item — skip
      continue;
    }

    // Convert markdown links [text](url) → text
    const cleanedLine = trimmed.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    cleaned.push(cleanedLine);
  }

  return cleaned.join('\n')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing nav debris (short lines at start)
    .replace(/^(?:[^\n]{1,20}\n){3,}/m, (block) => {
      // If first few lines are all short, likely nav — remove
      const blockLines = block.split('\n');
      if (blockLines.every(l => l.trim().length < 25)) return '';
      return block;
    })
    .trim();
}

// ── HTML PARSING (for AllOrigins fallback) ────────────────

function extractMainText(html) {
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Try main content areas
  const mainPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*(?:class|id)="[^"]*(?:content|article|post|entry|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of mainPatterns) {
    const match = clean.match(pattern);
    if (match) {
      const extracted = stripTags(match[0]);
      if (extracted.split(/\s+/).length > 80) {
        return cleanWhitespace(extracted);
      }
    }
  }

  // Fallback: body
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return cleanWhitespace(stripTags(bodyMatch ? bodyMatch[1] : clean));
}

function stripTags(html) {
  return html
    .replace(/<\/?(p|div|br|li|h[1-6]|blockquote|tr|article|section)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c));
}

function cleanWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── TITLE EXTRACTION ─────────────────────────────────────

function extractTitleFromHtml(html) {
  const og = html.match(/property="og:title"\s+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"\s+property="og:title"/i);
  if (og) return decodeEntities(og[1].trim());

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return decodeEntities(title[1].trim().split(' | ')[0].split(' - ')[0].trim());

  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].trim());

  return 'Bài viết';
}

function extractTitleFallback(url) {
  try {
    const path = new URL(url).pathname;
    const slug = path.split('/').filter(Boolean).pop() || '';
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Bài viết';
  } catch {
    return 'Bài viết';
  }
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
