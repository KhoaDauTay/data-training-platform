---
id: e-pg-l4-09
engine: postgres
level: L4
module: locks
title: "Lock mode trên bảng và pg_locks"
title_en: "Table-level lock modes and pg_locks"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Kể tám lock mode trên bảng và lệnh nào lấy chế độ nào", en: "Name the eight table lock modes and which command takes which" }
  - { vi: "Đọc bảng xung đột: chế độ nào chặn chế độ nào", en: "Read the conflict table: which mode blocks which" }
  - { vi: "Thấy lock thật mà chính câu của mình đang giữ qua `pg_locks`, và đặt `lock_timeout` trước một migration", en: "See the real locks your own statement holds through `pg_locks`, and set `lock_timeout` before a migration" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/sql-lock.html
  - https://www.postgresql.org/docs/18/view-pg-locks.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html
viz: pg-lock-matrix
lab:
  setup: |
    DROP TABLE IF EXISTS acct CASCADE;
    CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
    INSERT INTO acct SELECT g, 100 FROM generate_series(1, 10) g;
  steps:
    - task: { vi: "Trong cùng một câu: cộng 1 vào số dư (cột `bal`) của tài khoản 1 (dùng CTE có UPDATE … RETURNING), rồi liệt kê tên quan hệ và lock mode trong `pg_locks` cho mọi quan hệ có tên bắt đầu bằng `acct`. Sắp theo tên rồi chế độ.", en: "In one statement: add 1 to the balance (column `bal`) of account 1 (a CTE with UPDATE … RETURNING), then list the relation name and lock mode in `pg_locks` for every relation whose name starts with `acct`. Order by name, then mode." }
      solution: "WITH u AS (UPDATE acct SET bal = bal + 1 WHERE id = 1 RETURNING id) SELECT c.relname, l.mode FROM u, pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname LIKE 'acct%' ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Nối `pg_locks.relation` với `pg_class.oid`. Mỗi lần chạy là một database mới, và lock của câu nhả ngay khi câu xong, nên phải đọc `pg_locks` trong chính câu đó.", en: "Join `pg_locks.relation` to `pg_class.oid`. Each run is a fresh database, and the statement's locks are released as soon as it ends, so read `pg_locks` inside that same statement." }
    - task: { vi: "Giống bước 1, nhưng thay UPDATE bằng việc giữ row lock trên dòng tài khoản 2 để sửa sau (`SELECT … FOR UPDATE` trong CTE). Câu chính phải đọc CTE (ví dụ `FROM r, pg_locks l …`): một CTE `SELECT` mà câu chính không đọc tới thì không chạy, nên bạn chỉ thấy lock trên bảng mà bước phân tích câu đã lấy, thiếu dòng của `acct_pkey`.", en: "Like step 1, but instead of an UPDATE, lock account 2's row for a later change (`SELECT … FOR UPDATE` inside the CTE). The main query must read the CTE (for example `FROM r, pg_locks l …`): a `SELECT` CTE the main query never reads is not run, so you only see the table lock taken while the statement was parsed, and the `acct_pkey` row is missing." }
      solution: "WITH r AS (SELECT id FROM acct WHERE id = 2 FOR UPDATE) SELECT c.relname, l.mode FROM r, pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname LIKE 'acct%' ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Row lock không hiện từng dòng trong `pg_locks`; bạn chỉ thấy lock trên bảng đi kèm.", en: "Row locks do not show one by one in `pg_locks`; you only see the table lock that comes with them." }
    - task: { vi: "Sắp chạy một migration. Cho cả phiên này (không chỉ một transaction) tự bỏ cuộc khi phải chờ một lock quá 2 giây.", en: "A migration is about to run. Make this whole session (not just one transaction) give up when it has waited more than 2 seconds for a lock." }
      solution: "SET lock_timeout = '2s'"
      check: rows
      after: SELECT current_setting('lock_timeout') AS lock_timeout
      hint: { vi: "`SET` không có `LOCAL` đổi thiết lập cho cả phiên; `SET LOCAL` ngoài `BEGIN` không có tác dụng.", en: "`SET` without `LOCAL` changes the setting for the whole session; `SET LOCAL` outside `BEGIN` has no effect." }
