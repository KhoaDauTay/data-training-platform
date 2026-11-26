---
id: e-pg-l1-19
engine: postgres
level: L1
module: schemas
title: "Mỗi khách một schema"
title_en: "One schema per tenant"
kind: lab
runtime: browser
minutes: 15
figures: [{ name: pg-tenancy-models, at: idea, step: 2 }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Tạo một schema cho mỗi khách với cùng bộ bảng, và chọn khách bằng `search_path` hoặc tên đầy đủ", en: "Create one schema per tenant with the same set of tables, and pick the tenant with `search_path` or the full name" }
  - { vi: "Đổi cấu trúc ở mọi schema của khách và tìm schema bị sót (lệch phiên bản)", en: "Change the structure in every tenant schema and find the schemas that were missed (drift)" }
  - { vi: "Biết giá của mô hình này khi số khách lớn: catalog phình, đổi cấu trúc N lần, `search_path` là trạng thái của phiên", en: "Know the price of this model when tenants are many: a growing catalog, N migrations, `search_path` as session state" }
requires: [e-pg-l1-06]
sources:
  - url: https://www.postgresql.org/docs/18/ddl-schemas.html
    title: "Schemas"
  - url: https://www.postgresql.org/docs/18/sql-createschema.html
    title: "CREATE SCHEMA"
  - url: https://www.postgresql.org/docs/18/infoschema-columns.html
    title: "information_schema.columns"
lab:
  setup: |
    -- Lantern Market: each seller gets its own schema with the same tables
    CREATE SCHEMA seller_1;
    CREATE SCHEMA seller_2;
    CREATE TABLE seller_1.products (id int PRIMARY KEY, name text NOT NULL, price int NOT NULL);
    CREATE TABLE seller_2.products (id int PRIMARY KEY, name text NOT NULL, price int NOT NULL);
    INSERT INTO seller_1.products SELECT g, 'lantern ' || g, g * 1000 FROM generate_series(1, 6) g;
    INSERT INTO seller_2.products SELECT g, 'kite ' || g, g * 500 FROM generate_series(1, 4) g;
  steps:
    - task: { vi: "Người bán số 3 vừa mở cửa hàng. Tạo schema `seller_3` cho họ. Chấm bằng catalog.", en: "Seller 3 just opened a shop. Create schema `seller_3` for them. Graded on the catalog." }
      solution: "CREATE SCHEMA seller_3"
      check: catalog
      hint: { vi: "`CREATE SCHEMA seller_3`.", en: "`CREATE SCHEMA seller_3`." }
    - task: { vi: "Tạo bảng `seller_3.products` giống hệt bảng của người bán 1: id int khóa chính, name text NOT NULL, price int NOT NULL. Chấm bằng catalog.", en: "Create table `seller_3.products` exactly like seller 1's: id int primary key, name text NOT NULL, price int NOT NULL. Graded on the catalog." }
      solution: "CREATE TABLE seller_3.products (id int PRIMARY KEY, name text NOT NULL, price int NOT NULL)"
      check: catalog
      hint: { vi: "Ghi tên đầy đủ `seller_3.products` để bảng vào đúng schema.", en: "Write the full name `seller_3.products` so the table lands in the right schema." }
    - task: { vi: "Đợt đổi cấu trúc mới: thêm cột `stock int NOT NULL DEFAULT 0`. Bắt đầu với người bán 1. Chấm bằng catalog.", en: "A new migration: add column `stock int NOT NULL DEFAULT 0`. Start with seller 1. Graded on the catalog." }
      solution: "ALTER TABLE seller_1.products ADD COLUMN stock int NOT NULL DEFAULT 0"
      check: catalog
      hint: { vi: "`ALTER TABLE seller_1.products ADD COLUMN …`.", en: "`ALTER TABLE seller_1.products ADD COLUMN …`." }
    - task: { vi: "Kiểm lệch: mỗi schema người bán (tên khớp `^seller_[0-9]+$`) một dòng, hai cột tenant_schema và has_stock (bảng `products` của nó đã có cột `stock` chưa). Đọc `pg_namespace` và `information_schema.columns`. Sắp theo tenant_schema.", en: "Check for drift: one row per seller schema (name matching `^seller_[0-9]+$`), two columns tenant_schema and has_stock (whether its `products` table has column `stock` yet). Read `pg_namespace` and `information_schema.columns`. Order by tenant_schema." }
      solution: "SELECT n.nspname::text AS tenant_schema, EXISTS (SELECT FROM information_schema.columns c WHERE c.table_schema = n.nspname AND c.table_name = 'products' AND c.column_name = 'stock') AS has_stock FROM pg_namespace n WHERE n.nspname ~ '^seller_[0-9]+$' ORDER BY 1"
      check: rows
      ordered: true
      hint: { vi: "Lọc `pg_namespace` bằng `~ '^seller_[0-9]+$'`, rồi `EXISTS (SELECT FROM information_schema.columns …)`.", en: "Filter `pg_namespace` with `~ '^seller_[0-9]+$'`, then `EXISTS (SELECT FROM information_schema.columns …)`." }
      fact:
        vi: "Chỉ `seller_1` có cột mới; `seller_2` và `seller_3` bị sót. Đổi cấu trúc trên N schema là N lệnh, và cần một câu như thế này để biết chỗ nào chưa chạy."
        en: "Only `seller_1` has the new column; `seller_2` and `seller_3` were missed. A migration over N schemas is N statements, and you need a query like this one to know where it has not run."
        probe: SELECT count(*) FILTER (WHERE c.column_name IS NULL) FROM pg_namespace n LEFT JOIN information_schema.columns c ON c.table_schema = n.nspname AND c.table_name = 'products' AND c.column_name = 'stock' WHERE n.nspname ~ '^seller_[0-9]+$'
        expect: [[2]]
quiz:
  - q: { vi: "Mỗi khách một schema, mỗi schema 40 bảng. Ở 500 khách, điều gì thường hỏng trước?", en: "One schema per tenant, 40 tables each. At 500 tenants, what usually breaks first?" }
    options:
      - { vi: "Không gì: schema rẻ, thêm bao nhiêu cũng được", en: "Nothing: schemas are cheap, add as many as you like" }
      - { vi: "Catalog phình ra: 20.000 bảng, mỗi đợt đổi cấu trúc chạy 500 lần", en: "The catalog swells: 20,000 tables, every migration run 500 times" }
      - { vi: "Postgres từ chối tạo quá 100 schema trong một database", en: "Postgres refuses more than 100 schemas in one database" }
    answer: 1
    trap: 0
    why: { vi: "\"Không gì\" nghe hợp lý vì một schema chỉ là một tên, nhưng mỗi bảng, index và sequence trong đó là một đối tượng thật trong catalog (bảng hệ thống mô tả mọi đối tượng). 500 khách (tenant) × 40 bảng = 20.000 bảng làm catalog, bộ nhớ đệm của planner và `pg_dump` nặng dần. Mỗi đợt đổi cấu trúc phải chạy 500 lần, nên sót một khách là chuyện thường. Postgres không giới hạn 100 schema; cái hỏng trước là vận hành. Mô hình này hợp với vài chục khách cần tùy biến riêng.", en: "\"Nothing\" sounds right because a schema is only a name, but every table, index and sequence in it is a real object in the catalog (the system tables that describe every object). 500 tenants × 40 tables = 20,000 tables make the catalog, the planner's caches and `pg_dump` heavier. Every migration must run 500 times, so missing a tenant is common. Postgres has no 100-schema limit; what breaks first is operations. This model suits a few dozen tenants that need their own customisation." }
  - q: { vi: "Ứng dụng đặt `SET search_path = seller_1` khi phục vụ người bán 1, rồi trả kết nối về pool. Yêu cầu sau của người bán 2 chạy `SELECT * FROM products` mà quên đặt lại. Nó đọc gì?", en: "The application sets `SET search_path = seller_1` while serving seller 1, then returns the connection to the pool. Seller 2's next request runs `SELECT * FROM products` and forgets to set it again. What does it read?" }
    options:
      - { vi: "Sản phẩm của người bán 2: Postgres biết ai đang hỏi", en: "Seller 2's products: Postgres knows who is asking" }
      - { vi: "Sản phẩm của người bán 1: `search_path` ở lại trên kết nối", en: "Seller 1's products: `search_path` stays on the connection" }
      - { vi: "Lỗi 42P01: không tìm thấy bảng products", en: "Error 42P01: table products not found" }
    answer: 1
    trap: 0
    why: { vi: "\"Sản phẩm của người bán 2\" nghe hợp lý vì mỗi khách (tenant) có schema riêng, nhưng database không biết khách nào đang hỏi: nó chỉ đọc `search_path` của phiên. Pool giữ kết nối sống, nên `search_path = seller_1` còn nguyên, và `products` tìm thấy `seller_1.products`: không lỗi 42P01, mà lộ dữ liệu người bán 1. Đặt nó theo transaction (`SET LOCAL`, tự hết khi transaction kết thúc) hoặc ghi tên đầy đủ `seller_2.products`. Cùng bẫy này với thiết lập khách ở `e-pg-l5-20`.", en: "\"Seller 2's products\" sounds right because each tenant has its own schema, but the database does not know which tenant is asking: it only reads the session's `search_path`. The pool keeps the connection alive, so `search_path = seller_1` is still set and `products` finds `seller_1.products`: no 42P01 error, but seller 1's data leaks. Set it per transaction (`SET LOCAL`, which ends with the transaction) or write the full name `seller_2.products`. It is the same trap as the tenant setting in `e-pg-l5-20`." }
---
## Mở bài

Chợ Lồng Đèn cho mỗi người bán một schema riêng với cùng bộ bảng: tách bạch, dễ hiểu, dễ xóa. Đến lần đổi cấu trúc thứ ba, một nửa số cửa hàng có cột mới và nửa kia thì không. Bài này dựng mô hình đó và tìm chỗ bị sót.

## Ý chính

Mỗi khách một schema (`seller_1.products`, `seller_2.products`…) trong cùng một database: cùng câu SQL, khác khách nhờ `search_path` hoặc tên đầy đủ. Quyền cấp theo schema, và xóa một khách là `DROP SCHEMA … CASCADE`.

Nhiều người nghĩ mô hình này mở rộng thoải mái như dùng chung bảng. Thật ra mỗi bảng, index và sequence của mỗi khách là một đối tượng thật trong catalog: 500 khách × 40 bảng là 20.000 bảng chưa kể index, và catalog, sao lưu, đổi cấu trúc đều chậm theo. Mỗi đợt đổi cấu trúc phải chạy một lần cho mỗi schema, nên cần một bảng ghi phiên bản và một câu kiểm lệch để biết schema nào bị sót.

`search_path` là trạng thái của phiên, giống thiết lập khách ở `e-pg-l5-20`: một yêu cầu quên đặt lại sẽ đọc schema của khách trước. Mô hình này hợp với vài chục khách cần tùy biến riêng; nhiều khách nhỏ giống nhau thì dùng chung bảng với cột `tenant_id`.

Hình từng bước ở cuối mục này so ba cách chia khách; nó mở ở bước schema riêng cho mỗi khách, cách của bài này.

## Cú pháp

```sql
CREATE SCHEMA seller_3;
CREATE TABLE seller_3.products (…);
SET search_path = seller_3;
SELECT … FROM products;
DROP SCHEMA seller_3 CASCADE;
```

- Tên đầy đủ `schema.table` luôn trúng đúng bảng.
- `search_path`: danh sách schema Postgres tìm khi tên không có schema.
- `DROP SCHEMA … CASCADE`: xóa schema và mọi thứ bên trong.

## Ví dụ

Cùng một câu, hai khách, đổi bằng `search_path`:

```sql
SET search_path = seller_2;
SELECT count(*) AS products
FROM products;
RESET search_path;
```

```sql
SET search_path = seller_1;
SELECT count(*) AS products
FROM products;
RESET search_path;
```

Đổi cấu trúc mọi schema bằng một vòng lặp, ghi phiên bản cho từng khách. Vòng `DO` và `format('%I')` được dạy kỹ ở `e-pg-l2-19`; ở đây chỉ cần đọc:

```sql
CREATE TABLE public.schema_version (
  tenant_schema text PRIMARY KEY,
  version int NOT NULL);
DO $$
DECLARE s text;
BEGIN
  FOR s IN SELECT nspname
    FROM pg_namespace
    WHERE nspname ~ '^seller_[0-9]+$'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.products
       ADD COLUMN IF NOT EXISTS
       note text', s);
    INSERT INTO public.schema_version
      VALUES (s, 2)
      ON CONFLICT (tenant_schema)
      DO UPDATE SET version = 2;
  END LOOP;
END $$;
SELECT * FROM public.schema_version
ORDER BY tenant_schema;
```

Catalog lớn theo số khách:

```sql
SELECT n.nspname::text AS tenant_schema,
  count(*) AS relations
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
WHERE n.nspname ~ '^seller_[0-9]+$'
GROUP BY 1 ORDER BY 1;
```

Mỗi khách đã có bảng, khóa chính và bảng TOAST; nhân với số khách là thấy giá.

## Lỗi hay gặp

Phiên vẫn giữ `search_path` của khách trước:

```sql
-- WRONG: seller 1's path left behind
SET search_path = seller_1;
SELECT count(*) AS products
FROM products;
```

```sql
-- FIX: name the schema
SELECT count(*) AS products
FROM seller_2.products;
```

Câu sai trả 6 (của người bán 1), câu đúng trả 4. `search_path` không có schema nào chứa bảng:

```sql
SET search_path = public;
-- ERROR 42P01
SELECT count(*) FROM products;
```

Ở đây lỗi còn là may: một `search_path` sai mà vẫn trúng bảng của khách khác thì không báo gì.

## Thực hành

Bốn bước: mở schema cho người bán 3, tạo bảng của họ, đổi cấu trúc cho người bán 1, rồi kiểm schema nào chưa có cột mới. Schema và cột của mọi schema đều được đọc từ catalog.

## Tóm tắt

- Mỗi khách một schema: cùng bảng, khác tên schema; chọn bằng tên đầy đủ hoặc `search_path`.
- Đổi cấu trúc chạy N lần; ghi phiên bản cho từng schema và kiểm lệch bằng catalog.
- `search_path` là trạng thái của phiên: qua pool nó rò sang yêu cầu sau.
- Hợp với vài chục khách cần tùy biến; nhiều khách nhỏ thì dùng chung bảng. Đọc tiếp: `e-pg-l5-20`, `e-ds-l4-09`.

# EN

## Opening

Lantern Market gives each seller a schema of its own with the same set of tables: separate, easy to understand, easy to delete. By the third migration, half the shops have the new column and the other half do not. This lesson builds that model and finds what was missed.

## Key idea

One schema per tenant (`seller_1.products`, `seller_2.products`…) inside one database: the same SQL, a different tenant through `search_path` or the full name. Rights are granted per schema, and deleting a tenant is `DROP SCHEMA … CASCADE`.

Many people think this model scales as easily as shared tables. In fact every table, index and sequence of every tenant is a real catalog object: 500 tenants × 40 tables is 20,000 tables before indexes, and the catalog, backups and migrations all slow down with it. Every migration has to run once per schema, so you need a version table and a drift query to know which schema was missed.

`search_path` is session state, like the tenant setting in `e-pg-l5-20`: a request that forgets to reset it reads the previous tenant's schema. This model suits a few dozen tenants that need their own customisation; many small, similar tenants share tables with a `tenant_id` column.

The step-through figure at the end of this section compares the three ways to split tenants; it opens on the schema-per-tenant step, this lesson's way.

## Syntax

```sql
CREATE SCHEMA seller_3;
CREATE TABLE seller_3.products (…);
SET search_path = seller_3;
SELECT … FROM products;
DROP SCHEMA seller_3 CASCADE;
```

- The full name `schema.table` always hits the right table.
- `search_path`: the list of schemas Postgres searches when a name has no schema.
- `DROP SCHEMA … CASCADE`: drops the schema and everything in it.

## Example

The same query, two tenants, switched with `search_path`:

```sql
SET search_path = seller_2;
SELECT count(*) AS products
FROM products;
RESET search_path;
```

```sql
SET search_path = seller_1;
SELECT count(*) AS products
FROM products;
RESET search_path;
```

Migrating every schema with a loop, recording the version per tenant. The `DO` loop and `format('%I')` are taught in `e-pg-l2-19`; here you only read it:

```sql
CREATE TABLE public.schema_version (
  tenant_schema text PRIMARY KEY,
  version int NOT NULL);
DO $$
DECLARE s text;
BEGIN
  FOR s IN SELECT nspname
    FROM pg_namespace
    WHERE nspname ~ '^seller_[0-9]+$'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.products
       ADD COLUMN IF NOT EXISTS
       note text', s);
    INSERT INTO public.schema_version
      VALUES (s, 2)
      ON CONFLICT (tenant_schema)
      DO UPDATE SET version = 2;
  END LOOP;
END $$;
SELECT * FROM public.schema_version
ORDER BY tenant_schema;
```

The catalog grows with the tenants:

```sql
SELECT n.nspname::text AS tenant_schema,
  count(*) AS relations
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
WHERE n.nspname ~ '^seller_[0-9]+$'
GROUP BY 1 ORDER BY 1;
```

Each tenant already has a table, a primary key and a TOAST table; multiply by the tenants to see the price.

## Common mistakes

The session still holds the previous tenant's `search_path`:

```sql
-- WRONG: seller 1's path left behind
SET search_path = seller_1;
SELECT count(*) AS products
FROM products;
```

```sql
-- FIX: name the schema
SELECT count(*) AS products
FROM seller_2.products;
```

The wrong one returns 6 (seller 1's), the right one 4. A `search_path` with no schema holding the table:

```sql
SET search_path = public;
-- ERROR 42P01
SELECT count(*) FROM products;
```

Here the error is the lucky case: a wrong `search_path` that still hits another tenant's table reports nothing.

## Practice

Four steps: open a schema for seller 3, create their table, migrate seller 1, then check which schemas lack the new column. Every schema and its columns are read from the catalog.

## Recap

- One schema per tenant: the same tables, a different schema name; pick it by full name or `search_path`.
- A migration runs N times; record the version per schema and check drift in the catalog.
- `search_path` is session state: through a pool it leaks into the next request.
- It suits a few dozen tenants that need customisation; many small ones share tables. Read next: `e-pg-l5-20`, `e-ds-l4-09`.
