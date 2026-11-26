---
id: sargable
title: "Điều kiện dùng được chỉ mục (sargable)"
title_en: "Conditions that can use an index (sargable)"
minutes: 25
figures: [{ name: sql-sargable-index, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Nhận ra điều kiện làm mất chỉ mục, vì cột bị bọc trong hàm, phép tính hay phép đổi kiểu.
    en: Spot conditions that lose the index because the column is wrapped in a function, arithmetic or a type cast.
  - vi: Viết lại chúng thành so sánh trên cột trần, thường là một khoảng nửa mở.
    en: Rewrite them as comparisons on the bare column, usually a half-open range.
  - vi: Kiểm tra bằng `EXPLAIN` rằng chỉ mục thật sự được dùng.
    en: Check with `EXPLAIN` that the index really is used.
syntax: |-
  -- sargable: the bare column on one side, a value on the other
  SELECT ... FROM t WHERE col >= value1 AND col < value2;
  SELECT ... FROM t WHERE col = ANY (ARRAY[...]);
  -- not sargable: the column is changed before the comparison
  SELECT ... FROM t WHERE f(col) = value;
options:
  - { code: "col >= a AND col < b", vi: "khoảng nửa mở: dùng được chỉ mục, không lo giờ phút cuối ngày", en: "a half-open range: uses the index, no worry about the last minute of a day" }
  - { code: "col = ANY (…) / IN (…)", vi: "một danh sách giá trị: vẫn dùng được chỉ mục", en: "a list of values: can still use the index" }
  - { code: "DATE '…' - 7", vi: "đưa phép tính sang phía hằng số, cột đứng một mình", en: "move the arithmetic to the constant side, keep the column alone" }
  - { code: "f(col) = …", vi: "hàm trên cột (`date_trunc`, `extract`, `lower`…): mất chỉ mục thường", en: "a function on the column (`date_trunc`, `extract`, `lower`…): the plain index is lost" }
  - { code: "col::text = '…'", vi: "đổi kiểu cột: mất chỉ mục; đổi kiểu hằng số thì không sao", en: "casting the column: the index is lost; casting the constant is fine" }
  - { code: "CREATE INDEX … (f(col))", vi: "chỉ mục biểu thức, khi thật sự phải lọc theo `f(col)`", en: "an expression index, when you really must filter by `f(col)`" }
examples:
  - title: { vi: "Một tháng bằng khoảng nửa mở", en: "A month as a half-open range" }
    sql: |-
      EXPLAIN
      SELECT id
      FROM orders
      WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'
    read:
      vi: "Bitmap Index Scan trên `orders_order_date_idx` với cả hai mốc trong `Index Cond`. Cột ngày đứng trần, nên chỉ mục cắt đúng tháng 10 rồi mới đọc bảng."
      en: "A Bitmap Index Scan on `orders_order_date_idx` with both bounds in the `Index Cond`. The date column stands bare, so the index cuts out exactly October before the table is read."
  - title: { vi: "Phép tính đặt phía hằng số", en: "Arithmetic on the constant side" }
    sql: |-
      EXPLAIN
      SELECT id
      FROM orders
      WHERE order_date >= DATE '2026-10-31' - 7
    read:
      vi: "Postgres tính `DATE '2026-10-31' - 7` một lần thành 2026-10-24, rồi dùng chỉ mục ngày. Cùng ý nghĩa với `order_date + 7 >= …`, nhưng cột không bị đụng tới."
      en: "Postgres computes `DATE '2026-10-31' - 7` once as 2026-10-24, then uses the date index. It means the same as `order_date + 7 >= …`, but the column is left untouched."
  - title: { vi: "Danh sách giá trị", en: "A list of values" }
    sql: |-
      EXPLAIN
      SELECT id
      FROM orders
      WHERE customer_id IN (42, 43, 44)
    read:
      vi: "`IN` được viết lại thành `customer_id = ANY ('{42,43,44}')` và vẫn đi qua `orders_customer_id_idx`: một lần dò chỉ mục cho cả ba khách."
      en: "`IN` is rewritten as `customer_id = ANY ('{42,43,44}')` and still goes through `orders_customer_id_idx`: one index probe for all three customers."
  - title: { vi: "Đổi kiểu hằng số thì không sao", en: "Casting the constant is fine" }
    sql: |-
      EXPLAIN
      SELECT id
      FROM orders
      WHERE customer_id = '42'
    read:
      vi: "Chuỗi `'42'` được đổi thành số một lần, trước khi so, nên `Index Cond` là `customer_id = 42` và chỉ mục vẫn dùng được. Cái hại chỉ đến khi chính **cột** bị đổi kiểu."
      en: "The string `'42'` is turned into a number once, before the comparison, so the `Index Cond` is `customer_id = 42` and the index still works. The harm only comes when the **column** itself is cast."
pitfalls:
  - title: { vi: "Hàm trên cột ngày", en: "A function on the date column" }
    wrong: "EXPLAIN SELECT id FROM orders WHERE date_trunc('month', order_date) = '2026-10-01'"
    fix: "EXPLAIN SELECT id FROM orders WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'"
    why:
      vi: "`date_trunc` phải chạy trên từng dòng trước khi so, nên Postgres đọc cả bảng (Seq Scan). Planner còn đoán chỉ 7 dòng thay vì 222, vì nó không biết hàm trả gì. Viết lại thành khoảng nửa mở trên cột trần."
      en: "`date_trunc` must run on every row before the comparison, so Postgres reads the whole table (Seq Scan). The planner even guesses 7 rows instead of 222, since it cannot know what the function returns. Rewrite it as a half-open range on the bare column."
  - title: { vi: "Đổi kiểu chính cột", en: "Casting the column itself" }
    wrong: "EXPLAIN SELECT id FROM orders WHERE customer_id::text = '42'"
    fix: "EXPLAIN SELECT id FROM orders WHERE customer_id = 42"
    why:
      vi: "`customer_id::text` biến mỗi mã số thành chữ trước khi so, chỉ mục trên số không giúp được: Seq Scan. So cột số với một số."
      en: "`customer_id::text` turns every id into text before the comparison, and the index on the number cannot help: Seq Scan. Compare the number column with a number."
  - title: { vi: "Phép tính phía cột", en: "Arithmetic on the column side" }
    wrong: "EXPLAIN SELECT id FROM orders WHERE order_date + 7 >= DATE '2026-10-31'"
    fix: "EXPLAIN SELECT id FROM orders WHERE order_date >= DATE '2026-10-31' - 7"
    why:
      vi: "Về toán học hai câu bằng nhau, nhưng `order_date + 7` là một biểu thức mới cho mỗi dòng, không có trong chỉ mục: Seq Scan. Chuyển `7` sang phía hằng số."
      en: "Mathematically the two are equal, but `order_date + 7` is a new expression for each row, not in the index: Seq Scan. Move the `7` to the constant side."
quiz:
  - q:
      vi: "`WHERE lower(email) = 'an.nguyen@mail.vn'` trên một cột có chỉ mục thường. Cách sửa nào giữ được tốc độ?"
      en: "`WHERE lower(email) = 'an.nguyen@mail.vn'` on a column with a plain index. Which fix keeps it fast?"
    options:
      - { vi: "Không cần sửa: chỉ mục trên `email` vẫn được dùng", en: "No fix needed: the index on `email` is still used" }
      - { vi: "Tạo chỉ mục biểu thức trên `lower(email)`, hoặc lưu email đã viết thường", en: "Create an expression index on `lower(email)`, or store the email already lowercased" }
      - { vi: "Đổi thành `email LIKE '%an.nguyen%'`", en: "Change it to `email LIKE '%an.nguyen%'`" }
    answer: 1
    trap: 0
    why:
      vi: "Chỉ mục thường lưu `email` như đã ghi, không lưu `lower(email)`, nên không khớp. Chỉ mục biểu thức lưu đúng kết quả của hàm. `LIKE '%…'` còn tệ hơn: chữ đại diện ở đầu thì không chỉ mục B-tree nào giúp được."
      en: "A plain index stores `email` as written, not `lower(email)`, so it does not match. An expression index stores exactly the function's result. `LIKE '%…'` is worse still: with a leading wildcard no B-tree index can help."
  - q:
      vi: "Vì sao nên viết một tháng là `>= '2026-10-01' AND < '2026-11-01'` thay vì `BETWEEN '2026-10-01' AND '2026-10-31'`?"
      en: "Why write a month as `>= '2026-10-01' AND < '2026-11-01'` instead of `BETWEEN '2026-10-01' AND '2026-10-31'`?"
    options:
      - { vi: "`BETWEEN` không dùng được chỉ mục", en: "`BETWEEN` cannot use an index" }
      - { vi: "Với cột `timestamp`, `BETWEEN … '2026-10-31'` dừng lúc 00:00 ngày 31 và bỏ sót cả ngày cuối; khoảng nửa mở luôn đúng", en: "On a `timestamp` column, `BETWEEN … '2026-10-31'` stops at 00:00 on the 31st and misses the last day; a half-open range is always right" }
      - { vi: "Hai cách luôn cho cùng kết quả, chỉ là thói quen", en: "Both always give the same result; it is only a habit" }
    answer: 1
    trap: 0
    why:
      vi: "`BETWEEN` vẫn sargable, nên lý do không phải tốc độ. Với cột `date` hai cách bằng nhau, nhưng với `timestamp` thì mốc trên `'2026-10-31'` nghĩa là nửa đêm đầu ngày 31. Khoảng nửa mở đúng cho cả hai kiểu."
      en: "`BETWEEN` is still sargable, so speed is not the reason. On a `date` column the two agree, but on a `timestamp` the upper bound `'2026-10-31'` means midnight at the start of the 31st. A half-open range is right for both types."
recap:
  - vi: "Để cột đứng trần ở một phía, giá trị ở phía kia; phép tính và đổi kiểu đặt lên hằng số."
    en: "Keep the column bare on one side and the value on the other; put arithmetic and casts on the constant."
  - vi: "Khoảng thời gian: từ mốc đầu, `>=`, tới trước mốc đầu kỳ sau, `<`."
    en: "Time ranges: from the start, `>=`, up to before the next start, `<`."
  - vi: "Thật sự phải lọc theo `f(col)`: tạo chỉ mục biểu thức. Luôn kiểm bằng `EXPLAIN`."
    en: "If you really must filter by `f(col)`: create an expression index. Always check with `EXPLAIN`."
sources:
  - https://www.postgresql.org/docs/current/indexes-expressional.html
  - https://www.postgresql.org/docs/current/indexes-types.html#INDEXES-TYPES-BTREE
  - https://www.postgresql.org/docs/current/using-explain.html
---
## Mở bài

Bảng đơn hàng có chỉ mục trên ngày đặt, vậy mà câu "đơn tháng 10" vẫn đọc cả bảng. Lỗi không nằm ở chỉ mục, mà ở cách viết điều kiện: chỉ một chữ `date_trunc` là đủ làm chỉ mục vô dụng.

## Ý chính

Chỉ mục B-tree lưu giá trị của cột, đã sắp xếp. Nó giúp được khi điều kiện so **chính cột đó** với một giá trị: `=`, `<`, `>=`, `BETWEEN`, `IN`. Điều kiện như vậy gọi là *sargable*. Bọc cột trong hàm, phép tính hay đổi kiểu, Postgres phải tính lại cho từng dòng, nên đọc cả bảng.

Nhiều người nghĩ **Postgres đủ thông minh để tự viết lại `date_trunc('month', order_date) = …` thành một khoảng**. Thật ra nó không làm vậy. Cách sửa gần như luôn là chuyển mọi biến đổi sang phía hằng số, và viết khoảng thời gian dạng nửa mở.

Hình cuối mục này đặt hai điều kiện tháng 10 lên cùng một chỉ mục ngày: cột để trần đọc một đoạn liền, cột bọc trong `date_trunc` phải tính hàm cho mọi dòng.

## Cú pháp

Bài luyện của Phần này có thanh hiệu năng: câu đúng kết quả mà mất chỉ mục là chưa đạt.

# EN

## Opening

The orders table has an index on the order date, yet the "October orders" query still reads the whole table. The fault is not the index but how the condition is written: one `date_trunc` is enough to make the index useless.

## Key idea

A B-tree index stores the column's values, sorted. It helps when the condition compares **the column itself** with a value: `=`, `<`, `>=`, `BETWEEN`, `IN`. Such a condition is called *sargable*. Wrap the column in a function, arithmetic or a cast, and Postgres must recompute it for every row, so it reads the whole table.

Many people think **Postgres is smart enough to rewrite `date_trunc('month', order_date) = …` into a range by itself**. It does not. The fix is almost always to move every transformation to the constant side, and to write time ranges as half-open.

The figure at the end of this section puts the two October conditions on one date index: the bare column reads one stretch, the column wrapped in `date_trunc` must run the function on every row.

## Syntax

This Part's drills have a performance bar: a query with the right result that loses the index does not pass.
