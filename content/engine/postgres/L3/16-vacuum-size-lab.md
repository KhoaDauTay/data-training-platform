---
id: e-pg-l3-16
engine: postgres
level: L3
module: vacuum-hot
title: "Lab: VACUUM có làm file bảng nhỏ lại không?"
title_en: "Lab: does VACUUM make the table file smaller?"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-vacuum-flow
objectives:
  - vi: Đo kích thước bảng sau khi xóa dòng ở đầu và ở đuôi bảng rồi VACUUM
    en: Measure the table size after deleting rows at the head and at the tail of a table, then vacuuming
  - vi: Thấy chỗ trống VACUUM để lại được INSERT sau dùng lại
    en: See the free space VACUUM leaves behind being reused by later INSERTs
  - vi: Giải thích ngoại lệ trang cuối bảng
    en: Explain the exception for pages at the end of the table
requires: [e-pg-l3-09]
sources:
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/sql-vacuum.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
lab:
  setup: |
    CREATE TABLE log_head(id int PRIMARY KEY, pad char(100));
    CREATE TABLE log_tail(id int PRIMARY KEY, pad char(100));
    CREATE TABLE log_reuse(id int PRIMARY KEY, pad char(100));
    INSERT INTO log_head SELECT g, 'p' FROM generate_series(1, 2000) g;
    INSERT INTO log_tail SELECT g, 'p' FROM generate_series(1, 2000) g;
    INSERT INTO log_reuse SELECT g, 'p' FROM generate_series(1, 2000) g;
    DELETE FROM log_head WHERE id <= 1800;
    DELETE FROM log_tail WHERE id > 200;
    DELETE FROM log_reuse WHERE id <= 1800;
    SELECT pg_stat_force_next_flush();
    VACUUM log_head;
    VACUUM log_tail;
    VACUUM log_reuse;
    INSERT INTO log_reuse SELECT g, 'n' FROM generate_series(2001, 3800) g;
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Ba bảng cùng nạp 2000 dòng (35 trang). `log_head` xóa 1800 dòng **đầu** bảng, `log_tail` xóa 1800 dòng **cuối** bảng; cả hai rồi VACUUM. Đoán trước khi chạy: mỗi bảng còn bao nhiêu trang? Lấy tên bảng và số trang (`pg_relation_size` chia 8192) của `log_head` và `log_tail`, theo tên bảng."
        en: "Three tables each loaded 2000 rows (35 pages). `log_head` deleted the **first** 1800 rows, `log_tail` the **last** 1800; then both were vacuumed. Guess before you run it: how many pages does each one keep? Return the table name and the page count (`pg_relation_size` divided by 8192) of `log_head` and `log_tail`, by table name."
      solution: |
        SELECT t, pg_relation_size(t) / 8192 AS pages
        FROM unnest(ARRAY['log_head', 'log_tail']) AS t
        ORDER BY t
      check: rows
      ordered: true
      hint:
        vi: "`unnest(ARRAY['log_head', 'log_tail'])` cho hai tên bảng; `pg_relation_size(t)` tính byte."
        en: "`unnest(ARRAY['log_head', 'log_tail'])` gives the two table names; `pg_relation_size(t)` counts bytes."
      fact:
        vi: "Cùng xóa 1800 dòng, kết quả ngược nhau: `log_head` vẫn 35 trang (31 trang đầu gần như trống), `log_tail` còn 4 trang. VACUUM chỉ cắt được các trang trống liền nhau ở **cuối** file; chỗ trống ở đầu hay giữa bảng vẫn nằm trong file."
        en: "Same 1800 deleted rows, opposite results: `log_head` is still 35 pages (its first 31 pages are nearly empty), `log_tail` is down to 4. VACUUM can only cut off the run of empty pages at the **end** of the file; free space at the head or in the middle stays inside the file."
        probe: SELECT t, pg_relation_size(t) / 8192 FROM unnest(ARRAY['log_head', 'log_tail']) AS t ORDER BY t
        expect: [[log_head, 35], [log_tail, 4]]
    - task:
        vi: "Đọc bộ đếm của ba bảng trong `pg_stat_user_tables`: tên bảng, `n_live_tup`, `n_dead_tup`, theo tên bảng."
        en: "Read the counters of the three tables in `pg_stat_user_tables`: table name, `n_live_tup`, `n_dead_tup`, by table name."
      solution: SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname IN ('log_head', 'log_reuse', 'log_tail') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "Lọc `relname` bằng `IN`, nhớ `ORDER BY relname`."
        en: "Filter `relname` with `IN`, and remember `ORDER BY relname`."
      fact:
        vi: "`n_dead_tup` = 0 ở cả ba: VACUUM đã dọn hết 1800 dead tuple mỗi bảng. Dọn xong nhưng `log_head` không nhỏ lại: dọn dead tuple và trả dung lượng cho hệ điều hành là hai việc khác nhau."
        en: "`n_dead_tup` = 0 on all three: VACUUM removed all 1800 dead tuples of each table. Cleaned, yet `log_head` did not shrink: removing dead tuples and giving space back to the OS are two different things."
        probe: SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname IN ('log_head', 'log_reuse', 'log_tail') ORDER BY relname
        expect: [[log_head, 200, 0], [log_reuse, 2000, 0], [log_tail, 200, 0]]
    - task:
        vi: "`log_reuse` giống `log_head` (xóa 1800 dòng đầu, VACUUM), rồi nhận 1800 dòng mới (`id > 2000`). Lấy số trang của `log_reuse`, cùng `ctid` nhỏ nhất, lớn nhất và số dòng của các dòng mới."
        en: "`log_reuse` went like `log_head` (first 1800 rows deleted, vacuumed), then took 1800 new rows (`id > 2000`). Return the page count of `log_reuse`, plus the smallest and largest `ctid` and the count of the new rows."
      solution: SELECT pg_relation_size('log_reuse') / 8192 AS pages, min(ctid) AS first_tid, max(ctid) AS last_tid, count(*) AS new_rows FROM log_reuse WHERE id > 2000
      check: rows
      hint:
        vi: "`min(ctid)` và `max(ctid)` chạy được trên kiểu `tid`; lọc `id > 2000`."
        en: "`min(ctid)` and `max(ctid)` work on the `tid` type; filter `id > 2000`."
      fact:
        vi: "Vẫn 35 trang: 1800 dòng mới vào từ `(0,1)` tới `(31,2)`, đúng chỗ VACUUM đã ghi vào free space map. Chỗ trống không mất, nó được dùng lại; bảng chỉ không trả nó cho hệ điều hành."
        en: "Still 35 pages: the 1800 new rows went from `(0,1)` to `(31,2)`, exactly the space VACUUM recorded in the free space map. The space is not lost, it is reused; the table just does not hand it back to the OS."
        probe: SELECT pg_relation_size('log_reuse') / 8192, min(ctid)::text, max(ctid)::text, count(*) FROM log_reuse WHERE id > 2000
        expect: [[35, "(0,1)", "(31,2)", 1800]]
