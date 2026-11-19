---
id: e-pg-l4-09
engine: postgres
level: L4
module: locks
title: "Chế độ khóa bảng và pg_locks"
title_en: "Table-level lock modes and pg_locks"
kind: lab
minutes: 20
objectives:
  - { vi: "Kể tám chế độ khóa bảng và lệnh nào lấy chế độ nào", en: "Name the eight table lock modes and which command takes which" }
  - { vi: "Đọc bảng xung đột: chế độ nào chặn chế độ nào", en: "Read the conflict table: which mode blocks which" }
  - { vi: "Thấy khóa thật mà chính câu của mình đang giữ qua `pg_locks`", en: "See the real locks your own statement holds through `pg_locks`" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/view-pg-locks.html
viz: lock-matrix
lab:
  setup: |
    DROP TABLE IF EXISTS acct CASCADE;
    CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
    INSERT INTO acct SELECT g, 100 FROM generate_series(1, 10) g;
  steps:
    - task: { vi: "Trong cùng một câu: cộng 1 vào số dư tài khoản 1 (dùng CTE có UPDATE … RETURNING), rồi liệt kê tên quan hệ và chế độ khóa trong `pg_locks` cho mọi quan hệ có tên bắt đầu bằng `acct`. Sắp theo tên rồi chế độ.", en: "In one statement: add 1 to account 1's balance (a CTE with UPDATE … RETURNING), then list the relation name and lock mode in `pg_locks` for every relation whose name starts with `acct`. Order by name, then mode." }
      solution: "WITH u AS (UPDATE acct SET bal = bal + 1 WHERE id = 1 RETURNING id) SELECT c.relname, l.mode FROM u, pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname LIKE 'acct%' ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Nối `pg_locks.relation` với `pg_class.oid`. Bài chạy trong một giao dịch rồi ROLLBACK, nên không có gì bị đổi thật.", en: "Join `pg_locks.relation` to `pg_class.oid`. The lesson runs inside a transaction that is rolled back, so nothing really changes." }
    - task: { vi: "Giống bước 1, nhưng thay UPDATE bằng việc khóa dòng tài khoản 2 để sửa sau (`SELECT … FOR UPDATE` trong CTE).", en: "Like step 1, but instead of an UPDATE, lock account 2's row for a later change (`SELECT … FOR UPDATE` inside the CTE)." }
      solution: "WITH r AS (SELECT id FROM acct WHERE id = 2 FOR UPDATE) SELECT c.relname, l.mode FROM r, pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname LIKE 'acct%' ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Khóa dòng không hiện từng dòng trong `pg_locks`; bạn chỉ thấy khóa bảng đi kèm.", en: "Row locks do not show one by one in `pg_locks`; you only see the table lock that comes with them." }
quiz:
  - q: { vi: "Phiên A đang chạy một báo cáo `SELECT` dài trên `acct`. Phiên B chạy `ALTER TABLE acct ADD COLUMN note text`. Phiên C sau đó chạy `SELECT` ngắn. Chuyện gì xảy ra?", en: "Session A runs a long reporting `SELECT` on `acct`. Session B runs `ALTER TABLE acct ADD COLUMN note text`. Session C then runs a short `SELECT`. What happens?" }
    options:
      - { vi: "Cả ba chạy song song", en: "All three run in parallel" }
      - { vi: "B chờ A (ACCESS EXCLUSIVE xung đột ACCESS SHARE), và C xếp hàng sau B, nên C cũng bị chặn dù C chỉ đọc", en: "B waits for A (ACCESS EXCLUSIVE conflicts with ACCESS SHARE), and C queues behind B, so C is blocked too even though it only reads" }
      - { vi: "B hủy A", en: "B cancels A" }
    answer: 1
    why: { vi: "Đây là sự cố \"migration làm treo cả ứng dụng\". Phòng bằng `SET lock_timeout` trước DDL để B bỏ cuộc sớm thay vì chặn mọi người.", en: "This is the \"a migration froze the whole app\" incident. Prevent it with `SET lock_timeout` before DDL so B gives up early instead of blocking everyone." }
  - q: { vi: "Lệnh nào KHÔNG chặn `INSERT`/`UPDATE` đồng thời trên bảng?", en: "Which command does NOT block concurrent `INSERT`/`UPDATE` on the table?" }
    options:
      - { vi: "`CREATE INDEX` (SHARE)", en: "`CREATE INDEX` (SHARE)" }
      - { vi: "`CREATE INDEX CONCURRENTLY` (SHARE UPDATE EXCLUSIVE)", en: "`CREATE INDEX CONCURRENTLY` (SHARE UPDATE EXCLUSIVE)" }
      - { vi: "`VACUUM FULL` (ACCESS EXCLUSIVE)", en: "`VACUUM FULL` (ACCESS EXCLUSIVE)" }
    answer: 1
    why: { vi: "SHARE xung đột ROW EXCLUSIVE (chế độ của INSERT/UPDATE/DELETE), còn SHARE UPDATE EXCLUSIVE thì không, nên tạo index concurrently không chặn ghi.", en: "SHARE conflicts with ROW EXCLUSIVE (the mode of INSERT/UPDATE/DELETE), SHARE UPDATE EXCLUSIVE does not, so a concurrent index build does not block writes." }
