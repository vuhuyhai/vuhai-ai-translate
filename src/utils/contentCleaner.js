export function cleanSectionContent(text) {
  if (!text) return '';

  return text
    // Xóa "Phần X: Trang Y – Z" và các biến thể
    .replace(/^Phần\s+\d+\s*[:\u2013]\s*Trang\s+[\d\s\u2013-]+\n*/gim, '')
    .replace(/^Section\s+\d+\s*[:\u2013]\s*Pages?\s+[\d\s\u2013-]+\n*/gim, '')
    .replace(/^Đoạn\s+\d+\s*[:\-–][^\n]*\n*/gim, '')
    .replace(/^Part\s+\d+\s*[:\-–][^\n]*\n*/gim, '')

    // Xóa metadata dạng [Section X] hoặc [Phần X]
    .replace(/^\[(?:Section|Phần|Part|Đoạn)\s*\d+[^\]]*\]\s*\n*/gim, '')

    // Xóa dòng chỉ có số trang như "--- Trang 15 ---"
    .replace(/^[-–—]+\s*Trang\s+\d+\s*[-–—]+\s*\n*/gim, '')
    .replace(/^[-–—]+\s*Page\s+\d+\s*[-–—]+\s*\n*/gim, '')

    // Xóa dấu phân cách thừa (nhiều dấu gạch liên tiếp)
    .replace(/^[-=_]{5,}\s*\n/gim, '')

    // Xóa dòng trống dư thừa (giữ tối đa 2 dòng trống liên tiếp)
    .replace(/\n{3,}/g, '\n\n')

    .trim();
}

export function cleanAllSections(sections) {
  return sections
    .filter(s => s.status === 'done' || s.translatedText)
    .map(s => ({
      ...s,
      cleanedText: cleanSectionContent(
        s.harmonizedText || s.translatedText || ''
      ),
    }));
}