quiz:
  - q:
      vi: "Vì sao `log_tail` co từ 35 xuống 4 trang mà `log_head` thì không, dù cả hai chỉ chạy `VACUUM` thường?"
      en: "Why did `log_tail` shrink from 35 to 4 pages while `log_head` did not, when both only ran a plain `VACUUM`?"
    options:
      - { vi: "`VACUUM` luôn trả chỗ trống cho hệ điều hành; `log_head` chỉ chưa kịp", en: "`VACUUM` always gives free space back to the OS; `log_head` just has not caught up yet" }
      - { vi: "`VACUUM` cắt được các trang trống hẳn ở cuối file (khi lấy được lock độc quyền trong chốc lát); trang trống ở đầu hay giữa thì không cắt được", en: "`VACUUM` can cut off fully empty pages at the end of the file (when it briefly gets an exclusive lock); empty pages at the head or in the middle cannot be cut" }
      - { vi: "`log_tail` được VACUUM FULL ngầm vì xóa nhiều hơn 50 %", en: "`log_tail` got an implicit VACUUM FULL because more than 50% was deleted" }
      - { vi: "Xóa dòng cuối bảng thì Postgres xóa luôn trang, không cần VACUUM", en: "Deleting rows at the end makes Postgres drop the pages at once, without VACUUM" }
    answer: 1
    trap: 0
    why:
      vi: "\"VACUUM luôn trả chỗ, `log_head` chỉ chưa kịp\" nghe hợp lý vì `log_tail` vừa co lại thật, nhưng đó là ngoại lệ trong docs chính thức: VACUUM chỉ cắt được các trang trống liền nhau ở **cuối** file, vì cắt đuôi file không làm dời dòng nào. Hai bảng cùng xóa 1800 dòng, chỉ khác vị trí: 35 trang so với 4. DELETE cũng không tự xóa trang: dòng xóa chỉ thành dead tuple cho tới khi VACUUM dọn. Không có VACUUM FULL ngầm nào; muốn `log_head` nhỏ lại thật phải viết lại bảng (`VACUUM FULL`, giữ lock `ACCESS EXCLUSIVE` suốt lúc chạy)."
      en: "\"VACUUM always gives space back, `log_head` has not caught up\" sounds right because `log_tail` really did shrink, but that is the exception in the docs: VACUUM can only cut off the run of empty pages at the **end** of the file, because truncating the file's tail moves no row. Both tables lost 1800 rows, only the position differs: 35 pages against 4. A DELETE does not drop pages either: deleted rows are only dead tuples until VACUUM cleans them. There is no implicit VACUUM FULL; to really shrink `log_head` you must rewrite the table (`VACUUM FULL`, which holds an `ACCESS EXCLUSIVE` lock while it runs)."
  - q:
      vi: "Một bảng log xóa dữ liệu cũ (dòng đầu bảng) mỗi đêm và chèn dữ liệu mới mỗi ngày với lượng tương đương. Có cần lên lịch `VACUUM FULL` hằng tuần không?"
      en: "A log table deletes old data (rows at the head) every night and inserts about the same amount of new data every day. Should you schedule a weekly `VACUUM FULL`?"
    options:
      - { vi: "Có: không có `VACUUM FULL` thì file tăng mãi", en: "Yes: without `VACUUM FULL` the file grows forever" }
      - { vi: "Không: VACUUM (autovacuum) thường đủ, vì chỗ trống được dòng mới dùng lại như `log_reuse`; `VACUUM FULL` khóa cả bảng mỗi tuần mà file sẽ phình lại tới cùng kích thước", en: "No: regular VACUUM (autovacuum) is enough, because new rows reuse the space as in `log_reuse`; `VACUUM FULL` locks the whole table every week and the file would grow back to the same size" }
      - { vi: "Có, nhưng chỉ khi bảng có index", en: "Yes, but only when the table has indexes" }
    answer: 1
    trap: 0
    why:
      vi: "Dễ nghĩ phải viết lại vì `log_head` không nhỏ lại, nhưng `log_reuse` cho thấy chỗ trống được dùng lại: 1800 dòng mới vào trang 0–31, bảng vẫn 35 trang. Khi lượng xóa và lượng chèn cân nhau, kích thước giữ ổn định. Index không đổi kết luận này. `VACUUM FULL` chỉ đáng khi bảng đã co hẳn và sẽ không lớn lại."
      en: "It is tempting to rewrite because `log_head` did not shrink, but `log_reuse` shows the space being reused: 1800 new rows went into pages 0–31 and the table stayed at 35 pages. When deletes and inserts balance, the size stays flat. Indexes do not change this conclusion. `VACUUM FULL` is only worth it when the table has shrunk for good and will not grow back."
