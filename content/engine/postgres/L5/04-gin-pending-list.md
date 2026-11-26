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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
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
    trap: 0
    why: { vi: "\"Sau mỗi INSERT\" nghe hợp lý vì index thường được cập nhật ngay, nhưng pending list (danh sách chờ, bật bằng `fastupdate`) sinh ra chính là để hoãn việc đó: một dòng mới có nhiều khóa (mỗi phần tử mảng một khóa), chèn từng khóa vào cây GIN rất tốn, nên Postgres gom lại rồi chuyển một lượt. \"Chỉ khi REINDEX\" cũng sai: có bốn lúc chuyển, như đáp án đúng liệt kê. Cái giá: mọi lần tìm phải quét thêm pending list, và INSERT làm nó vượt ngưỡng phải tự dọn nên chậm hẳn.", en: "\"After every INSERT\" sounds right because an index is usually updated at once, but the pending list (turned on by `fastupdate`) exists precisely to defer that: one new row has many keys (one per array element), inserting each into the GIN tree is costly, so Postgres collects them and moves them in one pass. \"Only on REINDEX\" is wrong too: there are four moments, as the right answer lists. The price: every search also scans the pending list, and the INSERT that pushes it past the limit must do the cleanup and is much slower." }
  - q: { vi: "Gọi `gin_clean_pending_list` trong một transaction rồi ROLLBACK. Pending list có quay lại không?", en: "You call `gin_clean_pending_list` inside a transaction, then ROLLBACK. Does the pending list come back?" }
    options:
      - { vi: "Có, ROLLBACK hoàn tác mọi thứ", en: "Yes, ROLLBACK undoes everything" }
      - { vi: "Không: việc dọn chỉ sắp lại trang index, không đổi dữ liệu logic, nên không bị hoàn tác", en: "No: the flush only reorganises index pages without changing logical data, so it is not undone" }
      - { vi: "Hàm báo lỗi trong transaction", en: "The function errors inside a transaction" }
    answer: 1
    trap: 0
    why: { vi: "ROLLBACK hoàn tác mọi thay đổi dữ liệu mà transaction làm ra, nhưng việc dọn này không thêm, sửa hay xóa dòng nào: nó chỉ chuyển các khóa đã có từ pending list sang cây chính. Hàm cũng không báo lỗi trong transaction. Đo trên PGlite: gọi hàm, ROLLBACK, rồi gọi lại lần hai thì trả 0, tức không còn gì để chuyển. Vì thế bài lab dọn pending list trong phần dựng dữ liệu, không trong câu của bạn.", en: "ROLLBACK undoes every data change the transaction made, but this flush inserts, updates or deletes no row: it only moves keys that already exist from the pending list into the main tree. The function does not error inside a transaction either. Measured on PGlite: call it, ROLLBACK, call it again and it returns 0, so nothing was left to move. That is why the lab flushes the pending list in its setup, not in your statement." }
  - q: { vi: "Một GIN trên `jsonb` chỉ phục vụ truy vấn `@>`. Opclass nào nhỏ và nhanh hơn?", en: "A GIN index on `jsonb` only serves `@>` queries. Which opclass is smaller and faster?" }
    options:
      - { vi: "`jsonb_ops` (mặc định)", en: "`jsonb_ops` (the default)" }
      - { vi: "`jsonb_path_ops`", en: "`jsonb_path_ops`" }
      - { vi: "`gin_trgm_ops`", en: "`gin_trgm_ops`" }
    answer: 1
    trap: 0
    why: { vi: "`jsonb_ops` nghe an toàn vì là mặc định và phục vụ nhiều toán tử hơn, nhưng nó tạo một khóa riêng cho mỗi tên trường và mỗi giá trị, nên index to và một tìm `@>` khớp nhiều dòng thừa phải kiểm lại. `jsonb_path_ops` băm cả đường dẫn tới giá trị thành một khóa: ít khóa hơn, khớp sát hơn cho `@>`, đổi lại không hỗ trợ `?`, `?|`, `?&`. `gin_trgm_ops` dành cho chuỗi `text` (tìm theo cụm 3 ký tự), không dùng cho `jsonb`.", en: "`jsonb_ops` sounds safe because it is the default and serves more operators, but it makes a separate key for every field name and every value, so the index is big and a `@>` search matches many extra rows that must be rechecked. `jsonb_path_ops` hashes the whole path to a value into one key: fewer keys and closer matches for `@>`, at the cost of no `?`, `?|`, `?&`. `gin_trgm_ops` is for `text` strings (search by 3-character groups), not for `jsonb`." }
---

## Mở bài

Tìm kiếm theo nhãn lúc thì vài mili giây, lúc lại chậm hẳn, dù câu truy vấn không đổi. Thủ phạm thường nằm trong một vùng đệm của index GIN mà ít ai nhìn tới.

## Ý chính

GIN là index đảo. Mỗi giá trị được tách thành nhiều khóa: phần tử mảng, từ của `tsvector`, khóa và giá trị của `jsonb`. Mỗi khóa trỏ tới các TID chứa nó: posting list khi ngắn, posting tree (một B-tree của TID) khi dài. Vì một dòng mới có thể thêm hàng chục khóa, chèn thẳng vào cây rất tốn.

