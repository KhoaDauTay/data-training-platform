---
id: ecom-ch3-03
chapter: 3
title: Khách đăng ký mà chưa mua lần nào
title_en: Customers who signed up but never bought
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 3
beat: twist
requires: [join]
grants: [left_join, anti_join]
tables: [customers, orders]
columns:
  - { vi: "Mã khách", en: "Customer number" }
  - { vi: "Họ tên", en: "Full name" }
  - { vi: "Ngày đăng ký", en: "Signup date" }
variants:
  - { month: "9/2026", month_en: "September 2026", from: "2026-09-01", to: "2026-10-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "5/2026", month_en: "May 2026", from: "2026-05-01", to: "2026-06-01" }
reflect:
  q: { vi: "Vì sao ghép thường (không LEFT) không bao giờ tìm ra khách chưa mua?", en: "Why can a plain join (not LEFT) never find customers who never bought?" }
  options:
    - { vi: "Ghép thường bỏ mọi khách không có đơn nào khớp, nên những khách cần tìm đã biến mất", en: "A plain join drops every customer with no matching order, so the very customers you want are gone" }
    - { vi: "Ghép thường chạy chậm hơn", en: "A plain join is slower" }
    - { vi: "Ghép thường không đọc được ngày đăng ký", en: "A plain join cannot read the signup date" }
  answer: 0
  why: { vi: "LEFT JOIN giữ mọi khách; khách không có đơn thì các cột của đơn để trống, và điều kiện cột đơn trống chọn đúng họ.", en: "LEFT JOIN keeps every customer; a customer with no order gets empty order columns, and the empty-order condition picks exactly them." }
wrong:
  - sql: "SELECT c.id, c.full_name, c.signup_date FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled' WHERE o.id IS NULL AND c.signup_date >= '{{from}}' AND c.signup_date < '{{to}}'"
    vi: "Danh sách có cả khách đã đặt đơn rồi hủy. Đề cần khách chưa đặt một đơn nào, kể cả đơn đã hủy."
    en: "Your list includes customers who placed an order and then cancelled it. The request wants customers who never placed any order, cancelled ones included."
---
Marketing sắp gửi một mã giảm giá cho khách đã tạo tài khoản mà chưa mua lần nào, để kéo họ đặt đơn đầu tiên. Gửi nhầm cho khách đã mua thì tốn tiền vô ích.

## Task
Những khách đăng ký trong tháng {{month}} mà đến nay chưa đặt một đơn nào (kể cả đơn đã hủy cũng chưa có): mã khách, họ tên, ngày đăng ký. Thứ tự dòng không quan trọng.

## Hints
1. Bài này tìm thứ không có: giữ mọi khách, gắn đơn của họ nếu có, rồi chỉ giữ khách không gắn được đơn nào.
2. `customers c LEFT JOIN orders o ON o.customer_id = c.id` giữ cả khách không có đơn; với họ `o.id` trống, nên lọc `o.id IS NULL`.
3. `SELECT c.id, c.full_name, c.signup_date FROM customers c LEFT JOIN orders o ON ... WHERE o.id IS NULL AND ...`

## Solution
```sql
SELECT c.id, c.full_name, c.signup_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL AND c.signup_date >= '{{from}}' AND c.signup_date < '{{to}}'
```

# EN
Marketing is about to send a discount code to customers who opened an account but never bought, to win their first order. Sending it to customers who already buy is money thrown away.

## Task
The customers who signed up in {{month_en}} and have not placed a single order so far (not even a cancelled one): customer number, full name, signup date. Row order does not matter.

## Hints
1. This task looks for what is missing: keep every customer, attach their orders if any, then keep only the customers with no order attached.
2. `customers c LEFT JOIN orders o ON o.customer_id = c.id` keeps customers with no order too; for them `o.id` is empty, so filter `o.id IS NULL`.
3. `SELECT c.id, c.full_name, c.signup_date FROM customers c LEFT JOIN orders o ON ... WHERE o.id IS NULL AND ...`
