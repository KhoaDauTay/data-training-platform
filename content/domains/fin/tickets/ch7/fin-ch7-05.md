---
id: fin-ch7-05
chapter: 7
title: "Đánh giá thăng tiến: luật duyệt vay 2027"
title_en: "Promotion review: the 2027 approval rule"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 4
beat: boss
requires: [select, where, cte, case_when, conditional_agg, multi_join, date_bucket, window_agg, window_rank, coalesce, join, aggregate, group_by, order_by]
grants: []
tables: [loans, applications, loan_snapshots, branches]
ordered: true
columns:
  - [{ vi: "Kênh nộp hồ sơ", en: "Application channel" }, { vi: "Nhóm điểm", en: "Score band" }, { vi: "Số khoản vay", en: "Loans" }, { vi: "Số khoản từng quá hạn trên 30 ngày", en: "Loans ever over 30 days past due" }, { vi: "Tỷ lệ (%)", en: "Share (%)" }]
  - [{ vi: "Tháng giải ngân", en: "Disbursement month" }, { vi: "Số khoản vay", en: "Loans" }, { vi: "Tiền giải ngân", en: "Amount paid out" }, { vi: "Lũy kế từ đầu năm", en: "Year to date" }]
  - [{ vi: "Tên chi nhánh", en: "Branch name" }, { vi: "Tỷ trọng dư nợ (%)", en: "Share of the balance (%)" }, { vi: "Hạng", en: "Rank" }]
conclusion:
  question: "Theo ba bước, bạn đề xuất luật duyệt nào cho năm 2027?"
  options:
    - "Ngừng duyệt hồ sơ dưới 700 điểm từ kênh đối tác, giữ nguyên mọi hồ sơ khác"
    - "Đóng hẳn kênh đối tác, kể cả hồ sơ từ 700 điểm trở lên"
    - "Nâng ngưỡng duyệt lên 750 điểm cho cả ba kênh nộp hồ sơ"
    - "Giữ nguyên luật, vì tỷ lệ nợ xấu như nhau ở mọi kênh"
  answer: 0
conclusion_en:
  question: "Taking the three steps together, which approval rule do you propose for 2027?"
  options:
    - "Stop approving partner-channel applications under 700 points, keep every other application as it is"
    - "Close the partner channel, applications from 700 points included"
    - "Raise the approval threshold to 750 points for all three channels"
    - "Keep the rule as it is, since bad debt is the same in every channel"
---
Đây là buổi đánh giá thăng tiến cuối cùng. Hội đồng tín dụng họp tuần sau để chốt luật duyệt vay 2027, và mình muốn một đề xuất có số liệu: loại hồ sơ nào rủi ro thật, năm nay mình đã giải ngân cho nó bao nhiêu, và nó dồn vào chi nhánh nào. Làm đúng cả ba là bạn lên trưởng nhóm phân tích rủi ro.

## Step 1: Rủi ro theo kênh và nhóm điểm
Các khoản giải ngân từ tháng 1 đến hết tháng 6/2026, có ít nhất một ảnh chụp cuối tháng. Mỗi kênh nộp hồ sơ và mỗi nhóm điểm lúc nộp (nhóm 1 dưới 600 điểm, nhóm 2 từ 600 đến dưới 700, nhóm 3 từ 700 trở lên): số khoản vay, số khoản từng quá hạn trên 30 ngày ở ít nhất một ảnh chụp cuối tháng, và tỷ lệ phần trăm (làm tròn 2 chữ số thập phân). Xếp theo kênh, rồi theo nhóm.
```sql
WITH k AS (
  SELECT l.id, a.channel,
         CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band,
         max(s.dpd) AS worst
  FROM loans l
  JOIN applications a ON a.id = l.application_id
  JOIN loan_snapshots s ON s.loan_id = l.id
  WHERE l.disbursed_on >= '2026-01-01' AND l.disbursed_on < '2026-07-01'
  GROUP BY l.id, a.channel, a.score
)
SELECT channel, band, count(*), count(*) FILTER (WHERE worst > 30),
       round(100.0 * count(*) FILTER (WHERE worst > 30) / count(*), 2)
FROM k
GROUP BY channel, band
ORDER BY channel, band
```

## Step 2: Hồ sơ đối tác dưới 700 điểm, tháng theo tháng
Các khoản giải ngân từ tháng 1 đến hết tháng 10/2026 từ hồ sơ nộp qua kênh đối tác có điểm dưới 700. Mỗi tháng giải ngân (ghi bằng ngày đầu tháng): số khoản vay, tổng tiền giải ngân, và tổng tiền giải ngân lũy kế từ đầu năm tới hết tháng đó. Xếp theo tháng.
```sql
WITH m AS (
  SELECT date_trunc('month', l.disbursed_on)::date AS month, count(*) AS loans, sum(l.principal) AS paid_out
  FROM loans l
  JOIN applications a ON a.id = l.application_id
  WHERE a.channel = 'partner' AND a.score < 700
    AND l.disbursed_on >= '2026-01-01' AND l.disbursed_on < '2026-11-01'
  GROUP BY 1
)
SELECT month, loans, paid_out, sum(paid_out) OVER (ORDER BY month)
FROM m
ORDER BY month
```

