import { MAX_FILE_SIZE_BYTES } from '../constants/config';

/**
 * Validate a PDF file. Returns error message string or null if valid.
 */
export function validatePdfFile(pdfFile) {
  if (!pdfFile) return 'Không có file được chọn.';
  if (pdfFile.type !== 'application/pdf') return 'Chỉ chấp nhận file PDF.';
  if (pdfFile.size > MAX_FILE_SIZE_BYTES) return `File vượt quá ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`;
  return null;
}
