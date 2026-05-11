# Smoke Test M1 — Token Optimization Refactor

> Test sau khi hoàn thành M1 (refactor 3-agent → 1-agent + bỏ glossary call riêng).
> Cùng PDF, cùng config với baseline để so sánh apples-to-apples.
> Date: 2026-05-11
> Latest commit: 521bf49

## Cấu hình test (PHẢI GIỐNG BASELINE)

- PDF: `samples/baseline.pdf` (HFA, 30 trang, 7,867 từ)
- Topic: **legal**
- Audience: **expert**
- Key tier: **free**
- enableReview: **OFF** (default)
- Restart browser tab trước khi test (đảm bảo Zustand state fresh)
- Clear DevTools Console (Ctrl+L) trước khi dịch

## Quy trình

1. `npm run dev` → mở http://localhost:5173
2. Login → nhập API key → topic=legal, audience=expert
3. F12 → Console tab → filter "GEMINI-TOKENS" → Clear (Ctrl+L)
4. Upload `samples/baseline.pdf`, đợi extract xong (~3 sections)
5. Click "Dịch tất cả"
6. Đợi tới khi **TẤT CẢ 3 sections complete** (không có status=pending nào)
7. Copy toàn bộ log có `[GEMINI-TOKENS]` → paste vào section "Raw logs" dưới

## Acceptance Criteria (từ spec)

| # | Criterion | Baseline | After M1 | Status |
|---|---|---|---|---|
| 1 | Token total giảm ≥50% | 150,459 | 69,987 (-53.5%) | ✅ PASS |
| 2 | API calls từ 12 → 3 | 12 | 3 | ✅ PASS |
| 3 | Quality không giảm | — | Streaming clean, no separator leak | ✅ PASS |
| 4 | Streaming UX hoạt động | OK | Text xuất hiện dần dần, no marker | ✅ PASS |
| 5 | Glossary auto-extract | OK | 30 new terms in panel | ✅ PASS (vượt expect 5-15) |
| 6 | previousContext consistency | OK | Mạch văn nối tiếp tự nhiên giữa 3 sections | ✅ PASS |
| 7 | Resume after error | — | N/A (no errors during test) | ✅ N/A |

## Raw logs sau M1

```
[GEMINI-TOKENS] stream | model=gemini-2.5-flash | prompt=3793 | output=5604 | total=27128
[GEMINI-TOKENS] stream | model=gemini-2.5-flash | prompt=3741 | output=6632 | total=26288
[GEMINI-TOKENS] stream | model=gemini-2.5-flash | prompt=4765 | output=6844 | total=16571
```

Totals:

- Prompt: 12,299
- Output: 19,080
- Total: 69,987
- Thinking (computed): 38,608 (55%)
- Calls with model=undefined: 0

## Quan sát chất lượng

- **Streaming UI:** clean — Vietnamese text xuất hiện dần dần, không có chuỗi `---TRANSLATION---` hoặc `---TERMS---` nào lọt ra UI
- **Glossary panel:** 30 new terms với status `suggested` (vượt dự kiến 5-15 — unified prompt extract terms hiệu quả hơn extract call riêng cũ)
- **Mạch văn section 2-3 vs section 1:** tự nhiên, mạch văn nối tiếp; thuật ngữ nhất quán nhờ glossaryTable + translatedTail trong prompt
- **Bug visible:** không

## Kết luận

- [x] **PASS — vào M2**
- Acceptance 1-6 all green, #7 N/A
- Per-section avg: 23,329 tokens (so với 50,153 baseline = -53%)
- Thinking tỷ trọng tăng 42% → 55% (vì bỏ analyst+editor+glossary là các call ít thinking; còn lại translator là call thinking nhiều nhất). Đây là tin TỐT cho M2 vì `thinkingBudget: 0` sẽ tiết kiệm thêm ~38k token nữa.
- Cumulative target sau M2: **~75-80% saving**
