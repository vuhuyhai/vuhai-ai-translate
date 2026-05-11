# Smoke Test M2 — Section Size + Thinking Off + Cleanup

> Test sau M2 (section 8000 từ + thinkingBudget=0 + cleanup ~530 dòng dead code).
> Date: 2026-05-11
> Latest commit: (HEAD sau M2.5)

## Cấu hình test (giống M1.7 — apple-to-apple)

- PDF: `samples/baseline.pdf` (HFA, 30 trang, 7,867 từ)
- Topic: **legal**
- Audience: **expert**
- Key tier: **free** (gemini-2.5-flash)
- enableReview: **OFF**
- Incognito + clear localStorage glossary trước khi test

## Sections expected

- 1 section duy nhất (M2.1 short-circuit: 7,867 < SECTION_MAX_WORDS=10,000)

## Token expectations

- 1 API call duy nhất
- Total ≈ prompt + output (thinking = 0 do M2.2)
- Cumulative target: ~28k-30k tokens (-81% so với baseline 150k)

## Acceptance Criteria

| # | Criterion | Baseline (M0.5) | M1 | M2 actual | Status |
|---|---|---|---|---|---|
| 1 | Token total giảm ≥50% | 150,459 | 69,987 | TBD | ⏳ |
| 2 | API calls reduction | 12 | 3 | TBD | ⏳ |
| 3 | Thinking ≈ 0 | 62,594 (42%) | 38,608 (55%) | TBD | ⏳ |
| 4 | Quality không giảm | — | OK | TBD | ⏳ |
| 5 | Streaming UX hoạt động | OK | OK | TBD | ⏳ |
| 6 | Glossary auto-extract | OK (30) | OK (47) | TBD | ⏳ |
| 7 | Backward compat (load doc cũ) | N/A | N/A | TBD | ⏳ |

## Raw logs sau M2
<paste log [GEMINI-TOKENS] here>

## Quan sát chất lượng

- **Streaming UI:** TBD
- **Glossary panel:** TBD terms
- **Markdown structure (heading, bullet, bảng):** TBD
- **Latency cảm nhận:** TBD (M2.2 thinking OFF nên expected nhanh hơn M1 đáng kể)
- **Bug visible:** TBD

## Cumulative savings (3 milestone progression)

| Metric | Baseline (M0.5) | After M1 | After M2 | Cumulative |
|---|---|---|---|---|
| Calls | 12 | 3 | TBD | TBD |
| Σ Prompt | 52,523 | 12,299 | TBD | TBD |
| Σ Output | 35,342 | 19,080 | TBD | TBD |
| Σ Total | 150,459 | 69,987 | TBD | **TBD** |
| Thinking | 62,594 | 38,608 | TBD | TBD |

## Kết luận

- [ ] PASS — vào M3 (monitoring + context caching) HOẶC deploy luôn
- [ ] PASS with concerns — vào M3
- [ ] Fail — debug trước
