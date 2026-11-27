---
id: e-pg-l4-14
engine: postgres
level: L4
module: locks
title: "Advisory lock: lock do ứng dụng định nghĩa"
title_en: "Advisory locks: application-defined locks"
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Dùng advisory lock cấp transaction để chỉ một worker chạy một việc", en: "Use transaction-level advisory locks so only one worker runs a job" }
  - { vi: "Phân biệt cấp phiên và cấp transaction, dạng chờ và dạng `try`", en: "Tell session level from transaction level, and the waiting form from the `try` form" }
  - { vi: "Tránh bẫy advisory lock trong câu có `LIMIT`", en: "Avoid the advisory-lock trap in a query with `LIMIT`" }
requires: [e-pg-l4-09]
sources:
  - { url: https://www.postgresql.org/docs/18/explicit-locking.html, title_vi: "Khóa tường minh" }
  - { url: https://www.postgresql.org/docs/18/functions-admin.html, title_vi: "Hàm quản trị hệ thống" }
  - { url: https://www.postgresql.org/docs/18/view-pg-locks.html, title_vi: "pg_locks" }
viz: pg-lock-matrix
lab:
  setup: |
    DROP TABLE IF EXISTS jobs CASCADE;
    CREATE TABLE jobs (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO jobs VALUES (1, 'nightly_invoices'), (2, 'cleanup'), (3, 'reindex_report');
  steps:
    - task: { vi: "Lấy advisory lock cấp transaction số 42 (dạng chờ), rồi trong cùng câu đọc loại lock, chế độ và `objid` của advisory lock đang giữ trong `pg_locks`. Dùng CTE MATERIALIZED để lock được lấy trước.", en: "Take transaction-level advisory lock 42 (the waiting form), then in the same statement read the lock type, mode and `objid` of the advisory lock held in `pg_locks`. Use a MATERIALIZED CTE so the lock is taken first." }
      solution: "WITH l AS MATERIALIZED (SELECT pg_advisory_xact_lock(42)) SELECT p.locktype, p.mode, p.objid FROM l CROSS JOIN LATERAL (SELECT * FROM pg_locks WHERE locktype = 'advisory') p"
      check: rows
      hint: { vi: "Hàm `pg_advisory_xact_lock(bigint)`; lock tự nhả khi transaction kết thúc.", en: "The `pg_advisory_xact_lock(bigint)` function; the lock is released when the transaction ends." }
    - task: { vi: "Mỗi việc trong `jobs` dùng chính mã của nó làm số của lock. Thử lấy lock cấp transaction cho từng việc mà không chờ, trả về mã việc, tên và cột got (true nếu lấy được). Sắp theo mã.", en: "Each job in `jobs` uses its own id as the lock number. Try to take a transaction-level lock for every job without waiting; return the job id, name and a column got (true if taken). Order by id." }
      solution: "SELECT id, name, pg_try_advisory_xact_lock(id) AS got FROM jobs ORDER BY id"
      check: rows
      ordered: true
      hint: { vi: "Dạng `try` trả về true/false thay vì chờ.", en: "The `try` form returns true/false instead of waiting." }
    - task: { vi: "Một worker chỉ nhận một việc: việc có mã nhỏ nhất. Chọn nó trong một truy vấn con có `LIMIT 1`, rồi ở câu ngoài thử lấy lock cấp transaction cho đúng việc đó mà không chờ. Trả về mã việc và cột got.", en: "A worker takes one job only: the one with the smallest id. Pick it in a sub-query with `LIMIT 1`, then in the outer query try to take a transaction-level lock on that job without waiting. Return the job id and a column got." }
      solution: "SELECT id, pg_try_advisory_xact_lock(id) AS got FROM (SELECT id FROM jobs ORDER BY id LIMIT 1) j"
      check: rows
      hint: { vi: "`LIMIT` nằm trong truy vấn con, hàm lock nằm ở câu ngoài; như vậy hàm chỉ chạy cho dòng đã được chọn.", en: "`LIMIT` goes in the sub-query and the lock function in the outer query; that way the function only runs for the row already picked." }
quiz:
  - q: { vi: "`SELECT pg_advisory_lock(id) FROM jobs WHERE status = 'new' LIMIT 1` có gì nguy hiểm?", en: "What is dangerous about `SELECT pg_advisory_lock(id) FROM jobs WHERE status = 'new' LIMIT 1`?" }
    options:
      - { vi: "Không gì cả", en: "Nothing" }
      - { vi: "Postgres có thể gọi hàm lock cho nhiều dòng hơn số dòng `LIMIT` trả về, để lại lock cấp phiên không ai biết để nhả", en: "Postgres may call the lock function on more rows than the `LIMIT` returns, leaving session-level locks that nobody knows to release" }
      - { vi: "`LIMIT` làm lock thành cấp transaction", en: "`LIMIT` turns the lock into a transaction-level lock" }
    answer: 1
    trap: 0
    why: { vi: "\"Không gì cả\" nghe hợp lý vì `LIMIT` chỉ trả một dòng, nhưng `LIMIT` chỉ cắt số dòng trả về, không cắt số lần hàm trong danh sách SELECT được gọi: tùy kế hoạch, Postgres có thể tính hàm cho vài dòng trước khi dừng. Docs chính thức nêu đúng ví dụ này. Mỗi lần gọi thừa để lại một lock cấp phiên trên một việc mà ứng dụng không biết mình đang giữ, nên không ai nhả; `LIMIT` không đổi cấp của lock. Hãy chọn dòng trong truy vấn con có `LIMIT` trước, rồi mới lấy lock ở câu ngoài.", en: "\"Nothing\" sounds right because `LIMIT` returns one row, but `LIMIT` only cuts the rows returned, not the number of times a function in the SELECT list is called: depending on the plan, Postgres may evaluate it for several rows before stopping. The docs give exactly this example. Each extra call leaves a session-level lock on a job the application does not know it holds, so nobody releases it; `LIMIT` does not change the lock's level. Pick the row in a sub-query with `LIMIT` first, then take the lock in the outer query." }
  - q: { vi: "Worker gọi `pg_advisory_lock(7)` trong một transaction, gặp lỗi và ROLLBACK, rồi tiếp tục dùng cùng kết nối. Lock 7 thế nào?", en: "A worker calls `pg_advisory_lock(7)` inside a transaction, hits an error and rolls back, then keeps using the same connection. What about lock 7?" }
    options:
      - { vi: "Đã nhả, vì ROLLBACK hủy mọi thứ transaction làm", en: "Released, because ROLLBACK undoes everything the transaction did" }
      - { vi: "Vẫn được giữ: lock cấp phiên sống tới `pg_advisory_unlock` hoặc tới khi phiên đóng, bất kể ROLLBACK", en: "Still held: a session-level lock lives until `pg_advisory_unlock` or until the session closes, whatever the ROLLBACK" }
      - { vi: "Bị nâng thành lock trên bảng", en: "It is escalated to a table lock" }
    answer: 1
    trap: 0
    why: { vi: "\"Đã nhả\" nghe hợp lý vì ROLLBACK hủy mọi thay đổi dữ liệu của transaction, nhưng `pg_advisory_lock` là lock cấp phiên: nó thuộc về kết nối, không thuộc transaction, nên ROLLBACK không đụng tới nó. Advisory lock cũng không gắn với bảng nào, nên không có chuyện nâng thành lock bảng. Với connection pool, kết nối được trả về pool mà vẫn giữ lock, và việc số 7 bị lock mãi tới khi kết nối đóng. Dùng `pg_advisory_xact_lock` để lock tự nhả khi transaction kết thúc.", en: "\"Released\" sounds right because ROLLBACK undoes every data change of the transaction, but `pg_advisory_lock` is a session-level lock: it belongs to the connection, not the transaction, so ROLLBACK does not touch it. An advisory lock is not tied to any table either, so it cannot be escalated to a table lock. With a connection pool, the connection goes back to the pool still holding the lock, and job 7 stays locked until the connection closes. Use `pg_advisory_xact_lock` so the lock is released when the transaction ends." }
---

## Mở bài

Ba máy chủ cùng chạy một cron lúc nửa đêm, và hóa đơn đêm đó bị gửi ba lần. Không có dòng nào để lock, vì "việc gửi hóa đơn" không phải một dòng trong bảng. Làm sao để chỉ một máy được chạy?

## Ý chính

Advisory lock là lock mà ý nghĩa do ứng dụng quyết định, gắn với một số `bigint` (hoặc hai số `int`). Postgres không gắn nó với bảng hay dòng nào; chỉ các phiên dùng cùng con số mới thấy nhau. Nó dùng để chạy cron đúng một lần trên nhiều máy, tuần tự hóa migration, hay giữ một "tài nguyên logic" không phải là dòng.

Có hai cấp. Cấp transaction (`pg_advisory_xact_lock`) tự nhả khi transaction kết thúc, nên an toàn hơn. Cấp phiên (`pg_advisory_lock`) giữ tới khi gọi `pg_advisory_unlock` hoặc phiên đóng. Dạng `try` trả về true/false ngay thay vì chờ, hợp cho "nếu worker khác đang làm thì bỏ qua". Dạng `_shared` cho nhiều người giữ cùng lúc.

Nhiều người nghĩ ROLLBACK nhả mọi lock, và gọi unlock một lần là xong. Thật ra lock cấp phiên không thuộc transaction nào nên ROLLBACK không đụng tới nó; và cùng một phiên lấy một lock nhiều lần thì nó được đếm chồng, phải unlock đủ số lần mới nhả.

Advisory lock hiện trong `pg_locks` với `locktype = 'advisory'` và có thể tham gia deadlock như lock thường. Một bẫy nữa trong tài liệu chính thức: đặt hàm lock trong câu có `LIMIT` không bảo đảm hàm chỉ chạy cho các dòng được trả về; hãy chọn dòng trong truy vấn con trước, rồi mới lấy lock ở câu ngoài.

## Cú pháp

```sql
SELECT pg_advisory_xact_lock(key);
SELECT pg_try_advisory_xact_lock(key);
SELECT pg_advisory_lock(key);
SELECT pg_advisory_unlock(key);
SELECT pg_advisory_unlock_all();
```

- `key`: một `bigint`, hoặc hai `int` (`key1, key2`).
- `_xact_`: cấp transaction, tự nhả; không có thì là cấp phiên.
- `try`: không chờ, trả về true/false.
- `_shared`: dạng chia sẻ, ví dụ `pg_advisory_xact_lock_shared(key)`.
- `pg_advisory_unlock_all()`: nhả mọi lock cấp phiên của phiên này.

## Ví dụ

Dạng hai khóa: số đầu là loại việc, số sau là mã việc.

```sql
SELECT pg_try_advisory_lock(1, 42) AS got;
SELECT classid, objid, objsubid FROM pg_locks WHERE locktype = 'advisory';
```

`classid` 1, `objid` 42, `objsubid` 2 (2 nghĩa là dạng hai khóa). Nhả nó, rồi thử nhả lần nữa:

```sql
SELECT pg_advisory_unlock(1, 42) AS first, pg_advisory_unlock(1, 42) AS second;
```

Lần đầu `true`; lần sau `false` kèm một cảnh báo, không phải lỗi: nhả một lock không giữ không làm câu thất bại, nên đừng dựa vào lỗi để phát hiện.

## Lỗi hay gặp

Lấy lock cấp phiên hai lần, nhả một lần:

```sql
SELECT pg_advisory_lock(42);
SELECT pg_advisory_lock(42);
SELECT pg_advisory_unlock(42);
-- WRONG: the lock was taken twice, so one unlock leaves it held
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

```sql
-- FIX: unlock as many times as you locked
SELECT pg_advisory_unlock(42);
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

Lock cấp phiên được đếm chồng. Hàm nào lấy lock thì cũng phải nhả đúng số lần.

Tin rằng ROLLBACK nhả lock cấp phiên:

```sql
-- WRONG: a session-level lock outlives the ROLLBACK
BEGIN;
SELECT pg_advisory_lock(7);
ROLLBACK;
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

```sql
-- FIX: clean up, then use the transaction-level form, which goes away with the transaction
SELECT pg_advisory_unlock_all();
BEGIN;
SELECT pg_advisory_xact_lock(7);
ROLLBACK;
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

Câu sai còn 1 lock sau ROLLBACK; câu sửa còn 0.

Dùng tên việc làm khóa:

```sql
-- ERROR 22P02: invalid input syntax for type bigint: "nightly_invoices"
SELECT pg_advisory_lock('nightly_invoices');
```

Khóa phải là số. Muốn dùng tên thì đổi tên thành số, ví dụ `hashtext('nightly_invoices')`, và nhớ rằng hai tên khác nhau có thể ra cùng một số.

## Thực hành

Ba bước, mỗi bước là một câu: lấy lock 42 rồi đọc nó trong `pg_locks`, thử lấy lock cho mọi việc, rồi nhận đúng một việc bằng truy vấn con có `LIMIT`. Mỗi câu là một transaction riêng, nên lock cấp transaction nhả ngay khi câu xong. Sau đó là hai câu hỏi.

## Tóm tắt

- Advisory lock gắn với một con số do ứng dụng chọn, không với bảng hay dòng.
- Ưu tiên cấp transaction (`pg_advisory_xact_lock`): tự nhả, kể cả khi ROLLBACK.
- Lock cấp phiên sống qua ROLLBACK và được đếm chồng; nhả đủ số lần hoặc dùng `pg_advisory_unlock_all()`.
- Dạng `try` để bỏ qua việc người khác đang làm; chọn dòng bằng `LIMIT` trong truy vấn con rồi mới lấy lock.

# EN

## Opening

Three servers run the same cron job at midnight, and that night's invoices go out three times. There is no row to lock, because "sending invoices" is not a row in a table. How do you let only one server run it?

## Key idea

An advisory lock is a lock whose meaning the application decides, tied to a `bigint` key (or two `int` keys). Postgres does not attach it to any table or row; only sessions using the same number see each other. It is used to run a cron job exactly once across many machines, to serialise migrations, or to hold a "logical resource" that is not a row.

There are two levels. Transaction level (`pg_advisory_xact_lock`) is released automatically when the transaction ends, so it is safer. Session level (`pg_advisory_lock`) is held until `pg_advisory_unlock` is called or the session closes. The `try` form returns true/false at once instead of waiting, which suits "skip it if another worker is on it". The `_shared` forms let many holders share the lock.

Many people think ROLLBACK releases every lock, and that one unlock call is enough. In fact a session-level lock belongs to no transaction, so ROLLBACK does not touch it; and when one session takes the same lock several times it is counted, so it must be unlocked as many times before it is released.

Advisory locks show in `pg_locks` with `locktype = 'advisory'` and can take part in deadlocks like ordinary locks. One more trap from the official docs: a lock function in a query with `LIMIT` is not guaranteed to run only for the returned rows; pick the row in a sub-query first, then lock it in the outer query.

## Syntax

```sql
SELECT pg_advisory_xact_lock(key);
SELECT pg_try_advisory_xact_lock(key);
SELECT pg_advisory_lock(key);
SELECT pg_advisory_unlock(key);
SELECT pg_advisory_unlock_all();
```

- `key`: one `bigint`, or two `int` (`key1, key2`).
- `_xact_`: transaction level, released automatically; without it, session level.
- `try`: does not wait, returns true/false.
- `_shared`: the shared form, for example `pg_advisory_xact_lock_shared(key)`.
- `pg_advisory_unlock_all()`: releases every session-level lock of this session.

## Example

The two-key form: the first number is the kind of job, the second the job id.

```sql
SELECT pg_try_advisory_lock(1, 42) AS got;
SELECT classid, objid, objsubid FROM pg_locks WHERE locktype = 'advisory';
```

`classid` 1, `objid` 42, `objsubid` 2 (2 means the two-key form). Release it, then try to release it again:

```sql
SELECT pg_advisory_unlock(1, 42) AS first, pg_advisory_unlock(1, 42) AS second;
```

The first is `true`; the second is `false` with a warning, not an error: releasing a lock you do not hold does not fail the statement, so do not rely on an error to notice it.

## Common mistakes

Taking a session-level lock twice and releasing it once:

```sql
SELECT pg_advisory_lock(42);
SELECT pg_advisory_lock(42);
SELECT pg_advisory_unlock(42);
-- WRONG: the lock was taken twice, so one unlock leaves it held
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

```sql
-- FIX: unlock as many times as you locked
SELECT pg_advisory_unlock(42);
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

Session-level locks are counted. Whatever code takes a lock must release it the same number of times.

Believing ROLLBACK releases a session-level lock:

```sql
-- WRONG: a session-level lock outlives the ROLLBACK
BEGIN;
SELECT pg_advisory_lock(7);
ROLLBACK;
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

```sql
-- FIX: clean up, then use the transaction-level form, which goes away with the transaction
SELECT pg_advisory_unlock_all();
BEGIN;
SELECT pg_advisory_xact_lock(7);
ROLLBACK;
SELECT count(*) AS still_held FROM pg_locks WHERE locktype = 'advisory';
```

The wrong version still has 1 lock after the ROLLBACK; the fixed one has 0.

Using the job name as the key:

```sql
-- ERROR 22P02: invalid input syntax for type bigint: "nightly_invoices"
SELECT pg_advisory_lock('nightly_invoices');
```

The key must be a number. To use a name, turn it into a number, for example `hashtext('nightly_invoices')`, and remember that two different names can map to the same number.

## Practice

Three steps, one statement each: take lock 42 and read it in `pg_locks`, try to lock every job, then claim exactly one job with a sub-query that holds the `LIMIT`. Each statement is its own transaction, so transaction-level locks are released as soon as it ends. Then two questions.

## Recap

- An advisory lock is tied to a number the application picks, not to a table or a row.
- Prefer transaction level (`pg_advisory_xact_lock`): it releases itself, ROLLBACK included.
- Session-level locks survive ROLLBACK and are counted; release them as many times or use `pg_advisory_unlock_all()`.
- Use the `try` form to skip work someone else is doing; pick the row with `LIMIT` in a sub-query, then lock it.
