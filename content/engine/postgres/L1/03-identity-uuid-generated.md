---
id: e-pg-l1-03
engine: postgres
level: L1
module: types
title: Khóa tự sinh, UUID và cột tính sẵn
title_en: Generated keys, UUIDs and generated columns
kind: lab
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Tạo khóa tăng dần bằng `GENERATED ALWAYS AS IDENTITY` thay vì tự quản lý số.
    en: Create an auto-increasing key with `GENERATED ALWAYS AS IDENTITY` instead of managing numbers yourself.
  - vi: Biết khi nào dùng `uuidv7()` (Postgres 18) và vì sao sequence có thể có lỗ hổng.
    en: Know when to use `uuidv7()` (Postgres 18) and why a sequence can have gaps.
  - vi: Khai báo cột tính sẵn và biết ở Postgres 18 nó mặc định là ảo (`VIRTUAL`).
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
        vi: "Tạo bảng `tickets`: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `public_id uuid NOT NULL DEFAULT uuidv7()`, `price numeric(10,2) NOT NULL`, `qty int NOT NULL`, và `total numeric(12,2)` là cột tính sẵn bằng `price * qty`."
        en: "Create table `tickets`: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `public_id uuid NOT NULL DEFAULT uuidv7()`, `price numeric(10,2) NOT NULL`, `qty int NOT NULL`, and `total numeric(12,2)` generated as `price * qty`."
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
        vi: "Tìm trong `pg_attribute` các cột tính sẵn của bảng `tickets`: trả về `attname` và `attgenerated`."
        en: "Find the generated columns of table `tickets` in `pg_attribute`: return `attname` and `attgenerated`."
      solution: SELECT attname, attgenerated FROM pg_attribute WHERE attrelid = 'tickets'::regclass AND attgenerated <> ''
      check: rows
      hint:
        vi: "Cột không tính sẵn có `attgenerated` rỗng. `v` là ảo, `s` là lưu sẵn."
        en: "Ordinary columns have an empty `attgenerated`. `v` means virtual, `s` means stored."
---
## Ý chính

Identity. `GENERATED ALWAYS AS IDENTITY` gắn một sequence vào cột: mỗi `INSERT` lấy số kế tiếp. `ALWAYS` cấm ghi tay vào cột (trừ khi dùng `OVERRIDING SYSTEM VALUE`); `BY DEFAULT` thì cho phép. Đây là cách chuẩn SQL, thay cho `serial` cũ.

Sequence có lỗ. `nextval()` không bao giờ bị hoàn lại, kể cả khi transaction `ROLLBACK`. Vì thế số có thể nhảy (1, 2, 5...). Đừng dùng id làm "số thứ tự không được thiếu" như số hóa đơn pháp lý.

UUID. `uuid` là 16 byte, sinh được ở bất cứ đâu mà không cần hỏi database, hợp cho id công khai hoặc hệ thống nhiều nơi ghi. `gen_random_uuid()` (bản 4) hoàn toàn ngẫu nhiên. Postgres 18 thêm `uuidv7()`: phần đầu là thời điểm tạo, nên giá trị mới luôn ở cuối index B-tree, ít làm xáo trộn trang hơn bản ngẫu nhiên.

Cột tính sẵn. `GENERATED ALWAYS AS (...)` luôn tính từ các cột khác, không ghi tay được. Có hai loại: `STORED` (tính khi ghi, chiếm chỗ) và `VIRTUAL` (tính khi đọc, không chiếm chỗ). Từ Postgres 18, không ghi gì thì là `VIRTUAL`.

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

Database có sẵn sequence `invoice_no`. Tạo bảng `tickets` với khóa identity, id công khai `uuidv7()` và cột `total` tính sẵn, rồi kiểm tra loại của cột tính sẵn trong catalog.

# EN

## Key idea

Identity. `GENERATED ALWAYS AS IDENTITY` attaches a sequence to the column: every `INSERT` takes the next number. `ALWAYS` forbids writing the column by hand (unless you use `OVERRIDING SYSTEM VALUE`); `BY DEFAULT` allows it. This is the SQL-standard way and replaces the older `serial`.

Sequences have gaps. `nextval()` is never given back, even when the transaction does `ROLLBACK`. Numbers can therefore jump (1, 2, 5...). Do not use an id as a "no number may be missing" counter such as a legal invoice number.

UUID. A `uuid` is 16 bytes and can be generated anywhere without asking the database, which suits public ids or systems with many writers. `gen_random_uuid()` (version 4) is fully random. Postgres 18 adds `uuidv7()`: its first part is the creation time, so new values always land at the end of a B-tree index and disturb fewer pages than random ones.

Generated columns. `GENERATED ALWAYS AS (...)` is always computed from other columns and cannot be written by hand. There are two kinds: `STORED` (computed on write, takes space) and `VIRTUAL` (computed on read, takes no space). Since Postgres 18, the default is `VIRTUAL`.

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
