---
id: cast
title: "Kiểu dữ liệu và ép kiểu: CAST và ::"
title_en: "Data types and casting: CAST and ::"
minutes: 25
figures: [{ name: sql-sargable-index, at: pitfalls }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đổi một giá trị sang kiểu khác bằng `CAST(x AS kiểu)` hoặc `x::kiểu`.
    en: Turn a value into another type with `CAST(x AS type)` or `x::type`.
  - vi: Tránh chia số nguyên bị cắt phần lẻ.
    en: Avoid integer division dropping the fraction.
  - vi: Biết vì sao so sánh phải đúng kiểu, và vì sao ép kiểu cột trong `WHERE` làm câu chậm.
    en: Know why comparisons need the right type, and why casting a column in `WHERE` makes a query slow.
syntax: |-
  SELECT CAST(expression AS target_type),
         expression::target_type
  FROM table_name
options:
  - { code: "CAST(x AS int)", vi: "cách viết chuẩn SQL", en: "the standard SQL spelling" }
  - { code: "x::int", vi: "cách viết ngắn của Postgres, cùng nghĩa", en: "the Postgres short form, same meaning" }
  - { code: "int / bigint", vi: "số nguyên; chia hai số nguyên thì cắt phần lẻ", en: "whole numbers; dividing two of them drops the fraction" }
  - { code: "numeric", vi: "số thập phân chính xác (tiền, tỉ lệ)", en: "exact decimal (money, ratios)" }
  - { code: "text", vi: "chữ; so sánh theo thứ tự chữ cái, không theo giá trị số", en: "text; compares letter by letter, not by numeric value" }
  - { code: "date / timestamp", vi: "ngày / ngày và giờ; `timestamp::date` bỏ phần giờ", en: "date / date and time; `timestamp::date` drops the time" }
examples:
  - title: { vi: "Chữ thành ngày, rồi trừ hai ngày", en: "Text into dates, then subtract them" }
    sql: |-
      SELECT '2026-10-31'::date - '2026-10-01'::date AS days
    read:
      vi: "Ra 30: sau khi thành kiểu `date`, hai giá trị trừ được cho nhau và kết quả là số ngày. Nếu để nguyên là chữ, phép trừ không có nghĩa."
      en: "It gives 30: once they are of type `date`, the two values can be subtracted and the result is a number of days. Left as text, subtraction would mean nothing."
  - title: { vi: "Chia số nguyên và chia số thập phân", en: "Integer division versus decimal division" }
    sql: |-
      SELECT price_vnd, price_vnd / 1000 AS int_div, price_vnd / 1000.0 AS exact, price_vnd::numeric / 3 AS third
      FROM products
      WHERE id <= 3
    read:
      vi: "Với nước cam (35.000), chia 3 cho ra khoảng 11666.67 khi một bên là `numeric`. `price_vnd / 1000` giữ kiểu số nguyên; chỉ cần một bên có phần thập phân là phép chia giữ phần lẻ."
      en: "For the orange juice (35,000), dividing by 3 gives about 11666.67 once one side is `numeric`. `price_vnd / 1000` stays a whole number; one decimal operand is enough to keep the fraction."
  - title: { vi: "Bỏ phần giờ của một thời điểm", en: "Dropping the time from a timestamp" }
    sql: |-
      SELECT id, paid_at, paid_at::date AS day
      FROM payments
      ORDER BY id
      LIMIT 3
    read:
      vi: "`paid_at` có giờ phút (08:33 ngày 01/01/2025); `paid_at::date` chỉ còn ngày. Hữu ích khi hiển thị, nhưng xem bẫy 3 trước khi dùng nó trong `WHERE`."
      en: "`paid_at` carries hours and minutes (08:33 on 1 January 2025); `paid_at::date` keeps only the day. Handy for display, but read pitfall 3 before using it in `WHERE`."
  - title: { vi: "Hai cách viết cho cùng một việc", en: "Two spellings for one job" }
    sql: |-
      SELECT CAST('42' AS int) + 1 AS answer, '3.5'::numeric * 2 AS doubled
    read:
      vi: "43 và 7.0. `CAST(... AS ...)` là cách viết chuẩn, `::` là cách viết ngắn của Postgres; chọn một cách và giữ nó trong cả câu."
      en: "43 and 7.0. `CAST(... AS ...)` is the standard spelling, `::` the Postgres shorthand; pick one and keep it across the query."
  - title: { vi: "Số thành chữ để ghép nhãn", en: "A number into text for a label" }
    sql: |-
      SELECT name, price_vnd::text || ' VND' AS price_text
      FROM products
      WHERE id <= 3
    read:
      vi: "3 nhãn như `12000 VND`. Kết quả giờ là chữ: đẹp để đọc, nhưng không còn cộng hay xếp theo giá trị số được."
      en: "3 labels such as `12000 VND`. The result is now text: nice to read, but it no longer adds up or sorts by numeric value."
pitfalls:
  - title: { vi: "Chia hai số nguyên", en: "Dividing two whole numbers" }
    wrong: "SELECT 7 / 2 AS half"
    fix: "SELECT 7 / 2.0 AS half"
    why:
      vi: "Hai số nguyên chia nhau cho số nguyên: 7 / 2 = 3, phần lẻ bị cắt mà không báo. Tỉ lệ và trung bình tự tính hay sai vì điều này; cho một bên thành `numeric` (hoặc viết `2.0`)."
      en: "Two whole numbers divide into a whole number: 7 / 2 = 3, the fraction silently dropped. Ratios and hand-made averages often go wrong this way; make one side `numeric` (or write `2.0`)."
  - title: { vi: "Ép chữ không phải số thành số", en: "Casting text that is not a number" }
    wrong: "SELECT 'abc'::int AS n"
    fix: "SELECT '42'::int AS n"
    why:
      vi: "Ép kiểu kiểm tra giá trị: `abc` không đọc được thành số nên Postgres dừng với lỗi 22P02. Trên một cột bẩn, chỉ một dòng hỏng là cả câu thất bại; lọc hoặc làm sạch trước khi ép."
      en: "A cast checks the value: `abc` cannot be read as a number, so Postgres stops with error 22P02. On a dirty column, one bad row fails the whole query; filter or clean before casting."
  - title: { vi: "So số dưới dạng chữ", en: "Comparing numbers as text" }
    wrong: "SELECT name FROM products WHERE price_vnd::text > '50000'"
    fix: "SELECT name FROM products WHERE price_vnd > 50000"
    why:
      vi: "Chữ so từng ký tự: `'9000'` lớn hơn `'50000'` vì 9 > 5, còn `'129000'` nhỏ hơn vì 1 < 5. Câu sai ra 6 món, có cả nước suối 9.000 đồng; câu đúng ra 8. Ép kiểu cột còn làm mất chỉ mục, nên trên bảng lớn câu cũng chậm hơn hẳn. Hình cuối mục này vẽ cùng chuyện đó trên chỉ mục ngày: hàm bọc cột làm chỉ mục không cắt được đoạn nào."
      en: "Text compares character by character: `'9000'` is greater than `'50000'` because 9 > 5, while `'129000'` is smaller because 1 < 5. The wrong query returns 6 items, including the 9,000 VND water; the right one returns 8. Casting the column also loses its index, so on a big table the query is much slower too. The figure at the end of this section draws the same thing on a date index: a function around the column leaves the index nothing to cut."
quiz:
  - q:
      vi: "`SELECT 1 / 3` trong Postgres trả gì?"
      en: "What does `SELECT 1 / 3` return in Postgres?"
    options:
      - { vi: "0.33", en: "0.33" }
      - { vi: "0", en: "0" }
      - { vi: "Lỗi chia không hết", en: "An inexact-division error" }
    answer: 1
    trap: 0
    why:
      vi: "Máy tính bỏ túi và bảng tính cho 0.33, nên ai cũng đoán vậy. Nhưng 1 và 3 đều là số nguyên, nên kết quả là số nguyên: 0. Viết `1.0 / 3` hoặc ép một bên sang `numeric`."
      en: "A calculator or a spreadsheet gives 0.33, so that is what everyone expects. But 1 and 3 are both whole numbers, so the result is a whole number: 0. Write `1.0 / 3` or cast one side to `numeric`."
  - q:
      vi: "Cột `id` kiểu `int` có chỉ mục. Vì sao `WHERE id::text = '42'` kém hơn `WHERE id = 42`?"
      en: "Column `id` is an indexed `int`. Why is `WHERE id::text = '42'` worse than `WHERE id = 42`?"
    options:
      - { vi: "Nó ra kết quả khác", en: "It returns a different result" }
      - { vi: "Chỉ mục được xây trên giá trị `int`; ép cột sang chữ thì Postgres phải đọc và đổi từng dòng", en: "The index is built on the `int` values; casting the column to text forces Postgres to read and convert every row" }
      - { vi: "Không khác gì, Postgres tự hiểu", en: "No difference, Postgres figures it out" }
    answer: 1
    trap: 2
    why:
      vi: "Hai câu cho cùng dòng nên dễ nghĩ Postgres tự sửa giúp. Nhưng biểu thức `id::text` không có trong chỉ mục, nên kế hoạch đổi sang đọc cả bảng. Hãy ép kiểu giá trị hằng, không ép cột."
      en: "Both return the same rows, so it is easy to think Postgres fixes it for you. But the expression `id::text` is not in the index, so the plan switches to reading the whole table. Cast the constant, never the column."
recap:
  - vi: "`CAST(x AS int)` = `x::int`; ép kiểu kiểm tra giá trị (lỗi 22P02 nếu không đọc được)."
    en: "`CAST(x AS int)` = `x::int`; a cast checks the value (error 22P02 if it cannot be read)."
  - vi: "Số nguyên chia số nguyên cắt phần lẻ; dùng `numeric` khi cần."
    en: "Whole number divided by whole number drops the fraction; use `numeric` when needed."
  - vi: "So đúng kiểu: số với số, ngày với ngày; không ép cột trong `WHERE`."
    en: "Compare the right types: numbers with numbers, dates with dates; never cast the column in `WHERE`."
sources:
  - https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-TYPE-CASTS
  - https://www.postgresql.org/docs/current/datatype.html
  - https://www.postgresql.org/docs/current/functions-math.html
---
## Mở bài

Báo cáo tỉ lệ đơn hủy ra 0% cho mọi cửa hàng, dù ai cũng biết có đơn bị hủy. Câu SQL không báo lỗi nào. Thủ phạm là kiểu dữ liệu: số nguyên chia số nguyên.

## Ý chính

Mỗi cột và mỗi giá trị có một **kiểu**: số nguyên (`int`), số thập phân (`numeric`), chữ (`text`), ngày (`date`), thời điểm (`timestamp`). Kiểu quyết định phép tính nào được và kết quả ra sao: ngày trừ ngày ra số ngày, chữ so theo từng ký tự, số nguyên chia số nguyên cắt phần lẻ. Ép kiểu (`CAST(x AS int)` hay `x::int`) đổi một giá trị sang kiểu khác, và báo lỗi nếu giá trị không đổi được.

Nhiều người nghĩ **kiểu chỉ là chuyện hiển thị**. Thật ra nó đổi kết quả (so `'9000' > '50000'` là đúng với chữ) và đổi tốc độ: chỉ mục được xây trên kiểu của cột, nên ép kiểu cột trong `WHERE` buộc Postgres đọc cả bảng.

## Cú pháp

Hai cách viết cùng nghĩa; `::` gắn chặt hơn phép tính nên `a + b::int` chỉ ép `b`.

# EN

## Opening

The cancellation-rate report shows 0% for every store, although everyone knows orders do get cancelled. The SQL raises no error. The culprit is the data type: a whole number divided by a whole number.

## Key idea

Every column and every value has a **type**: whole number (`int`), decimal (`numeric`), text (`text`), date (`date`), point in time (`timestamp`). The type decides which operations work and what they return: date minus date gives a number of days, text compares character by character, whole number divided by whole number drops the fraction. A cast (`CAST(x AS int)` or `x::int`) turns a value into another type, and fails if the value cannot be converted.

Many people think **types are only about display**. In fact they change results (`'9000' > '50000'` is true for text) and speed: an index is built on the column's type, so casting the column in `WHERE` forces Postgres to read the whole table.

## Syntax

Both spellings mean the same; `::` binds tighter than arithmetic, so `a + b::int` only casts `b`.
