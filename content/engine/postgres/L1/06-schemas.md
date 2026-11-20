---
id: e-pg-l1-06
engine: postgres
level: L1
module: transactions
title: Schema và search_path
title_en: Schemas and search_path
kind: lab
runtime: browser
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Tạo schema để tách nhóm bảng, và gọi bảng bằng tên đầy đủ `schema.table`.
    en: Create a schema to separate a group of tables, and reach a table by its full name `schema.table`.
  - vi: Giải thích `search_path` chọn bảng nào khi hai schema có bảng trùng tên.
    en: Explain which table `search_path` picks when two schemas hold tables with the same name.
requires: [e-pg-l1-05]
sources:
  - https://www.postgresql.org/docs/18/ddl-schemas.html
  - https://www.postgresql.org/docs/18/sql-createschema.html
lab:
  setup: |
    CREATE TABLE notes (id int PRIMARY KEY, body text NOT NULL);
    INSERT INTO notes VALUES (1, 'current note');
  steps:
    - task:
        vi: Tạo schema tên `archive`.
        en: Create a schema named `archive`.
      solution: CREATE SCHEMA archive
      check: catalog
      hint:
        vi: "`CREATE SCHEMA name`."
        en: "`CREATE SCHEMA name`."
    - task:
        vi: "Trong schema `archive`, tạo bảng `notes` với `id int PRIMARY KEY` và `body text NOT NULL`."
        en: "In schema `archive`, create table `notes` with `id int PRIMARY KEY` and `body text NOT NULL`."
      solution: CREATE TABLE archive.notes (id int PRIMARY KEY, body text NOT NULL)
      check: catalog
      hint:
        vi: Viết tên bảng kèm schema, có dấu chấm ở giữa.
        en: Write the table name with its schema in front, joined by a dot.
    - task:
        vi: "Liệt kê schema và tên của mọi bảng tên `notes`, sắp theo schema."
        en: "List the schema and name of every table called `notes`, ordered by schema."
      solution: SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'notes' ORDER BY table_schema
      check: rows
      ordered: true
      hint:
        vi: "`information_schema.tables` có cột `table_schema` và `table_name`."
        en: "`information_schema.tables` has columns `table_schema` and `table_name`."
---
## Ý chính

Một database chứa nhiều schema; mỗi schema là một "thư mục" chứa bảng, view, hàm. Hai schema có thể có bảng trùng tên mà không đụng nhau. Bảng tạo không ghi schema sẽ vào `public`.

Tên đầy đủ là `schema.table`, ví dụ `archive.notes`. Khi chỉ viết `notes`, Postgres dò lần lượt các schema trong `search_path` và lấy bảng đầu tiên tìm thấy. Mặc định `search_path` là `"$user", public`: schema trùng tên người dùng (nếu có) rồi tới `public`.

Đổi `search_path` cho một phiên bằng `SET search_path = ...`. Cách an toàn nhất trong code ứng dụng vẫn là ghi tên đầy đủ, để không phụ thuộc thiết lập của phiên.

## Ví dụ

```sql
CREATE SCHEMA sales;
CREATE TABLE sales.notes (id int, body text);
INSERT INTO sales.notes VALUES (1, 'from sales');
SET search_path = sales, public;
SELECT current_schema() AS first_schema, body FROM notes;
```

Kết quả: `first_schema` là `sales`, và `notes` lúc này là `sales.notes`.

## Thực hành

Database có bảng `public.notes`. Tạo schema `archive`, tạo một bảng `notes` thứ hai trong đó, rồi xác nhận hai bảng cùng tên nằm ở hai schema.

# EN

## Key idea

A database holds many schemas; each schema is a "folder" of tables, views and functions. Two schemas can have tables with the same name without clashing. A table created without a schema goes into `public`.

The full name is `schema.table`, for example `archive.notes`. When you write only `notes`, Postgres looks through the schemas in `search_path` in order and takes the first table it finds. By default `search_path` is `"$user", public`: a schema named after the user (if any), then `public`.

Change `search_path` for a session with `SET search_path = ...`. In application code the safest choice is still the full name, so nothing depends on the session's setting.

## Example

```sql
CREATE SCHEMA sales;
CREATE TABLE sales.notes (id int, body text);
INSERT INTO sales.notes VALUES (1, 'from sales');
SET search_path = sales, public;
SELECT current_schema() AS first_schema, body FROM notes;
```

Result: `first_schema` is `sales`, and `notes` now means `sales.notes`.

## Practice

The database has table `public.notes`. Create schema `archive`, create a second `notes` table inside it, then confirm that two tables with the same name live in two schemas.
