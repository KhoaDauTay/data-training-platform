---
id: fin-ch6-01
chapter: 6
title: Xếp hạng chi nhánh trong từng vùng
title_en: Ranking branches within each region
from: { name: Huỳnh Kim Ngân, dept: Risk }
difficulty: 3
beat: teach
format: worked
requires: [select, where, cte, multi_join, conditional_agg, group_by, order_by]
grants: [window_rank]
tables: [loan_snapshots, loans, branches]
ordered: true
columns:
  - { vi: "Vùng", en: "Region" }
  - { vi: "Tên chi nhánh", en: "Branch name" }
  - { vi: "Số khoản quá hạn trên 30 ngày", en: "Loans over 30 days past due" }
  - { vi: "Hạng trong vùng", en: "Rank in the region" }
variants:
  - { me: "2026-10-31", month: "10/2026", month_en: "October 2026" }
  - { me: "2026-07-31", month: "7/2026", month_en: "July 2026" }
  - { me: "2026-06-30", month: "6/2026", month_en: "June 2026" }
reflect:
  q: { vi: "Hai chi nhánh cùng vùng có số khoản quá hạn bằng nhau thì hạng ra sao?", en: "Two branches of the same region have the same number of overdue loans: how are they ranked?" }
  options:
    - { vi: "Cùng hạng, và hạng sau nhảy cách (1, 1, 3)", en: "Same rank, and the next rank skips (1, 1, 3)" }
    - { vi: "Hạng khác nhau, xếp theo tên", en: "Different ranks, ordered by name" }
    - { vi: "Cùng hạng, hạng sau không nhảy (1, 1, 2)", en: "Same rank, the next rank does not skip (1, 1, 2)" }
  answer: 0
  why: { vi: "Hàm xếp hạng cho hai dòng bằng nhau cùng hạng rồi bỏ qua số hạng đã dùng. Hàm đánh số dòng thì luôn cho mỗi dòng một số khác nhau, kể cả khi bằng nhau.", en: "The rank function gives equal rows the same rank and then skips the used places. The row-number function always gives each row a different number, even on a tie." }
wrong:
  - sql: "WITH r AS (SELECT b.region, b.name, count(*) FILTER (WHERE s.dpd > 30) AS overdue FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN branches b ON b.id = l.branch_id WHERE s.month_end = '{{me}}' GROUP BY b.region, b.name) SELECT region, name, overdue, ROW_NUMBER() OVER (PARTITION BY region ORDER BY overdue DESC) FROM r ORDER BY region, 4, name"
    vi: "Hai chi nhánh bằng nhau đang nhận hai hạng khác nhau: bạn đang đánh số dòng. Đề cần bằng nhau thì cùng hạng, hạng sau nhảy cách."
    en: "Two tied branches get different ranks: you are numbering rows. The request wants ties to share a rank, with the next rank skipping."
---
Ban điều hành muốn so các chi nhánh trong cùng vùng với nhau, vì ba vùng có quy mô rất khác. Mình cần hạng của từng chi nhánh trong vùng của nó theo số khoản quá hạn. Mình gửi kèm một ví dụ mẫu về xếp hạng trong từng nhóm.

## Task
Ảnh chụp cuối tháng {{month}}: trong mỗi vùng, xếp hạng các chi nhánh theo số khoản quá hạn trên 30 ngày (nhiều nhất hạng 1; bằng nhau thì cùng hạng, và hạng sau nhảy cách). Vùng, tên chi nhánh, số khoản quá hạn trên 30 ngày và hạng. Xếp theo vùng theo thứ tự chữ cái, rồi theo hạng, rồi theo tên chi nhánh.

## Example
```sql
WITH t AS (
  SELECT p.kind, p.name, sum(l.principal) AS total
  FROM loans l
  JOIN products p ON p.id = l.product_id
  WHERE l.disbursed_on >= '2026-01-01'
  GROUP BY p.kind, p.name
)
SELECT kind, name, total,
       RANK() OVER (                -- ①
         PARTITION BY kind          -- ②
         ORDER BY total DESC        -- ③
       ) AS pos
FROM t
ORDER BY kind, pos
```
Ví dụ: từ đầu năm 2026, xếp hạng các sản phẩm theo tổng tiền giải ngân trong từng loại sản phẩm (tiền mặt, trả góp).

① Hàm xếp hạng gắn cho mỗi dòng một hạng mà không gộp dòng.

② Chia nhóm: mỗi loại sản phẩm xếp hạng riêng, bắt đầu lại từ hạng 1.

③ Thứ tự xếp hạng trong nhóm: tổng lớn nhất hạng 1.

## Hints
1. Bước có tên đếm khoản quá hạn theo chi nhánh (ba bảng: ảnh chụp, sổ vay, chi nhánh). Sau đó xếp hạng trong từng vùng, như ví dụ mẫu; bằng nhau cùng hạng.
2. Bước có tên: `count(*) FILTER (WHERE s.dpd > 30) AS overdue`, `GROUP BY b.region, b.name`. Hạng: `RANK() OVER (PARTITION BY region ORDER BY overdue DESC)`. Sắp `ORDER BY region, 4, name`.
3. `WITH r AS (SELECT b.region, b.name, count(*) FILTER (WHERE s.dpd > 30) AS overdue FROM ... GROUP BY b.region, b.name) SELECT region, name, overdue, RANK() OVER (...) FROM r ORDER BY region, 4, name`

## Solution
```sql
WITH r AS (
  SELECT b.region, b.name, count(*) FILTER (WHERE s.dpd > 30) AS overdue
  FROM loan_snapshots s
  JOIN loans l ON l.id = s.loan_id
  JOIN branches b ON b.id = l.branch_id
  WHERE s.month_end = '{{me}}'
  GROUP BY b.region, b.name
)
SELECT region, name, overdue, RANK() OVER (PARTITION BY region ORDER BY overdue DESC)
FROM r
ORDER BY region, 4, name
```

# EN
The board wants to compare branches within the same region, because the three regions differ a lot in size. I need each branch's rank inside its own region by the number of overdue loans. I am sending a worked example on ranking within groups.

## Task
The month-end picture of {{month_en}}: within each region, rank the branches by their number of loans over 30 days past due (most loans is rank 1; ties share a rank, and the next rank skips). Region, branch name, number of loans over 30 days past due and rank. Sort by region in alphabetical order, then by rank, then by branch name.

## Example
Example: since the start of 2026, rank the products by total amount paid out within each product kind (cash, instalment).

① The rank function gives every row a rank without merging rows.

② The split: each product kind is ranked on its own, starting again at rank 1.

③ The ranking order inside a group: the largest total is rank 1.

## Hints
1. A named step counts the overdue loans per branch (three tables: snapshot, loan book, branches). Then rank within each region, like the worked example; ties share a rank.
2. Named step: `count(*) FILTER (WHERE s.dpd > 30) AS overdue`, `GROUP BY b.region, b.name`. Rank: `RANK() OVER (PARTITION BY region ORDER BY overdue DESC)`. Sort with `ORDER BY region, 4, name`.
3. `WITH r AS (SELECT b.region, b.name, count(*) FILTER (WHERE s.dpd > 30) AS overdue FROM ... GROUP BY b.region, b.name) SELECT region, name, overdue, RANK() OVER (...) FROM r ORDER BY region, 4, name`
