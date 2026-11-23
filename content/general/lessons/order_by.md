---
id: order_by
title: "ORDER BY: xếp kết quả theo thứ tự bạn muốn"
title_en: "ORDER BY: put the result in the order you want"
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Xếp kết quả tăng hoặc giảm theo một cột, kể cả cột tính ra.
    en: Sort a result up or down by a column, including a computed one.
  - vi: Xếp theo nhiều cột, mỗi cột một chiều riêng, để các dòng hòa nhau có thứ tự chắc chắn.
    en: Sort by several columns, each with its own direction, so tied rows get a firm order.
  - vi: Quyết định ô trống (NULL) nằm đầu hay cuối.
    en: Decide whether empty cells (NULL) go first or last.
syntax: |-
  SELECT column_1, column_2
  FROM table_name
  [WHERE condition]
  ORDER BY sort_key_1 [ASC | DESC] [NULLS FIRST | NULLS LAST], sort_key_2 [ASC | DESC]
options:
  - { code: "ASC", vi: "tăng dần (mặc định khi không ghi gì)", en: "ascending (the default when you write nothing)" }
  - { code: "DESC", vi: "giảm dần; chỉ áp cho cột đứng ngay trước nó", en: "descending; applies only to the column right before it" }
  - { code: "NULLS FIRST / NULLS LAST", vi: "ô trống lên đầu hay xuống cuối", en: "empty cells first or last" }
  - { code: "sort_key_1, sort_key_2", vi: "cột sau chỉ dùng để xếp các dòng hòa nhau ở cột trước", en: "a later key only orders rows tied on the earlier key" }
  - { code: "alias", vi: "có thể xếp theo tên vừa đặt bằng `AS` trong `SELECT`", en: "you may sort by a name given with `AS` in the `SELECT`" }
