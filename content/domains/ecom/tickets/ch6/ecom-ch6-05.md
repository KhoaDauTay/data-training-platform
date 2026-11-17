---
id: ecom-ch6-05
chapter: 6
title: "Đánh giá thăng tiến: hồ sơ gọi vốn"
title_en: "Promotion review: the funding pitch"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 4
beat: boss
requires: [window_rank, window_lag, window_agg, cte, date_math, join, aggregate, group_by, order_by]
grants: []
tables: [orders, customers, payments]
ordered: true
columns:
  - [{ vi: "Kênh khách đến", en: "Acquisition channel" }, { vi: "Số ngày trung bình giữa hai đơn", en: "Average days between two orders" }]
  - [{ vi: "Kênh khách đến", en: "Acquisition channel" }, { vi: "Thành phố", en: "City" }, { vi: "Số khách mới", en: "New customers" }, { vi: "Hạng trong kênh", en: "Rank in channel" }]
  - [{ vi: "Ngày", en: "Day" }, { vi: "Tiền thu trong ngày (đồng)", en: "Collected that day (VND)" }, { vi: "Cộng dồn trong tháng (đồng)", en: "Month to date (VND)" }, { vi: "Phần trăm của cả tháng", en: "Share of the month (%)" }]
conclusion:
  question: "Theo bước 1, khách đến từ kênh nào quay lại mua nhanh nhất, và kênh nào chậm nhất?"
  options:
    - "Nhanh nhất là khách được bạn bè giới thiệu, chậm nhất là khách đến từ quảng cáo trả tiền"
    - "Nhanh nhất là khách đến từ quảng cáo trả tiền"
    - "Mọi kênh như nhau"
  answer: 0
conclusion_en:
  question: "According to step 1, customers from which channel come back to buy fastest, and which slowest?"
  options:
    - "Fastest are customers referred by friends, slowest are customers from paid ads"
    - "Fastest are customers from paid ads"
    - "Every channel is the same"
---
Đây là buổi đánh giá thăng tiến của bạn, và cũng là lần cuối mình nhờ bạn trước vòng gọi vốn. Nhà đầu tư hỏi ba điều: khách có quay lại không, khách mới đến từ đâu, và đợt sale 10.10 đóng góp bao nhiêu. Làm đúng cả ba là bạn thành Senior DA.

## Step 1: Khách quay lại sau bao lâu
Với mỗi đơn không bị hủy, tính số ngày kể từ đơn không hủy liền trước của cùng khách (theo ngày đặt). Xét các đơn đặt từ 01/01/2026, nhưng đơn liền trước có thể nằm trong năm 2025; đơn đầu tiên của mỗi khách không có khoảng cách nên không tính. Theo kênh khách đến, gửi số ngày trung bình giữa hai đơn, làm tròn 2 chữ số thập phân; xếp theo tên kênh.
```sql
WITH o AS (
  SELECT c.channel, o.ordered_at,
         o.ordered_at::date - LAG(o.ordered_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_at) AS gap
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.status <> 'cancelled'
)
SELECT channel, ROUND(AVG(gap), 2)
FROM o
WHERE ordered_at >= '2026-01-01'
GROUP BY channel
ORDER BY channel
```

## Step 2: Ba thành phố có nhiều khách mới nhất của mỗi kênh
Khách đăng ký từ 01/01/2026: trong mỗi kênh khách đến, ba thành phố có nhiều khách mới nhất. Gửi kênh, thành phố, số khách và hạng trong kênh; số khách bằng nhau thì cùng hạng và hạng sau bị bỏ qua; lấy mọi thành phố có hạng từ 1 đến 3. Xếp theo tên kênh, rồi hạng, rồi tên thành phố.
```sql
WITH s AS (
  SELECT channel, city, count(*) AS n
  FROM customers
  WHERE signup_date >= '2026-01-01'
  GROUP BY channel, city
), r AS (
  SELECT channel, city, n, RANK() OVER (PARTITION BY channel ORDER BY n DESC) AS rnk
  FROM s
)
SELECT channel, city, n, rnk
FROM r
WHERE rnk <= 3
ORDER BY channel, rnk, city
```

## Step 3: Tháng 10 và ngày 10.10
Mỗi ngày của tháng 10/2026: tiền đã thu thành công trong ngày (theo thời điểm thu), tiền cộng dồn từ đầu tháng tới hết ngày đó, và phần trăm của tiền cộng dồn so với cả tháng (làm tròn 2 chữ số thập phân). Ngày sớm nhất lên đầu.
```sql
WITH d AS (
  SELECT paid_at::date AS day, sum(amount) AS revenue
  FROM payments
  WHERE status = 'paid' AND paid_at >= '2026-10-01' AND paid_at < '2026-11-01'
  GROUP BY 1
)
SELECT day, revenue, SUM(revenue) OVER (ORDER BY day),
       ROUND(100.0 * SUM(revenue) OVER (ORDER BY day) / SUM(revenue) OVER (), 2)
FROM d
ORDER BY day
```

## Hints
1. Bước 1 nhìn đơn liền trước của cùng khách, rồi mới lọc năm 2026. Bước 2 xếp hạng thành phố trong từng kênh. Bước 3 cộng dồn theo ngày và chia cho tổng cả tháng, mà không mất dòng nào.
2. Bước 1: `LAG(o.ordered_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_at)`. Bước 2: `RANK() OVER (PARTITION BY channel ORDER BY n DESC)`. Bước 3: `SUM(revenue) OVER (ORDER BY day)` và `SUM(revenue) OVER ()` (cửa sổ rỗng là cả bảng).
3. `SELECT day, revenue, SUM(revenue) OVER (ORDER BY day), ROUND(100.0 * SUM(revenue) OVER (ORDER BY day) / SUM(revenue) OVER (), 2) FROM d ORDER BY day`

# EN
This is your promotion review, and the last thing I ask of you before the funding round. The investors ask three things: do customers come back, where do new customers come from, and how much did the 10.10 sale contribute. Get all three right and you become a Senior DA.

## Step 1: How soon customers come back
For each order that was not cancelled, count the days since the same customer's previous non-cancelled order (by order date). Look at orders placed from 1 January 2026, but the previous order may fall in 2025; a customer's first order has no gap and does not count. Per acquisition channel, send the average days between two orders, rounded to 2 decimals; sort by channel name.

## Step 2: The three cities with the most new customers in each channel
Customers who signed up from 1 January 2026: in each acquisition channel, the three cities with the most new customers. Send the channel, city, number of customers and rank in the channel; equal numbers share a rank and the next rank is skipped; take every city ranked 1 to 3. Sort by channel name, then rank, then city name.

## Step 3: October and the 10.10 day
For each day of October 2026: the money collected successfully that day (by collection time), the running total from the start of the month to the end of that day, and the running total as a percentage of the whole month (rounded to 2 decimals). Earliest day first.

## Hints
1. Step 1 looks at the same customer's previous order, and only then filters 2026. Step 2 ranks cities inside each channel. Step 3 adds up day by day and divides by the whole month's total, without losing any row.
2. Step 1: `LAG(o.ordered_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_at)`. Step 2: `RANK() OVER (PARTITION BY channel ORDER BY n DESC)`. Step 3: `SUM(revenue) OVER (ORDER BY day)` and `SUM(revenue) OVER ()` (an empty window is the whole table).
3. `SELECT day, revenue, SUM(revenue) OVER (ORDER BY day), ROUND(100.0 * SUM(revenue) OVER (ORDER BY day) / SUM(revenue) OVER (), 2) FROM d ORDER BY day`
