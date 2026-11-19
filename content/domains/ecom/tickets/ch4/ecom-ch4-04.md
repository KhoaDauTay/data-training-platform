---
id: ecom-ch4-04
chapter: 4
title: Nhận hàng bao lâu thì khách viết đánh giá
title_en: How soon customers review after delivery
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 2
beat: rest
requires: [join, date_math, aggregate, group_by, order_by]
grants: []
tables: [reviews, deliveries]
ordered: true
columns:
  - { vi: "Số sao", en: "Stars" }
  - { vi: "Số ngày trung bình từ lúc nhận hàng", en: "Average days after delivery" }
variants:
  - { from: "2025-01-01", to: "2026-11-01", first: "01/2025", last: "10/2026", first_en: "January 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2026-01-01", to: "2026-11-01", first: "01/2026", last: "10/2026", first_en: "January 2026", last_en: "October 2026" }
reflect:
  q: { vi: "Vì sao ghép đánh giá với giao hàng theo mã đơn mà không theo mã sản phẩm?", en: "Why join reviews to deliveries on the order number and not the product number?" }
  options:
    - { vi: "Mỗi đơn có một lần giao; ngày giao thuộc về đơn, không thuộc về sản phẩm", en: "Each order has one delivery; the delivery date belongs to the order, not to the product" }
    - { vi: "Vì danh mục giao hàng không có cột nào khác", en: "Because the delivery list has no other column" }
    - { vi: "Ghép theo mã nào cũng được", en: "Any number works for the join" }
  answer: 0
  why: { vi: "Khóa ghép phải nói đúng quan hệ: một đánh giá thuộc một đơn, một đơn có một lần giao.", en: "The join key must state the real relationship: a review belongs to one order, and an order has one delivery." }
wrong:
  - sql: "SELECT r.rating, ROUND(AVG(r.created_on - d.shipped_on), 2) FROM reviews r JOIN deliveries d ON d.order_id = r.order_id WHERE r.created_on >= '{{from}}' AND r.created_on < '{{to}}' GROUP BY r.rating ORDER BY r.rating"
    vi: "Bạn đang tính từ ngày gửi hàng. Đề tính từ ngày khách nhận hàng."
    en: "You are counting from the shipping date. The request counts from the day the customer received the parcel."
---
Mình muốn gửi tin nhắc khách viết đánh giá vào đúng lúc. Trước hết cần biết thường thì nhận hàng bao lâu khách mới viết, và khách chấm thấp có viết nhanh hơn không.

## Task
Các đánh giá viết từ tháng {{first}} đến hết tháng {{last}}: với mỗi mức sao, trung bình khách viết đánh giá sau ngày nhận hàng bao nhiêu ngày? Làm tròn 2 chữ số thập phân; xếp theo số sao tăng dần.

## Hints
1. Ngày viết nằm ở đánh giá, ngày nhận hàng nằm ở danh mục giao hàng; hai bảng chung mã đơn. Trừ hai ngày, rồi lấy trung bình theo số sao.
2. Ghép `d.order_id = r.order_id`; số ngày là `r.created_on - d.delivered_on`; làm tròn `ROUND(AVG(...), 2)`.
3. `SELECT r.rating, ROUND(AVG(r.created_on - d.delivered_on), 2) FROM reviews r JOIN deliveries d ON ... WHERE ... GROUP BY r.rating ORDER BY r.rating`

## Solution
```sql
SELECT r.rating, ROUND(AVG(r.created_on - d.delivered_on), 2)
FROM reviews r
JOIN deliveries d ON d.order_id = r.order_id
WHERE r.created_on >= '{{from}}' AND r.created_on < '{{to}}'
GROUP BY r.rating
ORDER BY r.rating
```

# EN
I want to send review reminders at the right moment. First I need to know how long after delivery customers usually write, and whether low scores come faster.

## Task
Reviews written from {{first_en}} to the end of {{last_en}}: for each star level, on average how many days after delivery do customers write their review? Round to 2 decimals; sort by stars, ascending.

## Hints
1. The writing date is on the review, the delivery date is in the delivery list; the two tables share the order number. Subtract the two dates, then average by stars.
2. Join on `d.order_id = r.order_id`; the days are `r.created_on - d.delivered_on`; round with `ROUND(AVG(...), 2)`.
3. `SELECT r.rating, ROUND(AVG(r.created_on - d.delivered_on), 2) FROM reviews r JOIN deliveries d ON ... WHERE ... GROUP BY r.rating ORDER BY r.rating`
