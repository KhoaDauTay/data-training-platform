---
id: e-pg-l4-13
engine: postgres
level: L4
module: locks
title: "SERIALIZABLE: SSI, write skew và SIReadLock"
title_en: "SERIALIZABLE: SSI, write skew and SIReadLock"
kind: concept
runtime: docs
minutes: 20
objectives:
  - { vi: "Nhận ra write skew: hai giao dịch đọc chung, ghi riêng, cùng làm hỏng một quy tắc", en: "Recognise write skew: two transactions read the same data, write different rows, and together break a rule" }
  - { vi: "Giải thích SSI: predicate lock (`SIReadLock`) không chặn ai, chỉ dùng để phát hiện và hủy với 40001", en: "Explain SSI: predicate locks (`SIReadLock`) block nobody, they only detect conflicts and abort with 40001" }
  - { vi: "Biết cái giá của SERIALIZABLE: thử lại, khóa cấp quan hệ khi Seq Scan, và cách giảm (`READ ONLY DEFERRABLE`)", en: "Know the price of SERIALIZABLE: retries, relation-level locks on a Seq Scan, and how to reduce it (`READ ONLY DEFERRABLE`)" }
requires: [e-pg-l4-12]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/view-pg-locks.html
  - https://www.postgresql.org/docs/18/applevel-consistency.html
viz: pg-isolation-anomalies
quiz:
  - q: { vi: "Quy tắc: luôn có ít nhất một bác sĩ trực. Ana và Bình cùng đang trực. Mỗi người chạy giao dịch: đếm số người trực (2), nếu ≥ 2 thì tự đặt mình nghỉ. Hai giao dịch chạy cùng lúc ở REPEATABLE READ. Kết quả?", en: "Rule: at least one doctor must be on call. Ana and Binh are both on call. Each runs a transaction: count who is on call (2), and if ≥ 2, set themselves off. Both run at the same time under REPEATABLE READ. Result?" }
    options:
      - { vi: "Một giao dịch bị lỗi 40001", en: "One transaction fails with 40001" }
      - { vi: "Cả hai commit, không còn ai trực: write skew", en: "Both commit and nobody is on call: write skew" }
      - { vi: "Deadlock", en: "A deadlock" }
    answer: 1
    why: { vi: "Hai giao dịch sửa hai dòng khác nhau nên không có xung đột ghi; snapshot isolation không thấy vấn đề. Ở SERIALIZABLE, SSI thấy chu trình phụ thuộc đọc-ghi và hủy một bên với 40001.", en: "The two transactions change two different rows, so there is no write conflict; snapshot isolation sees no problem. Under SERIALIZABLE, SSI sees the read-write dependency cycle and aborts one side with 40001." }
  - q: { vi: "Điều nào đúng về `SIReadLock`?", en: "Which is true about `SIReadLock`?" }
    options:
      - { vi: "Nó chặn mọi lệnh ghi lên dòng đã đọc", en: "It blocks every write to the rows that were read" }
      - { vi: "Nó không chặn ai và không gây deadlock; nó chỉ ghi lại ai đã đọc gì để phát hiện xung đột", en: "It blocks nobody and cannot cause a deadlock; it only records who read what, to detect conflicts" }
      - { vi: "Nó chỉ tồn tại ở READ COMMITTED", en: "It only exists under READ COMMITTED" }
    answer: 1
    why: { vi: "Tài liệu: predicate lock trong Postgres không gây chặn và không thể góp phần vào deadlock. Chúng hiện trong `pg_locks` với mode `SIReadLock`, có thể ở cấp tuple, trang hoặc cả quan hệ.", en: "The docs: predicate locks in Postgres cause no blocking and cannot play a part in a deadlock. They show in `pg_locks` with mode `SIReadLock`, at tuple, page or whole-relation level." }
  - q: { vi: "Báo cáo dài chỉ đọc cần kết quả serializable nhưng không muốn bị hủy giữa chừng. Dùng gì?", en: "A long read-only report needs a serializable result but must not be aborted halfway. What do you use?" }
    options:
      - { vi: "`SERIALIZABLE READ ONLY DEFERRABLE`", en: "`SERIALIZABLE READ ONLY DEFERRABLE`" }
      - { vi: "`READ UNCOMMITTED`", en: "`READ UNCOMMITTED`" }
      - { vi: "`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`", en: "`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`" }
    answer: 0
    why: { vi: "Giao dịch DEFERRABLE có thể chờ lúc bắt đầu cho tới khi có snapshot an toàn; sau đó nó chạy không cần predicate lock và không thể bị hủy vì xung đột serialization.", en: "A DEFERRABLE transaction may wait at its start until it gets a safe snapshot; after that it runs without predicate locks and cannot fail with a serialization error." }
---

## Ý chính

