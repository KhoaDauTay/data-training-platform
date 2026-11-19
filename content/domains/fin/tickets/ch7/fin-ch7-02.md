---
id: fin-ch7-02
chapter: 7
title: Cách trả nào hay trễ nhất?
title_en: Which way of paying is late most often?
from: { name: Mạc Văn Toàn, dept: Collections }
difficulty: 4
beat: develop
format: faded
requires: [select, where, join, conditional_agg, aggregate, group_by, order_by]
grants: []
tables: [repayments, schedules]
ordered: true
columns:
  - { vi: "Cách trả", en: "Payment method" }
  - { vi: "Số kỳ đã trả", en: "Instalments paid" }
  - { vi: "Số kỳ trả trễ", en: "Instalments paid late" }
  - { vi: "Tỷ lệ trả trễ (%)", en: "Share paid late (%)" }
starter: |
  SELECT r.method, count(*), count(*) FILTER (WHERE ___),
         round(100.0 * count(*) FILTER (WHERE ___) / count(*), 1) AS late_pct
  FROM repayments r
  JOIN schedules s ON s.id = r.schedule_id
  WHERE s.due_on >= '{{from}}' AND s.due_on < '{{to}}'
  GROUP BY r.method
  ORDER BY ___
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026" }
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026" }
reflect:
  q: { vi: "Kỳ trả đúng vào ngày đến hạn có tính là trễ không?", en: "Is an instalment paid on its due date late?" }
  options:
    - { vi: "Không: chỉ trả sau ngày đến hạn mới là trễ", en: "No: only paying after the due date is late" }
    - { vi: "Có: phải trả trước ngày đến hạn", en: "Yes: it must be paid before the due date" }
    - { vi: "Tùy cách trả", en: "It depends on the payment method" }
  answer: 0
  why: { vi: "Ngày đến hạn là ngày cuối cùng còn đúng hạn. Lấy nhầm \"từ ngày đến hạn\" sẽ biến mọi khoản trích nợ tự động thành trễ.", en: "The due date is the last day that is still on time. Taking \"from the due date\" by mistake turns every automatic debit into a late payment." }
wrong:
  - sql: "SELECT r.method, count(*), count(*) FILTER (WHERE r.paid_on >= s.due_on), round(100.0 * count(*) FILTER (WHERE r.paid_on >= s.due_on) / count(*), 1) AS late_pct FROM repayments r JOIN schedules s ON s.id = r.schedule_id WHERE s.due_on >= '{{from}}' AND s.due_on < '{{to}}' GROUP BY r.method ORDER BY late_pct DESC, r.method"
    vi: "Bạn đang tính cả kỳ trả đúng ngày đến hạn là trễ. Trễ là trả sau ngày đến hạn."
    en: "You count instalments paid on their due date as late. Late means paid after the due date."
  - sql: "SELECT r.method, count(*), count(*) FILTER (WHERE r.paid_on > s.due_on), round(100.0 * count(*) FILTER (WHERE r.paid_on > s.due_on) / count(*), 1) AS late_pct FROM repayments r JOIN schedules s ON s.id = r.schedule_id WHERE r.paid_on >= '{{from}}' AND r.paid_on < '{{to}}' GROUP BY r.method ORDER BY late_pct DESC, r.method"
    vi: "Bạn đang chọn theo ngày trả. Đề hỏi các kỳ đến hạn trong quý: lọc theo ngày đến hạn."
    en: "You pick instalments by payment date. The request asks about instalments due in the quarter: filter on the due date."
---
Mình đang tính đề xuất bắt buộc trích nợ tự động cho khoản vay mới năm 2027. Trước khi đưa lên hội đồng, mình cần số liệu: mỗi cách trả, bao nhiêu phần trăm kỳ trả bị trễ? Khung câu truy vấn đã có sẵn, bạn điền vào chỗ trống.

## Task
Các kỳ đến hạn trong quý {{q}} đã được trả. Mỗi cách trả: số kỳ đã trả, số kỳ trả sau ngày đến hạn, và tỷ lệ phần trăm kỳ trả trễ (làm tròn 1 chữ số thập phân). Tỷ lệ trễ cao nhất lên đầu; bằng nhau thì theo cách trả.

## Hints
1. Ghép kỳ trả với lịch trả để có ngày đến hạn, đếm có điều kiện những kỳ trả sau ngày đến hạn, rồi chia cho số kỳ đã trả.
2. Hai chỗ trống đầu cùng một điều kiện: `r.paid_on > s.due_on`. Chỗ trống cuối: `late_pct DESC, r.method`.
3. `SELECT r.method, count(*), count(*) FILTER (WHERE r.paid_on > s.due_on), round(100.0 * count(*) FILTER (WHERE r.paid_on > s.due_on) / count(*), 1) AS late_pct FROM ... GROUP BY r.method ORDER BY late_pct DESC, r.method`

## Solution
```sql
SELECT r.method, count(*), count(*) FILTER (WHERE r.paid_on > s.due_on),
       round(100.0 * count(*) FILTER (WHERE r.paid_on > s.due_on) / count(*), 1) AS late_pct
FROM repayments r
JOIN schedules s ON s.id = r.schedule_id
WHERE s.due_on >= '{{from}}' AND s.due_on < '{{to}}'
GROUP BY r.method
ORDER BY late_pct DESC, r.method
```

# EN
I am thinking of proposing automatic debit as a must for new loans in 2027. Before it goes to the committee I need the figures: for each payment method, what percentage of instalments are paid late? The query's frame is ready; fill in the blanks.

## Task
The instalments due in {{q_en}} that have been paid. For each payment method: the number of instalments paid, the number paid after their due date, and the percentage paid late (rounded to 1 decimal). Highest late share first; on a tie, by payment method.

## Hints
1. Join the payments with the schedule to get the due date, count conditionally the ones paid after the due date, then divide by the number paid.
2. The first two blanks are the same condition: `r.paid_on > s.due_on`. The last blank: `late_pct DESC, r.method`.
3. `SELECT r.method, count(*), count(*) FILTER (WHERE r.paid_on > s.due_on), round(100.0 * count(*) FILTER (WHERE r.paid_on > s.due_on) / count(*), 1) AS late_pct FROM ... GROUP BY r.method ORDER BY late_pct DESC, r.method`
