---
id: e-pg-l1-06
engine: postgres
level: L1
module: schemas
title: Database, schema và search_path
title_en: Databases, schemas and search_path
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-namespace-tree, at: idea }]
objectives:
  - vi: Phân biệt cụm (cluster), database và schema, và biết một kết nối chỉ thấy đúng một database.
    en: Tell a cluster, a database and a schema apart, and know that a connection sees exactly one database.
  - vi: Tạo schema để tách nhóm bảng, đặt chủ bằng `AUTHORIZATION`, và gọi bảng bằng tên đầy đủ `schema.table`.
    en: Create a schema to separate a group of tables, set its owner with `AUTHORIZATION`, and reach a table by its full name `schema.table`.
  - vi: Giải thích `search_path` chọn bảng nào khi hai schema có bảng trùng tên.
    en: Explain which table `search_path` picks when two schemas hold tables with the same name.
requires: [e-pg-l1-05]
sources:
  - https://www.postgresql.org/docs/18/manage-ag-overview.html
  - https://www.postgresql.org/docs/18/sql-createdatabase.html
  - https://www.postgresql.org/docs/18/ddl-schemas.html
  - https://www.postgresql.org/docs/18/sql-createschema.html
  - https://www.postgresql.org/docs/18/sql-dropschema.html
  - https://www.postgresql.org/docs/18/functions-info.html
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
    - task:
        vi: "Cụm của lab chứa những database nào không phải mẫu (template)? Trả về `datname`, sắp theo tên."
        en: "Which databases of the lab's cluster are not templates? Return `datname`, ordered by name."
      solution: SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname
      check: rows
      ordered: true
      hint:
        vi: "Catalog `pg_database` có cột `datname` và `datistemplate`."
        en: "Catalog `pg_database` has columns `datname` and `datistemplate`."
