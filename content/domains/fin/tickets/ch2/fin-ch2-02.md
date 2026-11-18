---
id: fin-ch2-02
chapter: 2
title: Kỳ trả trễ trong tháng
title_en: Instalments paid late in a month
from: { name: Mạc Văn Toàn, dept: Collections }
difficulty: 2
beat: develop
format: faded
requires: [select, where, order_by, join]
grants: [date_math]
tables: [schedules, repayments]
ordered: true
columns:
  - { vi: "Số hiệu khoản vay", en: "Loan number" }
  - { vi: "Kỳ số", en: "Instalment number" }
  - { vi: "Ngày đến hạn", en: "Due date" }
  - { vi: "Ngày trả", en: "Payment date" }
  - { vi: "Số ngày trễ", en: "Days late" }
starter: |
  SELECT s.loan_id, s.instalment_no, s.due_on, r.paid_on, ___ AS days_late
  FROM schedules s
  JOIN repayments r ON r.schedule_id = s.id
  WHERE s.due_on >= '{{from}}' AND s.due_on < '{{to}}' AND ___
  ORDER BY 5 DESC, 1, 2
variants:
  - { from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026" }
  - { from: "2026-09-01", to: "2026-10-01", month: "9/2026", month_en: "September 2026" }
  - { from: "2026-08-01", to: "2026-09-01", month: "8/2026", month_en: "August 2026" }
reflect:
  q: { vi: "Lấy ngày trả trừ ngày đến hạn thì được gì?", en: "What do you get when you subtract the due date from the payment date?" }
  options:
    - { vi: "Số ngày giữa hai mốc, một số nguyên: 0 là trả đúng ngày đến hạn", en: "The number of days between them, an integer: 0 means paid on the due date" }
    - { vi: "Một ngày mới", en: "A new date" }
    - { vi: "Số tháng giữa hai mốc", en: "The number of months between them" }
  answer: 0
  why: { vi: "Ngày trừ ngày ra số ngày. Trả đúng ngày đến hạn ra 0, nên \"trễ\" là lớn hơn 0, không phải lớn hơn hoặc bằng.", en: "A date minus a date is a number of days. Paying on the due date gives 0, so \"late\" means greater than 0, not greater than or equal." }
wrong:
  - sql: "SELECT s.loan_id, s.instalment_no, s.due_on, r.paid_on, r.paid_on - s.due_on AS days_late FROM schedules s JOIN repayments r ON r.schedule_id = s.id WHERE s.due_on >= '{{from}}' AND s.due_on < '{{to}}' AND r.paid_on >= s.due_on ORDER BY 5 DESC, 1, 2"
    vi: "Danh sách có cả kỳ trả đúng ngày đến hạn (trễ 0 ngày). Trễ là trả sau ngày đến hạn, tức lớn hơn, không phải lớn hơn hoặc bằng."
    en: "Your list also has instalments paid on the due date (0 days late). Late means paid after the due date: greater than, not greater than or equal."
---
Đội thu hồi nợ muốn biết khách nào hay trả chậm để nhắc sớm hơn ở kỳ sau. Mình cần các kỳ đã trả nhưng trả sau ngày đến hạn, kèm số ngày trễ.

Câu truy vấn trong editor đã viết gần xong. Chỗ trống đầu là phép tính số ngày trễ; chỗ thứ hai là điều kiện "trả trễ".

## Task
Các kỳ đến hạn trong tháng {{month}} đã được trả, nhưng trả sau ngày đến hạn: số hiệu khoản vay (số nội bộ ghi trong lịch trả), kỳ số, ngày đến hạn, ngày trả và số ngày trễ. Trễ lâu nhất lên đầu; bằng nhau thì theo số hiệu khoản vay, rồi theo kỳ số.

## Hints
1. Đây là bài tính khoảng cách giữa hai ngày: ngày trả trừ ngày đến hạn ra số ngày trễ. Chỉ giữ những kỳ có số ngày trễ lớn hơn 0.
2. Chỗ trống đầu: `r.paid_on - s.due_on`. Chỗ trống thứ hai: `r.paid_on > s.due_on`.
3. `SELECT s.loan_id, s.instalment_no, s.due_on, r.paid_on, r.paid_on - s.due_on AS days_late FROM schedules s JOIN repayments r ON ... WHERE ... AND r.paid_on > s.due_on ORDER BY 5 DESC, 1, 2`

## Solution
```sql
SELECT s.loan_id, s.instalment_no, s.due_on, r.paid_on, r.paid_on - s.due_on AS days_late
FROM schedules s
JOIN repayments r ON r.schedule_id = s.id
WHERE s.due_on >= '{{from}}' AND s.due_on < '{{to}}' AND r.paid_on > s.due_on
ORDER BY 5 DESC, 1, 2
```

# EN
The collections team wants to know which customers tend to pay late, so they can remind them earlier next time. I need the instalments that were paid, but after the due date, with the number of days late.

The query in the editor is almost done. The first blank is how to compute the days late; the second is the "paid late" condition.

## Task
The instalments due in {{month_en}} that were paid, but after the due date: loan number (the internal number held in the schedule), instalment number, due date, payment date and days late. Longest delay first; on a tie, by loan number, then by instalment number.

## Hints
1. This is a gap-between-two-dates task: the payment date minus the due date gives the days late. Keep only the instalments with more than 0 days late.
2. First blank: `r.paid_on - s.due_on`. Second blank: `r.paid_on > s.due_on`.
3. `SELECT s.loan_id, s.instalment_no, s.due_on, r.paid_on, r.paid_on - s.due_on AS days_late FROM schedules s JOIN repayments r ON ... WHERE ... AND r.paid_on > s.due_on ORDER BY 5 DESC, 1, 2`
