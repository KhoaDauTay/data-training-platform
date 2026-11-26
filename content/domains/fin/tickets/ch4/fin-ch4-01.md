---
id: fin-ch4-01
chapter: 4
title: Một tháng giải ngân, từng quá hạn bao nhiêu
title_en: One disbursement month, how many ever fell behind
from: { name: Huỳnh Kim Ngân, dept: Risk }
difficulty: 3
beat: teach
format: worked
requires: [select, where, aggregate, group_by, left_join, conditional_agg]
grants: [cte]
tables: [loans, loan_snapshots]
columns:
  - { vi: "Số khoản giải ngân", en: "Loans paid out" }
  - { vi: "Số khoản từng quá hạn trên 30 ngày", en: "Loans ever over 30 days past due" }
  - { vi: "Tỷ lệ (%)", en: "Share (%)" }
variants:
  - { from: "2025-12-01", to: "2026-01-01", month: "12/2025", month_en: "December 2025" }
  - { from: "2026-01-01", to: "2026-02-01", month: "1/2026", month_en: "January 2026" }
  - { from: "2026-04-01", to: "2026-05-01", month: "4/2026", month_en: "April 2026" }
reflect:
  q: { vi: "Vì sao lấy số ngày quá hạn lớn nhất qua mọi ảnh chụp, không lấy ảnh chụp cuối tháng 10?", en: "Why take the largest days past due over every snapshot rather than the end-of-October one?" }
  options:
    - { vi: "Đề hỏi khoản đã từng quá hạn; khoản đã bị xóa nợ hay đã trả xong không còn trong ảnh chụp tháng 10", en: "The request asks whether a loan was ever past due; loans written off or repaid are no longer in the October snapshot" }
    - { vi: "Ảnh chụp tháng 10 chưa có số ngày quá hạn", en: "The October snapshot has no days past due yet" }
    - { vi: "Lấy lớn nhất chạy nhanh hơn", en: "Taking the largest runs faster" }
  answer: 0
  why: { vi: "\"Từng\" là bất kỳ lúc nào trong quá khứ. Khoản xấu nhất thường đã bị xóa nợ trước tháng 10, nên chỉ nhìn tháng 10 sẽ đếm thiếu.", en: "\"Ever\" means at any time in the past. The worst loans are often written off before October, so looking at October alone undercounts." }
wrong:
  - sql: "WITH oct AS (SELECT loan_id, dpd FROM loan_snapshots WHERE month_end = '2026-10-31') SELECT count(*), count(*) FILTER (WHERE o.dpd > 30), round(100.0 * count(*) FILTER (WHERE o.dpd > 30) / count(*), 2) FROM loans l LEFT JOIN oct o ON o.loan_id = l.id WHERE l.disbursed_on >= '{{from}}' AND l.disbursed_on < '{{to}}'"
    vi: "Bạn chỉ nhìn ảnh chụp cuối tháng 10. Đề hỏi khoản đã từng quá hạn trên 30 ngày ở bất kỳ cuối tháng nào; khoản đã bị xóa nợ không còn trong ảnh chụp tháng 10."
    en: "You only looked at the end-of-October snapshot. The request asks about loans ever over 30 days past due at any month end; written-off loans are no longer in the October snapshot."
---
Hội đồng tín dụng bắt đầu hỏi về các tháng giải ngân. Câu hỏi đầu tiên đơn giản: trong một tháng giải ngân, bao nhiêu khoản đã từng rơi vào quá hạn trên 30 ngày, ở bất kỳ ảnh chụp cuối tháng nào?

Câu truy vấn này có hai bước: tìm mức quá hạn tệ nhất của từng khoản, rồi đếm. Mình gửi kèm một ví dụ mẫu về cách đặt tên cho một bước.

## Task
Các khoản giải ngân trong tháng {{month}}: bao nhiêu khoản, bao nhiêu khoản từng quá hạn trên 30 ngày ở một cuối tháng nào đó, và tỷ lệ phần trăm của chúng, làm tròn 2 chữ số thập phân (chỉ làm tròn con số cuối). Một dòng duy nhất.

## Example
```sql
WITH per_channel AS (                                  -- ①
  SELECT channel, count(*) AS apps
  FROM applications
  WHERE applied_on >= '2026-10-01' AND applied_on < '2026-11-01'
  GROUP BY channel
)
SELECT channel, apps                                   -- ②
FROM per_channel                                       -- ③
WHERE apps > 100
```
Ví dụ: tháng 10/2026, kênh nào nhận hơn 100 hồ sơ?

① Bước có tên: một truy vấn con đặt trước, đếm hồ sơ theo kênh.

② Truy vấn chính đọc các cột của bước đó như đọc một bảng.

③ Lọc trên con số đã đếm ở bước trước.

## Hints
1. Bước một: với mỗi khoản vay, số ngày quá hạn lớn nhất qua mọi ảnh chụp. Bước hai: nối các khoản giải ngân trong tháng với bước một (giữ cả khoản chưa có ảnh chụp nào) rồi đếm có điều kiện.
2. `WITH worst AS (SELECT loan_id, max(dpd) AS max_dpd FROM loan_snapshots GROUP BY loan_id)`, rồi `FROM loans l LEFT JOIN worst w ON w.loan_id = l.id`. Đếm `count(*) FILTER (WHERE w.max_dpd > 30)`; tỷ lệ `round(100.0 * ... / count(*), 2)`.
3. `WITH worst AS (...) SELECT count(*), count(*) FILTER (WHERE w.max_dpd > 30), round(100.0 * count(*) FILTER (WHERE w.max_dpd > 30) / count(*), 2) FROM loans l LEFT JOIN worst w ON ... WHERE ...`

## Solution
```sql
WITH worst AS (
  SELECT loan_id, max(dpd) AS max_dpd
  FROM loan_snapshots
  GROUP BY loan_id
)
SELECT count(*), count(*) FILTER (WHERE w.max_dpd > 30), round(100.0 * count(*) FILTER (WHERE w.max_dpd > 30) / count(*), 2)
FROM loans l
LEFT JOIN worst w ON w.loan_id = l.id
WHERE l.disbursed_on >= '{{from}}' AND l.disbursed_on < '{{to}}'
```

# EN
The credit committee has started asking about disbursement months. The first question is simple: among the loans paid out in one month, how many ever fell over 30 days past due, at any month-end snapshot?

This query has two steps: find each loan's worst arrears, then count. I am sending a worked example on how to give a step a name.

## Task
The loans paid out in {{month_en}}: how many there are, how many were ever over 30 days past due at some month end, and their percentage, rounded to 2 decimals (round only the final figure). A single row.

## Example
Example: in October 2026, which channels received more than 100 applications?

① A named step: a query placed first, counting applications per channel.

② The main query reads that step's columns like a table.

③ It filters on the figure counted in the step before.

## Hints
1. Step one: for each loan, the largest days past due over every snapshot. Step two: join the loans paid out in the month with step one (keeping loans that have no snapshot yet), then count with a condition.
2. `WITH worst AS (SELECT loan_id, max(dpd) AS max_dpd FROM loan_snapshots GROUP BY loan_id)`, then `FROM loans l LEFT JOIN worst w ON w.loan_id = l.id`. Count with `count(*) FILTER (WHERE w.max_dpd > 30)`; the share is `round(100.0 * ... / count(*), 2)`.
3. `WITH worst AS (...) SELECT count(*), count(*) FILTER (WHERE w.max_dpd > 30), round(100.0 * count(*) FILTER (WHERE w.max_dpd > 30) / count(*), 2) FROM loans l LEFT JOIN worst w ON ... WHERE ...`
