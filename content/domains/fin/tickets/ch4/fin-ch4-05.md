---
id: fin-ch4-05
chapter: 4
title: "Đánh giá thăng tiến: cohort mùa Tết"
title_en: "Promotion review: the Tet cohorts"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 3
beat: boss
adv: [b2]
requires: [select, where, cte, date_bucket, window_lag, conditional_agg, left_join, aggregate, group_by, order_by]
grants: []
tables: [loans, loan_snapshots]
ordered: true
columns:
  - [{ vi: "Tháng giải ngân (ngày đầu tháng)", en: "Disbursement month (first day)" }, { vi: "Số khoản", en: "Loans" }]
  - [{ vi: "Tháng giải ngân (ngày đầu tháng)", en: "Disbursement month (first day)" }, { vi: "Tỷ lệ quá hạn trên 30 ngày ở tháng thứ ba (%)", en: "Share over 30 days past due in month three (%)" }]
  - [{ vi: "Cuối tháng", en: "Month end" }, { vi: "Tổng dư nợ", en: "Total balance" }, { vi: "Mức tăng so với cuối tháng trước", en: "Change from the previous month end" }]
conclusion:
  question: "Theo bước 2, những tháng giải ngân nào xấu nhất ở cuối tháng thứ ba?"
  options:
    - "Tháng 1 và tháng 2/2026, mùa Tết"
    - "Tháng 8 và tháng 9/2025"
    - "Tháng 5 và tháng 6/2026"
    - "Mọi tháng gần như bằng nhau"
  answer: 0
conclusion_en:
  question: "According to step 2, which disbursement months look worst at the end of month three?"
  options:
    - "January and February 2026, the Tet season"
    - "August and September 2025"
    - "May and June 2026"
    - "All months look about the same"
---
Đây là buổi đánh giá thăng tiến của bạn. Hội đồng tín dụng hỏi thẳng: các khoản cho vay mùa Tết có xấu hơn bình thường không? Mình muốn trả lời bằng cohort giải ngân, tức theo dõi những khoản giải ngân cùng tháng khi chúng lớn tuổi dần. Làm đúng cả ba bảng là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Số khoản mỗi tháng giải ngân
Mỗi tháng giải ngân từ 8/2025 tới 6/2026: tháng (ghi bằng ngày đầu tháng) và số khoản giải ngân. Tháng sớm nhất lên đầu.
```sql
SELECT date_trunc('month', disbursed_on)::date AS month, count(*)
FROM loans
WHERE disbursed_on >= '2025-08-01' AND disbursed_on < '2026-07-01'
GROUP BY 1
ORDER BY 1
```

## Step 2: Quá hạn ở tháng thứ ba
Với mỗi tháng giải ngân đó: tỷ lệ phần trăm khoản đang quá hạn trên 30 ngày ở ảnh chụp cuối tháng thứ ba sau tháng giải ngân (giải ngân tháng 1 thì xem ảnh chụp cuối tháng 4). Khoản không có trong ảnh chụp đó (đã trả xong hay đã xóa nợ) tính là không quá hạn. Làm tròn 2 chữ số thập phân; tháng sớm nhất lên đầu.
```sql
WITH c AS (
  SELECT id, date_trunc('month', disbursed_on)::date AS cohort
  FROM loans
  WHERE disbursed_on >= '2025-08-01' AND disbursed_on < '2026-07-01'
)
SELECT c.cohort, round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2)
FROM c
LEFT JOIN loan_snapshots s ON s.loan_id = c.id AND s.month_end = (c.cohort + interval '4 month' - interval '1 day')::date
GROUP BY c.cohort
ORDER BY c.cohort
```

## Step 3: Dư nợ tăng bao nhiêu mỗi tháng
Tổng dư nợ toàn công ty ở cuối mỗi tháng từ 5/2026 đến 10/2026, và mức tăng so với cuối tháng ngay trước (tháng 5 so với cuối tháng 4). Tháng sớm nhất lên đầu.
```sql
WITH t AS (
  SELECT month_end, sum(outstanding) AS total
  FROM loan_snapshots
  WHERE month_end BETWEEN '2026-04-30' AND '2026-10-31'
  GROUP BY month_end
), d AS (
  SELECT month_end, total, total - LAG(total) OVER (ORDER BY month_end) AS change
  FROM t
)
SELECT month_end, total, change
FROM d
WHERE month_end >= '2026-05-31'
ORDER BY month_end
```

## Hints
1. Bước 1 gom theo tháng giải ngân. Bước 2 đặt tháng giải ngân của từng khoản thành một bước có tên, rồi ghép trái với ảnh chụp đúng cuối tháng thứ ba và đếm có điều kiện. Bước 3 cộng dư nợ theo tháng, lấy tháng trước bằng hàm lấy dòng trước; tính cả cuối tháng 4 để tháng 5 có số so sánh, rồi mới lọc bỏ tháng 4.
2. Bước 2: cuối tháng thứ ba là `(c.cohort + interval '4 month' - interval '1 day')::date`, đặt điều kiện ngày này trong `ON` của `LEFT JOIN`. Bước 3: `total - LAG(total) OVER (ORDER BY month_end)`. Bài nâng cao "Cohort và retention" giải thích cách theo dõi cohort.
3. `WITH t AS (SELECT month_end, sum(outstanding) AS total FROM loan_snapshots WHERE ... GROUP BY month_end), d AS (SELECT month_end, total, total - LAG(total) OVER (ORDER BY month_end) AS change FROM t) SELECT month_end, total, change FROM d WHERE ... ORDER BY month_end`

# EN
This is your promotion review. The credit committee asks straight out: were the loans made around Tet worse than usual? I want to answer with disbursement cohorts, following the loans paid out in the same month as they age. Get all three tables right and you take another step in your career.

## Step 1: Loans per disbursement month
Every disbursement month from August 2025 to June 2026: the month (as its first day) and the number of loans paid out. Earliest month first.

## Step 2: Arrears in month three
For each of those disbursement months: the percentage of loans over 30 days past due in the snapshot at the end of the third month after the disbursement month (loans paid out in January are read at the end of April). A loan missing from that snapshot (repaid or written off) counts as not past due. Round to 2 decimals; earliest month first.

## Step 3: How much the balance grows each month
The company's total balance at the end of each month from May to October 2026, and the change from the month end just before (May compared with the end of April). Earliest month first.

## Hints
1. Step 1 groups by disbursement month. Step 2 puts each loan's disbursement month in a named step, left joins it with the snapshot of exactly the end of month three and counts with a condition. Step 3 adds up the balance per month and takes the previous month with the previous-row function; include the end of April so May has something to compare with, and only then filter April out.
2. Step 2: the end of month three is `(c.cohort + interval '4 month' - interval '1 day')::date`; put this date condition in the `ON` of the `LEFT JOIN`. Step 3: `total - LAG(total) OVER (ORDER BY month_end)`. The advanced lesson "Cohorts and retention" explains how to follow a cohort.
3. `WITH t AS (SELECT month_end, sum(outstanding) AS total FROM loan_snapshots WHERE ... GROUP BY month_end), d AS (SELECT month_end, total, total - LAG(total) OVER (ORDER BY month_end) AS change FROM t) SELECT month_end, total, change FROM d WHERE ... ORDER BY month_end`
