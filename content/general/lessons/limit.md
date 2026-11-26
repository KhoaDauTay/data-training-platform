---
id: limit
title: "LIMIT: chỉ lấy N dòng đầu"
title_en: "LIMIT: take only the first N rows"
minutes: 20
figures: [{ name: sql-clause-order, at: idea, variant: tail }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Lấy top N của một danh sách đã xếp, như 3 món đắt nhất.
    en: Take the top N of a sorted list, such as the 3 most expensive items.
  - vi: Lật sang trang tiếp theo bằng `OFFSET`.
    en: Turn to the next page with `OFFSET`.
  - vi: Biết khi nào top N bỏ mất dòng hòa điểm, và giữ chúng lại bằng `WITH TIES`.
    en: Know when a top N drops tied rows, and keep them with `WITH TIES`.
syntax: |-
  SELECT column_1, column_2
  FROM table_name
  ORDER BY sort_key [DESC]
  LIMIT n [OFFSET skip]
  -- or, standard SQL:
  -- FETCH FIRST n ROWS { ONLY | WITH TIES }
options:
  - { code: "LIMIT n", vi: "giữ tối đa n dòng đầu của kết quả", en: "keep at most the first n rows of the result" }
  - { code: "OFFSET k", vi: "bỏ qua k dòng đầu trước khi lấy", en: "skip the first k rows before taking any" }
  - { code: "FETCH FIRST n ROWS ONLY", vi: "cách viết chuẩn SQL, giống `LIMIT n`", en: "the standard SQL spelling, same as `LIMIT n`" }
  - { code: "FETCH FIRST n ROWS WITH TIES", vi: "lấy thêm mọi dòng hòa với dòng thứ n (cần `ORDER BY`)", en: "also take every row tied with row n (needs `ORDER BY`)" }
examples:
  - title: { vi: "Ba món đắt nhất", en: "The three most expensive items" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      ORDER BY price_vnd DESC
      LIMIT 3
    read:
      vi: "3 dòng: đèn bàn, kem chống nắng, dầu gội. `ORDER BY` xếp xong cả 30 món, rồi `LIMIT` mới cắt lấy 3 dòng đầu."
      en: "3 rows: the desk lamp, the sunscreen, the shampoo. `ORDER BY` sorts all 30 items first, then `LIMIT` cuts the first 3 rows."
  - title: { vi: "Trang thứ hai", en: "The second page" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      ORDER BY price_vnd DESC
      LIMIT 3 OFFSET 3
    read:
      vi: "3 món xếp thứ 4 đến 6: bột giặt, sữa rửa mặt, hạt điều. Trang p (bắt đầu từ 1) có `OFFSET` bằng (p − 1) × cỡ trang."
      en: "The items ranked 4 to 6: the laundry powder, the face wash, the cashew nuts. Page p (counting from 1) has an `OFFSET` of (p − 1) × the page size."
  - title: { vi: "Hai đồ uống rẻ nhất", en: "The two cheapest drinks" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      WHERE category = 'Drinks'
      ORDER BY price_vnd
      LIMIT 2
    read:
      vi: "Nước suối 9.000 và trà xanh 12.000. Thứ tự chạy là `WHERE` → `ORDER BY` → `LIMIT`: lọc trước, xếp sau, cắt cuối cùng."
      en: "Mineral water at 9,000 and green tea at 12,000. The run order is `WHERE` → `ORDER BY` → `LIMIT`: filter first, sort next, cut last."
  - title: { vi: "Năm đơn mới nhất, có cột phân xử", en: "The five newest orders, with a tie-breaker" }
    sql: |-
      SELECT id, order_date, store_id
      FROM orders
      ORDER BY order_date DESC, id DESC
      LIMIT 5
    read:
      vi: "Cả 5 đơn đều ngày 31/10/2026, từ đơn 1420 trở xuống. Nhiều đơn cùng ngày, nên nếu thiếu `id DESC`, Postgres được tự chọn 5 đơn nào trong số đó."
      en: "All 5 orders are from 31 October 2026, from order 1420 down. Many orders share a date, so without `id DESC` Postgres may pick any 5 of them."
  - title: { vi: "Giữ cả dòng hòa điểm", en: "Keeping the tied rows" }
    sql: |-
      SELECT name, birth_year
      FROM customers
      WHERE birth_year >= 1965
      ORDER BY birth_year
      FETCH FIRST 3 ROWS WITH TIES
    read:
      vi: "Xin 3 khách lớn tuổi nhất nhưng nhận 13 dòng: cả 13 người cùng sinh năm 1965, hòa với người thứ 3. `WITH TIES` không bỏ ai chỉ vì may rủi thứ tự."
      en: "Asking for the 3 oldest customers returns 13 rows: all 13 were born in 1965, tied with the third one. `WITH TIES` drops no one just because of a lucky order."
pitfalls:
  - title: { vi: "LIMIT mà không ORDER BY", en: "LIMIT without ORDER BY" }
    wrong: "SELECT name, price_vnd FROM products LIMIT 3"
    fix: "SELECT name, price_vnd FROM products ORDER BY price_vnd DESC LIMIT 3"
    why:
      vi: "Câu sai trả 3 dòng bất kỳ (ở đây là ba món đầu tiên được nạp: trà xanh, cà phê lon, nước cam), không phải 3 món đắt nhất. Không có `ORDER BY` thì \"3 dòng đầu\" không có nghĩa gì."
      en: "The wrong query returns any 3 rows (here, the first three loaded: green tea, canned coffee, orange juice), not the 3 most expensive. Without `ORDER BY`, \"the first 3 rows\" means nothing."
  - title: { vi: "Top N cắt ngang dòng hòa điểm", en: "A top N that cuts through a tie" }
    wrong: "SELECT name, birth_year FROM customers WHERE birth_year >= 1965 ORDER BY birth_year LIMIT 3"
    fix: "SELECT name, birth_year FROM customers WHERE birth_year >= 1965 ORDER BY birth_year FETCH FIRST 3 ROWS WITH TIES"
    why:
      vi: "13 khách cùng sinh năm 1965, nên `LIMIT 3` phải chọn 3 trong 13 và lựa chọn đó không được hứa. Nếu câu hỏi là \"những người lớn tuổi nhất\", dùng `WITH TIES` hoặc nói rõ cột phân xử."
      en: "13 customers share 1965, so `LIMIT 3` has to pick 3 of the 13 and that pick is not promised. If the question is \"the oldest customers\", use `WITH TIES` or state a tie-breaker."
  - title: { vi: "LIMIT đặt trước ORDER BY", en: "LIMIT placed before ORDER BY" }
    wrong: "SELECT name, price_vnd FROM products LIMIT 3 ORDER BY price_vnd DESC"
    fix: "SELECT name, price_vnd FROM products ORDER BY price_vnd DESC LIMIT 3"
    why:
      vi: "`LIMIT` luôn đứng sau `ORDER BY`. Viết ngược, Postgres báo lỗi cú pháp 42601 tại `ORDER`. Một số hệ khác viết `TOP 3` ngay sau `SELECT`; Postgres không có `TOP` (theo tài liệu SQL Server, không chạy ở đây)."
      en: "`LIMIT` always comes after `ORDER BY`. Written the other way, Postgres reports syntax error 42601 at `ORDER`. Some other systems write `TOP 3` right after `SELECT`; Postgres has no `TOP` (per the SQL Server docs, not run here)."
quiz:
  - q:
      vi: "Với `ORDER BY price_vnd DESC LIMIT 3`, Postgres làm gì trước?"
      en: "With `ORDER BY price_vnd DESC LIMIT 3`, what does Postgres do first?"
    options:
      - { vi: "Lấy 3 dòng đầu rồi xếp 3 dòng đó", en: "Take the first 3 rows, then sort those 3" }
      - { vi: "Xếp mọi dòng rồi mới lấy 3 dòng đầu", en: "Sort every row, then take the first 3" }
      - { vi: "Tùy cách viết, không có quy tắc", en: "It depends on how you write it; there is no rule" }
    answer: 1
    trap: 0
    why:
      vi: "Đọc từ trái sang phải dễ tưởng `LIMIT` cắt trước cho nhanh. Kết quả của `LIMIT` phải là top 3 thật, nên việc xếp (về logic) đi trước. Postgres có thể làm thông minh hơn bên trong, nhưng kết quả luôn như thể đã xếp hết."
      en: "Reading left to right, it is easy to think `LIMIT` cuts first to save time. The `LIMIT` result has to be the real top 3, so sorting (logically) comes first. Postgres may be cleverer inside, but the result is always as if everything was sorted."
  - q:
      vi: "Trang 3 của một danh sách 10 dòng mỗi trang dùng `OFFSET` bao nhiêu?"
      en: "Page 3 of a list with 10 rows per page uses which `OFFSET`?"
    options:
      - { vi: "30", en: "30" }
      - { vi: "20", en: "20" }
      - { vi: "3", en: "3" }
    answer: 1
    trap: 0
    why:
      vi: "Nhân số trang với cỡ trang nghe tự nhiên, nhưng `OFFSET` là số dòng bỏ qua: trang 1 bỏ 0, trang 2 bỏ 10, trang 3 bỏ 20."
      en: "Multiplying the page number by the page size sounds natural, but `OFFSET` counts the rows to skip: page 1 skips 0, page 2 skips 10, page 3 skips 20."
  - q:
      vi: "Khi nào `FETCH FIRST 3 ROWS WITH TIES` trả nhiều hơn 3 dòng?"
      en: "When does `FETCH FIRST 3 ROWS WITH TIES` return more than 3 rows?"
    options:
      - { vi: "Khi có dòng bằng dòng thứ 3 ở mọi cột `ORDER BY`", en: "When some rows equal the third row on every `ORDER BY` key" }
      - { vi: "Không bao giờ, nó giống hệt `LIMIT 3`", en: "Never, it is exactly `LIMIT 3`" }
      - { vi: "Khi bảng có NULL", en: "When the table has NULLs" }
    answer: 0
    why:
      vi: "`WITH TIES` lấy thêm mọi dòng hòa với dòng cuối được lấy, theo các cột trong `ORDER BY`. Thêm cột phân xử vào `ORDER BY` thì ít dòng hòa hơn."
      en: "`WITH TIES` adds every row tied with the last row taken, on the `ORDER BY` keys. Adding a tie-breaker to `ORDER BY` leaves fewer ties."
recap:
  - vi: "`LIMIT` cắt sau khi đã lọc và xếp; luôn đi cùng `ORDER BY`."
    en: "`LIMIT` cuts after filtering and sorting; always pair it with `ORDER BY`."
  - vi: "`OFFSET` = số dòng bỏ qua = (trang − 1) × cỡ trang."
    en: "`OFFSET` = rows skipped = (page − 1) × page size."
  - vi: "Dòng hòa ở mép cắt: thêm cột phân xử hoặc dùng `WITH TIES`."
    en: "Ties at the cut: add a tie-breaker or use `WITH TIES`."
sources:
  - https://www.postgresql.org/docs/current/queries-limit.html
  - https://www.postgresql.org/docs/current/sql-select.html#SQL-LIMIT
---
## Mở bài

Giám đốc kinh doanh chỉ muốn nhìn "3 món đắt nhất", không phải cả danh mục. Bạn đã biết xếp giá từ cao xuống; còn thiếu cách dừng lại sau 3 dòng.

## Ý chính

`LIMIT n` đứng cuối câu và giữ tối đa n dòng đầu của kết quả. `OFFSET k` bỏ qua k dòng trước khi bắt đầu lấy, dùng để chia trang. Cả hai chạy sau cùng: lọc (`WHERE`), xếp (`ORDER BY`), rồi mới cắt.

Nhiều người nghĩ **`LIMIT 3` là "3 dòng đầu của bảng"**. Bảng không có dòng đầu: không có `ORDER BY`, ba dòng bạn nhận là ba dòng bất kỳ. Và ngay cả khi có `ORDER BY`, nếu dòng thứ 3 hòa điểm với dòng thứ 4, lựa chọn giữa chúng vẫn là may rủi; thêm cột phân xử hoặc `WITH TIES`.

Hình cuối mục này là bước cuối của hình thứ tự chạy trong bài `HAVING`: `LIMIT` chạy sau cùng, sau `ORDER BY`.

## Cú pháp

`LIMIT` là cách viết của Postgres; `FETCH FIRST … ROWS` là cách viết chuẩn và có thêm `WITH TIES`.

# EN

## Opening

The sales director only wants to see "the 3 most expensive items", not the whole catalogue. You already know how to sort prices from the top; what is missing is a way to stop after 3 rows.

## Key idea

`LIMIT n` sits at the end of a query and keeps at most the first n rows of the result. `OFFSET k` skips k rows before taking any, which is how you split a list into pages. Both run last: filter (`WHERE`), sort (`ORDER BY`), then cut.

Many people think **`LIMIT 3` means "the first 3 rows of the table"**. A table has no first row: without `ORDER BY`, the three rows you get are any three. And even with `ORDER BY`, if row 3 ties with row 4 the choice between them is still luck; add a tie-breaker or `WITH TIES`.

The figure at the end of this section is the last step of the run-order figure in the `HAVING` lesson: `LIMIT` runs last, after `ORDER BY`.

## Syntax

`LIMIT` is the Postgres spelling; `FETCH FIRST … ROWS` is the standard one and adds `WITH TIES`.
