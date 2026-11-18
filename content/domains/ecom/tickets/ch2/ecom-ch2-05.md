---
id: ecom-ch2-05
chapter: 2
title: "Đánh giá thăng tiến: báo cáo bán hàng tháng 10"
title_en: "Promotion review: the October sales report"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 2
beat: boss
requires: [aggregate, group_by, having]
grants: []
tables: [payments, customers, order_items]
columns:
  - [{ vi: "Cách thanh toán", en: "Payment method" }, { vi: "Số khoản đã thu", en: "Payments collected" }, { vi: "Tổng tiền thu (đồng)", en: "Total collected (VND)" }]
  - [{ vi: "Thành phố", en: "City" }, { vi: "Số khách", en: "Customers" }]
  - [{ vi: "Mã sản phẩm", en: "Product number" }, { vi: "Số món đã bán", en: "Units sold" }]
conclusion:
  question: "Ở bước 3, điều kiện từ 150 món trở lên được kiểm vào lúc nào?"
  options:
    - "Sau khi đã cộng số món của từng sản phẩm, trên tổng của nhóm"
    - "Trước khi cộng, trên từng dòng hàng của đơn"
    - "Không cần điều kiện, chỉ cần sắp xếp giảm dần"
  answer: 0
conclusion_en:
  question: "In step 3, when is the condition of 150 units or more checked?"
  options:
    - "After the units of each product are added up, on the group total"
    - "Before adding, on each order line"
    - "No condition is needed, only sorting high to low"
---
Đây là buổi đánh giá thăng tiến của bạn. Sáng thứ Hai mình họp tổng kết tháng 10 với kế toán, marketing và ngành hàng, và cần ba bảng số. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Tiền thu tháng 10 theo cách thanh toán
Tháng 10/2026 (theo thời điểm thu tiền), với mỗi cách thanh toán: số khoản đã thu thành công và tổng tiền thu được. Khoản lỗi hay đã hoàn tiền thì bỏ. Thứ tự dòng không quan trọng.
```sql
SELECT method, count(*), sum(amount)
FROM payments
WHERE status = 'paid' AND paid_at >= '2026-10-01' AND paid_at < '2026-11-01'
GROUP BY method
```

## Step 2: Thành phố có nhiều khách
Những thành phố có từ 500 khách đăng ký trở lên (tính mọi khách từ ngày mở sàn): tên thành phố và số khách. Thứ tự dòng không quan trọng.
```sql
SELECT city, count(*)
FROM customers
GROUP BY city
HAVING count(*) >= 500
```

## Step 3: Sản phẩm bán chạy
Những sản phẩm đã bán được từ 150 món trở lên, cộng mọi dòng hàng của mọi đơn từ ngày mở sàn: mã sản phẩm và tổng số món. Thứ tự dòng không quan trọng.
```sql
SELECT product_id, sum(quantity)
FROM order_items
GROUP BY product_id
HAVING sum(quantity) >= 150
```

## Hints
1. Cả ba bước đều gom nhóm rồi tính. Bước 1 lọc dòng trước khi gom; bước 2 và 3 lọc nhóm sau khi gom.
2. Bước 1: `status = 'paid'`, nhóm theo `method`. Bước 2: nhóm theo `city`, `HAVING count(*) >= 500`. Bước 3: số món là cột `quantity`, nhóm theo `product_id`, `HAVING sum(quantity) >= 150`.
3. `SELECT product_id, sum(quantity) FROM order_items GROUP BY product_id HAVING ...`

# EN
This is your promotion review. On Monday morning I run the October wrap-up with accounting, marketing and the category team, and I need three tables of figures. Get all three right and you take another step in your career.

## Step 1: October money by payment method
For October 2026 (by the moment the money was collected), for each payment method: the number of payments collected successfully and the total collected. Drop failed or refunded payments. Row order does not matter.

## Step 2: Cities with many customers
The cities with 500 or more registered customers (every customer since the marketplace opened): city name and number of customers. Row order does not matter.

## Step 3: Best sellers
The products that sold 150 units or more, adding up every order line of every order since the marketplace opened: product number and total units. Row order does not matter.

## Hints
1. All three steps group and then compute. Step 1 filters rows before grouping; steps 2 and 3 filter groups after grouping.
2. Step 1: `status = 'paid'`, grouped by `method`. Step 2: grouped by `city`, `HAVING count(*) >= 500`. Step 3: units are column `quantity`, grouped by `product_id`, `HAVING sum(quantity) >= 150`.
3. `SELECT product_id, sum(quantity) FROM order_items GROUP BY product_id HAVING ...`
