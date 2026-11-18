---
id: fin-ch4-02
chapter: 4
title: Giải ngân từng tháng
title_en: Disbursements month by month
from: { name: Phùng Đức Lâm, dept: Sales }
difficulty: 2
beat: develop
format: faded
requires: [select, where, aggregate, group_by, order_by]
grants: [date_bucket]
tables: [loans]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Số khoản giải ngân", en: "Loans paid out" }
  - { vi: "Tổng tiền gốc", en: "Total principal" }
starter: |
  SELECT date_trunc(___, disbursed_on)::date AS month, count(*), sum(principal)
  FROM loans
  WHERE disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}'
  GROUP BY ___
  ORDER BY 1
variants:
  - { from: "2025-11-01", to: "2026-11-01", first: "11/2025", last: "10/2026", first_en: "November 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2024-07-01", to: "2025-07-01", first: "07/2024", last: "06/2025", first_en: "July 2024", last_en: "June 2025" }
reflect:
  q: { vi: "Vì sao ghi tháng bằng ngày đầu tháng, không gom theo số tháng (1 đến 12)?", en: "Why show the month as its first day instead of grouping by the month number (1 to 12)?" }
  options:
    - { vi: "Mười hai tháng có thể vắt qua hai năm; số tháng gộp chung cùng một tháng của hai năm", en: "Twelve months can span two years; the month number merges the same month of both years" }
    - { vi: "Số tháng không sắp xếp được", en: "Month numbers cannot be sorted" }
    - { vi: "Gom theo số tháng chạy chậm hơn", en: "Grouping by month number is slower" }
  answer: 0
  why: { vi: "Ngày đầu tháng giữ cả năm lẫn tháng, nên mỗi tháng của mỗi năm là một nhóm riêng và vẫn sắp đúng thứ tự thời gian.", en: "The first day of the month keeps both the year and the month, so every month of every year is its own group and still sorts in time order." }
wrong:
  - sql: "SELECT extract(month FROM disbursed_on) AS month, count(*), sum(principal) FROM loans WHERE disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}' GROUP BY 1 ORDER BY 1"
    vi: "Bạn đang gom theo số tháng (1 đến 12). Đề cần ghi tháng bằng ngày đầu tháng, để tháng của hai năm khác nhau không gộp vào nhau."
    en: "You are grouping by the month number (1 to 12). The request wants each month as its first day, so months of different years never mix."
---
Mình cần đường giải ngân theo tháng trong mười hai tháng để lên chỉ tiêu cho các chi nhánh năm sau.

Câu truy vấn trong editor đã viết gần xong. Chỗ trống đầu là đơn vị thời gian, viết như một chữ trong nháy đơn; chỗ thứ hai là thứ cần gom nhóm.

## Task
Mỗi tháng từ {{first}} tới {{last}}: tháng (ghi bằng ngày đầu tháng), số khoản giải ngân và tổng tiền gốc. Tháng sớm nhất lên đầu.

## Hints
1. Đưa mọi ngày giải ngân của cùng một tháng về một giá trị chung (ngày đầu tháng), rồi gom theo giá trị đó.
2. `date_trunc('month', disbursed_on)::date` đưa mỗi ngày về đầu tháng. Chỗ trống thứ hai: `GROUP BY 1`.
3. `SELECT date_trunc('month', disbursed_on)::date AS month, count(*), sum(principal) FROM loans WHERE ... GROUP BY 1 ORDER BY 1`

## Solution
```sql
SELECT date_trunc('month', disbursed_on)::date AS month, count(*), sum(principal)
FROM loans
WHERE disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}'
GROUP BY 1
ORDER BY 1
```

# EN
I need the monthly disbursement curve over twelve months to set next year's targets for the branches.

The query in the editor is almost done. The first blank is the time unit, written as a word in single quotes; the second is what you group by.

## Task
Every month from {{first_en}} to {{last_en}}: the month (as its first day), the number of loans paid out and the total principal. Earliest month first.

## Hints
1. Bring every disbursement date of the same month to one shared value (the first day of the month), then group by that value.
2. `date_trunc('month', disbursed_on)::date` turns each date into the start of its month. The second blank: `GROUP BY 1`.
3. `SELECT date_trunc('month', disbursed_on)::date AS month, count(*), sum(principal) FROM loans WHERE ... GROUP BY 1 ORDER BY 1`
