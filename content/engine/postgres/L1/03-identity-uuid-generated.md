---
id: e-pg-l1-03
engine: postgres
level: L1
module: ddl
title: Khóa tự sinh, UUID và cột sinh
title_en: Generated keys, UUIDs and generated columns
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
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
  - https://www.postgresql.org/docs/18/sql-createtable.html
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
        vi: "Cột sinh (generated column) viết `name type GENERATED ALWAYS AS (expression)`; biểu thức phải nằm trong ngoặc."
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
        vi: "Cột thường (không phải cột sinh) có `attgenerated` rỗng. `v` là cột sinh VIRTUAL, `s` là cột sinh STORED."
        en: "Ordinary (non-generated) columns have an empty `attgenerated`. `v` is a VIRTUAL generated column, `s` a STORED one."
quiz:
  - q:
      vi: "Bảng `orders` có khóa identity. Đơn 1 được ghi, đơn 2 nằm trong một transaction bị `ROLLBACK`, rồi đơn 3 được ghi. Đơn 3 nhận `id` nào?"
      en: "Table `orders` has an identity key. Order 1 is written, order 2 sits in a transaction ended by `ROLLBACK`, then order 3 is written. Which `id` does order 3 get?"
    options:
      - { vi: "2, vì số của transaction bị hủy được trả lại", en: "2, because the cancelled transaction's number is given back" }
      - { vi: "3, vì `nextval()` không bao giờ được hoàn lại", en: "3, because `nextval()` is never given back" }
      - { vi: "Báo lỗi vì sequence bị hỏng", en: "An error, because the sequence is broken" }
    answer: 1
    trap: 0
    why:
      vi: "\"Số 2 được trả lại\" nghe hợp lý vì `ROLLBACK` hủy mọi thứ transaction đã làm, nhưng cột identity lấy số từ một sequence, và sequence nằm ngoài transaction. Đơn 2 đã gọi `nextval()` và lấy số 2; `ROLLBACK` xóa dòng nhưng không thu số lại, nên đơn 3 nhận 3. Postgres làm vậy để nhiều phiên lấy số cùng lúc mà không phải chờ nhau. Sequence không hỏng, chỉ có lỗ, nên đừng dùng `id` làm số hóa đơn bắt buộc liên tục."
      en: "\"Number 2 is given back\" sounds right because `ROLLBACK` undoes everything the transaction did, but an identity column takes its numbers from a sequence, and a sequence lives outside transactions. Order 2 called `nextval()` and took 2; `ROLLBACK` removes the row but does not take the number back, so order 3 gets 3. Postgres does this so many sessions can take numbers at once without waiting for each other. The sequence is not broken, it just has gaps, so do not use `id` as a gap-free invoice number."
  - q:
      vi: "Ở Postgres 18 bạn viết `total numeric GENERATED ALWAYS AS (price * qty)` mà không ghi `STORED` hay `VIRTUAL`. Cột này là loại nào?"
      en: "In Postgres 18 you write `total numeric GENERATED ALWAYS AS (price * qty)` without `STORED` or `VIRTUAL`. Which kind is the column?"
    options:
      - { vi: "`STORED`: tính khi ghi và lưu trên đĩa", en: "`STORED`: computed on write and kept on disk" }
      - { vi: "`VIRTUAL`: tính mỗi lần đọc, không chiếm chỗ", en: "`VIRTUAL`: computed on every read, takes no space" }
      - { vi: "Báo lỗi vì thiếu từ khóa", en: "An error, because a keyword is missing" }
    answer: 1
    trap: 0
    why:
      vi: "`STORED` nghe hợp lý vì từ Postgres 12 tới 17 cột sinh chỉ có loại `STORED`, nhưng Postgres 18 thêm `VIRTUAL` và lấy nó làm mặc định, nên bỏ từ khóa không gây lỗi. Bước 3 của lab cho thấy điều đó: catalog ghi `v` trong `attgenerated`. Cột `VIRTUAL` không đánh index được, nên cần index thì khai báo `STORED`."
      en: "`STORED` sounds right because from Postgres 12 to 17 generated columns could only be `STORED`, but Postgres 18 adds `VIRTUAL` and makes it the default, so leaving the keyword out is no error. Step 3 of the lab shows it: the catalog has `v` in `attgenerated`. A `VIRTUAL` column cannot be indexed, so declare it `STORED` if you need an index."
---
## Mở bài

Hai nhân viên cùng bấm "tạo đơn" trong một giây, và cả hai lấy `max(id) + 1` làm mã đơn mới: hai đơn trùng mã. Postgres có sẵn cách sinh khóa an toàn khi nhiều người ghi cùng lúc, cùng với UUID và cột tự tính. Bài này dùng cả ba.