quiz:
  - q:
      vi: "Bạn đang kết nối vào database `shop` và muốn nối bảng `orders` với bảng `users` của database `crm` cùng server. Viết `crm.public.users` có được không?"
      en: "You are connected to database `shop` and want to join table `orders` with table `users` of database `crm` on the same server. Does `crm.public.users` work?"
    options:
      - { vi: "Được, tên ba phần chỉ tới bất kỳ database nào trên server", en: "Yes, a three-part name reaches any database on the server" }
      - { vi: "Không, một kết nối chỉ thấy database của nó; cần một extension như `postgres_fdw`", en: "No, a connection only sees its own database; you need an extension such as `postgres_fdw`" }
      - { vi: "Được, nếu chạy trong một transaction", en: "Yes, if it runs inside a transaction" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì vài hệ CSDL khác cho truy vấn chéo database bằng tên ba phần, nhưng ở Postgres mỗi kết nối gắn với đúng một database, và tên ba phần trỏ ra ngoài báo lỗi 0A000. Dữ liệu cần nối với nhau nên nằm ở hai schema của cùng một database."
      en: "It sounds right because some other databases allow cross-database queries with three-part names, but in Postgres each connection is bound to exactly one database, and a three-part name pointing elsewhere fails with 0A000. Data that must be joined belongs in two schemas of the same database."
  - q:
      vi: "`search_path` là `sales, public`. Cả `sales` và `public` đều có bảng `notes`. `SELECT * FROM notes` đọc bảng nào?"
      en: "`search_path` is `sales, public`. Both `sales` and `public` have a table `notes`. Which table does `SELECT * FROM notes` read?"
    options:
      - { vi: "`public.notes`, vì `public` là schema mặc định", en: "`public.notes`, because `public` is the default schema" }
      - { vi: "`sales.notes`, schema đầu tiên trong `search_path` có bảng tên đó", en: "`sales.notes`, the first schema in `search_path` that has a table of that name" }
      - { vi: "Báo lỗi vì tên bị nhập nhằng", en: "An error, because the name is ambiguous" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì bảng tạo không ghi schema thường vào `public`, nhưng khi đọc, Postgres dò `search_path` từ trái sang phải và lấy bảng đầu tiên tìm thấy, không báo nhập nhằng. Ghi tên đầy đủ khi không muốn phụ thuộc thiết lập của phiên."
      en: "It sounds right because a table created without a schema usually lands in `public`, but when reading, Postgres walks `search_path` left to right and takes the first table it finds, with no ambiguity error. Write the full name when you do not want to depend on the session's setting."
---
## Mở bài

Một đồng nghiệp chạy `SELECT * FROM notes` và thấy ghi chú cũ từ năm ngoái, trong khi bạn chạy đúng câu đó và thấy ghi chú hôm nay. Không ai gõ sai: hai người đang đọc hai bảng khác nhau cùng tên `notes`. Bài này giải thích Postgres tìm một cái tên ở đâu, từ cụm, database đến schema.

## Ý chính

Một server Postgres đang chạy quản lý một cụm (cluster). Cụm chứa nhiều database; mỗi database chứa nhiều schema; mỗi schema chứa bảng, view, hàm. Vai trò (người dùng) thuộc về cả cụm, còn bảng thuộc về đúng một database. Catalog `pg_database` liệt kê mọi database của cụm, và `current_database()` cho biết kết nối của bạn đang ở database nào.

Nhiều người nghĩ một câu SQL có thể đọc bảng ở database khác trên cùng server bằng tên ba phần. Thật ra mỗi kết nối gắn với đúng một database lúc đăng nhập, và không có lệnh SQL nào đổi sang database khác (lệnh `\c` của psql thực chất mở một kết nối mới). Muốn nối dữ liệu của hai database phải dùng extension như `postgres_fdw`. Vì thế dữ liệu cần JOIN với nhau nên nằm trong cùng một database, tách bằng schema.

`CREATE DATABASE` tạo database mới bằng cách sao chép database mẫu `template1`, và không chạy được trong một khối transaction. Lab ở đây chạy trên PGlite: mỗi lab là một cụm nhỏ có một database làm việc `postgres` (cùng hai database mẫu), và bạn luôn kết nối vào `postgres`. Lệnh `CREATE DATABASE` vẫn chạy và database mới hiện trong `pg_database`, nhưng kết nối của bạn vẫn ở `postgres`.

Schema là "thư mục" bên trong database: hai schema có thể có bảng trùng tên mà không đụng nhau. `CREATE SCHEMA name AUTHORIZATION role` tạo schema và giao quyền sở hữu cho một vai trò. Từ Postgres 15, vai trò thường không còn được tạo bảng trong `public`, nên mỗi ứng dụng hay nhóm thường có schema riêng. `DROP SCHEMA` từ chối schema còn đồ bên trong; `CASCADE` xóa luôn mọi thứ trong đó, nên dùng cẩn thận.

Tên đầy đủ là `schema.table`, ví dụ `archive.notes`. Khi chỉ viết `notes`, Postgres dò lần lượt các schema trong `search_path` và lấy bảng đầu tiên tìm thấy; `CREATE TABLE` không ghi schema cũng tạo bảng ở schema đầu tiên đó. Trên server thường, mặc định là `"$user", public`; lab này đặt sẵn `public`, xem bằng `SHOW search_path`. Code ứng dụng an toàn nhất khi ghi tên đầy đủ.

Hình từng bước ở cuối mục này vẽ cụm, database và schema lồng nhau, rồi cho thấy Postgres dò `search_path` để hiểu tên trơn `notes`.

## Cú pháp

```sql
CREATE DATABASE name [ OWNER role ] [ TEMPLATE template ];
SELECT current_database();
CREATE SCHEMA [ IF NOT EXISTS ] name [ AUTHORIZATION role ];
DROP SCHEMA [ IF EXISTS ] name [ CASCADE | RESTRICT ];
SET search_path = schema [, ...];
SELECT ... FROM schema.table;
```

- `TEMPLATE`: database dùng làm khuôn; mặc định `template1`.
- `AUTHORIZATION role`: vai trò sở hữu schema; bỏ tên schema thì schema lấy tên vai trò.
- `RESTRICT` (mặc định): từ chối nếu schema còn đối tượng; `CASCADE`: xóa luôn chúng.
- `SET search_path`: chỉ đổi cho phiên hiện tại; `RESET search_path` trả lại mặc định.

## Ví dụ

Bạn đang ở đâu trong cụm:

```sql
SELECT current_database() AS db, current_user AS who,
       (SELECT count(*) FROM pg_database) AS databases;
```

`db` là `postgres` và cụm có 3 database: `postgres` cộng hai mẫu `template0`, `template1`.

```sql
CREATE DATABASE reports;
SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname;
```

Giờ có `postgres` và `reports`, nhưng `current_database()` vẫn là `postgres`: tạo database không đưa bạn vào đó.

```sql
CREATE ROLE reporting NOLOGIN;
CREATE SCHEMA reporting AUTHORIZATION reporting;
SELECT nspname, pg_get_userbyid(nspowner) AS owner
FROM pg_namespace WHERE nspname IN ('public', 'reporting') ORDER BY nspname;
```

Schema `reporting` thuộc vai trò `reporting`; `public` thuộc `pg_database_owner`, tức chủ của database.

```sql
CREATE SCHEMA sales;
CREATE TABLE sales.notes (id int PRIMARY KEY, body text NOT NULL);
INSERT INTO sales.notes VALUES (1, 'from sales');
SET search_path = sales, public;
SELECT current_schema() AS first_schema, body FROM notes;
RESET search_path;
```

`first_schema` là `sales`, và `notes` lúc đó là `sales.notes`. `RESET search_path` trả phiên về mặc định.

## Lỗi hay gặp

Đọc bảng ở database khác:

```sql
-- ERROR 0A000: cross-database references are not implemented: "reports.public.notes"
SELECT * FROM reports.public.notes;
```

Postgres không đọc chéo database. Đặt hai nhóm bảng vào hai schema của cùng database.

Tạo database trong transaction:

```sql
BEGIN;
-- ERROR 25001: CREATE DATABASE cannot run inside a transaction block
CREATE DATABASE archive_db;
```

```sql
ROLLBACK;
SELECT count(*) AS archive_db_exists FROM pg_database WHERE datname = 'archive_db';
```

Transaction bị hỏng nên phải `ROLLBACK`, và không có database nào được tạo (kết quả 0). Chạy `CREATE DATABASE` như một câu riêng, ngoài `BEGIN`.

Tên ngắn trỏ nhầm bảng vì `search_path`:

```sql
-- WRONG: with sales first in search_path, notes means sales.notes
SET search_path = sales, public;
SELECT body FROM notes WHERE id = 1;
```

```sql
-- FIX: name the schema
RESET search_path;
SELECT body FROM public.notes WHERE id = 1;
```

Câu sai trả `from sales` thay vì `current note`, không có lỗi nào. Ghi tên đầy đủ trong script và code ứng dụng.

Xóa schema còn bảng:

```sql
-- ERROR 2BP01: cannot drop schema sales because other objects depend on it
DROP SCHEMA sales;
```

```sql
DROP SCHEMA sales CASCADE;
SELECT nspname FROM pg_namespace WHERE nspname IN ('public', 'reporting', 'sales') ORDER BY nspname;
```

`DROP SCHEMA` mặc định là `RESTRICT`. `CASCADE` xóa schema cùng bảng `sales.notes` bên trong; kiểm tra kỹ trước khi chạy.

## Thực hành

Database có bảng `public.notes`. Tạo schema `archive`, tạo một bảng `notes` thứ hai trong đó, xác nhận hai bảng cùng tên nằm ở hai schema, rồi xem cụm có những database nào; sau đó là hai câu hỏi.

## Tóm tắt

- Cụm chứa database, database chứa schema, schema chứa bảng; một kết nối chỉ thấy một database.
- Không đọc chéo database được; dữ liệu cần JOIN nên nằm ở các schema của cùng database.
- `CREATE DATABASE` không chạy trong transaction; `current_database()` cho biết bạn đang ở đâu.
- `CREATE SCHEMA ... AUTHORIZATION` đặt chủ; `DROP SCHEMA ... CASCADE` xóa cả nội dung.
- Tên ngắn đi theo `search_path`, schema đầu tiên thắng; ghi `schema.table` khi cần chắc chắn. Mỗi khách một schema: `e-pg-l1-19`.

# EN

## Opening

A colleague runs `SELECT * FROM notes` and sees last year's notes, while you run the same statement and see today's. Nobody mistyped: you are reading two different tables that are both called `notes`. This lesson explains where Postgres looks a name up, from the cluster to the database to the schema.

## Key idea

A running Postgres server manages one cluster. The cluster holds many databases; each database holds many schemas; each schema holds tables, views and functions. Roles (users) belong to the whole cluster, while a table belongs to exactly one database. The catalog `pg_database` lists every database of the cluster, and `current_database()` tells you which one your connection is in.

Many people think a query can read a table in another database on the same server with a three-part name. In fact each connection is bound to exactly one database at login, and no SQL command switches to another database (psql's `\c` really opens a new connection). Joining data from two databases needs an extension such as `postgres_fdw`. So data that must be JOINed belongs in one database, split by schemas.

`CREATE DATABASE` makes a new database by copying the template database `template1`, and it cannot run inside a transaction block. The lab here runs on PGlite: each lab is a small cluster with one working database `postgres` (plus two template databases), and you are always connected to `postgres`. `CREATE DATABASE` still runs and the new database shows up in `pg_database`, but your connection stays in `postgres`.

A schema is a "folder" inside a database: two schemas can hold tables with the same name without clashing. `CREATE SCHEMA name AUTHORIZATION role` creates a schema and makes a role its owner. Since Postgres 15 ordinary roles can no longer create tables in `public`, so each application or team usually gets its own schema. `DROP SCHEMA` refuses a schema that still holds objects; `CASCADE` drops everything inside, so use it with care.

The full name is `schema.table`, for example `archive.notes`. When you write only `notes`, Postgres walks the schemas in `search_path` in order and takes the first table it finds; a `CREATE TABLE` without a schema also creates the table in that first schema. On a normal server the default is `"$user", public`; this lab sets `public`, check it with `SHOW search_path`. Application code is safest when it writes full names.

The step-through figure at the end of this section draws the cluster, databases and schemas nested inside each other, then shows Postgres walking `search_path` to resolve the plain name `notes`.

## Syntax

```sql
CREATE DATABASE name [ OWNER role ] [ TEMPLATE template ];
SELECT current_database();
CREATE SCHEMA [ IF NOT EXISTS ] name [ AUTHORIZATION role ];
DROP SCHEMA [ IF EXISTS ] name [ CASCADE | RESTRICT ];
SET search_path = schema [, ...];
SELECT ... FROM schema.table;
```

- `TEMPLATE`: the database used as the mould; the default is `template1`.
- `AUTHORIZATION role`: the role that owns the schema; without a schema name the schema takes the role's name.
- `RESTRICT` (the default): refuses when the schema still holds objects; `CASCADE`: drops them too.
- `SET search_path`: changes only the current session; `RESET search_path` restores the default.

## Example

Where you are in the cluster:

```sql
SELECT current_database() AS db, current_user AS who,
       (SELECT count(*) FROM pg_database) AS databases;
```

`db` is `postgres` and the cluster has 3 databases: `postgres` plus the two templates `template0`, `template1`.

```sql
CREATE DATABASE reports;
SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname;
```

Now there are `postgres` and `reports`, but `current_database()` is still `postgres`: creating a database does not take you into it.

```sql
CREATE ROLE reporting NOLOGIN;
CREATE SCHEMA reporting AUTHORIZATION reporting;
SELECT nspname, pg_get_userbyid(nspowner) AS owner
FROM pg_namespace WHERE nspname IN ('public', 'reporting') ORDER BY nspname;
```

Schema `reporting` belongs to role `reporting`; `public` belongs to `pg_database_owner`, meaning the database's owner.

```sql
CREATE SCHEMA sales;
CREATE TABLE sales.notes (id int PRIMARY KEY, body text NOT NULL);
INSERT INTO sales.notes VALUES (1, 'from sales');
SET search_path = sales, public;
SELECT current_schema() AS first_schema, body FROM notes;
RESET search_path;
```

`first_schema` is `sales`, and `notes` then means `sales.notes`. `RESET search_path` puts the session back to its default.

## Common mistakes

Reading a table in another database:

```sql
-- ERROR 0A000: cross-database references are not implemented: "reports.public.notes"
SELECT * FROM reports.public.notes;
```

Postgres does not read across databases. Put the two groups of tables in two schemas of the same database.

Creating a database inside a transaction:

```sql
BEGIN;
-- ERROR 25001: CREATE DATABASE cannot run inside a transaction block
CREATE DATABASE archive_db;
```

```sql
ROLLBACK;
SELECT count(*) AS archive_db_exists FROM pg_database WHERE datname = 'archive_db';
```

The transaction is broken, so it must be ended with `ROLLBACK`, and no database was created (the result is 0). Run `CREATE DATABASE` as a statement of its own, outside `BEGIN`.

A short name pointing at the wrong table because of `search_path`:

```sql
-- WRONG: with sales first in search_path, notes means sales.notes
SET search_path = sales, public;
SELECT body FROM notes WHERE id = 1;
```

```sql
-- FIX: name the schema
RESET search_path;
SELECT body FROM public.notes WHERE id = 1;
```

The wrong version returns `from sales` instead of `current note`, with no error at all. Write full names in scripts and application code.

Dropping a schema that still holds tables:

```sql
-- ERROR 2BP01: cannot drop schema sales because other objects depend on it
DROP SCHEMA sales;
```

```sql
DROP SCHEMA sales CASCADE;
SELECT nspname FROM pg_namespace WHERE nspname IN ('public', 'reporting', 'sales') ORDER BY nspname;
```

`DROP SCHEMA` is `RESTRICT` by default. `CASCADE` drops the schema along with the table `sales.notes` inside it; check carefully before running it.

## Practice

The database has table `public.notes`. Create schema `archive`, create a second `notes` table inside it, confirm that two tables with the same name live in two schemas, then see which databases the cluster holds; two questions follow.

## Recap

- A cluster holds databases, a database holds schemas, a schema holds tables; a connection sees one database.
- Queries cannot cross databases; data that must be JOINed belongs in schemas of one database.
- `CREATE DATABASE` cannot run inside a transaction; `current_database()` tells you where you are.
- `CREATE SCHEMA ... AUTHORIZATION` sets the owner; `DROP SCHEMA ... CASCADE` drops the contents too.
- A short name follows `search_path`, the first schema wins; write `schema.table` when you need certainty. One schema per tenant: `e-pg-l1-19`.