quiz:
  - q: { vi: "Phiên A đang chạy một báo cáo `SELECT` dài trên `acct`. Phiên B chạy `ALTER TABLE acct ADD COLUMN note text`. Phiên C sau đó chạy `SELECT` ngắn. Chuyện gì xảy ra?", en: "Session A runs a long reporting `SELECT` on `acct`. Session B runs `ALTER TABLE acct ADD COLUMN note text`. Session C then runs a short `SELECT`. What happens?" }
    options:
      - { vi: "Cả ba chạy song song", en: "All three run in parallel" }
      - { vi: "B chờ A (ACCESS EXCLUSIVE xung đột ACCESS SHARE), và C xếp hàng sau B, nên C cũng bị chặn dù C chỉ đọc", en: "B waits for A (ACCESS EXCLUSIVE conflicts with ACCESS SHARE), and C queues behind B, so C is blocked too even though it only reads" }
      - { vi: "B hủy A", en: "B cancels A" }
    answer: 1
    trap: 0
    why: { vi: "\"Chạy song song\" nghe hợp lý vì A và C đều chỉ đọc, mà hai câu đọc không chặn nhau. Nhưng `ADD COLUMN` cần lock ACCESS EXCLUSIVE, lock duy nhất xung đột với ACCESS SHARE của `SELECT`, nên B phải chờ A đọc xong. Các lock được cấp theo thứ tự đến: C đến sau B, mà lock ACCESS SHARE của C xung đột với lock B đang chờ, nên C xếp hàng sau B dù A và C không xung đột. B không hủy A; nó chỉ chờ. Đây là chuyện \"migration làm treo cả ứng dụng\": đặt `SET lock_timeout` trước lệnh DDL (lệnh đổi cấu trúc bảng) để B bỏ cuộc sớm thay vì chặn mọi người.", en: "\"In parallel\" sounds right because A and C only read, and two reads do not block each other. But `ADD COLUMN` needs an ACCESS EXCLUSIVE lock, the only one that conflicts with a `SELECT`'s ACCESS SHARE, so B waits for A to finish. Locks are granted in arrival order: C arrives after B, and C's ACCESS SHARE conflicts with the lock B is waiting for, so C queues behind B even though A and C do not conflict. B does not cancel A; it only waits. This is the \"a migration froze the whole app\" incident: run `SET lock_timeout` before the DDL (a statement that changes table structure) so B gives up early instead of blocking everyone." }
  - q: { vi: "Lệnh nào KHÔNG chặn `INSERT`/`UPDATE` đồng thời trên bảng?", en: "Which command does NOT block concurrent `INSERT`/`UPDATE` on the table?" }
    options:
      - { vi: "`CREATE INDEX` (SHARE)", en: "`CREATE INDEX` (SHARE)" }
      - { vi: "`CREATE INDEX CONCURRENTLY` (SHARE UPDATE EXCLUSIVE)", en: "`CREATE INDEX CONCURRENTLY` (SHARE UPDATE EXCLUSIVE)" }
      - { vi: "`VACUUM FULL` (ACCESS EXCLUSIVE)", en: "`VACUUM FULL` (ACCESS EXCLUSIVE)" }
    answer: 1
    trap: 0
    why: { vi: "`CREATE INDEX` thường nghe vô hại vì chế độ của nó tên là SHARE, nhưng SHARE xung đột với ROW EXCLUSIVE, lock mà mọi `INSERT`/`UPDATE`/`DELETE` lấy trên bảng, nên mọi lệnh ghi phải chờ tới khi index tạo xong. `VACUUM FULL` lấy ACCESS EXCLUSIVE, chặn cả đọc lẫn ghi. `CREATE INDEX CONCURRENTLY` chỉ lấy SHARE UPDATE EXCLUSIVE, chế độ không xung đột với ROW EXCLUSIVE, nên lệnh ghi vẫn chạy trong lúc index được dựng; đổi lại, nó chậm hơn và đọc bảng hai lượt.", en: "A plain `CREATE INDEX` sounds harmless because its mode is called SHARE, but SHARE conflicts with ROW EXCLUSIVE, the lock every `INSERT`/`UPDATE`/`DELETE` takes on the table, so every write waits until the index is built. `VACUUM FULL` takes ACCESS EXCLUSIVE, blocking reads and writes alike. `CREATE INDEX CONCURRENTLY` only takes SHARE UPDATE EXCLUSIVE, a mode that does not conflict with ROW EXCLUSIVE, so writes keep running while the index is built; in exchange it is slower and reads the table twice." }
---

## Mở bài

Một lệnh `ALTER TABLE` thêm cột chạy lúc mười giờ sáng, và suốt hai phút không trang nào của ứng dụng mở được. Lệnh đó chỉ sửa catalog, vậy nó chặn ai và chặn bằng cách nào? Câu trả lời nằm ở lock mode trên bảng.

## Ý chính

