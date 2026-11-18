---
id: fin-ch5-05
chapter: 5
title: "Đánh giá thăng tiến: ngân sách quý 3"
title_en: "Promotion review: the Q3 budget"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 3
beat: boss
requires: [select, where, full_join, window_agg, scalar_subquery, multi_join, cte, coalesce, join, aggregate, group_by, having, order_by, date_bucket]
grants: []
tables: [budgets, gl_entries, accounts, branches]
ordered: true
columns:
  - [{ vi: "Mã khoản mục", en: "Cost line number" }, { vi: "Ngân sách", en: "Budget" }, { vi: "Thực chi", en: "Actual spending" }, { vi: "Chênh lệch (thực chi trừ ngân sách)", en: "Variance (actual minus budget)" }]
  - [{ vi: "Tên chi nhánh", en: "Branch name" }, { vi: "Vùng", en: "Region" }, { vi: "Thực chi Marketing", en: "Marketing spending" }]
  - [{ vi: "Tháng", en: "Month" }, { vi: "Thực chi lũy kế", en: "Spending year to date" }, { vi: "Ngân sách lũy kế", en: "Budget year to date" }]
conclusion:
  question: "Theo ba bước, phần chi vượt ngân sách quý 3 chủ yếu đến từ đâu?"
  options:
    - "Marketing ở chi nhánh Hoi An"
    - "Chi phí nhân sự ở mọi chi nhánh"
    - "Khoản mục chưa có ngân sách"
    - "Tiền thuê ở Da Nang"
  answer: 0
conclusion_en:
  question: "Taking the three steps together, where does most of the Q3 overspending come from?"
  options:
    - "Marketing at the Hoi An branch"
    - "Staff costs at every branch"
    - "Cost lines with no budget"
    - "Rent in Da Nang"
---
Đây là buổi đánh giá thăng tiến của bạn. Quý 3 chi vượt ngân sách, và ban điều hành muốn biết vượt ở đâu trước khi chốt ngân sách 2027. Làm đúng cả ba bảng là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Ngân sách và thực chi theo khoản mục
Toàn công ty quý 3/2026 (từ tháng 7 đến hết tháng 9): mọi khoản mục chi phí có ngân sách hoặc có thực chi, gồm mã khoản mục, ngân sách, thực chi và chênh lệch (thực chi trừ ngân sách); bên nào không có thì ghi 0. Chênh lệch lớn nhất lên đầu; bằng nhau thì theo mã khoản mục.
```sql
WITH bu AS (
  SELECT b.account_id, sum(b.amount) AS amount
  FROM budgets b
  JOIN accounts a ON a.id = b.account_id
  WHERE a.kind = 'expense' AND b.month BETWEEN '2026-07-01' AND '2026-09-01'
  GROUP BY b.account_id
), ac AS (
  SELECT g.account_id, sum(g.amount) AS amount
  FROM gl_entries g
  JOIN accounts a ON a.id = g.account_id
  WHERE a.kind = 'expense' AND g.posted_on >= '2026-07-01' AND g.posted_on < '2026-10-01'
  GROUP BY g.account_id
)
SELECT COALESCE(bu.account_id, ac.account_id), COALESCE(bu.amount, 0), COALESCE(ac.amount, 0), COALESCE(ac.amount, 0) - COALESCE(bu.amount, 0)
FROM bu
FULL JOIN ac ON ac.account_id = bu.account_id
ORDER BY 4 DESC, 1
```

## Step 2: Ai chi Marketing nhiều
Những chi nhánh có thực chi Marketing quý 3/2026 cao hơn mức Marketing trung bình mỗi chi nhánh (tổng Marketing cả công ty trong quý chia cho số chi nhánh có chi Marketing): tên chi nhánh, vùng, số tiền. Cao nhất lên đầu; bằng nhau thì theo tên chi nhánh.
```sql
SELECT b.name, b.region, sum(g.amount)
FROM gl_entries g
JOIN branches b ON b.id = g.branch_id
JOIN accounts a ON a.id = g.account_id
WHERE a.name = 'Marketing' AND g.posted_on >= '2026-07-01' AND g.posted_on < '2026-10-01'
GROUP BY b.name, b.region
HAVING sum(g.amount) > (
  SELECT sum(g2.amount) / count(DISTINCT g2.branch_id)
  FROM gl_entries g2
  JOIN accounts a2 ON a2.id = g2.account_id
  WHERE a2.name = 'Marketing' AND g2.posted_on >= '2026-07-01' AND g2.posted_on < '2026-10-01'
)
ORDER BY 3 DESC, 1
```

