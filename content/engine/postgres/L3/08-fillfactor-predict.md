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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-hot-chain
objectives:
  - vi: Đoán một UPDATE có HOT không khi trang đầy và khi trang còn chỗ
    en: Predict whether an UPDATE is HOT on a full page and on a page with room
  - vi: Đọc kết quả thật trong `pg_stat_user_tables`
    en: Read the real outcome in `pg_stat_user_tables`
  - vi: Biết khi nào hạ `fillfactor` là đáng và vì sao đổi nó không viết lại trang cũ
    en: Know when lowering `fillfactor` is worth it and why changing it does not rewrite old pages
requires: [e-pg-l3-07]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
lab:
  setup: |
    CREATE TABLE jobs_full(id int PRIMARY KEY, pad char(100)) WITH (fillfactor = 100);
    CREATE TABLE jobs_room(id int PRIMARY KEY, pad char(100)) WITH (fillfactor = 70);
    INSERT INTO jobs_full SELECT g, 'p' FROM generate_series(1, 200) g;
    INSERT INTO jobs_room SELECT g, 'p' FROM generate_series(1, 200) g;
    UPDATE jobs_full SET pad = 'q' WHERE id = 1;
    UPDATE jobs_room SET pad = 'q' WHERE id = 1;
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Đọc bộ đếm của hai bảng trong `pg_stat_user_tables`: `relname`, số UPDATE (`n_tup_upd`) và số UPDATE HOT (`n_tup_hot_upd`) của `jobs_full` và `jobs_room`, theo tên."
        en: "Read the counters of both tables in `pg_stat_user_tables`: `relname`, the number of updates (`n_tup_upd`) and of HOT updates (`n_tup_hot_upd`) for `jobs_full` and `jobs_room`, by name."
      solution: SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('jobs_full', 'jobs_room') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "Lọc `relname` bằng `IN` và `ORDER BY relname`."
        en: "Filter `relname` with `IN` and `ORDER BY relname`."
      fact:
        vi: "Kết quả thật: `jobs_full` 1 UPDATE, 0 HOT; `jobs_room` 1 UPDATE, 1 HOT."
        en: "Real outcome: `jobs_full` 1 update, 0 HOT; `jobs_room` 1 update, 1 HOT."
        probe: SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('jobs_full', 'jobs_room') ORDER BY relname
        expect: [[jobs_full, 1, 0], [jobs_room, 1, 1]]
predict:
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
  trap: 0
  why:
    vi: "\"Cả hai\" nghe hợp lý vì `pad` không có index, điều kiện HOT người ta hay nhớ, nhưng đó mới là một nửa: trang của bản cũ còn phải có chỗ. Mỗi dòng tốn khoảng 140 byte (tuple 136 + line pointer 4). Với `fillfactor` 100, `jobs_full` xếp 58 dòng vào trang 0 và chỉ còn 48 byte trống, nên bản mới phải sang trang khác: không HOT. Với 70, `jobs_room` dừng ở 40 dòng (70 % × 8192 ÷ 140 ≈ 40), chừa khoảng 30 % trang, nên bản mới ở lại trang 0: HOT. Prune không cứu được `jobs_full`: trang chưa có dead tuple nào để dọn."
    en: "\"Both\" sounds right because `pad` has no index, the HOT condition people usually remember, but that is only half: the old version's page must also have room. Each row costs about 140 bytes (a 136-byte tuple + a 4-byte line pointer). At `fillfactor` 100, `jobs_full` packs 58 rows into page 0 and leaves just 48 bytes free, so the new version must move to another page: not HOT. At 70, `jobs_room` stops at 40 rows (70% × 8192 ÷ 140 ≈ 40), keeping about 30% of the page, so the new version stays on page 0: HOT. Pruning cannot save `jobs_full`: the page has no dead tuple to clear yet."
quiz:
  - q:
      vi: "Bảng `jobs` đã đầy trang, tỉ lệ HOT thấp. Bạn chạy `ALTER TABLE jobs SET (fillfactor = 70)` rồi UPDATE tiếp một dòng cũ (cột không có index). Lần này có HOT không?"
      en: "Table `jobs` has full pages and a low HOT ratio. You run `ALTER TABLE jobs SET (fillfactor = 70)`, then UPDATE an old row again (a column with no index). Is it HOT this time?"
    options:
      - { vi: "Có: fillfactor mới áp ngay cho mọi trang", en: "Yes: the new fillfactor applies to every page at once" }
      - { vi: "Không: trang cũ vẫn đầy; fillfactor chỉ áp cho trang ghi sau đó, hoặc khi bảng được viết lại", en: "No: the old pages are still full; fillfactor only applies to pages written afterwards, or when the table is rewritten" }
      - { vi: "Không bao giờ: fillfactor chỉ có tác dụng với index", en: "Never: fillfactor only affects indexes" }
    answer: 1
    trap: 0
    why:
      vi: "\"Áp ngay cho mọi trang\" nghe hợp lý vì `ALTER TABLE` chạy xong ngay và `reloptions` đổi liền, nhưng lệnh chỉ ghi tham số mới, không động vào trang đã có. Trang cũ vẫn đầy, nên bản mới vẫn phải sang trang khác. Thử trên PGlite: bảng 200 dòng nạp ở fillfactor 100, đổi sang 70, UPDATE dòng 10 vẫn sang trang 3 (không HOT). Sau `VACUUM FULL` viết lại bảng theo 70 %, UPDATE dòng 20 ở lại trang 0 và là HOT. Fillfactor có cho cả bảng lẫn index, không chỉ index."
      en: "\"Applies to every page at once\" sounds right because `ALTER TABLE` finishes at once and `reloptions` changes immediately, but the command only records the new setting and does not touch existing pages. The old pages are still full, so the new version must still move to another page. Tried on PGlite: a 200-row table loaded at fillfactor 100, switched to 70, and the UPDATE of row 10 still moves to page 3 (not HOT). After `VACUUM FULL` rewrites the table at 70%, the UPDATE of row 20 stays on page 0 and is HOT. Tables have a fillfactor too, not only indexes."
