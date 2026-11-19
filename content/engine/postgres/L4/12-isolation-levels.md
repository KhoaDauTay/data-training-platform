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
  - { vi: "Biết READ COMMITTED lấy snapshot mỗi câu, REPEATABLE READ lấy một snapshot cho cả giao dịch", en: "Know that READ COMMITTED takes a snapshot per statement and REPEATABLE READ one snapshot per transaction" }
requires: [e-pg-l4-09]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://www.postgresql.org/docs/18/sql-set-transaction.html
viz: pg-isolation-anomalies
quiz:
  - q: { vi: "Ở READ COMMITTED, một giao dịch chạy `SELECT sum(bal) FROM acct` hai lần. Giữa hai lần, phiên khác chuyển tiền và COMMIT. Hai tổng có thể khác nhau không?", en: "Under READ COMMITTED, a transaction runs `SELECT sum(bal) FROM acct` twice. Between them, another session moves money and COMMITs. Can the two sums differ?" }
    options:
      - { vi: "Không, cùng giao dịch thì cùng dữ liệu", en: "No, the same transaction sees the same data" }
      - { vi: "Có: mỗi câu lấy snapshot mới, nên thấy thay đổi đã commit giữa chừng (non-repeatable read)", en: "Yes: each statement takes a new snapshot, so it sees changes committed in between (non-repeatable read)" }
      - { vi: "Có, vì nó còn thấy cả thay đổi chưa commit", en: "Yes, because it even sees uncommitted changes" }
    answer: 1
    why: { vi: "READ COMMITTED (mặc định) không bao giờ thấy dữ liệu chưa commit, nhưng mỗi câu thấy trạng thái đã commit lúc câu bắt đầu. Báo cáo nhiều câu cần số nhất quán thì dùng REPEATABLE READ.", en: "READ COMMITTED (the default) never sees uncommitted data, but each statement sees what was committed when it started. A multi-statement report that needs consistent numbers should use REPEATABLE READ." }
  - q: { vi: "Ở REPEATABLE READ, giao dịch A đọc dòng 1 rồi `UPDATE` dòng 1. Giữa đó, B đã sửa dòng 1 và COMMIT. A nhận gì?", en: "Under REPEATABLE READ, transaction A reads row 1, then `UPDATE`s row 1. In between, B changed row 1 and COMMITted. What does A get?" }
    options:
      - { vi: "A ghi đè thay đổi của B (lost update)", en: "A overwrites B's change (lost update)" }
      - { vi: "Lỗi `could not serialize access due to concurrent update` (SQLSTATE 40001); A phải hủy và thử lại", en: "The error `could not serialize access due to concurrent update` (SQLSTATE 40001); A must roll back and retry" }
      - { vi: "A tự động đọc lại và cập nhật trên giá trị mới", en: "A automatically re-reads and updates the new value" }
    answer: 1
    why: { vi: "REPEATABLE READ không cho sửa một dòng đã bị giao dịch khác sửa sau snapshot của mình. Hành vi \"đọc lại giá trị mới rồi cập nhật\" là của READ COMMITTED.", en: "REPEATABLE READ does not allow updating a row that another transaction changed after its snapshot. \"Re-read the new value and update it\" is the READ COMMITTED behaviour." }
  - q: { vi: "Theo bảng của tài liệu Postgres, phantom read ở REPEATABLE READ là gì?", en: "According to the Postgres documentation's table, what about phantom reads under REPEATABLE READ?" }
    options:
      - { vi: "Có thể xảy ra, như chuẩn SQL cho phép", en: "Possible, as the SQL standard allows" }
      - { vi: "Chuẩn cho phép, nhưng Postgres không để xảy ra", en: "Allowed by the standard, but not possible in Postgres" }
      - { vi: "Chỉ xảy ra với bảng phân vùng", en: "Only possible with partitioned tables" }
    answer: 1
    why: { vi: "Postgres cài REPEATABLE READ bằng snapshot isolation: cả giao dịch nhìn một snapshot, nên dòng mới của người khác không bao giờ hiện ra. Serialization anomaly thì vẫn có thể.", en: "Postgres implements REPEATABLE READ as snapshot isolation: the whole transaction sees one snapshot, so other sessions' new rows never appear. A serialization anomaly is still possible." }
---

## Ý chính

- READ UNCOMMITTED — dirty read: chuẩn cho phép, PG không; non-repeatable read: có thể; phantom read: có thể; serialization anomaly: có thể
- READ COMMITTED (mặc định) — dirty read: không; non-repeatable read: có thể; phantom read: có thể; serialization anomaly: có thể
- REPEATABLE READ — dirty read: không; non-repeatable read: không; phantom read: chuẩn cho phép, PG không; serialization anomaly: có thể
- SERIALIZABLE — dirty read: không; non-repeatable read: không; phantom read: không; serialization anomaly: không