examples:
  - title: { vi: "Đắt nhất lên đầu", en: "Most expensive first" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      ORDER BY price_vnd DESC
    read:
      vi: "Vẫn 30 sản phẩm, chỉ đổi thứ tự: đèn bàn 259.000 đồng ở dòng đầu, rồi kem chống nắng 185.000. `ORDER BY` không thêm hay bớt dòng nào."
      en: "Still 30 products, only the order changes: the desk lamp at 259,000 VND on the first row, then the sunscreen at 185,000. `ORDER BY` adds or removes no rows."
  - title: { vi: "Hai cột, hai chiều", en: "Two columns, two directions" }
    sql: |-
      SELECT name, category, price_vnd
      FROM products
      ORDER BY category, price_vnd DESC
    read:
      vi: "Nhóm hàng xếp A → Z (`Drinks` đầu tiên), trong mỗi nhóm thì giá giảm dần: nước cam 35.000 đứng đầu nhóm đồ uống. Cột thứ hai chỉ xếp các dòng cùng nhóm."
      en: "Categories run A to Z (`Drinks` first), and inside each category prices go down: the orange juice at 35,000 leads the drinks. The second key only orders rows of the same category."
  - title: { vi: "Ô trống xuống cuối, tên để phân xử", en: "Empty cells last, name as a tie-breaker" }
    sql: |-
      SELECT name, birth_year
      FROM customers
      WHERE city = 'Hue'
      ORDER BY birth_year DESC NULLS LAST, name
    read:
      vi: "29 khách ở Huế, trẻ nhất trước (Le Khanh, 2004). Nếu có người chưa ghi năm sinh, họ nằm cuối thay vì đầu. Hai người cùng năm sinh được xếp theo tên, nên thứ tự lần nào cũng như nhau."
      en: "29 customers in Hue, youngest first (Le Khanh, 2004). Anyone with no birth year would sit at the end instead of the top. Two people born the same year are ordered by name, so the order is the same every time."
  - title: { vi: "Xếp theo cột tính ra", en: "Sorting by a computed column" }
    sql: |-
      SELECT name, price_vnd * 2 AS two_units
      FROM products
      WHERE category = 'Snacks'
      ORDER BY two_units
    read:
      vi: "6 món ăn vặt, giá hai gói tăng dần từ 30.000 (bánh gạo). `ORDER BY` chạy sau `SELECT`, nên nó dùng được tên `two_units` vừa đặt; `WHERE` thì không."
      en: "6 snacks, the price of two packs going up from 30,000 (rice crackers). `ORDER BY` runs after `SELECT`, so it can use the new name `two_units`; `WHERE` cannot."
  - title: { vi: "Ngày cũ nhất trước", en: "Oldest date first" }
    sql: |-
      SELECT name, opened_on
      FROM stores
      ORDER BY opened_on
    read:
      vi: "5 cửa hàng theo ngày mở: Ben Thanh (2022) trước, Thao Dien (2025) cuối. Ngày xếp theo thời gian, không theo chữ."
      en: "5 stores by opening date: Ben Thanh (2022) first, Thao Dien (2025) last. Dates sort by time, not as text."
pitfalls:
  - title: { vi: "DESC đưa ô trống lên đầu", en: "DESC puts empty cells on top" }
    wrong: "SELECT name, birth_year FROM customers ORDER BY birth_year DESC LIMIT 5"
    fix: "SELECT name, birth_year FROM customers ORDER BY birth_year DESC NULLS LAST LIMIT 5"
    why:
      vi: "Postgres coi NULL lớn hơn mọi giá trị, nên khi xếp giảm dần thì ô trống lên trước. Câu sai trả 5 khách không có năm sinh thay vì 5 khách trẻ nhất (sinh 2004). Thêm `NULLS LAST`."
      en: "Postgres treats NULL as larger than every value, so a descending sort puts empty cells first. The wrong query returns 5 customers with no birth year instead of the 5 youngest (born 2004). Add `NULLS LAST`."
  - title: { vi: "Nghĩ rằng DESC áp cho mọi cột", en: "Thinking DESC covers every column" }
    wrong: "SELECT name, category, price_vnd FROM products ORDER BY category, price_vnd DESC LIMIT 4"
    fix: "SELECT name, category, price_vnd FROM products ORDER BY category DESC, price_vnd DESC LIMIT 4"
    why:
      vi: "Câu hỏi là 4 món đắt nhất của nhóm hàng đứng cuối bảng chữ cái. `DESC` chỉ áp cho `price_vnd`; `category` vẫn tăng dần nên câu sai ra 4 món đồ uống. Mỗi cột cần chiều riêng của nó."
      en: "The question asks for the 4 priciest items of the category that comes last alphabetically. `DESC` only applies to `price_vnd`; `category` still goes up, so the wrong query returns 4 drinks. Every key needs its own direction."
  - title: { vi: "ORDER BY đặt trước WHERE", en: "ORDER BY placed before WHERE" }
    wrong: "SELECT name, price_vnd FROM products ORDER BY price_vnd DESC WHERE category = 'Drinks'"
    fix: "SELECT name, price_vnd FROM products WHERE category = 'Drinks' ORDER BY price_vnd DESC"
    why:
      vi: "Các mệnh đề có thứ tự cố định: `FROM`, `WHERE`, rồi `ORDER BY` gần cuối. Đặt sai chỗ thì Postgres báo lỗi cú pháp 42601 ngay tại `WHERE`."
      en: "Clauses have a fixed order: `FROM`, `WHERE`, then `ORDER BY` near the end. In the wrong place, Postgres reports syntax error 42601 right at `WHERE`."
quiz:
  - q:
      vi: "Bảng có thứ tự sẵn theo `id`. Không có `ORDER BY`, kết quả có chắc ra theo `id` không?"
      en: "The table was loaded in `id` order. Without `ORDER BY`, is the result sure to come back in `id` order?"
    options:
      - { vi: "Có, bảng nhớ thứ tự lúc chèn", en: "Yes, a table remembers the insert order" }
      - { vi: "Không; thứ tự chỉ được hứa khi có `ORDER BY`", en: "No; an order is only promised with `ORDER BY`" }
      - { vi: "Có, nếu `id` là khóa chính", en: "Yes, if `id` is the primary key" }
    answer: 1
    trap: 0
    why:
      vi: "Trên bảng nhỏ vừa nạp, dòng thường ra theo thứ tự chèn nên dễ tin bảng nhớ thứ tự. Một bảng là một tập dòng: sau khi sửa dữ liệu hay đổi kế hoạch chạy, thứ tự có thể khác. Muốn thứ tự thì viết `ORDER BY`."
      en: "On a small, freshly loaded table rows often come back in insert order, so it is easy to believe the table remembers it. A table is a set of rows: after updates or a different plan the order can change. Write `ORDER BY` when you need an order."
  - q:
      vi: "`ORDER BY birth_year DESC` đặt khách không có năm sinh ở đâu?"
      en: "Where does `ORDER BY birth_year DESC` put customers with no birth year?"
    options:
      - { vi: "Ở cuối, vì ô trống là nhỏ nhất", en: "At the end, because an empty cell is the smallest" }
      - { vi: "Ở đầu, vì Postgres coi NULL lớn hơn mọi giá trị", en: "At the top, because Postgres treats NULL as larger than every value" }
      - { vi: "Bị loại khỏi kết quả", en: "They are dropped from the result" }
    answer: 1
    trap: 0
    why:
      vi: "Trong bảng tính, ô trống thường nằm cuối dù xếp chiều nào, nên nhiều người đoán như vậy. Postgres thì xếp NULL như giá trị lớn nhất: cuối khi tăng dần, đầu khi giảm dần. `NULLS LAST` đổi điều đó."
      en: "In a spreadsheet, blank cells usually sink to the bottom whichever way you sort, so many people guess that. Postgres sorts NULL as the largest value: last going up, first going down. `NULLS LAST` changes that."
  - q:
      vi: "Vì sao nên thêm một cột phân xử, như `name`, sau cột xếp chính?"
      en: "Why add a tie-breaker such as `name` after the main sort key?"
    options:
      - { vi: "Để các dòng hòa nhau ở cột chính có thứ tự cố định", en: "So rows tied on the main key get a fixed order" }
      - { vi: "Để câu chạy nhanh hơn", en: "So the query runs faster" }
      - { vi: "Vì Postgres bắt buộc ít nhất hai cột", en: "Because Postgres requires at least two keys" }
    answer: 0
    why:
      vi: "Nhiều dòng có cùng giá trị ở cột chính (cùng năm sinh). Không có cột phân xử, thứ tự giữa chúng không được hứa, và kết quả có thể đổi giữa hai lần chạy. Đặc biệt quan trọng khi sau đó có `LIMIT`."
      en: "Many rows share a value on the main key (the same birth year). Without a tie-breaker their order is not promised and can change between two runs. It matters most when a `LIMIT` follows."
recap:
  - vi: "`ORDER BY` chỉ đổi thứ tự, không đổi số dòng; không có nó thì không có thứ tự nào được hứa."
    en: "`ORDER BY` only changes the order, never the row count; without it no order is promised."
  - vi: "`ASC` là mặc định; `DESC` chỉ áp cho cột ngay trước nó."
    en: "`ASC` is the default; `DESC` only applies to the key right before it."
  - vi: "NULL là lớn nhất: dùng `NULLS LAST` khi xếp giảm dần."
    en: "NULL counts as the largest: use `NULLS LAST` when sorting down."
  - vi: "Thêm cột phân xử để thứ tự lần nào cũng như nhau."
    en: "Add a tie-breaker so the order is the same every time."
sources:
  - https://www.postgresql.org/docs/current/queries-order.html
---
## Mở bài

Phòng mua hàng hỏi: "Món nào đắt nhất, xếp từ trên xuống?" Một bảng không có thứ tự nào cả, nên nếu không nói gì, bạn nhận các dòng theo kiểu Postgres thấy tiện. Muốn đọc từ đắt tới rẻ, bạn phải yêu cầu.

## Ý chính

`ORDER BY` đứng gần cuối câu và nói kết quả xếp theo cột nào, chiều nào. Mặc định là tăng dần (`ASC`); thêm `DESC` để giảm dần. Có thể ghi nhiều cột: cột thứ hai chỉ dùng khi các dòng bằng nhau ở cột thứ nhất. Vì `ORDER BY` chạy sau `SELECT`, nó dùng được tên cột vừa đặt bằng `AS`.

Nhiều người nghĩ **bảng có sẵn một thứ tự** (thứ tự chèn, hay theo `id`). Thật ra bảng là một tập dòng không thứ tự. Kết quả hôm nay đúng thứ tự có thể là do may; chỉ `ORDER BY` mới là lời hứa.

## Cú pháp

Mỗi khóa xếp có chiều riêng; `NULLS FIRST`/`NULLS LAST` là tùy chọn.

# EN

## Opening

Purchasing asks: "Which items are the most expensive, from the top down?" A table has no order at all, so if you say nothing you get the rows in whatever order suits Postgres. To read from priciest to cheapest, you have to ask for it.

## Key idea

`ORDER BY` comes near the end of a query and says which column to sort by, and in which direction. The default is ascending (`ASC`); add `DESC` to go down. You can list several keys: the second is only used when rows are equal on the first. Because `ORDER BY` runs after `SELECT`, it can use a column name given with `AS`.

Many people think **a table has a built-in order** (insert order, or by `id`). In fact a table is a set of rows with no order. A result that comes back in the right order today may be luck; only `ORDER BY` is a promise.

## Syntax

Each sort key has its own direction; `NULLS FIRST`/`NULLS LAST` are optional.
