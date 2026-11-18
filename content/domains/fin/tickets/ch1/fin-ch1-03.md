---
id: fin-ch1-03
chapter: 1
title: Giải ngân theo sản phẩm, kể cả khoản đã đóng
title_en: Disbursements by product, closed loans included
from: { name: Huỳnh Kim Ngân, dept: Risk }
difficulty: 2
beat: twist
requires: [select, where]
grants: [aggregate, group_by]
tables: [loans]
columns:
  - { vi: "Mã sản phẩm", en: "Product number" }
  - { vi: "Số khoản giải ngân", en: "Loans paid out" }
  - { vi: "Tổng tiền gốc", en: "Total principal" }
variants:
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026" }
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026" }
reflect:
  q: { vi: "Vì sao không lọc riêng các khoản đang trả?", en: "Why not keep only the loans still being repaid?" }
  options:
    - { vi: "Câu hỏi là đã giải ngân bao nhiêu trong quý; khoản đã trả xong hay đã xóa nợ vẫn là tiền đã giải ngân", en: "The question is how much was paid out in the quarter; a loan repaid or written off since is still money paid out" }
    - { vi: "Khoản đã đóng không có tiền gốc", en: "Closed loans have no principal" }
    - { vi: "Lọc theo trạng thái làm truy vấn báo lỗi", en: "Filtering on the status makes the query fail" }
  answer: 0
  why: { vi: "Trạng thái là chuyện của hôm nay; lượng giải ngân là chuyện của ngày giải ngân. Đọc kỹ đề hỏi về thời điểm nào.", en: "The status describes today; the amount paid out describes the disbursement date. Read carefully which moment the request asks about." }
wrong:
  - sql: "SELECT product_id, count(*), sum(principal) FROM loans WHERE disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}' AND status = 'active' GROUP BY product_id"
    vi: "Bạn chỉ đếm khoản đang trả. Đề hỏi lượng giải ngân trong quý, nên khoản đã trả xong hay đã xóa nợ vẫn phải tính."
    en: "You counted only the loans still being repaid. The request asks how much was paid out in the quarter, so loans repaid or written off since still count."
---
Hội đồng tín dụng muốn biết quý {{q}} công ty đã giải ngân bao nhiêu cho từng sản phẩm. Lưu ý: đây là câu hỏi về lượng tiền đã cho vay ra trong quý, không phải dư nợ hôm nay. Một số khoản giải ngân trong quý đã trả xong, vài khoản đã bị xóa nợ; chúng vẫn phải có trong con số.

## Task
Các khoản vay giải ngân trong quý {{q}}, theo từng sản phẩm: mã sản phẩm, số khoản và tổng tiền gốc. Tính mọi khoản, dù hôm nay đang trả, đã trả xong hay đã bị xóa nợ. Thứ tự dòng không quan trọng.

## Hints
1. Đây là bài gom nhóm: mỗi sản phẩm một dòng, đếm số khoản và cộng tiền gốc trong nhóm. Không lọc theo trạng thái khoản vay.
2. `count(*)` đếm dòng, `sum(principal)` cộng tiền gốc; `GROUP BY product_id` chia nhóm. Quý là `disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}'`.
3. `SELECT product_id, count(*), sum(principal) FROM loans WHERE ... GROUP BY product_id`

## Solution
```sql
SELECT product_id, count(*), sum(principal)
FROM loans
WHERE disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}'
GROUP BY product_id
```

# EN
The credit committee wants to know how much the company paid out per product in {{q_en}}. Note: this is about the money lent out during the quarter, not today's outstanding balance. Some loans paid out in the quarter are already repaid, a few have been written off; they still belong in the figure.

## Task
The loans paid out in {{q_en}}, per product: product number, number of loans and total principal. Count every loan, whether it is still being repaid today, already repaid or written off. Row order does not matter.

## Hints
1. This is a grouping task: one row per product, counting the loans and adding up the principal in each group. Do not filter on the loan status.
2. `count(*)` counts rows, `sum(principal)` adds up the principal; `GROUP BY product_id` makes the groups. The quarter is `disbursed_on >= '{{from}}' AND disbursed_on < '{{to}}'`.
3. `SELECT product_id, count(*), sum(principal) FROM loans WHERE ... GROUP BY product_id`
