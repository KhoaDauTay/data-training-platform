---
id: e-pg-l4-12
engine: postgres
level: L4
module: locks
title: "Mức cô lập và các hiện tượng chúng cho phép"
title_en: "Isolation levels and the anomalies they allow"
kind: concept
runtime: docs
docs_why: sessions
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Định nghĩa dirty read, non-repeatable read, phantom read, serialization anomaly", en: "Define dirty read, non-repeatable read, phantom read and serialization anomaly" }
  - { vi: "Nói mỗi mức cô lập của Postgres chặn hiện tượng nào, và chỗ Postgres chặt hơn chuẩn SQL", en: "Say which anomalies each Postgres isolation level prevents, and where Postgres is stricter than the SQL standard" }
  - { vi: "Đặt mức cô lập đúng chỗ: `BEGIN ISOLATION LEVEL`, trước câu đầu tiên", en: "Set the isolation level in the right place: `BEGIN ISOLATION LEVEL`, before the first statement" }
requires: [e-pg-l4-09]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/sql-set-transaction.html
  - https://www.postgresql.org/docs/18/sql-begin.html
viz: pg-isolation-anomalies
quiz:
  - q: { vi: "Ở Read Committed, một transaction chạy `SELECT sum(bal) FROM acct` hai lần. Giữa hai lần, phiên khác chuyển tiền và COMMIT. Hai tổng có thể khác nhau không?", en: "Under Read Committed, a transaction runs `SELECT sum(bal) FROM acct` twice. Between them, another session moves money and COMMITs. Can the two sums differ?" }
    options:
      - { vi: "Không, cùng transaction thì cùng dữ liệu", en: "No, the same transaction sees the same data" }
      - { vi: "Có: mỗi câu lấy snapshot mới, nên thấy thay đổi đã commit giữa chừng (non-repeatable read)", en: "Yes: each statement takes a new snapshot, so it sees changes committed in between (non-repeatable read)" }
      - { vi: "Có, vì nó còn thấy cả thay đổi chưa commit", en: "Yes, because it even sees uncommitted changes" }
    answer: 1
    trap: 0
    why: { vi: "\"Cùng transaction thì cùng dữ liệu\" đúng với Repeatable Read, nhưng không đúng với Read Committed, mức cô lập (isolation level) mặc định. Ở Read Committed, mỗi câu lấy một snapshot mới (ảnh chụp những gì đã commit lúc câu bắt đầu), nên câu `SELECT` thứ hai thấy lần chuyển tiền đã COMMIT ở giữa: đó là non-repeatable read. Nó vẫn không bao giờ thấy dữ liệu chưa commit, nên phương án thứ ba sai. Báo cáo nhiều câu cần số nhất quán thì dùng Repeatable Read, nơi cả transaction dùng một snapshot.", en: "\"The same transaction sees the same data\" holds for Repeatable Read, not for Read Committed, the default isolation level. Under Read Committed each statement takes a new snapshot (a picture of what was committed when the statement started), so the second `SELECT` sees the transfer committed in between: a non-repeatable read. It still never sees uncommitted data, so the third option is wrong. A multi-statement report that needs consistent numbers should use Repeatable Read, where the whole transaction uses one snapshot." }
  - q: { vi: "Ở Repeatable Read, transaction A đọc dòng 1 rồi `UPDATE` dòng 1. Giữa đó, B đã sửa dòng 1 và COMMIT. A nhận gì?", en: "Under Repeatable Read, transaction A reads row 1, then `UPDATE`s row 1. In between, B changed row 1 and COMMITted. What does A get?" }
    options:
      - { vi: "A ghi đè thay đổi của B (lost update)", en: "A overwrites B's change (lost update)" }
      - { vi: "Lỗi `could not serialize access due to concurrent update` (SQLSTATE 40001); A phải hủy và thử lại", en: "The error `could not serialize access due to concurrent update` (SQLSTATE 40001); A must roll back and retry" }
      - { vi: "A tự động đọc lại và cập nhật trên giá trị mới", en: "A automatically re-reads and updates the new value" }
    answer: 1
    trap: 2
    why: { vi: "\"Tự đọc lại giá trị mới rồi cập nhật\" là điều bạn quen thấy ở Read Committed, mức mặc định, nhưng Repeatable Read không làm vậy. A đang nhìn dòng 1 theo snapshot cũ, trước khi B sửa; nếu cho A cập nhật, A sẽ tính trên giá trị cũ và xóa mất thay đổi của B (lost update). Vì thế Postgres từ chối với lỗi 40001 khi một dòng đã bị transaction khác sửa và commit sau snapshot của A. Ứng dụng hủy rồi chạy lại cả transaction, lần này với snapshot mới.", en: "\"Re-read the new value and update it\" is what you are used to under Read Committed, the default, but Repeatable Read does not do it. A sees row 1 through its old snapshot, from before B's change; letting A update would compute on the old value and wipe out B's change (a lost update). So Postgres refuses with error 40001 when a row was changed and committed by another transaction after A's snapshot. The application rolls back and reruns the whole transaction, this time with a fresh snapshot." }
  - q: { vi: "Theo bảng trong docs chính thức của Postgres, phantom read ở Repeatable Read là gì?", en: "According to the Postgres documentation's table, what about phantom reads under Repeatable Read?" }
    options:
      - { vi: "Có thể xảy ra, như chuẩn SQL cho phép", en: "Possible, as the SQL standard allows" }
      - { vi: "Chuẩn cho phép, nhưng Postgres không để xảy ra", en: "Allowed by the standard, but not possible in Postgres" }
      - { vi: "Chỉ xảy ra với bảng phân vùng", en: "Only possible with partitioned tables" }
    answer: 1
    trap: 0
    why: { vi: "Chuẩn SQL đúng là cho phép phantom read (chạy lại cùng điều kiện lọc thì thấy thêm dòng mới) ở Repeatable Read, nhưng chuẩn chỉ đặt mức tối thiểu và Postgres chặt hơn. Postgres cài Repeatable Read bằng snapshot isolation: cả transaction nhìn một snapshot chụp ở câu đầu tiên, nên dòng mà phiên khác chèn sau đó không bao giờ hiện ra, với bảng thường cũng như bảng phân vùng. Thứ vẫn có thể xảy ra là serialization anomaly, như write skew ở bài Serializable.", en: "The SQL standard does allow phantom reads (rerunning the same filter shows new rows) at Repeatable Read, but the standard only sets a minimum and Postgres is stricter. Postgres implements Repeatable Read as snapshot isolation: the whole transaction sees one snapshot taken at its first statement, so rows other sessions insert later never appear, in plain and partitioned tables alike. What can still happen is a serialization anomaly, such as the write skew of the Serializable lesson." }
