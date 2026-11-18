---
id: fin-ch6-03
chapter: 6
title: Khoản quá hạn chưa ai gọi
title_en: Overdue loans nobody called
from: { name: Mạc Văn Toàn, dept: Collections }
difficulty: 3
beat: twist
trap: true
requires: [select, where, join, left_join, order_by]
grants: [anti_join]
tables: [loan_snapshots, loans, collection_calls]
ordered: true
columns:
  - { vi: "Mã khoản vay", en: "Loan code" }
  - { vi: "Mã chi nhánh", en: "Branch number" }
  - { vi: "Số ngày quá hạn", en: "Days past due" }
variants:
  - { me: "2026-10-31", from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026" }
  - { me: "2026-09-30", from: "2026-09-01", to: "2026-10-01", month: "9/2026", month_en: "September 2026" }
  - { me: "2026-08-31", from: "2026-08-01", to: "2026-09-01", month: "8/2026", month_en: "August 2026" }
reflect:
  q: { vi: "Đặt điều kiện \"cuộc gọi trong tháng\" ở phần lọc dòng chung thay vì trong điều kiện ghép thì câu hỏi thành gì?", en: "If the \"call in that month\" condition goes in the shared row filter instead of the join condition, what question does the query answer?" }
  options:
    - { vi: "Khoản quá hạn chưa bao giờ được gọi; khoản được gọi tháng trước mà tháng này chưa gọi bị bỏ sót", en: "Overdue loans never called at all; loans called last month but not this month slip through" }
    - { vi: "Vẫn là câu hỏi cũ, chỉ chạy chậm hơn", en: "The same question, only slower" }
    - { vi: "Khoản đã được gọi trong tháng", en: "Loans called during the month" }
  answer: 0
  why: { vi: "Phần lọc dòng chạy sau khi ghép, nên điều kiện tháng ở đó loại mọi dòng có cuộc gọi tháng khác. Đặt trong điều kiện ghép thì chỉ cuộc gọi trong tháng mới được ghép, và \"không ghép được\" nghĩa là tháng đó chưa ai gọi.", en: "The row filter runs after the join, so a month condition there removes every row with a call from another month. In the join condition only calls of that month are matched, and \"no match\" means nobody called that month." }
wrong:
  - sql: "SELECT l.code, l.branch_id, s.dpd FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id LEFT JOIN collection_calls c ON c.loan_id = l.id AND c.called_on >= '{{from}}' AND c.called_on < '{{to}}' WHERE s.month_end = '{{me}}' AND s.dpd > 30 ORDER BY s.dpd DESC, l.code"
    vi: "Danh sách có cả khoản đã được gọi: ghép trái giữ mọi khoản, nhưng chưa lọc lấy những khoản không ghép được với cuộc gọi nào (phía cuộc gọi để trống)."
    en: "Your list also has loans that were called: the left join keeps every loan, but you did not keep only the loans that matched no call (empty on the call side)."
---
Mình nghi đội gọi bị sót việc trong tháng. Mình cần danh sách khoản quá hạn nặng mà trong tháng chưa có cuộc gọi nhắc nợ nào. Lưu ý: khoản được gọi ở tháng trước nhưng tháng này chưa ai gọi vẫn phải có trong danh sách.

## Task
Các khoản quá hạn trên 30 ngày ở ảnh chụp cuối tháng {{month}} mà cả tháng {{month}} chưa có cuộc gọi nhắc nợ nào: mã khoản vay, mã chi nhánh và số ngày quá hạn. Quá hạn lâu nhất lên đầu; bằng nhau thì theo mã khoản vay theo thứ tự chữ cái.

## Hints
1. Đây là bài tìm thứ không có: ghép trái khoản vay với cuộc gọi trong tháng, rồi giữ những khoản không ghép được. Điều kiện tháng của cuộc gọi phải nằm trong điều kiện ghép, không ở phần lọc dòng chung.
2. `LEFT JOIN collection_calls c ON c.loan_id = l.id AND c.called_on >= '{{from}}' AND c.called_on < '{{to}}'`, rồi lọc `c.id IS NULL` cùng với `s.dpd > 30`.
3. `SELECT l.code, l.branch_id, s.dpd FROM loan_snapshots s JOIN loans l ON ... LEFT JOIN collection_calls c ON ... AND ... WHERE ... AND c.id IS NULL ORDER BY s.dpd DESC, l.code`

## Solution
```sql
SELECT l.code, l.branch_id, s.dpd
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
LEFT JOIN collection_calls c ON c.loan_id = l.id AND c.called_on >= '{{from}}' AND c.called_on < '{{to}}'
WHERE s.month_end = '{{me}}' AND s.dpd > 30 AND c.id IS NULL
ORDER BY s.dpd DESC, l.code
```

# EN
I suspect the call team missed some work this month. I need the list of badly overdue loans that had no collection call at all during the month. Note: a loan called last month but not this month still belongs on the list.

## Task
The loans over 30 days past due in the end-of-{{month_en}} snapshot that had no collection call at all during {{month_en}}: loan code, branch number and days past due. Longest past due first; on a tie, by loan code in alphabetical order.

## Hints
1. This is a find-what-is-missing task: left join the loans with the calls of the month, then keep the loans that found no match. The call-month condition belongs in the join condition, not in the shared row filter.
2. `LEFT JOIN collection_calls c ON c.loan_id = l.id AND c.called_on >= '{{from}}' AND c.called_on < '{{to}}'`, then filter `c.id IS NULL` together with `s.dpd > 30`.
3. `SELECT l.code, l.branch_id, s.dpd FROM loan_snapshots s JOIN loans l ON ... LEFT JOIN collection_calls c ON ... AND ... WHERE ... AND c.id IS NULL ORDER BY s.dpd DESC, l.code`
