---
id: fin-ch7-01
chapter: 7
title: Điểm tín dụng có báo trước nợ xấu không?
title_en: Does the credit score warn of bad debt?
from: { name: Huỳnh Kim Ngân, dept: Risk }
difficulty: 4
beat: teach
format: worked
requires: [select, where, cte, case_when, conditional_agg, multi_join, aggregate, group_by, order_by]
grants: []
tables: [loans, applications, loan_snapshots]
ordered: true
columns:
  - { vi: "Nhóm điểm", en: "Score band" }
  - { vi: "Số khoản vay", en: "Loans" }
  - { vi: "Số khoản từng quá hạn trên 30 ngày", en: "Loans ever over 30 days past due" }
  - { vi: "Tỷ lệ (%)", en: "Share (%)" }
variants:
  - { from: "2026-01-01", to: "2026-07-01", first: "01/2026", last: "06/2026", first_en: "January 2026", last_en: "June 2026" }
  - { from: "2025-10-01", to: "2026-01-01", first: "10/2025", last: "12/2025", first_en: "October 2025", last_en: "December 2025" }
  - { from: "2026-03-01", to: "2026-06-01", first: "03/2026", last: "05/2026", first_en: "March 2026", last_en: "May 2026" }
reflect:
  q: { vi: "Vì sao phải đưa mỗi khoản vay về một dòng trước khi đếm?", en: "Why bring each loan down to one row before counting?" }
  options:
    - { vi: "Mỗi khoản có nhiều ảnh chụp cuối tháng; đếm thẳng trên ảnh chụp sẽ đếm một khoản nhiều lần", en: "Each loan has many month-end pictures; counting the pictures directly counts one loan many times" }
    - { vi: "Để truy vấn chạy nhanh hơn", en: "To make the query run faster" }
    - { vi: "Vì đếm có điều kiện chỉ chạy trên một bảng", en: "Because a conditional count only works on one table" }
  answer: 0
  why: { vi: "Câu hỏi là về khoản vay, nên một dòng phải là một khoản vay. Hỏi \"một dòng là cái gì?\" trước khi đếm.", en: "The question is about loans, so one row must be one loan. Ask \"what is one row?\" before counting." }
wrong:
  - sql: "SELECT CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band, count(*), count(*) FILTER (WHERE s.dpd > 30), round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2) FROM loans l JOIN applications a ON a.id = l.application_id JOIN loan_snapshots s ON s.loan_id = l.id WHERE l.disbursed_on >= '{{from}}' AND l.disbursed_on < '{{to}}' GROUP BY 1 ORDER BY 1"
    vi: "Bạn đang đếm ảnh chụp cuối tháng, không đếm khoản vay: một khoản có nhiều ảnh nên bị đếm nhiều lần. Đưa mỗi khoản về một dòng trước, với số ngày quá hạn tệ nhất của nó."
    en: "You are counting month-end pictures, not loans: one loan has many pictures, so it is counted many times. Bring each loan down to one row first, with its worst days past due."
---
Hội đồng tín dụng đang soạn luật duyệt vay cho năm 2027 và hỏi: điểm tín dụng lúc nộp hồ sơ có thật sự báo trước nợ xấu không? Chương này không có kỹ năng mới. Cái mới là cách điều tra: đưa mỗi khoản vay về một dòng, rồi mới đếm. Mình gửi kèm một ví dụ mẫu.

## Task
Các khoản giải ngân từ tháng {{first}} đến hết tháng {{last}}, có ít nhất một ảnh chụp cuối tháng. Chia theo điểm tín dụng lúc nộp hồ sơ: nhóm 1 dưới 600 điểm, nhóm 2 từ 600 đến dưới 700, nhóm 3 từ 700 trở lên. Mỗi nhóm: số khoản vay, số khoản từng quá hạn trên 30 ngày ở ít nhất một ảnh chụp cuối tháng, và tỷ lệ phần trăm của số đó trên số khoản vay (làm tròn 2 chữ số thập phân). Xếp theo nhóm.

