---
id: e-pg-l5-04
engine: postgres
level: L5
module: index-internals
title: "Bên trong GIN: posting tree và pending list"
title_en: "GIN internals: posting trees and the pending list"
kind: lab
runtime: browser
minutes: 20
objectives:
  - { vi: "Giải thích GIN là index đảo: mỗi khóa (từ, phần tử mảng) trỏ tới một posting list/tree các TID", en: "Explain GIN as an inverted index: each key (word, array element) points to a posting list/tree of TIDs" }
  - { vi: "Đo pending list thật bằng `gin_metapage_info` và biết bốn lúc nó được dọn", en: "Measure a real pending list with `gin_metapage_info` and know the four moments it is flushed" }
  - { vi: "Cân `fastupdate` giữa tốc độ ghi và độ ổn định của thời gian đọc", en: "Weigh `fastupdate` between write speed and stable read latency" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/gin.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/functions-admin.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html
viz: pg-gin-postings
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    DROP TABLE IF EXISTS docs, docs2, docs3 CASCADE;
    CREATE TABLE docs (id int, tags text[] NOT NULL);
    INSERT INTO docs SELECT g, ARRAY['t' || g % 10, 'u' || g % 7] FROM generate_series(1, 2000) g;
    CREATE TABLE docs2 (LIKE docs);
    INSERT INTO docs2 SELECT * FROM docs;
    CREATE TABLE docs3 (LIKE docs);
    INSERT INTO docs3 SELECT * FROM docs;
    CREATE INDEX docs_tags_fast ON docs USING gin (tags);
    CREATE INDEX docs2_tags_slow ON docs2 USING gin (tags) WITH (fastupdate = off);
    CREATE INDEX docs3_tags_cleaned ON docs3 USING gin (tags);
    INSERT INTO docs SELECT g, ARRAY['t' || g % 10, 'new'] FROM generate_series(2001, 2300) g;
    INSERT INTO docs2 SELECT g, ARRAY['t' || g % 10, 'new'] FROM generate_series(2001, 2300) g;
    INSERT INTO docs3 SELECT g, ARRAY['t' || g % 10, 'new'] FROM generate_series(2001, 2300) g;
    SELECT gin_clean_pending_list('docs3_tags_cleaned');
  steps:
    - task: { vi: "Cả ba bảng nhận 300 dòng mới sau khi tạo index. `docs3_tags_cleaned` đã được dọn bằng `gin_clean_pending_list`. Đọc metapage (trang 0) của ba index bằng `gin_metapage_info(get_raw_page(index, 0))`: tên, `n_pending_pages`, `n_pending_tuples`, `n_entries`. Lần lượt fast, slow, cleaned.", en: "All three tables got 300 new rows after their index was built. `docs3_tags_cleaned` was flushed with `gin_clean_pending_list`. Read the metapage (page 0) of the three indexes with `gin_metapage_info(get_raw_page(index, 0))`: name, `n_pending_pages`, `n_pending_tuples`, `n_entries`. In the order fast, slow, cleaned." }
      solution: "SELECT 'docs_tags_fast' AS idx, n_pending_pages, n_pending_tuples, n_entries FROM gin_metapage_info(get_raw_page('docs_tags_fast', 0)) UNION ALL SELECT 'docs2_tags_slow', n_pending_pages, n_pending_tuples, n_entries FROM gin_metapage_info(get_raw_page('docs2_tags_slow', 0)) UNION ALL SELECT 'docs3_tags_cleaned', n_pending_pages, n_pending_tuples, n_entries FROM gin_metapage_info(get_raw_page('docs3_tags_cleaned', 0))"
      check: rows
      ordered: true
      hint: { vi: "`gin_metapage_info(get_raw_page('docs_tags_fast', 0))`, ba lần, nối bằng UNION ALL.", en: "`gin_metapage_info(get_raw_page('docs_tags_fast', 0))`, three times, joined with UNION ALL." }
    - task: { vi: "Đọc tham số lưu trữ của ba index (tên index và `reloptions` ép text), sắp theo tên.", en: "Read the storage parameters of the three indexes (index name and `reloptions` cast to text), ordered by name." }
      solution: "SELECT relname, reloptions::text FROM pg_class WHERE relname IN ('docs_tags_fast', 'docs2_tags_slow', 'docs3_tags_cleaned') ORDER BY relname"
      check: rows
      ordered: true
      hint: { vi: "`pg_class.reloptions` là NULL khi index dùng mặc định (`fastupdate` bật).", en: "`pg_class.reloptions` is NULL when the index uses the defaults (`fastupdate` on)." }
    - task: { vi: "Đếm các dòng của `docs` có nhãn 'new'. Planner phải dùng `docs_tags_fast` (nó đọc cả pending list).", en: "Count the `docs` documents tagged 'new'. The planner must use `docs_tags_fast` (it also reads the pending list)." }
      solution: "SELECT count(*) FROM docs WHERE tags @> ARRAY['new']"
      check: plan
      hint: { vi: "Toán tử chứa của mảng là `@>`.", en: "The array containment operator is `@>`." }
quiz:
  - q: { vi: "Pending list của GIN được chuyển vào cấu trúc chính khi nào?", en: "When is a GIN pending list moved into the main structure?" }
    options:
      - { vi: "Sau mỗi INSERT", en: "After every INSERT" }
      - { vi: "Khi VACUUM hoặc autoanalyze chạy, khi gọi `gin_clean_pending_list`, hoặc khi nó vượt `gin_pending_list_limit` (mặc định 4 MB)", en: "When VACUUM or autoanalyze runs, when `gin_clean_pending_list` is called, or when it grows past `gin_pending_list_limit` (default 4 MB)" }
      - { vi: "Chỉ khi REINDEX", en: "Only on REINDEX" }
    answer: 1
    why: { vi: "Sau mỗi INSERT nghe hợp lý vì index thường được cập nhật ngay, nhưng pending list sinh ra chính là để hoãn việc đó. Docs GIN (GIN Fast Update Technique) nói rõ: mục mới vào pending list, chỉ được chuyển khi VACUUM/autoanalyze, `gin_clean_pending_list` hoặc khi vượt `gin_pending_list_limit`. Cái giá: mọi lần tìm kiếm phải quét cả pending list, và một INSERT làm nó vượt ngưỡng sẽ tự dọn và chậm hẳn. Ứng dụng cần thời gian phản hồi đều thì đặt `fastupdate = off`.", en: "After each INSERT sounds right because an index is usually updated at once, but the pending list exists precisely to defer that. The GIN docs (GIN Fast Update Technique) say so: new entries go to the pending list and move only on VACUUM/autoanalyze, `gin_clean_pending_list`, or past `gin_pending_list_limit`. The price: every search must also scan the pending list, and the INSERT that pushes it past the limit does the cleanup and is much slower. An app that needs steady response times sets `fastupdate = off`." }
  - q: { vi: "Gọi `gin_clean_pending_list` trong một transaction rồi ROLLBACK. Pending list có quay lại không?", en: "You call `gin_clean_pending_list` inside a transaction, then ROLLBACK. Does the pending list come back?" }
    options:
      - { vi: "Có, ROLLBACK hoàn tác mọi thứ", en: "Yes, ROLLBACK undoes everything" }
      - { vi: "Không: việc dọn sắp xếp lại trang index, không đổi dữ liệu logic, nên không bị hoàn tác (đo trên PGlite: lần gọi thứ hai trả 0)", en: "No: the flush reorganises index pages without changing logical data, so it is not undone (measured on PGlite: a second call returns 0)" }
      - { vi: "Hàm báo lỗi trong transaction", en: "The function errors inside a transaction" }
    answer: 1
    why: { vi: "Nghe hợp lý vì ROLLBACK hoàn tác mọi thay đổi dữ liệu, nhưng việc dọn này không phải thay đổi dữ liệu. Index là cấu trúc vật lý; chuyển mục từ pending list vào cây không làm thay đổi dòng nào thấy được. Tương tự cho `brin_summarize_new_values`. Đây cũng là lý do bài lab dọn pending list trong phần dựng dữ liệu, không trong câu của bạn.", en: "It sounds right because ROLLBACK undoes every data change, but this cleanup is not a data change. An index is a physical structure; moving entries from the pending list into the tree changes no visible row. The same goes for `brin_summarize_new_values`. That is also why this lab flushes the pending list in its setup, not in your statement." }
  - q: { vi: "Một GIN trên `jsonb` chỉ phục vụ truy vấn `@>`. Opclass nào nhỏ và nhanh hơn?", en: "A GIN index on `jsonb` only serves `@>` queries. Which opclass is smaller and faster?" }
    options:
      - { vi: "`jsonb_ops` (mặc định)", en: "`jsonb_ops` (the default)" }
      - { vi: "`jsonb_path_ops`", en: "`jsonb_path_ops`" }
      - { vi: "`gin_trgm_ops`", en: "`gin_trgm_ops`" }
    answer: 1
    why: { vi: "Opclass mặc định `jsonb_ops` nghe an toàn vì nó phục vụ được nhiều toán tử hơn, nhưng ở đây chỉ cần `@>`. `jsonb_path_ops` băm cả đường dẫn thành một khóa, nên ít khóa hơn và tìm chính xác hơn cho `@>`, nhưng không hỗ trợ các toán tử tồn tại khóa (`?`, `?|`, `?&`).", en: "The default `jsonb_ops` sounds safe because it serves more operators, but here only `@>` is needed. `jsonb_path_ops` hashes the whole path into one key, so there are fewer keys and searches are more selective for `@>`, but it does not support the key-existence operators (`?`, `?|`, `?&`)." }
---

## Ý chính

- GIN là index đảo: mỗi giá trị được tách thành nhiều khóa (từ trong `tsvector`, phần tử mảng, khóa/giá trị `jsonb`). Mỗi khóa trỏ tới danh sách TID chứa nó: posting list khi ngắn, posting tree (một B-tree TID) khi dài.
- Một dòng mới có thể thêm hàng chục khóa, nên chèn trực tiếp rất tốn. Với `fastupdate` (bật mặc định), dòng mới vào một pending list chưa sắp, rồi được chuyển hàng loạt vào cấu trúc chính.
- Pending list được dọn khi: VACUUM/autoanalyze; gọi `gin_clean_pending_list`; vượt `gin_pending_list_limit` (mặc định 4 MB, đặt riêng được cho từng index).
- Tìm kiếm luôn đọc cả pending list, nên pending list dài làm đọc chậm. Nếu cần thời gian đọc đều, đặt `fastupdate = off`.
- GIN không hỗ trợ index-only scan và không lưu trọng số; truy vấn FTS có trọng số phải đọc lại heap (`Recheck`).

## Ví dụ

Kết quả thật trên PGlite (mỗi dòng có 2 nhãn, 300 dòng chèn sau khi tạo index):

```text
idx                 n_pending_pages  n_pending_tuples  n_entries
docs_tags_fast      2                300               17
docs2_tags_slow     0                0                 17
docs3_tags_cleaned  0                0                 17

Aggregate
  ->  Bitmap Heap Scan on docs
        Recheck Cond: (tags @> '{new}'::text[])
        ->  Bitmap Index Scan on docs_tags_fast
```

Ở `docs_tags_fast`, 300 dòng có nhãn `new` vẫn nằm trong pending list (2 trang); ở hai index kia chúng đã vào cây. Cả ba đều ghi `n_entries` = 17 (10 nhãn `t*` + 7 nhãn `u*` lúc dựng index): con số thống kê này không được cập nhật theo từng lần chèn, nên đừng dùng nó để đếm khóa hiện tại.

Đo thêm: gọi `gin_clean_pending_list` trong một transaction rồi ROLLBACK không đưa pending list trở lại. Việc dọn index không phải thay đổi dữ liệu nên không bị hoàn tác.

## Thực hành

Đọc metapage của ba index, đọc tham số lưu trữ, rồi xem planner vẫn tìm thấy dữ liệu nằm trong pending list. Kỹ năng chuyên gia: chẩn đoán "tìm kiếm full-text lúc nhanh lúc chậm" là do pending list, và chọn giữa `fastupdate`, `gin_pending_list_limit` riêng và autovacuum dày hơn.

# EN

## Key idea

- GIN is an inverted index: each value is split into many keys (words of a `tsvector`, array elements, `jsonb` keys/values). Each key points to the list of TIDs that contain it: a posting list when short, a posting tree (a B-tree of TIDs) when long.
- A new row can add dozens of keys, so inserting directly is expensive. With `fastupdate` (on by default), new rows go into an unsorted pending list and are later moved into the main structure in bulk.
- The pending list is flushed by: VACUUM/autoanalyze; a call to `gin_clean_pending_list`; growing past `gin_pending_list_limit` (default 4 MB, settable per index).
- Searches always read the pending list too, so a long pending list slows reads. For steady read times, set `fastupdate = off`.
- GIN does not support index-only scans and does not store weights; a weighted FTS query has to re-read the heap (`Recheck`).

## Example

Real output from PGlite (2 tags per row, 300 rows inserted after the indexes were built):

```text
idx                 n_pending_pages  n_pending_tuples  n_entries
docs_tags_fast      2                300               17
docs2_tags_slow     0                0                 17
docs3_tags_cleaned  0                0                 17

Aggregate
  ->  Bitmap Heap Scan on docs
        Recheck Cond: (tags @> '{new}'::text[])
        ->  Bitmap Index Scan on docs_tags_fast
```

In `docs_tags_fast`, the 300 rows tagged `new` still sit in the pending list (2 pages); in the other two indexes they are in the tree. All three report `n_entries` = 17 (10 `t*` tags + 7 `u*` tags at build time): this statistic is not updated on every insert, so do not use it to count the current keys.

Also measured: calling `gin_clean_pending_list` inside a transaction and then rolling back does not bring the pending list back. Index cleanup is not a data change, so it is not undone.

## Practice

Read the metapage of three indexes, read their storage parameters, then see that the planner still finds data sitting in the pending list. Expert skill: diagnose "full-text search is sometimes fast, sometimes slow" as the pending list, and choose between `fastupdate`, a per-index `gin_pending_list_limit` and more frequent autovacuum.
