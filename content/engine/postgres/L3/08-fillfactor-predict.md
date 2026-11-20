---
id: e-pg-l3-08
engine: postgres
level: L3
module: vacuum-hot
title: "Đoán trước: fillfactor có cứu được HOT không?"
title_en: "Predict: can fillfactor save HOT?"
kind: predict
runtime: browser
minutes: 8
viz: pg-hot-chain
objectives:
  - vi: Đoán một UPDATE có HOT không khi trang đầy và khi trang còn chỗ
    en: Predict whether an UPDATE is HOT on a full page and on a page with room
  - vi: Đọc kết quả thật trong `pg_stat_user_tables`
    en: Read the real outcome in `pg_stat_user_tables`
requires: [e-pg-l3-07]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
predict:
  setup: |
    CREATE TABLE jobs_full(id int PRIMARY KEY, pad char(100)) WITH (fillfactor = 100);
    CREATE TABLE jobs_room(id int PRIMARY KEY, pad char(100)) WITH (fillfactor = 70);
    INSERT INTO jobs_full SELECT g, 'p' FROM generate_series(1, 200) g;
    INSERT INTO jobs_room SELECT g, 'p' FROM generate_series(1, 200) g;
    UPDATE jobs_full SET pad = 'q' WHERE id = 1;
    UPDATE jobs_room SET pad = 'q' WHERE id = 1;
    SELECT pg_stat_force_next_flush();
  sql: |
    SELECT relname, n_tup_upd, n_tup_hot_upd
    FROM pg_stat_user_tables
    WHERE relname IN ('jobs_full', 'jobs_room')
    ORDER BY relname
  q:
    vi: "Hai bảng giống hệt nhau, 200 dòng, chỉ khác `fillfactor` (100 và 70). Mỗi bảng sửa cột `pad` (không có index) của dòng 1. UPDATE nào là HOT?"
    en: "Two identical 200-row tables that differ only in `fillfactor` (100 and 70). Each one changes the `pad` column (not indexed) of row 1. Which UPDATE is HOT?"
  options:
    - { vi: "Cả hai: `pad` không có index", en: "Both: `pad` is not indexed" }
    - { vi: "Chỉ `jobs_room`: trang 0 của `jobs_full` đã đầy", en: "Only `jobs_room`: page 0 of `jobs_full` is already full" }
    - { vi: "Chỉ `jobs_full`: trang đầy thì Postgres prune trước", en: "Only `jobs_full`: a full page gets pruned first" }
    - { vi: "Không cái nào", en: "Neither" }
  answer: 1
  why:
    vi: "Cột không có index mới là một nửa điều kiện. `jobs_full` xếp 58 dòng vào trang 0 và chỉ còn 48 byte trống, nên bản mới phải sang trang khác: không HOT. `jobs_room` chỉ xếp 40 dòng/trang, chừa khoảng 30 % cho UPDATE, nên bản mới ở lại trang 0: HOT."
    en: "An unindexed column is only half the condition. `jobs_full` packs 58 rows into page 0 and leaves just 48 bytes free, so the new version must move to another page: not HOT. `jobs_room` puts only 40 rows per page, keeping about 30% for UPDATEs, so the new version stays on page 0: HOT."
  fact:
    vi: "Kết quả thật: `jobs_full` 1 UPDATE, 0 HOT; `jobs_room` 1 UPDATE, 1 HOT."
    en: "Real outcome: `jobs_full` 1 update, 0 HOT; `jobs_room` 1 update, 1 HOT."
    expect: [[jobs_full, 1, 0], [jobs_room, 1, 1]]
---

## Ý chính

`fillfactor` là phần trăm trang mà INSERT được lấp. Mặc định 100 cho bảng. Đặt 70 nghĩa là chừa 30 % mỗi trang cho các bản UPDATE sau này, để chúng ở lại trang cũ và được HOT.

## Ví dụ

```sql
CREATE TABLE jobs_room(id int PRIMARY KEY, pad char(100)) WITH (fillfactor = 70);
```

Cái giá: bảng to hơn khoảng 40 % lúc mới nạp, và quét toàn bảng đọc nhiều trang hơn.

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" để chạy câu đọc bộ đếm trên hai bảng do lab dựng. Sau bài này bạn biết khi nào hạ `fillfactor` là đáng: bảng UPDATE nhiều trên cột không có index nhưng tỉ lệ HOT vẫn thấp.

# EN

## Key idea

`fillfactor` is the percentage of a page that INSERTs may fill. The default for tables is 100. Setting 70 keeps 30% of each page for future UPDATE versions, so they stay on the old page and can be HOT.

## Example

```sql
CREATE TABLE jobs_room(id int PRIMARY KEY, pad char(100)) WITH (fillfactor = 70);
```

The price: the table is about 40% larger right after loading, and a full scan reads more pages.

## Practice

Pick an answer first, then press "Show real" to run the counter query on the two tables the lab builds. After this lesson you know when lowering `fillfactor` is worth it: an update-heavy table whose updated columns are not indexed, yet the HOT ratio stays low.
