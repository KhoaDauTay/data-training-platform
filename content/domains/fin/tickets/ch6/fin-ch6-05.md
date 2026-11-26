---
id: fin-ch6-05
chapter: 6
title: "Đánh giá thăng tiến: báo cáo rủi ro quý cho ban điều hành"
title_en: "Promotion review: the quarterly risk report for the board"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 3
beat: boss
requires: [select, where, window_rank, multi_cte, anti_join, window_lag, cte, conditional_agg, coalesce, multi_join, left_join, join, aggregate, group_by, order_by]
grants: []
tables: [loan_snapshots, loans, branches, applications, collection_calls]
ordered: true
columns:
  - [{ vi: "Tên chi nhánh", en: "Branch name" }, { vi: "Cuối tháng", en: "Month end" }, { vi: "Tỷ lệ dư nợ quá hạn trên 30 ngày (%)", en: "Share of balance over 30 days past due (%)" }, { vi: "Thay đổi so với cuối tháng trước (điểm %)", en: "Change from the previous month end (points)" }]
  - [{ vi: "Vùng", en: "Region" }, { vi: "Tên chi nhánh", en: "Branch name" }, { vi: "Tỷ lệ dư nợ quá hạn trên 30 ngày (%)", en: "Share of balance over 30 days past due (%)" }, { vi: "Hạng trong vùng", en: "Rank in the region" }]
  - [{ vi: "Mã khoản vay", en: "Loan code" }, { vi: "Số ngày quá hạn", en: "Days past due" }]
conclusion:
  question: "Theo ba bước, nợ quá hạn đang tăng ở đâu, và vì đâu?"
  options:
    - "Ở Quang Ngai: các khoản qua kênh đối tác giải ngân tháng 3 đến 5/2026, nhiều khoản quá hạn mà chưa được gọi"
    - "Ở Da Nang: chi nhánh lớn nhất nên có nhiều khoản quá hạn nhất"
    - "Ở mọi chi nhánh như nhau, sau mùa Tết"
    - "Ở Lien Chieu và Quy Nhon, vì cohort Tết"
  answer: 0
conclusion_en:
  question: "Taking the three steps together, where are arrears rising, and why?"
  options:
    - "In Quang Ngai: loans from the partner channel paid out from March to May 2026, many overdue and never called"
    - "In Da Nang: the largest branch simply has the most overdue loans"
    - "Equally at every branch, after the Tet season"
    - "In Lien Chieu and Quy Nhon, because of the Tet cohorts"
---
Đây là buổi đánh giá thăng tiến cuối cùng của năm. Ban điều hành họp quý: tỷ lệ quá hạn chung vẫn ổn, nhưng mình nghe nói một chi nhánh đang xấu đi nhanh. Mình cần ba bảng: xu hướng của từng chi nhánh, xếp hạng trong vùng, và danh sách khoản cần hành động ngay. Làm đúng cả ba là bạn lên chuyên viên rủi ro cao cấp.

## Step 1: Xu hướng nợ xấu từng chi nhánh
Mỗi chi nhánh, ở cuối mỗi tháng từ 7/2026 đến 10/2026: tỷ lệ phần trăm dư nợ quá hạn trên 30 ngày trên tổng dư nợ của chi nhánh (làm tròn 2 chữ số thập phân; chi nhánh không có khoản quá hạn thì tỷ lệ là 0), và mức thay đổi so với cuối tháng trước tính bằng điểm phần trăm (tháng 7 so với cuối tháng 6). Xếp theo tên chi nhánh, rồi theo tháng.
```sql
WITH r AS (
  SELECT b.name, s.month_end, round(100.0 * COALESCE(sum(s.outstanding) FILTER (WHERE s.dpd > 30), 0) / sum(s.outstanding), 2) AS ratio
  FROM loan_snapshots s
  JOIN loans l ON l.id = s.loan_id
  JOIN branches b ON b.id = l.branch_id
  WHERE s.month_end BETWEEN '2026-06-30' AND '2026-10-31'
  GROUP BY b.name, s.month_end
), d AS (
  SELECT name, month_end, ratio, ratio - LAG(ratio) OVER (PARTITION BY name ORDER BY month_end) AS change
  FROM r
)
SELECT name, month_end, ratio, change
FROM d
WHERE month_end >= '2026-07-31'
ORDER BY name, month_end
```

## Step 2: Hạng trong vùng cuối tháng 10
Cuối tháng 10/2026, hạng của từng chi nhánh trong vùng của nó theo tỷ lệ ở bước 1 (cao nhất hạng 1; bằng nhau cùng hạng, hạng sau nhảy cách): vùng, tên chi nhánh, tỷ lệ, hạng. Xếp theo vùng, rồi hạng, rồi tên chi nhánh.
```sql
WITH r AS (
  SELECT b.region, b.name, round(100.0 * COALESCE(sum(s.outstanding) FILTER (WHERE s.dpd > 30), 0) / sum(s.outstanding), 2) AS ratio
  FROM loan_snapshots s
  JOIN loans l ON l.id = s.loan_id
  JOIN branches b ON b.id = l.branch_id
  WHERE s.month_end = '2026-10-31'
  GROUP BY b.region, b.name
)
SELECT region, name, ratio, RANK() OVER (PARTITION BY region ORDER BY ratio DESC)
FROM r
ORDER BY region, 4, name
```

