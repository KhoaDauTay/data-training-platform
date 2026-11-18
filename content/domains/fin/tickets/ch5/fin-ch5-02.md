---
id: fin-ch5-02
chapter: 5
title: Giải ngân lũy kế từ đầu năm
title_en: Year-to-date disbursements
from: { name: Phùng Đức Lâm, dept: Sales }
difficulty: 3
beat: develop
format: faded
requires: [select, where, aggregate, group_by, order_by, cte, date_bucket]
grants: [window_agg]
tables: [loans]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Tiền giải ngân trong tháng", en: "Paid out in the month" }
  - { vi: "Lũy kế từ đầu năm", en: "Year to date" }
starter: |
  WITH m AS (
    SELECT date_trunc('month', disbursed_on)::date AS month, sum(principal) AS amount
    FROM loans
    WHERE product_id = {{pid}} AND disbursed_on >= '2026-01-01' AND disbursed_on < '2027-01-01'
    GROUP BY 1
  )
  SELECT month, amount, sum(amount) OVER (___)
  FROM m
  ORDER BY month
variants:
  - { pid: "3", product: "Motorbike Instalment" }
  - { pid: "2", product: "Phone Instalment" }
  - { pid: "1", product: "Cash Loan" }
reflect:
  q: { vi: "Cộng có cửa sổ khác cộng có gom nhóm ở chỗ nào?", en: "How does a sum over a window differ from a grouped sum?" }
  options:
    - { vi: "Mỗi tháng vẫn giữ dòng của mình; con số cộng dồn được gắn thêm vào từng dòng", en: "Each month keeps its own row; the running figure is attached to every row" }
    - { vi: "Gộp mười tháng thành một dòng tổng", en: "It merges ten months into one total row" }
    - { vi: "Chỉ chạy được trên bảng gốc, không chạy trên bước có tên", en: "It only works on base tables, not on a named step" }
  answer: 0
  why: { vi: "Cửa sổ sắp theo tháng thì mỗi dòng cộng mọi tháng từ đầu tới chính nó. Cửa sổ rỗng cộng cả bảng, nên dòng nào cũng ra cùng một tổng.", en: "A window sorted by month makes each row add every month up to itself. An empty window adds the whole table, so every row shows the same total." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', disbursed_on)::date AS month, sum(principal) AS amount FROM loans WHERE product_id = {{pid}} AND disbursed_on >= '2026-01-01' AND disbursed_on < '2027-01-01' GROUP BY 1) SELECT month, amount, sum(amount) OVER () FROM m ORDER BY month"
    vi: "Cột lũy kế dòng nào cũng bằng tổng cả năm: cửa sổ rỗng cộng mọi tháng. Sắp cửa sổ theo tháng để mỗi dòng chỉ cộng tới tháng của nó."
    en: "The year-to-date column shows the full-year total on every row: an empty window adds every month. Sort the window by month so each row only adds up to its own month."
---
Mình báo cáo chỉ tiêu năm cho sản phẩm {{product}}. Cần cả số giải ngân từng tháng lẫn con số lũy kế từ đầu năm, trên cùng một dòng, để thấy đang ở đâu so với chỉ tiêu.

Câu truy vấn trong editor đã có bước cộng theo tháng. Chỗ trống là cách sắp cửa sổ để con số cộng dồn theo thời gian.

## Task
Năm 2026, sản phẩm {{product}} (mã sản phẩm {{pid}}): mỗi tháng có giải ngân, gồm tháng (ghi bằng ngày đầu tháng), tiền giải ngân trong tháng và tiền giải ngân lũy kế từ đầu năm tới hết tháng đó. Tháng sớm nhất lên đầu.

## Hints
1. Đây là bài cộng dồn: giữ mỗi tháng một dòng, gắn thêm tổng của mọi tháng từ đầu năm tới tháng đó. Cửa sổ phải sắp theo tháng.
2. Chỗ trống: `ORDER BY month`.
3. `... SELECT month, amount, sum(amount) OVER (ORDER BY month) FROM m ORDER BY month`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', disbursed_on)::date AS month, sum(principal) AS amount
  FROM loans
  WHERE product_id = {{pid}} AND disbursed_on >= '2026-01-01' AND disbursed_on < '2027-01-01'
  GROUP BY 1
)
SELECT month, amount, sum(amount) OVER (ORDER BY month)
FROM m
ORDER BY month
```

# EN
I am reporting the yearly target for the {{product}} product. I need both the monthly amount paid out and the year-to-date figure on the same row, to see where we stand against the target.

The query in the editor already has the step that adds up each month. The blank is how to sort the window so the figure runs forward in time.

## Task
In 2026, the {{product}} product (product number {{pid}}): every month with loans paid out, giving the month (as its first day), the amount paid out in the month and the amount paid out year to date up to the end of that month. Earliest month first.

## Hints
1. This is a running total: keep one row per month and attach the sum of every month from the start of the year up to that month. The window has to be sorted by month.
2. The blank: `ORDER BY month`.
3. `... SELECT month, amount, sum(amount) OVER (ORDER BY month) FROM m ORDER BY month`
