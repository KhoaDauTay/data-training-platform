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
objectives:
  - vi: Tìm index không được dùng bằng `pg_stat_user_indexes` và biết khi nào con số đó chưa đủ để xóa
    en: Find unused indexes with `pg_stat_user_indexes` and know when that number is not yet enough to drop one
  - vi: Đo cái giá của index thừa trên UPDATE bằng `n_tup_hot_upd`
    en: Measure the cost of extra indexes on UPDATEs with `n_tup_hot_upd`
requires: [e-pg-l5-11]
sources:
  - https://www.postgresql.org/docs/18/indexes-intro.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
  - https://www.postgresql.org/docs/18/storage-hot.html
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
        vi: "Hai index không ai dùng chiếm 19 trang (10 + 9), trong tổng 63 trang index. Mỗi trang đó vẫn phải ghi, nằm trong bộ đệm, vào WAL và vào backup."
        en: "The two unused indexes take 19 pages (10 + 9) out of 63 index pages in total. Every one of those pages is still written, cached, logged to WAL and backed up."
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
        vi: "`tickets`: 40 UPDATE, 0 HOT. `tickets_lean`: 40 UPDATE, 40 HOT. Mỗi UPDATE trên `tickets` phải thêm mục vào cả 5 index, vì `status` có trong hai index của nó."
        en: "`tickets`: 40 updates, 0 HOT. `tickets_lean`: 40 updates, 40 HOT. Every UPDATE on `tickets` must add entries to all 5 indexes, because `status` is in two of its indexes."
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
    why:
      vi: "Thêm index nghe hợp lý vì mỗi index đúng là làm nhanh một kiểu đọc, nhưng việc chậm ở đây là ghi: UPDATE dùng khóa chính để tìm phiếu, rồi phải sửa mọi index có `status`. Bước 3 đo cái giá đó: 0 HOT trên 40 UPDATE so với 40 HOT ở `tickets_lean`. Docs chính thức cũng nói index ít khi hoặc không bao giờ dùng thì nên bỏ."
      en: "Adding an index sounds right because each index does speed up some kind of read, but the slow work here is writing: the UPDATE finds the ticket by primary key, then must change every index that holds `status`. Step 3 measures that cost: 0 HOT out of 40 UPDATEs against 40 HOT on `tickets_lean`. The official docs also say indexes that are seldom or never used should be removed."
  - q:
      vi: "`tickets_opened_idx` có `idx_scan` = 0. Có nên xóa ngay không?"
      en: "`tickets_opened_idx` has `idx_scan` = 0. Should you drop it right away?"
    options:
      - { vi: "Có: 0 nghĩa là không bao giờ dùng", en: "Yes: 0 means never used" }
      - { vi: "Chưa: bộ đếm chỉ tính từ lần reset cuối và chỉ trên server này; kiểm qua trọn một chu kỳ (báo cáo cuối tháng), trên cả replica, và chắc nó không giữ một ràng buộc UNIQUE", en: "Not yet: the counter only covers the time since the last reset and only this server; check over a full cycle (month-end reports), on the replicas too, and make sure it does not back a UNIQUE constraint" }
      - { vi: "Không bao giờ: xóa index là nguy hiểm", en: "Never: dropping an index is dangerous" }
    answer: 1
    why:
      vi: "Con số 0 trông như bằng chứng cuối cùng, nhưng nó chỉ đúng cho khoảng thời gian bộ đếm ghi lại: lab này reset ngay trước một ngày tiêu biểu. Báo cáo cuối tháng hay câu chạy trên replica không hiện ở đây, và index UNIQUE vẫn làm việc khi ghi dù `idx_scan` = 0."
      en: "Zero looks like final proof, but it only holds for the time the counters covered: this lab reset them right before one typical day. A month-end report or a query on a replica does not show up here, and a UNIQUE index still does its job on writes even with `idx_scan` = 0."
---

## Ý chính

Nhiều người nghĩ thêm index là nhanh hơn, càng nhiều càng tốt. Thật ra mỗi index làm mọi INSERT, UPDATE, DELETE tốn thêm việc, chiếm chỗ trên đĩa và trong bộ đệm, và một index trên cột hay bị sửa chặn HOT. Docs chính thức nói thẳng: index ít khi hoặc không bao giờ được dùng thì nên bỏ. `pg_stat_user_indexes.idx_scan` cho biết index nào thực sự được đọc.

## Ví dụ

```sql
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE relname = 'tickets'
ORDER BY indexrelname;
```

## Thực hành

Ba bước trên `tickets` (5 index) và `tickets_lean` (2 index), rồi hai câu hỏi. Sau bài này bạn đề xuất được index nào nên bỏ, bằng `idx_scan`, kích thước và số HOT, và biết cần kiểm gì trước khi xóa.

# EN

## Key idea

Many people think adding an index makes things faster, and more is better. In fact every index adds work to every INSERT, UPDATE and DELETE, takes space on disk and in the buffer, and an index on a frequently changed column blocks HOT. The official docs say it plainly: indexes that are seldom or never used should be removed. `pg_stat_user_indexes.idx_scan` tells you which indexes are really read.

## Example

```sql
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE relname = 'tickets'
ORDER BY indexrelname;
```

## Practice

Three steps on `tickets` (5 indexes) and `tickets_lean` (2 indexes), then two questions. After this lesson you can propose which indexes to drop, backed by `idx_scan`, size and HOT counts, and you know what to check before dropping one.
