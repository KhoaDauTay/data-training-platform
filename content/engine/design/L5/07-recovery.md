---
id: e-ds-l5-07
engine: design
level: L5
module: internals
title: Phục hồi - ARIES và WAL chỉ-redo của PostgreSQL
title_en: Recovery - ARIES and PostgreSQL's redo-only WAL
kind: concept
runtime: browser
minutes: 15
figures: [{ name: pg-wal-flow, at: idea }]
objectives:
  - vi: Giải thích luật ghi nhật ký trước (WAL) và bốn chính sách steal/no-steal, force/no-force.
    en: Explain the write-ahead logging rule and the four policies steal/no-steal, force/no-force.
  - vi: Chạy tay ba pha của ARIES (phân tích, làm lại, hoàn tác) trên một nhật ký nhỏ.
    en: Walk through the three ARIES phases (analysis, redo, undo) on a small log by hand.
  - vi: Nói vì sao PostgreSQL chỉ cần làm lại, không cần pha hoàn tác.
    en: Say why PostgreSQL only needs redo, with no undo phase.
requires: [e-ds-l5-05]
sources:
  - https://www.postgresql.org/docs/18/wal-intro.html
  - https://www.postgresql.org/docs/18/wal-reliability.html
  - https://www.postgresql.org/docs/18/backup.html
  - https://doi.org/10.1145/128765.128770
lab:
  setup: |
    CREATE TABLE events (v int NOT NULL);
    CREATE TABLE log (lsn int PRIMARY KEY, tx text NOT NULL, kind text NOT NULL, page text);
    INSERT INTO log VALUES
      (1, 'T1', 'begin', NULL), (2, 'T1', 'update', 'P1'), (3, 'T2', 'begin', NULL), (4, 'T2', 'update', 'P2'),
      (5, 'T1', 'commit', NULL), (6, 'T3', 'begin', NULL), (7, 'T3', 'update', 'P1'), (8, 'T2', 'update', 'P3');
    CREATE TABLE pages (page text PRIMARY KEY, page_lsn int NOT NULL);
    INSERT INTO pages VALUES ('P1', 2), ('P2', 4), ('P3', 0);
  steps:
    - task:
        vi: "Pha phân tích: máy sập sau bản ghi số 8. Giao dịch nào chưa commit (kẻ thua)? Trả `tx`, mỗi giao dịch một lần, xếp theo `tx`."
        en: "Analysis phase: the machine crashed after record 8. Which transactions never committed (the losers)? Return `tx`, each once, ordered by `tx`."
      solution: SELECT DISTINCT tx FROM log WHERE tx NOT IN (SELECT tx FROM log WHERE kind = 'commit') ORDER BY tx
      check: rows
      ordered: true
      hint:
        vi: "Các `tx` không có bản ghi `kind = 'commit'`: `NOT IN` hoặc `NOT EXISTS`."
        en: "The `tx` values without a `kind = 'commit'` record: `NOT IN` or `NOT EXISTS`."
    - task:
        vi: "Pha làm lại: bản ghi `update` nào phải làm lại? Đó là bản ghi có `lsn` lớn hơn `page_lsn` của trang nó sửa (trang chưa chứa thay đổi đó). Trả `lsn`, `page`, xếp theo `lsn`."
        en: "Redo phase: which `update` records must be redone? Those whose `lsn` is greater than the `page_lsn` of the page they change (the page does not hold that change yet). Return `lsn`, `page`, ordered by `lsn`."
      solution: SELECT l.lsn, l.page FROM log l JOIN pages p ON p.page = l.page WHERE l.kind = 'update' AND l.lsn > p.page_lsn ORDER BY l.lsn
      check: rows
      ordered: true
      hint:
        vi: "Nối `log` với `pages` theo `page`, giữ `kind = 'update'` và `l.lsn > p.page_lsn`."
        en: "Join `log` to `pages` on `page`, keep `kind = 'update'` and `l.lsn > p.page_lsn`."
    - task:
        vi: "Pha hoàn tác: các `update` của kẻ thua, theo thứ tự hoàn tác (`lsn` giảm dần). Trả `lsn`, `tx`, `page`."
        en: "Undo phase: the losers' `update` records, in undo order (`lsn` descending). Return `lsn`, `tx`, `page`."
      solution: SELECT lsn, tx, page FROM log WHERE kind = 'update' AND tx NOT IN (SELECT tx FROM log WHERE kind = 'commit') ORDER BY lsn DESC
      check: rows
      ordered: true
      hint:
        vi: "Dùng lại điều kiện kẻ thua của bước 1, rồi `ORDER BY lsn DESC`: hoàn tác đi ngược thời gian."
        en: "Reuse step 1's loser condition, then `ORDER BY lsn DESC`: undo walks backwards in time."
