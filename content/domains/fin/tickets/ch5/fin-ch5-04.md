---
id: fin-ch5-04
chapter: 5
title: Chi phí quý {{q}} theo vùng, có tổng phụ
title_en: "{{q_en}} costs by region, with subtotals"
from: { name: Lư Thảo Vy, dept: Finance }
difficulty: 3
beat: rest
adv: [a4]
requires: [select, where, multi_join, aggregate, group_by, order_by]
grants: []
tables: [gl_entries, branches, accounts]
ordered: true
columns:
  - { vi: "Vùng (trống ở dòng tổng công ty)", en: "Region (empty on the company total row)" }
  - { vi: "Tên chi nhánh (trống ở dòng tổng)", en: "Branch name (empty on total rows)" }
  - { vi: "Tổng thực chi", en: "Total spending" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026", m1: "07/2026", m2: "09/2026", m1_en: "July", m2_en: "September 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026", m1: "04/2026", m2: "06/2026", m1_en: "April", m2_en: "June 2026" }
  - { from: "2025-10-01", to: "2026-01-01", q: "4/2025", q_en: "Q4 2025", m1: "10/2025", m2: "12/2025", m1_en: "October", m2_en: "December 2025" }
reflect:
  q: { vi: "Ở dòng tổng của một vùng, cột tên chi nhánh chứa gì?", en: "On a region's total row, what is in the branch name column?" }
  options:
    - { vi: "Ô trống: dòng đó gộp mọi chi nhánh của vùng", en: "An empty cell: that row rolls up every branch of the region" }
    - { vi: "Tên chi nhánh lớn nhất của vùng", en: "The name of the region's largest branch" }
    - { vi: "Chữ \"tổng\"", en: "The word \"total\"" }
  answer: 0
  why: { vi: "Tổng phụ để trống cột đã được gộp. Vì vậy phải sắp ô trống xuống cuối nhóm thì dòng tổng mới đứng sau các chi nhánh.", en: "A subtotal leaves the rolled-up column empty. That is why empty cells must sort last, so the total row comes after the branches." }
wrong:
  - sql: "SELECT b.region, b.name, sum(g.amount) FROM gl_entries g JOIN branches b ON b.id = g.branch_id JOIN accounts a ON a.id = g.account_id WHERE a.kind = 'expense' AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}' GROUP BY b.region, b.name ORDER BY b.region, b.name"
    vi: "Thiếu các dòng tổng: gom thường chỉ ra một dòng mỗi chi nhánh. Đề cần thêm dòng tổng của từng vùng và dòng tổng công ty."
    en: "The total rows are missing: a plain grouping gives one row per branch only. The request also wants a total row per region and one for the whole company."
---
Báo cáo quý cho ban điều hành cần chi phí theo vùng rồi tới từng chi nhánh, có dòng tổng của từng vùng và dòng tổng công ty ở cuối, đúng kiểu bảng kế toán vẫn in.

## Task
Tổng thực chi (chỉ khoản mục chi phí) quý {{q}}, tức từ tháng {{m1}} đến hết tháng {{m2}}, theo vùng và chi nhánh, kèm một dòng tổng cho mỗi vùng và một dòng tổng công ty. Vùng, tên chi nhánh, tổng chi; dòng tổng để trống cột đã gộp. Xếp theo vùng rồi tên chi nhánh, theo thứ tự chữ cái; dòng tổng của mỗi vùng đứng cuối vùng đó, dòng tổng công ty đứng cuối cùng.

## Hints
1. Gom theo vùng và chi nhánh, xin thêm tổng phụ theo vùng và tổng chung trong cùng một lần gom. Dòng tổng để trống cột đã gộp, nên khi sắp phải đẩy ô trống xuống cuối. Bài nâng cao "Tổng phụ" giải thích cách này.
2. `GROUP BY ROLLUP (b.region, b.name)` thêm dòng tổng vùng và tổng chung. Sắp `ORDER BY b.region NULLS LAST, b.name NULLS LAST`. Nối ba bảng: `gl_entries g`, `branches b`, `accounts a`.
3. `SELECT b.region, b.name, sum(g.amount) FROM gl_entries g JOIN branches b ON ... JOIN accounts a ON ... WHERE ... GROUP BY ROLLUP (b.region, b.name) ORDER BY b.region NULLS LAST, b.name NULLS LAST`

## Solution
```sql
SELECT b.region, b.name, sum(g.amount)
FROM gl_entries g
JOIN branches b ON b.id = g.branch_id
JOIN accounts a ON a.id = g.account_id
WHERE a.kind = 'expense' AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}'
GROUP BY ROLLUP (b.region, b.name)
ORDER BY b.region NULLS LAST, b.name NULLS LAST
```

# EN
The quarterly report for the board needs costs by region and then by branch, with a total row for each region and a company total at the end, just like the tables accounting prints.

## Task
Total actual spending (cost lines only) in {{q_en}}, {{m1_en}} to the end of {{m2_en}}, by region and branch, with one total row per region and one company total row. Region, branch name, total spending; total rows leave the rolled-up column empty. Sort by region, then branch name, in alphabetical order; each region's total row comes last in that region, and the company total comes last of all.

## Hints
1. Group by region and branch, and ask for the region subtotals and the grand total in the same grouping. Total rows leave the rolled-up column empty, so empty cells must be pushed to the end when sorting. The advanced lesson "Subtotals" explains this.
2. `GROUP BY ROLLUP (b.region, b.name)` adds the region totals and the grand total. Sort with `ORDER BY b.region NULLS LAST, b.name NULLS LAST`. Join three tables: `gl_entries g`, `branches b`, `accounts a`.
3. `SELECT b.region, b.name, sum(g.amount) FROM gl_entries g JOIN branches b ON ... JOIN accounts a ON ... WHERE ... GROUP BY ROLLUP (b.region, b.name) ORDER BY b.region NULLS LAST, b.name NULLS LAST`
