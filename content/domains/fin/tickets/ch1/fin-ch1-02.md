---
id: fin-ch1-02
chapter: 1
title: Mười khoản vay lớn nhất của một sản phẩm
title_en: The ten largest loans of one product
from: { name: Phùng Đức Lâm, dept: Sales }
difficulty: 1
beat: develop
format: faded
requires: [select, where]
grants: [order_by, limit]
tables: [loans]
ordered: true
columns:
  - { vi: "Mã khoản vay", en: "Loan code" }
  - { vi: "Ngày giải ngân", en: "Disbursement date" }
  - { vi: "Tiền gốc", en: "Principal" }
starter: |
  SELECT code, disbursed_on, principal
  FROM loans
  WHERE product_id = {{pid}} AND disbursed_on >= '2026-07-01' AND disbursed_on < '2026-10-01'
  ORDER BY ___
  LIMIT ___
variants:
  - { pid: "3", product: "Motorbike Instalment" }
  - { pid: "2", product: "Phone Instalment" }
  - { pid: "4", product: "Appliance Instalment" }
reflect:
  q: { vi: "Vì sao đề phải nói \"bằng nhau thì xếp theo mã\"?", en: "Why does the request have to say \"on a tie, sort by code\"?" }
  options:
    - { vi: "Nhiều khoản có cùng tiền gốc; không có thứ tự phụ thì các khoản bằng nhau có thể ra theo thứ tự bất kỳ, và mười dòng đầu đổi theo lần chạy", en: "Many loans share the same principal; without a tie-breaker, equal loans can come out in any order, and the first ten rows can change from run to run" }
    - { vi: "Để truy vấn chạy nhanh hơn", en: "To make the query run faster" }
    - { vi: "Vì sắp xếp chỉ dùng được với chữ", en: "Because sorting only works on text" }
  answer: 0
  why: { vi: "Tiền gốc thường là số tròn, nên trùng nhau nhiều. Thứ tự phụ làm danh sách top N luôn ra giống nhau.", en: "Principals are usually round figures, so ties are common. A tie-breaker makes the top N list come out the same every time." }
wrong:
  - sql: "SELECT code, disbursed_on, principal FROM loans WHERE product_id = {{pid}} AND disbursed_on >= '2026-07-01' AND disbursed_on < '2026-10-01' ORDER BY principal DESC, code DESC LIMIT 10"
    vi: "Các khoản cùng tiền gốc đang xếp theo mã ngược chữ cái. Đề cần mã theo thứ tự chữ cái (tăng dần) khi bằng nhau."
    en: "Loans with the same principal are sorted by code in reverse. The request wants the code in alphabetical (ascending) order on a tie."
---
Mình đang chuẩn bị buổi họp với các đại lý về sản phẩm {{product}}. Mình muốn xem những khoản lớn nhất của sản phẩm này trong quý vừa rồi.

Câu truy vấn trong editor đã viết gần xong. Chỗ trống đầu là cách sắp xếp, chỗ thứ hai là số dòng cần lấy.

## Task
Mười khoản vay lớn nhất của sản phẩm {{product}} (mã sản phẩm {{pid}}) giải ngân từ tháng 7 đến hết tháng 9/2026: mã khoản vay, ngày giải ngân, tiền gốc. Tiền gốc lớn nhất lên đầu; bằng nhau thì xếp theo mã khoản vay theo thứ tự chữ cái.

## Hints
1. Đây là bài xếp hạng rồi lấy N dòng đầu: sắp theo tiền gốc giảm dần, thêm thứ tự phụ cho các khoản bằng nhau, rồi giới hạn số dòng.
2. Chỗ trống đầu: `principal DESC, code` (thứ tự phụ tăng dần là mặc định). Chỗ trống thứ hai: `10`.
3. `SELECT code, disbursed_on, principal FROM loans WHERE ... ORDER BY principal DESC, code LIMIT 10`

## Solution
```sql
SELECT code, disbursed_on, principal
FROM loans
WHERE product_id = {{pid}} AND disbursed_on >= '2026-07-01' AND disbursed_on < '2026-10-01'
ORDER BY principal DESC, code
LIMIT 10
```

# EN
I am preparing a meeting with our dealers about the {{product}} product. I want to see the largest loans of that product over the last quarter.

The query in the editor is almost done. The first blank is how to sort, the second is how many rows to take.

## Task
The ten largest loans of the {{product}} product (product number {{pid}}) paid out from July to the end of September 2026: loan code, disbursement date, principal. Largest principal first; on a tie, by loan code in alphabetical order.

## Hints
1. This is a rank-then-take-N task: sort by principal from largest, add a tie-breaker for equal loans, then limit the number of rows.
2. First blank: `principal DESC, code` (ascending is the default for the tie-breaker). Second blank: `10`.
3. `SELECT code, disbursed_on, principal FROM loans WHERE ... ORDER BY principal DESC, code LIMIT 10`
