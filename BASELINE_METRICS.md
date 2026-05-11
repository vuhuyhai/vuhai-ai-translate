# Baseline Token Metrics — Pre-Refactor

> Đo trước khi refactor pipeline 3-agent → 1-agent.
> Date: 2026-05-11
> Branch: refactor/token-optimization
> Commit: 6833982

## Test setup

- **PDF mẫu**: `samples/baseline.pdf` (HFA State of States 2026, 30 trang đầu, 7,867 từ)
- **Topic**: legal
- **Audience**: expert
- **Key tier**: free (gemini-2.5-flash family)
- **Sections**: 3 (chia theo SECTION_TARGET_WORDS=2500)
- **Calls**: 12 (= 3 × 4: analyst + translator + editor + glossary)

## Raw logs

| # | Type | Model | Prompt | Output | Total | Thinking* |
|---|---|---|---|---|---|---|
| 1 | fetch (analyst S1) | gemini-2.5-flash | 3,632 | 1,702 | 6,952 | 1,618 |
| 2 | stream (translator S1) | gemini-2.5-flash | 5,216 | 5,159 | 10,375 | 0 |
| 3 | fetch (editor S1) | gemini-2.5-flash | 5,304 | 5,244 | 29,530 | 18,982 |
| 4 | fetch (analyst S2) | gemini-2.5-flash | 3,431 | 917 | 5,471 | 1,123 |
| 5 | fetch (glossary S1) | undefined | 3,643 | 1,632 | 8,318 | 3,043 |
| 6 | stream (translator S2) | gemini-2.5-flash | 4,589 | 1,805 | 18,836 | 12,442 |
| 7 | fetch (editor S2) | gemini-2.5-flash | 2,144 | 1,827 | 3,971 | 0 |
| 8 | fetch (analyst S3) | gemini-2.5-flash | 4,467 | 738 | 6,653 | 1,448 |
| 9 | fetch (glossary S2) | undefined | 3,442 | 1,773 | 7,025 | 1,810 |
| 10 | stream (translator S3) | gemini-2.5-flash | 5,482 | 6,401 | 24,934 | 13,051 |
| 11 | fetch (editor S3) | gemini-2.5-flash | 6,695 | 6,498 | 19,133 | 5,940 |
| 12 | fetch (glossary S3) | undefined | 4,478 | 1,646 | 9,261 | 3,137 |
| **TOTAL** | | | **52,523** | **35,342** | **150,459** | **62,594** |

*Thinking = total - prompt - output (chỉ Gemini 2.5 Flash/Pro có)

## Per-agent breakdown

| Agent | Calls | Σ Prompt | Σ Output | Σ Total | % grand total |
|---|---|---|---|---|---|
| Analyst | 3 | 11,530 | 3,357 | 19,076 | 12.7% |
| Translator | 3 | 15,287 | 13,365 | 54,145 | 36.0% |
| Editor | 3 | 14,143 | 13,569 | 52,634 | 35.0% |
| Glossary | 3 | 11,563 | 5,051 | 24,604 | 16.4% |
| **Total** | **12** | **52,523** | **35,342** | **150,459** | **100%** |

## Per-section average

- 50,153 tokens / section (gấp 2x dự đoán spec 23,550)
- Lý do: thinking tokens không trong spec

## Critical findings

1. **Thinking tokens = 42% total cost** — Gemini 2.5 Flash default ON. M2 phải thêm `thinkingBudget: 0` cho translator/editor.
2. **Glossary extraction call** chiếm 16.4% total (3 calls riêng). M1 bỏ hoàn toàn → tiết kiệm 24,604 tokens trực tiếp.
3. **Editor + Analyst = 47.7% total** (35% + 12.7%). M1 bỏ cả 2 (default mode) → tiết kiệm 71,710 tokens (~48%).

## Target sau M1 (bỏ analyst + editor + glossary call riêng)

- Calls: 12 → 3 (1 unified per section)
- Estimated total: ~54,000 tokens (chỉ giữ translator)
- **Tiết kiệm dự kiến: ~64%**

## Target sau M2 (thêm thinkingBudget=0 + section 8000 từ)

- Calls: 3 → 1 (section size 8000 fit 7,867 từ vào 1 section)
- Estimated total: ~25,000-30,000 tokens
- **Tiết kiệm cumulative: ~80%**

## Acceptance criteria from spec

| # | Criterion | Status |
|---|---|---|
| 1 | Token giảm ≥50% | Pending (đo sau M1) |
| 2 | API calls từ 4 → 1 (default) | Pending |
| 3 | Quality không giảm | Pending (manual review) |
| 4 | Streaming UX vẫn work | Pending |
| 5 | Glossary auto-extract | Pending |
| 6 | previousContext consistency | Pending |
| 7 | Resume after error | Pending |
