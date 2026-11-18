---
id: fin-ch3-01
chapter: 3
title: Nhóm nợ của một chi nhánh
title_en: One branch's delinquency buckets
from: { name: Huỳnh Kim Ngân, dept: Risk }
difficulty: 2
beat: teach
format: worked
requires: [select, where, order_by, join]
grants: [case_when]
tables: [loan_snapshots, loans]
ordered: true
columns:
  - { vi: "Mã khoản vay", en: "Loan code" }
  - { vi: "Số ngày quá hạn", en: "Days past due" }
  - { vi: "Nhóm nợ (0 đến 3)", en: "Bucket (0 to 3)" }
variants:
  - { me: "2026-07-31", id: "7", month: "7/2026", month_en: "July 2026", branch: "Quang Ngai" }
  - { me: "2026-06-30", id: "8", month: "6/2026", month_en: "June 2026", branch: "Quy Nhon" }
  - { me: "2026-03-31", id: "3", month: "3/2026", month_en: "March 2026", branch: "Hoi An" }
reflect:
  q: { vi: "Một khoản quá hạn đúng 30 ngày rơi vào nhóm nào, và vì sao?", en: "Which bucket does a loan exactly 30 days past due fall into, and why?" }
  options:
    - { vi: "Nhóm 1: các điều kiện được xét từ trên xuống, và \"từ 1 đến 30 ngày\" gồm cả ngày thứ 30", en: "Bucket 1: the conditions are checked top to bottom, and \"1 to 30 days\" includes day 30" }
    - { vi: "Nhóm 2: đủ 30 ngày là sang nhóm mới", en: "Bucket 2: a full 30 days moves it to the next bucket" }
    - { vi: "Không nhóm nào, vì 30 nằm đúng ranh giới", en: "No bucket, because 30 sits right on the boundary" }
  answer: 0
  why: { vi: "Điều kiện đầu tiên đúng sẽ quyết định nhóm. Ranh giới viết bằng nhỏ hơn hoặc bằng thì ngày thứ 30 vẫn ở nhóm 1.", en: "The first condition that holds decides the bucket. With less than or equal on the boundary, day 30 stays in bucket 1." }
wrong:
  - sql: "SELECT l.code, s.dpd, CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd < 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id WHERE s.month_end = '{{me}}' AND l.branch_id = {{id}} ORDER BY s.dpd DESC, l.code"
    vi: "Khoản quá hạn đúng 30 ngày đang rơi vào nhóm 2. Nhóm 1 là từ 1 đến 30 ngày, gồm cả ngày thứ 30: dùng nhỏ hơn hoặc bằng."
    en: "A loan exactly 30 days past due lands in bucket 2. Bucket 1 is 1 to 30 days, day 30 included: use less than or equal."
---
Chào bạn, mình là Ngân, giám đốc Quản trị rủi ro. Từ tuần này bạn làm với ảnh chụp sổ vay cuối tháng: mỗi khoản còn dư nợ có một dòng, ghi dư nợ còn lại và số ngày quá hạn. Trước khi báo cáo, mình chia khoản vay vào bốn nhóm nợ. Mình gửi kèm một ví dụ mẫu về cách chia nhóm.

## Task
Ảnh chụp cuối tháng {{month}}, các khoản vay của chi nhánh {{branch}} (mã chi nhánh {{id}}): mã khoản vay, số ngày quá hạn và nhóm nợ. Nhóm nợ là một số: 0 khi không quá hạn, 1 khi quá hạn từ 1 đến 30 ngày, 2 khi từ 31 đến 90 ngày, 3 khi trên 90 ngày. Quá hạn lâu nhất lên đầu; bằng nhau thì theo mã khoản vay theo thứ tự chữ cái.

## Example
```sql
SELECT id, score,
       CASE WHEN score < 600 THEN 'low'      -- ①
            WHEN score < 650 THEN 'medium'   -- ②
            ELSE 'high'                      -- ③
       END AS band                           -- ④
FROM applications
WHERE applied_on = '2026-10-28'
```
Ví dụ: các hồ sơ nộp ngày 28/10/2026, xếp vào dải điểm thấp, vừa, cao.

① Mỗi nhánh là một điều kiện và giá trị trả về khi điều kiện đúng.

② Các nhánh được xét từ trên xuống; nhánh đầu tiên đúng thắng. Tới đây điểm chắc chắn từ 600 trở lên, nên chỉ cần viết cận trên.

③ Không nhánh nào đúng thì lấy giá trị sau `ELSE`.

④ `END` đóng biểu thức; đặt tên cho cột mới bằng `AS`.

## Hints
1. Đây là bài chia nhóm theo luật, như ví dụ mẫu: một biểu thức nhiều nhánh xét số ngày quá hạn từ nhỏ đến lớn. Mã khoản vay nằm ở sổ vay, nên ghép ảnh chụp với sổ vay.
2. Ảnh chụp `loan_snapshots s` (cột `month_end`, `dpd`) ghép `loans l` qua `l.id = s.loan_id`. Nhóm nợ: `CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd <= 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END`.
3. `SELECT l.code, s.dpd, CASE ... END FROM loan_snapshots s JOIN loans l ON ... WHERE s.month_end = '{{me}}' AND l.branch_id = {{id}} ORDER BY s.dpd DESC, l.code`

## Solution
```sql
SELECT l.code, s.dpd, CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd <= 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
WHERE s.month_end = '{{me}}' AND l.branch_id = {{id}}
ORDER BY s.dpd DESC, l.code
```

# EN
Hello, I am Ngan, head of credit risk. From this week you work with the month-end picture of the loan book: every loan with a balance left has one row, holding that balance and the days past due. Before reporting, we sort loans into four delinquency buckets. I am sending a worked example on how to sort rows into groups.

## Task
The month-end picture of {{month_en}}, the loans of the {{branch}} branch (branch number {{id}}): loan code, days past due and bucket. The bucket is a number: 0 when not past due, 1 when 1 to 30 days past due, 2 for 31 to 90 days, 3 for more than 90 days. Longest past due first; on a tie, by loan code in alphabetical order.

## Example
Example: the applications made on 28 October 2026, placed in a low, medium or high score band.

① Each branch is a condition and the value returned when it holds.

② Branches are checked top to bottom; the first one that holds wins. By now the score is surely 600 or more, so only the upper bound is needed.

③ When no branch holds, the value after `ELSE` is used.

④ `END` closes the expression; name the new column with `AS`.

## Hints
1. This is a sort-into-groups-by-rules task, like the worked example: one expression with several branches checking the days past due from small to large. The loan code lives in the loan book, so join the snapshot with the loan book.
2. Snapshot `loan_snapshots s` (columns `month_end`, `dpd`) joins `loans l` through `l.id = s.loan_id`. The bucket: `CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd <= 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END`.
3. `SELECT l.code, s.dpd, CASE ... END FROM loan_snapshots s JOIN loans l ON ... WHERE s.month_end = '{{me}}' AND l.branch_id = {{id}} ORDER BY s.dpd DESC, l.code`