## Step 3: Hoi An lũy kế từ đầu năm
Chi nhánh Hoi An (mã chi nhánh 3), mỗi tháng của năm 2026, kể cả tháng chưa có thực chi: tháng (ngày đầu tháng), thực chi lũy kế từ đầu năm và ngân sách lũy kế từ đầu năm, chỉ tính khoản mục chi phí. Tháng sớm nhất lên đầu.
```sql
WITH bu AS (
  SELECT b.month, sum(b.amount) AS amount
  FROM budgets b
  JOIN accounts a ON a.id = b.account_id
  WHERE a.kind = 'expense' AND b.branch_id = 3 AND b.month >= '2026-01-01'
  GROUP BY b.month
), ac AS (
  SELECT date_trunc('month', g.posted_on)::date AS month, sum(g.amount) AS amount
  FROM gl_entries g
  JOIN accounts a ON a.id = g.account_id
  WHERE a.kind = 'expense' AND g.branch_id = 3 AND g.posted_on >= '2026-01-01'
  GROUP BY 1
), j AS (
  SELECT COALESCE(bu.month, ac.month) AS month, COALESCE(ac.amount, 0) AS actual, COALESCE(bu.amount, 0) AS budget
  FROM bu
  FULL JOIN ac ON ac.month = bu.month
)
SELECT month, sum(actual) OVER (ORDER BY month), sum(budget) OVER (ORDER BY month)
FROM j
ORDER BY month
```

## Hints
1. Bước 1 và 3 đặt ngân sách cạnh thực chi, giữ dòng của cả hai phía như bài ngân sách cạnh thực chi. Bước 2 so mỗi chi nhánh với một con số tính từ cả bảng. Bước 3 thêm hai cột cộng dồn theo tháng.
2. Bước 1: `FULL JOIN ac ON ac.account_id = bu.account_id`, chênh lệch `COALESCE(ac.amount, 0) - COALESCE(bu.amount, 0)`. Bước 2: `a.name = 'Marketing'`, truy vấn con `sum(g2.amount) / count(DISTINCT g2.branch_id)`. Bước 3: thực chi gom theo `date_trunc('month', g.posted_on)::date`, rồi `sum(actual) OVER (ORDER BY month)`.
3. `WITH bu AS (...), ac AS (...), j AS (SELECT COALESCE(bu.month, ac.month) AS month, ... FROM bu FULL JOIN ac ON ...) SELECT month, sum(actual) OVER (ORDER BY month), sum(budget) OVER (ORDER BY month) FROM j ORDER BY month`

# EN
This is your promotion review. Q3 went over budget, and the board wants to know where before the 2027 budget is locked. Get all three tables right and you take another step in your career.

## Step 1: Budget and spending per cost line
The whole company in Q3 2026 (July to the end of September): every cost line with a budget or with actual spending, giving the cost line number, the budget, the actual spending and the variance (actual minus budget); write 0 on the side that has nothing. Largest variance first; on a tie, by cost line number.

## Step 2: Who spends a lot on marketing
The branches whose Q3 2026 marketing spending is above the company's average marketing per branch (the company's marketing total for the quarter divided by the number of branches with marketing spending): branch name, region, amount. Highest first; on a tie, by branch name.

## Step 3: Hoi An year to date
The Hoi An branch (branch number 3), every month of 2026, including months with no spending yet: the month (first day), spending year to date and budget year to date, cost lines only. Earliest month first.

## Hints
1. Steps 1 and 3 put the budget next to the spending and keep the rows of both sides, like the budget-next-to-spending task. Step 2 compares each branch with a figure computed from the whole table. Step 3 adds two running-total columns by month.
2. Step 1: `FULL JOIN ac ON ac.account_id = bu.account_id`, variance `COALESCE(ac.amount, 0) - COALESCE(bu.amount, 0)`. Step 2: `a.name = 'Marketing'`, sub-query `sum(g2.amount) / count(DISTINCT g2.branch_id)`. Step 3: spending grouped by `date_trunc('month', g.posted_on)::date`, then `sum(actual) OVER (ORDER BY month)`.
3. `WITH bu AS (...), ac AS (...), j AS (SELECT COALESCE(bu.month, ac.month) AS month, ... FROM bu FULL JOIN ac ON ...) SELECT month, sum(actual) OVER (ORDER BY month), sum(budget) OVER (ORDER BY month) FROM j ORDER BY month`
