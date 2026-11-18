---
id: fin-ch5-01
chapter: 5
title: Ngân sách cạnh thực chi của một chi nhánh
title_en: One branch's budget next to its spending
from: { name: Lư Thảo Vy, dept: Finance }
difficulty: 3
beat: teach
format: worked
trap: true
requires: [select, where, join, aggregate, group_by, order_by, coalesce, cte]
grants: [full_join]
tables: [budgets, gl_entries, accounts]
ordered: true
columns:
  - { vi: "Mã khoản mục", en: "Cost line number" }
  - { vi: "Ngân sách (0 nếu không có)", en: "Budget (0 if none)" }
  - { vi: "Thực chi (0 nếu không có)", en: "Actual spending (0 if none)" }
variants:
  - { id: "3", branch: "Hoi An", from: "2026-08-01", to: "2026-09-01", month: "8/2026", month_en: "August 2026" }
  - { id: "4", branch: "Tam Ky", from: "2026-07-01", to: "2026-08-01", month: "7/2026", month_en: "July 2026" }
  - { id: "5", branch: "Hue", from: "2026-05-01", to: "2026-06-01", month: "5/2026", month_en: "May 2026" }
reflect:
  q: { vi: "Ghép trái từ phía ngân sách thì mất dòng nào?", en: "Which rows does a left join from the budget side lose?" }
  options:
    - { vi: "Khoản mục có chi mà không có ngân sách", en: "Cost lines with spending but no budget" }
    - { vi: "Khoản mục có ngân sách mà chưa chi", en: "Cost lines with a budget but no spending yet" }
    - { vi: "Không mất dòng nào", en: "No rows at all" }
  answer: 0
  why: { vi: "Ghép trái giữ mọi dòng bên trái và chỉ dòng khớp bên phải. Ghép đủ hai phía giữ cả dòng chỉ có ở một bên, nên không mất khoản mục nào.", en: "A left join keeps every row on the left and only matching rows on the right. A full join keeps rows found on either side alone, so no cost line is lost." }
wrong:
  - sql: "WITH b AS (SELECT bu.account_id, bu.amount FROM budgets bu JOIN accounts a ON a.id = bu.account_id WHERE a.kind = 'expense' AND bu.branch_id = {{id}} AND bu.month = '{{from}}'), x AS (SELECT g.account_id, sum(g.amount) AS amount FROM gl_entries g JOIN accounts a ON a.id = g.account_id WHERE a.kind = 'expense' AND g.branch_id = {{id}} AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}' GROUP BY g.account_id) SELECT COALESCE(b.account_id, x.account_id), COALESCE(b.amount, 0), COALESCE(x.amount, 0) FROM b LEFT JOIN x ON x.account_id = b.account_id ORDER BY 1"
    vi: "Thiếu khoản mục có chi mà không có ngân sách: ghép trái từ phía ngân sách bỏ những dòng chỉ có ở phía thực chi. Cần giữ dòng của cả hai phía."
    en: "The cost line with spending but no budget is missing: a left join from the budget side drops rows found only on the spending side. Keep the rows of both sides."
  - sql: "WITH b AS (SELECT bu.account_id, bu.amount FROM budgets bu JOIN accounts a ON a.id = bu.account_id WHERE a.kind = 'expense' AND bu.branch_id = {{id}} AND bu.month = '{{from}}'), x AS (SELECT g.account_id, sum(g.amount) AS amount FROM gl_entries g JOIN accounts a ON a.id = g.account_id WHERE a.kind = 'expense' AND g.branch_id = {{id}} AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}' GROUP BY g.account_id) SELECT COALESCE(b.account_id, x.account_id), COALESCE(b.amount, 0), COALESCE(x.amount, 0) FROM b RIGHT JOIN x ON x.account_id = b.account_id ORDER BY 1"
    vi: "Thiếu khoản mục có ngân sách mà chưa chi trong tháng: ghép chỉ giữ phía thực chi thì bỏ những dòng chỉ có ở phía ngân sách. Cần giữ dòng của cả hai phía."
    en: "The cost line with a budget but no spending this month is missing: keeping only the spending side drops rows found only on the budget side. Keep the rows of both sides."
---
Mùa lập ngân sách 2027 bắt đầu. Trước khi họp với từng chi nhánh, mình đặt ngân sách tháng cạnh thực chi của từng khoản mục chi phí. Có khoản mục có ngân sách mà tháng đó chưa chi, có khoản mục chi mà chưa bao giờ được lập ngân sách. Mình cần thấy cả hai loại.

Đây là lần đầu bạn ghép mà giữ dòng của cả hai phía, nên mình gửi kèm một ví dụ mẫu.

## Task
Tháng {{month}}, chi nhánh {{branch}} (mã chi nhánh {{id}}): mọi khoản mục chi phí có ngân sách hoặc có thực chi, gồm mã khoản mục, ngân sách của tháng và tổng thực chi trong tháng; bên nào không có thì ghi 0. Chỉ tính khoản mục chi phí, không tính khoản thu. Xếp theo mã khoản mục.