---
## Mở bài

Bảng `jobs` chỉ bị UPDATE ở một cột không có index, vậy mà bộ đếm báo gần như không UPDATE nào là HOT. Một tham số lúc tạo bảng có thể đổi hẳn kết quả đó: đoán trước, rồi xem số thật.

## Ý chính

HOT cần hai điều kiện: không cột có index nào đổi giá trị, và trang của bản cũ còn chỗ cho bản mới. Điều kiện thứ hai do `fillfactor` quyết định: phần trăm mỗi trang mà INSERT được lấp. Mặc định của bảng là 100, nghĩa là INSERT lấp đầy trang và không chừa gì cho UPDATE.

Nhiều người nghĩ chỉ cần cột bị sửa không có index là UPDATE sẽ HOT. Thật ra trên trang đã đầy, bản mới không còn chỗ nên phải sang trang khác, và khi đã sang trang khác thì mọi index phải có mục mới. Đặt `fillfactor` = 70 chừa khoảng 30 % mỗi trang cho các bản UPDATE.

Cái giá: lúc mới nạp, bảng cần khoảng 1/0,7, tức gấp 1,4 lần số trang, và quét toàn bảng đọc nhiều trang hơn. Vì vậy chỉ hạ `fillfactor` cho bảng UPDATE nhiều mà tỉ lệ HOT vẫn thấp dù cột bị sửa không có index. Đổi bằng `ALTER TABLE ... SET (fillfactor = 70)` chỉ áp cho trang ghi sau đó; trang cũ giữ nguyên tới khi bảng được viết lại.

## Thực hành

Chọn đáp án trước, rồi bấm "Xem thật" hoặc tự chạy câu đọc bộ đếm ở bước lab bên dưới, trên hai bảng do lab dựng. Sau đó là một câu hỏi về việc đổi `fillfactor` trên bảng đã có dữ liệu.

## Tóm tắt

- `fillfactor` là phần trăm trang mà INSERT được lấp; mặc định 100 cho bảng.
- Cột không có index mới là một nửa điều kiện HOT; trang đầy thì bản mới phải sang trang khác.
- `fillfactor` = 70 chừa chỗ cho UPDATE ở lại trang cũ, đổi lại bảng to hơn khoảng 1,4 lần.
- Đổi `fillfactor` bằng `ALTER TABLE` không viết lại trang cũ; cần `VACUUM FULL` hoặc lệnh viết lại bảng.

# EN

## Opening

Table `jobs` is only ever updated in a column with no index, yet the counters say almost no UPDATE is HOT. One parameter set when the table is created can change that completely: guess first, then look at the real numbers.

## Key idea

HOT needs two conditions: no indexed column changes value, and the old version's page has room for the new one. The second condition is decided by `fillfactor`: the percentage of each page that INSERTs may fill. The default for tables is 100, so INSERTs fill the page and leave nothing for UPDATEs.

Many people think an UPDATE will be HOT as long as the changed column has no index. In fact on a full page the new version has no room and must go to another page, and once it lands on another page every index needs a new entry. Setting `fillfactor` = 70 keeps about 30% of each page for UPDATE versions.

The price: right after loading, the table needs about 1/0.7, so 1.4 times the pages, and a full scan reads more pages. So lower `fillfactor` only for an update-heavy table whose HOT ratio stays low although the changed columns have no index. Changing it with `ALTER TABLE ... SET (fillfactor = 70)` applies only to pages written afterwards; old pages stay as they are until the table is rewritten.

## Practice

Pick an answer first, then press "See it for real" or run the counter query yourself in the lab step below, on the two tables the lab builds. Then one question about changing `fillfactor` on a table that already holds data.

## Recap

- `fillfactor` is the percentage of a page INSERTs may fill; the default for tables is 100.
- An unindexed column is only half of the HOT condition; on a full page the new version must move to another page.
- `fillfactor` = 70 keeps room for UPDATEs to stay on the old page, at the cost of a table about 1.4 times bigger.
- Changing `fillfactor` with `ALTER TABLE` does not rewrite old pages; that takes `VACUUM FULL` or another table rewrite.