quiz:
  - q:
      vi: "Luật ghi nhật ký trước (WAL) đòi điều gì?"
      en: "What does the write-ahead logging (WAL) rule require?"
    options:
      - { vi: "Bản ghi nhật ký của một thay đổi phải xuống đĩa trước trang dữ liệu chứa thay đổi đó, và trước khi commit được báo xong", en: "A change's log record must reach disk before the data page holding it, and before the commit is reported done" }
      - { vi: "Mọi trang dữ liệu phải ghi xuống đĩa ngay lúc commit", en: "Every data page must be written to disk at commit" }
      - { vi: "Nhật ký chỉ cần ghi khi máy sắp tắt", en: "The log only needs writing when the machine is about to shut down" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì ghi hết trang lúc commit có vẻ an toàn nhất, nhưng đó là chính sách force, rất chậm. WAL cho phép no-force: chỉ cần nhật ký tuần tự xuống đĩa; sau sự cố, nhật ký đủ để làm lại các trang."
      en: "It sounds right because writing every page at commit feels safest, but that is the force policy, and it is slow. WAL allows no-force: only the sequential log must reach disk; after a crash the log is enough to redo the pages."
  - q:
      vi: "Vì sao PostgreSQL không cần pha hoàn tác như ARIES?"
      en: "Why does PostgreSQL need no undo phase like ARIES?"
    options:
      - { vi: "Vì nó không bao giờ ghi trang chưa commit xuống đĩa", en: "Because it never writes uncommitted pages to disk" }
      - { vi: "Vì MVCC: phiên bản dòng của giao dịch hủy vẫn nằm đó nhưng vô hình, vì giao dịch không được ghi là đã commit", en: "Because of MVCC: an aborted transaction's row versions stay but are invisible, since the transaction is not recorded as committed" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ Postgres giữ trang bẩn trong bộ nhớ tới lúc commit. Thật ra nó cho ghi trang chưa commit (steal). Không cần hoàn tác vì mỗi dòng mang mã giao dịch: giao dịch không commit thì phiên bản của nó không ai thấy, và VACUUM dọn sau."
      en: "Many people think Postgres keeps dirty pages in memory until commit. In fact it lets uncommitted pages reach disk (steal). No undo is needed because every row version carries its transaction id: if that transaction did not commit, nobody sees its versions, and VACUUM cleans them later."
---
## Mở bài

Máy mất điện ngay giữa lúc đang ghi: dữ liệu đã commit phải còn, dữ liệu chưa commit phải biến mất. Đó là chữ D và chữ A của ACID. Bài này xem database làm điều đó bằng nhật ký ra sao.

## Ý chính

Bộ đệm giữ trang trong RAM, nên lúc sập, đĩa có thể thiếu thay đổi đã commit hoặc chứa thay đổi chưa commit. Hai câu hỏi chính sách: có cho ghi trang chưa commit xuống đĩa không (**steal** / no-steal), và có bắt ghi mọi trang lúc commit không (**force** / no-force). Steal cần khả năng hoàn tác, no-force cần khả năng làm lại. Hệ thống thật chọn steal + no-force vì nhanh nhất, và trả giá bằng **nhật ký ghi trước**: mọi thay đổi được ghi vào nhật ký tuần tự trước khi trang của nó xuống đĩa, và commit chỉ xong khi nhật ký tới bản ghi commit đã xuống đĩa.

**ARIES** là thuật toán phục hồi kinh điển. Mỗi bản ghi nhật ký có số thứ tự LSN; mỗi trang nhớ `pageLSN`, LSN của thay đổi cuối nó chứa. Sau sự cố, ba pha: **phân tích** đọc nhật ký từ điểm kiểm tra gần nhất để biết giao dịch nào chưa commit và trang nào có thể bẩn; **làm lại** lặp lại mọi thay đổi có LSN lớn hơn `pageLSN` của trang, kể cả của kẻ thua; **hoàn tác** đi ngược nhật ký gỡ thay đổi của kẻ thua, ghi bản bù (CLR) để sập lần nữa cũng không gỡ hai lần. Điểm kiểm tra mờ không dừng hệ thống.

**PostgreSQL** chỉ có làm lại. Nhờ MVCC, thay đổi của giao dịch hủy chỉ là phiên bản dòng không ai thấy, nên không cần gỡ. Nó còn ghi cả trang lần đầu trang đổi sau mỗi điểm kiểm tra, chống trang ghi dở. Sao lưu: `pg_dump` cho bản logic; bản sao vật lý cộng lưu trữ WAL cho phép khôi phục tới một thời điểm. Chi tiết WAL thật ở `e-pg-l3-12`.

Hình từng bước ở cuối mục này theo một thay đổi đi vào WAL trước, rồi mới tới tệp dữ liệu: đó là cách ghi chỉ-redo của Postgres.

## Ví dụ

Nhật ký lớn lên khi ghi: so LSN trước và sau một lần chèn.

```sql
CREATE TABLE ex_lsn AS SELECT pg_current_wal_lsn() AS before_lsn;
INSERT INTO events SELECT g FROM generate_series(1, 1000) g;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), before_lsn) > 0 AS wal_grew FROM ex_lsn;
```

Giao dịch hủy: dòng đã chèn không còn thấy được.

```sql
BEGIN;
INSERT INTO events VALUES (-1);
ROLLBACK;
SELECT count(*) AS visible FROM events WHERE v = -1;
```

Bảng giao dịch của pha phân tích, đọc từ nhật ký trong lab.

```sql
SELECT tx, max(lsn) AS last_lsn, bool_or(kind = 'commit') AS committed
FROM log GROUP BY tx ORDER BY tx;
```

## Lỗi hay gặp

Điểm lưu chỉ có trong một giao dịch.

```sql
-- ERROR 25P01: SAVEPOINT can only be used in transaction blocks
SAVEPOINT s1;
```

Lùi về điểm lưu không hủy cả giao dịch.

```sql
-- WRONG: ROLLBACK TO SAVEPOINT undoes only the part after s1, then COMMIT keeps 100
BEGIN;
INSERT INTO events VALUES (100);
SAVEPOINT s1;
INSERT INTO events VALUES (200);
ROLLBACK TO SAVEPOINT s1;
COMMIT;
SELECT count(*) AS kept FROM events WHERE v IN (100, 200);
```

```sql
-- FIX: ROLLBACK undoes the whole transaction
BEGIN;
INSERT INTO events VALUES (300);
SAVEPOINT s1;
INSERT INTO events VALUES (400);
ROLLBACK;
SELECT count(*) AS kept FROM events WHERE v IN (300, 400);
```

## Tóm tắt

- Steal + no-force là nhanh nhất; WAL làm nó an toàn: nhật ký xuống đĩa trước trang và trước khi commit xong.
- ARIES: phân tích, làm lại (LSN > `pageLSN`), hoàn tác ngược thời gian có bản bù CLR.
- PostgreSQL chỉ làm lại; MVCC làm thay đổi của giao dịch hủy thành vô hình.
- Ghi cả trang sau điểm kiểm tra chống trang ghi dở; sao lưu vật lý + WAL cho khôi phục tới một thời điểm.

# EN

## Opening

The power fails in the middle of a write: committed data must survive and uncommitted data must vanish. That is the D and the A of ACID. This lesson shows how a database does it with a log.

## Key idea

The buffer cache keeps pages in RAM, so at a crash the disk may lack committed changes or hold uncommitted ones. Two policy questions: may an uncommitted page be written to disk (**steal** / no-steal), and must every page be written at commit (**force** / no-force). Steal needs the ability to undo, no-force the ability to redo. Real systems pick steal + no-force because it is fastest, and pay with **write-ahead logging**: every change is written to a sequential log before its page reaches disk, and a commit is done only once the log up to its commit record is on disk.

**ARIES** is the classic recovery algorithm. Each log record has a sequence number, the LSN; each page remembers its `pageLSN`, the LSN of the last change it holds. After a crash, three phases: **analysis** reads the log from the last checkpoint to learn which transactions did not commit and which pages may be dirty; **redo** repeats every change whose LSN is greater than the page's `pageLSN`, losers' changes included; **undo** walks the log backwards removing the losers' changes, writing compensation records (CLRs) so that a second crash never undoes twice. Fuzzy checkpoints do not stop the system.

**PostgreSQL** only redoes. Thanks to MVCC, an aborted transaction's changes are just row versions nobody sees, so nothing must be removed. It also writes the whole page the first time a page changes after each checkpoint, against torn pages. Backups: `pg_dump` for a logical copy; a physical base backup plus a WAL archive allows point-in-time recovery. The real WAL in detail is in `e-pg-l3-12`.

The step-through figure at the end of this section follows one change into the WAL first and only then into the data files: that is how Postgres logs redo only.

## Example

The log grows when you write: compare the LSN before and after an insert.

```sql
CREATE TABLE ex_lsn AS SELECT pg_current_wal_lsn() AS before_lsn;
INSERT INTO events SELECT g FROM generate_series(1, 1000) g;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), before_lsn) > 0 AS wal_grew FROM ex_lsn;
```

An aborted transaction: the inserted row is no longer visible.

```sql
BEGIN;
INSERT INTO events VALUES (-1);
ROLLBACK;
SELECT count(*) AS visible FROM events WHERE v = -1;
```

The analysis phase's transaction table, read from the lab's log.

```sql
SELECT tx, max(lsn) AS last_lsn, bool_or(kind = 'commit') AS committed
FROM log GROUP BY tx ORDER BY tx;
```

## Common mistakes

Savepoints exist only inside a transaction.

```sql
-- ERROR 25P01: SAVEPOINT can only be used in transaction blocks
SAVEPOINT s1;
```

Rolling back to a savepoint does not cancel the whole transaction.

```sql
-- WRONG: ROLLBACK TO SAVEPOINT undoes only the part after s1, then COMMIT keeps 100
BEGIN;
INSERT INTO events VALUES (100);
SAVEPOINT s1;
INSERT INTO events VALUES (200);
ROLLBACK TO SAVEPOINT s1;
COMMIT;
SELECT count(*) AS kept FROM events WHERE v IN (100, 200);
```

```sql
-- FIX: ROLLBACK undoes the whole transaction
BEGIN;
INSERT INTO events VALUES (300);
SAVEPOINT s1;
INSERT INTO events VALUES (400);
ROLLBACK;
SELECT count(*) AS kept FROM events WHERE v IN (300, 400);
```

## Recap

- Steal + no-force is fastest; WAL makes it safe: the log reaches disk before the page and before the commit is done.
- ARIES: analysis, redo (LSN > `pageLSN`), undo backwards with CLR compensation records.
- PostgreSQL only redoes; MVCC makes an aborted transaction's changes invisible.
- Full-page writes after a checkpoint guard against torn pages; a physical backup + WAL gives point-in-time recovery.