## Ý chính

Identity. `GENERATED ALWAYS AS IDENTITY` gắn một sequence (bộ đếm) vào cột: mỗi `INSERT` lấy số kế tiếp bằng `nextval()`, an toàn khi nhiều phiên ghi cùng lúc. `ALWAYS` cấm ghi tay vào cột (trừ khi dùng `OVERRIDING SYSTEM VALUE`); `BY DEFAULT` cho phép ghi tay. Cả hai thay cho `serial` cũ, vốn chỉ là `integer` kèm `DEFAULT nextval(...)`.

Nhiều người nghĩ id do identity sinh luôn liên tục. Thật ra `nextval()` không bao giờ được hoàn lại, kể cả khi transaction bị `ROLLBACK` hay một `INSERT` lỗi, nên số có thể nhảy (1, 3, 4...). Vì vậy `max(id)` không phải là số dòng, và id không dùng làm số hóa đơn pháp lý cần liên tục. Với `BY DEFAULT`, một id ghi tay không làm bộ đếm tiến lên, nên lần sinh số sau có thể trùng nó.

UUID. `uuid` là 16 byte, sinh được ở bất cứ đâu mà không cần hỏi database, hợp cho id công khai (đường dẫn, API) không để lộ số lượng đơn. `gen_random_uuid()` sinh bản 4, hoàn toàn ngẫu nhiên. `uuidv7()` (mới ở Postgres 18) sinh bản 7, bắt đầu bằng thời điểm tạo, nên giá trị mới nằm cuối index (chỉ mục) B-tree, ít xáo trộn trang hơn bản 4.

Cột sinh (generated column). `GENERATED ALWAYS AS (expression)` luôn tính từ các cột khác của cùng dòng; không ai ghi tay được. `STORED` tính khi ghi và chiếm chỗ trên đĩa; `VIRTUAL` tính mỗi lần đọc và không chiếm chỗ. Từ Postgres 18, không ghi gì thì là `VIRTUAL`. Postgres 18 chưa cho đánh index trên cột `VIRTUAL`.

## Cú pháp

```sql
CREATE TABLE table_name (
  id bigint GENERATED { ALWAYS | BY DEFAULT } AS IDENTITY PRIMARY KEY,
  public_id uuid DEFAULT { uuidv7() | gen_random_uuid() },
  col type GENERATED ALWAYS AS ( expression ) [ STORED | VIRTUAL ]
);
INSERT INTO table_name ( column [, ...] ) [ OVERRIDING SYSTEM VALUE ] VALUES ( ... );
SELECT nextval('sequence_name');
```

- `ALWAYS`: cấm ghi tay; `BY DEFAULT`: cho ghi tay khi muốn.
- `OVERRIDING SYSTEM VALUE`: ép ghi tay vào cột `ALWAYS`, ví dụ khi chép dữ liệu cũ.
- `STORED` / `VIRTUAL`: lưu sẵn hay tính khi đọc; mặc định `VIRTUAL`.

## Ví dụ

Sequence `invoice_no` của lab bắt đầu ở 1000, bước 10:

```sql
SELECT nextval('invoice_no') AS first_no, nextval('invoice_no') AS second_no;
```

Kết quả là 1000 và 1010: mỗi lần gọi `nextval()` lấy một số mới.

Một identity bị hủy giữa chừng:

```sql
CREATE TABLE events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
INSERT INTO events (name) VALUES ('signup');
BEGIN;
INSERT INTO events (name) VALUES ('cancelled');
ROLLBACK;
INSERT INTO events (name) VALUES ('login') RETURNING id;
```

Dòng `login` nhận `id` 3, không phải 2: số 2 đã phát cho dòng bị hủy và không quay lại.

```sql
SELECT uuid_extract_version(gen_random_uuid()) AS v4,
       uuid_extract_version(uuidv7()) AS v7,
       uuid_extract_timestamp(uuidv7()) IS NOT NULL AS v7_has_time;
```

Hai hàm sinh UUID bản 4 và bản 7; chỉ bản 7 mang thời điểm tạo bên trong.

```sql
CREATE TABLE lines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty int NOT NULL,
  price numeric(10,2) NOT NULL,
  total_v numeric(12,2) GENERATED ALWAYS AS (qty * price),
  total_s numeric(12,2) GENERATED ALWAYS AS (qty * price) STORED
);
INSERT INTO lines (qty, price) VALUES (2, 9.50);
SELECT attname, attgenerated FROM pg_attribute
WHERE attrelid = 'lines'::regclass AND attgenerated <> '' ORDER BY attname;
```

