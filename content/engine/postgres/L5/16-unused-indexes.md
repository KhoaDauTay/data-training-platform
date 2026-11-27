---
id: e-pg-l5-16
engine: postgres
level: L5
module: observe-tune
title: "Index không ai dùng: idx_scan = 0 và cái giá của mỗi index"
title_en: "Indexes nobody uses: idx_scan = 0 and the cost of each index"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tìm index không được dùng bằng `pg_stat_user_indexes` và biết khi nào con số đó chưa đủ để xóa
    en: Find unused indexes with `pg_stat_user_indexes` and know when that number is not yet enough to drop one
  - vi: Đo cái giá của index thừa trên UPDATE bằng `n_tup_hot_upd`
    en: Measure the cost of extra indexes on UPDATEs with `n_tup_hot_upd`
requires: [e-pg-l5-11]
figures: [{ name: pg-index-write-cost, at: idea }]
sources:
  - { url: https://www.postgresql.org/docs/18/indexes-intro.html, title_vi: "Nhập môn index" }
  - { url: https://www.postgresql.org/docs/18/monitoring-stats.html, title_vi: "Hệ thống thống kê hoạt động" }
  - { url: https://www.postgresql.org/docs/18/storage-hot.html, title_vi: "Cập nhật HOT (heap-only tuple)" }
lab:
  setup: |
    CREATE TABLE tickets(id int PRIMARY KEY, customer_id int NOT NULL, status text NOT NULL, opened_on date NOT NULL, note text) WITH (fillfactor = 80);
    INSERT INTO tickets SELECT g, g % 400 + 1, CASE WHEN g % 10 = 0 THEN 'open' ELSE 'closed' END, DATE '2026-01-01' + g % 300, 'n' FROM generate_series(1, 8000) g;
    CREATE INDEX tickets_customer_idx ON tickets (customer_id);
    CREATE INDEX tickets_status_idx ON tickets (status);
    CREATE INDEX tickets_opened_idx ON tickets (opened_on);
    CREATE INDEX tickets_status_opened_idx ON tickets (status, opened_on);
    CREATE TABLE tickets_lean(id int PRIMARY KEY, customer_id int NOT NULL, status text NOT NULL, opened_on date NOT NULL, note text) WITH (fillfactor = 80);
    INSERT INTO tickets_lean SELECT * FROM tickets;
    CREATE INDEX tickets_lean_customer_idx ON tickets_lean (customer_id);
    ANALYZE tickets, tickets_lean;
    SELECT pg_stat_reset();
    SELECT count(*) FROM tickets WHERE customer_id = 7;
    SELECT count(*) FROM tickets WHERE customer_id = 8;
    SELECT note FROM tickets WHERE id = 42;
    SELECT count(*) FROM tickets WHERE status = 'open' AND opened_on >= '2026-10-01';
    UPDATE tickets SET status = 'closed' WHERE id % 10 = 0 AND id <= 400;
    UPDATE tickets_lean SET status = 'closed' WHERE id % 10 = 0 AND id <= 400;
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Từ lúc reset bộ đếm, ứng dụng đã chạy một ngày tiêu biểu trên `tickets` (5 index). Liệt kê index của `tickets`: tên và `idx_scan`, theo tên."
        en: "Since the counters were reset, the app ran a typical day on `tickets` (5 indexes). List the indexes of `tickets`: name and `idx_scan`, by name."
      solution: SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE relname = 'tickets' ORDER BY indexrelname
      check: rows
      ordered: true
      hint:
        vi: "`pg_stat_user_indexes`, lọc `relname`."
        en: "`pg_stat_user_indexes`, filter on `relname`."
      fact:
        vi: "`tickets_opened_idx` và `tickets_status_idx` có `idx_scan` = 0. `tickets_status_idx` còn thừa vì `tickets_status_opened_idx` có cùng cột đầu `status` và đã được dùng 1 lần."
        en: "`tickets_opened_idx` and `tickets_status_idx` have `idx_scan` = 0. `tickets_status_idx` is redundant too, since `tickets_status_opened_idx` has the same leading column `status` and was used once."
        probe: SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE relname = 'tickets' ORDER BY indexrelname
        expect: [[tickets_customer_idx, 2], [tickets_opened_idx, 0], [tickets_pkey, 2], [tickets_status_idx, 0], [tickets_status_opened_idx, 1]]
    - task:
        vi: "Mỗi index tốn bao nhiêu chỗ? Lấy tên và số trang (`pg_relation_size(indexrelid)` chia 8192) của các index trên `tickets`, theo tên."
        en: "How much space does each index take? Return the name and page count (`pg_relation_size(indexrelid)` divided by 8192) of the indexes on `tickets`, by name."
      solution: SELECT indexrelname, pg_relation_size(indexrelid) / 8192 AS pages FROM pg_stat_user_indexes WHERE relname = 'tickets' ORDER BY indexrelname
      check: rows
      ordered: true
      hint:
        vi: "`indexrelid` là oid của index."
        en: "`indexrelid` is the index's oid."
      fact:
        vi: "Hai index không ai dùng chiếm 19 trang (10 + 9), trong tổng 63 trang index. Mỗi trang đó vẫn phải ghi, chiếm chỗ trong bộ đệm, đi vào WAL (nhật ký ghi trước) và vào backup."
        en: "The two unused indexes take 19 pages (10 + 9) out of 63 index pages in total. Every one of those pages is still written, takes room in the buffer cache, goes into the WAL (write-ahead log) and into backups."
        probe: SELECT indexrelname, pg_relation_size(indexrelid) / 8192 FROM pg_stat_user_indexes WHERE relname = 'tickets' ORDER BY indexrelname
        expect: [[tickets_customer_idx, 10], [tickets_opened_idx, 10], [tickets_pkey, 24], [tickets_status_idx, 9], [tickets_status_opened_idx, 10]]
    - task:
        vi: "Cùng 40 UPDATE đóng phiếu (đổi `status`) chạy trên `tickets` và trên `tickets_lean` (chỉ có khóa chính và index `customer_id`). Đọc `n_tup_upd` và `n_tup_hot_upd` của hai bảng, theo tên bảng."
        en: "The same 40 UPDATEs closing tickets (changing `status`) ran on `tickets` and on `tickets_lean` (only the primary key and the `customer_id` index). Read `n_tup_upd` and `n_tup_hot_upd` of both tables, by table name."
      solution: SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('tickets', 'tickets_lean') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "`pg_stat_user_tables`, lọc hai tên bảng bằng `IN`."
        en: "`pg_stat_user_tables`, filter the two table names with `IN`."
      fact:
        vi: "`tickets`: 40 UPDATE, 0 HOT. `tickets_lean`: 40 UPDATE, 40 HOT (heap-only tuple: bản dòng mới chỉ ghi vào bảng, không thêm mục index). HOT chỉ được khi không cột nào có index bị đổi; `status` nằm trong hai index của `tickets`, nên mỗi UPDATE ở đó phải thêm mục vào cả 5 index."
        en: "`tickets`: 40 updates, 0 HOT. `tickets_lean`: 40 updates, 40 HOT (heap-only tuple: the new row version goes only into the table, with no new index entry). HOT is only possible when no indexed column changes; `status` is in two of `tickets`' indexes, so every UPDATE there must add entries to all 5 indexes."
        probe: SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('tickets', 'tickets_lean') ORDER BY relname
        expect: [[tickets, 40, 0], [tickets_lean, 40, 40]]
quiz:
  - q:
      vi: "Việc đóng phiếu đang chậm. Một đồng nghiệp đề xuất thêm một index nữa trên `(status, id)` cho nhanh. Đề xuất nào đúng hơn?"
      en: "Closing tickets is slow. A colleague proposes one more index on `(status, id)` to speed it up. Which proposal is better?"
    options:
      - { vi: "Thêm index `(status, id)`: thêm index là thêm tốc độ", en: "Add the `(status, id)` index: more indexes, more speed" }
      - { vi: "Bỏ `tickets_status_idx` (0 lần dùng, thừa vì `tickets_status_opened_idx` có cùng cột đầu) và xem lại `tickets_opened_idx` (0 lần dùng)", en: "Drop `tickets_status_idx` (0 uses, redundant with `tickets_status_opened_idx`, which has the same leading column) and review `tickets_opened_idx` (0 uses)" }
      - { vi: "Chạy `REINDEX` cả bảng mỗi đêm", en: "Run `REINDEX` on the whole table every night" }
    answer: 1
    trap: 0
    why:
      vi: "Thêm index nghe hợp lý vì mỗi index làm nhanh một kiểu đọc, nhưng việc chậm ở đây là ghi. Câu đóng phiếu tìm phiếu bằng khóa chính rồi đổi `status`; vì `status` có index, UPDATE không thể là HOT (chỉ ghi bảng, không thêm mục index) và phải thêm mục vào cả 5 index. Bước 3 đo đúng cái giá đó: 0 HOT trên 40 UPDATE, so với 40 HOT ở `tickets_lean`. Index `(status, id)` lại thêm một index chứa `status`. `REINDEX` mỗi đêm chỉ làm gọn cây, không bớt số index phải ghi."
      en: "Adding an index sounds right because each index speeds up some kind of read, but the slow work here is writing. Closing a ticket finds it by primary key, then changes `status`; because `status` is indexed, the UPDATE cannot be HOT (table only, no new index entry) and must add entries to all 5 indexes. Step 3 measures exactly that cost: 0 HOT out of 40 UPDATEs, against 40 HOT on `tickets_lean`. A `(status, id)` index adds one more index holding `status`. A nightly `REINDEX` only compacts the trees; it does not reduce the number of indexes to write."
  - q:
      vi: "`tickets_opened_idx` có `idx_scan` = 0. Có nên xóa ngay không?"
      en: "`tickets_opened_idx` has `idx_scan` = 0. Should you drop it right away?"
    options:
      - { vi: "Có: 0 nghĩa là không bao giờ dùng", en: "Yes: 0 means never used" }
      - { vi: "Chưa: bộ đếm chỉ tính từ lần reset cuối và chỉ trên server này; kiểm qua trọn một chu kỳ (báo cáo cuối tháng), trên cả replica, và chắc nó không giữ một ràng buộc UNIQUE", en: "Not yet: the counter only covers the time since the last reset and only this server; check over a full cycle (month-end reports), on the replicas too, and make sure it does not back a UNIQUE constraint" }
      - { vi: "Không bao giờ: xóa index là nguy hiểm", en: "Never: dropping an index is dangerous" }
    answer: 1
    trap: 0
    why:
      vi: "Con số 0 trông như bằng chứng cuối cùng, nhưng nó chỉ đúng cho khoảng thời gian bộ đếm ghi lại: lab này reset ngay trước một ngày tiêu biểu. Báo cáo cuối tháng hay câu chạy trên replica không hiện ở đây, và index giữ ràng buộc UNIQUE vẫn làm việc mỗi lần ghi dù `idx_scan` = 0. \"Không bao giờ xóa\" thì sai theo chiều ngược lại: index không dùng vẫn tốn chỗ và làm chậm mỗi lần ghi, như bước 2 và bước 3 đo được. Kiểm đủ rồi mới xóa."
      en: "Zero looks like final proof, but it only holds for the time the counters covered: this lab reset them right before one typical day. A month-end report or a query on a replica does not show up here, and an index backing a UNIQUE constraint still works on every write even with `idx_scan` = 0. \"Never drop\" is wrong the other way: an unused index still takes space and slows every write, as steps 2 and 3 measured. Check fully, then drop."
---
## Mở bài

Bảng `tickets` có năm index, mỗi cái do một người thêm vào "cho nhanh" trong một lần sửa lỗi nào đó. Giờ việc đóng phiếu chậm dần, và không ai dám xóa index nào. Làm sao biết index nào thật sự đang làm việc?

## Ý chính

Nhiều người nghĩ thêm index là nhanh hơn, càng nhiều càng tốt. Thật ra mỗi index làm mọi INSERT, UPDATE, DELETE tốn thêm việc, chiếm chỗ trên đĩa và trong bộ đệm, đi vào WAL và vào backup. Docs chính thức nói thẳng: index ít khi hoặc không bao giờ được dùng thì nên bỏ.

`pg_stat_user_indexes.idx_scan` đếm số lần mỗi index được đọc từ lần reset bộ đếm cuối. Một index có cùng cột đầu với một index nhiều cột khác thường thừa: index `(status, opened_on)` phục vụ được câu lọc theo `status` một mình.

Một index trên cột hay bị sửa còn chặn HOT update. HOT chỉ xảy ra khi UPDATE không đổi cột nào có trong index và trang còn chỗ; khi đó Postgres không phải thêm mục vào index nào. `n_tup_hot_upd` trong `pg_stat_user_tables` đếm số lần HOT, nên so nó với `n_tup_upd` cho thấy cái giá của index thừa.

Trước khi xóa: con số 0 chỉ đúng cho khoảng bộ đếm ghi lại và chỉ trên server này (replica có bộ đếm riêng); index giữ khóa chính hay `UNIQUE` vẫn làm việc khi ghi dù không ai đọc. Xóa trên server thật bằng `DROP INDEX CONCURRENTLY` để không khóa bảng.

Hình từng bước ở cuối mục này đặt `idx_scan` của năm index cạnh số UPDATE được HOT trên hai bảng của lab.

## Cú pháp

```sql
SELECT relname, indexrelname, idx_scan, pg_relation_size(indexrelid)
FROM pg_stat_user_indexes [ WHERE relname = 'table_name' ];
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables [ WHERE relname = 'table_name' ];
DROP INDEX [ CONCURRENTLY ] [ IF EXISTS ] index_name;
```

- `idx_scan`: số lần index được dùng để đọc, tính từ lần reset cuối.
- `n_tup_hot_upd`: số UPDATE không phải chạm index nào.
- `CONCURRENTLY`: xóa mà không chặn đọc ghi trên bảng; không chạy trong transaction.

## Ví dụ

Index nào giữ một ràng buộc? Đọc `pg_index` trước khi nghĩ tới việc xóa:

```sql
SELECT indexrelid::regclass::text AS index_name, indisunique, indisprimary
FROM pg_index
WHERE indrelid = 'tickets'::regclass
ORDER BY index_name;
```

Chỉ `tickets_pkey` là duy nhất; bốn index còn lại chỉ để đọc nhanh.

Bộ đếm chỉ biết những gì đã chạy. Một câu lọc theo ngày mở phiếu:

```sql
SELECT count(*) FROM tickets WHERE opened_on = '2026-03-01';
SELECT pg_stat_force_next_flush();
SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE indexrelname = 'tickets_opened_idx';
```

`idx_scan` của `tickets_opened_idx` vừa từ 0 lên 1: một báo cáo chạy mỗi tháng một lần cũng là một lần dùng.

Index chiếm gần bằng chính bảng:

```sql
SELECT pg_size_pretty(pg_relation_size('tickets')) AS heap,
       pg_size_pretty(pg_indexes_size('tickets')) AS indexes;
```

Bỏ index thừa, rồi xem câu lọc theo `status` vẫn có index để dùng:

```sql
DROP INDEX tickets_status_idx;
EXPLAIN (COSTS OFF) SELECT count(*) FROM tickets WHERE status = 'open';
```

Kế hoạch dùng `tickets_status_opened_idx`: cột đầu `status` của nó làm thay việc của index vừa bỏ.

## Lỗi hay gặp

Xóa index của khóa chính:

```sql
-- ERROR 2BP01: cannot drop index tickets_pkey because constraint tickets_pkey on table tickets requires it
DROP INDEX tickets_pkey;
```

Index giữ một ràng buộc không phải index thừa, dù `idx_scan` bằng bao nhiêu. Muốn bỏ thì bỏ ràng buộc (`ALTER TABLE ... DROP CONSTRAINT`), và chỉ khi thật sự không cần nó.

Xóa không khóa bảng, nhưng trong một transaction:

```sql
BEGIN;
-- ERROR 25001: DROP INDEX CONCURRENTLY cannot run inside a transaction block
DROP INDEX CONCURRENTLY tickets_opened_idx;
```

`CONCURRENTLY` tự chạy nhiều transaction. Gửi câu ở chế độ autocommit, và mỗi câu một index.

## Thực hành

Ba bước trên `tickets` (5 index) và `tickets_lean` (2 index): số lần dùng, kích thước, rồi số HOT update. Sau đó là hai câu hỏi.

## Tóm tắt

- Mỗi index làm mọi lần ghi tốn thêm, chiếm chỗ và có thể chặn HOT update.
- `idx_scan` = 0 là manh mối, chưa phải bằng chứng: kiểm trọn một chu kỳ, cả replica và các ràng buộc.
- Index có cùng cột đầu với một index nhiều cột thường thừa.
- So `n_tup_hot_upd` với `n_tup_upd` để đo cái giá của index trên cột hay sửa.

# EN

## Opening

Table `tickets` has five indexes, each added "for speed" by someone during some bug fix. Now closing tickets keeps getting slower, and nobody dares to drop any index. How do you know which indexes really do any work?

## Key idea

Many people think adding an index makes things faster, and more is better. In fact every index adds work to every INSERT, UPDATE and DELETE, takes space on disk and in the buffer cache, and goes into WAL and backups. The official docs say it plainly: indexes that are seldom or never used should be removed.

`pg_stat_user_indexes.idx_scan` counts how many times each index was read since the counters were last reset. An index with the same leading column as another multi-column index is often redundant: an index on `(status, opened_on)` can serve a query that filters on `status` alone.

An index on a frequently changed column also blocks HOT updates. A HOT update only happens when the UPDATE changes no indexed column and the page has room; then Postgres need not add an entry to any index. `n_tup_hot_upd` in `pg_stat_user_tables` counts HOT updates, so comparing it with `n_tup_upd` shows the cost of extra indexes.

Before dropping: a zero only holds for the time the counters covered and only on this server (each replica has its own counters); an index behind a primary key or `UNIQUE` still works on writes even if nobody reads it. On a real server drop with `DROP INDEX CONCURRENTLY` so the table is not locked.

The step-through figure at the end of this section puts the `idx_scan` of five indexes next to the HOT UPDATE counts on the lab's two tables.

## Syntax

```sql
SELECT relname, indexrelname, idx_scan, pg_relation_size(indexrelid)
FROM pg_stat_user_indexes [ WHERE relname = 'table_name' ];
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables [ WHERE relname = 'table_name' ];
DROP INDEX [ CONCURRENTLY ] [ IF EXISTS ] index_name;
```

- `idx_scan`: how many times the index was used for reading since the last reset.
- `n_tup_hot_upd`: UPDATEs that touched no index.
- `CONCURRENTLY`: drops without blocking reads and writes on the table; never inside a transaction.

## Example

Which index backs a constraint? Read `pg_index` before even thinking of dropping:

```sql
SELECT indexrelid::regclass::text AS index_name, indisunique, indisprimary
FROM pg_index
WHERE indrelid = 'tickets'::regclass
ORDER BY index_name;
```

Only `tickets_pkey` is unique; the other four exist only to speed up reads.

The counters only know what has run. A query filtering on the opening date:

```sql
SELECT count(*) FROM tickets WHERE opened_on = '2026-03-01';
SELECT pg_stat_force_next_flush();
SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE indexrelname = 'tickets_opened_idx';
```

The `idx_scan` of `tickets_opened_idx` just went from 0 to 1: a report that runs once a month is still a use.

The indexes take almost as much space as the table itself:

```sql
SELECT pg_size_pretty(pg_relation_size('tickets')) AS heap,
       pg_size_pretty(pg_indexes_size('tickets')) AS indexes;
```

Drop the redundant index, then check that a filter on `status` still has an index to use:

```sql
DROP INDEX tickets_status_idx;
EXPLAIN (COSTS OFF) SELECT count(*) FROM tickets WHERE status = 'open';
```

The plan uses `tickets_status_opened_idx`: its leading column `status` does the job of the index just dropped.

## Common mistakes

Dropping the primary key's index:

```sql
-- ERROR 2BP01: cannot drop index tickets_pkey because constraint tickets_pkey on table tickets requires it
DROP INDEX tickets_pkey;
```

An index behind a constraint is not a redundant index, whatever its `idx_scan`. To remove it, drop the constraint (`ALTER TABLE ... DROP CONSTRAINT`), and only if you truly do not need it.

Dropping without locking the table, but inside a transaction:

```sql
BEGIN;
-- ERROR 25001: DROP INDEX CONCURRENTLY cannot run inside a transaction block
DROP INDEX CONCURRENTLY tickets_opened_idx;
```

`CONCURRENTLY` runs several transactions of its own. Send it in autocommit mode, one index per statement.

## Practice

Three steps on `tickets` (5 indexes) and `tickets_lean` (2 indexes): uses, sizes, then HOT updates. Then two questions.

## Recap

- Every index makes every write cost more, takes space and can block HOT updates.
- `idx_scan` = 0 is a clue, not proof: check a full cycle, the replicas and the constraints.
- An index with the same leading column as a multi-column index is often redundant.
- Compare `n_tup_hot_upd` with `n_tup_upd` to measure the cost of indexes on frequently changed columns.
