---
id: e-ds-l5-05
engine: design
level: L5
module: transactions
title: Khóa hai pha, nhãn thời gian và MVCC của PostgreSQL
title_en: Two-phase locking, timestamps and PostgreSQL's MVCC
kind: concept
runtime: browser
minutes: 15
figures: [{ name: pg-mvcc-timeline, at: idea }]
objectives:
  - vi: Giải thích khóa hai pha, khóa hai pha nghiêm ngặt và vì sao chúng có thể bế tắc.
    en: Explain two-phase locking, strict two-phase locking and why they can deadlock.
  - vi: Áp thứ tự nhãn thời gian và luật ghi Thomas lên một lịch chỉ có thao tác ghi.
    en: Apply timestamp ordering and the Thomas write rule to a schedule of writes.
  - vi: Nói PostgreSQL khác lý thuyết ở đâu - ảnh chụp MVCC, khóa dòng và SSI.
    en: Say where PostgreSQL differs from the theory - MVCC snapshots, row locks and SSI.
requires: [e-ds-l5-04]
sources:
  - https://www.postgresql.org/docs/18/mvcc-intro.html
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://arxiv.org/abs/1208.4179
lab:
  setup: |
    CREATE TABLE accounts (id int PRIMARY KEY, balance numeric(12,2) NOT NULL);
    INSERT INTO accounts VALUES (1, 100.00), (2, 50.00);
    CREATE TABLE waits (waiter text NOT NULL, holder text NOT NULL);
    INSERT INTO waits VALUES ('T1', 'T2'), ('T2', 'T1'), ('T3', 'T1');
    CREATE TABLE writes (seq int PRIMARY KEY, tx_ts int NOT NULL, item text NOT NULL);
    INSERT INTO writes VALUES (1, 10, 'X'), (2, 20, 'X'), (3, 15, 'X'), (4, 5, 'Y'), (5, 30, 'X'), (6, 3, 'Y');
  steps:
    - task:
        vi: "Bảng `waits` là đồ thị chờ (ai chờ khóa của ai). Tìm các cặp chờ lẫn nhau, tức bế tắc: trả `waiter`, `holder`, xếp theo `waiter`."
        en: "Table `waits` is the wait-for graph (who waits for whose lock). Find the pairs that wait for each other, a deadlock: return `waiter`, `holder`, ordered by `waiter`."
      solution: SELECT a.waiter, a.holder FROM waits a JOIN waits b ON a.waiter = b.holder AND a.holder = b.waiter ORDER BY a.waiter
      check: rows
      ordered: true
      hint:
        vi: "Tự nối `waits`: cạnh a và cạnh b ngược chiều nhau."
        en: "Join `waits` to itself: edge a and edge b point in opposite directions."
    - task:
        vi: "Bảng `writes` là một lịch chỉ có thao tác ghi, `tx_ts` là nhãn thời gian của transaction. Theo luật ghi Thomas, lần ghi nào bị bỏ qua? Đó là lần ghi mà trước nó đã có một lần ghi cùng `item` của transaction trẻ hơn (nhãn lớn hơn). Trả `seq`, `tx_ts`, `item`, xếp theo `seq`."
        en: "Table `writes` is a schedule of writes only, and `tx_ts` is the transaction's timestamp. Under the Thomas write rule, which writes are skipped? Those preceded by a write to the same `item` from a younger transaction (a larger timestamp). Return `seq`, `tx_ts`, `item`, ordered by `seq`."
      solution: SELECT w.seq, w.tx_ts, w.item FROM writes w WHERE EXISTS (SELECT 1 FROM writes p WHERE p.item = w.item AND p.seq < w.seq AND p.tx_ts > w.tx_ts) ORDER BY w.seq
      check: rows
      ordered: true
      hint:
        vi: "`EXISTS` một lần ghi `p` cùng `item`, đứng trước (`p.seq < w.seq`) và trẻ hơn (`p.tx_ts > w.tx_ts`)."
        en: "`EXISTS` a write `p` on the same `item`, earlier (`p.seq < w.seq`) and younger (`p.tx_ts > w.tx_ts`)."
