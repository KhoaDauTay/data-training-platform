---
id: ecom-ch2-01
chapter: 2
title: Tiền đã thu trong tháng
title_en: Money collected in the month
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 2
beat: teach
format: worked
requires: [select, where]
grants: [aggregate]
tables: [payments]
columns:
  - { vi: "Số khoản đã thu", en: "Payments collected" }
  - { vi: "Tổng tiền thu (đồng)", en: "Total collected (VND)" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "9/2026", month_en: "September 2026", from: "2026-09-01", to: "2026-10-01" }
  - { month: "6/2026", month_en: "June 2026", from: "2026-06-01", to: "2026-07-01" }
reflect:
  q: { vi: "Một câu có hàm gộp mà không gom nhóm thì trả bao nhiêu dòng?", en: "How many rows does a query with aggregate functions and no grouping return?" }
  options:
    - { vi: "Đúng một dòng, gộp mọi dòng thỏa điều kiện lọc", en: "Exactly one row, summarising every row that passed the filter" }
    - { vi: "Mỗi khoản thanh toán một dòng", en: "One row per payment" }
    - { vi: "Hai dòng, mỗi hàm một dòng", en: "Two rows, one per function" }
  answer: 0
  why: { vi: "Hàm gộp biến nhiều dòng thành một con số. Không gom nhóm thì cả tập dòng sau khi lọc là một nhóm.", en: "An aggregate turns many rows into one figure. Without grouping, the whole filtered set is one group." }
wrong:
  - sql: "SELECT count(*), sum(amount) FROM payments WHERE paid_at >= '{{from}}' AND paid_at < '{{to}}'"
    vi: "Bạn đang tính cả khoản đã hoàn tiền cho khách. Đề chỉ cần khoản đã thu thành công."
    en: "You are also counting payments that were refunded to the customer. The request is only for payments collected successfully."
---
Cuối tháng nào phòng kế toán cũng đối chiếu số tiền sàn đã thu với sao kê ngân hàng và ví điện tử. Mình cần hai con số: thu được bao nhiêu khoản, và tổng tiền là bao nhiêu.

Đây là lần đầu bạn tính tổng trên nhiều dòng, nên mình gửi kèm một ví dụ mẫu.

## Task
Trong tháng {{month}}, có bao nhiêu khoản thanh toán đã thu thành công, và tổng số tiền thu được là bao nhiêu? Chỉ tính khoản đã thu: khoản bị lỗi hay đã hoàn tiền thì bỏ. Tháng tính theo thời điểm thu tiền.

## Example
```sql
SELECT count(*),             -- ①
       min(price), max(price),
       round(avg(price), 0)  -- ②
FROM products
WHERE is_active = true       -- ③
```
Ví dụ: sàn đang bán bao nhiêu sản phẩm, món rẻ nhất và đắt nhất giá bao nhiêu, giá trung bình là bao nhiêu?

① Hàm đếm đếm số dòng; kết quả chỉ có một dòng cho cả bảng.

② Hàm trung bình thường ra số lẻ; làm tròn tới hàng đơn vị cho dễ đọc.

③ Điều kiện lọc chạy trước, hàm gộp chỉ tính trên những dòng còn lại.

## Hints
1. Đây là bài hàm gộp: biến nhiều khoản thanh toán thành hai con số. Lọc đúng trạng thái và đúng tháng trước, rồi đếm và cộng.
2. Bảng `payments`: trạng thái là cột `status` (đã thu là `'paid'`), thời điểm thu là `paid_at`, số tiền là `amount`. Đếm dùng `count(*)`, cộng dùng `sum(amount)`.
3. `SELECT count(*), sum(amount) FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND ...`

## Solution
```sql
SELECT count(*), sum(amount)
FROM payments
WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
```

# EN
At the end of every month accounting matches the money the marketplace collected against the bank and e-wallet statements. I need two figures: how many payments came in, and the total amount.

This is your first time totalling over many rows, so I am sending a worked example along.

## Task
In {{month_en}}, how many payments were collected successfully, and what is the total amount collected? Only count collected payments: drop failed or refunded ones. The month is the moment the money was collected.

## Example
Example: how many products are on sale, what do the cheapest and the most expensive cost, and what is the average price?

① The count function counts rows; the result has just one row for the whole table.

② The average is usually a fraction; round it to a whole number so it reads easily.

③ The filter runs first; the aggregate functions only see the rows that are left.

## Hints
1. This is an aggregate task: turn many payments into two figures. Filter the right status and the right month first, then count and add up.
2. Table `payments`: the status is column `status` (collected is `'paid'`), the collection time is `paid_at`, the amount is `amount`. Counting uses `count(*)`, adding uses `sum(amount)`.
3. `SELECT count(*), sum(amount) FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND ...`
