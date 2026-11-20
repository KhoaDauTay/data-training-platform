---
id: e-pg-l4-12
engine: postgres
level: L4
module: locks
title: "Mức cô lập và các hiện tượng chúng cho phép"
title_en: "Isolation levels and the anomalies they allow"
kind: concept
runtime: docs
minutes: 20
objectives:
  - { vi: "Định nghĩa dirty read, non-repeatable read, phantom read, serialization anomaly", en: "Define dirty read, non-repeatable read, phantom read and serialization anomaly" }
  - { vi: "Nói mỗi mức cô lập của Postgres chặn hiện tượng nào, và chỗ Postgres chặt hơn chuẩn SQL", en: "Say which anomalies each Postgres isolation level prevents, and where Postgres is stricter than the SQL standard" }
  - { vi: "Biết Read Committed lấy snapshot mỗi câu, Repeatable Read lấy một snapshot cho cả transaction", en: "Know that Read Committed takes a snapshot per statement and Repeatable Read one snapshot per transaction" }
requires: [e-pg-l4-09]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/sql-set-transaction.html
viz: pg-isolation-anomalies
quiz:
  - q: { vi: "Ở Read Committed, một transaction chạy `SELECT sum(bal) FROM acct` hai lần. Giữa hai lần, phiên khác chuyển tiền và COMMIT. Hai tổng có thể khác nhau không?", en: "Under Read Committed, a transaction runs `SELECT sum(bal) FROM acct` twice. Between them, another session moves money and COMMITs. Can the two sums differ?" }
    options:
      - { vi: "Không, cùng transaction thì cùng dữ liệu", en: "No, the same transaction sees the same data" }
      - { vi: "Có: mỗi câu lấy snapshot mới, nên thấy thay đổi đã commit giữa chừng (non-repeatable read)", en: "Yes: each statement takes a new snapshot, so it sees changes committed in between (non-repeatable read)" }
      - { vi: "Có, vì nó còn thấy cả thay đổi chưa commit", en: "Yes, because it even sees uncommitted changes" }
    answer: 1
    why: { vi: "Cùng transaction thì cùng dữ liệu nghe hợp lý, và đó đúng là cách Repeatable Read làm; nhưng Read Committed thì không. Read Committed (mặc định) không bao giờ thấy dữ liệu chưa commit, nhưng mỗi câu thấy trạng thái đã commit lúc câu bắt đầu. Báo cáo nhiều câu cần số nhất quán thì dùng Repeatable Read.", en: "Same transaction, same data sounds right, and it is how Repeatable Read behaves, but Read Committed does not. Read Committed (the default) never sees uncommitted data, but each statement sees what was committed when it started. A multi-statement report that needs consistent numbers should use Repeatable Read." }
  - q: { vi: "Ở Repeatable Read, transaction A đọc dòng 1 rồi `UPDATE` dòng 1. Giữa đó, B đã sửa dòng 1 và COMMIT. A nhận gì?", en: "Under Repeatable Read, transaction A reads row 1, then `UPDATE`s row 1. In between, B changed row 1 and COMMITted. What does A get?" }
    options:
      - { vi: "A ghi đè thay đổi của B (lost update)", en: "A overwrites B's change (lost update)" }
      - { vi: "Lỗi `could not serialize access due to concurrent update` (SQLSTATE 40001); A phải hủy và thử lại", en: "The error `could not serialize access due to concurrent update` (SQLSTATE 40001); A must roll back and retry" }
      - { vi: "A tự động đọc lại và cập nhật trên giá trị mới", en: "A automatically re-reads and updates the new value" }
    answer: 1
    why: { vi: "Tự đọc lại giá trị mới nghe hợp lý vì đó là điều bạn quen thấy ở mức mặc định, nhưng Repeatable Read không làm vậy. Repeatable Read không cho sửa một dòng đã bị transaction khác sửa sau snapshot của mình. Hành vi \"đọc lại giá trị mới rồi cập nhật\" là của Read Committed.", en: "Rereading the new value sounds right because that is what you see at the default level, but Repeatable Read does not do it. Repeatable Read does not allow updating a row that another transaction changed after its snapshot. \"Re-read the new value and update it\" is the Read Committed behaviour." }
  - q: { vi: "Theo bảng trong docs chính thức của Postgres, phantom read ở Repeatable Read là gì?", en: "According to the Postgres documentation's table, what about phantom reads under Repeatable Read?" }
    options:
      - { vi: "Có thể xảy ra, như chuẩn SQL cho phép", en: "Possible, as the SQL standard allows" }
      - { vi: "Chuẩn cho phép, nhưng Postgres không để xảy ra", en: "Allowed by the standard, but not possible in Postgres" }
      - { vi: "Chỉ xảy ra với bảng phân vùng", en: "Only possible with partitioned tables" }
    answer: 1
    why: { vi: "Nghe hợp lý vì chuẩn SQL cho phép phantom read ở Repeatable Read, nhưng Postgres chặt hơn chuẩn. Postgres cài Repeatable Read bằng snapshot isolation: cả transaction nhìn một snapshot, nên dòng mới của người khác không bao giờ hiện ra. Serialization anomaly thì vẫn có thể.", en: "It sounds right because the SQL standard allows phantom reads at Repeatable Read, but Postgres is stricter than the standard. Postgres implements Repeatable Read as snapshot isolation: the whole transaction sees one snapshot, so other sessions' new rows never appear. A serialization anomaly is still possible." }
