---
id: fin-ch7-03
chapter: 7
title: Luật thu nhập tối thiểu có bắt được khoản xấu?
title_en: Would a minimum income rule catch the bad loans?
from: { name: Ông Thị Mỹ Duyên, dept: Risk }
difficulty: 4
beat: twist
requires: [select, where, case_when, conditional_agg, multi_join, aggregate, group_by, order_by]
grants: []
tables: [loan_snapshots, loans, customers]
ordered: true
columns:
  - { vi: "Nhóm thu nhập", en: "Income group" }
  - { vi: "Số khoản đang có dư nợ", en: "Loans with a balance" }
  - { vi: "Số khoản quá hạn trên 30 ngày", en: "Loans over 30 days past due" }
  - { vi: "Tỷ lệ (%)", en: "Share (%)" }
variants:
  - { me: "2026-10-31", month: "10/2026", month_en: "October 2026" }
  - { me: "2026-09-30", month: "9/2026", month_en: "September 2026" }
  - { me: "2026-08-31", month: "8/2026", month_en: "August 2026" }
reflect:
  q: { vi: "Vì sao phải xét khách không khai thu nhập trước tiên?", en: "Why handle the customers who declared no income first?" }
  options:
    - { vi: "So sánh với ô trống không bao giờ đúng, nên khách không khai lặng lẽ rơi vào nhánh còn lại và làm sai số của nhóm thu nhập cao", en: "A comparison with an empty cell is never true, so those customers quietly fall into the last branch and skew the high-income group" }
    - { vi: "Vì khách không khai thu nhập luôn là nhóm rủi ro nhất", en: "Because customers who declared no income are always the riskiest group" }
    - { vi: "Không cần: ô trống được tính như số 0, tức là nhóm 1", en: "No need: an empty cell counts as 0, so group 1" }
  answer: 0
  why: { vi: "Ô trống không bằng, không lớn hơn, không nhỏ hơn số nào. Gần một phần năm khách không khai thu nhập: một luật viết bằng phép so sánh mà quên họ sẽ đo sai cả nhóm mà nó định bảo vệ.", en: "An empty cell is not equal to, greater than or less than any number. Almost one customer in five declared no income: a rule written as a comparison that forgets them measures the very group it means to protect wrongly." }
wrong:
  - sql: "SELECT CASE WHEN c.monthly_income < 15000000 THEN 1 ELSE 2 END AS income_group, count(*), count(*) FILTER (WHERE s.dpd > 30), round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2) FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN customers c ON c.id = l.customer_id WHERE s.month_end = '{{me}}' GROUP BY 1 ORDER BY 1"
    vi: "Khách không khai thu nhập đang rơi vào nhóm 2: phép so sánh với ô trống không đúng, nên nhánh còn lại nhận họ. Xét ô trống trước tiên, thành nhóm 0."
    en: "Customers who declared no income fall into group 2: a comparison with an empty cell is never true, so the last branch takes them. Check for the empty cell first, as group 0."
  - sql: "SELECT CASE WHEN c.monthly_income >= 15000000 THEN 2 WHEN c.monthly_income < 15000000 THEN 1 END AS income_group, count(*), count(*) FILTER (WHERE s.dpd > 30), round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2) FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN customers c ON c.id = l.customer_id WHERE s.month_end = '{{me}}' GROUP BY 1 ORDER BY 1"
    vi: "Khách không khai thu nhập ra một nhóm trống, không phải nhóm 0. Kết quả cần số nhóm cho mọi dòng."
    en: "Customers who declared no income come out as an empty group, not group 0. The result needs a group number on every row."
---
Một thành viên hội đồng đề xuất luật mới: chỉ cho vay khách có thu nhập từ 15 triệu đồng một tháng trở lên. Trước khi đưa vào luật, mình muốn kiểm tra chéo giả thuyết đó trên sổ vay: khoản quá hạn thật sự nằm ở nhóm thu nhập nào?

## Task
Ảnh chụp cuối tháng {{month}}. Chia khoản vay theo thu nhập hằng tháng khách đã khai: nhóm 0 là khách không khai thu nhập, nhóm 1 dưới 15 triệu đồng, nhóm 2 từ 15 triệu đồng trở lên. Mỗi nhóm: số khoản vay trong ảnh chụp, số khoản quá hạn trên 30 ngày, và tỷ lệ phần trăm của số đó (làm tròn 2 chữ số thập phân). Xếp theo nhóm.

## Hints
1. Ba bảng: ảnh chụp, sổ vay, khách hàng. Chia nhóm thu nhập theo điều kiện, và xét trường hợp khách không khai trước tiên, vì so sánh với một ô trống không bao giờ đúng.
2. `CASE WHEN c.monthly_income IS NULL THEN 0 WHEN c.monthly_income < 15000000 THEN 1 ELSE 2 END`, `count(*) FILTER (WHERE s.dpd > 30)`.
3. `SELECT CASE ... END AS income_group, count(*), count(*) FILTER (WHERE s.dpd > 30), round(100.0 * ... / count(*), 2) FROM loan_snapshots s JOIN loans l ... JOIN customers c ... WHERE ... GROUP BY 1 ORDER BY 1`

## Solution
```sql
SELECT CASE WHEN c.monthly_income IS NULL THEN 0
            WHEN c.monthly_income < 15000000 THEN 1
            ELSE 2 END AS income_group,
       count(*), count(*) FILTER (WHERE s.dpd > 30),
       round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2)
FROM loan_snapshots s
JOIN loans l ON l.id = s.loan_id
JOIN customers c ON c.id = l.customer_id
WHERE s.month_end = '{{me}}'
GROUP BY 1
ORDER BY 1
```

# EN
A committee member proposes a new rule: only lend to customers who earn 15 million dong a month or more. Before it becomes a rule, I want to cross-check that hypothesis against the loan book: in which income group are the overdue loans really?

## Task
The month-end picture of {{month_en}}. Split the loans by the monthly income the customer declared: group 0 is customers who declared no income, group 1 under 15 million dong, group 2 from 15 million dong up. For each group: the number of loans in the picture, the number over 30 days past due, and that number as a percentage (rounded to 2 decimals). Sort by group.

## Hints
1. Three tables: snapshot, loan book, customers. Split the income groups with conditions, and handle the customers who declared nothing first, because a comparison with an empty cell is never true.
2. `CASE WHEN c.monthly_income IS NULL THEN 0 WHEN c.monthly_income < 15000000 THEN 1 ELSE 2 END`, `count(*) FILTER (WHERE s.dpd > 30)`.
3. `SELECT CASE ... END AS income_group, count(*), count(*) FILTER (WHERE s.dpd > 30), round(100.0 * ... / count(*), 2) FROM loan_snapshots s JOIN loans l ... JOIN customers c ... WHERE ... GROUP BY 1 ORDER BY 1`
