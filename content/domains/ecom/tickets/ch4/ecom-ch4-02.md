---
id: ecom-ch4-02
chapter: 4
title: Số đơn từng tháng
title_en: Orders per month
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: develop
format: faded
requires: [aggregate, group_by, order_by]
grants: [date_bucket]
tables: [orders]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Số đơn không hủy", en: "Orders not cancelled" }
starter: |
  SELECT date_trunc(___, ordered_at) AS month, count(*) AS orders
  FROM orders
  WHERE status <> 'cancelled' AND ordered_at >= '{{from}}' AND ordered_at < '{{to}}'
  GROUP BY ___
  ORDER BY month
variants:
  - { from: "2025-11-01", to: "2026-11-01", first: "11/2025", last: "10/2026", first_en: "November 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2025-07-01", to: "2026-07-01", first: "07/2025", last: "06/2026", first_en: "July 2025", last_en: "June 2026" }
reflect:
  q: { vi: "Vì sao không gom theo số tháng (1 đến 12) mà ghi tháng bằng ngày đầu tháng?", en: "Why not group by the month number (1 to 12) instead of the first day of the month?" }
  options:
    - { vi: "Mười hai tháng có thể vắt qua hai năm; số tháng gộp chung cùng một tháng của hai năm", en: "Twelve months can span two years; the month number merges the same month of both years" }
    - { vi: "Gom theo số tháng chạy chậm hơn", en: "Grouping by the month number is slower" }
    - { vi: "Số tháng không sắp xếp được", en: "Month numbers cannot be sorted" }
  answer: 0
  why: { vi: "Ngày đầu tháng giữ cả năm lẫn tháng, nên mỗi tháng của mỗi năm là một nhóm riêng và vẫn sắp đúng thứ tự thời gian.", en: "The first day of the month keeps both the year and the month, so every month of every year is its own group and still sorts in time order." }
wrong:
  - sql: "SELECT extract(month FROM ordered_at), count(*) FROM orders WHERE status <> 'cancelled' AND ordered_at >= '{{from}}' AND ordered_at < '{{to}}' GROUP BY 1 ORDER BY 1"
    vi: "Bạn đang gom theo số tháng (1 đến 12). Đề cần ghi tháng bằng ngày đầu tháng, để không nhầm tháng của hai năm khác nhau."
    en: "You are grouping by the month number (1 to 12). The request wants each month as its first day, so months of different years never mix."
---
Mình đang lên lịch các đợt sale năm sau và cần thấy sàn bận nhất vào những tháng nào. Số đơn từng tháng trong mười hai tháng là đủ.

Câu truy vấn trong editor đã viết gần xong. Chỗ trống đầu là đơn vị thời gian, viết như một chữ trong nháy đơn; chỗ thứ hai là thứ cần gom nhóm.

## Task
Mỗi tháng từ {{first}} đến {{last}} có bao nhiêu đơn, không tính đơn đã hủy? Mỗi tháng một dòng: tháng (ghi bằng ngày đầu tháng) và số đơn; tháng sớm nhất lên đầu.

## Hints
1. Đưa mọi thời điểm đặt đơn của cùng một tháng về một giá trị chung (ngày đầu tháng), rồi đếm theo giá trị đó.
2. `date_trunc('month', ordered_at)` đưa mỗi thời điểm về đầu tháng. Chỗ trống thứ hai: `GROUP BY month` hoặc `GROUP BY 1`.
3. `SELECT date_trunc('month', ordered_at) AS month, count(*) AS orders FROM orders WHERE ... GROUP BY month ORDER BY month`

## Solution
```sql
SELECT date_trunc('month', ordered_at) AS month, count(*) AS orders
FROM orders
WHERE status <> 'cancelled' AND ordered_at >= '{{from}}' AND ordered_at < '{{to}}'
GROUP BY month
ORDER BY month
```

# EN
I am planning next year's sales and need to see which months keep the marketplace busiest. The number of orders per month over twelve months is enough.

The query in the editor is almost done. The first blank is the time unit, written as a word in single quotes; the second is what you group by.

## Task
For each month from {{first_en}} to {{last_en}}, how many orders were placed, cancelled ones not counted? One row per month: the month (as its first day) and the number of orders; earliest month first.

## Hints
1. Bring every order time of the same month to one shared value (the first day of the month), then count by that value.
2. `date_trunc('month', ordered_at)` turns each time into the start of its month. The second blank: `GROUP BY month` or `GROUP BY 1`.
3. `SELECT date_trunc('month', ordered_at) AS month, count(*) AS orders FROM orders WHERE ... GROUP BY month ORDER BY month`
