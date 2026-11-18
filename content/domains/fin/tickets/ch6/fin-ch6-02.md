---
id: fin-ch6-02
chapter: 6
title: Gọi nhắc nợ có làm tiền về không
title_en: Do collection calls bring money in
from: { name: Mạc Văn Toàn, dept: Collections }
difficulty: 3
beat: develop
format: faded
requires: [select, where, cte, join, left_join, aggregate, group_by, date_math]
grants: [multi_cte]
tables: [collection_calls, repayments]
columns:
  - { vi: "Kết quả cuộc gọi", en: "Call outcome" }
  - { vi: "Số cuộc gọi", en: "Calls" }
  - { vi: "Số cuộc có tiền về trong 7 ngày", en: "Calls followed by a payment within 7 days" }
starter: |
  WITH calls AS (
    SELECT id, loan_id, called_on, outcome
    FROM collection_calls
    WHERE called_on >= '{{from}}' AND called_on < '{{to}}'
  ), paid AS (
    SELECT DISTINCT c.id
    FROM calls c
    JOIN repayments r ON r.loan_id = c.loan_id AND ___
  )
  SELECT c.outcome, count(*), ___
  FROM calls c
  LEFT JOIN paid p ON p.id = c.id
  GROUP BY c.outcome
variants:
  - { from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026" }
  - { from: "2026-09-01", to: "2026-10-01", month: "9/2026", month_en: "September 2026" }
  - { from: "2026-08-01", to: "2026-09-01", month: "8/2026", month_en: "August 2026" }
reflect:
  q: { vi: "Vì sao bước thứ hai lấy mỗi cuộc gọi một lần?", en: "Why does the second step keep each call only once?" }
  options:
    - { vi: "Một khoản có thể trả nhiều kỳ trong 7 ngày; không bỏ trùng thì một cuộc gọi bị đếm nhiều lần", en: "A loan can pay several instalments within 7 days; without removing duplicates one call would be counted several times" }
    - { vi: "Để truy vấn chạy nhanh hơn", en: "To make the query faster" }
    - { vi: "Vì cuộc gọi không có mã riêng", en: "Because calls have no number of their own" }
  answer: 0
  why: { vi: "Ghép một cuộc gọi với mọi lần trả tiền trong khoảng có thể ra nhiều dòng. Chia báo cáo thành từng bước có tên thì dễ kiểm mỗi bước trả về đúng một dòng cho mỗi cuộc gọi.", en: "Joining one call with every payment in the window can give several rows. Splitting the report into named steps makes it easy to check that each step returns exactly one row per call." }
wrong:
  - sql: "WITH calls AS (SELECT id, loan_id, called_on, outcome FROM collection_calls WHERE called_on >= '{{from}}' AND called_on < '{{to}}'), paid AS (SELECT DISTINCT c.id FROM calls c JOIN repayments r ON r.loan_id = c.loan_id AND r.paid_on >= c.called_on AND r.paid_on < c.called_on + 7) SELECT c.outcome, count(*), count(p.id) FROM calls c LEFT JOIN paid p ON p.id = c.id GROUP BY c.outcome"
    vi: "Thiếu các cuộc có tiền về đúng ngày thứ 7: khoảng 7 ngày gồm cả ngày gọi lẫn ngày thứ 7 sau đó, nên mốc cuối là nhỏ hơn hoặc bằng."
    en: "Calls followed by a payment on day 7 itself are missing: the 7-day window includes both the call day and the seventh day after it, so the upper bound is less than or equal."
---
Đội mình gọi nhắc mỗi ngày, và mỗi cuộc gọi được ghi kết quả: khách hứa trả, không nghe máy, từ chối, hay báo đã trả. Mình muốn biết cuộc gọi loại nào thật sự mang tiền về.

Câu truy vấn trong editor đã có hai bước có tên: cuộc gọi trong tháng, và các cuộc gọi có tiền về sau đó. Chỗ trống đầu là khoảng 7 ngày; chỗ thứ hai là cột đếm cuộc gọi có tiền về.

## Task
Các cuộc gọi nhắc nợ trong tháng {{month}}, theo kết quả cuộc gọi: kết quả, số cuộc gọi, và số cuộc mà khoản vay có tiền về trong 7 ngày kể từ ngày gọi (tính cả ngày gọi và ngày thứ 7 sau đó). Thứ tự dòng không quan trọng.

## Hints
1. Bước thứ hai giữ mỗi cuộc gọi có ít nhất một lần trả tiền trong khoảng từ ngày gọi tới 7 ngày sau. Truy vấn chính ghép trái mọi cuộc gọi với bước đó, rồi đếm những cuộc ghép được.
2. Chỗ trống đầu: `r.paid_on BETWEEN c.called_on AND c.called_on + 7` (gồm cả hai đầu). Chỗ trống thứ hai: `count(p.id)`, chỉ đếm ô không trống.
3. `... JOIN repayments r ON r.loan_id = c.loan_id AND r.paid_on BETWEEN c.called_on AND c.called_on + 7) SELECT c.outcome, count(*), count(p.id) FROM calls c LEFT JOIN paid p ON p.id = c.id GROUP BY c.outcome`

## Solution
```sql
WITH calls AS (
  SELECT id, loan_id, called_on, outcome
  FROM collection_calls
  WHERE called_on >= '{{from}}' AND called_on < '{{to}}'
), paid AS (
  SELECT DISTINCT c.id
  FROM calls c
  JOIN repayments r ON r.loan_id = c.loan_id AND r.paid_on BETWEEN c.called_on AND c.called_on + 7
)
SELECT c.outcome, count(*), count(p.id)
FROM calls c
LEFT JOIN paid p ON p.id = c.id
GROUP BY c.outcome
```

# EN
My team makes reminder calls every day, and every call has its outcome recorded: the customer promised to pay, did not answer, refused, or said they had paid. I want to know which kind of call really brings money in.

The query in the editor already has two named steps: the calls of the month, and the calls followed by a payment. The first blank is the 7-day window; the second is the column counting the calls followed by a payment.

## Task
The collection calls made in {{month_en}}, per call outcome: the outcome, the number of calls, and the number of calls whose loan received a payment within 7 days of the call (counting both the call day and the seventh day after it). Row order does not matter.

## Hints
1. The second step keeps every call with at least one payment between the call day and 7 days later. The main query left joins every call with that step, then counts the calls that matched.
2. First blank: `r.paid_on BETWEEN c.called_on AND c.called_on + 7` (both ends included). Second blank: `count(p.id)`, which only counts cells that are not empty.
3. `... JOIN repayments r ON r.loan_id = c.loan_id AND r.paid_on BETWEEN c.called_on AND c.called_on + 7) SELECT c.outcome, count(*), count(p.id) FROM calls c LEFT JOIN paid p ON p.id = c.id GROUP BY c.outcome`