Với `fastupdate` (bật mặc định), dòng mới vào một pending list chưa sắp, rồi được chuyển hàng loạt vào cây khi: VACUUM hoặc autoanalyze chạy, gọi `gin_clean_pending_list`, hoặc pending list vượt `gin_pending_list_limit` (mặc định 4 MB, đặt riêng được cho từng index).

Nhiều người nghĩ dữ liệu trong pending list chưa tìm được. Thật ra mọi lần tìm đều đọc cả pending list, nên kết quả vẫn đủ; cái giá là pending list dài làm đọc chậm, và INSERT làm nó vượt ngưỡng phải tự dọn. Cần thời gian phản hồi đều thì đặt `fastupdate = off` hoặc cho autovacuum chạy dày hơn.

GIN không hỗ trợ index-only scan; nó chỉ chạy dưới dạng bitmap scan, nên kế hoạch có Bitmap Heap Scan kèm `Recheck Cond`.

## Cú pháp

```sql
CREATE INDEX index_name ON table_name USING gin (column [ opclass ]) [ WITH ( fastupdate = on | off [, gin_pending_list_limit = kilobytes ] ) ];
ALTER INDEX index_name SET ( fastupdate = on | off );
SELECT gin_clean_pending_list('index_name');
SELECT * FROM gin_metapage_info(get_raw_page('index_name', 0));
```

- `fastupdate`: mặc định `on`; `off` ghi thẳng vào cây.
- `gin_pending_list_limit`: đơn vị kB, từ 64; mặc định lấy tham số cùng tên (4 MB).
- `gin_clean_pending_list`: trả về số trang pending đã chuyển vào cây.
- `n_pending_pages`, `n_pending_tuples`: kích thước pending list hiện tại.

## Ví dụ

Bảng `notes` có index GIN tạo khi còn rỗng, rồi nhận 200 dòng:

```sql
CREATE TABLE notes (id int PRIMARY KEY, words text[] NOT NULL);
CREATE INDEX notes_words_gin ON notes USING gin (words);
INSERT INTO notes SELECT g, ARRAY['w' || g % 50, 'x' || g % 3] FROM generate_series(1, 200) AS g;
SELECT n_pending_pages, n_pending_tuples FROM gin_metapage_info(get_raw_page('notes_words_gin', 0));
```

Cả 200 dòng nằm trong pending list (1 trang).

```sql
SELECT gin_clean_pending_list('notes_words_gin') AS pages_flushed;
```

Hàm trả 1: một trang pending đã vào cây, metapage giờ ghi 0 trang và 0 tuple.

Tắt `fastupdate` rồi chèn thêm:

```sql
ALTER INDEX notes_words_gin SET (fastupdate = off);
INSERT INTO notes SELECT g, ARRAY['w1'] FROM generate_series(201, 210) AS g;
SELECT n_pending_tuples FROM gin_metapage_info(get_raw_page('notes_words_gin', 0));
```

Vẫn 0: dòng mới vào thẳng cây, INSERT chậm hơn nhưng đọc không phải quét pending list.

## Lỗi hay gặp

Gọi hàm GIN trên index khác loại:

```sql
-- ERROR 42809: "notes_pkey" is not a GIN index
SELECT gin_clean_pending_list('notes_pkey');
```

Khóa chính là B-tree, không có pending list. Xem loại index trong `pg_indexes` trước.

Đặt ngưỡng pending list tính bằng MB:

```sql
-- ERROR 22023: value 32 out of bounds for option "gin_pending_list_limit"
ALTER INDEX notes_words_gin SET (gin_pending_list_limit = 32);
```

Tham số này tính bằng kB và nhỏ nhất là 64. Muốn 32 MB thì ghi 32768.

Đếm khóa bằng thống kê của metapage:

```sql
-- WRONG: n_entries is a statistic, not a live count
SELECT n_entries FROM gin_metapage_info(get_raw_page('notes_words_gin', 0));
```

```sql
-- FIX: count the distinct keys from the data
SELECT count(DISTINCT w) AS keys FROM notes, unnest(notes.words) AS w;
```

Index tạo khi bảng rỗng nên `n_entries` vẫn là 0, dù có 53 khóa. Con số này chỉ được ghi lúc dựng index hoặc VACUUM.

## Thực hành

Ba bảng giống nhau, mỗi bảng nhận 300 dòng sau khi có index GIN: một để mặc định, một `fastupdate = off`, một đã dọn pending list. Đọc metapage, đọc tham số, rồi xem planner vẫn tìm thấy dòng nằm trong pending list; sau đó ba câu hỏi.

## Tóm tắt

- GIN là index đảo: mỗi khóa trỏ tới posting list hoặc posting tree các TID.
- `fastupdate` gom dòng mới vào pending list để ghi nhanh hơn.
- Pending list được dọn khi VACUUM/autoanalyze, `gin_clean_pending_list` hoặc vượt `gin_pending_list_limit`.
- Tìm kiếm luôn đọc cả pending list: kết quả đủ nhưng có thể chậm.
- Đọc trạng thái bằng `gin_metapage_info`; đừng dùng `n_entries` để đếm khóa.

