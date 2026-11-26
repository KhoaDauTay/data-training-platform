---
id: coalesce
title: "COALESCE: thay ô trống bằng một giá trị dự phòng"
title_en: "COALESCE: replace an empty cell with a fallback"
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-coalesce-fallback, at: idea }]
objectives:
  - vi: Thay NULL bằng một giá trị mặc định để báo cáo dễ đọc.
    en: Replace NULL with a default value so a report reads well.
  - vi: Lấy giá trị đầu tiên có thật trong nhiều cột.
    en: Take the first real value out of several columns.
  - vi: Biết khi nào thay ô trống bằng 0 làm sai trung bình, và dùng `NULLIF` cho chiều ngược lại.
    en: Know when replacing empty cells with 0 skews an average, and use `NULLIF` for the opposite direction.
syntax: |-
  SELECT COALESCE(column_1, column_2, 'fallback') AS value,
         NULLIF(column, '') AS empty_as_null
  FROM table_name
options:
  - { code: "COALESCE(a, b, c)", vi: "giá trị đầu tiên không NULL, đọc từ trái sang phải", en: "the first value that is not NULL, read left to right" }
  - { code: "COALESCE(a, 0)", vi: "ô trống thành 0", en: "an empty cell becomes 0" }
  - { code: "NULLIF(a, b)", vi: "NULL nếu a = b, ngược lại là a (chuỗi rỗng thành NULL)", en: "NULL when a = b, otherwise a (turns an empty string into NULL)" }
  - { code: "COALESCE(n::text, 'n/a')", vi: "mọi đối số phải cùng một kiểu; ép kiểu khi cần", en: "every argument must share one type; cast when needed" }
examples:
  - title: { vi: "Thành phố trống thành \"Unknown\"", en: "An empty city becomes \"Unknown\"" }
    sql: |-
      SELECT name, COALESCE(city, 'Unknown') AS city
      FROM customers
      WHERE id BETWEEN 15 AND 18
    read:
      vi: "4 dòng; khách 17 (Bui Hoa) chưa có thành phố nên hiện `Unknown`. Bảng gốc không đổi, chỉ kết quả có chữ thay thế."
      en: "4 rows; customer 17 (Bui Hoa) has no city, so `Unknown` shows. The table is unchanged; only the result carries the replacement."
  - title: { vi: "Gom nhóm theo cột đã điền", en: "Grouping by the filled-in column" }
    sql: |-
      SELECT COALESCE(city, 'Unknown') AS city, count(*)
      FROM customers
      GROUP BY 1
      ORDER BY 2 DESC
    read:
      vi: "6 nhóm, nhóm cuối là `Unknown` với 17 khách. Trong biểu đồ, một nhãn có chữ dễ hiểu hơn một ô trống."
      en: "6 groups, the last being `Unknown` with 17 customers. On a chart, a labelled bar is easier to read than an empty one."
  - title: { vi: "Mốc đã biết gần nhất", en: "The latest known milestone" }
    sql: |-
      SELECT id, COALESCE(delivered_on, shipped_on, order_date) AS last_known
      FROM orders
      WHERE channel = 'ONLINE' AND order_date = '2026-10-31'
    read:
      vi: "Đơn 1419 chưa gửi, chưa giao, nên mốc cuối là ngày đặt 31/10. `COALESCE` đọc từ trái sang phải và dừng ở giá trị có thật đầu tiên."
      en: "Order 1419 is neither shipped nor delivered, so its last milestone is the order date, 31 October. `COALESCE` reads left to right and stops at the first real value."
  - title: { vi: "Một phép tính có ô trống", en: "Arithmetic with an empty cell" }
    sql: |-
      SELECT name, 2026 - COALESCE(birth_year, 2026) AS age
      FROM customers
      WHERE id BETWEEN 9 AND 12
    read:
      vi: "Vo Lan (khách 11) không có năm sinh nên tuổi ra 0, không phải NULL. Đó là một lựa chọn: 0 ở đây nghĩa là \"không rõ\", và báo cáo phải nói vậy."
      en: "Vo Lan (customer 11) has no birth year, so the age is 0 rather than NULL. That is a choice: 0 here means \"unknown\", and the report must say so."
  - title: { vi: "Chiều ngược lại: chuỗi rỗng thành NULL", en: "The other way: empty string into NULL" }
    sql: |-
      SELECT NULLIF(phone, '') AS phone
      FROM raw_signups
      ORDER BY id
      LIMIT 4
    read:
      vi: "Dữ liệu nhập tay có thể dùng chuỗi rỗng thay cho ô trống. `NULLIF(phone, '')` đưa cả hai về NULL, để `count(phone)` và `COALESCE` xử lý chúng như nhau."
      en: "Typed-in data may use an empty string instead of an empty cell. `NULLIF(phone, '')` turns both into NULL, so `count(phone)` and `COALESCE` treat them the same."
