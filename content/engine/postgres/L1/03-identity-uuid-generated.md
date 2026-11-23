---
id: e-pg-l1-03
engine: postgres
level: L1
module: ddl
title: Khóa tự sinh, UUID và cột sinh
title_en: Generated keys, UUIDs and generated columns
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Tạo khóa tăng dần bằng `GENERATED ALWAYS AS IDENTITY` thay vì tự quản lý số.
    en: Create an auto-increasing key with `GENERATED ALWAYS AS IDENTITY` instead of managing numbers yourself.
  - vi: Biết khi nào dùng `uuidv7()` (Postgres 18) và vì sao sequence có thể có lỗ hổng.
    en: Know when to use `uuidv7()` (Postgres 18) and why a sequence can have gaps.
  - vi: Khai báo cột sinh (generated column) và biết ở Postgres 18 nó mặc định là ảo (`VIRTUAL`).
    en: Declare a generated column and know that in Postgres 18 it is virtual (`VIRTUAL`) by default.
requires: [e-pg-l1-02]
sources:
  - https://www.postgresql.org/docs/18/ddl-identity-columns.html
  - https://www.postgresql.org/docs/18/functions-sequence.html
  - https://www.postgresql.org/docs/18/functions-uuid.html
  - https://www.postgresql.org/docs/18/ddl-generated-columns.html
lab:
  setup: |
    CREATE SEQUENCE invoice_no START 1000 INCREMENT 10;
  steps:
    - task:
        vi: "Tạo bảng `tickets`: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `public_id uuid NOT NULL DEFAULT uuidv7()`, `price numeric(10,2) NOT NULL`, `qty int NOT NULL`, và `total numeric(12,2)` là cột sinh bằng `price * qty` (dạng mặc định, VIRTUAL)."
        en: "Create table `tickets`: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `public_id uuid NOT NULL DEFAULT uuidv7()`, `price numeric(10,2) NOT NULL`, `qty int NOT NULL`, and `total numeric(12,2)` generated as `price * qty` (the default kind, VIRTUAL)."
      solution: CREATE TABLE tickets (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, public_id uuid NOT NULL DEFAULT uuidv7(), price numeric(10,2) NOT NULL, qty int NOT NULL, total numeric(12,2) GENERATED ALWAYS AS (price * qty))
      check: catalog
      hint:
        vi: "Cột tính sẵn viết `name type GENERATED ALWAYS AS (expression)`; biểu thức phải nằm trong ngoặc."
        en: "A generated column is `name type GENERATED ALWAYS AS (expression)`; the expression needs parentheses."
    - task:
        vi: "Thêm hai vé (giá 9.50, số lượng 2) và (giá 4.00, số lượng 3), trả về `price, qty, total`."
        en: "Insert two tickets (price 9.50, qty 2) and (price 4.00, qty 3), returning `price, qty, total`."
      solution: INSERT INTO tickets (price, qty) VALUES (9.50, 2), (4.00, 3) RETURNING price, qty, total
      check: rows
      hint:
        vi: "Chỉ ghi `price` và `qty`; `id`, `public_id` và `total` do Postgres điền."
        en: "Give only `price` and `qty`; Postgres fills `id`, `public_id` and `total`."
    - task:
        vi: "Tìm các cột sinh của bảng `tickets` trong `pg_attribute`: trả về `attname` và `attgenerated`."
        en: "Find the generated columns of table `tickets` in `pg_attribute`: return `attname` and `attgenerated`."
      solution: SELECT attname, attgenerated FROM pg_attribute WHERE attrelid = 'tickets'::regclass AND attgenerated <> ''
      check: rows
      hint:
        vi: "Cột không tính sẵn có `attgenerated` rỗng. `v` là ảo, `s` là lưu sẵn."
        en: "Ordinary columns have an empty `attgenerated`. `v` means virtual, `s` means stored."
---
## Ý chính

Identity. `GENERATED ALWAYS AS IDENTITY` gắn một sequence vào cột: mỗi `INSERT` lấy số kế tiếp. `ALWAYS` cấm ghi tay (trừ khi dùng `OVERRIDING SYSTEM VALUE`); `BY DEFAULT` thì cho phép; cả hai thay cho `serial` cũ.

Sequence có lỗ: `nextval()` không bao giờ được hoàn lại, kể cả khi `ROLLBACK`, nên số có thể nhảy (1, 2, 5...). Đừng dùng id làm số hóa đơn pháp lý không được thiếu số.

UUID. `uuid` (16 byte) sinh được ở bất cứ đâu, hợp cho id công khai. `gen_random_uuid()` (bản 4) ngẫu nhiên. `uuidv7()` (Postgres 18) bắt đầu bằng thời điểm tạo, nên giá trị mới nằm cuối index (chỉ mục) B-tree, ít xáo trộn trang hơn.

Cột sinh (generated column). `GENERATED ALWAYS AS (...)` luôn tính từ các cột khác: `STORED` tính khi ghi và chiếm chỗ, `VIRTUAL` tính khi đọc. Từ Postgres 18, không ghi gì thì là `VIRTUAL`.

## Ví dụ

```sql
SELECT nextval('invoice_no') AS first_no, nextval('invoice_no') AS second_no;
```

Kết quả: 1000 và 1010 (bắt đầu từ 1000, bước 10).

```sql
-- ERROR: cannot insert a non-DEFAULT value into column "id"
CREATE TABLE demo (id int GENERATED ALWAYS AS IDENTITY, v text);
INSERT INTO demo (id, v) VALUES (7, 'x');
```

## Thực hành

Database có sẵn sequence `invoice_no`. Tạo bảng `tickets` với khóa identity, id công khai `uuidv7()` và cột sinh `total`, rồi kiểm tra loại của cột sinh trong catalog.

# EN

## Key idea

Identity. `GENERATED ALWAYS AS IDENTITY` attaches a sequence to the column: every `INSERT` takes the next number. `ALWAYS` forbids writing it by hand (unless you use `OVERRIDING SYSTEM VALUE`); `BY DEFAULT` allows it; both replace the older `serial`.

Sequences have gaps: `nextval()` is never given back, even on `ROLLBACK`, so numbers can jump (1, 2, 5...). Never use an id as a legal invoice number that may not skip.

UUID. A `uuid` (16 bytes) can be generated anywhere, which suits public ids. `gen_random_uuid()` (version 4) is random. `uuidv7()` (Postgres 18) starts with the creation time, so new values land at the end of a B-tree index and disturb fewer pages.

Generated columns. `GENERATED ALWAYS AS (...)` is always computed from other columns: `STORED` is computed on write and takes space, `VIRTUAL` on read. Since Postgres 18, the default is `VIRTUAL`.

## Example

```sql
SELECT nextval('invoice_no') AS first_no, nextval('invoice_no') AS second_no;
```

Result: 1000 and 1010 (starts at 1000, step 10).

```sql
-- ERROR: cannot insert a non-DEFAULT value into column "id"
CREATE TABLE demo (id int GENERATED ALWAYS AS IDENTITY, v text);
INSERT INTO demo (id, v) VALUES (7, 'x');
```

## Practice

The database already has sequence `invoice_no`. Create table `tickets` with an identity key, a `uuidv7()` public id and a generated `total` column, then check the generated column's kind in the catalog.
