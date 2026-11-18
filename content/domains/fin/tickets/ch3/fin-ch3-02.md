---
id: fin-ch3-02
chapter: 3
title: Quá hạn trên 30 ngày, cuối mỗi tháng
title_en: Over 30 days past due, every month end
from: { name: Tạ Minh Nhật, dept: IT }
difficulty: 2
beat: develop
format: faded
requires: [select, where, aggregate, group_by, order_by]
grants: [conditional_agg]
tables: [loan_snapshots]
ordered: true
columns:
  - { vi: "Cuối tháng", en: "Month end" }
  - { vi: "Số khoản còn dư nợ", en: "Loans with a balance" }
  - { vi: "Số khoản quá hạn trên 30 ngày", en: "Loans over 30 days past due" }
  - { vi: "Dư nợ quá hạn trên 30 ngày", en: "Balance over 30 days past due" }
starter: |
  SELECT month_end, count(*), count(*) FILTER (WHERE ___), sum(outstanding) FILTER (WHERE ___)
  FROM loan_snapshots
  WHERE month_end BETWEEN '{{a}}' AND '{{b}}'
  GROUP BY month_end
  ORDER BY month_end
variants:
  - { a: "2026-05-31", b: "2026-10-31", first: "5/2026", last: "10/2026", first_en: "May 2026", last_en: "October 2026" }
  - { a: "2025-11-30", b: "2026-04-30", first: "11/2025", last: "4/2026", first_en: "November 2025", last_en: "April 2026" }
  - { a: "2026-02-28", b: "2026-07-31", first: "2/2026", last: "7/2026", first_en: "February 2026", last_en: "July 2026" }
reflect:
  q: { vi: "Vì sao không lọc \"quá hạn trên 30 ngày\" ở phần lọc dòng chung?", en: "Why not filter \"over 30 days past due\" in the shared row filter?" }
  options:
    - { vi: "Lọc chung thì mọi cột chỉ còn đếm khoản quá hạn, mất con số tổng số khoản còn dư nợ", en: "A shared filter makes every column count only overdue loans, and the total number of loans with a balance is lost" }
    - { vi: "Lọc chung chạy chậm hơn", en: "A shared filter runs slower" }
    - { vi: "Lọc chung không dùng được với số", en: "A shared filter cannot work on numbers" }
  answer: 0
  why: { vi: "Điều kiện gắn riêng cho từng phép đếm chỉ áp lên cột đó, nên một lần gom ra được cả tổng lẫn phần quá hạn.", en: "A condition attached to one count applies to that column only, so a single pass gives both the total and the overdue part." }
wrong:
  - sql: "SELECT month_end, count(*), count(*), sum(outstanding) FROM loan_snapshots WHERE month_end BETWEEN '{{a}}' AND '{{b}}' AND dpd > 30 GROUP BY month_end ORDER BY month_end"
    vi: "Cột số khoản còn dư nợ đang chỉ đếm khoản quá hạn: điều kiện quá hạn nằm ở phần lọc dòng chung. Gắn điều kiện riêng cho hai cột quá hạn thôi."
    en: "The loans-with-a-balance column counts only overdue loans: the overdue condition sits in the shared row filter. Attach it to the two overdue columns only."
---
Mình đang dựng bảng theo dõi nợ xấu cho phòng Rủi ro. Mỗi cuối tháng cần ba con số trên cùng một dòng: tổng số khoản còn dư nợ, số khoản quá hạn trên 30 ngày, và dư nợ của các khoản quá hạn đó.

Câu truy vấn trong editor đã viết gần xong. Hai chỗ trống là cùng một điều kiện, gắn riêng cho hai cột quá hạn.

## Task
Mỗi cuối tháng từ {{first}} tới {{last}}: ngày cuối tháng, số khoản còn dư nợ, số khoản quá hạn trên 30 ngày và tổng dư nợ của các khoản quá hạn trên 30 ngày. Tháng sớm nhất lên đầu.

## Hints
1. Đây là bài đếm có điều kiện: trong một lần gom theo tháng, cột thứ hai đếm mọi khoản, hai cột sau chỉ tính các khoản quá hạn trên 30 ngày.
2. Cả hai chỗ trống: `dpd > 30`.
3. `SELECT month_end, count(*), count(*) FILTER (WHERE dpd > 30), sum(outstanding) FILTER (WHERE dpd > 30) FROM loan_snapshots WHERE ... GROUP BY month_end ORDER BY month_end`

## Solution
```sql
SELECT month_end, count(*), count(*) FILTER (WHERE dpd > 30), sum(outstanding) FILTER (WHERE dpd > 30)
FROM loan_snapshots
WHERE month_end BETWEEN '{{a}}' AND '{{b}}'
GROUP BY month_end
ORDER BY month_end
```

# EN
I am building the bad-debt tracker for the Risk team. Every month end needs three figures on one row: the total number of loans with a balance, the number over 30 days past due, and the balance of those overdue loans.

The query in the editor is almost done. Both blanks are the same condition, attached to the two overdue columns only.

## Task
Every month end from {{first_en}} to {{last_en}}: the month-end date, the number of loans with a balance, the number over 30 days past due and the total balance of the loans over 30 days past due. Earliest month first.

## Hints
1. This is a conditional count: in one pass grouped by month, the second column counts every loan, the next two only count loans over 30 days past due.
2. Both blanks: `dpd > 30`.
3. `SELECT month_end, count(*), count(*) FILTER (WHERE dpd > 30), sum(outstanding) FILTER (WHERE dpd > 30) FROM loan_snapshots WHERE ... GROUP BY month_end ORDER BY month_end`
