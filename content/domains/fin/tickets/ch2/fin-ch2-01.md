---
id: fin-ch2-01
chapter: 2
title: Kỳ trả đến hạn trong một ngày
title_en: Instalments due on one day
from: { name: Tôn Nữ Hạnh, dept: CS }
difficulty: 1
beat: teach
format: worked
requires: [select, where, order_by]
grants: [join]
tables: [schedules, loans]
ordered: true
columns:
  - { vi: "Mã khoản vay", en: "Loan code" }
  - { vi: "Kỳ số", en: "Instalment number" }
  - { vi: "Gốc phải trả", en: "Principal due" }
  - { vi: "Lãi phải trả", en: "Interest due" }
variants:
  - { day: "2026-10-05", d: "05/10/2026", d_en: "October 5" }
  - { day: "2026-10-15", d: "15/10/2026", d_en: "October 15" }
  - { day: "2026-09-25", d: "25/09/2026", d_en: "September 25" }
reflect:
  q: { vi: "Ghép hai bảng bằng điều kiện nào thì mỗi kỳ trả đi đúng với khoản vay của nó?", en: "Which join condition matches every instalment with its own loan?" }
  options:
    - { vi: "Mã khoản vay ghi trong lịch trả bằng mã dòng của khoản vay", en: "The loan number written in the schedule equals the loan's own row number" }
    - { vi: "Mã dòng của lịch trả bằng mã dòng của khoản vay", en: "The schedule's row number equals the loan's row number" }
    - { vi: "Không cần điều kiện, cơ sở dữ liệu tự biết", en: "No condition is needed, the database knows" }
  answer: 0
  why: { vi: "Lịch trả giữ số của khoản vay mà nó thuộc về. Hai mã dòng của hai bảng chỉ tình cờ trùng số, không nói gì về quan hệ.", en: "The schedule keeps the number of the loan it belongs to. The row numbers of two tables only match by chance and say nothing about how rows relate." }
wrong:
  - sql: "SELECT s.loan_id, s.instalment_no, s.principal_due, s.interest_due FROM schedules s WHERE s.due_on = '{{day}}' ORDER BY s.loan_id, s.instalment_no"
    vi: "Cột đầu đang là số nội bộ của khoản vay ghi trong lịch trả, không phải mã khoản vay in trên hợp đồng. Ghép với sổ vay để lấy mã."
    en: "The first column is the loan's internal number held in the schedule, not the loan code printed on the contract. Join the loan book to get the code."
---
Khách hay gọi hỏi "kỳ này tôi phải trả bao nhiêu". Lịch trả chỉ ghi số nội bộ của khoản vay, còn khách thì đọc mã khoản vay in trên hợp đồng. Mình cần ghép hai thứ đó lại.

Đây là lần đầu bạn ghép hai bảng, nên mình gửi kèm một ví dụ mẫu.

## Task
Các kỳ trả đến hạn ngày {{d}}: mã khoản vay, kỳ số, tiền gốc phải trả và tiền lãi phải trả của kỳ đó. Xếp theo mã khoản vay theo thứ tự chữ cái, rồi theo kỳ số.

## Example
```sql
SELECT l.code, c.full_name, l.principal       -- ①
FROM loans l                                  -- ②
JOIN customers c ON c.id = l.customer_id      -- ③
WHERE l.disbursed_on = '2026-10-28'
```
Ví dụ: các khoản giải ngân ngày 28/10/2026, kèm họ tên khách vay.

① Cột của mỗi bảng ghi kèm tên tắt của bảng, để biết cột nào lấy từ đâu.

② Tên tắt đặt ngay sau tên bảng: `l` cho sổ vay.

③ Ghép thêm bảng khách hàng; điều kiện sau `ON` nói dòng nào đi với dòng nào: mã khách bằng số khách ghi trên khoản vay.

## Hints
1. Đây là bài ghép hai bảng: lịch trả có ngày đến hạn và số tiền, sổ vay có mã khoản vay. Ghép theo số khoản vay ghi trong lịch trả, như ví dụ mẫu.
2. Bảng `schedules s` (cột `loan_id`, `instalment_no`, `due_on`, `principal_due`, `interest_due`) ghép `loans l` qua `l.id = s.loan_id`. Lọc `s.due_on = '{{day}}'`, sắp `ORDER BY l.code, s.instalment_no`.
3. `SELECT l.code, s.instalment_no, s.principal_due, s.interest_due FROM schedules s JOIN loans l ON ... WHERE ... ORDER BY l.code, s.instalment_no`

## Solution
```sql
SELECT l.code, s.instalment_no, s.principal_due, s.interest_due
FROM schedules s
JOIN loans l ON l.id = s.loan_id
WHERE s.due_on = '{{day}}'
ORDER BY l.code, s.instalment_no
```

# EN
Customers often call to ask "how much do I pay this time". The schedule only holds the loan's internal number, while customers read the loan code printed on their contract. I need the two put together.

This is your first time joining two tables, so I am sending a worked example along.

## Task
The instalments due on {{d_en}}, 2026: loan code, instalment number, principal due and interest due for that instalment. Sort by loan code in alphabetical order, then by instalment number.

## Example
Example: the loans paid out on 28 October 2026, with the borrower's full name.

① Each column carries the short name of its table, so you can tell where it comes from.

② The short name goes right after the table name: `l` for the loan book.

③ Join the customer table; the condition after `ON` says which row goes with which: the customer number equals the customer number written on the loan.

## Hints
1. This is a two-table join: the schedule has the due date and the amounts, the loan book has the loan code. Join on the loan number held in the schedule, like the worked example.
2. Table `schedules s` (columns `loan_id`, `instalment_no`, `due_on`, `principal_due`, `interest_due`) joins `loans l` through `l.id = s.loan_id`. Filter `s.due_on = '{{day}}'`, sort with `ORDER BY l.code, s.instalment_no`.
3. `SELECT l.code, s.instalment_no, s.principal_due, s.interest_due FROM schedules s JOIN loans l ON ... WHERE ... ORDER BY l.code, s.instalment_no`
