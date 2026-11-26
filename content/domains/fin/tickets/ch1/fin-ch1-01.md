---
id: fin-ch1-01
chapter: 1
title: Khoản giải ngân tháng này của một chi nhánh
title_en: A branch's loans paid out this month
from: { name: Tạ Minh Nhật, dept: IT }
difficulty: 1
beat: teach
format: worked
requires: []
grants: [select, where]
tables: [loans]
columns:
  - { vi: "Mã khoản vay", en: "Loan code" }
  - { vi: "Ngày giải ngân", en: "Disbursement date" }
  - { vi: "Tiền gốc", en: "Principal" }
  - { vi: "Kỳ hạn (tháng)", en: "Term (months)" }
starter: SELECT * FROM loans
variants:
  - { id: "3", branch: "Hoi An" }
  - { id: "5", branch: "Hue" }
  - { id: "8", branch: "Quy Nhon" }
reflect:
  q: { vi: "Vì sao viết tháng 10 là \"từ ngày 1/10 và trước ngày 1/11\", không phải \"tới hết ngày cuối tháng\"?", en: "Why write October as \"from 1 October and before 1 November\" rather than \"up to the last day of the month\"?" }
  options:
    - { vi: "Cách nửa mở đúng với mọi tháng, không cần nhớ tháng có bao nhiêu ngày", en: "The half-open form works for every month, without remembering how many days the month has" }
    - { vi: "Viết tới ngày cuối tháng thì truy vấn báo lỗi", en: "Writing up to the last day makes the query fail" }
    - { vi: "Ngày 1/11 cũng thuộc tháng 10", en: "1 November also belongs to October" }
  answer: 0
  why: { vi: "Mốc đầu tháng sau luôn có, nên cùng một cách viết dùng được cho tháng dài hay tháng ngắn, và cả khi cột có giờ phút.", en: "The first day of the next month always exists, so the same form works for long and short months alike, and even when the column holds a time of day." }
wrong:
  - sql: "SELECT code, disbursed_on, principal, term_months FROM loans WHERE disbursed_on >= '2026-10-01' AND disbursed_on < '2026-11-01'"
    vi: "Danh sách có khoản vay của mọi chi nhánh. Đề chỉ cần một chi nhánh: thêm điều kiện mã chi nhánh, kết hợp bằng AND."
    en: "Your list has loans from every branch. The request is for one branch only: add a branch condition, joined with AND."
---
Chào bạn, chào mừng đến Hũ Bạc! Mình là Nhật, trưởng nhóm dữ liệu, tuần này mình kèm bạn.

Hũ Bạc cho vay tiền mặt và trả góp mua điện thoại, xe máy, điện máy qua 8 chi nhánh ở miền Trung. Mỗi khoản giải ngân là một dòng trong sổ vay. Trưởng chi nhánh {{branch}} muốn xem lại các khoản chi nhánh vừa giải ngân trong tháng. Đây là lần đầu bạn viết truy vấn ở đây, nên mình gửi kèm một ví dụ mẫu: đọc, chạy thử, rồi làm phần của bạn.

## Task
Các khoản vay của chi nhánh {{branch}} (mã chi nhánh {{id}}) giải ngân trong tháng 10/2026: mã khoản vay, ngày giải ngân, tiền gốc và kỳ hạn (số tháng), theo đúng thứ tự đó. Thứ tự dòng không quan trọng.

## Example
```sql
SELECT full_name, joined_on                -- ①
FROM customers                             -- ②
WHERE city = 'Hue'                         -- ③
  AND joined_on >= '2026-09-01' AND joined_on < '2026-10-01'   -- ④
```
Ví dụ: khách ở thành phố Hue tham gia Hũ Bạc trong tháng 9/2026, gồm họ tên và ngày tham gia.

① Sau chữ đầu tiên là các cột cần lấy, cách nhau bằng dấu phẩy, theo đúng thứ tự muốn thấy.

② Sau đó là bảng chứa các cột ấy: danh sách khách hàng `customers`.

③ Phần lọc chỉ giữ những dòng thỏa điều kiện. Chữ để trong nháy đơn.

④ Thêm điều kiện bằng `AND`: dòng phải thỏa mọi điều kiện. Một tháng viết dạng nửa mở: từ ngày đầu tháng, và trước ngày đầu tháng sau.

## Hints
1. Đây là bài chọn cột và lọc dòng, như ví dụ mẫu. Khoản vay nằm trong sổ vay; tab Cột ở panel dưới cho biết tên bảng và tên cột.
2. Bảng `loans` có các cột `code`, `disbursed_on`, `principal`, `term_months` và `branch_id`. Lọc chi nhánh bằng `branch_id = {{id}}`, lọc tháng bằng `disbursed_on >= '2026-10-01' AND disbursed_on < '2026-11-01'`.
3. `SELECT code, disbursed_on, principal, term_months FROM loans WHERE ... AND ...`

## Solution
```sql
SELECT code, disbursed_on, principal, term_months
FROM loans
WHERE branch_id = {{id}} AND disbursed_on >= '2026-10-01' AND disbursed_on < '2026-11-01'
```

# EN
Hi, and welcome to Silver Jar Credit! I am Nhat, the data team lead, and I will be your mentor this week.

Silver Jar lends cash and finances phones, motorbikes and home appliances through 8 branches in central Vietnam. Every loan paid out is one row in the loan book. The manager of the {{branch}} branch wants to review the loans the branch paid out this month. It is also your first query here, so I am sending a worked example along: read it, run it, then do your part.

## Task
The loans of the {{branch}} branch (branch number {{id}}) paid out in October 2026: loan code, disbursement date, principal and term (in months), in that order. Row order does not matter.

## Example
Example: customers living in the city of Hue who joined Silver Jar in September 2026, with their full name and the date they joined.

① After the first word come the columns you want, separated by commas, in the order you want to see them.

② Then comes the table that holds those columns: the customer list `customers`.

③ The filter keeps only the rows that meet the condition. Text goes in single quotes.

④ Add conditions with `AND`: a row must meet every condition. A month is written half-open: from the first day of the month, and before the first day of the next month.

## Hints
1. This is a column-picking and row-filtering task, like the worked example. Loans live in the loan book; the Columns tab in the bottom panel shows the table and column names.
2. Table `loans` has the columns `code`, `disbursed_on`, `principal`, `term_months` and `branch_id`. Filter the branch with `branch_id = {{id}}` and the month with `disbursed_on >= '2026-10-01' AND disbursed_on < '2026-11-01'`.
3. `SELECT code, disbursed_on, principal, term_months FROM loans WHERE ... AND ...`
