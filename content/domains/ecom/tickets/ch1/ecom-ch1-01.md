---
id: ecom-ch1-01
chapter: 1
title: Danh bạ các shop trên sàn
title_en: The shop directory
from: { name: Lâm Gia Huy, dept: IT }
difficulty: 1
beat: teach
format: worked
requires: []
grants: [select]
tables: [sellers]
columns:
  - { vi: "Tên shop", en: "Shop name" }
  - { vi: "Thành phố", en: "City" }
  - { vi: "Ngày vào sàn", en: "Date joined" }
starter: SELECT * FROM sellers
reflect:
  q: { vi: "Vì sao không nộp luôn câu có sẵn trong editor (lấy mọi cột)?", en: "Why not submit the starter query in the editor (every column) as it is?" }
  options:
    - { vi: "Dấu * lấy mọi cột; đề cần đúng 3 cột theo thứ tự, thừa cột là sai", en: "The * takes every column; the request wants exactly 3 columns in order, so extra columns are wrong" }
    - { vi: "Lấy mọi cột chạy chậm hơn nhiều", en: "Taking every column runs much slower" }
    - { vi: "Dấu * không lấy được cột thành phố", en: "The * cannot fetch the city column" }
  answer: 0
  why: { vi: "Kết quả được so theo vị trí cột, nên chỉ liệt kê đúng các cột đề cần, đúng thứ tự đề nói.", en: "Results are compared by column position, so list exactly the columns the request asks for, in the order it gives." }
wrong:
  - sql: "SELECT city, name, joined_on FROM sellers"
    vi: "Đủ 3 cột nhưng sai thứ tự: đề cần tên shop trước, rồi thành phố, rồi ngày vào sàn. Kết quả được so theo vị trí cột."
    en: "Three columns, but in the wrong order: the request wants the shop name first, then the city, then the date joined. Results are compared by column position."
---
Chào bạn, chào mừng đến Chợ Lồng Đèn! Mình là Huy, trưởng nhóm dữ liệu, tuần này mình kèm bạn.

Chợ Lồng Đèn là sàn bán lẻ trực tuyến, mở cửa từ đầu năm 2025 ở Đà Nẵng. Hàng do các shop đối tác đăng bán, sàn lo thanh toán và giao hàng. Việc đầu tiên của bạn là làm quen với các shop. Đây cũng là lần đầu bạn viết truy vấn ở đây, nên mình gửi kèm một ví dụ mẫu: đọc, chạy thử, rồi làm phần của bạn.

## Task
Gửi mình danh bạ mọi shop đang có trên sàn. Với mỗi shop mình cần ba thông tin, theo thứ tự: tên shop, thành phố, ngày vào sàn. Thứ tự dòng không quan trọng.

## Example
```sql
SELECT sku, name, price   -- ①
FROM products             -- ②
```
Ví dụ: bảng giá nhanh cho mọi sản phẩm, gồm mã SKU, tên và giá bán.

① Sau chữ đầu tiên là các cột cần lấy, cách nhau bằng dấu phẩy, theo đúng thứ tự muốn thấy trong kết quả.

② Sau chữ thứ hai là bảng chứa các cột đó: ở đây là danh mục sản phẩm `products`.

## Hints
1. Đây là bài chọn cột: từ một danh mục, chỉ lấy đúng những thông tin cần. Tên, thành phố và ngày vào sàn đều là thông tin của chính shop, nên nằm trong danh mục shop; tab Cột ở panel bên dưới cho biết tên bảng và tên cột.
2. Bảng `sellers` có các cột `name`, `city`, `joined_on`. Editor có sẵn `SELECT * FROM sellers`, trong đó `*` lấy mọi cột; ở đây bạn chỉ cần 3 cột, cách nhau bằng dấu phẩy.
3. `SELECT ..., ..., ... FROM sellers`

## Solution
```sql
SELECT name, city, joined_on
FROM sellers
```

# EN
Hi, and welcome to Lantern Market! I am Huy, the data team lead, and I will be your mentor this week.

Lantern Market is an online marketplace that opened in Da Nang at the start of 2025. Partner shops list the goods; the marketplace handles payment and delivery. Your first job is to get to know the shops. It is also your first query here, so I am sending a worked example along: read it, run it, then do your part.

## Task
Send me the directory of every shop on the marketplace. For each shop I need three things, in this order: shop name, city, date joined. Row order does not matter.

## Example
Example: a quick price list of every product, with its SKU code, name and selling price.

① After the first word come the columns you want, separated by commas, in the order you want to see them in the result.

② After the second word comes the table that holds those columns: here the product list `products`.

## Hints
1. This is a column-picking task: from one list, take only the information you need. Name, city and date joined all describe the shop itself, so they live in the shop list; the Columns tab in the bottom panel shows the table and column names.
2. Table `sellers` has the columns `name`, `city`, `joined_on`. The editor starts with `SELECT * FROM sellers`, where `*` takes every column; here you only need 3 columns, separated by commas.
3. `SELECT ..., ..., ... FROM sellers`