---

## Ý chính

Hai câu `SELECT sum(bal)` trong cùng một transaction trả hai tổng khác nhau: lỗi hay bình thường? Tùy mức cô lập (isolation level):

- Read Uncommitted: chuẩn SQL cho phép dirty read, nhưng Postgres chạy y như Read Committed nên không bao giờ có dirty read.
- Read Committed (mặc định): snapshot mỗi câu, nên có thể có non-repeatable read và phantom read. Khi `UPDATE` gặp dòng vừa bị người khác sửa, nó chờ người đó xong rồi đánh giá lại điều kiện trên phiên bản mới.
- Repeatable Read: một snapshot cho cả transaction (từ câu đầu tiên). Không có non-repeatable read, và chặt hơn chuẩn SQL: cũng không có phantom read. Serialization anomaly vẫn có thể xảy ra. Gặp xung đột ghi thì báo 40001; ứng dụng phải thử lại cả transaction.
- Serializable: thêm phát hiện xung đột đọc/ghi (bài sau), nên không còn serialization anomaly.

## Ví dụ

Dirty read: thấy dữ liệu chưa commit. Non-repeatable read: đọc lại một dòng thấy giá trị khác. Phantom read: chạy lại điều kiện thấy tập dòng khác. Serialization anomaly: kết quả cuối không khớp với bất kỳ thứ tự chạy lần lượt nào.

Non-repeatable read ở Read Committed, diễn từng bước (mô phỏng có giải thích; PGlite chỉ có một phiên):

```text
t1  A: BEGIN;  SELECT bal FROM acct WHERE id = 1;     -- 100
t2  B: UPDATE acct SET bal = 50 WHERE id = 1; COMMIT;
t3  A: SELECT bal FROM acct WHERE id = 1;             -- READ COMMITTED: 50, REPEATABLE READ: 100
```

Lost update bị Repeatable Read chặn:

```text
t1  A: BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT bal FROM acct WHERE id = 1;   -- 100
t2  B: UPDATE acct SET bal = bal - 30 WHERE id = 1; COMMIT;                       -- 70
t3  A: UPDATE acct SET bal = bal - 10 WHERE id = 1;
    ERROR:  could not serialize access due to concurrent update   (SQLSTATE 40001)
```

## Thực hành

Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

Sơ đồ hai làn: bật/tắt mức cô lập và xem cùng một kịch bản cho kết quả khác nhau ra sao. Sau đó ba câu hỏi. Kỹ năng chuyên gia: với một nghiệp vụ cụ thể (báo cáo, chuyển tiền, đặt chỗ), chọn mức cô lập thấp nhất vẫn đúng và biết phải thử lại ở đâu.

# EN

## Key idea

Two `SELECT sum(bal)` queries inside one transaction return different totals: a bug or normal? It depends on the isolation level:

- Read Uncommitted: the SQL standard allows dirty reads, but Postgres runs it exactly like Read Committed, so a dirty read never happens.
- Read Committed (default): a snapshot per statement, so non-repeatable reads and phantom reads can happen. When an `UPDATE` meets a row someone else just changed, it waits for them to finish, then re-checks its condition on the new version.
- Repeatable Read: one snapshot for the whole transaction (from its first statement). No non-repeatable reads and, stricter than the SQL standard, no phantom reads either. Serialization anomalies are still possible. A write conflict raises 40001; the application must retry the whole transaction.
- Serializable: adds detection of read/write conflicts (next lesson), so no serialization anomaly.

## Example

Dirty read: seeing uncommitted data. Non-repeatable read: re-reading a row returns a different value. Phantom read: re-running a condition returns a different set of rows. Serialization anomaly: the final result matches no one-at-a-time order of the transactions.

A non-repeatable read under Read Committed, step by step (an explained simulation; PGlite has a single session):

```text
t1  A: BEGIN;  SELECT bal FROM acct WHERE id = 1;     -- 100
t2  B: UPDATE acct SET bal = 50 WHERE id = 1; COMMIT;
t3  A: SELECT bal FROM acct WHERE id = 1;             -- READ COMMITTED: 50, REPEATABLE READ: 100
```

A lost update stopped by Repeatable Read:

```text
t1  A: BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT bal FROM acct WHERE id = 1;   -- 100
t2  B: UPDATE acct SET bal = bal - 30 WHERE id = 1; COMMIT;                       -- 70
t3  A: UPDATE acct SET bal = bal - 10 WHERE id = 1;
    ERROR:  could not serialize access due to concurrent update   (SQLSTATE 40001)
```

## Practice

The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded output.

A two-lane diagram: switch the isolation level and see how the same script ends differently. Then three questions. Expert skill: for a concrete business flow (a report, a transfer, a booking), choose the lowest isolation level that is still correct and know where to retry.
