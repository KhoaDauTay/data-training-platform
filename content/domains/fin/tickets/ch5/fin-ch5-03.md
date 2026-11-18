---
id: fin-ch5-03
chapter: 5
title: Chi nhánh chi trên mức trung bình
title_en: Branches spending above the average
from: { name: Tạ Minh Nhật, dept: IT }
difficulty: 3
beat: twist
requires: [select, where, join, aggregate, group_by, having, order_by]
grants: [scalar_subquery]
tables: [gl_entries, accounts]
ordered: true
columns:
  - { vi: "Mã chi nhánh", en: "Branch number" }
  - { vi: "Tổng chi phí", en: "Total costs" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026" }
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026" }
reflect:
  q: { vi: "Trung bình của mọi bút toán khác trung bình mỗi chi nhánh thế nào?", en: "How does the average of all entries differ from the average per branch?" }
  options:
    - { vi: "Trung bình bút toán là cỡ một lần ghi sổ, nhỏ hơn rất nhiều so với tổng chi của một chi nhánh trong quý", en: "The entry average is the size of one booking, far smaller than one branch's costs for the quarter" }
    - { vi: "Hai con số luôn bằng nhau", en: "The two figures are always equal" }
    - { vi: "Trung bình bút toán luôn lớn hơn", en: "The entry average is always larger" }
  answer: 0
  why: { vi: "Mỗi chi nhánh có hàng chục bút toán mỗi quý. So tổng chi của chi nhánh với một bút toán trung bình thì chi nhánh nào cũng \"vượt\".", en: "Each branch has dozens of entries a quarter. Comparing a branch's total with an average entry makes every branch look \"above\"." }
wrong:
  - sql: "SELECT g.branch_id, sum(g.amount) FROM gl_entries g JOIN accounts a ON a.id = g.account_id WHERE a.kind = 'expense' AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}' GROUP BY g.branch_id HAVING sum(g.amount) > (SELECT avg(g2.amount) FROM gl_entries g2 JOIN accounts a2 ON a2.id = g2.account_id WHERE a2.kind = 'expense' AND g2.posted_on >= '{{from}}' AND g2.posted_on < '{{to}}') ORDER BY 2 DESC, 1"
    vi: "Chi nhánh nào cũng hiện ra: bạn đang so tổng chi của chi nhánh với một bút toán trung bình. Mức cần so là tổng chi cả công ty chia cho số chi nhánh."
    en: "Every branch shows up: you compared a branch's total with an average single entry. The bar is the company's total costs divided by the number of branches."
---
Mình đang làm bảng cảnh báo chi phí. Câu hỏi nghe đơn giản: chi nhánh nào chi nhiều hơn mức trung bình? Nhưng "trung bình" phải là trung bình mỗi chi nhánh, không phải trung bình mỗi lần ghi sổ.

## Task
Quý {{q}}: chi nhánh nào có tổng chi phí cao hơn mức chi trung bình mỗi chi nhánh của cả công ty (tổng chi phí cả công ty trong quý chia cho số chi nhánh có chi phí)? Chỉ tính khoản mục chi phí. Mã chi nhánh và tổng chi phí; cao nhất lên đầu, bằng nhau thì mã chi nhánh nhỏ hơn lên trước.

## Hints
1. Mức so sánh là một con số tính từ cả bảng: một truy vấn con trả về đúng một giá trị, đặt ngay trong điều kiện lọc nhóm.
2. Truy vấn con: `(SELECT sum(g2.amount) / count(DISTINCT g2.branch_id) FROM gl_entries g2 JOIN accounts a2 ON a2.id = g2.account_id WHERE a2.kind = 'expense' AND ...)`; `count(DISTINCT ...)` đếm mỗi chi nhánh một lần. Lọc `HAVING sum(g.amount) > (...)`.
3. `SELECT g.branch_id, sum(g.amount) FROM gl_entries g JOIN accounts a ON ... WHERE ... GROUP BY g.branch_id HAVING sum(g.amount) > (SELECT ...) ORDER BY 2 DESC, 1`

## Solution
```sql
SELECT g.branch_id, sum(g.amount)
FROM gl_entries g
JOIN accounts a ON a.id = g.account_id
WHERE a.kind = 'expense' AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}'
GROUP BY g.branch_id
HAVING sum(g.amount) > (
  SELECT sum(g2.amount) / count(DISTINCT g2.branch_id)
  FROM gl_entries g2
  JOIN accounts a2 ON a2.id = g2.account_id
  WHERE a2.kind = 'expense' AND g2.posted_on >= '{{from}}' AND g2.posted_on < '{{to}}'
)
ORDER BY 2 DESC, 1
```

# EN
I am building a cost alert board. The question sounds simple: which branches spend more than the average? But "average" has to mean per branch, not per booking.

## Task
In {{q_en}}: which branches have total costs above the company's average cost per branch (the company's total costs for the quarter divided by the number of branches with costs)? Cost lines only. Branch number and total costs; highest first, on a tie the smaller branch number first.

## Hints
1. The bar is a figure computed from the whole table: a sub-query returning exactly one value, placed right in the group filter.
2. The sub-query: `(SELECT sum(g2.amount) / count(DISTINCT g2.branch_id) FROM gl_entries g2 JOIN accounts a2 ON a2.id = g2.account_id WHERE a2.kind = 'expense' AND ...)`; `count(DISTINCT ...)` counts each branch once. Filter with `HAVING sum(g.amount) > (...)`.
3. `SELECT g.branch_id, sum(g.amount) FROM gl_entries g JOIN accounts a ON ... WHERE ... GROUP BY g.branch_id HAVING sum(g.amount) > (SELECT ...) ORDER BY 2 DESC, 1`
