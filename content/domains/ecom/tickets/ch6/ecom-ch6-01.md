---
id: ecom-ch6-01
chapter: 6
title: Ba món bán chạy nhất mỗi nhóm hàng
title_en: The top three items of each category
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: teach
format: worked
requires: [cte, multi_join, aggregate, group_by, order_by]
grants: [window_rank]
tables: [order_items, orders, products, categories]
ordered: true
columns:
  - { vi: "Nhóm hàng", en: "Category" }
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Doanh thu hàng (đồng)", en: "Goods revenue (VND)" }
  - { vi: "Hạng trong nhóm", en: "Rank in category" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "5/2026", month_en: "May 2026", from: "2026-05-01", to: "2026-06-01" }
reflect:
  q: { vi: "Vì sao không lọc hạng ngay trong câu tính hạng mà phải lọc ở câu ngoài?", en: "Why filter the rank in the outer query instead of in the query that computes it?" }
  options:
    - { vi: "Hàm cửa sổ chạy sau bước lọc dòng, nên câu tính hạng chưa thể lọc theo hạng", en: "Window functions run after the row filter, so the query that computes the rank cannot filter on it yet" }
    - { vi: "Lọc ở câu ngoài chạy nhanh hơn", en: "Filtering outside is faster" }
    - { vi: "Hạng chỉ đọc được trong khối WITH", en: "The rank can only be read inside a WITH block" }
  answer: 0
  why: { vi: "Thứ tự chạy: lọc dòng, gom nhóm, rồi mới tới hàm cửa sổ. Muốn lọc theo hạng thì bọc thêm một tầng.", en: "Order of work: filter rows, group, and only then window functions. To filter on the rank, wrap one more level." }
wrong:
  - sql: "WITH sales AS (SELECT c.name AS category, p.sku, sum(i.quantity * i.unit_price) AS revenue FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY c.name, p.sku), ranked AS (SELECT category, sku, revenue, RANK() OVER (ORDER BY revenue DESC) AS rnk FROM sales) SELECT category, sku, revenue, rnk FROM ranked WHERE rnk <= 3 ORDER BY category, rnk, sku"
    vi: "Bạn đang xếp hạng trên toàn sàn, nên chỉ còn ba món. Đề cần xếp hạng riêng trong từng nhóm hàng: thêm PARTITION BY nhóm hàng."
    en: "You are ranking across the whole marketplace, so only three items remain. The request ranks within each category: add PARTITION BY category."
---
Ngành hàng làm trang "Bán chạy nhất" cho từng nhóm hàng. Mỗi nhóm cần ba món dẫn đầu theo doanh thu, nên lần này bạn xếp hạng riêng trong từng nhóm.

Đây là lần đầu bạn dùng hàm cửa sổ, nên mình gửi kèm một ví dụ mẫu.

## Task
Các đơn đặt trong tháng {{month}} và đã giao xong: trong mỗi nhóm hàng, ba sản phẩm có doanh thu hàng (số lượng nhân đơn giá) cao nhất. Gửi tên nhóm hàng, mã SKU, doanh thu và hạng trong nhóm. Doanh thu bằng nhau thì cùng hạng, và hạng sau bị bỏ qua (như xếp hạng thi đấu); lấy mọi sản phẩm có hạng từ 1 đến 3. Xếp theo tên nhóm hàng, rồi hạng, rồi mã SKU.

## Example
```sql
SELECT city, name, joined_on,
       RANK() OVER (PARTITION BY city      -- ①
                    ORDER BY joined_on)    -- ②
         AS seniority
FROM sellers
ORDER BY city, seniority, name             -- ③
```
Ví dụ: trong mỗi thành phố, shop nào vào sàn sớm thứ mấy?

① PARTITION BY chia các dòng thành từng nhóm; hạng đếm lại từ 1 trong mỗi nhóm.

② ORDER BY bên trong quyết định ai đứng hạng 1: ở đây là shop vào sàn sớm nhất.

③ Hàm cửa sổ không bỏ dòng nào: mỗi shop vẫn là một dòng, chỉ có thêm cột hạng.

## Hints
1. Hai bước: tính doanh thu từng sản phẩm (kèm nhóm hàng), rồi xếp hạng sản phẩm trong từng nhóm. Lọc hạng ở câu ngoài cùng.
2. `RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk` trong một khối `WITH`, rồi câu ngoài lọc `rnk <= 3` và xếp `ORDER BY category, rnk, sku`.
3. `WITH sales AS (...), ranked AS (SELECT category, sku, revenue, RANK() OVER (...) AS rnk FROM sales) SELECT category, sku, revenue, rnk FROM ranked WHERE rnk <= 3 ORDER BY category, rnk, sku`

## Solution
```sql
WITH sales AS (
  SELECT c.name AS category, p.sku, sum(i.quantity * i.unit_price) AS revenue
  FROM order_items i
  JOIN orders o ON o.id = i.order_id
  JOIN products p ON p.id = i.product_id
  JOIN categories c ON c.id = p.category_id
  WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
  GROUP BY c.name, p.sku
), ranked AS (
  SELECT category, sku, revenue, RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
  FROM sales
)
SELECT category, sku, revenue, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY category, rnk, sku
```

# EN
The category team is building a "Best sellers" page for each category. Each category needs its three leading items by revenue, so this time you rank separately inside each category.

This is your first window function, so I am sending a worked example along.

## Task
For orders placed in {{month_en}} and fully delivered: in each category, the three products with the highest goods revenue (quantity times unit price). Send the category name, SKU code, revenue and rank in the category. Equal revenue shares a rank and the next rank is skipped (like a sports ranking); take every product ranked 1 to 3. Sort by category name, then rank, then SKU code.

## Example
Example: in each city, in what order did the shops join the marketplace?

① PARTITION BY splits the rows into groups; the rank starts again from 1 in each group.

② The ORDER BY inside decides who is ranked 1: here the shop that joined earliest.

③ A window function drops no rows: each shop is still one row, with a rank column added.

## Hints
1. Two steps: compute the revenue of each product (with its category), then rank the products inside each category. Filter on the rank in the outermost query.
2. `RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk` in a `WITH` block, then the outer query filters `rnk <= 3` and sorts `ORDER BY category, rnk, sku`.
3. `WITH sales AS (...), ranked AS (SELECT category, sku, revenue, RANK() OVER (...) AS rnk FROM sales) SELECT category, sku, revenue, rnk FROM ranked WHERE rnk <= 3 ORDER BY category, rnk, sku`
