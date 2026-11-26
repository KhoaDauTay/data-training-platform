---
id: ecom-ch4-01
chapter: 4
title: Kiện Kite Logistics giao trễ
title_en: Late Kite Logistics parcels
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 2
beat: teach
format: worked
requires: [join, order_by]
grants: [date_math]
tables: [deliveries, orders]
ordered: true
columns:
  - { vi: "Mã đơn", en: "Order code" }
  - { vi: "Thành phố nhận", en: "Delivery city" }
  - { vi: "Ngày hẹn giao", en: "Promised date" }
  - { vi: "Ngày giao thực tế", en: "Actual delivery date" }
  - { vi: "Số ngày trễ", en: "Days late" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "9/2026", month_en: "September 2026", from: "2026-09-01", to: "2026-10-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
reflect:
  q: { vi: "Lấy ngày giao thực tế trừ ngày hẹn giao thì được gì?", en: "What do you get when you subtract the promised date from the actual delivery date?" }
  options:
    - { vi: "Số ngày giữa hai mốc, là một số nguyên (âm nếu giao sớm)", en: "The number of days between them, an integer (negative when early)" }
    - { vi: "Một ngày mới", en: "A new date" }
    - { vi: "Một khoảng thời gian tính bằng giờ", en: "A time span in hours" }
  answer: 0
  why: { vi: "Ngày trừ ngày ra số ngày; ngày cộng một số nguyên ra một ngày mới, như ngày kiểm lại trong ví dụ mẫu.", en: "A date minus a date is a number of days; a date plus an integer is a new date, like the check date in the worked example." }
wrong:
  - sql: "SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on FROM deliveries d JOIN orders o ON o.id = d.order_id WHERE d.courier = 'Kite Logistics' AND d.shipped_on >= '{{from}}' AND d.shipped_on < '{{to}}' AND d.delivered_on - d.promised_on >= 2 ORDER BY 5 DESC, o.code"
    vi: "Danh sách có cả kiện trễ đúng 2 ngày. Đề chỉ cần kiện trễ hơn 2 ngày."
    en: "Your list also has parcels exactly 2 days late. The request is only for parcels more than 2 days late."
---
Khách ở miền Trung than phiền đơn giao chậm. Trước khi gặp Kite Logistics, mình cần danh sách kiện họ giao trễ nhiều, kèm số ngày trễ cụ thể để đối chiếu.

Đây là việc đầu tiên của bạn với ngày tháng, nên mình gửi kèm một ví dụ mẫu.

## Task
Những kiện do Kite Logistics chở, gửi đi trong tháng {{month}}, mà giao trễ hơn 2 ngày so với ngày hẹn: mã đơn, thành phố nhận, ngày hẹn giao, ngày giao thực tế và số ngày trễ. Trễ nhiều nhất lên đầu; bằng nhau thì xếp theo mã đơn theo thứ tự chữ cái.

## Example
```sql
SELECT order_id, shipped_on, promised_on,
       promised_on - shipped_on AS days_promised,   -- ①
       promised_on + 7 AS check_on                  -- ②
FROM deliveries
WHERE shipped_on >= '2026-06-01' AND shipped_on < '2026-06-08'   -- ③
  AND promised_on - shipped_on >= 3                              -- ④
ORDER BY order_id
```
Ví dụ: tuần 1–7/6/2026, kiện nào được hẹn giao từ 3 ngày trở lên sau ngày gửi, và nếu khách khiếu nại thì hạn kiểm lại (7 ngày sau ngày hẹn) là ngày nào?

① Ngày trừ ngày ra số ngày: số ngày hẹn giao tính từ ngày gửi.

② Ngày cộng một số nguyên ra một ngày mới: hạn kiểm lại.

③ Khoảng ngày viết dạng nửa mở: từ ngày đầu, và trước ngày ngay sau ngày cuối.

④ Điều kiện đặt thẳng lên phép trừ.

## Hints
1. Thông tin giao hàng nằm ở danh mục giao hàng, mã đơn nằm ở đơn hàng. Số ngày trễ là ngày giao thực tế trừ ngày hẹn, như ví dụ mẫu.
2. Bảng `deliveries` (cột `courier`, `shipped_on`, `promised_on`, `delivered_on`) nối `orders` qua `o.id = d.order_id`. Trễ hơn 2 ngày là `d.delivered_on - d.promised_on > 2`; sắp xếp `ORDER BY 5 DESC, o.code`.
3. `SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on FROM deliveries d JOIN orders o ON ... WHERE ... ORDER BY 5 DESC, o.code`

## Solution
```sql
SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on
FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE d.courier = 'Kite Logistics' AND d.shipped_on >= '{{from}}' AND d.shipped_on < '{{to}}'
  AND d.delivered_on - d.promised_on > 2
ORDER BY 5 DESC, o.code
```

# EN
Customers in central Vietnam complain that deliveries are slow. Before I meet Kite Logistics, I need the list of parcels they delivered very late, with the exact number of days late to check against.

This is your first task with dates, so I am sending a worked example along.

## Task
The parcels carried by Kite Logistics, shipped in {{month_en}}, that arrived more than 2 days after the promised date: order code, delivery city, promised date, actual delivery date and days late. Most days late first; on equal days, by order code in alphabetical order.

## Example
Example: in the week of 1 to 7 June 2026, which parcels were promised 3 or more days after shipping, and if the customer complains, when is the check date (7 days after the promised date)?

① A date minus a date gives a number of days: how many days after shipping the delivery was promised.

② A date plus an integer gives a new date: the check date.

③ Date ranges are written half-open: from the first day, and before the day after the last one.

④ The condition works on the subtraction itself.

## Hints
1. Delivery details are in the delivery list; the order code is in the orders. Days late is the actual delivery date minus the promised date, like the worked example.
2. Table `deliveries` (columns `courier`, `shipped_on`, `promised_on`, `delivered_on`) joins `orders` through `o.id = d.order_id`. More than 2 days late is `d.delivered_on - d.promised_on > 2`; sort with `ORDER BY 5 DESC, o.code`.
3. `SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on FROM deliveries d JOIN orders o ON ... WHERE ... ORDER BY 5 DESC, o.code`
