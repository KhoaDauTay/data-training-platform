---
id: ecom-ch7-02
chapter: 7
title: Hàng hỏng trả về, tính trên hàng đã bán
title_en: Damaged returns against items sold
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: develop
format: faded
requires: [cte, multi_join, aggregate, group_by, where, order_by, limit]
grants: []
tables: [order_items, orders, products, returns, sellers]
ordered: true
columns:
  - { vi: "Shop", en: "Shop" }
  - { vi: "Dòng hàng đã giao", en: "Order lines delivered" }
  - { vi: "Yêu cầu trả vì hỏng", en: "Returns for damage" }
  - { vi: "Tỷ lệ trả vì hỏng (%)", en: "Damage return rate (%)" }
starter: |
  WITH sold AS (
    SELECT p.seller_id, count(*) AS lines
    FROM order_items i
    JOIN orders o ON o.id = i.order_id
    JOIN products p ON p.id = i.product_id
    WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
    GROUP BY p.seller_id
  ), broken AS (
    SELECT p.seller_id, count(*) AS n
    FROM returns r
    JOIN products p ON p.id = r.product_id
    WHERE r.reason = '___' AND r.requested_on >= '{{from}}' AND r.requested_on < '{{to}}'
    GROUP BY p.seller_id
  )
  SELECT s.name, sold.lines, broken.n, ROUND(100.0 * broken.n / ___, 1) AS pct
  FROM sold
  JOIN broken ON broken.seller_id = sold.seller_id
  JOIN sellers s ON s.id = sold.seller_id
  ORDER BY pct DESC, s.name
  LIMIT 5
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026" }
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026" }
reflect:
  q: { vi: "Vì sao chia cho số dòng hàng đã giao thay vì so số yêu cầu trả hàng giữa các shop?", en: "Why divide by order lines delivered instead of comparing return counts between shops?" }
  options:
    - { vi: "Shop bán nhiều thì tự nhiên có nhiều yêu cầu trả hơn; tỷ lệ mới so được shop lớn với shop nhỏ", en: "A shop that sells more naturally gets more returns; only a rate compares big and small shops fairly" }
    - { vi: "Vì số yêu cầu trả hàng có thể âm", en: "Because return counts can be negative" }
    - { vi: "Không khác gì, hai cách cho cùng thứ tự", en: "No difference, both give the same order" }
  answer: 0
  why: { vi: "Số đếm cho biết bao nhiêu, tỷ lệ cho biết thường xuyên đến đâu. So giữa các nhóm khác cỡ thì dùng tỷ lệ.", en: "A count says how many, a rate says how often. To compare groups of different sizes, use a rate." }
wrong:
  - sql: "WITH sold AS (SELECT p.seller_id, count(*) AS lines FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY p.seller_id), broken AS (SELECT p.seller_id, count(*) AS n FROM returns r JOIN products p ON p.id = r.product_id WHERE r.reason = 'damaged' AND r.requested_on >= '{{from}}' AND r.requested_on < '{{to}}' GROUP BY p.seller_id) SELECT s.name, sold.lines, broken.n, ROUND(100 * broken.n / sold.lines, 1) AS pct FROM sold JOIN broken ON broken.seller_id = sold.seller_id JOIN sellers s ON s.id = sold.seller_id ORDER BY pct DESC, s.name LIMIT 5"
    vi: "Phép chia hai số nguyên bỏ phần thập phân, nên tỷ lệ mất số thập phân. Nhân với 100.0 để có số thập phân."
    en: "Dividing two integers drops the fraction, so the rate loses its decimals. Multiply by 100.0 to get a decimal."
---
Khách chấm điểm thấp hay viết "hàng hỏng", nhưng shop bán nhiều thì đương nhiên bị trả nhiều. Mình cần tỷ lệ, không phải số đếm, để biết shop nào thật sự có vấn đề.

## Task
Trong quý {{q}}: với mỗi shop, số dòng hàng thuộc các đơn đặt trong quý và đã giao xong, số yêu cầu trả hàng vì hỏng gửi trong quý, và tỷ lệ phần trăm của hai số đó (làm tròn 1 chữ số thập phân). Chỉ xét shop có ít nhất một yêu cầu như vậy. Gửi năm shop có tỷ lệ cao nhất, kèm tên shop; bằng nhau thì xếp theo tên shop.

## Hints
1. Hai bước có tên: một bước đếm hàng đã bán của mỗi shop, một bước đếm yêu cầu trả vì hỏng, rồi nối lại và chia.
2. Lý do hỏng là `'damaged'`; chia cho `sold.lines`, nhân `100.0` để có số thập phân.
3. `SELECT s.name, sold.lines, broken.n, ROUND(100.0 * broken.n / sold.lines, 1) AS pct FROM sold JOIN broken ... ORDER BY pct DESC, s.name LIMIT 5`

## Solution
```sql
WITH sold AS (
  SELECT p.seller_id, count(*) AS lines
  FROM order_items i
  JOIN orders o ON o.id = i.order_id
  JOIN products p ON p.id = i.product_id
  WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
  GROUP BY p.seller_id
), broken AS (
  SELECT p.seller_id, count(*) AS n
  FROM returns r
  JOIN products p ON p.id = r.product_id
  WHERE r.reason = 'damaged' AND r.requested_on >= '{{from}}' AND r.requested_on < '{{to}}'
  GROUP BY p.seller_id
)
SELECT s.name, sold.lines, broken.n, ROUND(100.0 * broken.n / sold.lines, 1) AS pct
FROM sold
JOIN broken ON broken.seller_id = sold.seller_id
JOIN sellers s ON s.id = sold.seller_id
ORDER BY pct DESC, s.name
LIMIT 5
```

# EN
Customers who rate low often write "arrived broken", but a shop that sells more naturally gets more returns. I need a rate, not a count, to see which shop really has a problem.

## Task
In {{q_en}}: for each shop, the number of order lines in orders placed that quarter and fully delivered, the number of return requests for damage sent that quarter, and the second as a percentage of the first (rounded to 1 decimal). Only shops with at least one such request. Send the five shops with the highest rate, with the shop name; on equal rates, by shop name.

## Hints
1. Two named steps: one counts each shop's items sold, one counts its returns for damage; then put them together and divide.
2. The damage reason is `'damaged'`; divide by `sold.lines` and multiply by `100.0` to get a decimal.
3. `SELECT s.name, sold.lines, broken.n, ROUND(100.0 * broken.n / sold.lines, 1) AS pct FROM sold JOIN broken ... ORDER BY pct DESC, s.name LIMIT 5`
