---
id: ecom-ch3-02
chapter: 3
title: Doanh thu theo nhóm hàng
title_en: Revenue by category
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: develop
format: faded
requires: [join, aggregate, group_by]
grants: [multi_join]
tables: [order_items, orders, products, categories]
columns:
  - { vi: "Nhóm hàng", en: "Category" }
  - { vi: "Doanh thu hàng (đồng)", en: "Goods revenue (VND)" }
starter: |
  SELECT c.name, sum(i.quantity * i.unit_price)
  FROM order_items i
  JOIN orders o ON o.id = ___
  JOIN products p ON p.id = ___
  JOIN categories c ON c.id = ___
  WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
  GROUP BY c.name
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "12/2025", month_en: "December 2025", from: "2025-12-01", to: "2026-01-01" }
reflect:
  q: { vi: "Vì sao phải đi qua danh mục sản phẩm mới tới được nhóm hàng?", en: "Why go through the product list to reach the category?" }
  options:
    - { vi: "Dòng hàng chỉ ghi mã sản phẩm; mã nhóm hàng nằm ở sản phẩm", en: "An order line only holds the product number; the category number lives on the product" }
    - { vi: "Để kết quả chạy nhanh hơn", en: "To make the query faster" }
    - { vi: "Vì nhóm hàng không có tên", en: "Because categories have no name" }
  answer: 0
  why: { vi: "Mỗi lần ghép đi thêm một bước theo khóa: dòng hàng → sản phẩm → nhóm hàng.", en: "Each join walks one more step along a key: order line → product → category." }
wrong:
  - sql: "SELECT c.name, sum(i.quantity * i.unit_price) FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id WHERE o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY c.name"
    vi: "Bạn đang cộng cả đơn bị hủy và đơn chưa giao. Đề chỉ tính đơn đã giao."
    en: "You are adding cancelled and not-yet-delivered orders too. The request only counts delivered orders."
---
Mỗi quý ngành hàng xếp lại vị trí các nhóm hàng trên ứng dụng. Nhóm nào mang về nhiều tiền thì được chỗ đẹp hơn, nên mình cần doanh thu theo nhóm hàng.

Dữ liệu nằm ở bốn bảng. Câu truy vấn trong editor đã viết sẵn đường đi, chỉ còn ba điều kiện ghép ___ chưa điền.

## Task
Các đơn đặt trong tháng {{month}} và đã giao xong: doanh thu hàng (số lượng nhân đơn giá, cộng mọi dòng hàng) theo từng nhóm hàng. Gửi tên nhóm hàng và doanh thu. Thứ tự dòng không quan trọng.

## Hints
1. Dòng hàng có mã đơn và mã sản phẩm; sản phẩm có mã nhóm hàng; tên nhóm hàng nằm ở danh mục nhóm hàng. Mỗi lần ghép đi thêm một bước.
2. `o.id = i.order_id`, `p.id = i.product_id`, `c.id = p.category_id`.
3. `... JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id ...`

## Solution
```sql
SELECT c.name, sum(i.quantity * i.unit_price)
FROM order_items i
JOIN orders o ON o.id = i.order_id
JOIN products p ON p.id = i.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
GROUP BY c.name
```

# EN
Every quarter the category team reshuffles where categories sit in the app. The categories that bring in the most money get the best spots, so I need revenue by category.

The data sits in four tables. The query in the editor already walks the path; only the three ___ join conditions are missing.

## Task
For orders placed in {{month_en}} and fully delivered: goods revenue (quantity times unit price, added over every order line) per category. Send the category name and the revenue. Row order does not matter.

## Hints
1. An order line has an order number and a product number; a product has a category number; the category name is in the category list. Each join walks one more step.
2. `o.id = i.order_id`, `p.id = i.product_id`, `c.id = p.category_id`.
3. `... JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id ...`