Mỗi lệnh chạm vào một bảng đều lấy một lock trên cả bảng trước khi làm việc, và giữ nó tới cuối transaction. Có tám mức, từ ACCESS SHARE của `SELECT` thường tới ACCESS EXCLUSIVE của `DROP TABLE` và phần lớn dạng `ALTER TABLE`. Khi hai lock xung đột, lệnh đến sau phải chờ; bảng xung đột trong tài liệu chính thức quyết định cặp nào xung đột.

Nhiều người nghĩ chữ ROW trong ROW SHARE hay ROW EXCLUSIVE nghĩa là lock trên từng dòng. Thật ra cả tám mức đều là lock trên bảng; row lock là chuyện khác, ở bài sau. ROW EXCLUSIVE là mức mà `INSERT`, `UPDATE`, `DELETE` lấy, và mức này không xung đột với chính nó, nên nhiều người ghi cùng lúc vẫn chạy song song.

Chỉ ACCESS EXCLUSIVE chặn `SELECT` thường. Hàng đợi lock đi theo thứ tự đến: một lệnh đang chờ ACCESS EXCLUSIVE khiến mọi lệnh đến sau, kể cả `SELECT`, xếp hàng sau nó. Vì vậy trước một migration hãy đặt `lock_timeout`: lệnh chờ quá hạn sẽ tự bỏ cuộc (lỗi 55P03) thay vì làm treo cả ứng dụng.

`pg_locks` là cửa sổ nhìn vào bảng lock: mỗi dòng là một lock đang giữ (`granted = true`) hoặc đang chờ. Ở đó các mức được viết như `AccessShareLock`, `RowExclusiveLock`. PGlite chỉ có một phiên, nên bài này đọc lock mà chính câu của bạn giữ; cảnh hai phiên chờ nhau nằm trong sơ đồ.

## Cú pháp

```sql
LOCK [ TABLE ] table_name [ IN lock_mode MODE ] [ NOWAIT ];
SET [ LOCAL ] lock_timeout = 'duration';
SELECT relation::regclass, mode, granted FROM pg_locks [ WHERE condition ];
```

