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
objectives:
  - { vi: "Nhận ra write skew: hai transaction đọc chung, ghi riêng, cùng làm hỏng một quy tắc", en: "Recognise write skew: two transactions read the same data, write different rows, and together break a rule" }
  - { vi: "Giải thích SSI: predicate lock (`SIReadLock`) không chặn ai, chỉ dùng để phát hiện và hủy với 40001", en: "Explain SSI: predicate locks (`SIReadLock`) block nobody, they only detect conflicts and abort with 40001" }
  - { vi: "Biết cái giá của Serializable: thử lại, lock cấp quan hệ khi Seq Scan, và cách giảm (`READ ONLY DEFERRABLE`)", en: "Know the price of Serializable: retries, relation-level locks on a Seq Scan, and how to reduce it (`READ ONLY DEFERRABLE`)" }
requires: [e-pg-l4-12]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/view-pg-locks.html
  - https://www.postgresql.org/docs/18/applevel-consistency.html
viz: pg-isolation-anomalies
quiz:
  - q: { vi: "Quy tắc: luôn có ít nhất một bác sĩ trực. Ana và Bình cùng đang trực. Mỗi người chạy transaction: đếm số người trực (2), nếu ≥ 2 thì tự đặt mình nghỉ. Hai transaction chạy cùng lúc ở Repeatable Read. Kết quả?", en: "Rule: at least one doctor must be on call. Ana and Binh are both on call. Each runs a transaction: count who is on call (2), and if ≥ 2, set themselves off. Both run at the same time under Repeatable Read. Result?" }
    options:
      - { vi: "Một transaction bị lỗi 40001", en: "One transaction fails with 40001" }
      - { vi: "Cả hai commit, không còn ai trực: write skew", en: "Both commit and nobody is on call: write skew" }
      - { vi: "Deadlock", en: "A deadlock" }
    answer: 1
    why: { vi: "Lỗi 40001 nghe hợp lý vì hai transaction rõ ràng đụng nhau về logic, nhưng ở Repeatable Read Postgres chỉ báo lỗi khi hai bên ghi cùng một dòng. Hai transaction sửa hai dòng khác nhau nên không có xung đột ghi; snapshot isolation không thấy vấn đề. Ở Serializable, SSI thấy chu trình phụ thuộc đọc-ghi và hủy một bên với 40001.", en: "A 40001 error sounds right because the two transactions clearly clash in logic, but at Repeatable Read Postgres only fails when both write the same row. The two transactions change two different rows, so there is no write conflict; snapshot isolation sees no problem. Under Serializable, SSI sees the read-write dependency cycle and aborts one side with 40001." }
  - q: { vi: "Điều nào đúng về `SIReadLock`?", en: "Which is true about `SIReadLock`?" }
    options:
      - { vi: "Nó chặn mọi lệnh ghi lên dòng đã đọc", en: "It blocks every write to the rows that were read" }
      - { vi: "Nó không chặn ai và không gây deadlock; nó chỉ ghi lại ai đã đọc gì để phát hiện xung đột", en: "It blocks nobody and cannot cause a deadlock; it only records who read what, to detect conflicts" }
      - { vi: "Nó chỉ tồn tại ở Read Committed", en: "It only exists under Read Committed" }
    answer: 1
    why: { vi: "Tên có chữ lock nên dễ nghĩ `SIReadLock` chặn lệnh ghi, nhưng nó chỉ là dấu vết. Docs chính thức: predicate lock trong Postgres không gây chặn và không thể góp phần vào deadlock. Chúng hiện trong `pg_locks` với mode `SIReadLock`, có thể ở cấp tuple, trang hoặc cả quan hệ.", en: "With lock in its name, `SIReadLock` is easy to read as something that blocks writes, but it is only a marker. The docs: predicate locks in Postgres cause no blocking and cannot play a part in a deadlock. They show in `pg_locks` with mode `SIReadLock`, at tuple, page or whole-relation level." }
  - q: { vi: "Báo cáo dài chỉ đọc cần kết quả serializable nhưng không muốn bị hủy giữa chừng. Dùng gì?", en: "A long read-only report needs a serializable result but must not be aborted halfway. What do you use?" }
    options:
      - { vi: "`SERIALIZABLE READ ONLY DEFERRABLE`", en: "`SERIALIZABLE READ ONLY DEFERRABLE`" }
      - { vi: "`READ UNCOMMITTED`", en: "`READ UNCOMMITTED`" }
      - { vi: "`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`", en: "`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`" }
    answer: 0
    why: { vi: "Lấy lock ACCESS EXCLUSIVE trên cả bảng nghe chắc ăn vì không ai ghi xen vào được, nhưng nó chặn cả ứng dụng. Transaction DEFERRABLE có thể chờ lúc bắt đầu cho tới khi có snapshot an toàn; sau đó nó chạy không cần predicate lock và không thể bị hủy vì xung đột serialization.", en: "Taking an ACCESS EXCLUSIVE lock on the table sounds safe because nobody can write in between, but it blocks the whole application. A DEFERRABLE transaction may wait at its start until it gets a safe snapshot; after that it runs without predicate locks and cannot fail with a serialization error." }
