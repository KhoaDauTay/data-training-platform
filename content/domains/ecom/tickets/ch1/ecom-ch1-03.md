---
id: ecom-ch1-03
chapter: 1
title: Năm món đắt nhất cho banner
title_en: Five priciest items for the banner
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: twist
requires: [select, where]
grants: [order_by, limit]
tables: [products]
ordered: true
columns:
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Tên sản phẩm", en: "Product name" }
  - { vi: "Giá bán (đồng)", en: "Price (VND)" }
variants:
  - { cat: "3", cat_name: "Audio" }
  - { cat: "11", cat_name: "Skincare" }
  - { cat: "8", cat_name: "Women Fashion" }
reflect:
  q: { vi: "Nếu bỏ thứ tự phụ theo mã SKU thì sao?", en: "What happens without the second sort key on the SKU code?" }
  options:
    - { vi: "Hai món cùng giá có thể đổi chỗ giữa các lần chạy, và món thứ năm có thể khác đi", en: "Two items with the same price can swap places between runs, and the fifth item can change" }
    - { vi: "Kết quả luôn y hệt, thứ tự phụ chỉ để đẹp", en: "The result is always identical; the second key is only cosmetic" }
    - { vi: "Truy vấn báo lỗi", en: "The query fails" }
  answer: 0
  why: { vi: "Khi giá bằng nhau, cơ sở dữ liệu không hứa thứ tự nào. Thứ tự phụ làm kết quả chắc chắn, nhất là khi chỉ lấy vài dòng đầu.", en: "When prices tie, the database promises no order. A second key makes the result certain, especially when you keep only the first few rows." }
wrong:
  - sql: "SELECT sku, name, price FROM products WHERE category_id = {{cat}} AND is_active = true ORDER BY price, sku LIMIT 5"
    vi: "Bạn đang lấy 5 món rẻ nhất: sắp xếp mặc định là tăng dần. Đề cần đắt nhất lên đầu."
    en: "You are taking the 5 cheapest items: sorting is ascending by default. The request wants the most expensive first."
---
Tuần này banner trang chủ dành cho nhóm hàng {{cat_name}}. Banner chỉ có chỗ cho năm món, và sếp muốn trưng những món cao cấp nhất để kéo khách vào xem.

## Task
Gửi mình 5 sản phẩm đắt nhất đang còn bán của nhóm hàng số {{cat}} ({{cat_name}}): mã SKU, tên sản phẩm, giá bán. Đắt nhất lên đầu; cùng giá thì xếp theo mã SKU theo thứ tự chữ cái.

## Hints
1. Lọc đúng nhóm hàng và hàng còn bán như việc "Hàng giá mềm cho đợt khuyến mãi của shop", rồi xếp theo giá từ cao xuống thấp và chỉ giữ vài dòng đầu.
2. Nhóm hàng là cột `category_id`. Sắp xếp giảm dần viết `ORDER BY price DESC, sku`; giữ 5 dòng đầu viết `LIMIT 5` ở cuối câu.
3. `SELECT sku, name, price FROM products WHERE category_id = {{cat}} AND is_active = true ORDER BY ... LIMIT 5`

## Solution
```sql
SELECT sku, name, price
FROM products
WHERE category_id = {{cat}} AND is_active = true
ORDER BY price DESC, sku
LIMIT 5
```

# EN
This week the home page banner belongs to the {{cat_name}} category. The banner only has room for five items, and the merchandising lead wants the most premium ones to draw shoppers in.

## Task
Send me the 5 most expensive products still on sale in category number {{cat}} ({{cat_name}}): SKU code, product name, price. Most expensive first; on equal prices, by SKU code in alphabetical order.

## Hints
1. Filter the right category and the items still on sale like the task "Low-priced items for a shop promotion", then sort by price from high to low and keep only the first few rows.
2. The category is column `category_id`. A descending sort is written `ORDER BY price DESC, sku`; keeping the first 5 rows is `LIMIT 5` at the end of the query.
3. `SELECT sku, name, price FROM products WHERE category_id = {{cat}} AND is_active = true ORDER BY ... LIMIT 5`
