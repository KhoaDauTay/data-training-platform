---
id: select
title: "SELECT: lấy đúng những cột bạn cần"
title_en: "SELECT: take exactly the columns you need"
minutes: 25
figures: [{ name: sql-rows-columns, at: idea, variant: cols }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-23" }
objectives:
  - vi: Đọc một bảng như dòng và cột, và lấy ra đúng các cột một câu hỏi cần.
    en: Read a table as rows and columns, and take out exactly the columns a question needs.
  - vi: Tính một cột mới từ cột có sẵn và đặt tên cho nó bằng `AS`.
    en: Compute a new column from existing ones and name it with `AS`.
  - vi: Nhận ra ba lỗi hay gặp nhất của `SELECT` trước khi chúng làm sai số liệu.
    en: Spot the three most common `SELECT` mistakes before they spoil your numbers.
syntax: |-
  SELECT column_1 [AS name_1], column_2, expression [AS name]
  FROM table_name
options:
  - { code: "*", vi: "mọi cột của bảng, theo thứ tự lúc tạo bảng", en: "every column of the table, in the order it was created" }
  - { code: "column_1, column_2", vi: "dấu phẩy ngăn các cột; thứ tự viết là thứ tự cột kết quả", en: "a comma separates columns; the order you write is the order of the result" }
  - { code: "expression AS name", vi: "một cột tính ra (phép tính, hằng số) và tên của nó", en: "a computed column (arithmetic, a constant) and its name" }
  - { code: "\"Store name\"", vi: "nháy kép cho tên cột có khoảng trắng hoặc chữ hoa", en: "double quotes for a column name with spaces or capitals" }
  - { code: "'VND'", vi: "nháy đơn cho một giá trị chữ", en: "single quotes for a text value" }
examples:
  - title: { vi: "Hai cột của bảng cửa hàng", en: "Two columns of the stores table" }
    sql: |-
      SELECT name, city
      FROM stores
    read:
      vi: "5 dòng, mỗi cửa hàng một dòng, và đúng 2 cột theo thứ tự đã viết: `name` rồi `city`. Bảng còn cột `id` và `opened_on` nhưng chúng không có mặt vì bạn không xin."
      en: "5 rows, one per store, and exactly 2 columns in the order you wrote them: `name` then `city`. The table also has `id` and `opened_on`, but they are absent because you did not ask for them."
  - title: { vi: "Mọi cột với dấu sao", en: "Every column with a star" }
    sql: |-
      SELECT *
      FROM stores
    read:
      vi: "Vẫn 5 dòng nhưng giờ có 4 cột: `id`, `name`, `city`, `opened_on`. Dấu `*` tiện khi bạn mới làm quen với một bảng; trong báo cáo, hãy viết tên cột."
      en: "Still 5 rows, now with 4 columns: `id`, `name`, `city`, `opened_on`. The `*` is handy when you first meet a table; in a report, write the column names."
  - title: { vi: "Một cột tính ra, có tên", en: "A computed column with a name" }
    sql: |-
      SELECT name, price_vnd, price_vnd * 1.08 AS price_with_vat
      FROM products
    read:
      vi: "30 dòng, mỗi sản phẩm một dòng. Cột thứ ba không có trong bảng: Postgres tính nó cho từng dòng (giá nhân 1,08) và gọi nó là `price_with_vat`. Bảng `products` không đổi gì."
      en: "30 rows, one per product. The third column is not in the table: Postgres computes it for every row (price times 1.08) and calls it `price_with_vat`. The `products` table does not change."
  - title: { vi: "Đặt tên đẹp và thêm một hằng số", en: "A friendly name and a constant" }
    sql: |-
      SELECT name AS "Store name", 'VND' AS currency
      FROM stores
    read:
      vi: "Tên cột có khoảng trắng nên phải nằm trong nháy kép. Cột `currency` là chữ `VND` lặp lại trên cả 5 dòng: một hằng số nằm trong `SELECT` thì xuất hiện ở mọi dòng."
      en: "The column name has a space, so it sits in double quotes. The `currency` column is the text `VND` repeated on all 5 rows: a constant in the `SELECT` shows up on every row."
pitfalls:
  - title: { vi: "Quên dấu phẩy: không báo lỗi, mất một cột", en: "A missing comma: no error, one column gone" }
    wrong: "SELECT name city FROM stores"
    fix: "SELECT name, city FROM stores"
    why:
      vi: "Không có dấu phẩy, Postgres đọc `city` là tên mới của cột `name` (giống `name AS city`). Câu chạy được, ra 5 dòng, nhưng chỉ có một cột tên `city` chứa tên cửa hàng. Đếm số cột của kết quả trước khi dùng."
      en: "Without the comma, Postgres reads `city` as a new name for `name` (like `name AS city`). It runs and returns 5 rows, but only one column called `city` that holds store names. Count the result's columns before you use it."
  - title: { vi: "Nháy kép cho chữ: Postgres đi tìm một cột", en: "Double quotes around text: Postgres looks for a column" }
    wrong: "SELECT name, \"VND\" FROM stores"
    fix: "SELECT name, 'VND' FROM stores"
    why:
      vi: "Nháy kép nghĩa là tên cột, nên Postgres tìm cột `VND`, không thấy và báo lỗi 42703 (cột không tồn tại). Giá trị chữ luôn dùng nháy đơn."
      en: "Double quotes mean a column name, so Postgres looks for a column `VND`, finds none and stops with error 42703 (undefined column). Text values always take single quotes."
  - title: { vi: "Dùng tên vừa đặt ngay trong cùng SELECT", en: "Using a new name in the same SELECT" }
    wrong: "SELECT price_vnd * 2 AS double_price, double_price + 1 FROM products"
    fix: "SELECT price_vnd * 2 AS double_price, price_vnd * 2 + 1 FROM products"
    why:
      vi: "Các cột trong một `SELECT` được tính cùng lúc, nên tên `double_price` chưa tồn tại khi cột thứ hai cần nó: lỗi 42703. Viết lại phép tính (sau này CTE và truy vấn con cho cách gọn hơn)."
      en: "The columns of one `SELECT` are computed together, so `double_price` does not exist yet when the second column needs it: error 42703. Repeat the expression (CTEs and subqueries give a tidier way later)."
quiz:
  - q:
      vi: "`SELECT name city FROM stores` trả về gì?"
      en: "What does `SELECT name city FROM stores` return?"
    options:
      - { vi: "Lỗi cú pháp vì thiếu dấu phẩy", en: "A syntax error, because a comma is missing" }
      - { vi: "Một cột tên `city` chứa tên cửa hàng", en: "One column called `city` holding the store names" }
      - { vi: "Hai cột `name` và `city`", en: "Two columns, `name` and `city`" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ thiếu dấu phẩy thì Postgres sẽ báo lỗi, vì ở hầu hết ngôn ngữ là vậy. Nhưng ở đây từ thứ hai được hiểu là tên mới của cột (như `AS`), nên câu chạy êm và chỉ ra một cột."
      en: "Many people expect an error, because a missing comma breaks most languages. Here the second word is read as a new name for the column (like `AS`), so the query runs quietly and returns one column."
  - q:
      vi: "Vì sao báo cáo nên liệt kê tên cột thay vì `SELECT *`?"
      en: "Why should a report list column names instead of `SELECT *`?"
    options:
      - { vi: "Vì `*` chạy chậm hơn hẳn trên mọi bảng", en: "Because `*` is always much slower" }
      - { vi: "Vì kết quả chỉ chứa và giữ đúng các cột câu hỏi cần, kể cả khi bảng thêm cột", en: "Because the result holds exactly the columns the question needs, even after the table gains columns" }
      - { vi: "Vì Postgres không cho dùng `*` trong báo cáo", en: "Because Postgres forbids `*` in reports" }
    answer: 1
    trap: 0
    why:
      vi: "Tốc độ nghe có lý, nhưng trên bảng nhỏ khác biệt thường không đáng kể. Lý do chính là kết quả: `*` kéo theo cột thừa và đổi hình dạng khi ai đó thêm cột vào bảng, nên báo cáo và phép so sánh phía sau dễ hỏng."
      en: "Speed sounds plausible, but on a small table the difference is usually negligible. The real reason is the result: `*` drags in extra columns and changes shape when someone adds a column, so the report and anything comparing it break easily."
  - q:
      vi: "Không có `ORDER BY`, các dòng của `SELECT name FROM stores` ra theo thứ tự nào?"
      en: "Without `ORDER BY`, in what order do the rows of `SELECT name FROM stores` come back?"
    options:
      - { vi: "Luôn theo thứ tự lúc chèn vào bảng", en: "Always in the order they were inserted" }
      - { vi: "Theo bảng chữ cái của `name`", en: "Alphabetically by `name`" }
      - { vi: "Không có thứ tự nào được hứa; muốn thứ tự thì viết `ORDER BY`", en: "No order is promised; write `ORDER BY` when you need one" }
    answer: 2
    trap: 0
    why:
      vi: "Trên bảng nhỏ vừa nạp, dòng thường ra theo thứ tự chèn nên dễ tin đó là luật. Postgres không hứa điều đó: sau khi sửa dữ liệu hay đổi kế hoạch chạy, thứ tự có thể khác. Thứ tự chỉ chắc chắn khi có `ORDER BY` (bài tiếp theo của Phần 1)."
      en: "On a small, freshly loaded table rows often come back in insert order, so it is easy to believe that is the rule. Postgres promises nothing: after updates or a different plan the order can change. Only `ORDER BY` (later in Part 1) guarantees one."
recap:
  - vi: "`SELECT` chọn cột, `FROM` chọn bảng; số dòng không đổi, chỉ số cột đổi."
    en: "`SELECT` picks columns, `FROM` picks the table; the number of rows stays the same, only the columns change."
  - vi: "Thứ tự viết là thứ tự cột kết quả; dấu phẩy ngăn các cột."
    en: "The order you write is the order of the result's columns; commas separate them."
  - vi: "`AS` đặt tên cho cột tính ra; tên có khoảng trắng dùng nháy kép, giá trị chữ dùng nháy đơn."
    en: "`AS` names a computed column; a name with spaces takes double quotes, a text value single quotes."
  - vi: "Đếm số cột của kết quả: thiếu dấu phẩy không báo lỗi."
    en: "Count the result's columns: a missing comma raises no error."
sources:
  - https://www.postgresql.org/docs/current/queries-select-lists.html
  - https://www.postgresql.org/docs/current/sql-select.html
---
## Mở bài

Quản lý chuỗi cửa hàng hỏi: "Gửi tôi tên và thành phố của từng cửa hàng." Dữ liệu nằm trong bảng `stores`, nhưng bảng còn những cột khác mà người hỏi không cần. Việc đầu tiên của mọi truy vấn là lấy đúng những cột đó, không thừa, không thiếu.

## Ý chính

Một bảng giống một trang tính có tên: mỗi **dòng** là một thứ (một cửa hàng), mỗi **cột** là một thuộc tính của nó (tên, thành phố), và một cột như `id` là **khóa** giúp phân biệt các dòng. `SELECT` nói bạn muốn những cột nào, `FROM` nói lấy từ bảng nào. Kết quả là một bảng mới, tạm thời: số dòng bằng số dòng của bảng gốc, còn cột là đúng các cột bạn liệt kê, theo đúng thứ tự bạn viết. Bạn cũng có thể đưa vào một phép tính hay một hằng số; Postgres tính nó cho từng dòng.

Nhiều người nghĩ **`SELECT` làm thay đổi bảng**. Thật ra nó chỉ đọc: bảng gốc vẫn y nguyên sau mọi câu `SELECT`, kể cả khi bạn thêm cột tính ra.

Hình cuối mục này dùng bảng `stores`: `SELECT name, city` giữ hai cột được tô đậm, hai cột còn lại mờ đi vì không được xin. Bảng gốc vẫn đủ năm dòng, bốn cột.

## Cú pháp

Phần trong `[ ]` là tùy chọn. `SELECT` và `FROM` viết hoa hay thường đều được; tên cột viết thường thì không cần nháy.

# EN

## Opening

The chain's manager asks: "Send me the name and the city of every store." The data sits in the `stores` table, but that table also has columns the manager does not need. The first job of every query is to take exactly those columns, nothing more, nothing less.

## Key idea

A table is like a named spreadsheet: each **row** is one thing (one store), each **column** one of its attributes (name, city), and a column such as `id` is the **key** that tells rows apart. `SELECT` says which columns you want, `FROM` says which table to read. The result is a new, temporary table: as many rows as the source table, and exactly the columns you listed, in the order you wrote them. You can also put a calculation or a constant in it; Postgres computes it for every row.

Many people think **`SELECT` changes the table**. It only reads: the source table is untouched after any `SELECT`, even when you add computed columns.

The figure at the end of this section uses the `stores` table: `SELECT name, city` keeps the two highlighted columns, and the other two fade because nobody asked for them. The table itself still has five rows and four columns.

## Syntax

The parts in `[ ]` are optional. `SELECT` and `FROM` work in upper or lower case; lower-case column names need no quotes.
