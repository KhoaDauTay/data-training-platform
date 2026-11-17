---
id: ecom-ch2-03
chapter: 2
title: Khách mua nhiều năm 2026
title_en: Frequent buyers of 2026
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: twist
requires: [aggregate, group_by]
grants: [having]
tables: [orders]
columns:
  - { vi: "Mã khách", en: "Customer number" }
  - { vi: "Số đơn không hủy", en: "Orders not cancelled" }
variants:
  - { n: "8" }
  - { n: "9" }
  - { n: "10" }
reflect:
  q: { vi: "Vì sao điều kiện về số đơn không đặt chung chỗ với điều kiện về trạng thái và năm?", en: "Why does the condition on the number of orders not go with the conditions on status and year?" }
  options:
    - { vi: "Số đơn chỉ có sau khi đã gom nhóm; điều kiện lọc dòng chạy trước khi gom", en: "The order count only exists after grouping; the row filter runs before grouping" }
    - { vi: "Đặt chung chỗ cũng được, chỉ chậm hơn", en: "Putting it there works too, just slower" }
    - { vi: "Vì điều kiện số không được đặt sau ngày tháng", en: "Because number conditions cannot follow date conditions" }
  answer: 0
  why: { vi: "Lọc dòng (trạng thái, năm) xảy ra trước, gom nhóm sau, rồi mới lọc nhóm theo số đếm.", en: "Row filters (status, year) come first, grouping next, and only then are groups filtered by their count." }
wrong:
  - sql: "SELECT customer_id, count(*) FROM orders WHERE ordered_at >= '2026-01-01' AND ordered_at < '2027-01-01' GROUP BY customer_id HAVING count(*) >= {{n}}"
    vi: "Bạn đang đếm cả đơn đã hủy. Đề chỉ tính đơn không bị hủy."
    en: "You are also counting cancelled orders. The request only counts orders that were not cancelled."
---
Marketing sắp mở chương trình khách thân thiết. Đợt đầu mời những khách mua nhiều nhất năm nay; mình cần danh sách để gửi thư mời.

## Task
Năm 2026, những khách nào đặt từ {{n}} đơn trở lên, không tính đơn đã hủy? Gửi mã khách và số đơn của họ. Thứ tự dòng không quan trọng.

## Hints
1. Đếm số đơn của từng khách (mỗi khách một nhóm), rồi chỉ giữ những nhóm có số đơn đủ lớn.
2. Lọc dòng: `status <> 'cancelled'` và khoảng ngày của năm. Lọc nhóm theo số đếm đặt sau gom nhóm: `HAVING count(*) >= {{n}}`.
3. `SELECT customer_id, count(*) FROM orders WHERE ... GROUP BY customer_id HAVING ...`

## Solution
```sql
SELECT customer_id, count(*)
FROM orders
WHERE status <> 'cancelled' AND ordered_at >= '2026-01-01' AND ordered_at < '2027-01-01'
GROUP BY customer_id
HAVING count(*) >= {{n}}
```

# EN
Marketing is about to launch a loyalty programme. The first round invites the customers who bought the most this year; I need the list to send the invitations.

## Task
In 2026, which customers placed {{n}} or more orders, cancelled orders not counted? Send the customer number and their number of orders. Row order does not matter.

## Hints
1. Count the orders of each customer (one group per customer), then keep only the groups with a large enough count.
2. Row filter: `status <> 'cancelled'` and the date range of the year. The group filter on the count comes after grouping: `HAVING count(*) >= {{n}}`.
3. `SELECT customer_id, count(*) FROM orders WHERE ... GROUP BY customer_id HAVING ...`
