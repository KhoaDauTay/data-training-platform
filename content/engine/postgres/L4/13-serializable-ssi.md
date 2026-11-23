---
id: e-pg-l4-13
engine: postgres
level: L4
module: locks
title: "Serializable: SSI, write skew và SIReadLock"
title_en: "Serializable: SSI, write skew and SIReadLock"
kind: concept
runtime: docs
docs_why: sessions
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Nhận ra write skew: hai transaction đọc chung, ghi riêng, cùng làm hỏng một quy tắc", en: "Recognise write skew: two transactions read the same data, write different rows, and together break a rule" }
  - { vi: "Giải thích SSI: predicate lock (`SIReadLock`) không chặn ai, chỉ dùng để phát hiện và hủy với 40001", en: "Explain SSI: predicate locks (`SIReadLock`) block nobody, they only detect conflicts and abort with 40001" }
  - { vi: "Biết cái giá của Serializable: thử lại, lock cấp quan hệ khi Seq Scan, và cách giảm (index, `READ ONLY DEFERRABLE`)", en: "Know the price of Serializable: retries, relation-level locks on a Seq Scan, and how to reduce it (indexes, `READ ONLY DEFERRABLE`)" }
requires: [e-pg-l4-12]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/view-pg-locks.html
  - https://www.postgresql.org/docs/18/applevel-consistency.html
  - https://www.postgresql.org/docs/18/sql-set-transaction.html