---

## Mở bài

Một báo cáo chạy hai câu `SELECT sum(bal)` trong cùng một transaction và nhận hai tổng khác nhau. Đó là lỗi của database, hay hành vi đúng thiết kế?

## Ý chính

Chuẩn SQL đặt tên cho bốn hiện tượng. Dirty read: thấy dữ liệu người khác chưa commit. Non-repeatable read: đọc lại một dòng thấy giá trị khác. Phantom read: chạy lại cùng điều kiện thấy tập dòng khác. Serialization anomaly: kết quả cuối không khớp với bất kỳ thứ tự chạy lần lượt nào của các transaction.

Read Committed là mặc định. Mỗi câu lấy một snapshot mới, nên không bao giờ thấy dữ liệu chưa commit, nhưng có thể gặp non-repeatable read và phantom read. Khi `UPDATE` gặp dòng vừa bị người khác sửa, nó chờ người đó xong rồi kiểm lại điều kiện trên phiên bản mới. Read Uncommitted được chấp nhận về cú pháp nhưng chạy y như Read Committed, nên Postgres không có dirty read.

Nhiều người nghĩ cùng một transaction thì luôn thấy cùng dữ liệu. Thật ra điều đó chỉ đúng từ Repeatable Read: cả transaction dùng một snapshot, lấy ở câu đầu tiên chứ không phải lúc `BEGIN`. Postgres chặt hơn chuẩn SQL: ở mức này không có cả phantom read, nhưng serialization anomaly vẫn có thể. Khi định sửa một dòng mà người khác đã sửa sau snapshot của mình, transaction bị hủy với 40001, và ứng dụng phải chạy lại cả transaction.

Serializable thêm việc phát hiện xung đột đọc-ghi (bài sau), nên không còn serialization anomaly. Mức cô lập phải chọn trước câu đầu tiên của transaction; cách gọn nhất là ghi ngay trong `BEGIN`.

## Cú pháp

```sql
BEGIN [ ISOLATION LEVEL { SERIALIZABLE | REPEATABLE READ | READ COMMITTED | READ UNCOMMITTED } ] [ READ WRITE | READ ONLY ];
SET TRANSACTION ISOLATION LEVEL level;
SET default_transaction_isolation = 'level';
SHOW transaction_isolation;
```

- `BEGIN ISOLATION LEVEL`: đặt mức cho transaction này.
- `SET TRANSACTION`: như trên, nhưng phải đứng trước mọi câu khác sau `BEGIN`.
- `default_transaction_isolation`: mức mặc định cho các transaction sau đó của phiên.
- `READ ONLY`: transaction không được ghi; hợp cho báo cáo.

## Ví dụ

Mức của một phiên mới:

