---
id: fin-ch1-04
chapter: 1
title: Khách mới của chi nhánh Hue
title_en: New customers of the Hue branch
from: { name: Tôn Nữ Hạnh, dept: CS }
difficulty: 1
beat: rest
requires: [select, where, order_by]
grants: []
tables: [customers]
ordered: true
columns:
  - { vi: "Họ tên khách", en: "Customer name" }
  - { vi: "Ngày tham gia", en: "Date joined" }
reflect:
  q: { vi: "\"Từ ngày 03/09/2026\" có tính khách tham gia đúng ngày 03/09 không?", en: "Does \"from 3 September 2026\" include customers who joined on 3 September itself?" }
  options:
    - { vi: "Có: \"từ ngày\" gồm cả ngày đó, nên dùng lớn hơn hoặc bằng", en: "Yes: \"from\" includes that day, so use greater than or equal" }
    - { vi: "Không: chỉ tính từ ngày hôm sau", en: "No: counting starts the day after" }
    - { vi: "Tùy cách sắp xếp", en: "It depends on the sort order" }
  answer: 0
  why: { vi: "Mốc \"từ\" là mốc đóng. Dùng lớn hơn thì mất đúng những khách tham gia ngày đầu tiên.", en: "\"From\" is an inclusive bound. Using strictly greater drops exactly the customers who joined on the first day." }
wrong:
  - sql: "SELECT full_name, joined_on FROM customers WHERE home_branch_id = 5 AND joined_on > '2026-09-03' ORDER BY joined_on, id"
    vi: "Thiếu khách tham gia đúng ngày 03/09/2026: \"từ ngày\" gồm cả ngày đó, nên cần lớn hơn hoặc bằng."
    en: "Customers who joined on 3 September 2026 itself are missing: \"from\" includes that day, so you need greater than or equal."
---
Đội chăm sóc khách hàng ở Hue muốn gọi chào mừng các khách mới, bắt đầu từ đợt khai trương góc tư vấn hôm 03/09. Bạn gửi mình danh sách theo thứ tự tham gia để các bạn ấy gọi lần lượt nhé.

## Task
Khách có chi nhánh nhà là Hue (mã chi nhánh 5) tham gia từ ngày 03/09/2026 trở đi: họ tên và ngày tham gia. Sớm nhất lên đầu; cùng ngày thì khách có mã khách nhỏ hơn lên trước.

## Hints
1. Lọc khách theo chi nhánh nhà và ngày tham gia, rồi sắp theo ngày; thứ tự phụ là mã khách.
2. Bảng `customers`: `home_branch_id = 5`, `joined_on >= '2026-09-03'`, sắp bằng `ORDER BY joined_on, id`.
3. `SELECT full_name, joined_on FROM customers WHERE ... ORDER BY joined_on, id`

## Solution
```sql
SELECT full_name, joined_on
FROM customers
WHERE home_branch_id = 5 AND joined_on >= '2026-09-03'
ORDER BY joined_on, id
```

# EN
The customer care team in Hue wants to make welcome calls to new customers, starting from the opening of the advice corner on 3 September. Please send me the list in joining order so the team can call them one by one.

## Task
Customers whose home branch is Hue (branch number 5) who joined on or after 3 September 2026: full name and date joined. Earliest first; on the same day, the customer with the smaller customer number first.

## Hints
1. Filter customers by home branch and joining date, then sort by date; the tie-breaker is the customer number.
2. Table `customers`: `home_branch_id = 5`, `joined_on >= '2026-09-03'`, sorted with `ORDER BY joined_on, id`.
3. `SELECT full_name, joined_on FROM customers WHERE ... ORDER BY joined_on, id`
