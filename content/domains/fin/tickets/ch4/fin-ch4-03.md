---
id: fin-ch4-03
chapter: 4
title: Khoản ở nhóm 1 tháng trước, tháng này ở đâu
title_en: Where last month's bucket 1 loans went
from: { name: Mạc Văn Toàn, dept: Collections }
difficulty: 3
beat: twist
trap: true
requires: [select, where, aggregate, group_by, order_by, case_when, cte]
grants: [window_lag]
tables: [loan_snapshots]
ordered: true
columns:
  - { vi: "Nhóm nợ tháng sau (0 đến 3)", en: "Bucket next month (0 to 3)" }
  - { vi: "Số khoản", en: "Loans" }
variants:
  - { me: "2026-10-31", prev: "9/2026", month: "10/2026", prev_en: "September 2026", month_en: "October 2026" }
  - { me: "2026-09-30", prev: "8/2026", month: "9/2026", prev_en: "August 2026", month_en: "September 2026" }
  - { me: "2026-08-31", prev: "7/2026", month: "8/2026", prev_en: "July 2026", month_en: "August 2026" }
reflect:
  q: { vi: "Nếu lấy \"dòng trước\" mà không chia theo từng khoản vay thì sai ở đâu?", en: "If you take \"the previous row\" without splitting by loan, what goes wrong?" }
  options:
    - { vi: "Dòng trước có thể là ảnh chụp của một khoản vay khác, nên nhóm tháng trước bị lấy nhầm", en: "The previous row can be a snapshot of another loan, so last month's bucket is taken from the wrong loan" }
    - { vi: "Không sai gì, vì đã sắp theo cuối tháng", en: "Nothing, it is already sorted by month end" }
    - { vi: "Truy vấn báo lỗi", en: "The query fails" }
  answer: 0
  why: { vi: "Hàm lấy dòng trước chỉ nhìn thứ tự các dòng. Chia theo khoản vay thì dòng trước luôn là tháng trước của cùng khoản đó.", en: "The previous-row function only looks at row order. Splitting by loan makes the previous row always the same loan's previous month." }
wrong:
  - sql: "WITH b AS (SELECT loan_id, month_end, CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd <= 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END AS bucket FROM loan_snapshots s), l AS (SELECT loan_id, month_end, bucket, LAG(bucket) OVER (ORDER BY month_end) AS prev FROM b) SELECT bucket, count(*) FROM l WHERE month_end = '{{me}}' AND prev = 1 GROUP BY bucket ORDER BY bucket"
    vi: "\"Tháng trước\" đang lấy từ dòng liền trước trong cả bảng, thường là một khoản vay khác. Lấy dòng trước trong từng khoản vay: chia theo khoản vay rồi mới sắp theo cuối tháng."
    en: "\"Last month\" is taken from the row just before in the whole table, usually another loan. Take the previous row within each loan: split by loan, then sort by month end."
---
Đội mình gọi nhắc mọi khoản vừa chớm quá hạn (nhóm 1). Mình muốn biết việc gọi có hiệu quả không: sang tháng sau các khoản đó về lại đúng hạn, vẫn ở nhóm 1, hay trượt sâu hơn?

Ảnh chụp có một dòng cho mỗi khoản ở mỗi cuối tháng. Cần so mỗi khoản với chính nó ở tháng trước.

## Task
Các khoản ở nhóm nợ 1 (quá hạn từ 1 đến 30 ngày) vào cuối tháng {{prev}}: cuối tháng {{month}} chúng nằm ở nhóm nào? Mỗi nhóm nợ một dòng (0 khi không quá hạn, 1 khi từ 1 đến 30 ngày, 2 khi từ 31 đến 90 ngày, 3 khi trên 90 ngày): nhóm nợ và số khoản. Khoản không còn trong ảnh chụp tháng sau (đã trả xong hay đã xóa nợ) thì bỏ. Nhóm 0 lên đầu.

## Hints
1. Chia ảnh chụp vào nhóm nợ, rồi với mỗi dòng lấy nhóm nợ của cùng khoản vay ở dòng ngay trước theo thứ tự cuối tháng. Dòng trước phải là của cùng một khoản vay.
2. `LAG(bucket) OVER (PARTITION BY loan_id ORDER BY month_end)` lấy nhóm của tháng trước trong từng khoản. Đặt nhóm nợ ở bước `b`, dòng trước ở bước `l`, rồi lọc `prev = 1`.
3. `WITH b AS (SELECT loan_id, month_end, CASE ... END AS bucket FROM loan_snapshots s), l AS (SELECT loan_id, month_end, bucket, LAG(bucket) OVER (...) AS prev FROM b) SELECT bucket, count(*) FROM l WHERE ... GROUP BY bucket ORDER BY bucket`

## Solution
```sql
WITH b AS (
  SELECT loan_id, month_end, CASE WHEN s.dpd = 0 THEN 0 WHEN s.dpd <= 30 THEN 1 WHEN s.dpd <= 90 THEN 2 ELSE 3 END AS bucket
  FROM loan_snapshots s
), l AS (
  SELECT loan_id, month_end, bucket, LAG(bucket) OVER (PARTITION BY loan_id ORDER BY month_end) AS prev
  FROM b
)
SELECT bucket, count(*)
FROM l
WHERE month_end = '{{me}}' AND prev = 1
GROUP BY bucket
ORDER BY bucket
```

# EN
My team calls every loan that has just slipped past due (bucket 1). I want to know whether the calls work: the next month, are those loans back on time, still in bucket 1, or sliding further?

The snapshot has one row per loan per month end. Each loan has to be compared with itself the month before.

## Task
The loans in bucket 1 (1 to 30 days past due) at the end of {{prev_en}}: which bucket are they in at the end of {{month_en}}? One row per bucket (0 when not past due, 1 for 1 to 30 days, 2 for 31 to 90 days, 3 for more than 90 days): bucket and number of loans. Leave out loans that are no longer in the next month's snapshot (repaid or written off). Bucket 0 first.

## Hints
1. Sort the snapshot rows into buckets, then for each row take the bucket of the same loan on the row just before in month-end order. The previous row must belong to the same loan.
2. `LAG(bucket) OVER (PARTITION BY loan_id ORDER BY month_end)` takes last month's bucket within each loan. Put the bucket in step `b`, the previous row in step `l`, then filter `prev = 1`.
3. `WITH b AS (SELECT loan_id, month_end, CASE ... END AS bucket FROM loan_snapshots s), l AS (SELECT loan_id, month_end, bucket, LAG(bucket) OVER (...) AS prev FROM b) SELECT bucket, count(*) FROM l WHERE ... GROUP BY bucket ORDER BY bucket`