## Step 3: Khoản cần gọi ngay ở Quang Ngai
Chi nhánh Quang Ngai (mã chi nhánh 7): các khoản giải ngân từ tháng 3 đến hết tháng 5/2026 từ hồ sơ nộp qua kênh đối tác, đang quá hạn trên 30 ngày ở ảnh chụp cuối tháng 10/2026, mà cả tháng 10 chưa có cuộc gọi nhắc nợ nào: mã khoản vay và số ngày quá hạn. Quá hạn lâu nhất lên đầu; bằng nhau thì theo mã khoản vay.
```sql
SELECT l.code, s.dpd
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
JOIN applications a ON a.id = l.application_id
LEFT JOIN collection_calls c ON c.loan_id = l.id AND c.called_on >= '2026-10-01' AND c.called_on < '2026-11-01'
WHERE s.month_end = '2026-10-31' AND s.dpd > 30 AND l.branch_id = 7 AND a.channel = 'partner' AND l.disbursed_on >= '2026-03-01' AND l.disbursed_on < '2026-06-01' AND c.id IS NULL
ORDER BY s.dpd DESC, l.code
```

## Hints
1. Bước 1: một bước có tên tính tỷ lệ theo chi nhánh và tháng (tính cả cuối tháng 6), bước thứ hai lấy tháng trước của cùng chi nhánh, rồi mới bỏ tháng 6. Bước 2 xếp hạng trong từng vùng. Bước 3 là bài tìm khoản chưa ai gọi, thêm điều kiện về kênh và tháng giải ngân.
2. Bước 1: `COALESCE(sum(s.outstanding) FILTER (WHERE s.dpd > 30), 0)`, `ratio - LAG(ratio) OVER (PARTITION BY name ORDER BY month_end)`. Bước 2: `RANK() OVER (PARTITION BY region ORDER BY ratio DESC)`. Bước 3: nối `applications a` lấy `a.channel = 'partner'`, `LEFT JOIN collection_calls c ON ... AND c.called_on >= '2026-10-01' AND c.called_on < '2026-11-01'`, `c.id IS NULL`.
3. `WITH r AS (...), d AS (SELECT name, month_end, ratio, ratio - LAG(ratio) OVER (PARTITION BY name ORDER BY month_end) AS change FROM r) SELECT name, month_end, ratio, change FROM d WHERE ... ORDER BY name, month_end`

# EN
This is the last promotion review of the year. The board meets for the quarter: the overall arrears rate still looks fine, but I hear one branch is getting worse fast. I need three tables: each branch's trend, the ranking within each region, and the list of loans that need action now. Get all three right and you become a senior risk analyst.

## Step 1: Each branch's bad-debt trend
For each branch, at the end of every month from July to October 2026: the percentage of the branch's balance that is over 30 days past due (rounded to 2 decimals; a branch with no overdue loans has a share of 0), and the change from the previous month end in percentage points (July compared with the end of June). Sort by branch name, then by month.

## Step 2: Rank in the region at the end of October
At the end of October 2026, each branch's rank within its region by the share from step 1 (highest is rank 1; ties share a rank and the next rank skips): region, branch name, share, rank. Sort by region, then rank, then branch name.

## Step 3: Loans to call now in Quang Ngai
The Quang Ngai branch (branch number 7): the loans paid out from March to the end of May 2026 on applications made through the partner channel, over 30 days past due in the end-of-October 2026 snapshot, with no collection call at all during October: loan code and days past due. Longest past due first; on a tie, by loan code.

## Hints
1. Step 1: one named step computes the share per branch and month (including the end of June), a second step takes the same branch's previous month, and only then June is dropped. Step 2 ranks within each region. Step 3 is the find-loans-nobody-called task, with extra conditions on the channel and the disbursement month.
2. Step 1: `COALESCE(sum(s.outstanding) FILTER (WHERE s.dpd > 30), 0)`, `ratio - LAG(ratio) OVER (PARTITION BY name ORDER BY month_end)`. Step 2: `RANK() OVER (PARTITION BY region ORDER BY ratio DESC)`. Step 3: join `applications a` for `a.channel = 'partner'`, `LEFT JOIN collection_calls c ON ... AND c.called_on >= '2026-10-01' AND c.called_on < '2026-11-01'`, `c.id IS NULL`.
3. `WITH r AS (...), d AS (SELECT name, month_end, ratio, ratio - LAG(ratio) OVER (PARTITION BY name ORDER BY month_end) AS change FROM r) SELECT name, month_end, ratio, change FROM d WHERE ... ORDER BY name, month_end`
