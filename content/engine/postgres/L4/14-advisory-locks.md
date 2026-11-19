---
id: e-pg-l4-14
engine: postgres
level: L4
module: locks
title: "Khóa tư vấn: khóa do ứng dụng định nghĩa"
title_en: "Advisory locks: application-defined locks"
kind: lab
runtime: browser
minutes: 12
objectives:
  - { vi: "Dùng khóa tư vấn cấp giao dịch để chỉ một worker chạy một việc", en: "Use transaction-level advisory locks so only one worker runs a job" }
  - { vi: "Phân biệt cấp phiên và cấp giao dịch, dạng chờ và dạng `try`", en: "Tell session level from transaction level, and the waiting form from the `try` form" }
  - { vi: "Tránh bẫy khóa tư vấn trong câu có `LIMIT`", en: "Avoid the advisory-lock trap in a query with `LIMIT`" }
requires: [e-pg-l4-09]
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/functions-admin.html
  - https://www.postgresql.org/docs/18/view-pg-locks.html
viz: pg-lock-matrix
lab:
  setup: |
    DROP TABLE IF EXISTS jobs CASCADE;
    CREATE TABLE jobs (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO jobs VALUES (1, 'nightly_invoices'), (2, 'cleanup'), (3, 'reindex_report');
  steps:
    - task: { vi: "Lấy khóa tư vấn cấp giao dịch số 42 (dạng chờ), rồi trong cùng câu đọc loại khóa, chế độ và `objid` của khóa tư vấn đang giữ trong `pg_locks`. Dùng CTE MATERIALIZED để khóa được lấy trước.", en: "Take transaction-level advisory lock 42 (the waiting form), then in the same statement read the lock type, mode and `objid` of the advisory lock held in `pg_locks`. Use a MATERIALIZED CTE so the lock is taken first." }
      solution: "WITH l AS MATERIALIZED (SELECT pg_advisory_xact_lock(42)) SELECT p.locktype, p.mode, p.objid FROM l CROSS JOIN LATERAL (SELECT * FROM pg_locks WHERE locktype = 'advisory') p"
      check: rows
      hint: { vi: "Hàm `pg_advisory_xact_lock(bigint)`; khóa tự nhả khi giao dịch kết thúc.", en: "The `pg_advisory_xact_lock(bigint)` function; the lock is released when the transaction ends." }
    - task: { vi: "Mỗi việc trong `jobs` dùng chính mã của nó làm số khóa. Thử lấy khóa cấp giao dịch cho từng việc mà không chờ, trả về mã việc, tên và cột got (true nếu lấy được). Sắp theo mã.", en: "Each job in `jobs` uses its own id as the lock number. Try to take a transaction-level lock for every job without waiting; return the job id, name and a column got (true if taken). Order by id." }
      solution: "SELECT id, name, pg_try_advisory_xact_lock(id) AS got FROM jobs ORDER BY id"
      check: rows
      ordered: true
      hint: { vi: "Dạng `try` trả về true/false thay vì chờ.", en: "The `try` form returns true/false instead of waiting." }
quiz:
  - q: { vi: "`SELECT pg_advisory_lock(id) FROM jobs WHERE status = 'new' LIMIT 1` có gì nguy hiểm?", en: "What is dangerous about `SELECT pg_advisory_lock(id) FROM jobs WHERE status = 'new' LIMIT 1`?" }
    options:
      - { vi: "Không gì cả", en: "Nothing" }
      - { vi: "Postgres có thể gọi hàm khóa cho nhiều dòng hơn số dòng `LIMIT` trả về, để lại khóa cấp phiên không ai biết để nhả", en: "Postgres may call the lock function on more rows than the `LIMIT` returns, leaving session-level locks that nobody knows to release" }
      - { vi: "`LIMIT` làm khóa thành cấp giao dịch", en: "`LIMIT` turns the lock into a transaction-level lock" }
    answer: 1
    why: { vi: "Tài liệu nêu đúng ví dụ này: không bảo đảm hàm khóa chỉ chạy cho dòng được trả về. Hãy chọn dòng trong truy vấn con có `LIMIT` trước, rồi mới khóa ở câu ngoài.", en: "The docs give exactly this example: nothing guarantees the lock function only runs for the returned rows. Pick the row in a sub-query with `LIMIT` first, then lock it in the outer query." }
---

## Ý chính

- Khóa tư vấn (advisory) là khóa có ý nghĩa do ứng dụng định, gắn với một số `bigint` (hoặc hai số `int`). Postgres không gắn nó với bảng nào; chỉ có những phiên cùng dùng số đó mới thấy nhau.
- Hai cấp:
  - cấp phiên (`pg_advisory_lock`): giữ tới khi gọi `pg_advisory_unlock` hoặc phiên đóng, kể cả khi giao dịch ROLLBACK;
  - cấp giao dịch (`pg_advisory_xact_lock`): tự nhả khi giao dịch kết thúc. An toàn hơn.
- Dạng `try` (`pg_try_advisory_xact_lock`) trả về true/false ngay, hợp cho "nếu worker khác đang làm thì bỏ qua".
- Có dạng chia sẻ (`…_shared`) cho nhiều người đọc cùng lúc.
- Dùng cho: chạy cron đúng một lần trên nhiều máy, tuần tự hóa migration, khóa một "tài nguyên logic" không phải một dòng.
- Khóa tư vấn hiện trong `pg_locks` với `locktype = 'advisory'`, và có thể tham gia deadlock như khóa thường.

## Ví dụ

Kết quả thật trên PGlite:

```text
locktype | mode          | objid
advisory | ExclusiveLock | 42

id | name             | got
 1 | nightly_invoices | t
 2 | cleanup          | t
 3 | reindex_report   | t
```

Cùng một phiên lấy lại khóa nó đã giữ thì vẫn được (khóa tư vấn có thể lồng). Ở phiên thứ hai, `got` sẽ là false cho mọi việc đang bị giữ (sơ đồ; PGlite chỉ có một phiên).

## Thực hành

Hai câu, mỗi câu tự kiểm khóa của mình trong một giao dịch rồi ROLLBACK. Kỹ năng chuyên gia: thiết kế "chỉ một worker chạy việc X" bằng khóa tư vấn cấp giao dịch, và tránh rò khóa cấp phiên.

# EN

## Key idea

- An advisory lock is a lock whose meaning is defined by the application, tied to a `bigint` key (or two `int` keys). Postgres does not attach it to any table; only sessions using the same key see each other.
- Two levels:
  - session level (`pg_advisory_lock`): held until `pg_advisory_unlock` is called or the session closes, even if the transaction rolls back;
  - transaction level (`pg_advisory_xact_lock`): released automatically at the end of the transaction. Safer.
- The `try` form (`pg_try_advisory_xact_lock`) returns true/false at once, which suits "skip it if another worker is on it".
- Shared forms (`…_shared`) let many readers hold the lock together.
- Uses: run a cron job exactly once across many machines, serialise migrations, lock a "logical resource" that is not a row.
- Advisory locks show in `pg_locks` with `locktype = 'advisory'` and can take part in deadlocks like ordinary locks.

## Example

Real output from PGlite:

```text
locktype | mode          | objid
advisory | ExclusiveLock | 42

id | name             | got
 1 | nightly_invoices | t
 2 | cleanup          | t
 3 | reindex_report   | t
```

The same session taking a lock it already holds succeeds again (advisory locks can stack). In a second session, `got` would be false for every job being held (a diagram; PGlite has one session).

## Practice

Two statements, each checking its own locks inside a transaction that is then rolled back. Expert skill: build "only one worker runs job X" with transaction-level advisory locks, and avoid leaking session-level locks.