pitfalls:
  - title: { vi: "Giá trị dự phòng khác kiểu", en: "A fallback of another type" }
    wrong: "SELECT COALESCE(birth_year, 'unknown') AS born FROM customers WHERE id BETWEEN 9 AND 12"
    fix: "SELECT COALESCE(birth_year::text, 'unknown') AS born FROM customers WHERE id BETWEEN 9 AND 12"
    why:
      vi: "Mọi đối số của `COALESCE` phải cùng kiểu. `birth_year` là số, nên Postgres cố đọc `unknown` thành số và dừng với lỗi 22P02. Ép cột sang chữ trước, hoặc chọn dự phòng cùng kiểu."
      en: "All arguments of `COALESCE` must share a type. `birth_year` is a number, so Postgres tries to read `unknown` as a number and stops with error 22P02. Cast the column to text first, or pick a fallback of the same type."
  - title: { vi: "Thay ô trống bằng 0 trước khi lấy trung bình", en: "Replacing empty cells with 0 before averaging" }
    wrong: "SELECT round(avg(COALESCE(birth_year, 0))) FROM customers"
    fix: "SELECT round(avg(birth_year)) FROM customers"
    why:
      vi: "27 khách không có năm sinh bị tính là sinh năm 0, kéo trung bình xuống 1804. `avg` vốn đã bỏ qua NULL (1983). Chỉ thay bằng 0 khi 0 thật sự là giá trị đúng, như \"không mua gì\"."
      en: "The 27 customers with no birth year count as born in year 0, dragging the average down to 1804. `avg` already skips NULL (1983). Replace with 0 only when 0 really is the right value, such as \"bought nothing\"."
quiz:
  - q:
      vi: "`COALESCE(NULL, NULL, 5, 7)` trả gì?"
      en: "What does `COALESCE(NULL, NULL, 5, 7)` return?"
    options:
      - { vi: "5", en: "5" }
      - { vi: "7, giá trị cuối cùng", en: "7, the last value" }
      - { vi: "NULL, vì có NULL", en: "NULL, because there is a NULL" }
    answer: 0
    trap: 2
    why:
      vi: "Vì phép tính với NULL ra NULL, nhiều người đoán `COALESCE` cũng vậy. Nhưng nó được làm ra chính để bỏ qua NULL: đọc từ trái, trả giá trị có thật đầu tiên, là 5."
      en: "Because arithmetic with NULL gives NULL, many people guess `COALESCE` does too. It exists precisely to skip NULLs: it reads from the left and returns the first real value, 5."
  - q:
      vi: "Khi nào `COALESCE(qty, 0)` là đúng?"
      en: "When is `COALESCE(qty, 0)` right?"
    options:
      - { vi: "Luôn luôn: 0 an toàn hơn NULL", en: "Always: 0 is safer than NULL" }
      - { vi: "Khi ô trống thật sự nghĩa là \"không có gì\", như không bán được món nào", en: "When the empty cell really means \"nothing\", such as no items sold" }
      - { vi: "Không bao giờ", en: "Never" }
    answer: 1
    trap: 0
    why:
      vi: "0 trông gọn gàng hơn ô trống, nên dễ thay ở mọi nơi. Nhưng \"không biết\" khác \"bằng không\": thay nhầm làm sai trung bình, tỉ lệ và nhỏ nhất. Hỏi ô trống nghĩa là gì trước khi điền."
      en: "0 looks tidier than an empty cell, so it is tempting to replace it everywhere. But \"unknown\" is not \"zero\": the wrong swap skews averages, ratios and minimums. Ask what the empty cell means before filling it."
recap:
  - vi: "`COALESCE` trả giá trị không NULL đầu tiên, đọc từ trái."
    en: "`COALESCE` returns the first non-NULL value, reading from the left."
  - vi: "Mọi đối số cùng kiểu; ép kiểu nếu cần (lỗi 22P02)."
    en: "All arguments share one type; cast when needed (error 22P02)."
  - vi: "Chỉ thay NULL bằng 0 khi 0 là giá trị đúng; `NULLIF` làm chiều ngược lại."
    en: "Replace NULL with 0 only when 0 is the right value; `NULLIF` goes the other way."
sources:
  - https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL
  - https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-NULLIF
---
## Mở bài

Biểu đồ khách theo thành phố có một cột không tên: 17 khách chưa ghi thành phố. Người xem hỏi "cột trống này là gì?". Bạn muốn nó hiện chữ "Unknown" mà không sửa dữ liệu gốc.

## Ý chính

`COALESCE(a, b, …)` đọc các đối số từ trái sang phải và trả giá trị đầu tiên **không** NULL. Với hai đối số, nó là "dùng a, nếu a trống thì dùng b". Kết quả chỉ nằm trong câu truy vấn; bảng không đổi. `NULLIF(a, b)` làm chiều ngược lại: trả NULL khi a bằng b, tiện để biến chuỗi rỗng thành ô trống thật.

Nhiều người nghĩ **thay mọi NULL bằng 0 là cách an toàn**. Thật ra ô trống có thể là "không biết", không phải "không có". Hàm gộp như `avg` vốn đã bỏ qua NULL; điền 0 vào là tự thêm những con số không có thật.

## Cú pháp

Hai hàm đều nhận cột hay biểu thức; `COALESCE` nhận bao nhiêu đối số cũng được, `NULLIF` nhận đúng hai.

# EN

## Opening

The chart of customers per city has a bar with no name: 17 customers never entered a city. Viewers ask "what is this blank bar?". You want it to read "Unknown" without touching the source data.

## Key idea

`COALESCE(a, b, …)` reads its arguments left to right and returns the first one that is **not** NULL. With two arguments it means "use a, or b when a is empty". The result lives only in the query; the table does not change. `NULLIF(a, b)` goes the other way: it returns NULL when a equals b, handy for turning an empty string into a real empty cell.

Many people think **replacing every NULL with 0 is the safe choice**. In fact an empty cell can mean "unknown", not "none". Aggregates such as `avg` already skip NULL; filling in 0 adds numbers that do not exist.

## Syntax

Both take columns or expressions; `COALESCE` takes as many arguments as you like, `NULLIF` exactly two.