---
## Mở bài

Bạn xóa 90 % dòng của một bảng log, chạy VACUUM, rồi mở bảng theo dõi ổ đĩa: con số không nhúc nhích. VACUUM có làm sai không?

## Ý chính

Nhiều người nghĩ VACUUM trả dung lượng cho hệ điều hành. Thật ra VACUUM dọn dead tuple và ghi chỗ trống vào free space map (FSM), để các INSERT và UPDATE sau dùng lại. File của bảng thường không nhỏ đi.

Ngoại lệ duy nhất: các trang trống hẳn nằm liền nhau ở cuối file. VACUUM cắt được đoạn đuôi đó, khi nó lấy được lock độc quyền trong chốc lát. Trang trống ở đầu hay ở giữa bảng thì vẫn nằm trong file, dù bên trong gần như không còn gì.

Chỗ trống đó không mất: dòng mới được ghi vào chính các trang VACUUM đã dọn, nên một bảng xóa và chèn với lượng tương đương sẽ giữ kích thước ổn định. Với bảng như vậy, VACUUM thường (hay autovacuum) là đủ.

Muốn file nhỏ lại thật thì phải viết lại bảng: `VACUUM FULL` chép các dòng còn sống sang file mới rồi bỏ file cũ. Cái giá là lock `ACCESS EXCLUSIVE` suốt lúc chạy, nên không ai đọc hay ghi được bảng, và cần thêm chỗ trống trên đĩa cho bản sao. Chỉ làm khi bảng đã co hẳn và sẽ không lớn lại.

