---
id: fin-ch3-05
chapter: 3
title: "Đánh giá thăng tiến: báo cáo nợ xấu tháng 10"
title_en: "Promotion review: the October bad-debt report"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 3
beat: boss
requires: [select, where, case_when, conditional_agg, multi_join, having, join, aggregate, group_by, order_by]
grants: []
tables: [loan_snapshots, loans, branches, applications]
ordered: true
columns:
  - [{ vi: "Nhóm nợ (0 đến 3)", en: "Bucket (0 to 3)" }, { vi: "Số khoản", en: "Loans" }, { vi: "Tổng dư nợ", en: "Total balance" }]
  - [{ vi: "Tên chi nhánh", en: "Branch name" }, { vi: "Tỷ lệ dư nợ quá hạn trên 30 ngày (%)", en: "Share of balance over 30 days past due (%)" }]
  - [{ vi: "Dải điểm (1 đến 3)", en: "Score band (1 to 3)" }, { vi: "Số khoản còn dư nợ", en: "Loans with a balance" }, { vi: "Tỷ lệ khoản quá hạn trên 30 ngày (%)", en: "Share of loans over 30 days past due (%)" }]
conclusion:
  question: "Theo bước 3, khoản vay ở dải điểm 1 (dưới 600) có tỷ lệ quá hạn trên 30 ngày gấp khoảng bao nhiêu lần dải 3 (từ 700)?"
  options:
    - "Khoảng 4,5 lần"
    - "Khoảng 2 lần"
    - "Gần như bằng nhau"
    - "Khoảng 10 lần"
  answer: 0
conclusion_en:
  question: "According to step 3, how many times higher is the over-30-days rate of score band 1 (below 600) than that of band 3 (700 and up)?"
  options:
    - "About 4.5 times"
    - "About 2 times"
    - "About the same"
    - "About 10 times"
---
Đây là buổi đánh giá thăng tiến của bạn. Hội đồng tín dụng họp đầu tháng 11 và mình cần báo cáo nợ xấu cuối tháng 10: sổ vay chia theo nhóm nợ, chi nhánh đáng lo, và điểm tín dụng lúc duyệt có báo trước được rủi ro không. Làm đúng cả ba bảng là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Sổ vay theo nhóm nợ
Ảnh chụp cuối tháng 10/2026, theo nhóm nợ (0 khi không quá hạn, 1 khi quá hạn từ 1 đến 30 ngày, 2 khi từ 31 đến 90 ngày, 3 khi trên 90 ngày): nhóm nợ, số khoản và tổng dư nợ. Nhóm 0 lên đầu.
```sql
SELECT CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd <= 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END AS bucket, count(*), sum(s.outstanding)
FROM loan_snapshots s
WHERE s.month_end = '2026-10-31'
GROUP BY 1
ORDER BY 1
```

## Step 2: Chi nhánh có nợ xấu trên 3%
Cuối tháng 10/2026, những chi nhánh có dư nợ quá hạn trên 30 ngày lớn hơn 3% tổng dư nợ của chính chi nhánh đó: tên chi nhánh và tỷ lệ phần trăm dư nợ quá hạn trên 30 ngày, làm tròn 2 chữ số thập phân. Tỷ lệ cao nhất lên đầu; bằng nhau thì theo tên chi nhánh.
```sql
SELECT b.name, round(100.0 * sum(s.outstanding) FILTER (WHERE s.dpd > 30) / sum(s.outstanding), 2)
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
JOIN branches b ON b.id = l.branch_id
WHERE s.month_end = '2026-10-31'
GROUP BY b.name
HAVING sum(s.outstanding) FILTER (WHERE s.dpd > 30) > 0.03 * sum(s.outstanding)
ORDER BY 2 DESC, 1
```

## Step 3: Điểm tín dụng lúc duyệt và nợ xấu
Các khoản còn dư nợ cuối tháng 10/2026, theo dải điểm tín dụng của hồ sơ lúc xét duyệt (1 khi dưới 600, 2 khi từ 600 đến 699, 3 khi từ 700 trở lên): dải điểm, số khoản và tỷ lệ phần trăm số khoản đang quá hạn trên 30 ngày, làm tròn 2 chữ số thập phân. Dải 1 lên đầu.
```sql
SELECT CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band, count(*), round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2)
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
JOIN applications a ON a.id = l.application_id
WHERE s.month_end = '2026-10-31'
GROUP BY 1
ORDER BY 1
```

## Hints
1. Bước 1 và 3 chia dòng vào nhóm theo luật rồi gom theo nhóm đó. Bước 2 đi qua ba bảng, tính tỷ lệ bằng hai phép cộng có điều kiện khác nhau, rồi lọc nhóm sau khi gom. Bước 3 lấy điểm từ hồ sơ của khoản vay.
2. Bước 1: `GROUP BY 1`. Bước 2: `sum(s.outstanding) FILTER (WHERE s.dpd > 30)`, `HAVING ... > 0.03 * sum(s.outstanding)`. Bước 3: nối `applications a` qua `a.id = l.application_id`; viết `100.0 *` để phép chia ra số thập phân.
3. `SELECT CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END, count(*), round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2) FROM ... GROUP BY 1 ORDER BY 1`

# EN
This is your promotion review. The credit committee meets in early November and I need the end-of-October bad-debt report: the loan book by bucket, the worrying branches, and whether the credit score at approval warned us of the risk. Get all three tables right and you take another step in your career.

## Step 1: The loan book by bucket
The end-of-October 2026 picture, per bucket (0 when not past due, 1 for 1 to 30 days past due, 2 for 31 to 90 days, 3 for more than 90 days): bucket, number of loans and total balance. Bucket 0 first.

## Step 2: Branches with bad debt above 3%
At the end of October 2026, the branches whose balance over 30 days past due is more than 3% of that branch's own total balance: branch name and the percentage of balance over 30 days past due, rounded to 2 decimals. Highest share first; on a tie, by branch name.

## Step 3: Credit score at approval and bad debt
The loans with a balance at the end of October 2026, per score band of the application at approval (1 below 600, 2 from 600 to 699, 3 from 700 up): score band, number of loans and the percentage of those loans over 30 days past due, rounded to 2 decimals. Band 1 first.

## Hints
1. Steps 1 and 3 sort rows into groups by rules and then group by them. Step 2 goes through three tables, computes the share with two different conditional sums, then filters groups after grouping. Step 3 takes the score from the loan's application.
2. Step 1: `GROUP BY 1`. Step 2: `sum(s.outstanding) FILTER (WHERE s.dpd > 30)`, `HAVING ... > 0.03 * sum(s.outstanding)`. Step 3: join `applications a` through `a.id = l.application_id`; write `100.0 *` so the division gives decimals.
3. `SELECT CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END, count(*), round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2) FROM ... GROUP BY 1 ORDER BY 1`
