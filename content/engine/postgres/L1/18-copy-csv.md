---
id: e-pg-l1-18
engine: postgres
level: L1
module: write
title: Xuất và nhập CSV bằng COPY
title_en: Exporting and importing CSV with COPY
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Xuất một bảng hoặc kết quả một câu ra CSV có dòng tiêu đề bằng `COPY … TO`.
    en: Export a table or a query's result to CSV with a header line using `COPY … TO`.
  - vi: Nhập CSV vào bảng tạm bằng `COPY … FROM` với đúng `HEADER`, `DELIMITER` và `NULL`, rồi mới chép sang bảng chính.
    en: Import CSV into a staging table with `COPY … FROM` and the right `HEADER`, `DELIMITER` and `NULL`, and only then copy it into the main table.
  - vi: Biết file của `COPY` nằm trên máy chủ, còn từ máy khách thì dùng `STDIN`/`STDOUT` (lệnh `\copy` của psql).
    en: Know that a `COPY` file lives on the server, and that a client uses `STDIN`/`STDOUT` instead (psql's `\copy`).
requires: [e-pg-l1-15]
sources:
  - https://www.postgresql.org/docs/18/sql-copy.html
  - https://www.postgresql.org/docs/18/app-psql.html#APP-PSQL-META-COMMANDS-COPY
  - https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-GENFILE
  - https://www.postgresql.org/docs/18/predefined-roles.html
lab:
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, customer text NOT NULL, status text NOT NULL, total numeric(12,0));
    INSERT INTO orders VALUES (1, 'An', 'paid', 120000), (2, 'Binh, Co.', 'paid', 45000), (3, 'Chi', 'pending', NULL), (4, 'Dung "D"', 'paid', 300000), (5, 'An', 'refunded', 80000);
    CREATE TABLE orders_in (id int PRIMARY KEY, customer text NOT NULL, status text NOT NULL, total numeric(12,0));
    COPY (SELECT 101 AS id, 'Em' AS customer, 'paid' AS status, '52000' AS total UNION ALL SELECT 102, 'Giang', 'pending', 'NA' UNION ALL SELECT 103, 'Hoa; Ltd', 'paid', '17000') TO '/tmp/partner.csv' WITH (FORMAT csv, HEADER, DELIMITER ';');
  steps:
    - task:
        vi: "Xuất các đơn `paid` (mã, khách, tổng tiền; xếp theo mã) ra file `/tmp/paid.csv` dạng CSV có dòng tiêu đề. Bài chấm bằng nội dung file đọc lại qua `pg_read_file`."
        en: "Export the `paid` orders (id, customer, total; by id) to the file `/tmp/paid.csv` as CSV with a header line. It is graded on the file's contents read back with `pg_read_file`."
      solution: "COPY (SELECT id, customer, total FROM orders WHERE status = 'paid' ORDER BY id) TO '/tmp/paid.csv' WITH (FORMAT csv, HEADER)"
      after: "SELECT pg_read_file('/tmp/paid.csv') AS file"
      check: rows
      hint:
        vi: "`COPY (SELECT …) TO '/tmp/paid.csv' WITH (FORMAT csv, HEADER)`. Câu trong ngoặc quyết định cột và thứ tự dòng."
        en: "`COPY (SELECT …) TO '/tmp/paid.csv' WITH (FORMAT csv, HEADER)`. The query in brackets decides the columns and the row order."
    - task:
        vi: "Đối tác gửi `/tmp/partner.csv`: có dòng tiêu đề, phân cách bằng dấu chấm phẩy, ô thiếu tiền ghi `NA`. Nạp file vào bảng tạm `orders_in` sao cho `NA` thành NULL."
        en: "A partner sent `/tmp/partner.csv`: it has a header line, fields separated by semicolons, and a missing total written as `NA`. Load it into the staging table `orders_in` so that `NA` becomes NULL."
      solution: "COPY orders_in FROM '/tmp/partner.csv' WITH (FORMAT csv, HEADER, DELIMITER ';', NULL 'NA')"
      after: "SELECT * FROM orders_in ORDER BY id"
      check: rows
      hint:
        vi: "Ba tùy chọn ngoài `FORMAT csv`: `HEADER`, `DELIMITER ';'`, `NULL 'NA'`. Thiếu `NULL 'NA'` thì cột số báo lỗi với chữ `NA`."
        en: "Three options besides `FORMAT csv`: `HEADER`, `DELIMITER ';'`, `NULL 'NA'`. Without `NULL 'NA'` the numeric column fails on the text `NA`."
    - task:
        vi: "Dữ liệu tạm đã ổn: chép mọi dòng của `orders_in` sang `orders`. Bài chấm bằng số đơn và tổng tiền của `orders` sau khi chép."
        en: "The staged data looks right: copy every row of `orders_in` into `orders`. It is graded by the order count and the total amount of `orders` afterwards."
      solution: "INSERT INTO orders SELECT * FROM orders_in"
      after: "SELECT count(*) AS orders, sum(total) AS amount FROM orders"
      check: rows
      hint:
        vi: "Hai bảng cùng cột theo cùng thứ tự, nên `INSERT INTO … SELECT * FROM …` là đủ."
        en: "Both tables have the same columns in the same order, so `INSERT INTO … SELECT * FROM …` is enough."
