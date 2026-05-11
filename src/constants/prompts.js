// ─── Audience definitions ───
export const AUDIENCES = [
  {
    id: 'beginner',
    label: 'Người mới tìm hiểu',
    icon: '🌱',
    description: 'Giải thích đơn giản, dễ hiểu',
  },
  {
    id: 'expert',
    label: 'Chuyên gia nghiên cứu sâu',
    icon: '🎓',
    description: 'Giữ nguyên thuật ngữ chuyên sâu',
  },
  {
    id: 'explorer',
    label: 'Người muốn có thêm góc nhìn',
    icon: '🔍',
    description: 'Bổ sung ngữ cảnh và ghi chú',
  },
];

export const AUDIENCE_INSTRUCTIONS = {
  beginner: {
    translate: `The reader is a BEGINNER who is new to this field. You MUST:
- Use simple, everyday Vietnamese words whenever possible
- When a technical term appears, translate it AND include the original English term in parentheses on first use, e.g., "tỷ suất hoàn vốn (ROI)"
- Break complex sentences into shorter, simpler ones
- Prefer concrete examples over abstract explanations`,
    review: `The reader is a BEGINNER. Simplify language further:
- Replace any remaining jargon with plain Vietnamese
- Ensure every technical term has a brief Vietnamese explanation
- Use short paragraphs and clear structure
- Prioritize clarity over precision of terminology`,
  },
  expert: {
    translate: `The reader is a DOMAIN EXPERT with deep knowledge. You MUST:
- Keep all technical terminology precise and accurate — do NOT oversimplify
- Use established Vietnamese academic/professional terms where they exist
- Keep original English terms for concepts that experts commonly use in English
- Maintain the analytical depth and nuance of the original text
- Do not add explanations for standard domain concepts`,
    review: `The reader is a DOMAIN EXPERT. During review:
- Ensure all technical terms are used correctly and consistently
- Verify domain-specific accuracy is preserved
- Keep professional register and formal tone
- Do NOT simplify — experts expect precise language`,
  },
  explorer: {
    translate: `The reader wants ADDITIONAL PERSPECTIVES and context. You MUST:
- Translate accurately as the main content
- When encountering key concepts, add brief contextual notes in [brackets] to provide Vietnamese readers with relevant background
- For important terms, include both Vietnamese translation and English original
- Help the reader see connections between ideas by using clear transition phrases`,
    review: `The reader wants DEEPER UNDERSTANDING. During review:
- Add brief contextual notes [in brackets] for key concepts that benefit from extra context
- Ensure smooth reading flow — notes should enhance, not interrupt
- Include alternative Vietnamese expressions for ambiguous terms
- Help connect ideas across paragraphs for better comprehension`,
  },
};

// ─── Topic definitions ───
export const TOPICS = [
  { id: 'marketing',   label: 'Marketing & Quảng cáo',    icon: '📢' },
  { id: 'technology',  label: 'Công nghệ & IT',           icon: '💻' },
  { id: 'finance',     label: 'Tài chính & Ngân hàng',    icon: '💰' },
  { id: 'medical',     label: 'Y tế & Sức khỏe',          icon: '🏥' },
  { id: 'legal',       label: 'Pháp luật & Hợp đồng',     icon: '⚖️' },
  { id: 'education',   label: 'Giáo dục & Đào tạo',       icon: '📚' },
  { id: 'ecommerce',   label: 'Thương mại điện tử',        icon: '🛒' },
  { id: 'realestate',  label: 'Bất động sản',              icon: '🏠' },
  { id: 'science',     label: 'Khoa học & Nghiên cứu',     icon: '🔬' },
  { id: 'general',     label: 'Chủ đề chung',              icon: '📄' },
];

