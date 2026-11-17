---
id: ecom-ch5-02
chapter: 5
title: Phễu mua hàng từng tháng
title_en: The monthly purchase funnel
from: { name: Lâm Gia Huy, dept: IT }
difficulty: 3
beat: develop
format: faded
requires: [date_bucket, group_by, order_by, null_logic]
grants: [conditional_agg]
tables: [web_sessions]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Số phiên truy cập", en: "Sessions" }
  - { vi: "Phiên có xem sản phẩm", en: "Sessions that viewed a product" }
  - { vi: "Phiên có thêm vào giỏ", en: "Sessions that added to cart" }
  - { vi: "Phiên ra đơn hàng", en: "Sessions that ended in an order" }
starter: |
  SELECT date_trunc('month', started_at) AS month,
         count(*) AS sessions,
         count(*) FILTER (WHERE ___) AS viewed,
         count(*) FILTER (WHERE ___) AS carted,
         count(*) FILTER (WHERE ___) AS ordered
  FROM web_sessions
  WHERE started_at >= '{{from}}' AND started_at < '{{to}}'
  GROUP BY month
  ORDER BY month
variants:
  - { qv: "3/2026", q_en: "Q3 2026", from: "2026-07-01", to: "2026-10-01" }
  - { qv: "2/2026", q_en: "Q2 2026", from: "2026-04-01", to: "2026-07-01" }
  - { qv: "4/2025", q_en: "Q4 2025", from: "2025-10-01", to: "2026-01-01" }
reflect:
  q: { vi: "Vì sao đếm theo cột có xem sản phẩm (thay vì đếm có điều kiện) lại ra đúng bằng tổng số phiên?", en: "Why does counting the viewed-a-product column (instead of a conditional count) give exactly the total number of sessions?" }
  options:
    - { vi: "Cột đúng/sai không bao giờ trống, nên đếm theo cột tính cả các phiên có giá trị sai", en: "A true/false column is never empty, so counting the column includes the sessions where it is false" }
    - { vi: "Vì phiên nào cũng có xem sản phẩm", en: "Because every session viewed a product" }
    - { vi: "Vì hàm đếm không đọc được cột đúng/sai", en: "Because the count cannot read true/false columns" }
  answer: 0
  why: { vi: "Đếm theo cột chỉ bỏ ô trống. Muốn đếm phiên thỏa một điều kiện thì đặt điều kiện vào FILTER.", en: "Counting a column only skips empty cells. To count sessions that meet a condition, put the condition in FILTER." }
wrong:
  - sql: "SELECT date_trunc('month', started_at) AS month, count(*), count(viewed_product), count(*) FILTER (WHERE added_to_cart), count(*) FILTER (WHERE order_id IS NOT NULL) FROM web_sessions WHERE started_at >= '{{from}}' AND started_at < '{{to}}' GROUP BY month ORDER BY month"
    vi: "Cột thứ ba đang bằng tổng số phiên: đếm theo cột đúng/sai tính cả phiên có giá trị sai. Đặt điều kiện vào FILTER."
    en: "The third column equals the total sessions: counting a true/false column includes the false ones. Put the condition in FILTER."
---
Mình đang dựng bảng theo dõi phễu mua hàng cho marketing: bao nhiêu người vào sàn, bao nhiêu người xem sản phẩm, thêm vào giỏ, rồi đặt đơn. Mỗi bước rơi rụng bao nhiêu là điều họ muốn thấy.

Câu truy vấn trong editor đã có khung; bạn chỉ cần điền ba điều kiện đếm ở các chỗ trống ___.

## Task
Phễu mua hàng từng tháng của quý {{qv}}: số phiên truy cập, số phiên có xem sản phẩm, số phiên có thêm vào giỏ, và số phiên có đặt được đơn hàng. Tháng ghi bằng ngày đầu tháng; tháng sớm nhất lên đầu.

## Hints
1. Mỗi tháng là một nhóm; trong nhóm cần bốn số đếm, mỗi số đếm một điều kiện riêng.
2. `count(*) FILTER (WHERE viewed_product)` chỉ đếm phiên có xem sản phẩm. Phiên ra đơn là phiên có mã đơn: `order_id IS NOT NULL`.
3. `count(*) FILTER (WHERE viewed_product)`, `count(*) FILTER (WHERE added_to_cart)`, `count(*) FILTER (WHERE order_id IS NOT NULL)`

## Solution
```sql
SELECT date_trunc('month', started_at) AS month,
       count(*) AS sessions,
       count(*) FILTER (WHERE viewed_product) AS viewed,
       count(*) FILTER (WHERE added_to_cart) AS carted,
       count(*) FILTER (WHERE order_id IS NOT NULL) AS ordered
FROM web_sessions
WHERE started_at >= '{{from}}' AND started_at < '{{to}}'
GROUP BY month
ORDER BY month
```

# EN
I am building a purchase funnel tracker for marketing: how many people visit, how many view a product, add to cart, then order. How many drop off at each step is what they want to see.

The query in the editor already has the frame; you only need to fill in the three count conditions at the ___ blanks.

## Task
The monthly purchase funnel for {{q_en}}: the number of sessions, sessions that viewed a product, sessions that added something to the cart, and sessions that placed an order. Each month shown as its first day; earliest month first.

## Hints
1. Each month is one group; the group needs four counts, each with its own condition.
2. `count(*) FILTER (WHERE viewed_product)` counts only the sessions that viewed a product. A session that ordered is one with an order number: `order_id IS NOT NULL`.
3. `count(*) FILTER (WHERE viewed_product)`, `count(*) FILTER (WHERE added_to_cart)`, `count(*) FILTER (WHERE order_id IS NOT NULL)`