## Cú pháp

```sql
VACUUM [ ( VERBOSE ) ] [ table_name ];
VACUUM FULL [ table_name ];
SELECT pg_relation_size('table_name') / 8192 AS pages;
SELECT * FROM pg_freespace('table_name');
```

- `pg_relation_size`: byte của file bảng chính, không gồm index; `pg_total_relation_size` gồm cả index và TOAST.
- `pg_freespace`: chỗ trống FSM ghi cho từng trang (extension `pg_freespacemap`).
- `VACUUM FULL`: viết lại bảng, giữ lock `ACCESS EXCLUSIVE`, không chạy trong transaction.

## Ví dụ

Số trang của hai bảng đã xóa cùng 1800 dòng ở hai đầu ngược nhau:

```sql
SELECT t, pg_relation_size(t) / 8192 AS pages
FROM unnest(ARRAY['log_head', 'log_tail']) AS t
ORDER BY t;
```

Chỗ trống mà VACUUM ghi vào FSM của `log_head`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_freespacemap;
SELECT count(*) AS pages, count(*) FILTER (WHERE avail > 7000) AS nearly_empty
FROM pg_freespace('log_head');
```

31 trên 35 trang còn hơn 7000 byte trống: đó là chỗ để dòng mới vào.

Bảng chính và tổng có cả index:

```sql
SELECT relname, pg_relation_size(oid) / 8192 AS heap_pages, pg_total_relation_size(oid) / 8192 AS with_indexes
FROM pg_class
WHERE relname IN ('log_head', 'log_tail')
ORDER BY relname;
```

Index khóa chính cũng không co lại sau khi xóa dòng.

## Lỗi hay gặp

Chạy `VACUUM FULL` trong một transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM FULL log_head;
```

Như mọi VACUUM, nó phải chạy ngoài transaction. Gõ `ROLLBACK` để thoát transaction đã hỏng.

Chờ VACUUM thường làm bảng nhỏ lại:

```sql
-- WRONG: a plain VACUUM keeps the free pages at the head
ROLLBACK;
VACUUM log_head;
SELECT pg_relation_size('log_head') / 8192 AS pages;
```

```sql
-- FIX: rewrite the table (takes an ACCESS EXCLUSIVE lock)
VACUUM FULL log_head;
SELECT pg_relation_size('log_head') / 8192 AS pages;
```

VACUUM thường giữ nguyên 35 trang; `VACUUM FULL` viết lại 200 dòng còn sống vào 4 trang. Chỉ đáng làm khi bảng sẽ không lớn lại, vì trên bảng log xóa và chèn đều đặn, file sẽ phình về kích thước cũ.

## Thực hành

Ba bước trên ba bảng lab dựng sẵn: so số trang của `log_head` và `log_tail`, đọc bộ đếm dead tuple, rồi xem 1800 dòng mới của `log_reuse` nằm ở đâu. Đoán số trang trước khi chạy bước 1. Sau đó là hai câu hỏi.

## Tóm tắt

- VACUUM dọn dead tuple để chỗ trống được dùng lại; nó thường không làm file nhỏ đi.
- Chỉ các trang trống hẳn liền nhau ở cuối file mới bị VACUUM cắt.
- Dòng mới dùng lại chỗ trống trong FSM, nên bảng xóa và chèn cân nhau giữ kích thước ổn định.
- `VACUUM FULL` làm file nhỏ lại thật nhưng giữ lock `ACCESS EXCLUSIVE`; chỉ dùng khi bảng đã co hẳn.

