---
id: ecom-ch1-02
chapter: 1
title: Hàng giá mềm cho đợt khuyến mãi của shop
title_en: Low-priced items for a shop promotion
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 1
beat: develop
format: faded
requires: [select]
grants: [where]
tables: [products]
columns:
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Tên sản phẩm", en: "Product name" }
  - { vi: "Giá bán (đồng)", en: "Price (VND)" }
starter: |
  SELECT sku, name, price
  FROM products
  WHERE seller_id = ___ AND is_active = ___ AND price < ___
variants:
  - { seller: "16", max_k: "500" }
  - { seller: "19", max_k: "300" }
  - { seller: "27", max_k: "1000" }
reflect:
  q: { vi: "Ba điều kiện kết hợp với nhau bằng chữ AND nghĩa là gì?", en: "What does joining three conditions with AND mean?" }
  options:
    - { vi: "Một sản phẩm chỉ được giữ khi đúng cả ba điều kiện", en: "A product is kept only when all three conditions are true" }
    - { vi: "Một sản phẩm được giữ khi đúng ít nhất một điều kiện", en: "A product is kept when at least one condition is true" }
    - { vi: "Kết quả được sắp xếp theo ba điều kiện", en: "The result is sorted by the three conditions" }
  answer: 0
  why: { vi: "AND đòi mọi điều kiện cùng đúng. Muốn chỉ cần một điều kiện đúng thì dùng OR.", en: "AND needs every condition to be true. When one true condition is enough, use OR." }
wrong:
  - sql: "SELECT sku, name, price FROM products WHERE seller_id = {{seller}} AND price < {{max_k}}000"
    vi: "Danh sách còn cả sản phẩm shop đã ngừng bán. Đề chỉ cần hàng đang còn bán."
    en: "Your list still has products the shop no longer sells. The request is only for items still on sale."
---
Shop số {{seller}} sắp chạy một đợt khuyến mãi trên trang chủ. Bên ngành hàng cần biết shop có những món giá mềm nào để chọn hàng lên banner.

Câu truy vấn trong editor đã viết gần xong, chỉ còn mấy chỗ trống ___: mã shop, giá trị đúng hay sai cho cờ còn bán, và mức giá. Bạn điền cho đủ rồi nộp.

## Task
Gửi mình các sản phẩm của shop số {{seller}} đang còn bán và có giá dưới {{max_k}} nghìn đồng: mã SKU, tên sản phẩm, giá bán. Thứ tự dòng không quan trọng.

## Hints
1. Đây là bài lọc dòng: giữ lại những sản phẩm đúng mọi điều kiện của đề (đúng shop, còn bán, dưới mức giá).
2. Cột `seller_id` là mã shop, cột `is_active` là cờ còn bán (`true` hoặc `false`), giá lưu theo đồng nên {{max_k}} nghìn là `{{max_k}}000`.
3. `SELECT sku, name, price FROM products WHERE seller_id = {{seller}} AND is_active = true AND price < ...`

## Solution
```sql
SELECT sku, name, price
FROM products
WHERE seller_id = {{seller}} AND is_active = true AND price < {{max_k}}000
```

# EN
Shop number {{seller}} is about to run a promotion on the home page. The category team needs to know which low-priced items the shop has, to pick items for the banner.

The query in the editor is almost done; only a few ___ blanks are left: the shop number, the true-or-false value of the on-sale flag, and the price limit. Fill them in, then submit.

## Task
Send me the products of shop number {{seller}} that are still on sale and cost under {{max_k}} thousand VND: SKU code, product name, price. Row order does not matter.

## Hints
1. This is a row-filtering task: keep only the products that meet every condition of the request (the right shop, still on sale, under the price limit).
2. Column `seller_id` is the shop number, column `is_active` is the on-sale flag (`true` or `false`), and prices are stored in VND, so {{max_k}} thousand is `{{max_k}}000`.
3. `SELECT sku, name, price FROM products WHERE seller_id = {{seller}} AND is_active = true AND price < ...`
