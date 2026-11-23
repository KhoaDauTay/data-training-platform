---
id: e-pg-l4-11
engine: postgres
level: L4
module: locks
title: "Deadlock: Postgres phát hiện thế nào và cách phòng"
title_en: "Deadlocks: how Postgres detects them and how to prevent them"
kind: concept
runtime: docs
docs_why: sessions
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đi từng bước một deadlock hai phiên và chỉ ra chu trình chờ", en: "Walk through a two-session deadlock step by step and point to the wait cycle" }
  - { vi: "Biết Postgres phát hiện sau `deadlock_timeout` và hủy một transaction với lỗi 40P01", en: "Know that Postgres detects it after `deadlock_timeout` and aborts one transaction with error 40P01" }
  - { vi: "Phòng deadlock bằng thứ tự lock nhất quán (`ORDER BY` trước `FOR UPDATE`) và transaction ngắn", en: "Prevent deadlocks with a consistent lock order (`ORDER BY` before `FOR UPDATE`) and short transactions" }
requires: [e-pg-l4-10]
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/runtime-config-locks.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html
  - https://www.postgresql.org/docs/18/errcodes-appendix.html
viz: pg-lock-matrix
quiz:
  - q: { vi: "Hai job chuyển tiền chạy song song: job 1 chuyển 1 → 2, job 2 chuyển 2 → 1, mỗi job cập nhật tài khoản nguồn trước rồi tài khoản đích. Cách sửa gốc là gì?", en: "Two transfer jobs run in parallel: job 1 moves money 1 → 2, job 2 moves 2 → 1, each updating the source account first, then the destination. What is the root fix?" }
    options:
      - { vi: "Tăng `deadlock_timeout`", en: "Raise `deadlock_timeout`" }
      - { vi: "Luôn cập nhật tài khoản có mã nhỏ hơn trước, bất kể chiều chuyển", en: "Always update the account with the smaller id first, whatever the direction" }
      - { vi: "Chuyển sang mức cô lập Serializable", en: "Switch to Serializable isolation" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì lỗi xuất hiện trong lúc chờ lock, nên cho chờ lâu hơn có vẻ sẽ qua, nhưng thời gian chờ không gỡ được chu trình. Deadlock cần một chu trình. Khi mọi transaction lấy lock theo cùng một thứ tự, chu trình không thể hình thành. Tăng thời gian chờ chỉ làm phát hiện chậm hơn.", en: "It sounds right because the error shows up while waiting for a lock, so waiting longer seems to help, but no wait can break the cycle. A deadlock needs a cycle. When every transaction takes its locks in the same order, no cycle can form. A longer timeout only makes detection slower." }
  - q: { vi: "Postgres giải quyết deadlock thế nào?", en: "How does Postgres resolve a deadlock?" }
    options:
      - { vi: "Cả hai transaction chờ mãi", en: "Both transactions wait forever" }
      - { vi: "Sau khi chờ một lock quá `deadlock_timeout` (mặc định 1s), phiên đó kiểm tra chu trình; nếu có, một transaction bị hủy với SQLSTATE 40P01 và bên kia đi tiếp", en: "After waiting on a lock longer than `deadlock_timeout` (default 1s), that session checks for a cycle; if there is one, one transaction is aborted with SQLSTATE 40P01 and the other proceeds" }
      - { vi: "Postgres hủy transaction bắt đầu sau", en: "Postgres always aborts the transaction that started later" }
    answer: 1
    trap: 2
    why: { vi: "Nghe hợp lý vì nó giống quy tắc ai đến trước được phục vụ trước, nhưng Postgres không chọn theo thứ tự bắt đầu. Kiểm tra deadlock tốn kém nên chỉ chạy khi đã chờ đủ `deadlock_timeout`. Docs chính thức nói khó đoán trước transaction nào bị hủy, nên ứng dụng phải sẵn sàng thử lại.", en: "It sounds right because it looks like first come, first served, but Postgres does not choose by start order. Deadlock checking is expensive, so it only runs after waiting `deadlock_timeout`. The docs say which transaction is aborted is hard to predict, so the application must be ready to retry." }
---

## Mở bài

Hai job chuyển tiền chạy cùng lúc theo hai chiều ngược nhau. Khoảng một giây sau, một job bị hủy với lỗi `deadlock detected`. Ai sai, và sửa ở đâu?

## Ý chính

Deadlock là một chu trình chờ: A giữ lock X và chờ Y, trong khi B giữ Y và chờ X. Không bên nào tự thoát được. Chuyện này xảy ra với row lock, lock trên bảng và cả advisory lock.

Postgres tự phát hiện, nhưng không ngay lập tức: dò đồ thị chờ tốn công, nên chỉ phiên nào đã chờ một lock lâu hơn `deadlock_timeout` (mặc định 1 giây) mới dò. Có chu trình thì một transaction bị hủy với `ERROR: deadlock detected` (SQLSTATE 40P01), bên kia đi tiếp. Tài liệu chính thức nói khó đoán trước bên nào bị hủy.

Nhiều người nghĩ tăng `deadlock_timeout` hay đặt `lock_timeout` sẽ chữa được deadlock. Thật ra chúng chỉ đổi lúc phát hiện hoặc lúc bỏ cuộc; chu trình vẫn còn đó. Cách chữa gốc là để mọi transaction lấy lock theo cùng một thứ tự, ví dụ theo khóa chính tăng dần. Thêm hai thói quen: lấy ngay từ đầu lock mạnh nhất sẽ cần thay vì nâng cấp giữa chừng, và giữ transaction thật ngắn.

Ứng dụng vẫn phải bắt 40P01 và chạy lại cả transaction từ `BEGIN`: sau lỗi, transaction đã hỏng, mọi câu tiếp theo bị từ chối (25P02) tới khi ROLLBACK. Đừng nhầm `lock_timeout` với `deadlock_timeout`: cái đầu là giới hạn chờ của chính bạn (lỗi 55P03), cái sau chỉ là lúc bắt đầu dò chu trình.

## Cú pháp

```sql
SET deadlock_timeout = 'duration';
SET lock_timeout = 'duration';
SELECT columns FROM table_name WHERE condition ORDER BY key FOR UPDATE;
```

- `deadlock_timeout`: chờ bao lâu thì bắt đầu dò chu trình; mặc định `1s`, chỉ superuser hoặc vai trò được cấp quyền mới đổi được.
- `lock_timeout`: chờ một lock tối đa bao lâu rồi bỏ cuộc (55P03); `0` là không giới hạn.
- `ORDER BY key FOR UPDATE`: khóa trước mọi dòng sẽ sửa, theo một thứ tự cố định.

## Ví dụ

Bảng hai tài khoản; dòng 2 được chèn trước nên nằm trước dòng 1 trên trang. Hai thiết lập liên quan:

```sql
CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
INSERT INTO acct VALUES (2, 100), (1, 100);
SELECT name, setting, unit FROM pg_settings
WHERE name IN ('deadlock_timeout', 'lock_timeout')
ORDER BY name;
```

`deadlock_timeout` là `1000 ms`, `lock_timeout` là `0`: mặc định không có giới hạn chờ.

Một phiên vừa sửa dòng 1 giữ gì để người khác chờ trên đó:

```sql
BEGIN;
UPDATE acct SET bal = bal - 10 WHERE id = 1;
SELECT locktype, mode, granted FROM pg_locks
WHERE pid = pg_backend_pid() AND locktype IN ('transactionid', 'virtualxid')
ORDER BY 1;
ROLLBACK;
```

Phiên nào muốn sửa dòng 1 lúc này sẽ chờ trên lock `transactionid` đó. Chuỗi các lần chờ như vậy là đồ thị mà Postgres dò. Diễn biến hai phiên (không chạy được ở đây vì PGlite chỉ có một phiên):

```text
t1  A: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 1;   -- A locks row 1
t2  B: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 2;   -- B locks row 2
t3  A: UPDATE acct SET bal = bal + 10 WHERE id = 2;          -- A waits for B
t4  B: UPDATE acct SET bal = bal + 10 WHERE id = 1;          -- B waits for A: cycle
t4 + deadlock_timeout:
    ERROR:  deadlock detected   (SQLSTATE 40P01)
```

Cách viết không thể tạo chu trình: khóa cả hai dòng theo thứ tự mã trước khi sửa.

```sql
BEGIN;
SELECT id FROM acct WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE acct SET bal = bal - 10 WHERE id = 2;
UPDATE acct SET bal = bal + 10 WHERE id = 1;
SELECT id, bal FROM acct ORDER BY id;
ROLLBACK;
```

Job theo chiều ngược lại cũng khóa dòng 1 trước, nên nó chờ ngay ở dòng 1 khi chưa giữ gì, và không có chu trình.

## Lỗi hay gặp

Tưởng danh sách `IN` quyết định thứ tự lock:

```sql
-- WRONG: the lock order follows the scan, not the IN list (row 2 is first here)
WITH l AS (SELECT id FROM acct WHERE id IN (1, 2) FOR UPDATE)
SELECT string_agg(id::text, ' -> ') AS lock_order FROM l;
```

```sql
-- FIX: ORDER BY the key, so every job locks 1 before 2
WITH l AS (SELECT id FROM acct WHERE id IN (1, 2) ORDER BY id FOR UPDATE)
SELECT string_agg(id::text, ' -> ') AS lock_order FROM l;
```

Câu sai khóa theo thứ tự đọc trên đĩa (`2 -> 1`), thứ tự này đổi theo dữ liệu và kế hoạch. Chỉ `ORDER BY` mới bảo đảm mọi job khóa `1 -> 2`.

Tưởng `lock_timeout = 0` nghĩa là không chờ:

```sql
-- WRONG: 0 does not mean "never wait"; it turns the limit off, so a wait can last forever
SET lock_timeout = 0;
SELECT current_setting('lock_timeout') AS lock_timeout;
```

```sql
-- FIX: give a real limit (or add NOWAIT to the statement)
SET lock_timeout = '2s';
SELECT current_setting('lock_timeout') AS lock_timeout;
```

`0` là tắt giới hạn. Muốn không chờ chút nào thì dùng `NOWAIT`; muốn chờ có hạn thì đặt một khoảng thời gian thật.

## Thực hành

Bấm qua sơ đồ lock tới hai bước cuối: đồ thị chờ có vòng T1 → T2 → T1, rồi Postgres hủy một transaction (40P01). Sau đó trả lời hai câu hỏi.

## Tóm tắt

- Deadlock là chu trình chờ; Postgres chỉ dò sau `deadlock_timeout` và hủy một bên với 40P01.
- Không đoán được bên nào bị hủy: ứng dụng bắt 40P01 và chạy lại cả transaction.
- Chữa gốc bằng thứ tự lock nhất quán: `ORDER BY` khóa chính trước `FOR UPDATE`.
- `lock_timeout` giới hạn thời gian chờ của bạn (55P03); `0` là không giới hạn.

# EN

## Opening

Two money-transfer jobs run at the same time in opposite directions. About a second later, one job is aborted with the error `deadlock detected`. Who is wrong, and where is the fix?

## Key idea

A deadlock is a wait cycle: A holds lock X and waits for Y, while B holds Y and waits for X. Neither side can get out on its own. It happens with row locks, table locks and advisory locks alike.

Postgres detects it on its own, but not at once: searching the wait graph is costly, so only a session that has waited on a lock longer than `deadlock_timeout` (default 1 second) searches. If there is a cycle, one transaction is aborted with `ERROR: deadlock detected` (SQLSTATE 40P01) and the other goes on. The official docs say it is hard to predict which side is aborted.

Many people think raising `deadlock_timeout` or setting `lock_timeout` cures deadlocks. In fact they only change when the cycle is found or when a session gives up; the cycle is still there. The root fix is for every transaction to take its locks in the same order, for example by ascending primary key. Two more habits: take the strongest lock you will need up front instead of upgrading halfway, and keep transactions short.

The application must still catch 40P01 and run the whole transaction again from `BEGIN`: after the error the transaction is broken, and every later statement is refused (25P02) until ROLLBACK. Do not confuse `lock_timeout` with `deadlock_timeout`: the first is your own wait limit (error 55P03), the second only says when the cycle search starts.

## Syntax

```sql
SET deadlock_timeout = 'duration';
SET lock_timeout = 'duration';
SELECT columns FROM table_name WHERE condition ORDER BY key FOR UPDATE;
```

- `deadlock_timeout`: how long to wait before searching for a cycle; default `1s`, only a superuser or a role granted the privilege can change it.
- `lock_timeout`: the longest wait for one lock before giving up (55P03); `0` means no limit.
- `ORDER BY key FOR UPDATE`: lock every row you will change first, in a fixed order.

## Example

A table of two accounts; row 2 is inserted first, so it sits before row 1 on the page. The two related settings:

```sql
CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
INSERT INTO acct VALUES (2, 100), (1, 100);
SELECT name, setting, unit FROM pg_settings
WHERE name IN ('deadlock_timeout', 'lock_timeout')
ORDER BY name;
```

`deadlock_timeout` is `1000 ms` and `lock_timeout` is `0`: by default there is no wait limit.

What a session that just changed row 1 holds for others to wait on:

```sql
BEGIN;
UPDATE acct SET bal = bal - 10 WHERE id = 1;
SELECT locktype, mode, granted FROM pg_locks
WHERE pid = pg_backend_pid() AND locktype IN ('transactionid', 'virtualxid')
ORDER BY 1;
ROLLBACK;
```

Any session that wants to change row 1 now waits on that `transactionid` lock. A chain of such waits is the graph Postgres searches. The two sessions step by step (not runnable here, since PGlite has a single session):

```text
t1  A: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 1;   -- A locks row 1
t2  B: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 2;   -- B locks row 2
t3  A: UPDATE acct SET bal = bal + 10 WHERE id = 2;          -- A waits for B
t4  B: UPDATE acct SET bal = bal + 10 WHERE id = 1;          -- B waits for A: cycle
t4 + deadlock_timeout:
    ERROR:  deadlock detected   (SQLSTATE 40P01)
```

A way of writing it that cannot form a cycle: lock both rows in id order before changing them.

```sql
BEGIN;
SELECT id FROM acct WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE acct SET bal = bal - 10 WHERE id = 2;
UPDATE acct SET bal = bal + 10 WHERE id = 1;
SELECT id, bal FROM acct ORDER BY id;
ROLLBACK;
```

The job going the other way also locks row 1 first, so it waits right at row 1 while holding nothing, and no cycle can form.

## Common mistakes

Believing the `IN` list sets the lock order:

```sql
-- WRONG: the lock order follows the scan, not the IN list (row 2 is first here)
WITH l AS (SELECT id FROM acct WHERE id IN (1, 2) FOR UPDATE)
SELECT string_agg(id::text, ' -> ') AS lock_order FROM l;
```

```sql
-- FIX: ORDER BY the key, so every job locks 1 before 2
WITH l AS (SELECT id FROM acct WHERE id IN (1, 2) ORDER BY id FOR UPDATE)
SELECT string_agg(id::text, ' -> ') AS lock_order FROM l;
```

The wrong version locks in the order the rows are read from disk (`2 -> 1`), which changes with the data and the plan. Only `ORDER BY` guarantees that every job locks `1 -> 2`.

Believing `lock_timeout = 0` means no waiting:

```sql
-- WRONG: 0 does not mean "never wait"; it turns the limit off, so a wait can last forever
SET lock_timeout = 0;
SELECT current_setting('lock_timeout') AS lock_timeout;
```

```sql
-- FIX: give a real limit (or add NOWAIT to the statement)
SET lock_timeout = '2s';
SELECT current_setting('lock_timeout') AS lock_timeout;
```

`0` switches the limit off. To not wait at all, use `NOWAIT`; to wait a bounded time, set a real duration.

## Practice

Step through the lock diagram to its last two steps: the waits-for graph has a cycle T1 -> T2 -> T1, then Postgres aborts one transaction (40P01). Then answer two questions.

## Recap

- A deadlock is a wait cycle; Postgres only searches after `deadlock_timeout` and aborts one side with 40P01.
- Which side is aborted cannot be predicted: the application catches 40P01 and reruns the whole transaction.
- The root fix is a consistent lock order: `ORDER BY` the primary key before `FOR UPDATE`.
- `lock_timeout` caps your own wait (55P03); `0` means no limit.
