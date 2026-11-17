---
id: ecom-ch1-05
chapter: 1
title: "Đánh giá thăng tiến: buổi gặp nhà sáng lập"
title_en: "Promotion review: meeting the founder"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 2
beat: boss
requires: [select, where, order_by, limit]
grants: []
tables: [sellers, products, customers]
ordered: true
columns:
  - [{ vi: "Tên shop", en: "Shop name" }, { vi: "Ngày vào sàn", en: "Date joined" }]
  - [{ vi: "Mã SKU", en: "SKU code" }, { vi: "Tên sản phẩm", en: "Product name" }, { vi: "Giá bán (đồng)", en: "Price (VND)" }]
  - [{ vi: "Mã khách", en: "Customer number" }, { vi: "Họ tên", en: "Full name" }, { vi: "Ngày đăng ký", en: "Signup date" }]
conclusion:
  question: "Ở bước 2, vì sao phải xếp thêm theo mã SKU sau khi đã xếp theo giá?"
  options:
    - "Để hai món cùng giá luôn đứng theo một thứ tự cố định, nên mười món được chọn không đổi giữa các lần chạy"
    - "Để kết quả chạy nhanh hơn"
    - "Vì giá không sắp xếp được"
  answer: 0
conclusion_en:
  question: "In step 2, why sort by the SKU code after sorting by price?"
  options:
    - "So two items with the same price always stand in one fixed order, and the ten items picked never change between runs"
    - "To make the query run faster"
    - "Because prices cannot be sorted"
---
Đây là buổi đánh giá thăng tiến của bạn. Mình là Hà, người sáng lập Chợ Lồng Đèn. Chiều nay mình gặp nhà đầu tư và cần ba bảng số nhỏ. Làm đúng cả ba là bạn qua thử việc.

## Step 1: Shop chính hãng ở Đà Nẵng
Các shop chính hãng (có nhãn chính hãng) ở thành phố Da Nang: tên shop và ngày vào sàn. Shop vào sàn sớm nhất lên đầu; cùng ngày thì xếp theo tên shop.
```sql
SELECT name, joined_on
FROM sellers
WHERE city = 'Da Nang' AND is_official = true
ORDER BY joined_on, name
```

## Step 2: Mười món đắt nhất
Mười sản phẩm đắt nhất đang còn bán trên toàn sàn: mã SKU, tên sản phẩm, giá bán. Đắt nhất lên đầu; cùng giá thì mã SKU nhỏ hơn đứng trước.
```sql
SELECT sku, name, price
FROM products
WHERE is_active = true
ORDER BY price DESC, sku
LIMIT 10
```

## Step 3: Năm khách đầu tiên ở Huế đến nhờ bạn bè giới thiệu
Năm khách ở thành phố Hue đăng ký sớm nhất trong số khách đến sàn nhờ bạn bè giới thiệu: mã khách, họ tên, ngày đăng ký. Đăng ký sớm nhất lên đầu; cùng ngày thì mã khách nhỏ hơn đứng trước.
```sql
SELECT id, full_name, signup_date
FROM customers
WHERE city = 'Hue' AND channel = 'referral'
ORDER BY signup_date, id
LIMIT 5
```

## Hints
1. Bước 1 lọc danh mục shop theo thành phố và nhãn chính hãng. Bước 2 là bài năm món đắt nhất, nhưng trên toàn sàn và lấy mười. Bước 3 lọc khách theo thành phố và kênh khách đến, rồi lấy năm người đăng ký sớm nhất.
2. Bước 1: cột `is_official`. Bước 3: kênh khách đến là cột `channel`, giá trị `'referral'` là bạn bè giới thiệu; ngày đăng ký là `signup_date`.
3. `SELECT id, full_name, signup_date FROM customers WHERE city = 'Hue' AND channel = 'referral' ORDER BY ... LIMIT 5`

# EN
This is your promotion review. I am Ha, the founder of Lantern Market. This afternoon I meet an investor and I need three small tables of figures. Get all three right and you pass your probation.

## Step 1: Official shops in Da Nang
The official shops (with the official label) in the city of Da Nang: shop name and date joined. The shop that joined earliest first; on the same date, by shop name.

## Step 2: The ten priciest items
The ten most expensive products still on sale on the whole marketplace: SKU code, product name, price. Most expensive first; on equal prices, the smaller SKU code first.

## Step 3: The first five customers in Hue who came through a friend
Among customers in the city of Hue who came to the marketplace because a friend referred them, the five who signed up earliest: customer number, full name, signup date. Earliest signup first; on the same date, the smaller customer number first.

## Hints
1. Step 1 filters the shop list by city and the official label. Step 2 is the five-priciest task, but across the whole marketplace and taking ten. Step 3 filters customers by city and by how they came, then takes the five earliest signups.
2. Step 1: column `is_official`. Step 3: how a customer came is column `channel`, the value `'referral'` means a friend referred them; the signup date is `signup_date`.
3. `SELECT id, full_name, signup_date FROM customers WHERE city = 'Hue' AND channel = 'referral' ORDER BY ... LIMIT 5`
