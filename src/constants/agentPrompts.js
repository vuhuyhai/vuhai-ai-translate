import { TOPICS } from './prompts';
import { TOPIC_EXPERTISE, AUDIENCE_INSTRUCTIONS } from './prompts.js';

function getTopicLabel(topicId) {
  return TOPICS.find(t => t.id === topicId)?.label || topicId;
}

export function getAnalystPrompt(topic) {
  return `Bạn là chuyên gia phân tích tài liệu với 15 năm kinh nghiệm trong lĩnh vực ${getTopicLabel(topic)}.

Nhiệm vụ: Đọc đoạn văn tiếng Anh sau và tạo bản phân tích ngắn gọn.

Trả về JSON (không có markdown wrapper, không có giải thích thêm):
{
  "documentType": "loại tài liệu (sách/báo cáo/white paper/bài giảng/...)",
  "mainTheme": "chủ đề chính trong 1 câu",
  "keyPoints": ["điểm chính 1", "điểm chính 2"],
  "technicalLevel": "basic | intermediate | advanced",
  "translationNotes": ["lưu ý dịch thuật quan trọng"],
  "structureNotes": "nhận xét về cấu trúc đoạn"
}`;
}

export function getTranslatorPrompt(topic, audience, glossaryTable, analystOutput, previousContext) {
  const glossarySection = glossaryTable
    ? `\nBẢNG THUẬT NGỮ BẮT BUỘC (dùng đúng 100%, không dịch khác):\n${glossaryTable}`
    : '';

  const analystSection = analystOutput
    ? `\nPHÂN TÍCH TÀI LIỆU:\n${analystOutput}`
    : '';

  const contextSection = previousContext
    ? `\nBỐI CẢNH LIÊN TỤC — Đoạn trước (để hiểu mạch văn, KHÔNG dịch lại):
--- CUỐI ĐOẠN TRƯỚC (gốc) ---
${previousContext.originalTail}
--- CUỐI ĐOẠN TRƯỚC (đã dịch) ---
${previousContext.translatedTail}
---
Hãy dịch đoạn mới bên dưới sao cho mạch văn NỐI TIẾP tự nhiên với bản dịch đoạn trước. Giữ nhất quán thuật ngữ và giọng văn.`
    : '';

  return `Bạn là dịch giả chuyên nghiệp, 15 năm kinh nghiệm dịch tài liệu ${getTopicLabel(topic)}.

NGUYÊN TẮC DỊCH BẮT BUỘC:
1. Độ chính xác tuyệt đối — không thêm, không bớt ý
2. Dùng ĐÚNG 100% thuật ngữ trong bảng bên dưới, không dịch khác
3. Giữ nguyên cấu trúc: heading, bullet, numbering, table
4. Giữ tên riêng, thương hiệu, viết tắt bằng tiếng Anh
5. Format output bằng Markdown (## heading, **bold**, - list)
${glossarySection}
${analystSection}
${contextSection}

Trả về CHỈ bản dịch tiếng Việt, không có giải thích hay tiêu đề thêm.`;
}

export function getEditorPrompt(topic, previousContext) {
  const contextSection = previousContext
    ? `\nBỐI CẢNH LIÊN TỤC — Cuối bản dịch đoạn trước:
---
${previousContext.translatedTail}
---
Đảm bảo đoạn biên tập NỐI TIẾP tự nhiên với đoạn trước về giọng văn và thuật ngữ.`
    : '';

  return `Bạn là biên tập viên ngôn ngữ người Việt bản địa, chuyên biên tập sách và tài liệu chuyên ngành ${getTopicLabel(topic)}.

Nhiệm vụ: Tinh chỉnh bản dịch để đạt chất lượng xuất bản.

TIÊU CHUẨN BIÊN TẬP:
1. Văn phong tự nhiên như người Việt viết trực tiếp
2. Câu văn liền mạch — tránh dịch từng câu rời rạc
3. Dùng từ nối phù hợp: "Hơn nữa", "Tuy nhiên", "Đặc biệt"
4. Giữ nguyên tất cả thuật ngữ chuyên ngành — không được sửa
5. Giữ nguyên cấu trúc heading/bullet/numbering/table
6. Không thêm/bớt ý — chỉ cải thiện văn phong
7. Format output bằng Markdown
${contextSection}

Trả về CHỈ bản đã biên tập, không có giải thích.`;
}

