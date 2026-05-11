import { fetchGeminiCompletion } from './geminiApi';
import {
  buildHarmonizerSystemPrompt,
  buildHarmonizerUserPrompt,
  parseHarmonizerOutput,
} from '../constants/harmonizerPrompt';

export async function runHarmonizer(sections, config, onProgress) {
  const { topic, audience, glossary = [] } = config;

  onProgress?.({ step: 1, label: 'Chuẩn bị văn bản...', percent: 10 });

  const systemPrompt = buildHarmonizerSystemPrompt({ topic, audience, glossary });
  const userPrompt = buildHarmonizerUserPrompt(sections);

  if (!userPrompt.trim()) {
    throw new Error('Không có đoạn nào đã dịch để harmonize.');
  }

  onProgress?.({ step: 2, label: 'AI đang duyệt toàn văn bản...', percent: 25 });

  let rawOutput;
  try {
    rawOutput = await fetchGeminiCompletion(systemPrompt, userPrompt);
  } catch (err) {
    throw new Error(`Harmonizer lỗi: ${err.message || err.info?.title || 'Lỗi không xác định'}`);
  }

  onProgress?.({ step: 3, label: 'Xử lý kết quả...', percent: 90 });

  const result = parseHarmonizerOutput(rawOutput, sections);

  onProgress?.({ step: 4, label: 'Hoàn thành', percent: 100 });

  return result;
}
