---
id: ecom-ch1-04
chapter: 1
title: Đánh giá một sao tháng {{month}}
title_en: One-star reviews in {{month_en}}
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 1
beat: rest
requires: [select, where]
grants: []
tables: [reviews]
columns:
  - { vi: "Mã đơn", en: "Order number" }
  - { vi: "Mã sản phẩm", en: "Product number" }
  - { vi: "Ngày đánh giá", en: "Review date" }
  - { vi: "Lời nhận xét (có thể trống)", en: "Comment (may be empty)" }
variants:
  - { from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026", next: "01/11", last: "31/10", next_en: "1 November", last_en: "31 October" }
  - { from: "2026-09-01", to: "2026-10-01", month: "9/2026", month_en: "September 2026", next: "01/10", last: "30/09", next_en: "1 October", last_en: "30 September" }
  - { from: "2026-08-01", to: "2026-09-01", month: "8/2026", month_en: "August 2026", next: "01/09", last: "31/08", next_en: "1 September", last_en: "31 August" }
reflect:
  q: { vi: "Vì sao lọc tháng bằng điều kiện trước ngày {{next}} thay vì đến hết ngày {{last}}?", en: "Why filter the month with before {{next_en}} instead of up to {{last_en}}?" }
  options:
    - { vi: "Viết nửa mở như vậy thì không phải nhớ tháng có 30 hay 31 ngày, và vẫn đúng nếu cột có cả giờ", en: "Written half-open, you never need to remember whether a month has 30 or 31 days, and it stays right if the column holds a time too" }
    - { vi: "Ngày {{last}} không có đánh giá nào", en: "There are no reviews on {{last_en}}" }
    - { vi: "Cơ sở dữ liệu không so được với ngày 31", en: "The database cannot compare with day 31" }
  answer: 0
  why: { vi: "Từ ngày đầu tháng, và trước ngày đầu tháng sau: cách viết này dùng được cho mọi tháng và mọi kiểu cột ngày giờ.", en: "From the first day of the month, and before the first day of the next: this works for every month and every kind of date or time column." }
wrong:
  - sql: "SELECT order_id, product_id, created_on, comment FROM reviews WHERE rating <= 2 AND created_on >= '{{from}}' AND created_on < '{{to}}'"
    vi: "Danh sách có cả đánh giá 2 sao. Đề chỉ cần đánh giá 1 sao."
    en: "Your list also has 2-star reviews. The request is only for 1-star reviews."
---
Mỗi đầu tháng nhóm chăm sóc khách hàng gọi lại cho những khách chấm 1 sao để hỏi chuyện gì đã xảy ra. Tháng {{month}} vừa xong, mình cần danh sách để chia việc cho cả nhóm.

## Task
Các đánh giá 1 sao khách viết trong tháng {{month}}: mã đơn, mã sản phẩm, ngày đánh giá và lời nhận xét (nhiều khách chỉ chấm sao, không viết gì, thì để trống). Thứ tự dòng không quan trọng.

## Hints
1. Mọi thông tin nằm trong danh mục đánh giá. Lọc theo số sao và theo khoảng ngày của tháng {{month}}.
2. Số sao là cột `rating`, ngày đánh giá là `created_on`, lời nhận xét là `comment`. Khoảng ngày viết `created_on >= '{{from}}' AND created_on < '{{to}}'`.
3. `SELECT order_id, product_id, created_on, comment FROM reviews WHERE rating = 1 AND ...`

## Solution
```sql
SELECT order_id, product_id, created_on, comment
FROM reviews
WHERE rating = 1 AND created_on >= '{{from}}' AND created_on < '{{to}}'
```

# EN
At the start of every month the customer care team calls back the customers who gave 1 star, to ask what went wrong. {{month_en}} has just ended, and I need the list to split the calls across the team.

## Task
The 1-star reviews customers wrote in {{month_en}}: order number, product number, review date and the comment (many customers only give stars and write nothing; leave those empty). Row order does not matter.

## Hints
1. Everything is in the review list. Filter by the number of stars and by the date range of {{month_en}}.
2. Stars are column `rating`, the review date is `created_on`, the comment is `comment`. The date range is `created_on >= '{{from}}' AND created_on < '{{to}}'`.
3. `SELECT order_id, product_id, created_on, comment FROM reviews WHERE rating = 1 AND ...`