# EN

## Opening

A tag search sometimes takes a few milliseconds and sometimes is much slower, with the same query. The culprit usually sits in a buffer inside the GIN index that few people look at.

## Key idea

GIN is an inverted index. Each value is split into many keys: array elements, the words of a `tsvector`, the keys and values of a `jsonb`. Each key points to the TIDs that contain it: a posting list when short, a posting tree (a B-tree of TIDs) when long. Since one new row can add dozens of keys, inserting straight into the tree is expensive.

With `fastupdate` (on by default), new rows go into an unsorted pending list and move into the tree in bulk when: VACUUM or autoanalyze runs, `gin_clean_pending_list` is called, or the pending list grows past `gin_pending_list_limit` (4 MB by default, settable per index).

Many people think rows in the pending list cannot be found yet. In fact every search reads the pending list too, so results are complete; the price is that a long pending list slows reads, and the INSERT that pushes it past the limit has to do the cleanup. For steady response times, set `fastupdate = off` or let autovacuum run more often.

GIN does not support index-only scans; it only runs as a bitmap scan, so the plan has a Bitmap Heap Scan with a `Recheck Cond`.

## Syntax

```sql
CREATE INDEX index_name ON table_name USING gin (column [ opclass ]) [ WITH ( fastupdate = on | off [, gin_pending_list_limit = kilobytes ] ) ];
ALTER INDEX index_name SET ( fastupdate = on | off );
SELECT gin_clean_pending_list('index_name');
SELECT * FROM gin_metapage_info(get_raw_page('index_name', 0));
```

- `fastupdate`: `on` by default; `off` writes straight into the tree.
- `gin_pending_list_limit`: in kB, at least 64; defaults to the setting of the same name (4 MB).
- `gin_clean_pending_list`: returns the number of pending pages moved into the tree.
- `n_pending_pages`, `n_pending_tuples`: the current size of the pending list.

## Example

Table `notes` has a GIN index built while it was empty, then gets 200 rows:

```sql
CREATE TABLE notes (id int PRIMARY KEY, words text[] NOT NULL);
CREATE INDEX notes_words_gin ON notes USING gin (words);
INSERT INTO notes SELECT g, ARRAY['w' || g % 50, 'x' || g % 3] FROM generate_series(1, 200) AS g;
SELECT n_pending_pages, n_pending_tuples FROM gin_metapage_info(get_raw_page('notes_words_gin', 0));
```

All 200 rows sit in the pending list (1 page).

```sql
SELECT gin_clean_pending_list('notes_words_gin') AS pages_flushed;
```

It returns 1: one pending page moved into the tree, and the metapage now records 0 pages and 0 tuples.

Turn `fastupdate` off, then insert more:

```sql
ALTER INDEX notes_words_gin SET (fastupdate = off);
INSERT INTO notes SELECT g, ARRAY['w1'] FROM generate_series(201, 210) AS g;
SELECT n_pending_tuples FROM gin_metapage_info(get_raw_page('notes_words_gin', 0));
```

Still 0: the new rows go straight into the tree, the INSERT is slower but reads do not scan a pending list.

## Common mistakes

Calling a GIN function on another kind of index:

```sql
-- ERROR 42809: "notes_pkey" is not a GIN index
SELECT gin_clean_pending_list('notes_pkey');
```

The primary key is a B-tree and has no pending list. Check the index type in `pg_indexes` first.

Setting the pending list limit in MB:

```sql
-- ERROR 22023: value 32 out of bounds for option "gin_pending_list_limit"
ALTER INDEX notes_words_gin SET (gin_pending_list_limit = 32);
```

This parameter is in kB and is at least 64. For 32 MB, write 32768.

Counting keys with the metapage statistic:

```sql
-- WRONG: n_entries is a statistic, not a live count
SELECT n_entries FROM gin_metapage_info(get_raw_page('notes_words_gin', 0));
```

```sql
-- FIX: count the distinct keys from the data
SELECT count(DISTINCT w) AS keys FROM notes, unnest(notes.words) AS w;
```

The index was built on an empty table, so `n_entries` is still 0 although there are 53 keys. The figure is only written when the index is built or vacuumed.

## Practice

Three identical tables, each given 300 rows after its GIN index was built: one with the defaults, one with `fastupdate = off`, one whose pending list was flushed. Read the metapages, read the parameters, then see that the planner still finds rows sitting in the pending list; then three questions.

## Recap

- GIN is an inverted index: each key points to a posting list or posting tree of TIDs.
- `fastupdate` collects new rows in a pending list so writes are faster.
- The pending list is flushed by VACUUM/autoanalyze, `gin_clean_pending_list`, or growing past `gin_pending_list_limit`.
- Searches always read the pending list too: results are complete but can be slow.
- Read the state with `gin_metapage_info`; do not count keys with `n_entries`.
