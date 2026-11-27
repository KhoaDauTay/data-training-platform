---
id: e-pg-l5-05
engine: postgres
level: L5
module: index-internals
title: "Bên trong BRIN: khoảng khối và tóm tắt"
title_en: "BRIN internals: block ranges and summarization"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc tóm tắt min/max của từng khoảng khối bằng `brin_page_items`", en: "Read the min/max summary of each block range with `brin_page_items`" }
  - { vi: "Thấy khoảng khối mới chưa được tóm tắt, và so với index đã được `brin_summarize_new_values` tóm tắt", en: "See a new block range left unsummarized, and compare with an index summarized by `brin_summarize_new_values`" }
  - { vi: "Quyết định BRIN hay B-tree từ `correlation` và kích thước", en: "Decide BRIN or B-tree from `correlation` and size" }
requires: []
sources:
  - { url: https://www.postgresql.org/docs/18/brin.html, title_vi: "Index BRIN" }
  - { url: https://www.postgresql.org/docs/18/pageinspect.html, title_vi: "pageinspect" }
  - { url: https://www.postgresql.org/docs/18/sql-createindex.html, title_vi: "CREATE INDEX" }
viz: pg-brin-ranges
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    DROP TABLE IF EXISTS readings, readings2 CASCADE;
    CREATE TABLE readings (id int, read_at timestamp NOT NULL, v int NOT NULL);
    INSERT INTO readings SELECT g, TIMESTAMP '2026-10-01' + g * INTERVAL '1 minute', g % 50 FROM generate_series(1, 20000) g;
    CREATE TABLE readings2 (LIKE readings);
    INSERT INTO readings2 SELECT * FROM readings;
    CREATE INDEX readings_brin ON readings USING brin (read_at) WITH (pages_per_range = 8);
    CREATE INDEX readings2_brin ON readings2 USING brin (read_at) WITH (pages_per_range = 8);
    INSERT INTO readings SELECT g, TIMESTAMP '2026-10-01' + g * INTERVAL '1 minute', g % 50 FROM generate_series(20001, 24000) g;
    INSERT INTO readings2 SELECT g, TIMESTAMP '2026-10-01' + g * INTERVAL '1 minute', g % 50 FROM generate_series(20001, 24000) g;
    SELECT brin_summarize_new_values('readings2_brin');
    ANALYZE readings, readings2;
  steps:
    - task: { vi: "Index dùng 8 trang heap mỗi khoảng. Đếm số khoảng đã có tóm tắt trên trang 2 của `readings_brin` (`brin_page_items(get_raw_page(index, 2), index)`, mỗi khoảng một dòng) và số khối bắt đầu lớn nhất (`blknum`), rồi so với tổng số trang heap. Ba cột: ranges, last_blk, heap_pages.", en: "The index uses 8 heap pages per range. Count the summarized ranges on page 2 of `readings_brin` (`brin_page_items(get_raw_page(index, 2), index)`, one row per range) and the largest starting block (`blknum`), and compare with the heap's page count. Three columns: ranges, last_blk, heap_pages." }
      solution: "SELECT count(*) AS ranges, max(blknum) AS last_blk, pg_relation_size('readings') / 8192 AS heap_pages FROM brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')"
      check: rows
      hint: { vi: "`brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')`; trang 0 là metapage, trang 1 là revmap (bảng tra từ khoảng khối tới chỗ lưu tóm tắt của nó).", en: "`brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')`; page 0 is the metapage, page 1 the revmap (the map from each block range to where its summary is stored)." }
    - task: { vi: "`readings2` giống hệt `readings`, nhưng phần dựng dữ liệu đã gọi `brin_summarize_new_values('readings2_brin')`. Làm lại phép đếm của bước 1 cho `readings2_brin` và `readings2`.", en: "`readings2` is identical to `readings`, but the setup called `brin_summarize_new_values('readings2_brin')`. Repeat step 1's count for `readings2_brin` and `readings2`." }
      solution: "SELECT count(*) AS ranges, max(blknum) AS last_blk, pg_relation_size('readings2') / 8192 AS heap_pages FROM brin_page_items(get_raw_page('readings2_brin', 2), 'readings2_brin')"
      check: rows
      hint: { vi: "Cùng câu bước 1, đổi tên bảng và index. VACUUM cũng tóm tắt khoảng mới, nhưng không chạy được trong transaction.", en: "Step 1's query with the table and index names changed. VACUUM also summarizes new ranges, but it cannot run inside a transaction." }
    - task: { vi: "Đếm số đo trong ngày 2026-10-05. Planner phải dùng `readings_brin`.", en: "Count the readings on 2026-10-05. The planner must use `readings_brin`." }
      solution: "SELECT count(*) FROM readings WHERE read_at >= '2026-10-05' AND read_at < '2026-10-06'"
      check: plan
      hint: { vi: "Điều kiện khoảng trên `read_at` bằng hai hằng thời gian.", en: "A range condition on `read_at` with two literal timestamps." }
quiz:
  - q: { vi: "BRIN chỉ hiệu quả khi thứ tự giá trị khớp với thứ tự vật lý. Cột nào hợp với BRIN?", en: "BRIN only works well when value order follows physical order. Which column suits BRIN?" }
    options:
      - { vi: "`read_at` (correlation = 1): mỗi khoảng khối có min/max hẹp, không chồng lên nhau", en: "`read_at` (correlation = 1): each block range has a narrow min/max that does not overlap the others" }
      - { vi: "`v` (correlation gần 0): giá trị lặp lại nên dễ tóm tắt", en: "`v` (correlation near 0): values repeat, so they are easy to summarize" }
      - { vi: "Cả hai như nhau", en: "Both are the same" }
    answer: 0
    trap: 1
    why: { vi: "Giá trị lặp lại nghe dễ tóm tắt, nhưng BRIN (block range index) không tóm tắt từng giá trị: nó ghi giá trị nhỏ nhất và lớn nhất của mỗi khoảng 8 trang, rồi dùng cặp đó để bỏ qua khoảng không thể khớp. `v` = `g % 50` lặp 0..49 trong mọi khoảng, nên khoảng nào cũng ghi `{0 .. 49}` và BRIN không bỏ được khoảng nào. `read_at` tăng đúng theo thứ tự chèn, nên mỗi khoảng chỉ phủ vài giờ và BRIN bỏ được gần hết. Vì thế hai cột không như nhau.", en: "Repeated values sound easy to summarize, but a BRIN (block range index) does not summarize single values: it stores the smallest and largest value of each range of 8 pages and uses that pair to skip ranges that cannot match. `v` = `g % 50` cycles 0..49 in every range, so every range records `{0 .. 49}` and the BRIN can skip none. `read_at` grows exactly in insert order, so each range covers a few hours and the BRIN skips almost all of them. So the two columns are not the same." }
  - q: { vi: "Một bảng log nhận dòng mới mỗi ngày; index BRIN tạo từ tháng trước, `autosummarize` tắt và VACUUM chưa chạy. Câu đếm dòng của hôm nay dùng BRIN sẽ ra sao?", en: "A log table gets new rows every day; its BRIN index was built last month, `autosummarize` is off and VACUUM has not run. What happens to a count of today's rows that uses the BRIN index?" }
    options:
      - { vi: "Thiếu dòng: BRIN bỏ qua các trang chưa tóm tắt", en: "Rows are missing: BRIN skips unsummarized pages" }
      - { vi: "Vẫn đúng nhưng chậm hơn: khoảng chưa tóm tắt luôn được coi là có thể khớp nên mọi trang của nó đều bị đọc", en: "Still correct but slower: an unsummarized range always counts as a possible match, so all its pages are read" }
      - { vi: "Planner báo lỗi vì index chưa đầy đủ", en: "The planner raises an error because the index is incomplete" }
    answer: 1
    trap: 0
    why: { vi: "Index thiếu tóm tắt nghe như thiếu dữ liệu, nhưng BRIN chỉ dùng tóm tắt (min/max của khoảng) để loại khoảng. Khoảng chưa có tóm tắt thì không loại được, nên luôn bị đọc: kết quả vẫn đủ, chỉ chậm hơn. Planner cũng không báo lỗi, vì index thiếu tóm tắt vẫn là index hợp lệ. Đo trên `readings`: câu đếm ngày 2026-10-16 ra đủ 1440 dòng (một dòng mỗi phút × 1440 phút), và Bitmap Heap Scan đọc cả 25 trang chưa tóm tắt.", en: "An index missing summaries sounds like it misses data, but a BRIN only uses summaries (a range's min/max) to rule ranges out. A range with no summary cannot be ruled out, so it is always read: the result is complete, only slower. The planner raises no error either, since an index with missing summaries is still a valid index. Measured on `readings`: the count for 2026-10-16 returns all 1440 rows (one row a minute × 1440 minutes), and the Bitmap Heap Scan reads all 25 unsummarized pages." }
---

## Mở bài

Một bảng log tăng vài triệu dòng mỗi ngày, và mọi truy vấn đều hỏi "từ giờ này tới giờ kia". Một B-tree trên cột thời gian sẽ to gần bằng chính dữ liệu. Có cách nào lọc theo thời gian với một index chỉ vài trang?

## Ý chính

BRIN (Block Range INdex) không lưu một mục cho mỗi dòng. Nó chia heap thành các khoảng `pages_per_range` trang liền nhau (mặc định 128) và lưu một tóm tắt cho mỗi khoảng; với opclass minmax mặc định, tóm tắt là giá trị nhỏ nhất và lớn nhất. Truy vấn khoảng lấy mọi khoảng có thể chứa dòng khớp, rồi Bitmap Heap Scan đọc và kiểm lại các trang đó. Index cực nhỏ nhưng lossy.

Nhiều người nghĩ BRIN hợp với cột chỉ có vài giá trị lặp đi lặp lại. Thật ra BRIN chỉ cần một điều: giá trị tương quan với vị trí vật lý (`correlation` gần ±1), như thời gian chèn của log. Dữ liệu xáo trộn làm khoảng nào cũng có min/max rộng, và BRIN không loại được gì.

Tóm tắt không tự theo kịp dữ liệu. Dòng mới rơi vào một khoảng đã tóm tắt thì tóm tắt được mở rộng ngay. Dòng mới mở ra một khoảng mới thì khoảng đó chưa có tóm tắt cho tới khi VACUUM chạy, khi gọi `brin_summarize_new_values` hay `brin_summarize_range`, hoặc khi index đặt `autosummarize = on` (mặc định tắt). Khoảng chưa tóm tắt luôn bị đọc, nên kết quả vẫn đúng, chỉ chậm hơn.

Ngoài minmax còn có minmax-multi (nhiều khoảng con mỗi tóm tắt, chịu được ngoại lệ), bloom và inclusion (hộp bao cho hình học).

## Cú pháp

```sql
CREATE INDEX index_name ON table_name USING brin (column [ opclass ]) [ WITH ( pages_per_range = n [, autosummarize = on | off ] ) ];
SELECT brin_summarize_new_values('index_name');
SELECT brin_summarize_range('index_name', block_number);
SELECT * FROM brin_page_items(get_raw_page('index_name', block_number), 'index_name');
```

- `pages_per_range`: số trang heap mỗi khoảng, từ 1, mặc định 128.
- `autosummarize`: khi dòng đầu tiên vào khoảng kế tiếp, xếp cho autovacuum tóm tắt khoảng vừa đầy.
- `brin_summarize_new_values`: trả về số khoảng vừa được tóm tắt.
- Trang 0 là metapage, trang 1 là revmap; tóm tắt bắt đầu ở trang 2.

## Ví dụ

Ba khoảng đầu của `readings_brin`, mỗi khoảng 8 trang heap:

```sql
SELECT blknum, value
FROM brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')
ORDER BY blknum LIMIT 3;
```

Mỗi khoảng phủ chừng 20 giờ đo, và các khoảng nối tiếp nhau, không chồng.

Cùng kiểu index trên cột `v`, cột lặp 0..49:

```sql
CREATE INDEX readings_v_brin ON readings USING brin (v) WITH (pages_per_range = 8);
SELECT blknum, value
FROM brin_page_items(get_raw_page('readings_v_brin', 2), 'readings_v_brin')
ORDER BY blknum LIMIT 2;
```

Khoảng nào cũng ghi `{0 .. 49}`, nên index này không loại được khoảng nào.

Planner nhìn thấy điều đó qua `correlation`:

```sql
SELECT attname, round(correlation::numeric, 2) AS correlation
FROM pg_stats
WHERE tablename = 'readings' AND attname IN ('read_at', 'v')
ORDER BY attname;
```

`read_at` có 1.00, `v` chỉ 0.02.

So kích thước với một B-tree trên cùng cột:

```sql
CREATE INDEX readings_read_at_btree ON readings (read_at);
SELECT relname, pg_relation_size(oid) / 8192 AS pages
FROM pg_class WHERE relname IN ('readings_brin', 'readings_read_at_btree')
ORDER BY relname;
```

BRIN 3 trang, B-tree 68 trang cho 24.000 dòng; trên bảng tỉ dòng, khoảng cách là gigabyte.

## Lỗi hay gặp

Gọi hàm tóm tắt trên index khác loại:

```sql
-- ERROR 42809: "readings_read_at_btree" is not a BRIN index
SELECT brin_summarize_new_values('readings_read_at_btree');
```

Các hàm `brin_*` chỉ nhận index BRIN. Xem loại index trong `pg_indexes` trước.

Đặt khoảng bằng 0 trang:

```sql
-- ERROR 22023: value 0 out of bounds for option "pages_per_range"
CREATE INDEX readings_v_brin0 ON readings USING brin (v) WITH (pages_per_range = 0);
```

`pages_per_range` nhỏ nhất là 1. Khoảng nhỏ thì loại chính xác hơn nhưng index to hơn.

Tạo BRIN trên bảng rỗng rồi nạp dữ liệu và tin rằng index đã đủ:

```sql
-- WRONG: ranges filled after CREATE INDEX have no summary yet
CREATE TABLE events (id int PRIMARY KEY, at timestamp NOT NULL);
CREATE INDEX events_at_brin ON events USING brin (at) WITH (pages_per_range = 4);
INSERT INTO events SELECT g, TIMESTAMP '2026-11-01' + g * INTERVAL '1 second' FROM generate_series(1, 3000) AS g;
SELECT count(*) AS summarized_ranges
FROM brin_page_items(get_raw_page('events_at_brin', 2), 'events_at_brin');
```

```sql
-- FIX: summarize the new ranges after a bulk load
SELECT brin_summarize_new_values('events_at_brin');
SELECT count(*) AS summarized_ranges
FROM brin_page_items(get_raw_page('events_at_brin', 2), 'events_at_brin');
```

Bảng có 17 trang, tức 5 khoảng, nhưng chỉ khoảng đầu có tóm tắt. Sau `brin_summarize_new_values` đủ 5 khoảng. Sau một lần nạp lớn, gọi hàm này (hoặc VACUUM).

## Thực hành

Hai bảng giống hệt nhau, mỗi bảng nhận 4000 dòng sau khi có BRIN, nhưng chỉ index của `readings2` được tóm tắt lại. Đếm khoảng của hai index, rồi viết câu lọc theo ngày mà planner dùng BRIN; sau đó hai câu hỏi.

## Tóm tắt

- BRIN lưu một tóm tắt (min/max) cho mỗi `pages_per_range` trang heap: rất nhỏ, nhưng lossy.
- Nó chỉ hiệu quả khi `correlation` gần ±1, như thời gian chèn của log.
- Khoảng mới chưa có tóm tắt cho tới VACUUM, `brin_summarize_new_values` hoặc `autosummarize`.
- Khoảng chưa tóm tắt luôn bị đọc: kết quả đúng nhưng chậm hơn.
- Đọc tóm tắt bằng `brin_page_items` từ trang 2.

# EN

## Opening

A log table grows by millions of rows a day, and every query asks "from this time to that time". A B-tree on the timestamp would be almost as big as the data itself. Is there a way to filter by time with an index of a few pages?

## Key idea

BRIN (Block Range INdex) does not store one entry per row. It splits the heap into ranges of `pages_per_range` adjacent pages (128 by default) and stores one summary per range; with the default minmax opclass, the summary is the smallest and largest value. A range query takes every range that might hold a matching row, then a Bitmap Heap Scan reads and re-checks those pages. The index is tiny but lossy.

Many people think BRIN suits a column with only a few values that repeat. In fact BRIN needs only one thing: values that correlate with physical position (`correlation` near ±1), such as the insert time of a log. Shuffled data gives every range a wide min/max, and BRIN rules nothing out.

Summaries do not keep up with the data by themselves. A new row in an already summarized range widens that summary at once. A new row that opens a new range leaves that range unsummarized until VACUUM runs, `brin_summarize_new_values` or `brin_summarize_range` is called, or the index has `autosummarize = on` (off by default). An unsummarized range is always read, so results stay correct, only slower.

Besides minmax there are minmax-multi (several sub-intervals per summary, tolerates outliers), bloom and inclusion (bounding boxes for geometry).

## Syntax

```sql
CREATE INDEX index_name ON table_name USING brin (column [ opclass ]) [ WITH ( pages_per_range = n [, autosummarize = on | off ] ) ];
SELECT brin_summarize_new_values('index_name');
SELECT brin_summarize_range('index_name', block_number);
SELECT * FROM brin_page_items(get_raw_page('index_name', block_number), 'index_name');
```

- `pages_per_range`: heap pages per range, at least 1, 128 by default.
- `autosummarize`: when the first row lands in the next range, queues an autovacuum summary of the range that just filled.
- `brin_summarize_new_values`: returns the number of ranges it summarized.
- Page 0 is the metapage, page 1 the revmap; summaries start on page 2.

## Example

The first three ranges of `readings_brin`, 8 heap pages each:

```sql
SELECT blknum, value
FROM brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')
ORDER BY blknum LIMIT 3;
```

Each range covers about 20 hours of readings, and the ranges follow each other without overlapping.

The same kind of index on column `v`, which cycles 0..49:

```sql
CREATE INDEX readings_v_brin ON readings USING brin (v) WITH (pages_per_range = 8);
SELECT blknum, value
FROM brin_page_items(get_raw_page('readings_v_brin', 2), 'readings_v_brin')
ORDER BY blknum LIMIT 2;
```

Every range records `{0 .. 49}`, so this index can rule out no range.

The planner sees that through `correlation`:

```sql
SELECT attname, round(correlation::numeric, 2) AS correlation
FROM pg_stats
WHERE tablename = 'readings' AND attname IN ('read_at', 'v')
ORDER BY attname;
```

`read_at` has 1.00, `v` only 0.02.

Compare the size with a B-tree on the same column:

```sql
CREATE INDEX readings_read_at_btree ON readings (read_at);
SELECT relname, pg_relation_size(oid) / 8192 AS pages
FROM pg_class WHERE relname IN ('readings_brin', 'readings_read_at_btree')
ORDER BY relname;
```

BRIN 3 pages, B-tree 68 pages for 24,000 rows; on a billion-row table the gap is gigabytes.

## Common mistakes

Calling the summarize function on another kind of index:

```sql
-- ERROR 42809: "readings_read_at_btree" is not a BRIN index
SELECT brin_summarize_new_values('readings_read_at_btree');
```

The `brin_*` functions only take BRIN indexes. Check the index type in `pg_indexes` first.

Making a range of 0 pages:

```sql
-- ERROR 22023: value 0 out of bounds for option "pages_per_range"
CREATE INDEX readings_v_brin0 ON readings USING brin (v) WITH (pages_per_range = 0);
```

`pages_per_range` is at least 1. Smaller ranges rule out more precisely but make the index larger.

Building BRIN on an empty table, loading data, and trusting the index is complete:

```sql
-- WRONG: ranges filled after CREATE INDEX have no summary yet
CREATE TABLE events (id int PRIMARY KEY, at timestamp NOT NULL);
CREATE INDEX events_at_brin ON events USING brin (at) WITH (pages_per_range = 4);
INSERT INTO events SELECT g, TIMESTAMP '2026-11-01' + g * INTERVAL '1 second' FROM generate_series(1, 3000) AS g;
SELECT count(*) AS summarized_ranges
FROM brin_page_items(get_raw_page('events_at_brin', 2), 'events_at_brin');
```

```sql
-- FIX: summarize the new ranges after a bulk load
SELECT brin_summarize_new_values('events_at_brin');
SELECT count(*) AS summarized_ranges
FROM brin_page_items(get_raw_page('events_at_brin', 2), 'events_at_brin');
```

The table has 17 pages, so 5 ranges, but only the first range has a summary. After `brin_summarize_new_values` all 5 do. After a bulk load, call this function (or VACUUM).

## Practice

Two identical tables, each given 4000 rows after its BRIN index was built, but only the index of `readings2` was summarized again. Count the ranges of both indexes, then write a filter on one day that the planner runs through BRIN; then two questions.

## Recap

- BRIN stores one summary (min/max) per `pages_per_range` heap pages: very small, but lossy.
- It only works well when `correlation` is near ±1, such as the insert time of a log.
- A new range has no summary until VACUUM, `brin_summarize_new_values` or `autosummarize`.
- An unsummarized range is always read: results are correct but slower.
- Read the summaries with `brin_page_items` from page 2.