quiz:
  - q:
      vi: "Khóa hai pha (2PL) bảo đảm điều gì?"
      en: "What does two-phase locking (2PL) guarantee?"
    options:
      - { vi: "Lịch khả tuần tự xung đột, nhưng vẫn có thể bế tắc", en: "Conflict serializable schedules, but deadlocks can still happen" }
      - { vi: "Không bao giờ bế tắc", en: "No deadlock, ever" }
      - { vi: "Không transaction nào phải chờ", en: "No transaction ever waits" }
    answer: 0
    trap: 1
    why:
      vi: "\"Không bao giờ bế tắc\" nghe hợp lý vì luật lấy và nhả lock rất chặt, nhưng 2PL không quy định thứ tự lấy lock: T1 giữ lock trên A rồi chờ B, T2 giữ B rồi chờ A, và hai bên chờ nhau mãi (bế tắc, deadlock). \"Không ai phải chờ\" càng sai: 2PL đứng trên việc chờ lock. Điều 2PL bảo đảm là khả tuần tự xung đột; bế tắc thì hệ thống phải phát hiện rồi hủy một bên, hoặc ép mọi transaction lấy lock theo cùng một thứ tự."
      en: "\"No deadlock\" sounds right because the rules for taking and releasing locks are strict, but 2PL says nothing about the order locks are taken: T1 holds A and waits for B, T2 holds B and waits for A, and both wait forever (a deadlock). \"Nobody waits\" is even further off: 2PL is built on waiting for locks. What 2PL guarantees is conflict serializability; deadlocks must be detected with one side aborted, or prevented by making every transaction lock in the same order."
  - q:
      vi: "Trong PostgreSQL, một câu `SELECT` thường có chờ một transaction đang `UPDATE` cùng dòng không?"
      en: "In PostgreSQL, does a plain `SELECT` wait for a transaction running an `UPDATE` on the same row?"
    options:
      - { vi: "Có, đọc phải chờ khóa ghi như trong 2PL", en: "Yes, a read must wait for the write lock as in 2PL" }
      - { vi: "Không: nó đọc phiên bản cũ trong ảnh chụp của mình", en: "No: it reads the old version from its own snapshot" }
    answer: 1
    trap: 0
    why:
      vi: "Trong 2PL của sách giáo khoa, đọc phải chờ lock ghi, nhưng Postgres không làm vậy. Nó dùng MVCC (giữ nhiều phiên bản của một dòng): `UPDATE` tạo phiên bản mới, còn `SELECT` đọc phiên bản đã commit nằm trong ảnh chụp (snapshot) của mình, nên không cần chờ. Người đọc không chặn người ghi và ngược lại; chỉ hai người ghi cùng một dòng mới chờ nhau qua row lock."
      en: "In textbook 2PL a read waits for the write lock, but Postgres does not work that way. It uses MVCC (keeping several versions of a row): the `UPDATE` creates a new version, while the `SELECT` reads the committed version in its own snapshot, so it does not wait. Readers do not block writers and writers do not block readers; only two writers of the same row wait for each other, through a row lock."
---
## Mở bài

Hai transaction cùng sửa một tài khoản, database phải chọn ai đi trước. Sách giáo khoa có hai trường phái: lock và nhãn thời gian. PostgreSQL chọn một đường thứ ba, và bài này so cả ba.

## Ý chính

**Khóa hai pha** (two-phase locking, 2PL): mỗi transaction xin lock chia sẻ (shared lock) để đọc, lock độc quyền (exclusive lock) để ghi, và có hai pha: pha tăng chỉ lấy thêm lock, pha giảm chỉ nhả lock. Đã nhả một lock thì không lấy lock nào nữa. Luật này bảo đảm khả tuần tự xung đột. **2PL nghiêm ngặt** giữ lock ghi tới lúc commit, nên không ai đọc dữ liệu chưa commit và không có hủy dây chuyền. Giá phải trả là **bế tắc** (deadlock): hai transaction giữ lock mà bên kia cần. Hệ thống tìm chu trình trong đồ thị chờ rồi hủy một bên, hoặc phòng trước bằng cách lấy lock theo thứ tự cố định.

**Thứ tự nhãn thời gian**: mỗi transaction nhận một nhãn lúc bắt đầu, và các thao tác xung đột phải theo thứ tự nhãn; ai đến muộn so với nhãn của mình thì bị hủy và chạy lại, không ai phải chờ nên không bế tắc. **Luật ghi Thomas** nới một chỗ: khi transaction già ghi một mục mà transaction trẻ hơn đã ghi (và chưa ai trẻ hơn đọc), lần ghi cũ chỉ bị bỏ qua thay vì hủy cả transaction, vì nó đằng nào cũng bị đè.

