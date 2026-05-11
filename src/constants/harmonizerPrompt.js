import { TOPICS } from './prompts';

function getTopicLabel(topicId) {
  return TOPICS.find(t => t.id === topicId)?.label || topicId;
}

export function buildHarmonizerSystemPrompt({ topic, audience, glossary = [] }) {
  const glossaryTable = glossary.length > 0
    ? '\nBẢNG THUẬT NGỮ BẮT BUỘC:\n' +
      '| English | Vietnamese |\n|---|---|\n' +
      glossary.map(e => `| ${e.termEN || e.en} | ${e.termVI || e.vi} |`).join('\n')
    : '';

  return `Bạn là biên tập viên cấp cao chuyên thống nhất bản thảo dịch thuật.
Chuyên ngành: ${getTopicLabel(topic)}. Đối tượng: ${audience}.
${glossaryTable}

NHIỆM VỤ — thực hiện đúng 2 việc:

1. ĐỒNG NHẤT THUẬT NGỮ:
   Tìm mọi chỗ cùng khái niệm nhưng dùng từ khác nhau → thống nhất 1 cách dịch
   Ưu tiên bảng thuật ngữ ở trên. Không thay đổi ý nghĩa.

2. NỐI MƯỢT ĐOẠN VĂN:
   Tại mỗi [SECTION BREAK], đảm bảo đoạn cuối trước và đoạn đầu sau liên kết tự nhiên.
   Thêm câu chuyển tiếp nếu bị đứt đoạn. Không thêm heading mới.

QUY TẮC TUYỆT ĐỐI:
- KHÔNG thêm/xóa nội dung
- KHÔNG thay đổi số liệu, tên riêng, thuật ngữ đã chuẩn
- GIỮ NGUYÊN marker [SECTION BREAK] trong output
- GIỮ NGUYÊN tất cả heading (## ) và bullet points

OUTPUT: Chỉ trả về văn bản đã chỉnh sửa.
Sau văn bản, thêm 1 dòng trống rồi viết:
REPORT: [số thuật ngữ thống nhất] terms unified, [số chỗ] transitions smoothed`;
}

export function buildHarmonizerUserPrompt(sections) {
  const doneSections = sections.filter(s => s.status === 'done' && s.translatedText);
  return doneSections
    .map((s, i) => {
      const divider = i > 0 ? '\n\n[SECTION BREAK]\n\n' : '';
      return `${divider}${s.translatedText.trim()}`;
    })
    .join('');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseHarmonizerOutput(rawOutput, originalSections) {
  // Separate text and report line
  const reportLineIndex = rawOutput.lastIndexOf('\nREPORT:');
  const textPart = reportLineIndex > 0
    ? rawOutput.slice(0, reportLineIndex).trim()
    : rawOutput.trim();
  const reportLine = reportLineIndex > 0
    ? rawOutput.slice(reportLineIndex + 1)
    : '';

  // Parse report numbers
  const termsMatch = reportLine.match(/(\d+)\s*terms?\s*unified/i);
  const transMatch = reportLine.match(/(\d+)\s*transitions?\s*smoothed/i);
  const report = {
    unifiedTerms: termsMatch ? parseInt(termsMatch[1]) : 0,
    transitions: transMatch ? parseInt(transMatch[1]) : 0,
  };

  // Map back into sections
  const doneSections = originalSections.filter(s => s.status === 'done' && s.translatedText);
  const splitTexts = textPart.split('[SECTION BREAK]').map(t => t.trim());

  const harmonizedSections = originalSections.map(section => {
    if (section.status !== 'done' || !section.translatedText) return section;
    const idx = doneSections.findIndex(s => s.id === section.id);
    let harmonizedText = splitTexts[idx] ?? section.translatedText;
    // Remove title heading if harmonizer re-added it
    if (section.title) {
      harmonizedText = harmonizedText.replace(
        new RegExp(`^##\\s*${escapeRegex(section.title)}\\s*\\n+`), ''
      );
    }
    return { ...section, harmonizedText: harmonizedText.trim() };
  });

  return { harmonizedSections, report };
}