```sql
CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
INSERT INTO acct SELECT g, 100 FROM generate_series(1, 5) g;
SHOW transaction_isolation;
```

Ra `read committed`. Trong Repeatable Read, snapshot cố định không che thay đổi của chính bạn:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT current_setting('transaction_isolation') AS level, sum(bal) AS total FROM acct;
UPDATE acct SET bal = bal - 30 WHERE id = 1;
SELECT sum(bal) AS total FROM acct;
ROLLBACK;
```

Tổng đi từ 500 xuống 470 ngay trong transaction. Read Uncommitted được nhận nhưng chạy như Read Committed:

```sql
BEGIN ISOLATION LEVEL READ UNCOMMITTED;
SHOW transaction_isolation;
COMMIT;
```

Hai phiên cùng lúc thì không chạy được ở đây (PGlite chỉ có một phiên). Diễn biến theo mô tả trong tài liệu: non-repeatable read ở Read Committed, và lost update bị Repeatable Read chặn.

```text
t1  A: BEGIN;  SELECT bal FROM acct WHERE id = 1;     -- 100
t2  B: UPDATE acct SET bal = 50 WHERE id = 1; COMMIT;
t3  A: SELECT bal FROM acct WHERE id = 1;             -- READ COMMITTED: 50, REPEATABLE READ: 100

t1  A: BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT bal FROM acct WHERE id = 1;   -- 100
t2  B: UPDATE acct SET bal = bal - 30 WHERE id = 1; COMMIT;                       -- 70
t3  A: UPDATE acct SET bal = bal - 10 WHERE id = 1;
    ERROR:  could not serialize access due to concurrent update   (SQLSTATE 40001)
```

## Lỗi hay gặp

Đặt mức bằng `SET TRANSACTION` khi chưa có transaction:

```sql
-- WRONG: SET TRANSACTION outside a transaction block only warns; the next BEGIN is still read committed
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
SHOW transaction_isolation;
COMMIT;
```

```sql
-- FIX: put the level in BEGIN itself
BEGIN ISOLATION LEVEL REPEATABLE READ;
SHOW transaction_isolation;
COMMIT;
```

Câu sai ra `read committed`: ngoài transaction, `SET TRANSACTION` chỉ cảnh báo và không đổi gì.

Đổi mức sau khi đã chạy câu đầu tiên:

```sql
BEGIN;
SELECT sum(bal) FROM acct;
-- ERROR 25001: SET TRANSACTION ISOLATION LEVEL must be called before any query
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

Snapshot đã được lấy ở câu đầu, nên không đổi mức được nữa. Đặt mức trong `BEGIN`, hoặc ngay sau nó.

Báo cáo khai `READ ONLY` nhưng có một câu ghi lẫn vào (khối dưới mở bằng ROLLBACK để kết thúc transaction hỏng ở trên):

```sql
ROLLBACK;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- ERROR 25006: cannot execute UPDATE in a read-only transaction
UPDATE acct SET bal = 0 WHERE id = 1;
```

Đây là lỗi có ích: `READ ONLY` chặn ghi nhầm trong báo cáo. Tách phần ghi ra một transaction khác.

## Thực hành

Trên sơ đồ mức cô lập × hiện tượng, mỗi bước là một kịch bản hai transaction (dirty read, non-repeatable read, phantom, write skew) và các mức chặn được nó. Sau đó là ba câu hỏi.

## Tóm tắt

- Read Committed (mặc định): snapshot mỗi câu; không dirty read, nhưng có non-repeatable read và phantom read.
- Repeatable Read: một snapshot từ câu đầu tiên; ở Postgres không có cả phantom read, xung đột ghi báo 40001.
- Read Uncommitted chạy như Read Committed; Serializable chặn cả serialization anomaly.
- Đặt mức trong `BEGIN ISOLATION LEVEL ...`, trước câu đầu tiên; `SET TRANSACTION` ngoài transaction không có tác dụng.

# EN

## Opening

A report runs `SELECT sum(bal)` twice inside one transaction and gets two different totals. Is that a database bug, or behaviour by design?

## Key idea

The SQL standard names four anomalies. Dirty read: seeing data someone else has not committed. Non-repeatable read: re-reading a row returns a different value. Phantom read: re-running the same condition returns a different set of rows. Serialization anomaly: the final result matches no one-at-a-time order of the transactions.

Read Committed is the default. Each statement takes a new snapshot, so it never sees uncommitted data, but non-repeatable reads and phantom reads can happen. When an `UPDATE` meets a row someone else just changed, it waits for them to finish, then re-checks its condition on the new version. Read Uncommitted is accepted as syntax but runs exactly like Read Committed, so Postgres has no dirty reads.

