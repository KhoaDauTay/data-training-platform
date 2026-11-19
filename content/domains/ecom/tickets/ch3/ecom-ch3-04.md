---
id: ecom-ch3-04
chapter: 3
title: Mã giảm giá nào được dùng nhiều
title_en: Which discount codes get used
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 2
beat: rest
requires: [join, aggregate, group_by, order_by]
grants: []
tables: [vouchers, orders]
ordered: true
columns:
  - { vi: "Mã giảm giá", en: "Discount code" }
  - { vi: "Chương trình", en: "Campaign" }
  - { vi: "Số đơn không hủy", en: "Orders not cancelled" }
variants:
  - { from: "2025-01-01", to: "2026-11-01", first: "01/2025", last: "10/2026", first_en: "January 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2026-01-01", to: "2026-11-01", first: "01/2026", last: "10/2026", first_en: "January 2026", last_en: "October 2026" }
reflect:
  q: { vi: "Vì sao cột chương trình cũng phải nằm trong phần gom nhóm?", en: "Why must the campaign column also be in the grouping?" }
  options:
    - { vi: "Mọi cột không nằm trong hàm gộp phải là cột gom nhóm, kể cả khi mỗi mã chỉ có một chương trình", en: "Every column outside an aggregate must be a grouping column, even when each code has only one campaign" }
    - { vi: "Để sắp xếp theo chương trình", en: "To sort by campaign" }
    - { vi: "Không cần, bỏ ra vẫn chạy", en: "It is not needed; the query runs without it" }
  answer: 0
  why: { vi: "Cơ sở dữ liệu không đoán rằng một mã chỉ có một chương trình; ghi cả hai cột vào phần gom nhóm là xong.", en: "The database does not assume a code has only one campaign; listing both columns in the grouping settles it." }
wrong:
  - sql: "SELECT v.code, v.campaign, count(*) FROM vouchers v JOIN orders o ON o.voucher_id = v.id WHERE o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY v.code, v.campaign ORDER BY 3 DESC, v.code"
    vi: "Bạn đang đếm cả đơn đã hủy. Đề chỉ đếm đơn không bị hủy."
    en: "You are also counting cancelled orders. The request only counts orders that were not cancelled."
---
Phòng kế toán phải báo cáo tiền giảm giá theo từng chương trình. Trước hết mình cần biết mỗi mã giảm giá đã thật sự được dùng ở bao nhiêu đơn.

## Task
Các đơn đặt từ tháng {{first}} đến hết tháng {{last}}: mỗi mã giảm giá đã được dùng ở bao nhiêu đơn không bị hủy? Gửi mã, tên chương trình và số đơn. Nhiều đơn nhất lên đầu; bằng nhau thì mã xếp theo thứ tự chữ cái.

## Hints
1. Đơn hàng ghi mã giảm giá đã dùng (nếu có). Ghép danh mục mã giảm giá với đơn, bỏ đơn đã hủy, rồi đếm theo từng mã.
2. Ghép `o.voucher_id = v.id`, lọc `o.status <> 'cancelled'`, gom nhóm theo `v.code, v.campaign`, xếp `ORDER BY 3 DESC, v.code`.
3. `SELECT v.code, v.campaign, count(*) FROM vouchers v JOIN orders o ON ... WHERE ... GROUP BY v.code, v.campaign ORDER BY 3 DESC, v.code`

## Solution
```sql
SELECT v.code, v.campaign, count(*)
FROM vouchers v
JOIN orders o ON o.voucher_id = v.id
WHERE o.status <> 'cancelled' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
GROUP BY v.code, v.campaign
ORDER BY 3 DESC, v.code
```

# EN
Accounting has to report discount money campaign by campaign. First I need to know how many orders really used each discount code.

## Task
Orders placed from {{first_en}} to the end of {{last_en}}: how many that were not cancelled used each discount code? Send the code, the campaign name and the number of orders. Most orders first; on equal numbers, codes in alphabetical order.

## Hints
1. An order records the discount code it used (if any). Join the discount code list with the orders, drop cancelled orders, then count per code.
2. Join on `o.voucher_id = v.id`, filter `o.status <> 'cancelled'`, group by `v.code, v.campaign`, sort with `ORDER BY 3 DESC, v.code`.
3. `SELECT v.code, v.campaign, count(*) FROM vouchers v JOIN orders o ON ... WHERE ... GROUP BY v.code, v.campaign ORDER BY 3 DESC, v.code`
