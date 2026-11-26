---
id: in_subquery
title: "IN với truy vấn con: lọc theo một danh sách tính ra"
title_en: "IN with a subquery: filter by a computed list"
minutes: 25
figures: [{ name: sql-not-in-null, at: examples }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Lọc một bảng theo danh sách mã lấy từ bảng khác bằng `IN (SELECT …)`.
    en: Filter a table by a list of ids taken from another table with `IN (SELECT …)`.
  - vi: Chọn `IN` thay vì `JOIN` khi chỉ cần biết "có trong danh sách", để không nhân dòng.
    en: Choose `IN` over `JOIN` when you only need "is in the list", so rows are not multiplied.
  - vi: Tránh bẫy `NOT IN` khi danh sách có ô trống.
    en: Avoid the `NOT IN` trap when the list contains empty cells.
syntax: |-
  SELECT column
  FROM table_a
  WHERE key [NOT] IN (SELECT other_key FROM table_b WHERE condition)
options:
  - { code: "IN (SELECT x …)", vi: "truy vấn con trả một cột, nhiều dòng; giữ dòng có giá trị nằm trong đó", en: "the subquery returns one column, many rows; keeps rows whose value is in it" }
  - { code: "NOT IN (SELECT x …)", vi: "giữ dòng không có trong danh sách; hỏng nếu danh sách có NULL", en: "keeps rows not in the list; breaks if the list holds a NULL" }
  - { code: "WHERE x IS NOT NULL", vi: "lọc ô trống trong truy vấn con trước khi dùng `NOT IN`", en: "removes empty cells inside the subquery before `NOT IN`" }
  - { code: "IN (SELECT store_id …)", vi: "giá trị lặp trong danh sách không làm dòng ngoài lặp", en: "repeated values in the list do not repeat outer rows" }
examples:
  - title: { vi: "Cửa hàng có bán được đơn trong một ngày", en: "Stores that sold something on a day" }
    sql: |-
      SELECT name, city
      FROM stores
      WHERE id IN (SELECT store_id FROM orders WHERE order_date = '2026-10-29')
    read:
      vi: "3 cửa hàng. Truy vấn con trả 7 mã cửa hàng (có lặp, vì một cửa hàng bán nhiều đơn), nhưng mỗi cửa hàng chỉ ra một lần."
      en: "3 stores. The subquery returns 7 store ids (with repeats, since a store sells several orders), but each store comes out once."
  - title: { vi: "Tên các món trong một đơn", en: "The items in one order" }
    sql: |-
      SELECT name
      FROM products
      WHERE id IN (SELECT product_id FROM order_items WHERE order_id = 1416)
    read:
      vi: "3 món của đơn 1416. Danh sách mã sản phẩm được tính ra từ `order_items`, bạn không phải gõ tay."
      en: "The 3 items of order 1416. The list of product ids is computed from `order_items`, so you do not type it by hand."
  - title: { vi: "Danh sách lấy từ một điều kiện trên bảng khác", en: "A list from a condition on another table" }
    sql: |-
      SELECT name
      FROM staff
      WHERE store_id IN (SELECT id FROM stores WHERE city = 'Da Nang')
    read:
      vi: "6 nhân viên làm ở hai cửa hàng Đà Nẵng. Câu đọc gần như tiếng nói: nhân viên có cửa hàng nằm trong các cửa hàng ở Đà Nẵng."
      en: "6 staff working in the two Da Nang stores. The query reads almost like speech: staff whose store is among the Da Nang stores."
  - title: { vi: "NOT IN an toàn", en: "A safe NOT IN" }
    sql: |-
      SELECT id, name
      FROM customers
      WHERE city = 'Hue'
        AND id NOT IN (SELECT customer_id FROM orders WHERE order_date >= '2026-09-01' AND customer_id IS NOT NULL)
    read:
      vi: "9 khách ở Huế không đặt đơn nào từ tháng 9. `customer_id IS NOT NULL` trong truy vấn con là phần quan trọng: thiếu nó, kết quả là 0 dòng (xem bẫy 1). Hình cuối mục này cho thấy vì sao cần lọc NULL: một ô trống làm `NOT IN` trả 0 dòng."
      en: "9 customers in Hue with no order since September. The `customer_id IS NOT NULL` in the subquery is the key part: without it the result is 0 rows (see pitfall 1). The figure at the end of this section shows why the NULL filter is needed: one empty cell makes `NOT IN` return 0 rows."
pitfalls:
  - title: { vi: "NOT IN gặp một NULL", en: "NOT IN meets a NULL" }
    wrong: "SELECT id, name FROM customers WHERE city = 'Hue' AND id NOT IN (SELECT customer_id FROM orders WHERE order_date >= '2026-09-01')"
    fix: "SELECT id, name FROM customers WHERE city = 'Hue' AND id NOT IN (SELECT customer_id FROM orders WHERE order_date >= '2026-09-01' AND customer_id IS NOT NULL)"
    why:
      vi: "Đơn khách vãng lai có `customer_id` trống. `x NOT IN (…, NULL)` không bao giờ đúng: với NULL, Postgres không chắc x khác nó. Câu sai ra 0 dòng, không lỗi. Lọc NULL trong truy vấn con, hoặc dùng `NOT EXISTS`."
      en: "Walk-in orders have an empty `customer_id`. `x NOT IN (…, NULL)` is never true: against a NULL, Postgres cannot be sure x differs. The wrong query returns 0 rows, no error. Filter NULLs in the subquery, or use `NOT EXISTS`."
  - title: { vi: "JOIN khi chỉ cần biết \"có hay không\"", en: "JOIN when you only need \"yes or no\"" }
    wrong: "SELECT s.name FROM stores s JOIN orders o ON o.store_id = s.id WHERE o.order_date = '2026-10-29'"
    fix: "SELECT name FROM stores WHERE id IN (SELECT store_id FROM orders WHERE order_date = '2026-10-29')"
    why:
      vi: "Câu hỏi là \"cửa hàng nào có bán\". Phép nối tạo một dòng cho mỗi đơn, nên Ben Thanh ra 4 lần: 7 dòng thay vì 3. `IN` chỉ hỏi có trong danh sách hay không, nên không nhân dòng."
      en: "The question is \"which stores sold something\". The join makes one row per order, so Ben Thanh appears 4 times: 7 rows instead of 3. `IN` only asks whether the value is in the list, so it multiplies nothing."
quiz:
  - q:
      vi: "Danh sách trong `NOT IN (1, 2, NULL)`. Giá trị 5 có qua điều kiện không?"
      en: "The list is `NOT IN (1, 2, NULL)`. Does the value 5 pass?"
    options:
      - { vi: "Có, 5 không phải 1 hay 2", en: "Yes, 5 is neither 1 nor 2" }
      - { vi: "Không: so 5 với NULL ra \"không biết\", nên cả điều kiện là không biết", en: "No: comparing 5 with NULL is \"unknown\", so the whole condition is unknown" }
      - { vi: "Báo lỗi vì danh sách có NULL", en: "An error, because the list has a NULL" }
    answer: 1
    trap: 0
    why:
      vi: "Đọc bằng mắt thì 5 rõ ràng không có trong danh sách. Nhưng `NOT IN` nghĩa là \"khác 1 VÀ khác 2 VÀ khác NULL\", và \"khác NULL\" là không biết. Một mắt xích không biết làm cả chuỗi `AND` không đúng."
      en: "By eye, 5 is clearly not in the list. But `NOT IN` means \"not 1 AND not 2 AND not NULL\", and \"not NULL\" is unknown. One unknown link keeps the whole `AND` chain from being true."
  - q:
      vi: "Truy vấn con trong `IN` trả mã 3 bốn lần. Cửa hàng 3 xuất hiện bao nhiêu lần trong kết quả?"
      en: "The subquery inside `IN` returns id 3 four times. How many times does store 3 appear in the result?"
    options:
      - { vi: "Bốn lần", en: "Four times" }
      - { vi: "Một lần", en: "Once" }
      - { vi: "Không lần nào, vì danh sách có trùng", en: "Never, because the list has repeats" }
    answer: 1
    trap: 0
    why:
      vi: "Quen với phép nối, người ta đoán mỗi lần khớp là một dòng. `IN` chỉ hỏi \"có nằm trong danh sách không\", và câu trả lời là có, một lần cho mỗi dòng của bảng ngoài."
      en: "Used to joins, people expect one row per match. `IN` only asks \"is it in the list\", and the answer is yes, once per row of the outer table."
recap:
  - vi: "`IN (SELECT …)` lọc theo một danh sách một cột tính ra; không nhân dòng."
    en: "`IN (SELECT …)` filters by a computed one-column list; it multiplies no rows."
  - vi: "`NOT IN` với một NULL trong danh sách ra 0 dòng: lọc NULL hoặc dùng `NOT EXISTS`."
    en: "`NOT IN` with a NULL in the list gives 0 rows: filter NULLs or use `NOT EXISTS`."
  - vi: "Cần cột của bảng kia thì `JOIN`; chỉ cần \"có hay không\" thì `IN`."
    en: "Need the other table's columns: `JOIN`; only \"yes or no\": `IN`."
sources:
  - https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-IN
  - https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-NOTIN
---
## Mở bài

Quản lý vùng hỏi: "Cửa hàng nào có bán được đơn vào ngày 29/10?" Thông tin "có bán" nằm ở `orders`, còn tên và thành phố ở `stores`. Bạn cần lọc bảng này theo một danh sách lấy ra từ bảng kia.

## Ý chính

`IN (SELECT …)` cho phép một câu truy vấn con trả **một cột, nhiều dòng**, và giữ những dòng ngoài có giá trị nằm trong danh sách đó. Nó giống `IN ('a', 'b')` của Phần 1, chỉ khác là danh sách được tính ra. Giá trị lặp trong danh sách không làm dòng ngoài lặp lại.

Nhiều người nghĩ **`NOT IN` là phần bù của `IN`**. Điều đó chỉ đúng khi danh sách không có ô trống. Chỉ một NULL trong danh sách là `NOT IN` không còn đúng với dòng nào, và câu ra 0 dòng mà không báo lỗi.

## Cú pháp

Truy vấn con trong `IN` phải trả đúng một cột.

# EN

## Opening

The regional manager asks: "Which stores sold something on 29 October?" The "sold something" part lives in `orders`, while the names and cities live in `stores`. You need to filter one table by a list taken from the other.

## Key idea

`IN (SELECT …)` lets a subquery return **one column, many rows**, and keeps the outer rows whose value is in that list. It is like `IN ('a', 'b')` from Part 1, except the list is computed. Repeated values in the list do not repeat the outer rows.

Many people think **`NOT IN` is the opposite of `IN`**. That only holds when the list has no empty cells. A single NULL in the list and `NOT IN` is true for no row at all, so the query returns 0 rows without an error.

## Syntax

The subquery inside `IN` must return exactly one column.