- ACCESS SHARE: `SELECT` thường.
- ROW SHARE: `SELECT ... FOR UPDATE` và các dạng `FOR` khác.
- ROW EXCLUSIVE: `INSERT`, `UPDATE`, `DELETE`, `MERGE`.
- SHARE UPDATE EXCLUSIVE: `VACUUM`, `ANALYZE`, `CREATE INDEX CONCURRENTLY`.
- SHARE: `CREATE INDEX`; chặn ghi, vẫn cho đọc.
- SHARE ROW EXCLUSIVE: `CREATE TRIGGER`.
- EXCLUSIVE: `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- ACCESS EXCLUSIVE: `DROP TABLE`, `TRUNCATE`, `VACUUM FULL`, và `LOCK` khi không ghi mức.

## Ví dụ

Tự lấy lock SHARE trong một transaction rồi nhìn nó trong `pg_locks`:

```sql
BEGIN;
LOCK TABLE acct IN SHARE MODE;
SELECT c.relname, l.mode, l.granted
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
COMMIT;
```

Một dòng `acct | ShareLock | true`: lock đã được cấp, và nhả khi COMMIT.

Lock mà `CREATE INDEX` và `ALTER TABLE` lấy:

```sql
BEGIN;
CREATE INDEX acct_bal_idx ON acct (bal);
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
ROLLBACK;
```

```sql
BEGIN;
ALTER TABLE acct ADD COLUMN note text;
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
ROLLBACK;
```

`CREATE INDEX` giữ `ShareLock` trên `acct` (đọc vẫn chạy, ghi phải chờ) và `AccessExclusiveLock` trên index mới. Thêm một cột, dù chỉ sửa catalog, giữ `AccessExclusiveLock`: mức mạnh nhất.

## Lỗi hay gặp

Gọi `LOCK` ngoài transaction:

```sql
-- ERROR 25P01: LOCK TABLE can only be used in transaction blocks
LOCK TABLE acct IN SHARE MODE;
```

Ngoài `BEGIN`, lock sẽ nhả ngay khi câu xong, nên Postgres từ chối. Mở `BEGIN` trước.

Đọc `pg_locks` ở câu sau lệnh ghi:

```sql
-- WRONG: the UPDATE committed on its own, so its lock is already gone
UPDATE acct SET bal = bal + 1 WHERE id = 1;
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
```

```sql
-- FIX: keep the transaction open while you read pg_locks
BEGIN;
UPDATE acct SET bal = bal + 1 WHERE id = 1;
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
ROLLBACK;
```

Câu sai không ra dòng nào: lock được giữ tới cuối transaction, mà transaction của `UPDATE` đã xong. Trong `BEGIN`, bạn thấy `RowExclusiveLock` trên `acct` và `acct_pkey`.

Quên ghi mức sau `LOCK`:

```sql
-- WRONG: with no IN ... MODE, LOCK takes ACCESS EXCLUSIVE and blocks every reader
BEGIN;
LOCK TABLE acct;
SELECT l.mode FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname = 'acct';
ROLLBACK;
```

```sql
-- FIX: SHARE blocks writes but lets readers through
BEGIN;
LOCK TABLE acct IN SHARE MODE;
SELECT l.mode FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname = 'acct';
ROLLBACK;
```

Muốn đối soát số dư mà không ai ghi xen vào thì SHARE là đủ; ACCESS EXCLUSIVE chặn luôn cả người chỉ đọc.

Đặt `lock_timeout` bằng `SET LOCAL` ngoài transaction:

```sql
-- WRONG: SET LOCAL outside a transaction block only warns and changes nothing
SET LOCAL lock_timeout = '3s';
SELECT current_setting('lock_timeout') AS lock_timeout;
```

```sql
-- FIX: inside BEGIN, SET LOCAL lasts until COMMIT or ROLLBACK
BEGIN;
SET LOCAL lock_timeout = '3s';
SELECT current_setting('lock_timeout') AS lock_timeout;
COMMIT;
```

Câu sai vẫn ra `0` (không giới hạn): Postgres chỉ cảnh báo. `SET LOCAL` chỉ sống trong một transaction; muốn cả phiên thì dùng `SET`.

## Thực hành

Ba bước. Hai bước đầu tự đọc lock của chính câu mình trong cùng câu đó: mỗi lần chạy là một database mới, và lock nhả ngay khi câu xong. Bước ba đặt `lock_timeout` cho cả phiên trước một migration. Sau đó là hai câu hỏi; sơ đồ ma trận xung đột cho bạn bấm thử từng cặp.

## Tóm tắt

- Tám lock mode đều là lock trên bảng; chữ ROW trong tên không có nghĩa là row lock.
- Lock được giữ tới cuối transaction; đọc `pg_locks` khi transaction còn mở.
- Chỉ ACCESS EXCLUSIVE chặn `SELECT`, nhưng hàng đợi lock FIFO làm một lệnh DDL đang chờ chặn mọi lệnh sau nó.
- `LOCK` không ghi mức là ACCESS EXCLUSIVE; chọn mức yếu nhất đủ dùng.
- Trước migration: `SET lock_timeout` để lệnh tự bỏ cuộc thay vì làm treo ứng dụng.

# EN

## Opening

An `ALTER TABLE` that adds a column runs at ten in the morning, and for two minutes no page of the application will load. The command only changes the catalog, so whom does it block, and how? The answer lies in table lock modes.

## Key idea

Every command that touches a table takes a lock on the whole table before it works, and holds it until the end of the transaction. There are eight modes, from the ACCESS SHARE of a plain `SELECT` up to the ACCESS EXCLUSIVE of `DROP TABLE` and most forms of `ALTER TABLE`. When two locks conflict, the later command waits; the conflict table in the official docs decides which pairs conflict.

Many people think the word ROW in ROW SHARE or ROW EXCLUSIVE means a lock on single rows. In fact all eight modes are table locks; row locks are a different thing, in the next lesson. ROW EXCLUSIVE is the mode `INSERT`, `UPDATE` and `DELETE` take, and it does not conflict with itself, so many writers still run side by side.

Only ACCESS EXCLUSIVE blocks a plain `SELECT`. The lock queue is served in arrival order: one command waiting for ACCESS EXCLUSIVE makes every later command, `SELECT` included, queue behind it. So before a migration, set `lock_timeout`: a command that waits too long gives up by itself (error 55P03) instead of freezing the whole application.

`pg_locks` is the window into the lock table: each row is a lock that is held (`granted = true`) or awaited. There the modes are spelled like `AccessShareLock` and `RowExclusiveLock`. PGlite has only one session, so this lesson reads the locks your own statement holds; two sessions waiting for each other are in the diagram.

## Syntax

```sql
LOCK [ TABLE ] table_name [ IN lock_mode MODE ] [ NOWAIT ];
SET [ LOCAL ] lock_timeout = 'duration';
SELECT relation::regclass, mode, granted FROM pg_locks [ WHERE condition ];
```

- ACCESS SHARE: a plain `SELECT`.
- ROW SHARE: `SELECT ... FOR UPDATE` and the other `FOR` forms.
- ROW EXCLUSIVE: `INSERT`, `UPDATE`, `DELETE`, `MERGE`.
- SHARE UPDATE EXCLUSIVE: `VACUUM`, `ANALYZE`, `CREATE INDEX CONCURRENTLY`.
- SHARE: `CREATE INDEX`; blocks writes, still allows reads.
- SHARE ROW EXCLUSIVE: `CREATE TRIGGER`.
- EXCLUSIVE: `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- ACCESS EXCLUSIVE: `DROP TABLE`, `TRUNCATE`, `VACUUM FULL`, and `LOCK` when no mode is given.

