---
id: except
title: "EXCEPT và INTERSECT: hiệu và giao của hai danh sách"
title_en: "EXCEPT and INTERSECT: difference and intersection of two lists"
minutes: 20
figures: [{ name: sql-set-ops, at: idea, variant: except }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tìm những gì có ở danh sách này mà danh sách kia không có (`EXCEPT`).
    en: Find what one list has and the other does not (`EXCEPT`).
  - vi: Tìm những gì có ở cả hai danh sách (`INTERSECT`).
    en: Find what both lists have (`INTERSECT`).
  - vi: Đặt hai bên đúng chiều, cùng cột và cùng ý nghĩa.
    en: Put the two sides in the right direction, with the same columns and meaning.
syntax: |-
  SELECT key FROM table_a [WHERE ...]
  { EXCEPT | INTERSECT } [ALL]
  SELECT key FROM table_b [WHERE ...]
options:
  - { code: "A EXCEPT B", vi: "dòng có trong A mà không có trong B; đổi chỗ là đổi câu hỏi", en: "rows in A that are not in B; swapping the sides changes the question" }
  - { code: "A INTERSECT B", vi: "dòng có ở cả A và B", en: "rows that are in both A and B" }
  - { code: "ALL", vi: "giữ số lần lặp thay vì bỏ trùng", en: "keeps repeat counts instead of removing duplicates" }
  - { code: "SELECT a, b … EXCEPT SELECT a, b …", vi: "hai bên cùng số cột; mọi cột phải bằng nhau mới tính là trùng", en: "same number of columns; every column must be equal to count as a match" }
  - { code: "NULL", vi: "ở đây hai NULL được coi là bằng nhau (khác `NOT IN`)", en: "here two NULLs count as equal (unlike `NOT IN`)" }
examples:
  - title: { vi: "Khách mua tháng 9 nhưng không quay lại tháng 10", en: "September buyers who did not come back in October" }
    sql: |-
      SELECT customer_id FROM orders
      WHERE order_date >= '2026-09-01' AND order_date < '2026-10-01' AND customer_id IS NOT NULL
      EXCEPT
      SELECT customer_id FROM orders
      WHERE order_date >= '2026-10-01'
    read:
      vi: "57 khách. Bên trái là \"mua tháng 9\", bên phải là \"mua từ tháng 10\"; `EXCEPT` giữ những ai chỉ có ở bên trái. Kết quả không trùng: mỗi khách một lần."
      en: "57 customers. The left side is \"bought in September\", the right \"bought from October\"; `EXCEPT` keeps those found only on the left. The result has no repeats: each customer once."
  - title: { vi: "Khách mua ở cả hai cửa hàng", en: "Customers who bought at both stores" }
    sql: |-
      SELECT customer_id FROM orders WHERE store_id = 1 AND customer_id IS NOT NULL
      INTERSECT
      SELECT customer_id FROM orders WHERE store_id = 2
      ORDER BY customer_id
    read:
      vi: "66 khách có đơn ở cả Hai Chau (1) và Son Tra (2). Với `INTERSECT`, thứ tự hai bên không quan trọng."
      en: "66 customers ordered at both Hai Chau (1) and Son Tra (2). With `INTERSECT`, the order of the two sides does not matter."
  - title: { vi: "Thành phố có khách nhưng chưa có cửa hàng", en: "Cities with customers but no store" }
    sql: |-
      SELECT city FROM customers WHERE city IS NOT NULL
      EXCEPT
      SELECT city FROM stores
    read:
      vi: "Huế và Cần Thơ: nơi có khách mà chuỗi chưa mở cửa hàng. Một câu ngắn trả lời một câu hỏi kinh doanh thật."
      en: "Hue and Can Tho: places with customers where the chain has no store yet. A short query answers a real business question."
  - title: { vi: "Sản phẩm không có trong các đơn mới nhất", en: "Products missing from the newest orders" }
    sql: |-
      SELECT id FROM products
      EXCEPT
      SELECT product_id FROM order_items WHERE order_id >= 1410
      ORDER BY id
    read:
      vi: "4 sản phẩm (5, 9, 12, 17). Cùng câu hỏi với anti-join ở Phần 5, nhưng chỉ trả về cột khóa; muốn thêm tên thì cần nối lại."
      en: "4 products (5, 9, 12, 17). The same question as the Part 5 anti-join, but it only returns the key column; to add names you join again."
  - title: { vi: "Giao giữ số lần lặp", en: "An intersection that keeps repeats" }
    sql: |-
      SELECT product_id FROM order_items WHERE order_id BETWEEN 1400 AND 1405
      INTERSECT ALL
      SELECT product_id FROM order_items WHERE order_id BETWEEN 1406 AND 1411
    read:
      vi: "6 dòng: các món bán ở cả hai nhóm đơn, và món 15 hiện hai lần vì nó có ít nhất hai dòng ở mỗi bên. Không có `ALL` thì chỉ còn 5 dòng: `ALL` giữ số lần lặp chung của hai bên."
      en: "6 rows: the items sold in both batches of orders, with item 15 twice because it has at least two lines on each side. Without `ALL` only 5 rows are left: `ALL` keeps the repeat count both sides share."
pitfalls:
  - title: { vi: "Đảo chiều EXCEPT", en: "EXCEPT the wrong way round" }
    wrong: "SELECT customer_id FROM orders WHERE order_date >= '2026-10-01' EXCEPT SELECT customer_id FROM orders WHERE order_date >= '2026-09-01' AND order_date < '2026-10-01' AND customer_id IS NOT NULL"
    fix: "SELECT customer_id FROM orders WHERE order_date >= '2026-09-01' AND order_date < '2026-10-01' AND customer_id IS NOT NULL EXCEPT SELECT customer_id FROM orders WHERE order_date >= '2026-10-01'"
    why:
      vi: "Câu sai trả lời câu hỏi khác: \"khách mới của tháng 10\" (67 dòng, có cả một dòng trống cho khách vãng lai). `EXCEPT` không đối xứng; đọc thành \"bên trái, trừ bên phải\" trước khi chạy."
      en: "The wrong query answers another question: \"October's new customers\" (67 rows, including one empty row for walk-ins). `EXCEPT` is not symmetric; read it as \"left minus right\" before running."
  - title: { vi: "Hai bên khác số cột", en: "Different column counts" }
    wrong: "SELECT name, city FROM customers WHERE city = 'Hue' EXCEPT SELECT name FROM customers WHERE birth_year < 1980"
    fix: "SELECT name, city FROM customers WHERE city = 'Hue' EXCEPT SELECT name, city FROM customers WHERE birth_year < 1980"
    why:
      vi: "Như `UNION`, hai bên phải có cùng số cột: lỗi 42601. Nhớ rằng phép so là trên cả dòng: thêm một cột lệch ý nghĩa (như ngày đặt) làm dòng nào cũng thành khác nhau."
      en: "As with `UNION`, both sides need the same number of columns: error 42601. Remember the comparison is on whole rows: one extra column with a different meaning (such as an order date) makes every row different."
quiz:
  - q:
      vi: "`A EXCEPT B` có bằng `B EXCEPT A` không?"
      en: "Is `A EXCEPT B` the same as `B EXCEPT A`?"
    options:
      - { vi: "Có, như `INTERSECT`", en: "Yes, like `INTERSECT`" }
      - { vi: "Không: một bên là \"có ở A, không ở B\", bên kia ngược lại", en: "No: one is \"in A, not in B\", the other the reverse" }
      - { vi: "Có, nếu không có NULL", en: "Yes, if there are no NULLs" }
    answer: 1
    trap: 0
    why:
      vi: "`UNION` và `INTERSECT` đối xứng, nên dễ nghĩ cả họ phép tập hợp đều vậy. `EXCEPT` giống phép trừ: 5 − 3 khác 3 − 5."
      en: "`UNION` and `INTERSECT` are symmetric, so it is easy to think the whole family is. `EXCEPT` is like subtraction: 5 − 3 is not 3 − 5."
  - q:
      vi: "Danh sách bên phải của `EXCEPT` có một NULL. Kết quả có ra 0 dòng như `NOT IN` không?"
      en: "The right-hand list of an `EXCEPT` holds a NULL. Does the result drop to 0 rows like `NOT IN`?"
    options:
      - { vi: "Có, NULL luôn làm hỏng phép so", en: "Yes, NULL always breaks comparisons" }
      - { vi: "Không: các phép tập hợp coi hai NULL là bằng nhau, nên chỉ dòng NULL bên trái bị trừ", en: "No: set operations treat two NULLs as equal, so only a NULL row on the left is removed" }
      - { vi: "Báo lỗi", en: "An error" }
    answer: 1
    trap: 0
    why:
      vi: "Sau bẫy `NOT IN`, nghi ngờ NULL là phản xạ tốt, nhưng ở đây không đúng. `EXCEPT`, `INTERSECT`, `UNION` và `DISTINCT` so dòng theo kiểu \"có giống nhau không\", trong đó NULL giống NULL."
      en: "After the `NOT IN` trap, distrusting NULL is a good reflex, but not here. `EXCEPT`, `INTERSECT`, `UNION` and `DISTINCT` compare rows as \"are they the same\", where NULL is the same as NULL."
recap:
  - vi: "`EXCEPT` = có ở bên trái, không có ở bên phải; không đối xứng."
    en: "`EXCEPT` = on the left, not on the right; not symmetric."
  - vi: "`INTERSECT` = có ở cả hai; `ALL` giữ số lần lặp."
    en: "`INTERSECT` = on both sides; `ALL` keeps repeat counts."
  - vi: "So cả dòng: cùng số cột, cùng ý nghĩa; NULL được coi là bằng NULL."
    en: "Whole rows are compared: same columns, same meaning; NULL counts as equal to NULL."
sources:
  - https://www.postgresql.org/docs/current/queries-union.html
---
## Mở bài

Marketing hỏi: "Ai mua hàng trong tháng 9 nhưng không quay lại trong tháng 10?" Bạn có hai danh sách khách, một cho mỗi tháng. Câu trả lời là danh sách thứ nhất **trừ đi** danh sách thứ hai.

## Ý chính

`EXCEPT` giữ những dòng có ở kết quả bên trái mà không có ở bên phải. `INTERSECT` giữ những dòng có ở cả hai bên. Như `UNION`, hai bên phải cùng số cột và khớp theo vị trí, và kết quả mặc định bỏ trùng (thêm `ALL` để giữ số lần lặp).

Nhiều người nghĩ **thứ tự hai bên không quan trọng**, vì với `UNION` và `INTERSECT` là vậy. Với `EXCEPT`, đổi chỗ là đổi hẳn câu hỏi: "khách tháng 9 không quay lại" thành "khách mới của tháng 10". Đọc to "bên trái, trừ bên phải" trước khi chạy.

Hình cuối mục này dùng lại thành phố của cửa hàng và của khách: `EXCEPT` giữ Hue và Can Tho, hai nơi có khách mà chưa có cửa hàng.

## Cú pháp

`EXCEPT` và `INTERSECT` viết giữa hai câu `SELECT`, như `UNION`.

# EN

## Opening

Marketing asks: "Who bought in September but did not come back in October?" You have two lists of customers, one per month. The answer is the first list **minus** the second.

## Key idea

`EXCEPT` keeps the rows of the left result that are not in the right one. `INTERSECT` keeps the rows found on both sides. As with `UNION`, both sides need the same number of columns matched by position, and by default the result has no repeats (add `ALL` to keep repeat counts).

Many people think **the order of the two sides does not matter**, because it does not for `UNION` and `INTERSECT`. With `EXCEPT`, swapping the sides changes the question entirely: "September customers who did not return" becomes "October's new customers". Say "left minus right" aloud before running.

The figure at the end of this section reuses the stores' and the customers' cities: `EXCEPT` keeps Hue and Can Tho, the two places with customers and no store.

## Syntax

`EXCEPT` and `INTERSECT` go between two `SELECT`s, like `UNION`.
