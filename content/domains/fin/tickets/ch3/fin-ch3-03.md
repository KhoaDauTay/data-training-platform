---
id: fin-ch3-03
chapter: 3
title: Chi nhánh nhiều khoản quá hạn
title_en: Branches with many overdue loans
from: { name: Huỳnh Kim Ngân, dept: Risk }
difficulty: 3
beat: twist
requires: [select, where, join, aggregate, group_by, order_by]
grants: [multi_join, having]
tables: [loan_snapshots, loans, branches]
ordered: true
columns:
  - { vi: "Tên chi nhánh", en: "Branch name" }
  - { vi: "Vùng", en: "Region" }
  - { vi: "Số khoản quá hạn trên 30 ngày", en: "Loans over 30 days past due" }
variants:
  - { me: "2026-10-31", n: "4", month: "10/2026", month_en: "October 2026" }
  - { me: "2026-09-30", n: "5", month: "9/2026", month_en: "September 2026" }
  - { me: "2026-07-31", n: "6", month: "7/2026", month_en: "July 2026" }
reflect:
  q: { vi: "Điều kiện \"hơn N khoản\" phải đặt ở đâu, và vì sao?", en: "Where does the \"more than N loans\" condition go, and why?" }
  options:
    - { vi: "Sau khi gom nhóm: số khoản của chi nhánh chỉ có sau khi đếm xong", en: "After grouping: a branch's loan count only exists once the counting is done" }
    - { vi: "Ở phần lọc dòng, cùng chỗ với ngày cuối tháng", en: "In the row filter, next to the month-end date" }
    - { vi: "Ở phần sắp xếp", en: "In the sort" }
  answer: 0
  why: { vi: "Phần lọc dòng chạy trước khi gom, lúc đó chưa có phép đếm. Lọc nhóm sau khi gom thì dùng được số đếm.", en: "The row filter runs before grouping, when no count exists yet. Filtering groups after grouping can use the count." }
wrong:
  - sql: "SELECT b.name, b.region, count(*) FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN branches b ON b.id = l.branch_id WHERE s.month_end = '{{me}}' AND s.dpd > 30 GROUP BY b.name, b.region HAVING count(*) >= {{n}} ORDER BY 3 DESC, 1"
    vi: "Có thêm chi nhánh có đúng {{n}} khoản. Đề hỏi \"hơn {{n}} khoản\", tức lớn hơn, không phải lớn hơn hoặc bằng."
    en: "An extra branch with exactly {{n}} loans shows up. The request says \"more than {{n}} loans\": greater than, not greater than or equal."
---
Mình cần danh sách chi nhánh đáng lo trước cuộc họp rủi ro. Ảnh chụp chỉ có số khoản vay, sổ vay mới biết khoản thuộc chi nhánh nào, còn tên và vùng của chi nhánh nằm ở danh sách chi nhánh. Lần này phải đi qua cả ba.

## Task
Cuối tháng {{month}}, chi nhánh nào có hơn {{n}} khoản quá hạn trên 30 ngày? Tên chi nhánh, vùng và số khoản quá hạn trên 30 ngày. Nhiều khoản nhất lên đầu; bằng nhau thì theo tên chi nhánh theo thứ tự chữ cái.

## Hints
1. Đi qua ba bảng: ảnh chụp, sổ vay, chi nhánh. Đếm theo chi nhánh, rồi lọc nhóm sau khi gom: số khoản chỉ có sau khi đếm.
2. `FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN branches b ON b.id = l.branch_id`. Lọc dòng `s.dpd > 30`, gom `GROUP BY b.name, b.region`, lọc nhóm `HAVING count(*) > {{n}}`.
3. `SELECT b.name, b.region, count(*) FROM ... WHERE ... GROUP BY b.name, b.region HAVING count(*) > {{n}} ORDER BY 3 DESC, 1`

## Solution
```sql
SELECT b.name, b.region, count(*)
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
JOIN branches b ON b.id = l.branch_id
WHERE s.month_end = '{{me}}' AND s.dpd > 30
GROUP BY b.name, b.region
HAVING count(*) > {{n}}
ORDER BY 3 DESC, 1
```

# EN
I need the list of worrying branches before the risk meeting. The snapshot only holds the loan number, the loan book knows which branch a loan belongs to, and the branch name and region are in the branch list. This time you go through all three.

## Task
At the end of {{month_en}}, which branches have more than {{n}} loans over 30 days past due? Branch name, region and the number of loans over 30 days past due. Most loans first; on a tie, by branch name in alphabetical order.

## Hints
1. Go through three tables: the snapshot, the loan book, the branches. Count per branch, then filter the groups after grouping: the count only exists once the counting is done.
2. `FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN branches b ON b.id = l.branch_id`. Filter rows with `s.dpd > 30`, group with `GROUP BY b.name, b.region`, filter groups with `HAVING count(*) > {{n}}`.
3. `SELECT b.name, b.region, count(*) FROM ... WHERE ... GROUP BY b.name, b.region HAVING count(*) > {{n}} ORDER BY 3 DESC, 1`
