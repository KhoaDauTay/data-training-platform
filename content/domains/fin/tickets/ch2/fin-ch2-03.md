---
id: fin-ch2-03
chapter: 2
title: Phải thu và đã thu, kể cả kỳ chưa trả
title_en: Due and collected, unpaid instalments included
from: { name: Lư Thảo Vy, dept: Finance }
difficulty: 2
beat: twist
requires: [select, where, order_by, join]
grants: [left_join, coalesce]
tables: [schedules, repayments]
ordered: true
columns:
  - { vi: "Số hiệu kỳ trả", en: "Instalment record number" }
  - { vi: "Phải thu (gốc + lãi)", en: "Amount due (principal + interest)" }
  - { vi: "Đã thu (0 nếu chưa thu)", en: "Collected (0 if not yet)" }
variants:
  - { day: "2026-10-30", d: "30/10/2026", d_en: "October 30" }
  - { day: "2026-10-25", d: "25/10/2026", d_en: "October 25" }
  - { day: "2026-10-20", d: "20/10/2026", d_en: "October 20" }
reflect:
  q: { vi: "Ghép thường giữa lịch trả và tiền về làm gì với kỳ chưa trả?", en: "What does a plain join between the schedule and the repayments do to an unpaid instalment?" }
  options:
    - { vi: "Bỏ mất kỳ đó, vì nó không có dòng tiền về nào để ghép", en: "Drops it, because it has no repayment row to match" }
    - { vi: "Giữ kỳ đó với số tiền đã thu bằng 0", en: "Keeps it with 0 collected" }
    - { vi: "Báo lỗi", en: "Fails with an error" }
  answer: 0
  why: { vi: "Ghép thường chỉ giữ cặp dòng khớp nhau. Ghép trái giữ mọi kỳ trả; phía tiền về để trống ở kỳ chưa trả, rồi ta thay ô trống bằng 0.", en: "A plain join keeps only matching pairs. A left join keeps every instalment; the repayment side stays empty for unpaid ones, and then we replace the empty cell with 0." }
wrong:
  - sql: "SELECT s.id, s.principal_due + s.interest_due, COALESCE(r.amount, 0) FROM schedules s JOIN repayments r ON r.schedule_id = s.id WHERE s.due_on = '{{day}}' ORDER BY s.id"
    vi: "Thiếu các kỳ chưa thu: ghép thường bỏ những kỳ không có dòng tiền về. Đề cần mọi kỳ đến hạn, kỳ chưa thu ghi 0."
    en: "The unpaid instalments are missing: a plain join drops instalments with no repayment row. The request wants every instalment due, with 0 for those not collected."
---
Kế toán đối chiếu tiền về theo từng ngày đến hạn. Mình cần mọi kỳ đến hạn trong ngày, kể cả kỳ khách chưa trả: kỳ chưa trả mới là thứ mình cần thấy nhất.

## Task
Mọi kỳ trả đến hạn ngày {{d}}: số hiệu kỳ trả (số nội bộ của dòng lịch trả), số tiền phải thu (gốc cộng lãi) và số tiền đã thu tính đến hôm nay; kỳ chưa thu thì ghi 0. Xếp theo số hiệu kỳ trả.

## Hints
1. Kỳ chưa trả không có dòng tiền về. Ghép thường sẽ làm mất các kỳ đó; cần cách ghép giữ mọi dòng của lịch trả, rồi thay ô trống bằng 0.
2. `FROM schedules s LEFT JOIN repayments r ON r.schedule_id = s.id` giữ mọi kỳ. `COALESCE(r.amount, 0)` lấy số tiền đã thu, không có thì 0. Phải thu là `s.principal_due + s.interest_due`.
3. `SELECT s.id, s.principal_due + s.interest_due, COALESCE(r.amount, 0) FROM schedules s LEFT JOIN repayments r ON ... WHERE ... ORDER BY s.id`

## Solution
```sql
SELECT s.id, s.principal_due + s.interest_due, COALESCE(r.amount, 0)
FROM schedules s
LEFT JOIN repayments r ON r.schedule_id = s.id
WHERE s.due_on = '{{day}}'
ORDER BY s.id
```

# EN
Accounting reconciles the money in, due date by due date. I need every instalment due on the day, including the ones customers have not paid: the unpaid ones are exactly what I most need to see.

## Task
Every instalment due on {{d_en}}, 2026: instalment record number (the internal number of the schedule row), amount due (principal plus interest) and amount collected so far; write 0 for instalments not collected. Sort by instalment record number.

## Hints
1. An unpaid instalment has no repayment row. A plain join loses those instalments; you need a join that keeps every schedule row, then replace the empty cell with 0.
2. `FROM schedules s LEFT JOIN repayments r ON r.schedule_id = s.id` keeps every instalment. `COALESCE(r.amount, 0)` takes the amount collected, or 0 when there is none. The amount due is `s.principal_due + s.interest_due`.
3. `SELECT s.id, s.principal_due + s.interest_due, COALESCE(r.amount, 0) FROM schedules s LEFT JOIN repayments r ON ... WHERE ... ORDER BY s.id`