quiz:
  - q:
      vi: "Ứng dụng web chạy `COPY orders TO '/home/me/orders.csv'` để người dùng tải file về máy họ. Chuyện gì xảy ra trên một server PostgreSQL thật?"
      en: "A web app runs `COPY orders TO '/home/me/orders.csv'` so users can download the file to their machine. What happens on a real PostgreSQL server?"
    options:
      - { vi: "File xuất hiện trên máy của người dùng", en: "The file appears on the user's machine" }
      - { vi: "File được ghi trên máy chủ database (và chỉ khi vai trò là superuser hoặc có `pg_write_server_files`); muốn đưa dữ liệu về máy khách thì dùng `COPY … TO STDOUT` hoặc `\\copy` của psql", en: "The file is written on the database server (and only if the role is a superuser or has `pg_write_server_files`); to bring data to the client use `COPY … TO STDOUT` or psql's `\\copy`" }
      - { vi: "Lỗi cú pháp, vì `COPY` chỉ nhập không xuất", en: "A syntax error, because `COPY` only imports" }
    answer: 1
    trap: 0
    why:
      vi: "\"File xuất hiện trên máy người dùng\" nghe đúng vì ta quen nghĩ lệnh chạy ở chỗ mình gõ, nhưng `COPY` với tên file do tiến trình server đọc ghi, trên đĩa của máy chủ database. Vì ghi được lên đĩa server là quyền nguy hiểm, Postgres chỉ cho superuser hoặc role có `pg_write_server_files`. `COPY` xuất được (bước 1 của lab), nên không có lỗi cú pháp. Trong lab này server là PGlite trong tab trình duyệt, nên `/tmp` nằm trong bộ nhớ của tab và mất khi lab chạy lại."
      en: "\"The file appears on the user's machine\" sounds right because we think a command runs where we type it, but `COPY` with a file name is read and written by the server process, on the database server's disk. Since writing to the server's disk is a dangerous power, Postgres allows it only to a superuser or a role with `pg_write_server_files`. `COPY` does export (step 1 of the lab), so there is no syntax error. In this lab the server is PGlite inside the browser tab, so `/tmp` lives in the tab's memory and is gone when the lab runs again."
  - q:
      vi: "File CSV có ô trống `,,` ở cột chữ. Nạp bằng `FORMAT csv` mặc định thì ô đó thành gì?"
      en: "A CSV file has an empty field `,,` in a text column. Loaded with the default `FORMAT csv`, what does that field become?"
    options:
      - { vi: "Chuỗi rỗng `''`", en: "An empty string `''`" }
      - { vi: "NULL; còn chuỗi rỗng thật phải ghi là `\"\"` có nháy", en: "NULL; a real empty string must be written `\"\"` with quotes" }
      - { vi: "Lỗi thiếu dữ liệu", en: "A missing-data error" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chuỗi rỗng\" nghe hợp lý vì giữa hai dấu phẩy không có gì. Nhưng ở dạng CSV, Postgres đọc ô trống không nháy là NULL, còn `\"\"` (có nháy) là chuỗi rỗng; hai cách viết khác nhau để file giữ được cả hai giá trị. Cột chữ nhận NULL được, nên không lỗi. Muốn chữ khác (như `NA`) là NULL thì thêm tùy chọn `NULL`, như bước 2 của lab."
      en: "\"An empty string\" sounds right because there is nothing between the two commas. But in CSV format Postgres reads an unquoted empty field as NULL, while `\"\"` (quoted) is an empty string; two spellings let the file keep both values. A text column accepts NULL, so there is no error. To make another word (such as `NA`) NULL, add the `NULL` option, as in step 2 of the lab."
---
## Mở bài

Kế toán xin danh sách đơn đã trả dưới dạng file mở được bằng Excel, và đối tác gửi lại một file đơn mới để nạp vào hệ thống. Bạn có thể viết một vòng lặp INSERT từng dòng, hoặc dùng lệnh Postgres làm sẵn việc đó. Bài này dùng `COPY` cho cả hai chiều, và chỉ ra file thật sự nằm ở đâu.

## Ý chính

`COPY` chép dữ liệu giữa bảng và file theo khối, nhanh hơn nhiều so với từng câu `INSERT`. `COPY orders TO 'file'` xuất cả bảng; `COPY (SELECT …) TO 'file'` xuất kết quả một câu, nên bạn chọn được cột, lọc và thứ tự. `COPY orders FROM 'file'` nạp vào. Với CSV, dùng `FORMAT csv`; thêm `HEADER` để có dòng tên cột (khi nạp, dòng đầu bị bỏ qua), `DELIMITER` cho dấu phân cách khác dấu phẩy, `NULL` cho chữ nghĩa là "không có giá trị".

Nhiều người nghĩ `COPY … TO 'file'` ghi file lên máy mình. Thật ra tên file là đường dẫn trên máy chủ database, do tiến trình server đọc ghi, và chỉ superuser hoặc vai trò có `pg_read_server_files` / `pg_write_server_files` mới được dùng. Từ máy khách thì dùng `COPY … TO STDOUT` / `FROM STDIN`; lệnh `\copy` của psql làm đúng việc đó. Trong lab này server là PGlite chạy trong tab, nên `/tmp` là bộ nhớ của tab; `pg_read_file` đọc lại file để bạn thấy nội dung. Phần "Dữ liệu của tôi" ở Sandbox cũng nạp CSV bằng `COPY … FROM`.

Cách nạp an toàn: chép vào bảng tạm cùng cột, kiểm, rồi `INSERT … SELECT` sang bảng chính. Mặc định một dòng hỏng làm cả lệnh `COPY` dừng và không dòng nào vào bảng; từ PostgreSQL 17, `ON_ERROR ignore` bỏ qua các dòng có giá trị sai kiểu, nhưng khi đó bạn phải tự đếm dòng nào bị bỏ.

## Cú pháp

```sql
COPY table_name [ ( column [, ...] ) ] TO 'file' [ WITH ( option [, ...] ) ];
COPY ( query ) TO 'file' [ WITH ( option [, ...] ) ];
COPY table_name [ ( column [, ...] ) ] FROM 'file' [ WITH ( option [, ...] ) ];
COPY ... TO STDOUT | FROM STDIN   -- client side; psql: \copy
```

- `FORMAT csv` (mặc định là `text`: phân cách bằng tab, NULL ghi `\N`).
- `HEADER`: dòng tên cột khi xuất; bỏ qua dòng đầu khi nạp (`HEADER MATCH` còn kiểm tên cột).
- `DELIMITER ';'`: ký tự phân cách; `QUOTE '"'`: ký tự bao chuỗi.
- `NULL 'NA'`: chữ được đọc/ghi thành NULL (CSV mặc định: ô trống không nháy).
- `FORCE_QUOTE (col)`, `FORCE_NULL (col)`: luôn bao nháy khi xuất, coi ô nháy rỗng là NULL khi nạp.

## Ví dụ

Xuất cả bảng có dòng tiêu đề, rồi đọc lại file: tên có dấu phẩy được bao nháy, nháy kép bên trong được nhân đôi, NULL thành ô trống.

```sql
COPY orders TO '/tmp/orders.csv' WITH (FORMAT csv, HEADER);
SELECT pg_read_file('/tmp/orders.csv') AS file;
```

Xuất kết quả một câu với dấu chấm phẩy và chữ `NA` cho NULL:

```sql
COPY (SELECT id, total FROM orders ORDER BY id) TO '/tmp/totals.csv' WITH (FORMAT csv, DELIMITER ';', NULL 'NA');
SELECT pg_read_file('/tmp/totals.csv') AS file;
```

Dạng `text` mặc định: tab giữa các cột, NULL ghi là `\N`.

```sql
COPY (SELECT id, customer, total FROM orders WHERE id IN (2, 3) ORDER BY id) TO '/tmp/orders.txt';
SELECT pg_read_file('/tmp/orders.txt') AS file;
```

Nạp file CSV đầu tiên vào một bảng cùng cột và đếm lại:

```sql
CREATE TABLE orders_copy (LIKE orders);
COPY orders_copy FROM '/tmp/orders.csv' WITH (FORMAT csv, HEADER);
SELECT count(*) AS rows_in, count(total) AS with_total FROM orders_copy;
```

## Lỗi hay gặp

Quên nói chữ nào là NULL:

```sql
-- ERROR 22P02: invalid input syntax for type numeric: "NA"
COPY orders_in FROM '/tmp/partner.csv' WITH (FORMAT csv, HEADER, DELIMITER ';');
```

File có ít cột hơn danh sách cột:

```sql
-- ERROR 22P04: missing data for column "status"
COPY orders_in (id, customer, status, total) FROM '/tmp/totals.csv' WITH (FORMAT csv, DELIMITER ';', NULL 'NA');
```

Ở cột chữ, `NA` không gây lỗi mà lặng lẽ thành chữ:

```sql
-- WRONG: NA stays the text 'NA', so count(note) counts it
CREATE TABLE notes (id int, note text);
COPY (SELECT 1 AS id, 'NA' AS note UNION ALL SELECT 2, 'call back') TO '/tmp/notes.csv' WITH (FORMAT csv);
COPY notes FROM '/tmp/notes.csv' WITH (FORMAT csv);
SELECT count(note) AS with_note FROM notes;
```

```sql
-- FIX: say which word means NULL
CREATE TABLE notes_fixed (id int, note text);
COPY notes_fixed FROM '/tmp/notes.csv' WITH (FORMAT csv, NULL 'NA');
SELECT count(note) AS with_note FROM notes_fixed;
```

Câu sai đếm 2 ghi chú, câu sửa đếm 1. Cột số còn báo lỗi; cột chữ thì nhận mọi chữ, nên phải tự nói `NULL`.

## Thực hành

Ba bước: xuất đơn `paid` ra CSV có tiêu đề, nạp file của đối tác vào bảng tạm với đúng ba tùy chọn, rồi chép bảng tạm sang `orders`. Sau đó là hai câu hỏi.

## Tóm tắt

- `COPY … TO` xuất bảng hoặc kết quả câu; `COPY … FROM` nạp vào; `FORMAT csv` + `HEADER` cho file mở được bằng bảng tính.
- Khai đúng `DELIMITER` và `NULL` của file; cột chữ không báo lỗi khi sai, nó lặng lẽ giữ chữ.
- Tên file trong `COPY` là đường dẫn trên máy chủ và cần quyền đọc/ghi file của server; máy khách dùng `STDIN`/`STDOUT` hoặc `\copy`.
- Nạp vào bảng tạm, kiểm, rồi `INSERT … SELECT` sang bảng chính.

# EN

## Opening

Accounting asks for the list of paid orders as a file they can open in Excel, and a partner sends back a file of new orders to load into the system. You could write a loop that INSERTs row by row, or use the Postgres command built for it. This lesson uses `COPY` both ways, and shows where the file really lives.

## Key idea

`COPY` moves data between a table and a file in bulk, much faster than one `INSERT` per row. `COPY orders TO 'file'` exports a whole table; `COPY (SELECT …) TO 'file'` exports a query's result, so you choose the columns, the filter and the order. `COPY orders FROM 'file'` loads. For CSV use `FORMAT csv`; add `HEADER` for a line of column names (on load, the first line is skipped), `DELIMITER` for a separator other than the comma, `NULL` for the word that means "no value".

Many people think `COPY … TO 'file'` writes the file onto their own machine. In fact the file name is a path on the database server, read and written by the server process, and only a superuser or a role with `pg_read_server_files` / `pg_write_server_files` may use it. From a client use `COPY … TO STDOUT` / `FROM STDIN`; psql's `\copy` does exactly that. In this lab the server is PGlite running in the tab, so `/tmp` is the tab's memory; `pg_read_file` reads the file back so you can see it. The Sandbox's "My data" section also loads CSV with `COPY … FROM`.

The safe way to load: copy into a staging table with the same columns, check it, then `INSERT … SELECT` into the main table. By default one bad line stops the whole `COPY` command and no row goes in; since PostgreSQL 17, `ON_ERROR ignore` skips rows with values of the wrong type, but then you have to count the skipped rows yourself.

## Syntax

```sql
COPY table_name [ ( column [, ...] ) ] TO 'file' [ WITH ( option [, ...] ) ];
COPY ( query ) TO 'file' [ WITH ( option [, ...] ) ];
COPY table_name [ ( column [, ...] ) ] FROM 'file' [ WITH ( option [, ...] ) ];
COPY ... TO STDOUT | FROM STDIN   -- client side; psql: \copy
```

- `FORMAT csv` (the default is `text`: tab separated, NULL written `\N`).
- `HEADER`: a line of column names on export; the first line skipped on load (`HEADER MATCH` also checks the names).
- `DELIMITER ';'`: the separator; `QUOTE '"'`: the character around strings.
- `NULL 'NA'`: the word read/written as NULL (CSV default: an unquoted empty field).
- `FORCE_QUOTE (col)`, `FORCE_NULL (col)`: always quote on export, treat a quoted empty field as NULL on load.

## Example

Export the whole table with a header line, then read the file back: a name with a comma is quoted, a double quote inside is doubled, NULL becomes an empty field.

```sql
COPY orders TO '/tmp/orders.csv' WITH (FORMAT csv, HEADER);
SELECT pg_read_file('/tmp/orders.csv') AS file;
```

Export a query's result with semicolons and the word `NA` for NULL:

```sql
COPY (SELECT id, total FROM orders ORDER BY id) TO '/tmp/totals.csv' WITH (FORMAT csv, DELIMITER ';', NULL 'NA');
SELECT pg_read_file('/tmp/totals.csv') AS file;
```

The default `text` format: a tab between columns, NULL written as `\N`.

```sql
COPY (SELECT id, customer, total FROM orders WHERE id IN (2, 3) ORDER BY id) TO '/tmp/orders.txt';
SELECT pg_read_file('/tmp/orders.txt') AS file;
```

Load the first CSV file into a table with the same columns and count again:

```sql
CREATE TABLE orders_copy (LIKE orders);
COPY orders_copy FROM '/tmp/orders.csv' WITH (FORMAT csv, HEADER);
SELECT count(*) AS rows_in, count(total) AS with_total FROM orders_copy;
```

## Common mistakes

Forgetting to say which word is NULL:

```sql
-- ERROR 22P02: invalid input syntax for type numeric: "NA"
COPY orders_in FROM '/tmp/partner.csv' WITH (FORMAT csv, HEADER, DELIMITER ';');
```

A file with fewer columns than the column list:

```sql
-- ERROR 22P04: missing data for column "status"
COPY orders_in (id, customer, status, total) FROM '/tmp/totals.csv' WITH (FORMAT csv, DELIMITER ';', NULL 'NA');
```

In a text column, `NA` raises no error and quietly stays text:

```sql
-- WRONG: NA stays the text 'NA', so count(note) counts it
CREATE TABLE notes (id int, note text);
COPY (SELECT 1 AS id, 'NA' AS note UNION ALL SELECT 2, 'call back') TO '/tmp/notes.csv' WITH (FORMAT csv);
COPY notes FROM '/tmp/notes.csv' WITH (FORMAT csv);
SELECT count(note) AS with_note FROM notes;
```

```sql
-- FIX: say which word means NULL
CREATE TABLE notes_fixed (id int, note text);
COPY notes_fixed FROM '/tmp/notes.csv' WITH (FORMAT csv, NULL 'NA');
SELECT count(note) AS with_note FROM notes_fixed;
```

The wrong version counts 2 notes, the fix counts 1. A numeric column still raises an error; a text column takes any word, so you have to state `NULL` yourself.

## Practice

Three steps: export the `paid` orders to CSV with a header, load the partner's file into the staging table with the right three options, then copy the staging table into `orders`. Then two questions.

## Recap

- `COPY … TO` exports a table or a query's result; `COPY … FROM` loads; `FORMAT csv` + `HEADER` gives a file a spreadsheet opens.
- Declare the file's `DELIMITER` and `NULL`; a text column does not fail when they are wrong, it quietly keeps the word.
- The file name in `COPY` is a path on the server and needs the server's file privileges; a client uses `STDIN`/`STDOUT` or `\copy`.
- Load into a staging table, check it, then `INSERT … SELECT` into the main table.