**PostgreSQL** dùng MVCC (multiversion concurrency control, giữ nhiều phiên bản của một dòng): mỗi lần `UPDATE` tạo một phiên bản dòng mới (cột ẩn `xmin`, `xmax`), mỗi câu đọc nhìn một ảnh chụp (snapshot). Đọc không lấy lock. Hai người ghi cùng một dòng thì người sau chờ row lock. Mức `SERIALIZABLE` dùng SSI (Serializable Snapshot Isolation): không lấy thêm lock, mà theo dõi phụ thuộc đọc-ghi và hủy một transaction khi thấy vòng nguy hiểm. Hai phiên chạy cùng lúc không tái hiện được trong trình duyệt (PGlite chỉ có một phiên); hành vi đó được mô tả theo tài liệu PostgreSQL ở `e-pg-l4-12` và `e-pg-l4-13`.

Hình từng bước ở cuối mục này là nửa MVCC của bài: mỗi lần sửa tạo một phiên bản dòng mới, và mỗi transaction chỉ thấy phiên bản hợp với ảnh chụp của nó.

## Cú pháp

```sql
BEGIN [ ISOLATION LEVEL { READ COMMITTED | REPEATABLE READ | SERIALIZABLE } ];
SELECT ... FROM t WHERE ... FOR { UPDATE | NO KEY UPDATE | SHARE | KEY SHARE } [ NOWAIT | SKIP LOCKED ];
LOCK TABLE t IN { ACCESS SHARE | ROW EXCLUSIVE | EXCLUSIVE | ACCESS EXCLUSIVE } MODE;
COMMIT;
```

- `FOR UPDATE`: lấy lock trên các dòng đã đọc như khi sắp ghi chúng.
- `LOCK TABLE`: lấy lock trên cả bảng, chỉ dùng trong một transaction.

## Ví dụ

Lấy row lock trong một transaction, rồi xem bảng lock (`pg_locks`) của chính phiên này.

```sql
BEGIN;
SELECT id, balance FROM accounts WHERE id = 1 FOR UPDATE;
SELECT locktype, mode, granted FROM pg_locks WHERE relation = 'accounts'::regclass ORDER BY mode;
COMMIT;
```

MVCC: `UPDATE` tạo phiên bản mới, nên `xmin` và vị trí `ctid` của dòng 1 đổi.

```sql
SELECT id, xmin, ctid FROM accounts ORDER BY id;
UPDATE accounts SET balance = balance + 1 WHERE id = 1;
SELECT id, xmin, ctid FROM accounts ORDER BY id;
```

Mã transaction hiện tại, chính là giá trị sẽ nằm trong `xmin` của dòng nó ghi.

```sql
BEGIN;
SELECT pg_current_xact_id() AS my_tx;
COMMIT;
```

## Lỗi hay gặp

Lấy lock trên bảng ngoài transaction: lock sẽ nhả ngay khi câu xong, nên Postgres từ chối.

```sql
-- ERROR 25P01: LOCK TABLE can only be used in transaction blocks
LOCK TABLE accounts IN EXCLUSIVE MODE;
```

Lấy lock trên kết quả tổng hợp: một con số tổng không trỏ về dòng nào để lấy lock.

```sql
-- ERROR 0A000: FOR UPDATE is not allowed with aggregate functions
SELECT sum(balance) FROM accounts FOR UPDATE;
```

Muốn giữ tổng ổn định, hãy lấy lock trên các dòng (`SELECT … FOR UPDATE` không có hàm tổng hợp) hoặc dùng mức `SERIALIZABLE`.

## Thực hành

Lab tìm bế tắc trên một đồ thị chờ, rồi áp luật ghi Thomas lên một lịch chỉ có thao tác ghi.

## Tóm tắt

- 2PL: pha tăng rồi pha giảm, cho khả tuần tự xung đột; 2PL nghiêm ngặt giữ lock ghi tới commit.
- Bế tắc = chu trình trong đồ thị chờ; xử lý bằng phát hiện và hủy, hoặc lấy lock theo thứ tự cố định.
- Nhãn thời gian: không chờ, hủy kẻ đến muộn; luật Thomas bỏ qua lần ghi đã lỗi thời.
- PostgreSQL: MVCC (đọc không lấy lock), row lock giữa người ghi, SSI ở `SERIALIZABLE`.

# EN

## Opening

Two transactions change the same account, and the database must choose who goes first. The textbook has two schools: locks and timestamps. PostgreSQL takes a third road, and this lesson compares all three.

