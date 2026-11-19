---
id: ecom-ch7-05
chapter: 7
title: "Đánh giá thăng tiến: báo cáo điều tra"
title_en: "Promotion review: the investigation report"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 4
beat: boss
requires: [window_lag, window_rank, window_agg, cte, date_bucket, multi_join, aggregate, group_by, where, order_by]
grants: []
tables: [returns, products, sellers, categories]
ordered: true
columns:
  - [{ vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }, { vi: "Yêu cầu trả vì hỏng", en: "Returns for damage" }, { vi: "Chênh so với tháng trước", en: "Change from the month before" }]
  - [{ vi: "Nhóm hàng", en: "Category" }, { vi: "Mã SKU", en: "SKU code" }, { vi: "Tiền đã hoàn (đồng)", en: "Refunded (VND)" }, { vi: "Hạng trong nhóm", en: "Rank in category" }]
  - [{ vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }, { vi: "Tiền hoàn trong tháng (đồng)", en: "Refunded that month (VND)" }, { vi: "Cộng dồn (đồng)", en: "Running total (VND)" }]
conclusion:
  question: "Theo bước 1, hàng hỏng của Highland Gadget Hub bắt đầu tăng vọt từ tháng nào?"
  options:
    - "Tháng 7/2026, ngay đầu quý 3"
    - "Tháng 10/2026, sau đợt sale 10.10"
    - "Không tháng nào tăng rõ"
  answer: 0
conclusion_en:
  question: "According to step 1, from which month did Highland Gadget Hub's damaged items jump?"
  options:
    - "July 2026, right at the start of Q3"
    - "October 2026, after the 10.10 sale"
    - "No month stands out"
  answer: 0
---
Đây là buổi đánh giá thăng tiến cuối cùng của bạn. Mình sẽ họp với Highland Gadget Hub, và cần ba con số: hàng hỏng tăng từ khi nào, món nào gây thiệt hại nhiều nhất, và sàn đã hoàn bao nhiêu tiền. Làm đúng cả ba là bạn thành Lead DA.

Trong cả ba bước, chỉ xét yêu cầu trả vì hỏng cho sản phẩm của shop Highland Gadget Hub.

## Step 1: Hàng hỏng tăng từ khi nào
Mỗi tháng từ tháng 4 đến hết tháng 10/2026 (theo ngày gửi yêu cầu): số yêu cầu, và chênh lệch so với tháng liền trước trong bảng (tháng đầu để trống). Tháng sớm nhất lên đầu.
```sql
WITH m AS (
  SELECT date_trunc('month', r.requested_on) AS month, count(*) AS n
  FROM returns r
  JOIN products p ON p.id = r.product_id
  JOIN sellers s ON s.id = p.seller_id
  WHERE s.name = 'Highland Gadget Hub' AND r.reason = 'damaged'
    AND r.requested_on >= '2026-04-01' AND r.requested_on < '2026-11-01'
  GROUP BY 1
)
SELECT month, n, n - LAG(n) OVER (ORDER BY month)
FROM m
ORDER BY month
```

## Step 2: Món gây thiệt hại nhiều nhất
Yêu cầu gửi trong quý 3/2026: trong mỗi nhóm hàng, hai sản phẩm có tổng tiền đã hoàn cao nhất. Gửi tên nhóm hàng, mã SKU, tiền đã hoàn và hạng trong nhóm; bằng nhau thì cùng hạng và hạng sau bị bỏ qua; lấy mọi sản phẩm có hạng 1 hoặc 2. Xếp theo tên nhóm hàng, rồi hạng, rồi mã SKU.
```sql
WITH x AS (
  SELECT c.name AS category, p.sku, sum(r.refund) AS refunded
  FROM returns r
  JOIN products p ON p.id = r.product_id
  JOIN sellers s ON s.id = p.seller_id
  JOIN categories c ON c.id = p.category_id
  WHERE s.name = 'Highland Gadget Hub' AND r.reason = 'damaged'
    AND r.requested_on >= '2026-07-01' AND r.requested_on < '2026-10-01'
  GROUP BY c.name, p.sku
), ranked AS (
  SELECT category, sku, refunded, RANK() OVER (PARTITION BY category ORDER BY refunded DESC) AS rnk
  FROM x
)
SELECT category, sku, refunded, rnk
FROM ranked
WHERE rnk <= 2
ORDER BY category, rnk, sku
```

## Step 3: Sàn đã hoàn bao nhiêu
Mỗi tháng từ tháng 4 đến hết tháng 10/2026 (theo ngày gửi yêu cầu): tiền đã hoàn trong tháng, và tiền cộng dồn từ tháng 4 tới hết tháng đó. Tháng sớm nhất lên đầu.
```sql
WITH m AS (
  SELECT date_trunc('month', r.requested_on) AS month, sum(r.refund) AS refunded
  FROM returns r
  JOIN products p ON p.id = r.product_id
  JOIN sellers s ON s.id = p.seller_id
  WHERE s.name = 'Highland Gadget Hub' AND r.reason = 'damaged'
    AND r.requested_on >= '2026-04-01' AND r.requested_on < '2026-11-01'
  GROUP BY 1
)
SELECT month, refunded, SUM(refunded) OVER (ORDER BY month)
FROM m
ORDER BY month
```

## Hints
1. Mỗi bước: gom trong một bước có tên, rồi dùng hàm cửa sổ ở câu ngoài. Bước 1 so với tháng trước, bước 2 xếp hạng trong từng nhóm, bước 3 cộng dồn.
2. Bước 1: `n - LAG(n) OVER (ORDER BY month)`. Bước 2: `RANK() OVER (PARTITION BY category ORDER BY refunded DESC)`. Bước 3: `SUM(refunded) OVER (ORDER BY month)`.
3. `WITH m AS (SELECT date_trunc('month', r.requested_on) AS month, ... GROUP BY 1) SELECT month, ... OVER (ORDER BY month) FROM m ORDER BY month`

# EN
This is your last promotion review. I am meeting Highland Gadget Hub and need three numbers: since when the damaged items rose, which items cost the most, and how much the marketplace refunded. Get all three right and you become a Lead DA.

In all three steps, only count return requests for damage on Highland Gadget Hub's products.

## Step 1: Since when damaged items rose
Each month from April to the end of October 2026 (by request date): the number of requests, and the change from the previous month in the table (empty for the first month). Earliest month first.

## Step 2: The items that cost the most
Requests sent in Q3 2026: in each category, the two products with the highest total refunded. Send the category name, SKU code, amount refunded and rank in the category; equal amounts share a rank and the next rank is skipped; take every product ranked 1 or 2. Sort by category name, then rank, then SKU code.

## Step 3: How much the marketplace refunded
Each month from April to the end of October 2026 (by request date): the amount refunded that month, and the running total from April to the end of that month. Earliest month first.

## Hints
1. In each step: aggregate in a named step, then use a window function in the outer query. Step 1 compares with the month before, step 2 ranks inside each category, step 3 adds up month by month.
2. Step 1: `n - LAG(n) OVER (ORDER BY month)`. Step 2: `RANK() OVER (PARTITION BY category ORDER BY refunded DESC)`. Step 3: `SUM(refunded) OVER (ORDER BY month)`.
3. `WITH m AS (SELECT date_trunc('month', r.requested_on) AS month, ... GROUP BY 1) SELECT month, ... OVER (ORDER BY month) FROM m ORDER BY month`
