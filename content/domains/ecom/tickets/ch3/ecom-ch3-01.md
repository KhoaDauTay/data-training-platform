---
id: ecom-ch3-01
chapter: 3
title: Đơn bị hủy trong ngày sale
title_en: Orders cancelled on a sale day
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 2
beat: teach
format: worked
requires: [select, where, order_by]
grants: [join]
tables: [orders, customers]
ordered: true
columns:
  - { vi: "Mã đơn", en: "Order code" }
  - { vi: "Tên khách", en: "Customer name" }
  - { vi: "Thành phố của khách", en: "Customer city" }
variants:
  - { day: "10/10/2026", day_en: "10 October 2026", from: "2026-10-10", to: "2026-10-11" }
  - { day: "9/9/2026", day_en: "9 September 2026", from: "2026-09-09", to: "2026-09-10" }
  - { day: "11/11/2025", day_en: "11 November 2025", from: "2025-11-11", to: "2025-11-12" }
reflect:
  q: { vi: "Điều kiện ghép sau chữ ON nói gì?", en: "What does the matching condition after ON say?" }
  options:
    - { vi: "Dòng nào của bảng này đi với dòng nào của bảng kia: mã khách trong đơn bằng mã của khách", en: "Which row of one table goes with which row of the other: the customer number on the order equals the customer's own number" }
    - { vi: "Chỉ giữ những đơn bị hủy", en: "Keep only the cancelled orders" }
    - { vi: "Sắp xếp hai bảng theo cùng một cột", en: "Sort both tables by the same column" }
  answer: 0
  why: { vi: "ON ghép dòng theo khóa; lọc đơn bị hủy vẫn là việc của điều kiện lọc dòng.", en: "ON matches rows by key; keeping only cancelled orders is still the row filter's job." }
wrong:
  - sql: "SELECT o.code, c.full_name, c.city FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' ORDER BY o.code"
    vi: "Danh sách đang có mọi đơn của ngày đó. Đề chỉ cần đơn bị hủy."
    en: "Your list has every order of that day. The request is only for cancelled orders."
---
Sau mỗi ngày sale lớn, nhóm chăm sóc khách hàng gọi cho những khách đã hủy đơn để hỏi lý do: hết hàng, đổi ý, hay chờ lâu quá. Trong danh mục đơn chỉ có mã khách, còn tên và thành phố nằm ở hồ sơ khách hàng, nên lần này bạn cần ghép hai bảng.

Đây là lần đầu bạn ghép bảng, nên mình gửi kèm một ví dụ mẫu.

## Task
Ngày {{day}} có những đơn nào bị hủy? Mỗi đơn gửi mình mã đơn, tên khách và thành phố của khách; xếp theo mã đơn.

## Example
```sql
SELECT r.created_on, r.rating, p.name   -- ①
FROM reviews r                          -- ②
JOIN products p ON p.id = r.product_id  -- ③
WHERE r.rating = 5 AND r.created_on = '2026-10-30'
```
Ví dụ: những đánh giá 5 sao viết ngày 30/10/2026, kèm tên sản phẩm được khen.

① Có hai bảng nên mỗi cột ghi kèm tên tắt của bảng: chữ r là danh mục đánh giá, chữ p là danh mục sản phẩm.

② Tên tắt đặt ngay sau tên bảng.

③ Ghép dòng: mỗi đánh giá đi với đúng sản phẩm có mã bằng mã sản phẩm ghi trong đánh giá.

## Hints
1. Đơn hàng có mã khách; tên và thành phố nằm ở hồ sơ khách hàng. Ghép hai bảng theo mã khách, rồi lọc đơn bị hủy trong ngày đó.
2. Bảng `orders` (cột `customer_id`, `status`, `ordered_at`) ghép với `customers` qua `c.id = o.customer_id`. Đơn bị hủy là `o.status = 'cancelled'`; ngày đó viết `o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'` vì cột có cả giờ.
3. `SELECT o.code, c.full_name, c.city FROM orders o JOIN customers c ON ... WHERE ... ORDER BY o.code`

## Solution
```sql
SELECT o.code, c.full_name, c.city
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'cancelled' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
ORDER BY o.code
```

# EN
After every big sale day, the customer care team calls the customers who cancelled to ask why: out of stock, a change of mind, or a wait that was too long. The order list only holds the customer number; names and cities are in the customer records, so this time you need to put two tables together.

This is your first join, so I am sending a worked example along.

## Task
Which orders were cancelled on {{day_en}}? For each one send me the order code, the customer name and the customer's city; sort by order code.

## Example
Example: the 5-star reviews written on 30 October 2026, with the name of the product they praise.

① There are two tables, so each column carries the table's short name: r is the review list, p is the product list.

② The short name goes right after the table name.

③ Matching rows: each review goes with the one product whose number equals the product number on the review.

## Hints
1. An order holds the customer number; the name and city are in the customer records. Join the two tables on the customer number, then keep the cancelled orders of that day.
2. Table `orders` (columns `customer_id`, `status`, `ordered_at`) joins `customers` through `c.id = o.customer_id`. Cancelled is `o.status = 'cancelled'`; that day is `o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'` because the column also holds the time.
3. `SELECT o.code, c.full_name, c.city FROM orders o JOIN customers c ON ... WHERE ... ORDER BY o.code`