viz: pg-isolation-anomalies
quiz:
  - q: { vi: "Quy tắc: luôn có ít nhất một bác sĩ trực. Ana và Bình cùng đang trực. Mỗi người chạy transaction: đếm số người trực (2), nếu ≥ 2 thì tự đặt mình nghỉ. Hai transaction chạy cùng lúc ở Repeatable Read. Kết quả?", en: "Rule: at least one doctor must be on call. Ana and Binh are both on call. Each runs a transaction: count who is on call (2), and if ≥ 2, set themselves off. Both run at the same time under Repeatable Read. Result?" }
    options:
      - { vi: "Một transaction bị lỗi 40001", en: "One transaction fails with 40001" }
      - { vi: "Cả hai commit, không còn ai trực: write skew", en: "Both commit and nobody is on call: write skew" }
      - { vi: "Deadlock", en: "A deadlock" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì hai transaction rõ ràng đụng nhau về logic, nhưng ở Repeatable Read Postgres chỉ báo lỗi khi hai bên ghi cùng một dòng. Hai transaction sửa hai dòng khác nhau nên không có xung đột ghi; snapshot isolation không thấy vấn đề. Ở Serializable, SSI thấy chu trình phụ thuộc đọc-ghi và hủy một bên với 40001.", en: "It sounds right because the two transactions clearly clash in logic, but at Repeatable Read Postgres only fails when both write the same row. The two transactions change two different rows, so there is no write conflict; snapshot isolation sees no problem. Under Serializable, SSI sees the read-write dependency cycle and aborts one side with 40001." }
  - q: { vi: "Điều nào đúng về `SIReadLock`?", en: "Which is true about `SIReadLock`?" }
    options:
      - { vi: "Nó chặn mọi lệnh ghi lên dòng đã đọc", en: "It blocks every write to the rows that were read" }
      - { vi: "Nó không chặn ai và không gây deadlock; nó chỉ ghi lại ai đã đọc gì để phát hiện xung đột", en: "It blocks nobody and cannot cause a deadlock; it only records who read what, to detect conflicts" }
      - { vi: "Nó chỉ tồn tại ở Read Committed", en: "It only exists under Read Committed" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì tên của nó có chữ lock, nhưng nó chỉ là dấu vết. Docs chính thức: predicate lock trong Postgres không gây chặn và không thể góp phần vào deadlock. Chúng hiện trong `pg_locks` với mode `SIReadLock`, có thể ở cấp tuple, trang hoặc cả quan hệ.", en: "It sounds right because its name contains the word lock, but it is only a marker. The docs: predicate locks in Postgres cause no blocking and cannot play a part in a deadlock. They show in `pg_locks` with mode `SIReadLock`, at tuple, page or whole-relation level." }
  - q: { vi: "Báo cáo dài chỉ đọc cần kết quả serializable nhưng không muốn bị hủy giữa chừng. Dùng gì?", en: "A long read-only report needs a serializable result but must not be aborted halfway. What do you use?" }
    options:
      - { vi: "`SERIALIZABLE READ ONLY DEFERRABLE`", en: "`SERIALIZABLE READ ONLY DEFERRABLE`" }
      - { vi: "`READ UNCOMMITTED`", en: "`READ UNCOMMITTED`" }
      - { vi: "`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`", en: "`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`" }
    answer: 0
    trap: 2
    why: { vi: "Nghe hợp lý vì khi đã khóa cả bảng thì không ai ghi xen vào được, nhưng lock đó chặn cả ứng dụng. Transaction DEFERRABLE có thể chờ lúc bắt đầu cho tới khi có snapshot an toàn; sau đó nó chạy không cần predicate lock và không thể bị hủy vì xung đột serialization.", en: "It sounds right because once the table is locked nobody can write in between, but that lock blocks the whole application. A DEFERRABLE transaction may wait at its start until it gets a safe snapshot; after that it runs without predicate locks and cannot fail with a serialization error." }
---

## Mở bài

Quy tắc của bệnh viện: luôn có ít nhất một bác sĩ trực. Ana và Bình cùng xin nghỉ một lúc, mỗi người thấy người kia vẫn trực, và cuối cùng không ai trực. Repeatable Read có chặn được chuyện này không?

## Ý chính

Repeatable Read của Postgres là snapshot isolation. Nó chặn lost update, vì hai bên không thể cùng sửa một dòng, nhưng vẫn để lọt write skew: hai transaction đọc cùng dữ liệu, mỗi bên ghi một dòng khác, và kết quả chung vi phạm quy tắc mà từng bên đã kiểm tra.

Serializable trong Postgres là SSI (Serializable Snapshot Isolation): vẫn là snapshot, cộng thêm việc theo dõi phụ thuộc đọc-ghi giữa các transaction. Khi thấy một mẫu có thể sinh bất thường, Postgres hủy một transaction với `could not serialize access …` (SQLSTATE 40001). Ứng dụng phải bọc mọi transaction Serializable trong một vòng thử lại.

Nhiều người nghĩ `SIReadLock` là một lock chặn người ghi, và luôn ở mức dòng. Thật ra nó không chặn ai và không gây deadlock; nó chỉ ghi dấu ai đã đọc gì. Mức chi tiết theo cách đọc: tuple và trang index khi đọc qua index, cả quan hệ khi Seq Scan. Lock càng thô thì càng nhiều lần hủy oan, nên index tốt cũng giảm số lần phải thử lại.

Báo cáo dài chỉ đọc nên dùng `SERIALIZABLE READ ONLY DEFERRABLE`: nó có thể chờ lúc bắt đầu tới khi có một snapshot an toàn, sau đó chạy không cần predicate lock và không bao giờ bị hủy với 40001. Lựa chọn khác cho write skew: lock tường minh (`SELECT ... FOR UPDATE` trên một dòng đại diện cho quy tắc) hoặc một ràng buộc trong database. SSI tiện vì không cần biết trước mọi chỗ xung đột.

## Cú pháp

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE [ READ ONLY [ DEFERRABLE ] ];
SET default_transaction_isolation = 'serializable';
SELECT locktype, relation::regclass, page, tuple FROM pg_locks WHERE mode = 'SIReadLock';
```

- `SERIALIZABLE`: snapshot cộng theo dõi phụ thuộc đọc-ghi; xung đột báo 40001.
- `READ ONLY`: khai báo không ghi, giúp SSI bớt việc theo dõi.
- `DEFERRABLE`: chỉ có tác dụng với `SERIALIZABLE READ ONLY`; có thể chờ lúc đầu, rồi không bao giờ bị hủy.
- `default_transaction_isolation`: dùng Serializable cho mọi transaction sau đó của phiên.

## Ví dụ

Bảng bác sĩ: Ana và Bình trực, 1.998 người khác nghỉ. Đếm người trực trong một transaction Serializable:

```sql
CREATE TABLE doctors (id int PRIMARY KEY, name text NOT NULL, on_call boolean NOT NULL);
INSERT INTO doctors VALUES (1, 'Ana', true), (2, 'Binh', true);
INSERT INTO doctors SELECT g, 'Doctor ' || g, false FROM generate_series(3, 2000) g;
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) AS on_call FROM doctors WHERE on_call;
SELECT locktype, relation::regclass::text AS rel, page, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

Seq Scan nên chỉ có một dòng `relation | doctors`: dấu đọc phủ cả bảng. Đọc một bác sĩ qua khóa chính:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT on_call FROM doctors WHERE id = 2;
SELECT locktype, relation::regclass::text AS rel, page, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

Giờ là một trang của `doctors_pkey` và một tuple (trang 0, dòng 2) của `doctors`. Báo cáo `DEFERRABLE` không để lại dấu nào:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;
SELECT count(*) AS on_call FROM doctors WHERE on_call;
SELECT count(*) AS siread_locks FROM pg_locks WHERE mode = 'SIReadLock';
COMMIT;
```

Write skew giữa hai phiên (mô phỏng có giải thích; PGlite chỉ có một phiên nên không thấy hủy thật):

```text
t1  A: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t2  B: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t3  A: UPDATE doctors SET on_call = false WHERE name = 'Ana';  COMMIT;
t4  B: UPDATE doctors SET on_call = false WHERE name = 'Binh'; COMMIT;
    ERROR:  could not serialize access due to read/write dependencies among transactions  (SQLSTATE 40001)
```

Ở Repeatable Read, bước t4 commit được và không còn ai trực.

## Lỗi hay gặp

Lọc theo cột không có index:

```sql
-- WRONG: no index on name, so the read marks the whole table and any write to doctors can abort it
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT on_call FROM doctors WHERE name = 'Binh';
SELECT locktype, relation::regclass::text AS rel, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

```sql
-- FIX: an index lets SSI mark only the index page and the one tuple it read
CREATE INDEX doctors_name_idx ON doctors (name);
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT on_call FROM doctors WHERE name = 'Binh';
SELECT locktype, relation::regclass::text AS rel, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

Cùng một câu, cùng một kết quả, nhưng không có index thì dấu đọc phủ cả bảng: bất kỳ ai sửa bất kỳ bác sĩ nào cũng có thể làm transaction này bị hủy oan.

Tưởng `BEGIN ISOLATION LEVEL` đổi mức cho cả phiên:

```sql
-- WRONG: BEGIN ISOLATION LEVEL sets only that transaction; the next one is read committed again
BEGIN ISOLATION LEVEL SERIALIZABLE;
COMMIT;
SHOW transaction_isolation;
```

```sql
-- FIX: set the session default when every transaction must be serializable
SET default_transaction_isolation = 'serializable';
SHOW transaction_isolation;
```

SSI chỉ bảo vệ khi mọi transaction tham gia đều chạy Serializable; một transaction lọt về Read Committed thì không được theo dõi.

Ghi trong báo cáo `DEFERRABLE`:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;
-- ERROR 25006: cannot execute UPDATE in a read-only transaction
UPDATE doctors SET on_call = true WHERE id = 3;
```

`DEFERRABLE` chỉ dành cho transaction chỉ đọc; phần ghi phải là một transaction Serializable thường, có vòng thử lại.

## Thực hành

Trên sơ đồ mức cô lập, xem bước write skew (hai bác sĩ trực): Repeatable Read để lọt, Serializable hủy một bên với 40001. Sau đó là ba câu hỏi.

## Tóm tắt

- Repeatable Read chặn lost update nhưng để lọt write skew; Serializable (SSI) hủy một bên với 40001.
- `SIReadLock` không chặn ai, chỉ ghi dấu đọc; Seq Scan tạo dấu cả bảng, index cho dấu nhỏ hơn và ít hủy oan hơn.
- Mọi transaction Serializable cần vòng thử lại 40001, và mọi bên tham gia phải cùng chạy Serializable.
- Báo cáo dài: `SERIALIZABLE READ ONLY DEFERRABLE`, không bao giờ bị hủy.

# EN

## Opening

The hospital's rule: at least one doctor is always on call. Ana and Binh ask for the night off at the same moment, each sees the other is still on call, and in the end nobody is. Does Repeatable Read stop this?

## Key idea

Postgres' Repeatable Read is snapshot isolation. It stops lost updates, because two sides cannot both change one row, but it still lets write skew through: two transactions read the same data, each writes a different row, and together they break a rule each of them had checked.

Serializable in Postgres is SSI (Serializable Snapshot Isolation): still snapshots, plus tracking of read-write dependencies between transactions. When it sees a pattern that could produce an anomaly, Postgres aborts one transaction with `could not serialize access …` (SQLSTATE 40001). The application must wrap every Serializable transaction in a retry loop.

Many people think `SIReadLock` is a lock that blocks writers, and that it is always row-level. In fact it blocks nobody and cannot cause a deadlock; it only marks who read what. Its granularity follows how the data was read: a tuple and an index page when reading through an index, the whole relation on a Seq Scan. The coarser the mark, the more false aborts, so good indexes also cut the number of retries.

A long read-only report should use `SERIALIZABLE READ ONLY DEFERRABLE`: it may wait at its start until it gets a safe snapshot, then runs without predicate locks and is never aborted with 40001. Other answers to write skew: explicit locking (`SELECT ... FOR UPDATE` on a row that stands for the rule) or a constraint in the database. SSI is handy because you do not need to know every conflict point in advance.

## Syntax

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE [ READ ONLY [ DEFERRABLE ] ];
SET default_transaction_isolation = 'serializable';
SELECT locktype, relation::regclass, page, tuple FROM pg_locks WHERE mode = 'SIReadLock';
```

- `SERIALIZABLE`: a snapshot plus read-write dependency tracking; a conflict raises 40001.
- `READ ONLY`: declares no writes, which saves SSI some tracking.
- `DEFERRABLE`: only matters for `SERIALIZABLE READ ONLY`; may wait at the start, then is never aborted.
- `default_transaction_isolation`: makes every later transaction of the session Serializable.

## Example

A doctors table: Ana and Binh on call, 1,998 others off. Count who is on call in a Serializable transaction:

```sql
CREATE TABLE doctors (id int PRIMARY KEY, name text NOT NULL, on_call boolean NOT NULL);
INSERT INTO doctors VALUES (1, 'Ana', true), (2, 'Binh', true);
INSERT INTO doctors SELECT g, 'Doctor ' || g, false FROM generate_series(3, 2000) g;
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) AS on_call FROM doctors WHERE on_call;
SELECT locktype, relation::regclass::text AS rel, page, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

