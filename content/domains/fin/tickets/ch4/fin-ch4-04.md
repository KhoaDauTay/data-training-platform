---
id: fin-ch4-04
chapter: 4
title: Giải ngân từng ngày quanh Tết
title_en: Daily disbursements around Tet
from: { name: Lư Thảo Vy, dept: Finance }
difficulty: 3
beat: rest
adv: [a3]
requires: [select, left_join, coalesce, aggregate, group_by, order_by]
grants: []
tables: [loans]
ordered: true
columns:
  - { vi: "Ngày", en: "Day" }
  - { vi: "Tiền giải ngân (0 nếu không có)", en: "Money paid out (0 if none)" }
variants:
  - { from: "2026-02-10", to: "2026-02-24", d1: "10/02", d2: "24/02/2026", span_en: "10 to 24 February 2026" }
  - { from: "2025-01-22", to: "2025-02-05", d1: "22/01", d2: "05/02/2025", span_en: "22 January to 5 February 2025" }
  - { from: "2026-02-03", to: "2026-02-17", d1: "03/02", d2: "17/02/2026", span_en: "3 to 17 February 2026" }
reflect:
  q: { vi: "Vì sao gom thẳng trên sổ vay thì thiếu ngày nghỉ Tết?", en: "Why does grouping straight on the loan book miss the Tet holiday days?" }
  options:
    - { vi: "Ngày không có khoản giải ngân nào thì không có dòng nào trong sổ vay để gom", en: "A day with no loan paid out has no row in the loan book to group" }
    - { vi: "Sổ vay bỏ qua ngày lễ khi lưu", en: "The loan book skips holidays when saving" }
    - { vi: "Gom theo ngày chỉ đúng với ngày làm việc", en: "Grouping by day only works for working days" }
  answer: 0
  why: { vi: "Muốn có đủ mọi ngày thì phải tạo ra một trục ngày riêng, rồi nối trái sổ vay vào trục đó.", en: "To get every day you have to create a separate axis of days, then left join the loan book onto it." }
wrong:
  - sql: "SELECT disbursed_on, sum(principal) FROM loans WHERE disbursed_on BETWEEN '{{from}}' AND '{{to}}' GROUP BY disbursed_on ORDER BY disbursed_on"
    vi: "Thiếu các ngày không giải ngân: sổ vay không có dòng nào cho những ngày đó. Tạo trục ngày đủ 15 ngày rồi nối trái sổ vay vào, ngày trống ghi 0."
    en: "The days with nothing paid out are missing: the loan book has no rows for them. Build an axis of all 15 days, left join the loan book onto it, and write 0 for empty days."
---
Mình đang lập kế hoạch tiền mặt cho mùa Tết năm sau và cần xem năm nay tiền giải ngân đi ra từng ngày thế nào quanh kỳ nghỉ. Những ngày không giải ngân đồng nào cũng phải có trên bảng, vì đó chính là thứ mình cần thấy.

## Task
Mỗi ngày từ {{d1}} đến hết {{d2}}, kể cả ngày không có khoản giải ngân nào: ngày và tổng tiền giải ngân trong ngày (ngày không giải ngân ghi 0). Ngày sớm nhất lên đầu.

## Hints
1. Sổ vay không có dòng cho ngày không giải ngân. Tạo trục ngày đủ 15 ngày, nối trái sổ vay vào trục, rồi cộng tiền theo ngày; ngày không có gì thì thay ô trống bằng 0. Bài nâng cao "Trục ngày" giải thích cách này.
2. `FROM generate_series('{{from}}'::date, '{{to}}', interval '1 day') AS d` cho mỗi ngày một dòng. Nối `LEFT JOIN loans l ON l.disbursed_on = d`; tiền là `COALESCE(sum(l.principal), 0)`; ngày là `d::date`.
3. `SELECT d::date AS day, COALESCE(sum(l.principal), 0) FROM generate_series(...) AS d LEFT JOIN loans l ON ... GROUP BY d ORDER BY d`

## Solution
```sql
SELECT d::date AS day, COALESCE(sum(l.principal), 0)
FROM generate_series('{{from}}'::date, '{{to}}', interval '1 day') AS d
LEFT JOIN loans l ON l.disbursed_on = d
GROUP BY d
ORDER BY d
```

# EN
I am planning next year's cash needs for the Tet season and want to see how money went out day by day around the holiday this year. Days with nothing paid out must be on the table too, because that is exactly what I need to see.

## Task
Every day from {{span_en}}, including days with no loan paid out: the day and the total paid out that day (write 0 for days with nothing paid out). Earliest day first.

## Hints
1. The loan book has no rows for days with nothing paid out. Build an axis of all 15 days, left join the loan book onto it, then add up the money per day; replace the empty cell with 0 on days with nothing. The advanced lesson "Date spine" explains this.
2. `FROM generate_series('{{from}}'::date, '{{to}}', interval '1 day') AS d` gives one row per day. Join `LEFT JOIN loans l ON l.disbursed_on = d`; the money is `COALESCE(sum(l.principal), 0)`; the day is `d::date`.
3. `SELECT d::date AS day, COALESCE(sum(l.principal), 0) FROM generate_series(...) AS d LEFT JOIN loans l ON ... GROUP BY d ORDER BY d`