---

## Ý chính

Hai bác sĩ cùng xin nghỉ, mỗi người thấy "còn người kia trực", và cuối cùng không ai trực: Repeatable Read có chặn được không?

- Repeatable Read của Postgres là snapshot isolation. Nó chặn lost update nhưng vẫn cho write skew: hai transaction đọc cùng dữ liệu, mỗi bên ghi một dòng khác, kết quả chung vi phạm quy tắc mà từng bên đã kiểm tra.
- Serializable = SSI (Serializable Snapshot Isolation): vẫn là snapshot, cộng thêm theo dõi phụ thuộc đọc-ghi giữa các transaction. Khi thấy một mẫu có thể gây bất thường, Postgres hủy một transaction với `could not serialize access …` (SQLSTATE 40001).
- Việc theo dõi dùng predicate lock, mode `SIReadLock`: không chặn ai, không gây deadlock. Mức chi tiết: tuple/trang khi đọc qua index, cả quan hệ khi Seq Scan, nên index tốt cũng giảm hủy giả.
- Báo cáo dài chỉ đọc: `BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE`. Transaction `DEFERRABLE` có thể chờ lúc bắt đầu tới khi có một snapshot an toàn; sau đó nó chạy không cần predicate lock và không bao giờ bị hủy với 40001.

## Ví dụ

Ghi lại trên PGlite bằng kịch bản nhiều lệnh (một phiên, nên chỉ thấy predicate lock của chính mình, không thấy hủy thật):

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

Ở Repeatable Read, bước t4 commit được và không còn ai trực.

## Thực hành

Quy tắc cho ứng dụng: mọi transaction Serializable phải bọc trong vòng thử lại 40001; giữ transaction ngắn; khai `READ ONLY` khi đúng như vậy.

Chạy thật cần nhiều phiên cùng lúc trên một server Postgres; PGlite chỉ có một phiên. Bài này dùng sơ đồ và kết quả ghi sẵn.

Lựa chọn khác: lock tường minh (`SELECT … FOR UPDATE` trên dòng "đại diện" cho quy tắc) hoặc ràng buộc trong DB. SSI tiện vì không cần biết trước mọi chỗ xung đột.

Trên sơ đồ mức cô lập, xem bước write skew (hai bác sĩ trực): Repeatable Read để lọt, Serializable hủy một bên với 40001. Rồi ba câu hỏi. Kỹ năng chuyên gia: nhận ra một quy tắc nghiệp vụ dễ bị write skew và chọn giữa SSI + thử lại, lock tường minh hoặc ràng buộc.

# EN

## Key idea

Two doctors ask for the night off at once, each sees "the other one is on call", and in the end nobody is: does Repeatable Read stop that?

- Postgres' Repeatable Read is snapshot isolation. It stops lost updates but still allows write skew: two transactions read the same data, each writes a different row, and together they break a rule each of them had checked.
- Serializable = SSI (Serializable Snapshot Isolation): still snapshots, plus tracking of read-write dependencies between transactions. When it sees a pattern that could produce an anomaly, Postgres aborts one transaction with `could not serialize access …` (SQLSTATE 40001).
- The tracking uses predicate locks, mode `SIReadLock`: they block nobody and cannot cause deadlocks. Granularity: tuple/page when reading through an index, the whole relation on a Seq Scan, so good indexes also reduce false aborts.
- A long read-only report: `BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE`. A `DEFERRABLE` transaction may wait at its start until it gets a safe snapshot; after that it runs without predicate locks and is never aborted with 40001.

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

Under Repeatable Read, step t4 commits and nobody is on call.

## Practice

Rules for the application: wrap every Serializable transaction in a 40001 retry loop; keep transactions short; declare `READ ONLY` when it is true.

A real run needs several concurrent sessions on one Postgres server; PGlite has only one session. This lesson uses diagrams and recorded output.

Alternatives: explicit locking (`SELECT … FOR UPDATE` on a row that "stands for" the rule) or a constraint in the database. SSI is handy because you do not need to know every conflict point in advance.

On the isolation diagram, read the write-skew step (two doctors on call): Repeatable Read lets it through, Serializable aborts one side with 40001. Then three questions. Expert skill: spot a business rule that is open to write skew and choose between SSI + retry, explicit locking or a constraint.