A Seq Scan, so there is a single `relation | doctors` row: the read mark covers the whole table. Read one doctor through the primary key:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT on_call FROM doctors WHERE id = 2;
SELECT locktype, relation::regclass::text AS rel, page, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

Now it is one page of `doctors_pkey` and one tuple (page 0, item 2) of `doctors`. A `DEFERRABLE` report leaves no mark at all:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;
SELECT count(*) AS on_call FROM doctors WHERE on_call;
SELECT count(*) AS siread_locks FROM pg_locks WHERE mode = 'SIReadLock';
COMMIT;
```

Write skew between two sessions (an explained simulation; PGlite has a single session, so no real abort shows):

```text
t1  A: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t2  B: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t3  A: UPDATE doctors SET on_call = false WHERE name = 'Ana';  COMMIT;
t4  B: UPDATE doctors SET on_call = false WHERE name = 'Binh'; COMMIT;
    ERROR:  could not serialize access due to read/write dependencies among transactions  (SQLSTATE 40001)
```

Under Repeatable Read, step t4 commits and nobody is on call.

## Common mistakes

Filtering on a column with no index:

```sql
-- WRONG: no index on name, so the read marks the whole table and any write to doctors can abort it
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT on_call FROM doctors WHERE name = 'Binh';
SELECT locktype, relation::regclass::text AS rel, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