## Example
```sql
WITH k AS (
  SELECT l.id, p.kind, max(s.dpd) AS worst                       -- ①
  FROM loans l
  JOIN products p ON p.id = l.product_id
  JOIN loan_snapshots s ON s.loan_id = l.id
  WHERE l.disbursed_on >= '2025-11-01' AND l.disbursed_on < '2025-12-01'
  GROUP BY l.id, p.kind
)
SELECT kind, count(*) AS loans,
       count(*) FILTER (WHERE worst > 0) AS ever_late,             -- ②
       round(100.0 * count(*) FILTER (WHERE worst > 0) / count(*), 2) -- ③
FROM k
GROUP BY kind
ORDER BY kind
```
Ví dụ: các khoản giải ngân tháng 11/2025, theo loại sản phẩm (tiền mặt, trả góp): bao nhiêu khoản từng trễ hạn dù chỉ một ngày.

① Bước có tên đưa mỗi khoản vay về một dòng: ảnh chụp tệ nhất của khoản đó.

② Đếm có điều kiện trên dòng của khoản vay, nên mỗi khoản chỉ được đếm một lần.

③ Tỷ lệ tính từ chính hai số đếm đó; nhân 100.0 để giữ phần thập phân.

## Hints
1. Bước có tên đưa mỗi khoản vay về một dòng: nhóm điểm và số ngày quá hạn tệ nhất qua mọi ảnh chụp. Sau đó gom theo nhóm như ví dụ mẫu.
2. `CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band`, `max(s.dpd) AS worst`, `GROUP BY l.id, a.score`. Rồi `count(*) FILTER (WHERE worst > 30)`.
3. `WITH k AS (SELECT l.id, CASE ... END AS band, max(s.dpd) AS worst FROM loans l JOIN applications a ... JOIN loan_snapshots s ... WHERE ... GROUP BY l.id, a.score) SELECT band, count(*), count(*) FILTER (...), round(100.0 * ... / count(*), 2) FROM k GROUP BY band ORDER BY band`

## Solution
```sql
WITH k AS (
  SELECT l.id,
         CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band,
         max(s.dpd) AS worst
  FROM loans l
  JOIN applications a ON a.id = l.application_id
  JOIN loan_snapshots s ON s.loan_id = l.id
  WHERE l.disbursed_on >= '{{from}}' AND l.disbursed_on < '{{to}}'
  GROUP BY l.id, a.score
)
SELECT band, count(*), count(*) FILTER (WHERE worst > 30),
       round(100.0 * count(*) FILTER (WHERE worst > 30) / count(*), 2)
FROM k
GROUP BY band
ORDER BY band
```

# EN
The credit committee is writing the approval rules for 2027 and asks: does the credit score at application time really warn of bad debt? This chapter has no new skill. What is new is how to investigate: bring each loan down to one row, and only then count. I am sending a worked example.

## Task
The loans paid out from {{first_en}} to the end of {{last_en}} that have at least one month-end picture. Split them by the credit score at application time: band 1 under 600 points, band 2 from 600 to under 700, band 3 from 700 up. For each band: the number of loans, the number that were over 30 days past due in at least one month-end picture, and that number as a percentage of the loans (rounded to 2 decimals). Sort by band.

## Example
Example: the loans paid out in November 2025, by product kind (cash, instalment): how many were ever late, even by one day.

① A named step brings each loan down to one row: that loan's worst picture.

② The conditional count runs on the loans' rows, so each loan is counted once.

③ The share comes from those same two counts; multiplying by 100.0 keeps the decimals.

## Hints
1. A named step brings each loan down to one row: its score band and its worst days past due over every picture. Then group by band, like the worked example.
2. `CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band`, `max(s.dpd) AS worst`, `GROUP BY l.id, a.score`. Then `count(*) FILTER (WHERE worst > 30)`.
3. `WITH k AS (SELECT l.id, CASE ... END AS band, max(s.dpd) AS worst FROM loans l JOIN applications a ... JOIN loan_snapshots s ... WHERE ... GROUP BY l.id, a.score) SELECT band, count(*), count(*) FILTER (...), round(100.0 * ... / count(*), 2) FROM k GROUP BY band ORDER BY band`
