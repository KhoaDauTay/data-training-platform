---
id: ecom-ch5-03
chapter: 5
title: Khách mua một lần hay mua nhiều lần
title_en: One-time buyers or repeat buyers
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 3
beat: twist
requires: [case_when, aggregate, group_by, order_by]
grants: [cte]
tables: [orders]
ordered: true
columns:
  - { vi: "Nhóm khách (1 một đơn, 2 hai đến ba đơn, 3 từ bốn đơn)", en: "Customer group (1 one order, 2 two to three, 3 four or more)" }
  - { vi: "Số khách", en: "Customers" }
variants:
  - { to: "2026-11-01", d: "31/10/2026", d_en: "31 October 2026" }
  - { to: "2026-07-01", d: "30/06/2026", d_en: "30 June 2026" }
  - { to: "2026-01-01", d: "31/12/2025", d_en: "31 December 2025" }
reflect:
  q: { vi: "Vì sao bài này cần hai bước (một khối WITH rồi một câu chính)?", en: "Why does this task need two steps (a WITH block, then the main query)?" }
  options:
    - { vi: "Phải gom theo khách trước để có số đơn, rồi mới gom lần nữa theo nhóm khách", en: "You must group by customer first to get the order count, then group again by customer group" }
    - { vi: "Vì một câu không được dùng hai hàm gộp", en: "Because one query may not use two aggregate functions" }
    - { vi: "Để chạy nhanh hơn", en: "To run faster" }
  answer: 0
  why: { vi: "Hai tầng gom nhóm: tầng một ra số đơn mỗi khách, tầng hai đếm khách theo nhóm. Khối WITH đặt tên cho tầng một để tầng hai đọc như một bảng.", en: "Two levels of aggregation: level one gives orders per customer, level two counts customers per group. The WITH block names level one so level two reads it like a table." }
wrong:
  - sql: "WITH per_customer AS (SELECT customer_id, count(*) AS n FROM orders WHERE status <> 'cancelled' AND ordered_at < '{{to}}' GROUP BY customer_id) SELECT CASE WHEN n = 1 THEN 1 WHEN n <= 3 THEN 2 ELSE 3 END AS grp, sum(n) FROM per_customer GROUP BY grp ORDER BY grp"
    vi: "Cột thứ hai đang cộng số đơn của cả nhóm. Đề cần số khách trong mỗi nhóm."
    en: "The second column adds up the orders of the whole group. The request wants the number of customers in each group."
---
Phòng tài chính đang tính giá trị vòng đời khách hàng cho hồ sơ gọi vốn. Câu hỏi đầu tiên của nhà đầu tư luôn là: khách mua một lần rồi đi, hay quay lại mua tiếp?

## Task
Tính đến hết ngày {{d}}: mỗi khách đã có bao nhiêu đơn không bị hủy? Chia những khách đã có ít nhất một đơn thành 3 nhóm: 1 = đúng một đơn, 2 = hai hoặc ba đơn, 3 = từ bốn đơn trở lên. Mỗi nhóm có bao nhiêu khách? Xếp theo số nhóm.

## Hints
1. Hai bước: trước hết đếm số đơn của từng khách; sau đó gắn mỗi khách vào một nhóm theo số đơn và đếm khách trong từng nhóm.
2. Bước một đặt tên bằng khối `WITH per_customer AS (...)` (gom theo `customer_id`); bước hai đọc `per_customer` như một bảng, dùng `CASE` trên số đơn.
3. `WITH per_customer AS (SELECT customer_id, count(*) AS n FROM orders WHERE ... GROUP BY customer_id) SELECT CASE ... END AS grp, count(*) FROM per_customer GROUP BY grp ORDER BY grp`

## Solution
```sql
WITH per_customer AS (
  SELECT customer_id, count(*) AS n
  FROM orders
  WHERE status <> 'cancelled' AND ordered_at < '{{to}}'
  GROUP BY customer_id
)
SELECT CASE WHEN n = 1 THEN 1 WHEN n <= 3 THEN 2 ELSE 3 END AS grp, count(*)
FROM per_customer
GROUP BY grp
ORDER BY grp
```

# EN
Finance is working out customer lifetime value for the funding pitch. The first question every investor asks: do customers buy once and leave, or come back for more?

## Task
Up to the end of {{d_en}}: how many orders that were not cancelled does each customer have? Split the customers with at least one order into 3 groups: 1 = exactly one order, 2 = two or three orders, 3 = four or more. How many customers are in each group? Sort by group number.

## Hints
1. Two steps: first count the orders of each customer; then put each customer into a group by their count and count the customers in each group.
2. Name step one with a `WITH per_customer AS (...)` block (grouped by `customer_id`); step two reads `per_customer` like a table, using `CASE` on the order count.
3. `WITH per_customer AS (SELECT customer_id, count(*) AS n FROM orders WHERE ... GROUP BY customer_id) SELECT CASE ... END AS grp, count(*) FROM per_customer GROUP BY grp ORDER BY grp`