---

## Ý chính

Tám chế độ khóa bảng, từ yếu tới mạnh, và ví dụ lệnh lấy nó:

- ACCESS SHARE — ai lấy: `SELECT`
- ROW SHARE — ai lấy: `SELECT … FOR UPDATE/SHARE`
- ROW EXCLUSIVE — ai lấy: `INSERT`, `UPDATE`, `DELETE`, `MERGE`
- SHARE UPDATE EXCLUSIVE — ai lấy: `VACUUM`, `ANALYZE`, `CREATE INDEX CONCURRENTLY`
- SHARE — ai lấy: `CREATE INDEX`
- SHARE ROW EXCLUSIVE — ai lấy: `CREATE TRIGGER`
- EXCLUSIVE — ai lấy: `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- ACCESS EXCLUSIVE — ai lấy: `DROP TABLE`, `TRUNCATE`, `VACUUM FULL`, nhiều dạng `ALTER TABLE`

- Tên gọi đánh lừa: chế độ nào cũng là khóa bảng, chữ "ROW" không có nghĩa là khóa dòng. Chỉ bảng xung đột quyết định ai chờ ai.
- Chỉ ACCESS EXCLUSIVE chặn `SELECT` thường. Đọc không bao giờ chặn ghi thường (MVCC).
- Khóa được giữ tới cuối giao dịch. Hàng đợi khóa là FIFO: một lệnh đang chờ ACCESS EXCLUSIVE làm mọi lệnh tới sau phải chờ theo.
- `pg_locks` cho thấy khóa đang giữ và đang chờ (`granted = false`). `lock_timeout` giới hạn thời gian chờ.

Giới hạn của PGlite: chỉ có một phiên, nên không thể thấy chờ khóa thật. Bài này cho bạn thấy khóa mà câu của chính bạn đang giữ; phần "ai chờ ai" là sơ đồ.

## Ví dụ

Kết quả thật trên PGlite:

```text
UPDATE in a CTE:          acct ROW EXCLUSIVE, acct_pkey ROW EXCLUSIVE
SELECT … FOR UPDATE:       acct ROW SHARE,     acct_pkey ROW SHARE
```

Trong `pg_locks` các chế độ được viết dạng `RowExclusiveLock`, `RowShareLock`, `AccessShareLock`…

## Thực hành

Hai câu trong một giao dịch, mỗi câu tự đọc khóa của mình. Sơ đồ ma trận xung đột cho bạn bấm thử từng cặp. Kỹ năng chuyên gia: trước khi chạy một migration, nói được nó lấy khóa nào và sẽ chặn ai.

# EN

## Key idea

The eight table lock modes, from weakest to strongest, with a command that takes each:

- ACCESS SHARE — taken by: `SELECT`
- ROW SHARE — taken by: `SELECT … FOR UPDATE/SHARE`
- ROW EXCLUSIVE — taken by: `INSERT`, `UPDATE`, `DELETE`, `MERGE`
- SHARE UPDATE EXCLUSIVE — taken by: `VACUUM`, `ANALYZE`, `CREATE INDEX CONCURRENTLY`
- SHARE — taken by: `CREATE INDEX`
- SHARE ROW EXCLUSIVE — taken by: `CREATE TRIGGER`
- EXCLUSIVE — taken by: `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- ACCESS EXCLUSIVE — taken by: `DROP TABLE`, `TRUNCATE`, `VACUUM FULL`, many forms of `ALTER TABLE`

- The names mislead: every mode is a table lock, and "ROW" does not mean a row lock. Only the conflict table decides who waits for whom.
- Only ACCESS EXCLUSIVE blocks a plain `SELECT`. Reads never block ordinary writes (MVCC).
- Locks are held until the end of the transaction. The lock queue is FIFO: one command waiting for ACCESS EXCLUSIVE makes every later command wait behind it.
- `pg_locks` shows held and waiting locks (`granted = false`). `lock_timeout` caps the wait.

PGlite limit: there is only one session, so a real lock wait cannot be shown. This lesson shows the locks your own statement holds; "who waits for whom" is a diagram.

## Example

Real output from PGlite:

```text
UPDATE in a CTE:          acct ROW EXCLUSIVE, acct_pkey ROW EXCLUSIVE
SELECT … FOR UPDATE:       acct ROW SHARE,     acct_pkey ROW SHARE
```

In `pg_locks` the modes are spelled `RowExclusiveLock`, `RowShareLock`, `AccessShareLock`…

## Practice

Two statements in one transaction, each reading its own locks. The conflict-matrix diagram lets you try every pair. Expert skill: before running a migration, say which lock it takes and whom it will block.
