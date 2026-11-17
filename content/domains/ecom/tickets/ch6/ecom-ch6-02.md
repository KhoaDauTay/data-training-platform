---
id: ecom-ch6-02
chapter: 6
title: Doanh thu tháng này so với tháng trước
title_en: This month's revenue against last month's
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 3
beat: develop
format: faded
requires: [cte, date_bucket, aggregate, group_by, order_by]
grants: [window_lag]
tables: [payments]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Tiền thu (đồng)", en: "Collected (VND)" }
  - { vi: "Chênh so với tháng trước (đồng)", en: "Change from the month before (VND)" }
starter: |
  WITH m AS (
    SELECT date_trunc('month', paid_at) AS month, sum(amount) AS revenue
    FROM payments
    WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
    GROUP BY 1
  )
  SELECT month, revenue, revenue - ___(revenue) OVER (ORDER BY ___)
  FROM m
  ORDER BY month
variants:
  - { from: "2025-11-01", to: "2026-11-01", first: "11/2025", last: "10/2026", first_en: "November 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2025-07-01", to: "2026-07-01", first: "07/2025", last: "06/2026", first_en: "July 2025", last_en: "June 2026" }
reflect:
  q: { vi: "Vì sao tháng đầu tiên của bảng có cột chênh lệch để trống?", en: "Why is the change column empty for the first month of the table?" }
  options:
    - { vi: "Trong dữ liệu đưa vào hàm cửa sổ không có tháng nào đứng trước nó", en: "In the data fed to the window function, no month comes before it" }
    - { vi: "Vì tháng đó không thu được tiền", en: "Because nothing was collected that month" }
    - { vi: "Vì truy vấn bị lỗi ở dòng đầu", en: "Because the query fails on the first row" }
  answer: 0
  why: { vi: "LAG nhìn dòng đứng trước trong cửa sổ. Dòng đầu không có ai đứng trước, nên kết quả là ô trống, và trừ với ô trống cũng ra ô trống.", en: "LAG looks at the previous row of the window. The first row has none, so the result is empty, and subtracting an empty cell gives an empty cell." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', paid_at) AS month, sum(amount) AS revenue FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}' GROUP BY 1) SELECT month, revenue, revenue - LEAD(revenue) OVER (ORDER BY month) FROM m ORDER BY month"
    vi: "Bạn đang so với tháng sau (LEAD nhìn dòng kế tiếp). Đề cần so với tháng trước."
    en: "You are comparing with the next month (LEAD looks at the following row). The request compares with the month before."
---
Báo cáo tháng gửi nhà đầu tư luôn có một dòng: tiền thu tháng này tăng hay giảm bao nhiêu so với tháng trước. Mình cần cột đó cho mười hai tháng.

Câu truy vấn trong editor đã gần xong. Chỗ trống đầu là tên hàm nhìn dòng đứng trước; chỗ thứ hai là cột quyết định thứ tự các tháng.

## Task
Mỗi tháng từ {{first}} đến {{last}}: tiền đã thu thành công trong tháng (theo thời điểm thu), và chênh lệch so với tháng ngay trước (tháng này trừ tháng trước; tháng đầu bảng để trống). Tháng ghi bằng ngày đầu tháng; tháng sớm nhất lên đầu.

## Hints
1. Gộp tiền theo tháng trước, rồi với mỗi tháng nhìn sang tháng đứng ngay trước nó theo thứ tự thời gian.
2. `LAG(revenue) OVER (ORDER BY month)` lấy tiền của tháng đứng trước.
3. `SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) FROM m ORDER BY month`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', paid_at) AS month, sum(amount) AS revenue
  FROM payments
  WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
  GROUP BY 1
)
SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month)
FROM m
ORDER BY month
```

# EN
The monthly investor report always has one line: how much more or less money came in this month than last month. I need that column for twelve months.

The query in the editor is almost done. The first blank is the name of the function that looks at the previous row; the second is the column that puts the months in order.

## Task
For each month from {{first_en}} to {{last_en}}: the money collected successfully in the month (by collection time), and the change from the month right before (this month minus the previous one; empty for the first month of the table). Each month shown as its first day; earliest month first.

## Hints
1. Total the money per month first, then for each month look at the month right before it in time order.
2. `LAG(revenue) OVER (ORDER BY month)` takes the previous month's money.
3. `SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) FROM m ORDER BY month`