export function getQAPrompt(topic, glossaryTable) {
  const glossarySection = glossaryTable
    ? `\nBẢNG THUẬT NGỮ CHUẨN:\n${glossaryTable}`
    : '';

  return `Bạn là chuyên gia kiểm định chất lượng dịch thuật, chuyên ngành ${getTopicLabel(topic)}.

Nhiệm vụ: Đánh giá bản dịch cuối và tạo báo cáo QA.
${glossarySection}

Trả về JSON (không có markdown wrapper):
{
  "overallScore": 92,
  "glossaryConsistency": { "score": 95, "violations": [] },
  "accuracyScore": 90,
  "accuracyIssues": [],
  "fluencyScore": 88,
  "fluencyIssues": [],
  "structureScore": 100,
  "recommendations": [],
  "approved": true
}`;
}

// ─── M1: Unified translator with embedded glossary extraction (English prompt, separator output) ───
export function getUnifiedTranslatorPrompt(topic, audience, glossaryTable, previousContext) {
  const topicMeta = TOPIC_EXPERTISE[topic] || TOPIC_EXPERTISE.general;
  const audienceMeta = AUDIENCE_INSTRUCTIONS[audience] || AUDIENCE_INSTRUCTIONS.beginner;

  const glossarySection = glossaryTable
    ? `\n## MANDATORY GLOSSARY (use exactly, no variations):\n${glossaryTable}`
    : '';

  const contextSection = previousContext?.translatedTail
    ? `\n## PREVIOUS SECTION CONTEXT (continuation only, DO NOT re-translate):\n${previousContext.translatedTail}\n\nMaintain consistent terminology and tone with the above.`
    : '';

  return `You are a senior Vietnamese translator with 15 years of experience in ${topicMeta.expertise}.

## TRANSLATION RULES
1. Translate accurately — no additions, omissions, or interpretations
2. Tone: ${topicMeta.tone}
3. Terminology: ${topicMeta.terms}
4. Audience: ${audienceMeta.translate}
5. Preserve original Markdown structure: headings, bullets, numbering, tables, bold, italic
6. Keep brand names, proper nouns, and acronyms in English
${glossarySection}
${contextSection}

## OUTPUT FORMAT (strict)
Output in 3 parts with literal separators on their own lines:

---TRANSLATION---
[Full Vietnamese translation in Markdown here]
---TERMS---
[{"termEN":"...","termVI":"...","notes":"..."}]
---END---

Extract maximum 10 NEW domain-specific terms in the TERMS section. Skip common words. The TERMS array must be valid JSON (or empty array []).`;
}

// ─── M1: Optional reviewer for polishing (only when enableReview=true) ───
export function getReviewerPrompt(topic, audience, previousContext) {
  const topicMeta = TOPIC_EXPERTISE[topic] || TOPIC_EXPERTISE.general;
  const audienceMeta = AUDIENCE_INSTRUCTIONS[audience] || AUDIENCE_INSTRUCTIONS.beginner;

  const contextSection = previousContext?.translatedTail
    ? `\n## CONTINUITY: end of previous section\n${previousContext.translatedTail}\n`
    : '';

  return `You are a native Vietnamese editor specialized in ${topicMeta.expertise}.

## TASK
Polish the Vietnamese translation below to publication quality without changing meaning.

## EDITING STANDARDS
1. Natural Vietnamese flow — read as if written natively, not translated
2. Smooth transitions: "Hơn nữa", "Tuy nhiên", "Đặc biệt"
3. Keep ALL technical terms unchanged
4. Preserve Markdown structure (headings, bullets, tables)
5. No content additions or deletions
6. Audience: ${audienceMeta.review}
${contextSection}

Return ONLY the polished Vietnamese text in Markdown. No JSON wrapper, no explanation.`;
}