`total_s` có `attgenerated` là `s` (lưu sẵn), `total_v` là `v` (ảo, vì không ghi gì). Cả hai đều đọc ra 19.00.

## Lỗi hay gặp

Ghi tay vào cột `ALWAYS`:

```sql
CREATE TABLE demo (id int GENERATED ALWAYS AS IDENTITY, v text);
-- ERROR 428C9: cannot insert a non-DEFAULT value into column "id"
INSERT INTO demo (id, v) VALUES (7, 'x');
```

Bỏ `id` khỏi `INSERT` để Postgres tự sinh; chỉ dùng `OVERRIDING SYSTEM VALUE` khi thật sự chép dữ liệu cũ.

Sửa tay một cột sinh:

```sql
-- ERROR 428C9: column "total_s" can only be updated to DEFAULT
UPDATE lines SET total_s = 0;
```

Cột sinh luôn đi theo biểu thức của nó; muốn đổi `total_s` thì sửa `qty` hoặc `price`.

Ghi tay vào `BY DEFAULT` rồi để Postgres sinh tiếp:

```sql
CREATE TABLE tags (id int GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, name text NOT NULL);
INSERT INTO tags VALUES (1, 'manual');
-- ERROR 23505: duplicate key value violates unique constraint "tags_pkey"
INSERT INTO tags (name) VALUES ('auto');
```

Số ghi tay không làm sequence tiến lên, nên lần sinh đầu vẫn là 1 và đụng khóa chính. Dùng `ALWAYS`, hoặc chỉnh sequence bằng `setval()` sau khi chép dữ liệu.

Đếm dòng bằng `max(id)`:

```sql
-- WRONG: max(id) counts the number lost to ROLLBACK
SELECT max(id) AS events_so_far FROM events;
```

```sql
-- FIX: count the rows
SELECT count(*) AS events_so_far FROM events;
```

Câu sai ra 3, câu sửa ra 2: bảng `events` chỉ có hai dòng, số 2 đã mất ở ví dụ trên.

## Thực hành

Database có sẵn sequence `invoice_no`. Tạo bảng `tickets` với khóa identity, id công khai `uuidv7()` và cột sinh `total`, thêm hai vé, rồi kiểm tra loại của cột sinh trong catalog; sau đó là hai câu hỏi.

## Tóm tắt

- Khóa tự tăng dùng `bigint GENERATED ALWAYS AS IDENTITY`; không tự tính `max(id) + 1`.
- Sequence có lỗ: số đã phát không quay lại khi `ROLLBACK`, nên `max(id)` không phải số dòng.
- `uuidv7()` cho id công khai có thứ tự thời gian; `gen_random_uuid()` cho id hoàn toàn ngẫu nhiên.
- Cột sinh không ghi tay được; ở Postgres 18 mặc định là `VIRTUAL`, cần index thì dùng `STORED`.

# EN

## Opening

Two clerks click "new order" in the same second, and both take `max(id) + 1` as the new order number: two orders share a number. Postgres has a built-in way to generate keys safely while many people write at once, along with UUIDs and computed columns. This lesson uses all three.

## Key idea

Identity. `GENERATED ALWAYS AS IDENTITY` attaches a sequence (a counter) to the column: every `INSERT` takes the next number with `nextval()`, safe when many sessions write at once. `ALWAYS` forbids writing the column by hand (unless you use `OVERRIDING SYSTEM VALUE`); `BY DEFAULT` allows it. Both replace the older `serial`, which is just an `integer` with `DEFAULT nextval(...)`.

Many people think identity ids are always consecutive. In fact `nextval()` is never given back, not even on a transaction's `ROLLBACK` or when an `INSERT` fails, so numbers can jump (1, 3, 4...). So `max(id)` is not the row count, and an id must not serve as a legal invoice number that may not skip. With `BY DEFAULT`, a hand-written id does not move the counter, so a later generated number can collide with it.

UUID. A `uuid` is 16 bytes and can be generated anywhere without asking the database, which suits public ids (URLs, APIs) that should not reveal how many orders exist. `gen_random_uuid()` makes version 4, fully random. `uuidv7()` (new in Postgres 18) makes version 7, which starts with the creation time, so new values land at the end of a B-tree index and disturb fewer pages than version 4.

Generated columns. `GENERATED ALWAYS AS (expression)` is always computed from other columns of the same row; nobody can write it by hand. `STORED` is computed on write and takes disk space; `VIRTUAL` is computed on every read and takes none. Since Postgres 18, writing neither gives `VIRTUAL`. Postgres 18 cannot index a `VIRTUAL` column yet.

## Syntax

