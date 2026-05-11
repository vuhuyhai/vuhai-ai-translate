// Gemini 2.5 Flash Paid pricing
const PRICING = {
  'gemini-2.5-flash': {
    inputPerMToken: 0.30,
    outputPerMToken: 2.50,
  },
  'gemini-2.5-flash-lite': {
    inputPerMToken: 0.10,
    outputPerMToken: 0.40,
  },
};

// 1 section ~ 2500 words ~ 3250 input tokens
// Output ~ 60% input length
const AVG_INPUT_TOKENS_PER_SECTION = 3250;
const AVG_OUTPUT_RATIO = 0.6;

export function estimateCost(sectionCount, mode = 'quick') {
  const model = 'gemini-2.5-flash';
  const pricing = PRICING[model];

  // Quick: 1 call/section | Pro: 2 calls/section
  const callsPerSection = mode === 'quick' ? 1 : 2;

  const inputTokens = sectionCount * callsPerSection * AVG_INPUT_TOKENS_PER_SECTION;
  const outputTokens = inputTokens * AVG_OUTPUT_RATIO;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMToken;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMToken;
  const totalUSD = inputCost + outputCost;

  return {
    totalUSD: parseFloat(totalUSD.toFixed(4)),
    totalVND: Math.ceil(totalUSD * 25000),
    inputTokens: Math.round(inputTokens),
    outputTokens: Math.round(outputTokens),
  };
}