## Example

Take a SHARE lock yourself inside a transaction, then see it in `pg_locks`:

```sql
BEGIN;
LOCK TABLE acct IN SHARE MODE;
SELECT c.relname, l.mode, l.granted
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
COMMIT;
```

One row `acct | ShareLock | true`: the lock was granted, and it is released at COMMIT.

The locks `CREATE INDEX` and `ALTER TABLE` take:

```sql
BEGIN;
CREATE INDEX acct_bal_idx ON acct (bal);
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
ROLLBACK;
```

```sql
BEGIN;
ALTER TABLE acct ADD COLUMN note text;
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
ROLLBACK;
```

`CREATE INDEX` holds `ShareLock` on `acct` (reads go on, writes wait) and `AccessExclusiveLock` on the new index. Adding a column, even as a catalog-only change, holds `AccessExclusiveLock`: the strongest mode.

## Common mistakes

Calling `LOCK` outside a transaction:

```sql
-- ERROR 25P01: LOCK TABLE can only be used in transaction blocks
LOCK TABLE acct IN SHARE MODE;
```

Outside `BEGIN` the lock would be released as soon as the statement ends, so Postgres refuses. Open `BEGIN` first.

Reading `pg_locks` in the statement after a write:

```sql
-- WRONG: the UPDATE committed on its own, so its lock is already gone
UPDATE acct SET bal = bal + 1 WHERE id = 1;
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
```

```sql
-- FIX: keep the transaction open while you read pg_locks
BEGIN;
UPDATE acct SET bal = bal + 1 WHERE id = 1;
SELECT c.relname, l.mode
FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
WHERE c.relname LIKE 'acct%'
ORDER BY 1, 2;
ROLLBACK;
```

The wrong version returns no row: locks are held until the end of the transaction, and the `UPDATE`'s transaction is over. Inside `BEGIN` you see `RowExclusiveLock` on `acct` and `acct_pkey`.

Forgetting the mode after `LOCK`:

```sql
-- WRONG: with no IN ... MODE, LOCK takes ACCESS EXCLUSIVE and blocks every reader
BEGIN;
LOCK TABLE acct;
SELECT l.mode FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname = 'acct';
ROLLBACK;
```

```sql
-- FIX: SHARE blocks writes but lets readers through
BEGIN;
LOCK TABLE acct IN SHARE MODE;
SELECT l.mode FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname = 'acct';
ROLLBACK;
```

To reconcile balances with nobody writing in between, SHARE is enough; ACCESS EXCLUSIVE also blocks people who only read.

Setting `lock_timeout` with `SET LOCAL` outside a transaction:

```sql
-- WRONG: SET LOCAL outside a transaction block only warns and changes nothing
SET LOCAL lock_timeout = '3s';
SELECT current_setting('lock_timeout') AS lock_timeout;
```

```sql
-- FIX: inside BEGIN, SET LOCAL lasts until COMMIT or ROLLBACK
BEGIN;
SET LOCAL lock_timeout = '3s';
SELECT current_setting('lock_timeout') AS lock_timeout;
COMMIT;
```

The wrong version still shows `0` (no limit): Postgres only warns. `SET LOCAL` lives for one transaction; for the whole session use `SET`.

## Practice

Three steps. The first two read their own locks inside the same statement: each run is a fresh database, and the locks are released as soon as the statement ends. Step three sets `lock_timeout` for the whole session before a migration. Then two questions; the conflict-matrix diagram lets you try every pair.

## Recap

- All eight lock modes are table locks; ROW in a name does not mean a row lock.
- Locks are held until the end of the transaction; read `pg_locks` while it is still open.
- Only ACCESS EXCLUSIVE blocks `SELECT`, but the FIFO lock queue makes a waiting DDL command block everything behind it.
- `LOCK` with no mode is ACCESS EXCLUSIVE; pick the weakest mode that does the job.
- Before a migration: `SET lock_timeout` so the command gives up instead of freezing the application.
