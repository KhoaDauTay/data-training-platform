---
id: fin-ch7-04
chapter: 7
title: Tỷ lệ duyệt của từng kênh, quý theo quý
title_en: Each channel's approval rate, quarter by quarter
from: { name: Phùng Đức Lâm, dept: Sales }
difficulty: 3
beat: rest
requires: [select, where, date_bucket, conditional_agg, aggregate, group_by, order_by]
grants: []
tables: [applications]
ordered: true
columns:
  - { vi: "Kênh nộp hồ sơ", en: "Application channel" }
  - { vi: "Quý (ngày đầu quý)", en: "Quarter (first day)" }
  - { vi: "Số hồ sơ", en: "Applications" }
  - { vi: "Số hồ sơ được duyệt", en: "Approved applications" }
  - { vi: "Tỷ lệ duyệt (%)", en: "Approval rate (%)" }
variants:
  - { from: "2025-10-01", to: "2026-10-01", first: "4/2025", last: "3/2026", first_en: "Q4 2025", last_en: "Q3 2026" }
  - { from: "2025-07-01", to: "2026-07-01", first: "3/2025", last: "2/2026", first_en: "Q3 2025", last_en: "Q2 2026" }
  - { from: "2025-04-01", to: "2026-04-01", first: "2/2025", last: "1/2026", first_en: "Q2 2025", last_en: "Q1 2026" }
reflect:
  q: { vi: "Vì sao tính tỷ lệ trên mọi hồ sơ nộp, kể cả hồ sơ khách tự hủy?", en: "Why compute the rate over every application, the ones the customer cancelled included?" }
  options:
    - { vi: "Vì câu hỏi là \"trong mọi hồ sơ một kênh mang về, bao nhiêu thành khoản vay\"; bỏ hồ sơ hủy sẽ làm kênh nhiều hồ sơ hủy trông tốt hơn thật", en: "Because the question is \"of every application a channel brings in, how many become loans\"; dropping cancelled ones makes a channel with many cancellations look better than it is" }
    - { vi: "Vì hồ sơ hủy luôn là hồ sơ bị từ chối", en: "Because a cancelled application is always a rejected one" }
    - { vi: "Không có lý do, bỏ hay giữ đều ra cùng số", en: "No reason, dropping or keeping them gives the same figure" }
  answer: 0
  why: { vi: "Mẫu số quyết định câu hỏi. Ghi rõ mẫu số là gì trước khi so các kênh với nhau.", en: "The denominator decides the question. Say what the denominator is before comparing channels." }
wrong:
  - sql: "SELECT channel, date_trunc('quarter', applied_on)::date, count(*), count(*) FILTER (WHERE decision = 'approved'), round(100.0 * count(*) FILTER (WHERE decision = 'approved') / count(*), 1) FROM applications WHERE applied_on >= '{{from}}' AND applied_on < '{{to}}' AND decision <> 'cancelled' GROUP BY channel, 2 ORDER BY channel, 2"
    vi: "Bạn đã bỏ hồ sơ khách tự hủy khỏi mẫu số. Đề tính trên mọi hồ sơ nộp."
    en: "You dropped the applications the customer cancelled from the denominator. The request counts every application."
  - sql: "SELECT channel, date_trunc('month', applied_on)::date, count(*), count(*) FILTER (WHERE decision = 'approved'), round(100.0 * count(*) FILTER (WHERE decision = 'approved') / count(*), 1) FROM applications WHERE applied_on >= '{{from}}' AND applied_on < '{{to}}' GROUP BY channel, 2 ORDER BY channel, 2"
    vi: "Bạn đang gom theo tháng. Đề cần mỗi quý một dòng."
    en: "You are grouping by month. The request wants one row per quarter."
---
Ban kinh doanh lo luật duyệt mới sẽ làm số khoản vay tụt. Để sau này so trước và sau, mình cần mốc hiện tại: mỗi kênh nộp hồ sơ duyệt được bao nhiêu phần trăm, quý theo quý.

## Task
Hồ sơ nộp từ quý {{first}} đến hết quý {{last}}. Mỗi kênh nộp hồ sơ, mỗi quý (ghi bằng ngày đầu quý): số hồ sơ, số hồ sơ được duyệt, và tỷ lệ duyệt tính trên mọi hồ sơ nộp, kể cả hồ sơ khách tự hủy (phần trăm, làm tròn 1 chữ số thập phân). Xếp theo kênh, rồi theo quý.

## Hints
1. Một bảng hồ sơ: đưa ngày nộp về đầu quý, gom theo kênh và quý, đếm có điều kiện những hồ sơ được duyệt.
2. `date_trunc('quarter', applied_on)::date`, `count(*) FILTER (WHERE decision = 'approved')`, `GROUP BY channel, 2`.
3. `SELECT channel, date_trunc('quarter', applied_on)::date, count(*), count(*) FILTER (WHERE decision = 'approved'), round(100.0 * ... / count(*), 1) FROM applications WHERE ... GROUP BY channel, 2 ORDER BY channel, 2`

## Solution
```sql
SELECT channel, date_trunc('quarter', applied_on)::date, count(*),
       count(*) FILTER (WHERE decision = 'approved'),
       round(100.0 * count(*) FILTER (WHERE decision = 'approved') / count(*), 1)
FROM applications
WHERE applied_on >= '{{from}}' AND applied_on < '{{to}}'
GROUP BY channel, 2
ORDER BY channel, 2
```

# EN
The sales team worries the new approval rule will make the number of loans drop. To compare before and after later, I need today's baseline: what percentage of each channel's applications gets approved, quarter by quarter.

## Task
Applications made from {{first_en}} to the end of {{last_en}}. For each application channel and each quarter (written as the quarter's first day): the number of applications, the number approved, and the approval rate over every application, the ones the customer cancelled included (percentage, rounded to 1 decimal). Sort by channel, then by quarter.

## Hints
1. One table of applications: bring the application date to the start of its quarter, group by channel and quarter, and count the approved ones conditionally.
2. `date_trunc('quarter', applied_on)::date`, `count(*) FILTER (WHERE decision = 'approved')`, `GROUP BY channel, 2`.
3. `SELECT channel, date_trunc('quarter', applied_on)::date, count(*), count(*) FILTER (WHERE decision = 'approved'), round(100.0 * ... / count(*), 1) FROM applications WHERE ... GROUP BY channel, 2 ORDER BY channel, 2`
