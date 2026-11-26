---
id: ecom-ch7-03
chapter: 7
title: Lỗi ở shop hay ở đơn vị giao hàng?
title_en: The shop or the courier?
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 4
beat: twist
requires: [cte, conditional_agg, multi_join, aggregate, group_by, where, order_by]
grants: []
tables: [order_items, orders, products, sellers, deliveries, returns]
ordered: true
columns:
  - { vi: "Đơn vị giao hàng", en: "Courier" }
  - { vi: "Tỷ lệ trả vì hỏng, hàng Highland Gadget Hub (%)", en: "Damage return rate, Highland Gadget Hub items (%)" }
  - { vi: "Tỷ lệ trả vì hỏng, hàng shop khác (%)", en: "Damage return rate, other shops' items (%)" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026" }
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026" }
reflect:
  q: { vi: "Vì sao phải tách hàng của shop với hàng shop khác trong từng đơn vị giao hàng?", en: "Why split the shop's items from other shops' items within each courier?" }
  options:
    - { vi: "Nếu hàng của shop vỡ nhiều ở mọi đơn vị giao còn hàng shop khác thì không, lỗi nằm ở shop chứ không ở người giao", en: "If the shop's items break often with every courier while other items do not, the fault lies with the shop, not the delivery" }
    - { vi: "Vì mỗi đơn vị giao hàng chỉ chở hàng của một shop", en: "Because each courier carries only one shop's items" }
    - { vi: "Để kết quả có nhiều dòng hơn", en: "To get more rows in the result" }
  answer: 0
  why: { vi: "Cắt thêm một chiều là cách kiểm tra chéo một giả thuyết: nguyên nhân thật phải hiện ra ở mọi lát cắt.", en: "Cutting along one more dimension cross-checks a hypothesis: the real cause shows up in every slice." }
wrong:
  - sql: "WITH sold AS (SELECT d.courier, count(*) FILTER (WHERE s.name = 'Highland Gadget Hub') AS mine, count(*) FILTER (WHERE s.name <> 'Highland Gadget Hub') AS other FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN sellers s ON s.id = p.seller_id JOIN deliveries d ON d.order_id = o.id WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY d.courier), broken AS (SELECT d.courier, count(*) FILTER (WHERE s.name = 'Highland Gadget Hub') AS mine, count(*) FILTER (WHERE s.name <> 'Highland Gadget Hub') AS other FROM returns r JOIN products p ON p.id = r.product_id JOIN sellers s ON s.id = p.seller_id JOIN deliveries d ON d.order_id = r.order_id WHERE r.reason = 'damaged' AND r.requested_on >= '{{from}}' AND r.requested_on < '{{to}}' GROUP BY d.courier) SELECT sold.courier, ROUND(100.0 * broken.mine / (sold.mine + sold.other), 1), ROUND(100.0 * broken.other / (sold.mine + sold.other), 1) FROM sold JOIN broken ON broken.courier = sold.courier ORDER BY sold.courier"
    vi: "Bạn chia cả hai tỷ lệ cho mọi dòng hàng đơn vị đó đã giao, của shop này lẫn các shop khác. Mỗi tỷ lệ phải chia cho số dòng hàng của chính nhóm đó."
    en: "You divide both rates by everything the courier delivered, this shop and the others together. Each rate must divide by that group's own items."
---
Bên vận hành không đồng ý: "Hàng vỡ là do khâu giao, nhất là Kite Logistics đang trễ ở miền Trung." Trước khi đổ lỗi, mình muốn đặt hai giả thuyết cạnh nhau trên cùng một bảng.

## Task
Trong quý {{q}}, theo từng đơn vị giao hàng: tỷ lệ phần trăm trả vì hỏng của hàng shop Highland Gadget Hub, và của hàng các shop khác (làm tròn 1 chữ số thập phân). Tỷ lệ của một nhóm là số yêu cầu trả vì hỏng gửi trong quý chia cho số dòng hàng của nhóm đó thuộc các đơn đặt trong quý và đã giao xong; đơn vị giao của yêu cầu là đơn vị đã giao đơn đó. Chỉ xét đơn vị có ít nhất một yêu cầu như vậy; xếp theo tên đơn vị giao.

## Hints
1. Hai bước có tên, mỗi bước gom theo đơn vị giao và đếm hai nhóm hàng cạnh nhau bằng điều kiện; rồi nối và chia từng nhóm cho chính nó.
2. Đơn vị giao nằm ở `deliveries`, nối bằng `order_id`; hai nhóm là `count(*) FILTER (WHERE s.name = 'Highland Gadget Hub')` và `<>`.
3. `SELECT sold.courier, ROUND(100.0 * broken.mine / sold.mine, 1), ROUND(100.0 * broken.other / sold.other, 1) FROM sold JOIN broken ON broken.courier = sold.courier ORDER BY sold.courier`

## Solution
```sql
WITH sold AS (
  SELECT d.courier,
         count(*) FILTER (WHERE s.name = 'Highland Gadget Hub') AS mine,
         count(*) FILTER (WHERE s.name <> 'Highland Gadget Hub') AS other
  FROM order_items i
  JOIN orders o ON o.id = i.order_id
  JOIN products p ON p.id = i.product_id
  JOIN sellers s ON s.id = p.seller_id
  JOIN deliveries d ON d.order_id = o.id
  WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
  GROUP BY d.courier
), broken AS (
  SELECT d.courier,
         count(*) FILTER (WHERE s.name = 'Highland Gadget Hub') AS mine,
         count(*) FILTER (WHERE s.name <> 'Highland Gadget Hub') AS other
  FROM returns r
  JOIN products p ON p.id = r.product_id
  JOIN sellers s ON s.id = p.seller_id
  JOIN deliveries d ON d.order_id = r.order_id
  WHERE r.reason = 'damaged' AND r.requested_on >= '{{from}}' AND r.requested_on < '{{to}}'
  GROUP BY d.courier
)
SELECT sold.courier, ROUND(100.0 * broken.mine / sold.mine, 1), ROUND(100.0 * broken.other / sold.other, 1)
FROM sold
JOIN broken ON broken.courier = sold.courier
ORDER BY sold.courier
```

# EN
Operations disagrees: "Items break in delivery, especially with Kite Logistics running late in the central cities." Before blaming anyone, I want both hypotheses side by side in one table.

## Task
In {{q_en}}, per courier: the damage return rate in percent for Highland Gadget Hub items, and for other shops' items (rounded to 1 decimal). A group's rate is the return requests for damage sent that quarter divided by that group's order lines in orders placed that quarter and fully delivered; a request's courier is the one that delivered its order. Only couriers with at least one such request; sort by courier name.

## Hints
1. Two named steps, each grouping by courier and counting both groups of items side by side with conditions; then put them together and divide each group by itself.
2. The courier is in `deliveries`, matched on `order_id`; the two groups are `count(*) FILTER (WHERE s.name = 'Highland Gadget Hub')` and `<>`.
3. `SELECT sold.courier, ROUND(100.0 * broken.mine / sold.mine, 1), ROUND(100.0 * broken.other / sold.other, 1) FROM sold JOIN broken ON broken.courier = sold.courier ORDER BY sold.courier`