## Step 3: Chi nhánh nào gánh nhiều nhất
Ảnh chụp cuối tháng 10/2026. Mỗi chi nhánh: tỷ trọng phần trăm dư nợ đến từ hồ sơ đối tác dưới 700 điểm trên tổng dư nợ của chi nhánh (làm tròn 2 chữ số thập phân; chi nhánh không có khoản nào như vậy thì tỷ trọng là 0), và hạng theo tỷ trọng đó (cao nhất hạng 1; bằng nhau cùng hạng, hạng sau nhảy cách). Xếp theo hạng, rồi theo tên chi nhánh.
```sql
WITH o AS (
  SELECT b.name,
         round(100.0 * COALESCE(sum(s.outstanding) FILTER (WHERE a.channel = 'partner' AND a.score < 700), 0)
               / sum(s.outstanding), 2) AS pct
  FROM loan_snapshots s
  JOIN loans l ON l.id = s.loan_id
  JOIN applications a ON a.id = l.application_id
  JOIN branches b ON b.id = l.branch_id
  WHERE s.month_end = '2026-10-31'
  GROUP BY b.name
)
SELECT name, pct, RANK() OVER (ORDER BY pct DESC)
FROM o
ORDER BY 3, name
```

## Hints
1. Bước 1 là bài nhóm điểm ở đầu chương, thêm kênh nộp hồ sơ. Bước 2 gom theo tháng giải ngân trong một bước có tên, rồi cộng dồn bằng hàm cửa sổ. Bước 3 tính tỷ trọng theo chi nhánh trong một bước có tên, rồi xếp hạng.
2. Bước 1: `GROUP BY l.id, a.channel, a.score` trong bước có tên. Bước 2: `date_trunc('month', l.disbursed_on)::date`, `sum(paid_out) OVER (ORDER BY month)`. Bước 3: `COALESCE(sum(s.outstanding) FILTER (WHERE a.channel = 'partner' AND a.score < 700), 0)`, `RANK() OVER (ORDER BY pct DESC)`.
3. `WITH o AS (SELECT b.name, round(100.0 * COALESCE(sum(...) FILTER (...), 0) / sum(s.outstanding), 2) AS pct FROM ... GROUP BY b.name) SELECT name, pct, RANK() OVER (ORDER BY pct DESC) FROM o ORDER BY 3, name`

# EN
This is the last promotion review. The credit committee meets next week to settle the 2027 approval rule, and I want a proposal backed by figures: which kind of application is really risky, how much we have paid out on it this year, and which branch it piles up in. Get all three right and you become the risk analytics lead.

## Step 1: Risk by channel and score band
The loans paid out from January to the end of June 2026 that have at least one month-end picture. For each application channel and each score band at application time (band 1 under 600 points, band 2 from 600 to under 700, band 3 from 700 up): the number of loans, the number over 30 days past due in at least one month-end picture, and the percentage (rounded to 2 decimals). Sort by channel, then by band.

## Step 2: Partner applications under 700 points, month by month
The loans paid out from January to the end of October 2026 on applications made through the partner channel with a score under 700. For each disbursement month (written as the month's first day): the number of loans, the total amount paid out, and the total paid out since the start of the year up to the end of that month. Sort by month.

## Step 3: Which branch carries the most
The month-end picture of October 2026. For each branch: the percentage of the branch's balance that comes from partner applications under 700 points (rounded to 2 decimals; a branch with no such loan has a share of 0), and its rank by that share (highest is rank 1; ties share a rank and the next rank skips). Sort by rank, then branch name.

## Hints
1. Step 1 is the score-band task from the start of the chapter, with the application channel added. Step 2 groups by disbursement month in a named step, then adds up with a window function. Step 3 computes the share per branch in a named step, then ranks.
2. Step 1: `GROUP BY l.id, a.channel, a.score` in the named step. Step 2: `date_trunc('month', l.disbursed_on)::date`, `sum(paid_out) OVER (ORDER BY month)`. Step 3: `COALESCE(sum(s.outstanding) FILTER (WHERE a.channel = 'partner' AND a.score < 700), 0)`, `RANK() OVER (ORDER BY pct DESC)`.
3. `WITH o AS (SELECT b.name, round(100.0 * COALESCE(sum(...) FILTER (...), 0) / sum(s.outstanding), 2) AS pct FROM ... GROUP BY b.name) SELECT name, pct, RANK() OVER (ORDER BY pct DESC) FROM o ORDER BY 3, name`
