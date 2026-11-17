---
id: ecom-ch6-03
chapter: 6
title: Khách cộng dồn từ ngày mở sàn
title_en: Customers to date since launch
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 3
beat: twist
requires: [cte, date_bucket, aggregate, group_by, order_by]
grants: [window_agg]
tables: [customers]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Khách mới trong tháng", en: "New customers in the month" }
  - { vi: "Tổng khách tới hết tháng", en: "Customers to date" }
variants:
  - { from: "2026-01-01", first: "01/2026", first_en: "January 2026" }
  - { from: "2026-04-01", first: "04/2026", first_en: "April 2026" }
  - { from: "2026-07-01", first: "07/2026", first_en: "July 2026" }
reflect:
  q: { vi: "Vì sao điều kiện từ tháng đầu bảng phải đặt sau khi cộng dồn?", en: "Why must the from-this-month condition come after the running total?" }
  options:
    - { vi: "Lọc trước thì các tháng cũ biến mất khỏi phép cộng, và tổng bắt đầu lại từ 0", en: "Filtering first removes the older months from the sum, and the total starts again from 0" }
    - { vi: "Lọc sau chạy nhanh hơn", en: "Filtering afterwards is faster" }
    - { vi: "Đặt đâu cũng được", en: "Either place works" }
  answer: 0
  why: { vi: "Hàm cửa sổ chỉ thấy những dòng còn lại sau bước lọc. Muốn cộng từ ngày mở sàn mà chỉ hiện vài tháng cuối, hãy cộng trước rồi lọc ở tầng ngoài.", en: "A window function only sees the rows left after filtering. To add up from launch but show only the last months, sum first and filter in an outer level." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', signup_date) AS month, count(*) AS n FROM customers WHERE signup_date >= '{{from}}' GROUP BY 1) SELECT month, n, SUM(n) OVER (ORDER BY month) FROM m ORDER BY month"
    vi: "Tổng đang bắt đầu lại từ tháng đầu bảng vì các tháng cũ đã bị lọc trước khi cộng. Cộng dồn trước, rồi mới lọc tháng."
    en: "The total restarts at the first month shown because the older months were filtered out before adding. Add up first, then filter the months."
---
Trang giới thiệu cho nhà đầu tư cần một biểu đồ: mỗi tháng có thêm bao nhiêu khách, và tổng số khách của sàn đã lên tới đâu. Biểu đồ chỉ vẽ mấy tháng gần đây, nhưng tổng phải tính từ ngày mở sàn.

## Task
Mỗi tháng từ {{first}} đến nay: số khách mới đăng ký trong tháng, và tổng số khách của sàn tính từ ngày mở sàn đến hết tháng đó. Tháng ghi bằng ngày đầu tháng; tháng sớm nhất lên đầu.

## Hints
1. Đếm khách mới theo tháng cho mọi tháng, cộng dồn theo thứ tự thời gian, rồi mới chỉ giữ các tháng cần hiện.
2. `SUM(n) OVER (ORDER BY month)` cộng dồn từ tháng đầu tiên tới tháng hiện tại. Điều kiện tháng đặt ở câu ngoài cùng.
3. `WITH m AS (...), c AS (SELECT month, n, SUM(n) OVER (ORDER BY month) AS total FROM m) SELECT month, n, total FROM c WHERE ... ORDER BY month`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', signup_date) AS month, count(*) AS n
  FROM customers
  GROUP BY 1
), c AS (
  SELECT month, n, SUM(n) OVER (ORDER BY month) AS total
  FROM m
)
SELECT month, n, total
FROM c
WHERE month >= '{{from}}'
ORDER BY month
```

# EN
The investor page needs a chart: how many customers joined each month, and how far the marketplace's total customer count has climbed. The chart only draws the recent months, but the total must count from launch.

## Task
For each month from {{first_en}} until now: the number of new customers who signed up in the month, and the marketplace's total customers from launch to the end of that month. Each month shown as its first day; earliest month first.

## Hints
1. Count new customers per month for every month, add them up in time order, and only then keep the months to show.
2. `SUM(n) OVER (ORDER BY month)` adds up from the first month to the current one. The month condition goes in the outermost query.
3. `WITH m AS (...), c AS (SELECT month, n, SUM(n) OVER (ORDER BY month) AS total FROM m) SELECT month, n, total FROM c WHERE ... ORDER BY month`
