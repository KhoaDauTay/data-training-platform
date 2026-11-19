---
id: e-pg-l1-02
engine: postgres
level: L1
module: types
title: Tạo bảng đầu tiên
title_en: Creating your first table
kind: lab
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Viết `CREATE TABLE` có khóa chính, `NOT NULL` và giá trị mặc định.
    en: Write a `CREATE TABLE` with a primary key, `NOT NULL` and default values.
  - vi: Đọc lại cấu trúc bảng từ `information_schema.columns`.
    en: Read a table's structure back from `information_schema.columns`.
requires: [e-pg-l1-01]
sources:
  - https://www.postgresql.org/docs/18/sql-createtable.html
  - https://www.postgresql.org/docs/18/ddl-default.html
  - https://www.postgresql.org/docs/18/sql-insert.html
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
---
## Ý chính

`CREATE TABLE` khai báo tên bảng và danh sách cột. Mỗi cột có tên, kiểu và có thể thêm ràng buộc:

- `PRIMARY KEY`: định danh duy nhất của dòng, tự kèm `NOT NULL` và một index unique.
- `NOT NULL`: cột phải có giá trị.
- `DEFAULT ...`: giá trị dùng khi câu `INSERT` không nhắc tới cột đó.

`INSERT ... RETURNING` trả lại những dòng vừa ghi, kể cả giá trị mặc định mà Postgres vừa điền, nên không cần chạy thêm một câu `SELECT`.

Cấu trúc bảng nằm trong catalog. `information_schema.columns` là bản xem theo chuẩn SQL: mỗi cột một dòng, có `data_type`, `is_nullable`, `column_default`.

## Ví dụ

```sql
CREATE TABLE notes (
  id bigint PRIMARY KEY,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false
);
INSERT INTO notes (id, body) VALUES (1, 'hello') RETURNING *;
```

```sql
-- ERROR: null value in column "body" violates not-null constraint
INSERT INTO notes (id) VALUES (2);
```

## Thực hành

Database có sẵn bảng `categories`. Hãy tạo bảng `products`, thêm hai dòng rồi đọc lại cấu trúc của nó.

# EN

## Key idea

`CREATE TABLE` declares a table name and its list of columns. Each column has a name, a type and optional constraints:

- `PRIMARY KEY`: the row's unique identifier; it implies `NOT NULL` and comes with a unique index.
- `NOT NULL`: the column must hold a value.
- `DEFAULT ...`: the value used when an `INSERT` does not mention the column.

`INSERT ... RETURNING` hands back the rows just written, including defaults Postgres filled in, so you do not need an extra `SELECT`.

A table's structure lives in the catalog. `information_schema.columns` is the SQL-standard view of it: one row per column, with `data_type`, `is_nullable`, `column_default`.

## Example

```sql
CREATE TABLE notes (
  id bigint PRIMARY KEY,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false
);
INSERT INTO notes (id, body) VALUES (1, 'hello') RETURNING *;
```

```sql
-- ERROR: null value in column "body" violates not-null constraint
INSERT INTO notes (id) VALUES (2);
```

## Practice

The database already has table `categories`. Create table `products`, insert two rows, then read its structure back.
