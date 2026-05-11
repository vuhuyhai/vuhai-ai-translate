import { fetchAICompletion } from './aiService';
import { TOPICS } from '../constants/prompts';

/**
 * Build extraction prompt for a given topic.
 */
function buildExtractPrompt(topic) {
  const topicLabel = TOPICS.find(t => t.id === topic)?.label || topic;
  return `Bạn là chuyên gia thuật ngữ chuyên ngành ${topicLabel}.
Đọc đoạn văn sau và trích xuất TẤT CẢ thuật ngữ quan trọng.

Trả về JSON array (không có markdown, không có giải thích, chỉ JSON thuần):
[
  {
    "termEN": "Customer Lifetime Value",
    "termVI": "Giá trị vòng đời khách hàng",
    "termVIAlts": ["CLV", "Giá trị trọn đời khách hàng"],
    "context": "câu trích dẫn chứa thuật ngữ này",
    "notes": "viết tắt: CLV, CLTV"
  }
]

Chỉ extract thuật ngữ THỰC SỰ chuyên ngành.
Không extract từ thông thường (the, and, company, market...).
Tối đa 15 thuật ngữ mỗi lần.`;
}

/**
 * Parse AI response into GlossaryEntry array.
 * Handles markdown-wrapped JSON and malformed responses gracefully.
 */
function parseTermsResponse(responseText, topic) {
  try {
    // Strip markdown code fences if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    return parsed
      .filter(t => t.termEN && t.termVI)
      .map(t => ({
        id: crypto.randomUUID(),
        termEN: String(t.termEN).trim(),
        termVI: String(t.termVI).trim(),
        termVIAlts: Array.isArray(t.termVIAlts) ? t.termVIAlts.map(String) : [],
        topic,
        context: String(t.context || '').trim(),
        notes: String(t.notes || '').trim(),
        status: 'suggested',
        usageCount: 1,
        createdAt: now,
        updatedAt: now,
      }));
  } catch {
    return [];
  }
}

/**
 * Extract glossary terms from a section of text using AI.
 * Non-blocking — returns [] on any failure.
 */
export async function extractTermsFromSection(sectionText, topic, options = {}) {
  try {
    const prompt = buildExtractPrompt(topic);
    const response = await fetchAICompletion(prompt, sectionText, options);
    return parseTermsResponse(response, topic);
  } catch {
    return [];
  }
}

/**
 * Build a markdown table from approved glossary entries
 * to inject into translation prompts.
 */
export function buildGlossaryContext(entries) {
  const approved = entries
    .filter(e => e.status === 'approved')
    .sort((a, b) => a.termEN.localeCompare(b.termEN));

  if (approved.length === 0) return '';

  const header = '| English | Vietnamese | Ghi chú |\n|---|---|---|';
  const rows = approved.map(e => {
    const notes = e.notes || (e.termVIAlts.length ? `Alt: ${e.termVIAlts.join(', ')}` : '');
    return `| ${e.termEN} | ${e.termVI} | ${notes} |`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Merge new terms into existing array.
 * Dedup by termEN (case-insensitive). If duplicate, keep old entry + increment usageCount.
 */
export function mergeNewTerms(existing, newTerms) {
  const existingMap = new Map(
    existing.map(e => [e.termEN.toLowerCase(), e])
  );

  const toAdd = [];

  for (const term of newTerms) {
    const key = term.termEN.toLowerCase();
    const found = existingMap.get(key);
    if (found) {
      found.usageCount += 1;
      found.updatedAt = Date.now();
    } else {
      existingMap.set(key, term);
      toAdd.push(term);
    }
  }

  return [...existing.map(e => {
    const updated = existingMap.get(e.termEN.toLowerCase());
    return updated || e;
  }), ...toAdd];
}