## Example
```sql
WITH plan AS (
  SELECT branch_id, sum(amount) AS amount
  FROM budgets
  WHERE account_id = 6 AND month >= '2026-01-01' AND month < '2026-02-01'
  GROUP BY branch_id
), spent AS (
  SELECT branch_id, sum(amount) AS amount
  FROM gl_entries
  WHERE account_id = 6 AND posted_on >= '2026-01-01' AND posted_on < '2026-02-01'
  GROUP BY branch_id
)
SELECT COALESCE(p.branch_id, s.branch_id) AS branch_id,          -- ①
       COALESCE(p.amount, 0) AS plan, COALESCE(s.amount, 0) AS spent   -- ②
FROM plan p
FULL JOIN spent s ON s.branch_id = p.branch_id                     -- ③
```
Ví dụ: tháng 1/2026, khoản mục công nghệ thông tin, ngân sách cạnh thực chi theo chi nhánh. Khoản mục này hạch toán theo quý, nên tháng 1 có ngân sách mà chưa có thực chi.

① Mã chi nhánh lấy từ phía nào có: dòng chỉ có ở một phía thì cột của phía kia để trống.

② Ô trống của số tiền thay bằng 0.

③ Ghép giữ dòng của cả hai phía: dòng khớp nằm chung, dòng chỉ có ở một bên vẫn được giữ.

## Hints
1. Hai bước có tên: ngân sách theo khoản mục và thực chi theo khoản mục. Ghép hai bước giữ dòng của cả hai phía, như ví dụ mẫu; mã khoản mục và số tiền lấy từ phía nào có, ô trống thay bằng 0.
2. Ngân sách: `budgets` có `month` là ngày đầu tháng (`bu.month = '{{from}}'`). Thực chi: `gl_entries`, cộng theo `g.account_id`. Cả hai ghép `accounts` để lọc `a.kind = 'expense'`. Ghép hai bước bằng `FULL JOIN x ON x.account_id = b.account_id`.
3. `WITH b AS (...), x AS (...) SELECT COALESCE(b.account_id, x.account_id), COALESCE(b.amount, 0), COALESCE(x.amount, 0) FROM b FULL JOIN x ON ... ORDER BY 1`

## Solution
```sql
WITH b AS (
  SELECT bu.account_id, bu.amount
  FROM budgets bu
  JOIN accounts a ON a.id = bu.account_id
  WHERE a.kind = 'expense' AND bu.branch_id = {{id}} AND bu.month = '{{from}}'
), x AS (
  SELECT g.account_id, sum(g.amount) AS amount
  FROM gl_entries g
  JOIN accounts a ON a.id = g.account_id
  WHERE a.kind = 'expense' AND g.branch_id = {{id}} AND g.posted_on >= '{{from}}' AND g.posted_on < '{{to}}'
  GROUP BY g.account_id
)
SELECT COALESCE(b.account_id, x.account_id), COALESCE(b.amount, 0), COALESCE(x.amount, 0)
FROM b
FULL JOIN x ON x.account_id = b.account_id
ORDER BY 1
```

# EN
Budget season for 2027 has started. Before meeting each branch, I put the monthly budget next to the actual spending for every cost line. Some cost lines have a budget but nothing spent that month, some have spending but were never budgeted. I need to see both kinds.

This is your first join that keeps the rows of both sides, so I am sending a worked example along.

## Task
In {{month_en}}, the {{branch}} branch (branch number {{id}}): every cost line with a budget or with actual spending, giving the cost line number, the month's budget and the month's total actual spending; write 0 on the side that has nothing. Cost lines only, no income lines. Sort by cost line number.

## Example
Example: in January 2026, the IT cost line, budget next to actual spending per branch. This line is booked quarterly, so January has a budget but no spending yet.

① The branch number comes from whichever side has it: a row found on one side only leaves the other side's columns empty.

② Empty amounts are replaced with 0.

③ The join keeps the rows of both sides: matching rows sit together, rows found on one side only are kept too.

## Hints
1. Two named steps: the budget per cost line and the actual spending per cost line. Join the two steps keeping the rows of both sides, like the worked example; take the cost line number and the amounts from whichever side has them, and replace empty cells with 0.
2. Budget: `budgets` has `month` as the first day of the month (`bu.month = '{{from}}'`). Spending: `gl_entries`, summed by `g.account_id`. Both join `accounts` to filter `a.kind = 'expense'`. Join the two steps with `FULL JOIN x ON x.account_id = b.account_id`.
3. `WITH b AS (...), x AS (...) SELECT COALESCE(b.account_id, x.account_id), COALESCE(b.amount, 0), COALESCE(x.amount, 0) FROM b FULL JOIN x ON ... ORDER BY 1`