## Key idea

**Two-phase locking** (2PL): each transaction asks for a shared lock to read and an exclusive lock to write, in two phases: the growing phase only takes locks, the shrinking phase only releases them. Once a lock is released, no new lock is taken. This rule guarantees conflict serializability. **Strict 2PL** keeps write locks until commit, so nobody reads uncommitted data and there are no cascading aborts. The price is **deadlock**: two transactions hold each other's locks. The system looks for a cycle in the wait-for graph and aborts one side, or prevents it by locking in a fixed order.

**Timestamp ordering**: each transaction gets a timestamp when it starts, and conflicting operations must follow timestamp order; a transaction that arrives too late for its timestamp is aborted and restarted, nobody waits, so there is no deadlock. The **Thomas write rule** relaxes one case: when an older transaction writes an item that a younger one has already written (and no younger one has read it), the old write is simply skipped instead of aborting the transaction, since it would be overwritten anyway.

**PostgreSQL** uses MVCC (multiversion concurrency control, keeping several versions of a row): every `UPDATE` creates a new row version (hidden columns `xmin`, `xmax`), and every read sees a snapshot. Reads take no row locks. Two writers of the same row: the second waits for the row lock. The `SERIALIZABLE` level uses SSI (Serializable Snapshot Isolation): no extra locks, it tracks read-write dependencies and aborts one transaction when it sees a dangerous cycle. Two sessions running at once cannot be reproduced in the browser (PGlite has one session); that behaviour is described from the PostgreSQL documentation in `e-pg-l4-12` and `e-pg-l4-13`.

The step-through figure at the end of this section is the MVCC half of the lesson: every update makes a new row version, and each transaction sees only the version that fits its snapshot.

## Syntax

```sql
BEGIN [ ISOLATION LEVEL { READ COMMITTED | REPEATABLE READ | SERIALIZABLE } ];
SELECT ... FROM t WHERE ... FOR { UPDATE | NO KEY UPDATE | SHARE | KEY SHARE } [ NOWAIT | SKIP LOCKED ];
LOCK TABLE t IN { ACCESS SHARE | ROW EXCLUSIVE | EXCLUSIVE | ACCESS EXCLUSIVE } MODE;
COMMIT;
```

- `FOR UPDATE`: lock the rows read as if about to write them.
- `LOCK TABLE`: lock the whole table, only inside a transaction.

## Example

Lock a row inside a transaction, then look at this session's own lock table (`pg_locks`).

```sql
BEGIN;
SELECT id, balance FROM accounts WHERE id = 1 FOR UPDATE;
SELECT locktype, mode, granted FROM pg_locks WHERE relation = 'accounts'::regclass ORDER BY mode;
COMMIT;
```

MVCC: an `UPDATE` creates a new version, so row 1's `xmin` and its position `ctid` change.

```sql
SELECT id, xmin, ctid FROM accounts ORDER BY id;
UPDATE accounts SET balance = balance + 1 WHERE id = 1;
SELECT id, xmin, ctid FROM accounts ORDER BY id;
```

The current transaction id, the very value that goes into `xmin` of the rows it writes.

```sql
BEGIN;
SELECT pg_current_xact_id() AS my_tx;
COMMIT;
```

## Common mistakes

Locking a table outside a transaction: the lock would be released as soon as the statement ends, so Postgres refuses.

```sql
-- ERROR 25P01: LOCK TABLE can only be used in transaction blocks
LOCK TABLE accounts IN EXCLUSIVE MODE;
```

Locking an aggregate: a total points at no row to lock.

```sql
-- ERROR 0A000: FOR UPDATE is not allowed with aggregate functions
SELECT sum(balance) FROM accounts FOR UPDATE;
```

To keep a total stable, lock the rows (`SELECT … FOR UPDATE` without an aggregate) or use the `SERIALIZABLE` level.

## Practice

The lab finds a deadlock in a wait-for graph, then applies the Thomas write rule to a schedule of writes.

## Recap

- 2PL: a growing phase then a shrinking phase, giving conflict serializability; strict 2PL keeps write locks until commit.
- Deadlock = a cycle in the wait-for graph; handled by detection and abort, or by locking in a fixed order.
- Timestamps: nobody waits, late arrivals are aborted; the Thomas rule skips an outdated write.
- PostgreSQL: MVCC (reads take no locks), row locks between writers, SSI at `SERIALIZABLE`.
