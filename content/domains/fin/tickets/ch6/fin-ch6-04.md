---
id: fin-ch6-04
chapter: 6
title: Trung vị và trung bình khoản vay
title_en: Median and average loan size
from: { name: Phùng Đức Lâm, dept: Sales }
difficulty: 3
beat: rest
adv: [a2]
requires: [select, where, join, aggregate, group_by, order_by]
grants: []
tables: [loans, products]
ordered: true
columns:
  - { vi: "Sản phẩm", en: "Product" }
  - { vi: "Trung vị tiền gốc (đồng)", en: "Median principal (VND)" }
  - { vi: "Tiền gốc trung bình (đồng)", en: "Average principal (VND)" }
variants:
  - { from: "2026-01-01", to: "2027-01-01", d1: "01/01/2026", d2: "31/12/2026", d1_en: "1 January 2026", d2_en: "31 December 2026" }
  - { from: "2025-01-01", to: "2026-01-01", d1: "01/01/2025", d2: "31/12/2025", d1_en: "1 January 2025", d2_en: "31 December 2025" }
  - { from: "2024-07-01", to: "2025-01-01", d1: "01/07/2024", d2: "31/12/2024", d1_en: "1 July 2024", d2_en: "31 December 2024" }
reflect:
  q: { vi: "Khi nào trung vị và trung bình khác nhau nhiều?", en: "When do the median and the average differ a lot?" }
  options:
    - { vi: "Khi có vài khoản rất lớn hoặc rất nhỏ kéo trung bình đi, còn trung vị chỉ nhìn khoản đứng giữa", en: "When a few very large or very small loans pull the average away, while the median only looks at the loan in the middle" }
    - { vi: "Không bao giờ, hai con số luôn bằng nhau", en: "Never, the two are always equal" }
    - { vi: "Khi sản phẩm có ít khoản vay", en: "Only when a product has few loans" }
  answer: 0
  why: { vi: "Trung vị là khoản đứng giữa khi xếp theo tiền gốc, nên không bị vài khoản lệch kéo đi. Trung bình thì cộng tất cả.", en: "The median is the loan in the middle when sorted by principal, so a few outliers do not move it. The average adds everything up." }
wrong:
  - sql: "SELECT p.name, round(avg(l.principal)), round(avg(l.principal)) FROM loans l JOIN products p ON p.id = l.product_id WHERE l.disbursed_on >= '{{from}}' AND l.disbursed_on < '{{to}}' GROUP BY p.name ORDER BY 2 DESC, 1"
    vi: "Cột trung vị đang là trung bình. Trung vị là giá trị đứng giữa khi xếp tiền gốc từ nhỏ đến lớn, cần hàm phân vị 0,5."
    en: "The median column holds the average. The median is the middle value when principals are sorted from small to large; it needs the 0.5 percentile function."
---
Mình đang thiết kế lại hạn mức cho từng sản phẩm. Trung bình dễ bị vài khoản rất lớn kéo lên, nên mình muốn xem cả trung vị, tức khoản đứng giữa, để biết một khoản vay "điển hình" lớn cỡ nào.

## Task
Các khoản giải ngân từ {{d1}} đến hết {{d2}}, theo từng sản phẩm: tên sản phẩm, trung vị tiền gốc và tiền gốc trung bình, cả hai làm tròn tới đồng. Trung vị lớn nhất lên đầu; bằng nhau thì theo tên sản phẩm.

## Hints
1. Trung vị là phân vị 0,5: xếp tiền gốc trong nhóm từ nhỏ đến lớn và lấy giá trị đứng giữa. Ghép tên sản phẩm từ danh sách sản phẩm. Bài nâng cao "Phân vị" giải thích hàm này.
2. `percentile_cont(0.5) WITHIN GROUP (ORDER BY l.principal)` trả số thực; ép `::numeric` trước khi `round(...)`. Ghép `products p` qua `p.id = l.product_id`, gom `GROUP BY p.name`, sắp `ORDER BY 2 DESC, 1`.
3. `SELECT p.name, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.principal)::numeric), round(avg(l.principal)) FROM loans l JOIN products p ON ... WHERE ... GROUP BY p.name ORDER BY 2 DESC, 1`

## Solution
```sql
SELECT p.name, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.principal)::numeric), round(avg(l.principal))
FROM loans l
JOIN products p ON p.id = l.product_id
WHERE l.disbursed_on >= '{{from}}' AND l.disbursed_on < '{{to}}'
GROUP BY p.name
ORDER BY 2 DESC, 1
```

# EN
I am redesigning the credit limits of each product. An average is easily pulled up by a few very large loans, so I also want the median, the loan in the middle, to see how big a "typical" loan is.

## Task
The loans paid out from {{d1_en}} to {{d2_en}}, per product: product name, median principal and average principal, both rounded to the dong. Largest median first; on a tie, by product name.

## Hints
1. The median is the 0.5 percentile: sort the principals in the group from small to large and take the middle value. Take the product name from the product list. The advanced lesson "Percentiles" explains this function.
2. `percentile_cont(0.5) WITHIN GROUP (ORDER BY l.principal)` returns a floating-point number; cast it with `::numeric` before `round(...)`. Join `products p` through `p.id = l.product_id`, group with `GROUP BY p.name`, sort with `ORDER BY 2 DESC, 1`.
3. `SELECT p.name, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.principal)::numeric), round(avg(l.principal)) FROM loans l JOIN products p ON ... WHERE ... GROUP BY p.name ORDER BY 2 DESC, 1`
