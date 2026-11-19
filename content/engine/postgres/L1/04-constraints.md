---
id: e-pg-l1-04
engine: postgres
level: L1
module: constraints
title: Ràng buộc và khóa
title_en: Constraints and keys
kind: lab
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Thêm `CHECK`, khóa ngoại và `UNIQUE` vào bảng đã có dữ liệu, để database tự chặn dữ liệu sai.
    en: Add `CHECK`, foreign key and `UNIQUE` constraints to a table that already holds data, so the database itself rejects bad data.
  - vi: Biết `UNIQUE` mặc định cho phép nhiều NULL, và `NULLS NOT DISTINCT` đổi điều đó.
    en: Know that `UNIQUE` allows several NULLs by default, and that `NULLS NOT DISTINCT` changes this.
requires: [e-pg-l1-03]
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/release-18.html
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, email text);
    INSERT INTO customers VALUES (1, 'an@example.com'), (2, 'binh@example.com'), (3, NULL);
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL, qty int NOT NULL);
    INSERT INTO orders VALUES (10, 1, 2), (11, 1, 1), (12, 2, 5), (13, 3, 1);
  steps:
    - task:
        vi: Thêm ràng buộc tên `orders_qty_positive` bắt `qty` của `orders` phải lớn hơn 0.
        en: Add a constraint named `orders_qty_positive` requiring `qty` in `orders` to be greater than 0.
      solution: ALTER TABLE orders ADD CONSTRAINT orders_qty_positive CHECK (qty > 0)
      check: catalog
      hint:
        vi: "`ALTER TABLE table ADD CONSTRAINT name CHECK (condition)`."
        en: "`ALTER TABLE table ADD CONSTRAINT name CHECK (condition)`."
    - task:
        vi: Thêm khóa ngoại tên `orders_customer_fk` để `orders.customer_id` phải trỏ tới một `customers.id` có thật.
        en: Add a foreign key named `orders_customer_fk` so that `orders.customer_id` must point to an existing `customers.id`.
      solution: ALTER TABLE orders ADD CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id)
      check: catalog
      hint:
        vi: "`... ADD CONSTRAINT name FOREIGN KEY (col) REFERENCES parent (col)`."
        en: "`... ADD CONSTRAINT name FOREIGN KEY (col) REFERENCES parent (col)`."
    - task:
        vi: Thêm ràng buộc tên `customers_email_key` để `email` không trùng, và chỉ cho phép tối đa một khách không có email.
        en: Add a constraint named `customers_email_key` so `email` is never duplicated and at most one customer may have no email.
      solution: ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE NULLS NOT DISTINCT (email)
      check: catalog
      hint:
        vi: "`UNIQUE` thường coi mọi NULL là khác nhau. Thêm `NULLS NOT DISTINCT` ngay sau `UNIQUE`."
        en: "Plain `UNIQUE` treats every NULL as different. Add `NULLS NOT DISTINCT` right after `UNIQUE`."
    - task:
        vi: Liệt kê tên và loại (`contype`) của mọi ràng buộc trên bảng `orders`, sắp theo tên.
        en: List the name and type (`contype`) of every constraint on table `orders`, ordered by name.
      solution: SELECT conname, contype FROM pg_constraint WHERE conrelid = 'orders'::regclass ORDER BY conname
      check: rows
      ordered: true
      hint:
        vi: "Bảng catalog `pg_constraint`, lọc `conrelid = 'orders'::regclass`."
        en: "Catalog table `pg_constraint`, filter `conrelid = 'orders'::regclass`."
---
## Ý chính

Ràng buộc là luật mà database tự kiểm ở mỗi lần ghi, nên dữ liệu sai không lọt vào dù ứng dụng nào ghi:

- `NOT NULL`: phải có giá trị.
- `CHECK (...)`: điều kiện phải đúng (hoặc NULL) với mỗi dòng.
- `UNIQUE`: không hai dòng nào trùng. Postgres tạo một index unique để kiểm.
- `PRIMARY KEY`: `UNIQUE` + `NOT NULL`; mỗi bảng tối đa một.
- `FOREIGN KEY ... REFERENCES`: giá trị phải có ở bảng cha. Mặc định không cho xóa dòng cha còn dòng con trỏ tới; `ON DELETE CASCADE` thì xóa theo.

Thêm ràng buộc vào bảng đã có dữ liệu bằng `ALTER TABLE ... ADD CONSTRAINT`. Postgres kiểm mọi dòng hiện có; một dòng vi phạm là cả lệnh thất bại.

NULL và UNIQUE: mặc định hai NULL được coi là khác nhau, nên cột `UNIQUE` chứa được nhiều NULL. Từ PostgreSQL 15, `UNIQUE NULLS NOT DISTINCT` coi mọi NULL là bằng nhau, nên chỉ còn một NULL.

Trong `pg_constraint`, cột `contype` là `c` (check), `f` (foreign key), `p` (primary key), `u` (unique) và `n` (not null: từ Postgres 18, mỗi `NOT NULL` cũng là một dòng trong `pg_constraint`).

## Ví dụ

```sql
-- ERROR: violates check constraint
CREATE TABLE t (n int CHECK (n > 0));
INSERT INTO t VALUES (-1);
```

```sql
CREATE TABLE u (code text UNIQUE);
INSERT INTO u VALUES (NULL), (NULL);
SELECT count(*) FROM u;
```

Kết quả là 2: hai NULL cùng nằm trong cột `UNIQUE`.

## Thực hành

Bảng `customers` và `orders` đã có dữ liệu hợp lệ, nhưng chưa có luật nào ngoài khóa chính. Thêm ba ràng buộc rồi đọc chúng từ catalog.

# EN

## Key idea

Constraints are rules the database checks itself on every write, so bad data cannot get in no matter which application writes it:

- `NOT NULL`: a value is required.
- `CHECK (...)`: the condition must be true (or NULL) for each row.
- `UNIQUE`: no two rows may match. Postgres creates a unique index to enforce it.
- `PRIMARY KEY`: `UNIQUE` + `NOT NULL`; at most one per table.
- `FOREIGN KEY ... REFERENCES`: the value must exist in the parent table. By default you cannot delete a parent row that child rows still point to; `ON DELETE CASCADE` deletes them too.

Add a constraint to a table that already has data with `ALTER TABLE ... ADD CONSTRAINT`. Postgres checks every existing row; one violating row makes the whole command fail.

NULL and UNIQUE: by default two NULLs count as different, so a `UNIQUE` column can hold many NULLs. Since PostgreSQL 15, `UNIQUE NULLS NOT DISTINCT` treats all NULLs as equal, so only one NULL is allowed.

In `pg_constraint`, column `contype` is `c` (check), `f` (foreign key), `p` (primary key), `u` (unique) and `n` (not null: since Postgres 18, every `NOT NULL` is also a row in `pg_constraint`).

## Example

```sql
-- ERROR: violates check constraint
CREATE TABLE t (n int CHECK (n > 0));
INSERT INTO t VALUES (-1);
```

```sql
CREATE TABLE u (code text UNIQUE);
INSERT INTO u VALUES (NULL), (NULL);
SELECT count(*) FROM u;
```

The result is 2: both NULLs sit in the `UNIQUE` column.

## Practice

Tables `customers` and `orders` already hold valid data but have no rules besides their primary keys. Add three constraints, then read them from the catalog.
