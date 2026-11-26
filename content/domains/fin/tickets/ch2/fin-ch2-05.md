---
id: fin-ch2-05
chapter: 2
title: "Đánh giá thăng tiến: kỳ thu tháng 10"
title_en: "Promotion review: the October collections"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 2
beat: boss
requires: [select, where, join, left_join, coalesce, date_math, aggregate, group_by, order_by, limit]
grants: []
tables: [schedules, repayments]
ordered: true
columns:
  - [{ vi: "Tổng phải thu", en: "Total due" }, { vi: "Tổng đã thu", en: "Total collected" }]
  - [{ vi: "Số hiệu khoản vay", en: "Loan number" }, { vi: "Kỳ số", en: "Instalment number" }, { vi: "Số ngày trễ", en: "Days late" }]
  - [{ vi: "Phương thức trả", en: "Payment method" }, { vi: "Số lần trả trễ", en: "Late payments" }, { vi: "Số ngày trễ trung bình", en: "Average days late" }]
conclusion:
  question: "Theo bước 3, phương thức trả nào gần như không bao giờ trễ?"
  options:
    - "Trích nợ tự động từ tài khoản"
    - "Tiền mặt tại quầy"
    - "Ví điện tử"
    - "Chuyển khoản ngân hàng"
  answer: 0
conclusion_en:
  question: "According to step 3, which payment method is almost never late?"
  options:
    - "Automatic debit from the account"
    - "Cash at the counter"
    - "E-wallet"
    - "Bank transfer"
---
Đây là buổi đánh giá thăng tiến của bạn. Tháng 10 vừa khép lại; mình cần biết công ty thu được bao nhiêu so với số phải thu, ai trả trễ nặng nhất, và cách trả nào khiến khách trễ ít nhất. Làm đúng cả ba bảng là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Phải thu và đã thu tháng 10
Các kỳ đến hạn từ ngày 01/10 đến hết 31/10/2026: tổng số tiền phải thu (gốc cộng lãi) và tổng số tiền đã thu của các kỳ đó; kỳ chưa thu tính 0. Một dòng duy nhất.
```sql
SELECT sum(s.principal_due + s.interest_due), sum(COALESCE(r.amount, 0))
FROM schedules s
LEFT JOIN repayments r ON r.schedule_id = s.id
WHERE s.due_on >= '2026-10-01' AND s.due_on < '2026-11-01'
ORDER BY 1
```

## Step 2: Mười lần trả trễ lâu nhất
Trong các lần trả tiền của tháng 10/2026 (ngày trả trong tháng 10), mười lần trả trễ lâu nhất so với ngày đến hạn: số hiệu khoản vay, kỳ số, số ngày trễ. Trễ lâu nhất lên đầu; bằng nhau thì theo số hiệu khoản vay, rồi theo kỳ số.
```sql
SELECT s.loan_id, s.instalment_no, r.paid_on - s.due_on
FROM schedules s
JOIN repayments r ON r.schedule_id = s.id
WHERE r.paid_on >= '2026-10-01' AND r.paid_on < '2026-11-01' AND r.paid_on > s.due_on
ORDER BY 3 DESC, 1, 2
LIMIT 10
```

## Step 3: Trả trễ theo phương thức trả
Chỉ các lần trả trễ có ngày trả trong tháng 10/2026, theo từng phương thức trả: phương thức, số lần trả trễ và số ngày trễ trung bình, làm tròn 2 chữ số thập phân. Xếp theo tên phương thức theo thứ tự chữ cái.
```sql
SELECT r.method, count(*), round(avg(r.paid_on - s.due_on), 2)
FROM schedules s
JOIN repayments r ON r.schedule_id = s.id
WHERE r.paid_on >= '2026-10-01' AND r.paid_on < '2026-11-01' AND r.paid_on > s.due_on
GROUP BY r.method
ORDER BY r.method
```

## Hints
1. Bước 1 giữ mọi kỳ đến hạn, cả kỳ chưa trả, như việc "Phải thu và đã thu, kể cả kỳ chưa trả". Bước 2 và 3 chỉ cần kỳ đã trả, lọc theo ngày trả và tính số ngày trễ bằng phép trừ hai ngày.
2. Bước 1: `LEFT JOIN repayments r`, `sum(COALESCE(r.amount, 0))`. Bước 2: `r.paid_on - s.due_on`, `ORDER BY 3 DESC, 1, 2 LIMIT 10`. Bước 3: `GROUP BY r.method`, `round(avg(r.paid_on - s.due_on), 2)`.
3. `SELECT r.method, count(*), round(avg(r.paid_on - s.due_on), 2) FROM schedules s JOIN repayments r ON ... WHERE ... GROUP BY r.method ORDER BY r.method`

# EN
This is your promotion review. October has just closed; I need to know how much the company collected against what was due, who paid the latest, and which way of paying keeps customers least late. Get all three tables right and you take another step in your career.

## Step 1: Due and collected in October
The instalments due from 1 to 31 October 2026: the total amount due (principal plus interest) and the total collected on those instalments; instalments not collected count as 0. A single row.

## Step 2: The ten latest payments
Among the payments made in October 2026 (payment date in October), the ten paid latest after their due date: loan number, instalment number, days late. Longest delay first; on a tie, by loan number, then by instalment number.

## Step 3: Late payments by payment method
Only the late payments with a payment date in October 2026, per payment method: the method, the number of late payments and the average days late, rounded to 2 decimals. Sort by method name in alphabetical order.

## Hints
1. Step 1 keeps every instalment due, unpaid ones included, like the task "Due and collected, unpaid instalments included". Steps 2 and 3 only need paid instalments, filtered on the payment date, with the days late computed by subtracting two dates.
2. Step 1: `LEFT JOIN repayments r`, `sum(COALESCE(r.amount, 0))`. Step 2: `r.paid_on - s.due_on`, `ORDER BY 3 DESC, 1, 2 LIMIT 10`. Step 3: `GROUP BY r.method`, `round(avg(r.paid_on - s.due_on), 2)`.
3. `SELECT r.method, count(*), round(avg(r.paid_on - s.due_on), 2) FROM schedules s JOIN repayments r ON ... WHERE ... GROUP BY r.method ORDER BY r.method`
