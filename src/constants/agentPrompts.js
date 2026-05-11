import { TOPIC_EXPERTISE, AUDIENCE_INSTRUCTIONS } from './prompts.js';

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