// ─── Topic-specific expertise for translate prompt ───
export const TOPIC_EXPERTISE = {
  marketing: {
    expertise: `advertising language, marketing terminology (branding, performance marketing, content marketing, creative strategy, digital marketing, social media marketing, SEO/SEM, conversion optimization, customer journey, funnel, KPIs)`,
    tone: `natural, persuasive yet professional tone suitable for Vietnamese marketing professionals and business readers`,
    terms: `Keep common marketing terms in English where Vietnamese readers would expect them (e.g., ROI, KPI, CTA, landing page, funnel, lead, branding, insight, content, brief, target audience). Translate conceptual terms naturally.`,
  },
  technology: {
    expertise: `software engineering, cloud computing, AI/ML, cybersecurity, networking, DevOps, system architecture, programming concepts, APIs, databases, SaaS/PaaS/IaaS`,
    tone: `clear, precise, and technical yet accessible tone for Vietnamese IT professionals and tech-savvy readers`,
    terms: `Keep standard tech terms in English (e.g., API, framework, backend, frontend, cloud, server, database, deploy, commit, merge, pipeline, container, microservice, SDK, runtime). Translate higher-level concepts naturally.`,
  },
  finance: {
    expertise: `banking, investment, accounting, financial analysis, risk management, stock market, insurance, fintech, monetary policy, corporate finance, derivatives, portfolio management`,
    tone: `formal, precise, and trustworthy tone suitable for Vietnamese finance professionals and business executives`,
    terms: `Keep widely-used finance terms (e.g., ROI, P/E ratio, ETF, IPO, hedge fund, fintech, blockchain). Translate Vietnamese-equivalent terms naturally (lãi suất, cổ phiếu, trái phiếu, vốn hóa).`,
  },
  medical: {
    expertise: `clinical medicine, pharmacology, public health, medical devices, clinical trials, healthcare management, anatomy, pathology, diagnostics, patient care protocols`,
    tone: `precise, formal, and scientifically accurate tone suitable for Vietnamese healthcare professionals and medical researchers`,
    terms: `Keep Latin/English medical terms with Vietnamese explanation on first use (e.g., "hội chứng metabolic (metabolic syndrome)"). Use standard Vietnamese medical terminology where established.`,
  },
  legal: {
    expertise: `contract law, corporate law, intellectual property, compliance, international law, dispute resolution, regulatory frameworks, litigation, labor law, commercial law`,
    tone: `formal, precise, and legally rigorous tone suitable for Vietnamese lawyers, legal professionals, and business compliance teams`,
    terms: `Use established Vietnamese legal terminology. Keep English terms only when no standard Vietnamese equivalent exists. Maintain exact legal phrasing — do not paraphrase legal definitions or clauses.`,
  },
  education: {
    expertise: `pedagogy, curriculum design, e-learning, educational technology, student assessment, academic research methodology, higher education, K-12, STEM education, professional development`,
    tone: `clear, accessible, and academically appropriate tone for Vietnamese educators, students, and academic professionals`,
    terms: `Translate educational terms to Vietnamese equivalents (e.g., curriculum → chương trình giảng dạy, syllabus → đề cương). Keep universally known terms (e.g., STEM, IELTS, TOEFL, GPA).`,
  },
  ecommerce: {
    expertise: `online retail, marketplace platforms, dropshipping, supply chain, payment gateways, customer experience, conversion optimization, product listing, fulfillment, logistics, D2C`,
    tone: `practical, business-oriented, and accessible tone for Vietnamese e-commerce entrepreneurs and online business operators`,
    terms: `Keep common e-commerce terms (e.g., dropshipping, fulfillment, checkout, SKU, marketplace, add-to-cart, conversion rate). Translate business strategy terms naturally.`,
  },
  realestate: {
    expertise: `property valuation, real estate investment, property management, urban planning, construction, mortgage, land law, commercial real estate, residential development`,
    tone: `professional, trustworthy, and informative tone for Vietnamese real estate professionals, investors, and property buyers`,
    terms: `Use Vietnamese real estate terminology (bất động sản, quyền sử dụng đất, sổ đỏ, sổ hồng, quy hoạch). Keep English terms only for international concepts (e.g., REITs, coworking space).`,
  },
  science: {
    expertise: `research methodology, scientific writing, peer review, data analysis, laboratory techniques, environmental science, physics, chemistry, biology, engineering research`,
    tone: `objective, precise, and academically rigorous tone for Vietnamese researchers, scientists, and academic professionals`,
    terms: `Keep scientific nomenclature in original form (Latin names, chemical formulas, SI units). Translate explanatory text naturally. Use established Vietnamese scientific terms where available.`,
  },
  general: {
    expertise: `general knowledge, business communication, news, reports, documentation, presentations, various professional fields`,
    tone: `natural, clear, and easy-to-understand tone for general Vietnamese readers`,
    terms: `Translate most terms to Vietnamese. Keep only universally recognized English terms that have no natural Vietnamese equivalent.`,
  },
};

// ─── Generate review prompt for a topic + audience ───
export function getReviewPrompt(topicId = 'general', audienceId = 'beginner') {
  const topic = TOPIC_EXPERTISE[topicId] || TOPIC_EXPERTISE.general;
  const topicLabel = TOPICS.find(t => t.id === topicId)?.label || 'chung';
  const audience = AUDIENCE_INSTRUCTIONS[audienceId] || AUDIENCE_INSTRUCTIONS.beginner;

  return `SYSTEM ROLE
You are an advanced AI assistant simultaneously performing TWO roles:
1. A Vietnamese Linguistics Expert with 20 years of experience
2. A ${topicLabel} specialist with deep domain knowledge
---
AUDIENCE PROFILE
${audience.review}
---
TASK CONTEXT
Your task is to REWRITE Vietnamese text so that:
- It is easier to understand for the target audience described above
- The original meaning, information, and logic are preserved 100%
- Domain-specific terminology is used correctly and consistently
- NO content is removed
- NO new ideas are added
- NO interpretation, commentary, or expansion is introduced
The goal is to SIMPLIFY LANGUAGE and ENSURE DOMAIN ACCURACY, not to summarize.
---
TERMINOLOGY GUIDELINES
${topic.terms}
---
STEP-BY-STEP INSTRUCTIONS
Step 1. Read the entire original text carefully
Step 2. Identify long/complex sentences and difficult vocabulary
Step 3. Rewrite: break long sentences, replace difficult words with common equivalents, ensure domain terms are accurate
Step 4. Review: verify no meaning lost, no new meaning added, no distortion
---
FORMAT INSTRUCTIONS
- Use Markdown formatting for clear readability
- Use ## for main headings, ### for sub-headings
- Use **bold** for key terms
- Use bullet points (- or *) for lists
- Use numbered lists where appropriate
- Add blank lines between paragraphs
- Use > for important quotes or notes
---
CONSTRAINTS (STRICT)
- Do NOT summarize
- Do NOT remove any information
- Do NOT add examples or explanations
- Do NOT add personal opinions
- Do NOT change the author's original viewpoint
- Do NOT use emotional, persuasive, or marketing-style language
---
OUTPUT FORMAT
- Output ONLY the rewritten Vietnamese text in Markdown format
- Do NOT include explanations, commentary, or suggestions
- Do NOT compare with the original text
- Do NOT add titles if the original text does not contain them`;
}