```sql
CREATE TABLE table_name (
  id bigint GENERATED { ALWAYS | BY DEFAULT } AS IDENTITY PRIMARY KEY,
  public_id uuid DEFAULT { uuidv7() | gen_random_uuid() },
  col type GENERATED ALWAYS AS ( expression ) [ STORED | VIRTUAL ]
);
INSERT INTO table_name ( column [, ...] ) [ OVERRIDING SYSTEM VALUE ] VALUES ( ... );
SELECT nextval('sequence_name');
```

- `ALWAYS`: no hand-written values; `BY DEFAULT`: hand-written values allowed.
- `OVERRIDING SYSTEM VALUE`: forces a hand-written value into an `ALWAYS` column, for example when copying old data.
- `STORED` / `VIRTUAL`: kept on disk or computed on read; the default is `VIRTUAL`.

## Example

The lab's sequence `invoice_no` starts at 1000 with step 10:

```sql
SELECT nextval('invoice_no') AS first_no, nextval('invoice_no') AS second_no;
```

The result is 1000 and 1010: every `nextval()` call takes a new number.

An identity cancelled halfway:

```sql
CREATE TABLE events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
INSERT INTO events (name) VALUES ('signup');
BEGIN;
INSERT INTO events (name) VALUES ('cancelled');
ROLLBACK;
INSERT INTO events (name) VALUES ('login') RETURNING id;
```

The `login` row gets `id` 3, not 2: number 2 went to the cancelled row and never comes back.

```sql
SELECT uuid_extract_version(gen_random_uuid()) AS v4,
       uuid_extract_version(uuidv7()) AS v7,
       uuid_extract_timestamp(uuidv7()) IS NOT NULL AS v7_has_time;
```

The two functions make version 4 and version 7 UUIDs; only version 7 carries its creation time inside.

```sql
CREATE TABLE lines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty int NOT NULL,
  price numeric(10,2) NOT NULL,
  total_v numeric(12,2) GENERATED ALWAYS AS (qty * price),
  total_s numeric(12,2) GENERATED ALWAYS AS (qty * price) STORED
);
INSERT INTO lines (qty, price) VALUES (2, 9.50);
SELECT attname, attgenerated FROM pg_attribute
WHERE attrelid = 'lines'::regclass AND attgenerated <> '' ORDER BY attname;
```

`total_s` has `attgenerated` = `s` (stored), `total_v` has `v` (virtual, since nothing was written). Both read as 19.00.

## Common mistakes

Writing by hand into an `ALWAYS` column:

```sql
CREATE TABLE demo (id int GENERATED ALWAYS AS IDENTITY, v text);
-- ERROR 428C9: cannot insert a non-DEFAULT value into column "id"
INSERT INTO demo (id, v) VALUES (7, 'x');
```

Leave `id` out of the `INSERT` so Postgres generates it; use `OVERRIDING SYSTEM VALUE` only when you really copy old data.

Updating a generated column by hand:

```sql
-- ERROR 428C9: column "total_s" can only be updated to DEFAULT
UPDATE lines SET total_s = 0;
```

A generated column always follows its expression; to change `total_s`, change `qty` or `price`.

Writing into `BY DEFAULT` by hand, then letting Postgres generate:

```sql
CREATE TABLE tags (id int GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, name text NOT NULL);
INSERT INTO tags VALUES (1, 'manual');
-- ERROR 23505: duplicate key value violates unique constraint "tags_pkey"
INSERT INTO tags (name) VALUES ('auto');
```

A hand-written number does not move the sequence, so the first generated value is still 1 and hits the primary key. Use `ALWAYS`, or move the sequence with `setval()` after copying data.

Counting rows with `max(id)`:

```sql
-- WRONG: max(id) counts the number lost to ROLLBACK
SELECT max(id) AS events_so_far FROM events;
```

```sql
-- FIX: count the rows
SELECT count(*) AS events_so_far FROM events;
```

The wrong version returns 3, the fix returns 2: table `events` holds only two rows, number 2 was lost in the example above.

## Practice

The database already has sequence `invoice_no`. Create table `tickets` with an identity key, a `uuidv7()` public id and a generated `total` column, insert two tickets, then check the generated column's kind in the catalog; two questions follow.

## Recap

- Auto-increasing keys use `bigint GENERATED ALWAYS AS IDENTITY`; never compute `max(id) + 1` yourself.
- Sequences have gaps: a number handed out does not return on `ROLLBACK`, so `max(id)` is not the row count.
- `uuidv7()` gives time-ordered public ids; `gen_random_uuid()` gives fully random ones.
- Generated columns cannot be written by hand; in Postgres 18 the default is `VIRTUAL`, use `STORED` when you need an index.
