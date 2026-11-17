---
id: ecom-ch5-04
chapter: 5
title: Shop nào có nhiều hàng hỏng bị trả về
title_en: Which shops get damaged items sent back
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: rest
requires: [multi_join, left_join, having, aggregate, group_by, order_by]
grants: []
tables: [order_items, deliveries, products, sellers, returns]
ordered: true
columns:
  - { vi: "Tên shop", en: "Shop name" }
  - { vi: "Số dòng hàng đã giao", en: "Order lines delivered" }
  - { vi: "Số dòng hàng trả vì hỏng", en: "Order lines returned damaged" }
  - { vi: "Tỷ lệ trả vì hỏng (%)", en: "Damaged return rate (%)" }
reflect:
  q: { vi: "Vì sao điều kiện lý do hỏng phải nằm trong điều kiện ghép với danh mục trả hàng?", en: "Why must the damaged-reason condition sit in the join with the returns list?" }
  options:
    - { vi: "Đặt ở điều kiện lọc dòng thì mọi món không bị trả sẽ bị loại, và tỷ lệ thành 100%", en: "In the row filter it would drop every item that was not returned, and the rate would become 100%" }
    - { vi: "Để truy vấn chạy nhanh hơn", en: "To make the query faster" }
    - { vi: "Đặt ở đâu cũng như nhau", en: "Either place is the same" }
  answer: 0
  why: { vi: "LEFT JOIN giữ mọi món đã giao; điều kiện trong phần ghép chỉ quyết định món nào gắn được một lần trả vì hỏng.", en: "LEFT JOIN keeps every delivered item; a condition inside the join only decides which items get a damaged return attached." }
wrong:
  - sql: "SELECT s.name, count(*), count(r.id), ROUND(100.0 * count(r.id) / count(*), 2) FROM order_items i JOIN deliveries d ON d.order_id = i.order_id JOIN products p ON p.id = i.product_id JOIN sellers s ON s.id = p.seller_id LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id WHERE d.delivered_on >= '2026-07-01' AND d.delivered_on < '2026-10-01' GROUP BY s.id, s.name HAVING count(*) >= 100 ORDER BY 4 DESC, s.name"
    vi: "Bạn đang đếm mọi lần trả hàng, kể cả trả vì đổi ý hay giao nhầm. Đề chỉ đếm món trả vì hỏng: thêm điều kiện lý do vào phần ghép."
    en: "You are counting every return, including changes of mind and wrong items. The request only counts items returned as damaged: add the reason condition to the join."
---
Khách than nhận hàng điện tử bị hỏng. Trước khi làm việc với các shop, ngành hàng cần biết shop nào có tỷ lệ hàng hỏng bị trả về cao bất thường.

## Task
Các dòng hàng giao tới khách trong quý 3/2026 (ngày giao từ 01/07 đến hết 30/09; mỗi sản phẩm trong một đơn tính một lần, không theo số lượng): với mỗi shop, có bao nhiêu dòng hàng đã giao, bao nhiêu dòng hàng bị khách trả vì hỏng, và tỷ lệ đó bằng bao nhiêu phần trăm (làm tròn 2 chữ số thập phân)? Chỉ xét shop có từ 100 dòng hàng đã giao trở lên. Tỷ lệ cao nhất lên đầu; bằng nhau thì xếp theo tên shop.

## Hints
1. Đi từ dòng hàng tới giao hàng (ngày giao), sản phẩm và shop; gắn thêm lần trả hàng vì hỏng nếu có, mà không làm mất món nào không bị trả.
2. `LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'`; số món trả là `count(r.id)`; tỷ lệ `ROUND(100.0 * count(r.id) / count(*), 2)`; lọc shop bằng `HAVING count(*) >= 100`.
3. `SELECT s.name, count(*), count(r.id), ROUND(...) FROM order_items i JOIN deliveries d ON ... JOIN products p ON ... JOIN sellers s ON ... LEFT JOIN returns r ON ... WHERE ... GROUP BY s.id, s.name HAVING ... ORDER BY 4 DESC, s.name`

## Solution
```sql
SELECT s.name, count(*), count(r.id), ROUND(100.0 * count(r.id) / count(*), 2)
FROM order_items i
JOIN deliveries d ON d.order_id = i.order_id
JOIN products p ON p.id = i.product_id
JOIN sellers s ON s.id = p.seller_id
LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'
WHERE d.delivered_on >= '2026-07-01' AND d.delivered_on < '2026-10-01'
GROUP BY s.id, s.name
HAVING count(*) >= 100
ORDER BY 4 DESC, s.name
```

# EN
Customers complain about receiving broken electronics. Before talking to the shops, the category team needs to know which shops have an unusually high rate of damaged items sent back.

## Task
For the order lines delivered to customers in Q3 2026 (delivery date from 1 July to 30 September; each product in an order counts once, whatever the quantity): for each shop, how many order lines were delivered, how many were returned by customers as damaged, and what percentage is that (rounded to 2 decimals)? Only shops with 100 or more order lines delivered. Highest rate first; on equal rates, by shop name.

## Hints
1. Walk from the order line to the delivery (its date), the product and the shop; attach a damaged return if there is one, without losing the items that were not returned.
2. `LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'`; returned items are `count(r.id)`; the rate is `ROUND(100.0 * count(r.id) / count(*), 2)`; filter shops with `HAVING count(*) >= 100`.
3. `SELECT s.name, count(*), count(r.id), ROUND(...) FROM order_items i JOIN deliveries d ON ... JOIN products p ON ... JOIN sellers s ON ... LEFT JOIN returns r ON ... WHERE ... GROUP BY s.id, s.name HAVING ... ORDER BY 4 DESC, s.name`
