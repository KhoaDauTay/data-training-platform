---
id: e-pg-l4-10
engine: postgres
level: L4
module: locks
title: "Row lock: bốn mức, ghi trong tuple"
title_en: "Row locks: four strengths, stored in the tuple"
kind: concept
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Phân biệt `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` và bảng xung đột của chúng", en: "Tell apart `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE` and their conflict table" }
  - { vi: "Giải thích vì sao row lock không nằm trong `pg_locks` mà nằm trong header của tuple", en: "Explain why row locks are not in `pg_locks` but in the tuple header" }
  - { vi: "Biết vì sao khóa ngoại dùng `FOR KEY SHARE` để không chặn cập nhật thường", en: "Know why foreign keys use `FOR KEY SHARE` so ordinary updates are not blocked" }
requires: [e-pg-l4-09]
sources:
  - { url: https://www.postgresql.org/docs/18/explicit-locking.html, title_vi: "Khóa tường minh" }
  - { url: https://www.postgresql.org/docs/18/sql-select.html, title_vi: "SELECT" }
  - { url: https://www.postgresql.org/docs/18/pageinspect.html, title_vi: "pageinspect" }
viz: pg-lock-matrix
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
    INSERT INTO acct SELECT g, 100 FROM generate_series(1, 7) AS g;
    BEGIN;
    SELECT id FROM acct WHERE id = 3 FOR UPDATE;
    SELECT id FROM acct WHERE id = 4 FOR SHARE;
    SELECT id FROM acct WHERE id = 5 FOR KEY SHARE;
    SELECT id FROM acct WHERE id = 6 FOR NO KEY UPDATE;
  steps:
    - task:
        vi: "Transaction đang mở và giữ row lock trên dòng 3, 4, 5, 6 của `acct`. Đếm số dòng của `pg_locks` có `locktype = 'tuple'`."
        en: "The open transaction holds row locks on rows 3, 4, 5, 6 of `acct`. Count the rows of `pg_locks` with `locktype = 'tuple'`."
      solution: SELECT count(*) FROM pg_locks WHERE locktype = 'tuple'
      check: rows
      hint:
        vi: "`count(*)` trên `pg_locks`, lọc theo `locktype`."
        en: "`count(*)` over `pg_locks`, filtered on `locktype`."
      fact:
        vi: "Ra 0: bốn row lock không có dòng nào trong `pg_locks`, vì Postgres ghi row lock vào header của chính dòng đó trên trang, không vào bảng lock trong bộ nhớ. Nó chỉ thêm một lock `tuple` tạm khi có transaction khác phải chờ dòng đó."
        en: "It is 0: the four row locks have no row in `pg_locks`, because Postgres writes a row lock into that row's own header on the page, not into the in-memory lock table. It adds a temporary `tuple` lock only while another transaction waits for that row."
        probe: SELECT count(*) FROM pg_locks WHERE locktype = 'tuple'
        expect: [[0]]
    - task:
        vi: "Lock nằm trong header tuple. Đọc `lp`, `t_infomask`, `t_infomask2` của dòng 3 đến 7 trên trang 0 của `acct`, theo `lp`."
        en: "The locks live in the tuple header. Read `lp`, `t_infomask`, `t_infomask2` of rows 3 to 7 on page 0 of `acct`, by `lp`."
      solution: SELECT lp, t_infomask, t_infomask2 FROM heap_page_items(get_raw_page('acct', 0)) WHERE lp BETWEEN 3 AND 7 ORDER BY lp
      check: rows
      ordered: true
      hint:
        vi: "`heap_page_items()` đọc trang thô mà `get_raw_page()` trả về."
        en: "`heap_page_items()` reads the raw page that `get_raw_page()` returns."
      fact:
        vi: "Mỗi số là tổng các bit. Dòng bị lock có 256 (xmin đã commit) + 128 (`LOCK_ONLY`: xmax chỉ giữ lock, không xóa dòng) + bit mức lock: 64 cho FOR UPDATE và FOR NO KEY UPDATE (dòng 3 và 6: 448), 64 + 16 cho FOR SHARE (dòng 4: 464), 16 cho FOR KEY SHARE (dòng 5: 400). Dòng 3 khác dòng 6 ở `t_infomask2`: 8194 = 8192 (bit `KEYS_UPDATED`, mức mạnh nhất) + 2 cột, còn dòng 6 chỉ có 2 cột. Dòng 7 không bị lock: 2048 = bit `XMAX_INVALID`. Lock được ghi ngay trên trang, không nằm trong bộ nhớ."
        en: "Each number is a sum of bits. A locked row has 256 (xmin committed) + 128 (`LOCK_ONLY`: xmax only holds a lock, it does not delete the row) + the strength bits: 64 for FOR UPDATE and FOR NO KEY UPDATE (rows 3 and 6: 448), 64 + 16 for FOR SHARE (row 4: 464), 16 for FOR KEY SHARE (row 5: 400). Row 3 differs from row 6 in `t_infomask2`: 8194 = 8192 (the `KEYS_UPDATED` bit, the strongest level) + 2 columns, while row 6 only has the 2 columns. Row 7 is not locked: 2048 = the `XMAX_INVALID` bit. The locks are written right on the page, not kept in memory."
        probe: SELECT lp, t_infomask, t_infomask2 FROM heap_page_items(get_raw_page('acct', 0)) WHERE lp BETWEEN 3 AND 7 ORDER BY lp
        expect: [[3, 448, 8194], [4, 464, 2], [5, 400, 2], [6, 448, 2], [7, 2048, 2]]
quiz:
  - q: { vi: "Transaction A chèn đơn hàng tham chiếu khách 42 (khóa ngoại). Transaction B cùng lúc `UPDATE customers SET region = 3 WHERE id = 42` (không đổi cột khóa). B có phải chờ A không?", en: "Transaction A inserts an order that references customer 42 (foreign key). Transaction B at the same time runs `UPDATE customers SET region = 3 WHERE id = 42` (key unchanged). Must B wait for A?" }
    options:
      - { vi: "Có, vì A giữ row lock trên dòng khách", en: "Yes, because A locked the customer row" }
      - { vi: "Không: kiểm tra khóa ngoại lấy `FOR KEY SHARE`, còn UPDATE không đổi cột khóa lấy `FOR NO KEY UPDATE`; hai mức này không xung đột", en: "No: the foreign-key check takes `FOR KEY SHARE`, the key-preserving UPDATE takes `FOR NO KEY UPDATE`, and those two do not conflict" }
      - { vi: "Không, vì khóa ngoại không lấy lock nào cả", en: "No, because foreign keys lock nothing at all" }
    answer: 1
    trap: 0
    why: { vi: "A đúng là giữ một row lock trên dòng khách 42 (nên \"khóa ngoại không lấy lock nào\" sai), nhưng đó là mức yếu nhất, `FOR KEY SHARE`: nó chỉ cần dòng cha không bị xóa và cột khóa không đổi trong lúc A chạy. `FOR KEY SHARE` chỉ xung đột với `FOR UPDATE`, mức mà Postgres lấy khi xóa dòng hoặc đổi cột khóa. Câu của B chỉ đổi `region`, nên lấy `FOR NO KEY UPDATE` và không phải chờ. Nhờ vậy chèn dòng con không làm nghẽn việc sửa các cột thường của dòng cha.", en: "A does hold a row lock on customer 42 (so \"foreign keys lock nothing\" is wrong), but it is the weakest level, `FOR KEY SHARE`: it only needs the parent row not to be deleted and its key not to change while A runs. `FOR KEY SHARE` only conflicts with `FOR UPDATE`, the level Postgres takes to delete a row or change a key column. B only changes `region`, so it takes `FOR NO KEY UPDATE` and does not wait. That is why inserting child rows does not jam updates to the parent's ordinary columns." }
  - q: { vi: "Một job giữ row lock trên 2 triệu dòng bằng `SELECT … FOR UPDATE`. Điều gì đúng?", en: "A job locks 2 million rows with `SELECT … FOR UPDATE`. What is true?" }
    options:
      - { vi: "Postgres hết bộ nhớ bảng lock và nâng lên lock trên bảng", en: "Postgres runs out of lock-table memory and escalates to a table lock" }
      - { vi: "Không có giới hạn số dòng bị giữ lock vì lock được ghi vào từng tuple; cái giá là ghi xuống trang (và WAL) cho mỗi dòng", en: "There is no limit on locked rows because each lock is written into its tuple; the price is a page write (and WAL) per row" }
      - { vi: "Chỉ 1000 dòng đầu bị giữ lock", en: "Only the first 1000 rows get locked" }
    answer: 1
    trap: 0
    why: { vi: "Hết bộ nhớ rồi nâng lên lock bảng nghe hợp lý vì vài database khác làm vậy (lock escalation), nhưng Postgres không làm. Như bước 2 của lab cho thấy, row lock được ghi vào header của chính dòng đó trên trang, không vào bảng lock trong bộ nhớ, nên không có giới hạn số dòng, kể cả mức 1 000. Cái giá là mỗi dòng bị lock thành một lần sửa trang: trang thành trang bẩn phải ghi xuống đĩa, và có thêm bản ghi WAL (write-ahead log, nhật ký ghi trước).", en: "Running out of memory and escalating to a table lock sounds right because some other databases do that (lock escalation), but Postgres does not. As step 2 of the lab shows, a row lock is written into that row's own header on the page, not into the in-memory lock table, so there is no limit on the number of rows, 1,000 or otherwise. The price is that each locked row becomes a page change: the page is dirtied and must be written to disk, with an extra WAL (write-ahead log) record." }
---

## Mở bài

Một job giữ row lock trên 2 triệu dòng bằng `SELECT … FOR UPDATE`. Nếu mỗi lock là một mục trong bộ nhớ chung, máy đã cạn bộ nhớ từ lâu. Vậy Postgres nhớ chúng ở đâu?

## Ý chính

Row lock có bốn mức, từ yếu tới mạnh: `FOR KEY SHARE`, `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`. `FOR KEY SHARE` chỉ chặn `FOR UPDATE`. `FOR SHARE` chặn hai mức sửa (`FOR NO KEY UPDATE`, `FOR UPDATE`). `FOR NO KEY UPDATE` chặn mọi mức trừ `FOR KEY SHARE`. `FOR UPDATE` chặn tất cả. Hai mức share không chặn nhau, nên nhiều người đọc giữ dòng cùng lúc được.

Lệnh ghi tự lấy row lock: `UPDATE` không đổi cột nào của unique index lấy `FOR NO KEY UPDATE`; `DELETE` hoặc `UPDATE` đổi cột khóa lấy `FOR UPDATE`. Kiểm tra khóa ngoại lấy `FOR KEY SHARE` trên dòng cha, nên chèn dòng con không chặn việc sửa cột thường của dòng cha.

Nhiều người nghĩ row lock nằm trong `pg_locks` như lock trên bảng, và giữ quá nhiều thì bị nâng thành lock cả bảng. Thật ra Postgres ghi row lock vào chính tuple: `xmax` là transaction giữ lock, các bit trong `t_infomask` cho biết mức lock, và cờ `HEAP_XMAX_LOCK_ONLY` nói đây chỉ là lock, không phải xóa. Không giới hạn số dòng và không có lock escalation; cái giá là mỗi dòng bị ghi lại trên trang.

`pg_locks` chỉ thấy lock ROW SHARE trên bảng đi kèm. Người chờ một dòng thì chờ trên ID transaction của người giữ (loại `transactionid`). `NOWAIT` báo lỗi ngay thay vì chờ; `SKIP LOCKED` bỏ qua dòng người khác đang giữ, hợp cho hàng đợi việc nhiều worker. Lock của chính bạn không bao giờ chặn bạn.

## Cú pháp

```sql
SELECT columns FROM table_name [ WHERE condition ]
  FOR { UPDATE | NO KEY UPDATE | SHARE | KEY SHARE }
  [ OF table_name [, ...] ] [ NOWAIT | SKIP LOCKED ];
```

- `FOR UPDATE`: sắp xóa dòng hoặc đổi cột khóa.
- `FOR NO KEY UPDATE`: sắp sửa cột thường; mức của `UPDATE` thường.
- `FOR SHARE`: không ai được sửa dòng trong lúc mình dùng nó.
- `FOR KEY SHARE`: chỉ giữ cho cột khóa không đổi và dòng không bị xóa; mức của kiểm tra khóa ngoại.
- `OF`: chỉ lock dòng của các bảng được nêu.
- `NOWAIT`: lỗi ngay thay vì chờ; `SKIP LOCKED`: bỏ qua dòng đang bị giữ.

## Ví dụ

Database của bài đang mở một transaction giữ row lock trên dòng 3, 4, 5, 6. Lock nào hiện trong `pg_locks`?

```sql
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
```

Chỉ hai dòng `RowShareLock`, trên `acct` và `acct_pkey`: bốn row lock không có dòng riêng.

Dấu vết nằm trong tuple, ở cột hệ thống `xmax`:

```sql
SELECT id, xmax = pg_current_xact_id()::xid AS locked_by_me
FROM acct WHERE id BETWEEN 2 AND 7
ORDER BY id;
```

Dòng 3 tới 6 có `xmax` bằng ID transaction hiện tại; dòng 2 và 7 không.

Kết thúc transaction rồi đọc lại:

```sql
ROLLBACK;
SELECT id, xmax <> '0' AS xmax_set
FROM acct WHERE id BETWEEN 2 AND 7
ORDER BY id;
```

Sau ROLLBACK không còn lock nào, nhưng dòng 3 tới 6 vẫn có `xmax` khác 0 (ID của transaction đã hủy). Vì vậy `xmax` khác 0 không có nghĩa dòng đang bị giữ lock hay đã bị xóa; phải đọc các bit cờ và trạng thái transaction.

## Lỗi hay gặp

Giữ lock trên một con số tổng:

```sql
-- ERROR 0A000: FOR UPDATE is not allowed with aggregate functions
SELECT count(*) FROM acct WHERE bal > 0 FOR UPDATE;
```

Một dòng tổng không phải dòng của bảng nên không có gì để khóa. Khóa các dòng trong truy vấn con rồi đếm bên ngoài.

Quên `OF` khi câu có JOIN:

```sql
CREATE TABLE branch (id int PRIMARY KEY, name text NOT NULL);
INSERT INTO branch VALUES (1, 'Da Nang');
-- WRONG: FOR UPDATE without OF also locks the branch row
WITH r AS (
  SELECT a.id FROM acct a JOIN branch b ON b.id = 1
  WHERE a.id = 1 FOR UPDATE
)
SELECT c.relname, l.mode
FROM r, pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname IN ('acct', 'branch')
ORDER BY 1, 2;
```

```sql
-- FIX: FOR UPDATE OF a locks only the account row
WITH r AS (
  SELECT a.id FROM acct a JOIN branch b ON b.id = 1
  WHERE a.id = 1 FOR UPDATE OF a
)
SELECT c.relname, l.mode
FROM r, pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname IN ('acct', 'branch')
ORDER BY 1, 2;
```

Không có `OF`, dòng chi nhánh cũng bị khóa (`RowShareLock` trên `branch`), nên mọi giao dịch của chi nhánh đó phải chờ nhau. Với `OF a`, `branch` chỉ còn `AccessShareLock` của việc đọc.

Giữ row lock trong transaction chỉ đọc:

```sql
BEGIN READ ONLY;
-- ERROR 25006: cannot execute SELECT FOR SHARE in a read-only transaction
SELECT id FROM acct WHERE id = 1 FOR SHARE;
```

Row lock được ghi vào tuple, tức là một lệnh ghi, nên transaction `READ ONLY` (ví dụ trên bản sao chỉ đọc) không lấy được. Bỏ mệnh đề `FOR` hoặc dùng transaction đọc ghi.

## Thực hành

Lab chạy trên chính transaction đang mở của bài: đếm lock loại `tuple` trong `pg_locks`, rồi đọc header tuple bằng `pageinspect`. Cảnh một phiên chờ phiên kia cần hai phiên, PGlite chỉ có một, nên phần đó là sơ đồ. Sau đó là hai câu hỏi.

## Tóm tắt

- Bốn mức row lock: `FOR KEY SHARE`, `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`; chọn mức yếu nhất đủ đúng.
- `UPDATE` thường lấy `FOR NO KEY UPDATE`, khóa ngoại lấy `FOR KEY SHARE`, nên hai việc này không chặn nhau.
- Row lock nằm trong tuple (`xmax` + bit cờ), không trong `pg_locks`; không giới hạn số dòng, không lock escalation.
- `xmax` khác 0 không chứng minh dòng đang bị khóa; sau ROLLBACK nó vẫn còn.
- Dùng `OF` khi câu có JOIN để không khóa thừa dòng của bảng khác.

# EN

## Opening

A job holds row locks on 2 million rows with `SELECT … FOR UPDATE`. If every lock were an entry in shared memory, the server would have run out of memory long ago. So where does Postgres keep them?

## Key idea

Row locks come in four strengths, weakest first: `FOR KEY SHARE`, `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`. `FOR KEY SHARE` only blocks `FOR UPDATE`. `FOR SHARE` blocks the two changing strengths (`FOR NO KEY UPDATE`, `FOR UPDATE`). `FOR NO KEY UPDATE` blocks everything except `FOR KEY SHARE`. `FOR UPDATE` blocks them all. The two share strengths do not block each other, so many readers can hold a row together.

Writes take row locks on their own: an `UPDATE` that changes no column of a unique index takes `FOR NO KEY UPDATE`; a `DELETE` or an `UPDATE` of a key column takes `FOR UPDATE`. A foreign-key check takes `FOR KEY SHARE` on the parent row, so inserting a child row does not block changes to the parent's ordinary columns.

Many people think row locks sit in `pg_locks` like table locks, and that holding too many escalates to a lock on the whole table. In fact Postgres writes a row lock into the tuple itself: `xmax` is the locking transaction, bits in `t_infomask` give the strength, and the `HEAP_XMAX_LOCK_ONLY` flag says it is only a lock, not a delete. There is no limit on the number of rows and no lock escalation; the price is that each row is written again on its page.

`pg_locks` only shows the ROW SHARE lock on the table that comes with them. A session waiting for a row waits on the holder's transaction ID (type `transactionid`). `NOWAIT` errors at once instead of waiting; `SKIP LOCKED` skips rows someone else holds, which suits job queues with many workers. Your own locks never block you.

## Syntax

```sql
SELECT columns FROM table_name [ WHERE condition ]
  FOR { UPDATE | NO KEY UPDATE | SHARE | KEY SHARE }
  [ OF table_name [, ...] ] [ NOWAIT | SKIP LOCKED ];
```

- `FOR UPDATE`: about to delete the row or change a key column.
- `FOR NO KEY UPDATE`: about to change ordinary columns; the strength of a plain `UPDATE`.
- `FOR SHARE`: nobody may change the row while you use it.
- `FOR KEY SHARE`: only keeps the key columns unchanged and the row undeleted; the strength of a foreign-key check.
- `OF`: lock only the rows of the tables named.
- `NOWAIT`: error at once instead of waiting; `SKIP LOCKED`: skip rows that are held.

## Example

The lesson's database has an open transaction holding row locks on rows 3, 4, 5, 6. Which locks show in `pg_locks`?

```sql
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
```

Only two `RowShareLock` rows, on `acct` and `acct_pkey`: the four row locks have no row of their own.

The trace is in the tuple, in the system column `xmax`:

```sql
SELECT id, xmax = pg_current_xact_id()::xid AS locked_by_me
FROM acct WHERE id BETWEEN 2 AND 7
ORDER BY id;
```

Rows 3 to 6 have `xmax` equal to the current transaction ID; rows 2 and 7 do not.

End the transaction and read again:

```sql
ROLLBACK;
SELECT id, xmax <> '0' AS xmax_set
FROM acct WHERE id BETWEEN 2 AND 7
ORDER BY id;
```

After the ROLLBACK no lock is left, yet rows 3 to 6 still have a non-zero `xmax` (the ID of the aborted transaction). So a non-zero `xmax` does not mean the row is locked or deleted; you have to read the flag bits and the transaction's status.

## Common mistakes

Locking an aggregate:

```sql
-- ERROR 0A000: FOR UPDATE is not allowed with aggregate functions
SELECT count(*) FROM acct WHERE bal > 0 FOR UPDATE;
```

A total row is not a table row, so there is nothing to lock. Lock the rows in a sub-query and count outside it.

Forgetting `OF` in a query with a JOIN:

```sql
CREATE TABLE branch (id int PRIMARY KEY, name text NOT NULL);
INSERT INTO branch VALUES (1, 'Da Nang');
-- WRONG: FOR UPDATE without OF also locks the branch row
WITH r AS (
  SELECT a.id FROM acct a JOIN branch b ON b.id = 1
  WHERE a.id = 1 FOR UPDATE
)
SELECT c.relname, l.mode
FROM r, pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname IN ('acct', 'branch')
ORDER BY 1, 2;
```

```sql
-- FIX: FOR UPDATE OF a locks only the account row
WITH r AS (
  SELECT a.id FROM acct a JOIN branch b ON b.id = 1
  WHERE a.id = 1 FOR UPDATE OF a
)
SELECT c.relname, l.mode
FROM r, pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname IN ('acct', 'branch')
ORDER BY 1, 2;
```

Without `OF`, the branch row is locked too (`RowShareLock` on `branch`), so every transaction of that branch waits for the others. With `OF a`, `branch` only keeps the `AccessShareLock` of the read.

Taking a row lock in a read-only transaction:

```sql
BEGIN READ ONLY;
-- ERROR 25006: cannot execute SELECT FOR SHARE in a read-only transaction
SELECT id FROM acct WHERE id = 1 FOR SHARE;
```

A row lock is written into the tuple, which is a write, so a `READ ONLY` transaction (for example on a read-only replica) cannot take one. Drop the `FOR` clause or use a read-write transaction.

## Practice

The lab runs inside the lesson's open transaction: count the `tuple` locks in `pg_locks`, then read the tuple headers with `pageinspect`. One session waiting for another needs two sessions and PGlite has only one, so that part is a diagram. Then two questions.

## Recap

- Four row-lock strengths: `FOR KEY SHARE`, `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`; pick the weakest that is still correct.
- A plain `UPDATE` takes `FOR NO KEY UPDATE` and a foreign key takes `FOR KEY SHARE`, so the two do not block each other.
- Row locks live in the tuple (`xmax` + flag bits), not in `pg_locks`; no row limit, no lock escalation.
- A non-zero `xmax` does not prove the row is locked; it stays after a ROLLBACK.
- Use `OF` in a query with a JOIN so you do not lock other tables' rows by accident.