- REPEATABLE READ của Postgres là snapshot isolation. Nó chặn lost update nhưng vẫn cho write skew: hai giao dịch đọc cùng dữ liệu, mỗi bên ghi một dòng khác, kết quả chung vi phạm quy tắc mà từng bên đã kiểm tra.
- SERIALIZABLE = SSI (Serializable Snapshot Isolation): vẫn là snapshot, cộng thêm theo dõi phụ thuộc đọc-ghi giữa các giao dịch. Khi thấy một mẫu có thể gây bất thường, Postgres hủy một giao dịch với `could not serialize access …` (SQLSTATE 40001).
- Việc theo dõi dùng predicate lock, mode `SIReadLock`: không chặn ai, không gây deadlock. Mức chi tiết: tuple/trang khi đọc qua index, cả quan hệ khi Seq Scan, nên index tốt cũng giảm hủy giả.
- Quy tắc cho ứng dụng: mọi giao dịch SERIALIZABLE phải bọc trong vòng thử lại 40001; giữ giao dịch ngắn; khai `READ ONLY` khi đúng như vậy.
- Lựa chọn khác: khóa tường minh (`SELECT … FOR UPDATE` trên dòng "đại diện" cho quy tắc) hoặc ràng buộc trong DB. SSI tiện vì không cần biết trước mọi chỗ xung đột.

## Ví dụ

Ghi lại trên PGlite bằng kịch bản nhiều lệnh (một phiên, nên chỉ thấy khóa vị từ của chính mình, không thấy hủy thật):

```text
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) FROM acct;
SELECT locktype, relation::regclass::text, mode FROM pg_locks WHERE mode = 'SIReadLock';
 relation | acct | SIReadLock            -- Seq Scan: whole relation
ROLLBACK;

BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT bal FROM acct WHERE id = 3;
SELECT locktype, relation::regclass::text, page, tuple, mode FROM pg_locks WHERE mode = 'SIReadLock';
 page  | acct_pkey | 1 |   | SIReadLock  -- index page read
 tuple | acct      | 0 | 3 | SIReadLock  -- one tuple
ROLLBACK;
```

Write skew, diễn từng bước (mô phỏng có giải thích):

```text
t1  A: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t2  B: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t3  A: UPDATE doctors SET on_call = false WHERE name = 'Ana';  COMMIT;
t4  B: UPDATE doctors SET on_call = false WHERE name = 'Binh'; COMMIT;
    ERROR:  could not serialize access due to read/write dependencies among transactions  (SQLSTATE 40001)
```

Ở REPEATABLE READ, bước t4 commit được và không còn ai trực.

## Thực hành

Chạy cùng kịch bản trên sơ đồ ở REPEATABLE READ và SERIALIZABLE, rồi ba câu hỏi. Kỹ năng chuyên gia: nhận ra một quy tắc nghiệp vụ dễ bị write skew và chọn giữa SSI + thử lại, khóa tường minh hoặc ràng buộc.

# EN

## Key idea

- Postgres' REPEATABLE READ is snapshot isolation. It stops lost updates but still allows write skew: two transactions read the same data, each writes a different row, and together they break a rule each of them had checked.
- SERIALIZABLE = SSI (Serializable Snapshot Isolation): still snapshots, plus tracking of read-write dependencies between transactions. When it sees a pattern that could produce an anomaly, Postgres aborts one transaction with `could not serialize access …` (SQLSTATE 40001).
- The tracking uses predicate locks, mode `SIReadLock`: they block nobody and cannot cause deadlocks. Granularity: tuple/page when reading through an index, the whole relation on a Seq Scan, so good indexes also reduce false aborts.
- Rules for the application: wrap every SERIALIZABLE transaction in a 40001 retry loop; keep transactions short; declare `READ ONLY` when it is true.
- Alternatives: explicit locking (`SELECT … FOR UPDATE` on a row that "stands for" the rule) or a constraint in the database. SSI is handy because you do not need to know every conflict point in advance.

## Example

Captured on PGlite with a multi-statement script (one session, so it only shows its own predicate locks, never a real abort):

```text
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) FROM acct;
SELECT locktype, relation::regclass::text, mode FROM pg_locks WHERE mode = 'SIReadLock';
 relation | acct | SIReadLock            -- Seq Scan: whole relation
ROLLBACK;

BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT bal FROM acct WHERE id = 3;
SELECT locktype, relation::regclass::text, page, tuple, mode FROM pg_locks WHERE mode = 'SIReadLock';
 page  | acct_pkey | 1 |   | SIReadLock  -- index page read
 tuple | acct      | 0 | 3 | SIReadLock  -- one tuple
ROLLBACK;
```

Write skew, step by step (an explained simulation):

```text
t1  A: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t2  B: BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT count(*) FROM doctors WHERE on_call;   -- 2
t3  A: UPDATE doctors SET on_call = false WHERE name = 'Ana';  COMMIT;
t4  B: UPDATE doctors SET on_call = false WHERE name = 'Binh'; COMMIT;
    ERROR:  could not serialize access due to read/write dependencies among transactions  (SQLSTATE 40001)
```

Under REPEATABLE READ, step t4 commits and nobody is on call.

## Practice

Run the same script on the diagram under REPEATABLE READ and SERIALIZABLE, then three questions. Expert skill: spot a business rule that is open to write skew and choose between SSI + retry, explicit locking or a constraint.