# EN

## Opening

You delete 90% of the rows of a log table, run VACUUM, then open the disk monitoring dashboard: the number does not move. Did VACUUM do something wrong?

## Key idea

Many people think VACUUM gives space back to the operating system. In fact VACUUM removes dead tuples and records the free space in the free space map (FSM), so later INSERTs and UPDATEs can reuse it. The table's file usually does not get smaller.

The one exception: fully empty pages in a run at the end of the file. VACUUM can cut off that tail, when it briefly gets an exclusive lock. Empty pages at the head or in the middle stay inside the file, even though almost nothing is left in them.

That space is not lost: new rows are written into the very pages VACUUM cleaned, so a table that deletes and inserts about the same amount keeps a steady size. For such a table a plain VACUUM (or autovacuum) is enough.

To really shrink the file you must rewrite the table: `VACUUM FULL` copies the live rows into a new file and drops the old one. The price is an `ACCESS EXCLUSIVE` lock while it runs, so nobody can read or write the table, plus extra disk space for the copy. Only do it when the table has shrunk for good and will not grow back.

## Syntax

```sql
VACUUM [ ( VERBOSE ) ] [ table_name ];
VACUUM FULL [ table_name ];
SELECT pg_relation_size('table_name') / 8192 AS pages;
SELECT * FROM pg_freespace('table_name');
```

- `pg_relation_size`: bytes of the main table file, indexes excluded; `pg_total_relation_size` includes indexes and TOAST.
- `pg_freespace`: the free space the FSM records for each page (extension `pg_freespacemap`).
- `VACUUM FULL`: rewrites the table, holds an `ACCESS EXCLUSIVE` lock, cannot run inside a transaction.

## Example

The page counts of two tables that each lost 1800 rows, at opposite ends:

```sql
SELECT t, pg_relation_size(t) / 8192 AS pages
FROM unnest(ARRAY['log_head', 'log_tail']) AS t
ORDER BY t;
```

The free space VACUUM recorded in the FSM of `log_head`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_freespacemap;
SELECT count(*) AS pages, count(*) FILTER (WHERE avail > 7000) AS nearly_empty
FROM pg_freespace('log_head');
```

31 of the 35 pages still have more than 7000 free bytes: that is where new rows will go.

The main table and the total with its indexes:

```sql
SELECT relname, pg_relation_size(oid) / 8192 AS heap_pages, pg_total_relation_size(oid) / 8192 AS with_indexes
FROM pg_class
WHERE relname IN ('log_head', 'log_tail')
ORDER BY relname;
```

The primary key index does not shrink after the deletes either.

## Common mistakes

Running `VACUUM FULL` inside a transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM FULL log_head;
```

Like every VACUUM, it must run outside a transaction. Type `ROLLBACK` to leave the failed transaction.

Expecting a plain VACUUM to shrink the table:

```sql
-- WRONG: a plain VACUUM keeps the free pages at the head
ROLLBACK;
VACUUM log_head;
SELECT pg_relation_size('log_head') / 8192 AS pages;
```

```sql
-- FIX: rewrite the table (takes an ACCESS EXCLUSIVE lock)
VACUUM FULL log_head;
SELECT pg_relation_size('log_head') / 8192 AS pages;
```

A plain VACUUM keeps all 35 pages; `VACUUM FULL` rewrites the 200 live rows into 4 pages. It is only worth it when the table will not grow back, because on a log table that deletes and inserts steadily the file swells back to its old size.

## Practice

Three steps on three tables the lab builds: compare the page counts of `log_head` and `log_tail`, read the dead tuple counters, then see where the 1800 new rows of `log_reuse` landed. Guess the page counts before you run step 1. Then two questions.

## Recap

- VACUUM removes dead tuples so the space can be reused; it usually does not make the file smaller.
- Only a run of fully empty pages at the end of the file gets cut by VACUUM.
- New rows reuse the free space in the FSM, so a table with balanced deletes and inserts keeps a steady size.
- `VACUUM FULL` really shrinks the file but holds an `ACCESS EXCLUSIVE` lock; use it only when the table has shrunk for good.
