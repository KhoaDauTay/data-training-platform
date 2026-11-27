---
id: e-pg-l1-02
engine: postgres
level: L1
module: ddl
title: Tạo bảng đầu tiên
title_en: Creating your first table
kind: lab
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Viết `CREATE TABLE` có khóa chính, `NOT NULL` và giá trị mặc định.
    en: Write a `CREATE TABLE` with a primary key, `NOT NULL` and default values.
  - vi: Thêm dòng bằng `INSERT ... RETURNING` và biết khi nào `DEFAULT` được dùng.
    en: Add rows with `INSERT ... RETURNING` and know when a `DEFAULT` is used.
  - vi: Đọc lại cấu trúc bảng từ `information_schema.columns`.
    en: Read a table's structure back from `information_schema.columns`.
requires: [e-pg-l1-01]
sources:
  - { url: https://www.postgresql.org/docs/18/sql-createtable.html, title_vi: "CREATE TABLE" }
  - { url: https://www.postgresql.org/docs/18/ddl-default.html, title_vi: "Giá trị mặc định" }
  - { url: https://www.postgresql.org/docs/18/sql-insert.html, title_vi: "INSERT" }
  - { url: https://www.postgresql.org/docs/18/infoschema-columns.html, title_vi: "information_schema.columns" }
lab:
  setup: |
    CREATE TABLE categories (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO categories VALUES (1, 'Stationery'), (2, 'Books');
  steps:
    - task:
        vi: "Tạo bảng `products` với đúng các cột: `id bigint` khóa chính, `name text NOT NULL`, `price numeric(10,2) NOT NULL`, `in_stock boolean NOT NULL DEFAULT true`."
        en: "Create table `products` with exactly these columns: `id bigint` primary key, `name text NOT NULL`, `price numeric(10,2) NOT NULL`, `in_stock boolean NOT NULL DEFAULT true`."
      solution: CREATE TABLE products (id bigint PRIMARY KEY, name text NOT NULL, price numeric(10,2) NOT NULL, in_stock boolean NOT NULL DEFAULT true)
      check: catalog
      hint:
        vi: "Mỗi cột là `name type [constraints]`, cách nhau bằng dấu phẩy; `PRIMARY KEY` viết ngay sau kiểu của `id`."
        en: "Each column is `name type [constraints]`, separated by commas; put `PRIMARY KEY` right after the type of `id`."
    - task:
        vi: "Thêm hai sản phẩm (1, 'Pen', 1.50) và (2, 'Notebook', 3.20) chỉ với ba cột `id, name, price`, và trả về `id, name, price, in_stock`."
        en: "Insert two products (1, 'Pen', 1.50) and (2, 'Notebook', 3.20) giving only the three columns `id, name, price`, and return `id, name, price, in_stock`."
      solution: INSERT INTO products (id, name, price) VALUES (1, 'Pen', 1.50), (2, 'Notebook', 3.20) RETURNING id, name, price, in_stock
      check: rows
      hint:
        vi: "`INSERT INTO table (cols, ...) VALUES (...), (...) RETURNING ...`. Cột không ghi sẽ nhận giá trị mặc định."
        en: "`INSERT INTO table (cols, ...) VALUES (...), (...) RETURNING ...`. Columns you leave out get their default."
    - task:
        vi: Liệt kê tên cột và kiểu dữ liệu của bảng `products` theo thứ tự cột trong bảng.
        en: List the column names and data types of table `products` in table column order.
      solution: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position
      check: rows
      ordered: true
      hint:
        vi: "Cột `column_name`, `data_type`, lọc `table_name = 'products'`, sắp theo `ordinal_position`."
        en: "Columns `column_name`, `data_type`, filter `table_name = 'products'`, order by `ordinal_position`."
quiz:
  - q:
      vi: "Cột `status text DEFAULT 'open'` không có `NOT NULL`. Bạn chạy `INSERT` ghi rõ `NULL` vào `status`. Dòng mới có `status` là gì?"
      en: "Column `status text DEFAULT 'open'` has no `NOT NULL`. You run an `INSERT` that writes `NULL` into `status` explicitly. What is the new row's `status`?"
    options:
      - { vi: "`'open'`, vì giá trị mặc định thay cho NULL", en: "`'open'`, because the default replaces NULL" }
      - { vi: "NULL, vì bạn đã ghi giá trị cho cột", en: "NULL, because you gave the column a value" }
      - { vi: "Báo lỗi", en: "An error" }
    answer: 1
    trap: 0
    why:
      vi: "`'open'` nghe hợp lý vì giá trị mặc định trông như \"giá trị dự phòng khi thiếu\", nhưng `DEFAULT` chỉ dùng khi câu `INSERT` không nhắc tới cột hoặc ghi từ khóa `DEFAULT`. Ở đây câu ghi rõ NULL, nên NULL được lưu nguyên. Không báo lỗi vì cột không có `NOT NULL`; muốn cấm NULL thì thêm ràng buộc đó."
      en: "`'open'` sounds right because a default looks like \"a fallback when something is missing\", but `DEFAULT` is only used when the `INSERT` leaves the column out or writes the keyword `DEFAULT`. Here the statement writes NULL explicitly, so NULL is stored as is. There is no error because the column has no `NOT NULL`; add that constraint to forbid NULL."
  - q:
      vi: "Cột `id` được khai báo `PRIMARY KEY`. Postgres cho bạn những gì?"
      en: "Column `id` is declared `PRIMARY KEY`. What does Postgres give you?"
    options:
      - { vi: "Chỉ chống trùng; một dòng vẫn có thể có `id` NULL", en: "Only no duplicates; a row may still have a NULL `id`" }
      - { vi: "Chống trùng, cấm NULL và một index unique", en: "No duplicates, no NULLs and a unique index" }
      - { vi: "Một index, nhưng vẫn cho trùng", en: "An index, but duplicates are allowed" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chỉ chống trùng\" nghe hợp lý vì một cột `UNIQUE` thường vẫn nhận NULL, nhưng khóa chính (primary key) là `UNIQUE` cộng `NOT NULL`, nên `id` NULL bị từ chối. Để kiểm tra trùng nhanh, Postgres tạo một index unique tên `..._pkey`; index đó chính là thứ cấm trùng, nên \"vẫn cho trùng\" cũng sai."
      en: "\"Only no duplicates\" sounds right because a `UNIQUE` column usually still accepts NULL, but a primary key is `UNIQUE` plus `NOT NULL`, so a NULL `id` is refused. To check duplicates quickly, Postgres builds a unique index named `..._pkey`; that index is what forbids duplicates, so \"duplicates are allowed\" is wrong too."
---
## Mở bài

Một cửa hàng nhỏ ghi sản phẩm vào bảng tính: có dòng thiếu tên, có hai dòng cùng mã, có giá ghi chữ "hết". Một bảng Postgres khai báo đúng sẽ chặn cả ba lỗi đó ngay lúc ghi. Bài này tạo một bảng như vậy, thêm dòng và đọc lại cấu trúc của nó.

## Ý chính

`CREATE TABLE` khai báo tên bảng và danh sách cột. Mỗi cột có tên, kiểu và có thể thêm ràng buộc. `PRIMARY KEY` là định danh duy nhất của dòng: nó gồm `UNIQUE` và `NOT NULL`, và Postgres tự tạo một index (chỉ mục) unique tên `<table>_pkey` để kiểm tra trùng. `NOT NULL` bắt cột phải có giá trị. `DEFAULT ...` là giá trị dùng khi câu `INSERT` không nhắc tới cột.

Nhiều người nghĩ `DEFAULT` sẽ thay cho mọi NULL. Thật ra nó chỉ dùng khi cột vắng mặt trong `INSERT` hoặc khi bạn ghi từ khóa `DEFAULT`; một NULL ghi rõ vẫn được lưu là NULL. Vì vậy cột có mặc định mà không được để trống thì cần cả `NOT NULL`.

`INSERT INTO table (column, ...) VALUES (...)` nên luôn ghi danh sách cột: câu lệnh vẫn đúng khi bảng thêm cột sau này, và các cột bỏ qua nhận giá trị mặc định. Thêm `RETURNING` để nhận lại những dòng vừa ghi, kể cả giá trị Postgres vừa điền, nên không cần chạy thêm một câu `SELECT`.

Cấu trúc bảng nằm trong catalog (danh mục hệ thống). `information_schema.columns` là bản xem theo chuẩn SQL: mỗi cột một dòng, có `data_type`, `is_nullable`, `column_default` và `ordinal_position` (thứ tự cột). Index của bảng nằm trong `pg_indexes`.

## Cú pháp

```sql
CREATE TABLE [ IF NOT EXISTS ] table_name (
  column_name data_type [ PRIMARY KEY ] [ NOT NULL ] [ DEFAULT expr ]
  [, ...]
);
INSERT INTO table_name [ ( column [, ...] ) ]
  VALUES ( { expr | DEFAULT } [, ...] ) [, ...]
  [ RETURNING { * | expr [, ...] } ];
```

- `IF NOT EXISTS`: bỏ qua (kèm một notice) nếu bảng đã có, thay vì báo lỗi.
- `DEFAULT` trong `VALUES`: dùng giá trị mặc định cho đúng ô đó.
- `RETURNING`: trả về các dòng vừa ghi, như một `SELECT`.

## Ví dụ

Tạo bảng ghi chú và thêm một dòng chỉ với hai cột:

```sql
CREATE TABLE notes (
  id bigint PRIMARY KEY,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false
);
INSERT INTO notes (id, body) VALUES (1, 'hello') RETURNING *;
```

`RETURNING *` trả về `1, hello, false`: `pinned` không được nhắc tới nên nhận mặc định `false`.

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notes'
ORDER BY ordinal_position;
```

Ba dòng, một dòng mỗi cột: cả ba có `is_nullable` là `NO` (khóa chính tự kèm `NOT NULL`), và chỉ `pinned` có `column_default` là `false`.

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'notes';
```

Kết quả là `notes_pkey`, một `CREATE UNIQUE INDEX` trên `id`: khóa chính đến kèm index này.

## Lỗi hay gặp

Quên một cột `NOT NULL`:

```sql
-- ERROR 23502: null value in column "body" of relation "notes" violates not-null constraint
INSERT INTO notes (id) VALUES (2);
```

`body` không có mặc định nên nhận NULL, và `NOT NULL` từ chối cả dòng. Ghi đủ các cột bắt buộc.

Trùng khóa chính:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "notes_pkey"
INSERT INTO notes (id, body) VALUES (1, 'again');
```

Dòng `id = 1` đã có. Thông báo lỗi nêu đúng tên index `notes_pkey` đã chặn nó.

Ghi NULL rõ ràng và mong nhận mặc định:

```sql
-- WRONG: an explicit NULL is stored, the default is not used
CREATE TABLE tasks (id bigint PRIMARY KEY, title text NOT NULL, status text DEFAULT 'open');
INSERT INTO tasks VALUES (1, 'Call An', NULL) RETURNING status;
```

```sql
-- FIX: leave the column out (or write DEFAULT)
INSERT INTO tasks (id, title) VALUES (2, 'Email Binh') RETURNING status;
```

Câu sai trả `status` là NULL, câu sửa trả `open`. Nếu cột không được để trống, thêm `NOT NULL` để Postgres chặn luôn trường hợp đầu.

## Thực hành

Database có sẵn bảng `categories`. Tạo bảng `products`, thêm hai dòng mà không ghi `in_stock`, rồi đọc lại cấu trúc của nó; sau đó là hai câu hỏi.

## Tóm tắt

- `CREATE TABLE` khai báo cột với tên, kiểu và ràng buộc; `PRIMARY KEY` = `UNIQUE` + `NOT NULL` + một index unique.
- `DEFAULT` chỉ dùng khi cột vắng mặt trong `INSERT` hoặc ghi từ khóa `DEFAULT`; NULL ghi rõ vẫn là NULL.
- Luôn ghi danh sách cột trong `INSERT`, và dùng `RETURNING` để thấy ngay giá trị đã lưu.
- Đọc cấu trúc bảng từ `information_schema.columns`, index từ `pg_indexes`.

# EN

## Opening

A small shop keeps its products in a spreadsheet: one row has no name, two rows share a code, one price says "sold out". A well-declared Postgres table blocks all three mistakes at write time. This lesson creates such a table, adds rows and reads its structure back.

## Key idea

`CREATE TABLE` declares a table name and its list of columns. Each column has a name, a type and optional constraints. `PRIMARY KEY` is the row's unique identifier: it combines `UNIQUE` and `NOT NULL`, and Postgres builds a unique index named `<table>_pkey` to check for duplicates. `NOT NULL` requires a value. `DEFAULT ...` is the value used when an `INSERT` does not mention the column.

Many people think a `DEFAULT` replaces every NULL. In fact it is only used when the column is missing from the `INSERT` or when you write the keyword `DEFAULT`; an explicit NULL is stored as NULL. So a column with a default that must never be empty also needs `NOT NULL`.

`INSERT INTO table (column, ...) VALUES (...)` should always name its columns: the statement keeps working when the table gains a column later, and the columns you skip get their default. Add `RETURNING` to get back the rows just written, including the values Postgres filled in, so you do not need an extra `SELECT`.

A table's structure lives in the catalog (the system tables). `information_schema.columns` is the SQL-standard view of it: one row per column, with `data_type`, `is_nullable`, `column_default` and `ordinal_position` (the column order). The table's indexes are in `pg_indexes`.

## Syntax

```sql
CREATE TABLE [ IF NOT EXISTS ] table_name (
  column_name data_type [ PRIMARY KEY ] [ NOT NULL ] [ DEFAULT expr ]
  [, ...]
);
INSERT INTO table_name [ ( column [, ...] ) ]
  VALUES ( { expr | DEFAULT } [, ...] ) [, ...]
  [ RETURNING { * | expr [, ...] } ];
```

- `IF NOT EXISTS`: skips (with a notice) when the table already exists, instead of raising an error.
- `DEFAULT` inside `VALUES`: uses the default for that one cell.
- `RETURNING`: returns the rows just written, like a `SELECT`.

## Example

Create a notes table and insert a row giving only two columns:

```sql
CREATE TABLE notes (
  id bigint PRIMARY KEY,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false
);
INSERT INTO notes (id, body) VALUES (1, 'hello') RETURNING *;
```

`RETURNING *` returns `1, hello, false`: `pinned` was not mentioned, so it got its default `false`.

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notes'
ORDER BY ordinal_position;
```

Three rows, one per column: all three have `is_nullable` = `NO` (the primary key implies `NOT NULL`), and only `pinned` has a `column_default` of `false`.

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'notes';
```

The result is `notes_pkey`, a `CREATE UNIQUE INDEX` on `id`: the primary key comes with this index.

## Common mistakes

Forgetting a `NOT NULL` column:

```sql
-- ERROR 23502: null value in column "body" of relation "notes" violates not-null constraint
INSERT INTO notes (id) VALUES (2);
```

`body` has no default, so it gets NULL and `NOT NULL` rejects the whole row. Give every required column.

A duplicate primary key:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "notes_pkey"
INSERT INTO notes (id, body) VALUES (1, 'again');
```

The row `id = 1` already exists. The error names the index `notes_pkey` that blocked it.

Writing an explicit NULL and expecting the default:

```sql
-- WRONG: an explicit NULL is stored, the default is not used
CREATE TABLE tasks (id bigint PRIMARY KEY, title text NOT NULL, status text DEFAULT 'open');
INSERT INTO tasks VALUES (1, 'Call An', NULL) RETURNING status;
```

```sql
-- FIX: leave the column out (or write DEFAULT)
INSERT INTO tasks (id, title) VALUES (2, 'Email Binh') RETURNING status;
```

The wrong version returns a NULL `status`, the fix returns `open`. If the column must never be empty, add `NOT NULL` so Postgres blocks the first case outright.

## Practice

The database already has table `categories`. Create table `products`, insert two rows without giving `in_stock`, then read its structure back; two questions follow.

## Recap

- `CREATE TABLE` declares columns with a name, a type and constraints; `PRIMARY KEY` = `UNIQUE` + `NOT NULL` + a unique index.
- `DEFAULT` is used only when the column is missing from the `INSERT` or the keyword `DEFAULT` is written; an explicit NULL stays NULL.
- Always name the columns in an `INSERT`, and use `RETURNING` to see the stored values at once.
- Read a table's structure from `information_schema.columns` and its indexes from `pg_indexes`.