Many people think the same transaction always sees the same data. In fact that only holds from Repeatable Read up: the whole transaction uses one snapshot, taken at its first statement, not at `BEGIN`. Postgres is stricter than the SQL standard: at this level there are no phantom reads either, but a serialization anomaly is still possible. When it tries to change a row someone else changed after its snapshot, the transaction is aborted with 40001, and the application must rerun the whole transaction.

Serializable adds detection of read-write conflicts (next lesson), so no serialization anomaly is left. The isolation level must be chosen before the transaction's first statement; the simplest place is `BEGIN` itself.

## Syntax

```sql
BEGIN [ ISOLATION LEVEL { SERIALIZABLE | REPEATABLE READ | READ COMMITTED | READ UNCOMMITTED } ] [ READ WRITE | READ ONLY ];
SET TRANSACTION ISOLATION LEVEL level;
SET default_transaction_isolation = 'level';
SHOW transaction_isolation;
```

- `BEGIN ISOLATION LEVEL`: sets the level for this transaction.
- `SET TRANSACTION`: the same, but it must come before every other statement after `BEGIN`.
- `default_transaction_isolation`: the default level for the session's later transactions.
- `READ ONLY`: the transaction may not write; good for reports.

## Example

The level of a fresh session:

```sql
CREATE TABLE acct (id int PRIMARY KEY, bal int NOT NULL);
INSERT INTO acct SELECT g, 100 FROM generate_series(1, 5) g;
SHOW transaction_isolation;
```

It is `read committed`. Under Repeatable Read, the fixed snapshot does not hide your own changes:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT current_setting('transaction_isolation') AS level, sum(bal) AS total FROM acct;
UPDATE acct SET bal = bal - 30 WHERE id = 1;
SELECT sum(bal) AS total FROM acct;
ROLLBACK;
```

The total goes from 500 to 470 inside the transaction. Read Uncommitted is accepted but runs as Read Committed:

```sql
BEGIN ISOLATION LEVEL READ UNCOMMITTED;
SHOW transaction_isolation;
COMMIT;
```

Two concurrent sessions cannot run here (PGlite has a single session). The steps as the docs describe them: a non-repeatable read under Read Committed, and a lost update stopped by Repeatable Read.

```text
t1  A: BEGIN;  SELECT bal FROM acct WHERE id = 1;     -- 100
t2  B: UPDATE acct SET bal = 50 WHERE id = 1; COMMIT;
t3  A: SELECT bal FROM acct WHERE id = 1;             -- READ COMMITTED: 50, REPEATABLE READ: 100

t1  A: BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT bal FROM acct WHERE id = 1;   -- 100
t2  B: UPDATE acct SET bal = bal - 30 WHERE id = 1; COMMIT;                       -- 70
t3  A: UPDATE acct SET bal = bal - 10 WHERE id = 1;
    ERROR:  could not serialize access due to concurrent update   (SQLSTATE 40001)
```

## Common mistakes

Setting the level with `SET TRANSACTION` before any transaction exists:

```sql
-- WRONG: SET TRANSACTION outside a transaction block only warns; the next BEGIN is still read committed
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
SHOW transaction_isolation;
COMMIT;
```

```sql
-- FIX: put the level in BEGIN itself
BEGIN ISOLATION LEVEL REPEATABLE READ;
SHOW transaction_isolation;
COMMIT;
```

The wrong version shows `read committed`: outside a transaction, `SET TRANSACTION` only warns and changes nothing.

Changing the level after the first statement has run:

```sql
BEGIN;
SELECT sum(bal) FROM acct;
-- ERROR 25001: SET TRANSACTION ISOLATION LEVEL must be called before any query
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

The snapshot was taken at the first statement, so the level can no longer change. Set it in `BEGIN`, or right after it.

A report declared `READ ONLY` with one write slipped in (the block opens with ROLLBACK to end the broken transaction above):

```sql
ROLLBACK;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- ERROR 25006: cannot execute UPDATE in a read-only transaction
UPDATE acct SET bal = 0 WHERE id = 1;
```

This is a useful error: `READ ONLY` stops accidental writes in a report. Move the write to another transaction.

## Practice

On the isolation-by-anomaly diagram, each step is a two-transaction script (dirty read, non-repeatable read, phantom, write skew) and the levels that stop it. Then three questions.

## Recap

- Read Committed (default): a snapshot per statement; no dirty reads, but non-repeatable and phantom reads happen.
- Repeatable Read: one snapshot from the first statement; in Postgres no phantom reads either, and a write conflict raises 40001.
- Read Uncommitted runs as Read Committed; Serializable also stops serialization anomalies.
- Set the level in `BEGIN ISOLATION LEVEL ...`, before the first statement; `SET TRANSACTION` outside a transaction has no effect.
