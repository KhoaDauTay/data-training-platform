---
id: ecom-ch7-01
chapter: 7
title: Shop nào bị chấm điểm thấp đi?
title_en: Which shop's ratings fell?
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 4
beat: teach
format: worked
requires: [conditional_agg, multi_join, aggregate, group_by, having, where, order_by, limit]
grants: []
tables: [reviews, products, sellers]
ordered: true
columns:
  - { vi: "Shop", en: "Shop" }
  - { vi: "Điểm trung bình kỳ trước", en: "Average rating, earlier quarter" }
  - { vi: "Điểm trung bình kỳ sau", en: "Average rating, later quarter" }
  - { vi: "Thay đổi (điểm)", en: "Change (points)" }
variants:
  - { a: "2026-04-01", b: "2026-07-01", c: "2026-10-01", qa: "2/2026", qb: "3/2026", qa_en: "Q2 2026", qb_en: "Q3 2026" }
  - { a: "2026-01-01", b: "2026-04-01", c: "2026-07-01", qa: "1/2026", qb: "2/2026", qa_en: "Q1 2026", qb_en: "Q2 2026" }
  - { a: "2025-10-01", b: "2026-01-01", c: "2026-04-01", qa: "4/2025", qb: "1/2026", qa_en: "Q4 2025", qb_en: "Q1 2026" }
reflect:
  q: { vi: "Vì sao chỉ xét shop có từ 20 đánh giá mỗi quý?", en: "Why only look at shops with at least 20 reviews in each quarter?" }
  options:
    - { vi: "Shop ít đánh giá thì vài lượt một sao đã kéo điểm trung bình đi rất xa, dễ báo động nhầm", en: "With few reviews, a couple of one-star ratings move the average a long way and raise false alarms" }
    - { vi: "Để truy vấn chạy nhanh hơn", en: "To make the query run faster" }
    - { vi: "Vì shop nhỏ không được tính điểm", en: "Because small shops are not rated" }
  answer: 0
  why: { vi: "Một con số chỉ đáng tin khi đủ mẫu. Điều tra bắt đầu từ chênh lệch lớn trên mẫu đủ lớn.", en: "A figure is only trustworthy with enough data behind it. An investigation starts from a big change on a big enough sample." }
wrong:
  - sql: "SELECT s.name, ROUND(AVG(r.rating) FILTER (WHERE r.created_on < '{{b}}'), 2), ROUND(AVG(r.rating) FILTER (WHERE r.created_on >= '{{b}}'), 2), ROUND(AVG(r.rating) FILTER (WHERE r.created_on >= '{{b}}') - AVG(r.rating) FILTER (WHERE r.created_on < '{{b}}'), 2) AS change FROM reviews r JOIN products p ON p.id = r.product_id JOIN sellers s ON s.id = p.seller_id WHERE r.created_on >= '{{a}}' AND r.created_on < '{{c}}' GROUP BY s.name HAVING count(*) FILTER (WHERE r.created_on < '{{b}}') >= 20 AND count(*) FILTER (WHERE r.created_on >= '{{b}}') >= 20 ORDER BY change DESC, s.name LIMIT 5"
    vi: "Bạn đang lấy năm shop tăng điểm nhiều nhất. Đề cần năm shop giảm nhiều nhất: thay đổi âm nhất lên đầu."
    en: "You take the five shops whose rating rose most. The request wants the biggest drops: the most negative change first."
---
Điểm đánh giá trung bình của sàn tụt trong quý {{qb}}, và nhà sáng lập hỏi: shop nào kéo điểm xuống? Chương này không có kỹ năng mới. Cái mới là cách điều tra: biến câu hỏi thành một con số, tính hai kỳ trong cùng một câu, rồi so.

## Task
Các đánh giá viết trong quý {{qa}} và quý {{qb}}. Với mỗi shop có từ 20 đánh giá trở lên ở mỗi quý: điểm trung bình quý {{qa}}, điểm trung bình quý {{qb}} (làm tròn 2 chữ số thập phân), và thay đổi bằng điểm quý sau trừ điểm quý trước (tính trên số chưa làm tròn, rồi làm tròn 2 chữ số). Gửi năm shop giảm nhiều nhất, kèm tên shop; thay đổi bằng nhau thì xếp theo tên shop.

