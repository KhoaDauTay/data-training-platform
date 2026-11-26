---
id: ecom-ch3-05
chapter: 3
title: "Đánh giá thăng tiến: shop, sản phẩm và tiền chưa thu"
title_en: "Promotion review: shops, products and money never collected"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 3
beat: boss
requires: [multi_join, left_join, anti_join, join, aggregate, group_by, order_by, limit]
grants: []
tables: [order_items, orders, products, sellers, reviews, customers, payments]
ordered: true
columns:
  - [{ vi: "Tên shop", en: "Shop name" }, { vi: "Doanh thu hàng (đồng)", en: "Goods revenue (VND)" }]
  - [{ vi: "Mã SKU", en: "SKU code" }, { vi: "Tên sản phẩm", en: "Product name" }]
  - [{ vi: "Thành phố của khách", en: "Customer city" }, { vi: "Số đơn hủy chưa có thanh toán", en: "Cancelled orders with no payment" }]
conclusion:
  question: "Ở bước 2, vì sao điều kiện về ngày đánh giá phải nằm trong điều kiện ghép, không nằm trong điều kiện lọc dòng?"
  options:
    - "Lọc dòng chạy sau khi ghép: điều kiện ngày trên đánh giá sẽ loại luôn các sản phẩm không có đánh giá, nên không còn gì để tìm"
    - "Vì điều kiện ngày chạy nhanh hơn khi ghép"
    - "Đặt ở đâu cũng cho cùng kết quả"
  answer: 0
conclusion_en:
  question: "In step 2, why must the condition on the review date sit in the join condition, not in the row filter?"
  options:
    - "The row filter runs after the join: a date condition on reviews would also drop the products with no review, leaving nothing to find"
    - "Because the date condition runs faster inside the join"
    - "Either place gives the same result"
---
Đây là buổi đánh giá thăng tiến của bạn. Hội đồng quản trị hỏi mình ba câu về shop, sản phẩm và tiền, và mình cần số liệu trước chiều nay. Làm đúng cả ba là bạn trở thành Data Analyst chính thức.

## Step 1: Năm shop bán được nhiều tiền nhất quý 3
Các đơn đặt trong quý 3/2026 (từ 01/07 đến hết 30/09) và đã giao xong: năm shop có doanh thu hàng (số lượng nhân đơn giá) lớn nhất. Gửi tên shop và doanh thu; lớn nhất lên đầu, bằng nhau thì xếp theo tên shop.
```sql
SELECT s.name, sum(i.quantity * i.unit_price)
FROM order_items i
JOIN orders o ON o.id = i.order_id
JOIN products p ON p.id = i.product_id
JOIN sellers s ON s.id = p.seller_id
WHERE o.status = 'delivered' AND o.ordered_at >= '2026-07-01' AND o.ordered_at < '2026-10-01'
GROUP BY s.id, s.name
ORDER BY 2 DESC, s.name
LIMIT 5
```

## Step 2: Sản phẩm không ai đánh giá từ tháng 7
Những sản phẩm đang còn bán mà chưa nhận đánh giá nào từ ngày 01/07/2026 (đánh giá trước đó không tính): mã SKU và tên sản phẩm, xếp theo mã SKU.
```sql
SELECT p.sku, p.name
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id AND r.created_on >= '2026-07-01'
WHERE r.id IS NULL AND p.is_active = true
ORDER BY p.sku
```

## Step 3: Đơn hủy chưa có thanh toán
Những đơn đã hủy mà không có một khoản thanh toán nào (khách trả khi nhận hàng rồi hủy trước khi giao), đếm theo thành phố của khách. Gửi thành phố và số đơn, xếp theo tên thành phố.
```sql
SELECT c.city, count(*)
FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.status = 'cancelled' AND p.id IS NULL
GROUP BY c.city
ORDER BY c.city
```

## Hints
1. Bước 1 đi qua bốn bảng như bài doanh thu theo nhóm hàng, nhưng dừng ở shop. Bước 2 và 3 tìm thứ không có: giữ mọi sản phẩm (hay mọi đơn), gắn đánh giá (hay thanh toán) nếu có, rồi giữ dòng không gắn được gì.
2. Bước 1: `JOIN sellers s ON s.id = p.seller_id`, gom theo `s.id, s.name`. Bước 2: điều kiện ngày đặt trong phần nối `ON r.product_id = p.id AND r.created_on >= '2026-07-01'`, rồi lọc `r.id IS NULL`. Bước 3: `LEFT JOIN payments p ON p.order_id = o.id` và `p.id IS NULL`.
3. `SELECT p.sku, p.name FROM products p LEFT JOIN reviews r ON ... WHERE r.id IS NULL AND p.is_active = true ORDER BY p.sku`

# EN
This is your promotion review. The board asked me three questions about shops, products and money, and I need the figures before this afternoon. Get all three right and you become a full Data Analyst.

## Step 1: The five top-earning shops of Q3
For orders placed in Q3 2026 (1 July to 30 September) and fully delivered: the five shops with the highest goods revenue (quantity times unit price). Send the shop name and revenue; highest first, on equal revenue by shop name.

## Step 2: Products nobody reviewed since July
The products still on sale that have received no review since 1 July 2026 (older reviews do not count): SKU code and product name, sorted by SKU code.

## Step 3: Cancelled orders with no payment
The cancelled orders that have no payment at all (customers paying on delivery who cancelled before delivery), counted by the customer's city. Send the city and the number of orders, sorted by city name.

## Hints
1. Step 1 walks four tables like the revenue-by-category task, but stops at the shop. Steps 2 and 3 look for what is missing: keep every product (or every order), attach reviews (or payments) if any, then keep the rows with nothing attached.
2. Step 1: `JOIN sellers s ON s.id = p.seller_id`, grouped by `s.id, s.name`. Step 2: the date condition goes into the join `ON r.product_id = p.id AND r.created_on >= '2026-07-01'`, then filter `r.id IS NULL`. Step 3: `LEFT JOIN payments p ON p.order_id = o.id` and `p.id IS NULL`.
3. `SELECT p.sku, p.name FROM products p LEFT JOIN reviews r ON ... WHERE r.id IS NULL AND p.is_active = true ORDER BY p.sku`