```sql
-- FIX: an index lets SSI mark only the index page and the one tuple it read
CREATE INDEX doctors_name_idx ON doctors (name);
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT on_call FROM doctors WHERE name = 'Binh';
SELECT locktype, relation::regclass::text AS rel, tuple
FROM pg_locks WHERE mode = 'SIReadLock' ORDER BY 1, 2;
COMMIT;
```

Same query, same result, but without the index the read mark covers the whole table: anyone changing any doctor can make this transaction fail for nothing.

Believing `BEGIN ISOLATION LEVEL` changes the level for the whole session:

```sql
-- WRONG: BEGIN ISOLATION LEVEL sets only that transaction; the next one is read committed again
BEGIN ISOLATION LEVEL SERIALIZABLE;
COMMIT;
SHOW transaction_isolation;
```

```sql
-- FIX: set the session default when every transaction must be serializable
SET default_transaction_isolation = 'serializable';
SHOW transaction_isolation;
```

SSI only protects you when every transaction involved runs Serializable; one that slips back to Read Committed is not tracked.

Writing in a `DEFERRABLE` report:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;
-- ERROR 25006: cannot execute UPDATE in a read-only transaction
UPDATE doctors SET on_call = true WHERE id = 3;
```

`DEFERRABLE` is for read-only transactions only; the write must be an ordinary Serializable transaction with a retry loop.

## Practice

On the isolation diagram, read the write-skew step (two doctors on call): Repeatable Read lets it through, Serializable aborts one side with 40001. Then three questions.

## Recap

- Repeatable Read stops lost updates but lets write skew through; Serializable (SSI) aborts one side with 40001.
- `SIReadLock` blocks nobody, it only marks reads; a Seq Scan marks the whole table, an index gives a smaller mark and fewer false aborts.
- Every Serializable transaction needs a 40001 retry loop, and every transaction involved must run Serializable.
- Long reports: `SERIALIZABLE READ ONLY DEFERRABLE`, never aborted.