## Example
```sql
SELECT platform,
       count(*) FILTER (WHERE ordered_at < '2025-09-01') AS aug,  -- ①
       count(*) FILTER (WHERE ordered_at >= '2025-09-01') AS sep
FROM orders
WHERE status = 'cancelled'
  AND ordered_at >= '2025-08-01' AND ordered_at < '2025-10-01' -- ②
GROUP BY platform
HAVING count(*) >= 20                                           -- ③
ORDER BY platform
```
Ví dụ: đơn hủy ở ứng dụng và ở web, tháng 8 so với tháng 9/2025.

① Mỗi kỳ là một cột có điều kiện riêng, nên hai kỳ nằm cạnh nhau trên cùng một dòng.

② Bộ lọc chung chỉ giữ hai tháng cần so; điều kiện của từng cột chia tiếp bên trong.

③ Lọc nhóm sau khi gom: chỉ giữ nhóm đủ dữ liệu để so.

## Hints
1. Gom theo shop, đặt hai kỳ cạnh nhau bằng hai trung bình có điều kiện, lọc nhóm theo số đánh giá mỗi kỳ.
2. `AVG(r.rating) FILTER (WHERE r.created_on < '{{b}}')` cho kỳ trước; `HAVING count(*) FILTER (...) >= 20` cho từng kỳ.
3. `SELECT s.name, ROUND(AVG(...) FILTER (...), 2), ..., ROUND(AVG(...) FILTER (...) - AVG(...) FILTER (...), 2) AS change FROM reviews r JOIN products p ... JOIN sellers s ... WHERE ... GROUP BY s.name HAVING ... ORDER BY change, s.name LIMIT 5`

## Solution
```sql
SELECT s.name,
       ROUND(AVG(r.rating) FILTER (WHERE r.created_on < '{{b}}'), 2),
       ROUND(AVG(r.rating) FILTER (WHERE r.created_on >= '{{b}}'), 2),
       ROUND(AVG(r.rating) FILTER (WHERE r.created_on >= '{{b}}')
           - AVG(r.rating) FILTER (WHERE r.created_on < '{{b}}'), 2) AS change
FROM reviews r
JOIN products p ON p.id = r.product_id
JOIN sellers s ON s.id = p.seller_id
WHERE r.created_on >= '{{a}}' AND r.created_on < '{{c}}'
GROUP BY s.name
HAVING count(*) FILTER (WHERE r.created_on < '{{b}}') >= 20
   AND count(*) FILTER (WHERE r.created_on >= '{{b}}') >= 20
ORDER BY change, s.name
LIMIT 5
```

# EN
The marketplace's average rating dropped in {{qb_en}}, and the founder asks: which shop pulled it down? This chapter has no new skill. What is new is how to investigate: turn the question into one number, compute both periods in the same query, then compare.

## Task
Reviews written in {{qa_en}} and {{qb_en}}. For each shop with at least 20 reviews in each quarter: the {{qa_en}} average rating, the {{qb_en}} average rating (rounded to 2 decimals), and the change as the later quarter minus the earlier one (computed on the unrounded figures, then rounded to 2 decimals). Send the five shops with the biggest drop, with the shop name; on equal change, by shop name.

## Example
Example: cancelled orders on the app and on the web, August against September 2025.

① Each period is its own column with its own condition, so both periods sit side by side on one row.

② The shared filter keeps only the two months being compared; each column's condition splits them further.

③ Filter the groups after aggregating: keep only groups with enough data to compare.

## Hints
1. Group by shop, put both periods side by side with two conditional averages, and filter the groups on the number of reviews in each period.
2. `AVG(r.rating) FILTER (WHERE r.created_on < '{{b}}')` for the earlier period; `HAVING count(*) FILTER (...) >= 20` for each period.
3. `SELECT s.name, ROUND(AVG(...) FILTER (...), 2), ..., ROUND(AVG(...) FILTER (...) - AVG(...) FILTER (...), 2) AS change FROM reviews r JOIN products p ... JOIN sellers s ... WHERE ... GROUP BY s.name HAVING ... ORDER BY change, s.name LIMIT 5`