- Dirty read: thấy dữ liệu chưa commit. Non-repeatable read: đọc lại một dòng thấy giá trị khác. Phantom: chạy lại điều kiện thấy tập dòng khác. Serialization anomaly: kết quả cuối không khớp với bất kỳ thứ tự chạy lần lượt nào.
- READ UNCOMMITTED trong Postgres chạy y như READ COMMITTED.
- READ COMMITTED: snapshot mỗi câu. Khi `UPDATE` gặp dòng vừa bị người khác sửa, nó chờ người đó xong rồi đánh giá lại điều kiện trên phiên bản mới.
- REPEATABLE READ: một snapshot cho cả giao dịch (từ câu đầu tiên). Gặp xung đột ghi thì báo 40001; ứng dụng phải thử lại cả giao dịch.
- SERIALIZABLE: thêm phát hiện xung đột đọc/ghi (bài sau).

## Ví dụ

Non-repeatable read ở READ COMMITTED, diễn từng bước (mô phỏng có giải thích; PGlite chỉ có một phiên):

```text
t1  A: BEGIN;  SELECT bal FROM acct WHERE id = 1;     -- 100
t2  B: UPDATE acct SET bal = 50 WHERE id = 1; COMMIT;
t3  A: SELECT bal FROM acct WHERE id = 1;             -- READ COMMITTED: 50, REPEATABLE READ: 100
```

Lost update bị REPEATABLE READ chặn:

```text
t1  A: BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT bal FROM acct WHERE id = 1;   -- 100
t2  B: UPDATE acct SET bal = bal - 30 WHERE id = 1; COMMIT;                       -- 70
t3  A: UPDATE acct SET bal = bal - 10 WHERE id = 1;
    ERROR:  could not serialize access due to concurrent update   (SQLSTATE 40001)
```

## Thực hành

Sơ đồ hai làn: bật/tắt mức cô lập và xem cùng một kịch bản cho kết quả khác nhau ra sao. Sau đó ba câu hỏi. Kỹ năng chuyên gia: với một nghiệp vụ cụ thể (báo cáo, chuyển tiền, đặt chỗ), chọn mức cô lập thấp nhất vẫn đúng và biết phải thử lại ở đâu.

# EN

## Key idea

- READ UNCOMMITTED — dirty read: allowed by the standard, not in PG; non-repeatable read: possible; phantom read: possible; serialization anomaly: possible
- READ COMMITTED (default) — dirty read: no; non-repeatable read: possible; phantom read: possible; serialization anomaly: possible
- REPEATABLE READ — dirty read: no; non-repeatable read: no; phantom read: allowed by the standard, not in PG; serialization anomaly: possible
- SERIALIZABLE — dirty read: no; non-repeatable read: no; phantom read: no; serialization anomaly: no

- Dirty read: seeing uncommitted data. Non-repeatable read: re-reading a row returns a different value. Phantom: re-running a condition returns a different set of rows. Serialization anomaly: the final result matches no one-at-a-time order of the transactions.
- READ UNCOMMITTED in Postgres behaves exactly like READ COMMITTED.
- READ COMMITTED: a snapshot per statement. When an `UPDATE` meets a row someone else just changed, it waits for them to finish, then re-checks its condition on the new version.
- REPEATABLE READ: one snapshot for the whole transaction (from its first statement). A write conflict raises 40001; the application must retry the whole transaction.
- SERIALIZABLE: adds detection of read/write conflicts (next lesson).

## Example

A non-repeatable read under READ COMMITTED, step by step (an explained simulation; PGlite has a single session):

```text
t1  A: BEGIN;  SELECT bal FROM acct WHERE id = 1;     -- 100
t2  B: UPDATE acct SET bal = 50 WHERE id = 1; COMMIT;
t3  A: SELECT bal FROM acct WHERE id = 1;             -- READ COMMITTED: 50, REPEATABLE READ: 100
```

A lost update stopped by REPEATABLE READ:

```text
t1  A: BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT bal FROM acct WHERE id = 1;   -- 100
t2  B: UPDATE acct SET bal = bal - 30 WHERE id = 1; COMMIT;                       -- 70
t3  A: UPDATE acct SET bal = bal - 10 WHERE id = 1;
    ERROR:  could not serialize access due to concurrent update   (SQLSTATE 40001)
```

## Practice

A two-lane diagram: switch the isolation level and see how the same script ends differently. Then three questions. Expert skill: for a concrete business flow (a report, a transfer, a booking), choose the lowest isolation level that is still correct and know where to retry.
