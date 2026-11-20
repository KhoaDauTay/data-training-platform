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
objectives:
  - { vi: "Đọc tóm tắt min/max của từng khoảng khối bằng `brin_page_items`", en: "Read the min/max summary of each block range with `brin_page_items`" }
  - { vi: "Thấy khoảng khối mới chưa được tóm tắt, và so với index đã được `brin_summarize_new_values` tóm tắt", en: "See a new block range left unsummarized, and compare with an index summarized by `brin_summarize_new_values`" }
  - { vi: "Quyết định BRIN hay B-tree từ `correlation` và kích thước", en: "Decide BRIN or B-tree from `correlation` and size" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/brin.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
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
    - task: { vi: "Index dùng 8 trang heap mỗi khoảng. Đếm số khoảng đã có tóm tắt trên trang 2 của `readings_brin` và số khối bắt đầu lớn nhất (`blknum`), rồi so với tổng số trang heap. Ba cột: ranges, last_blk, heap_pages.", en: "The index uses 8 heap pages per range. Count the summarized ranges on page 2 of `readings_brin` and the largest starting block (`blknum`), and compare with the heap's page count. Three columns: ranges, last_blk, heap_pages." }
      solution: "SELECT count(*) AS ranges, max(blknum) AS last_blk, pg_relation_size('readings') / 8192 AS heap_pages FROM brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')"
      check: rows
      hint: { vi: "`brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')`; trang 0 là metapage, trang 1 là revmap.", en: "`brin_page_items(get_raw_page('readings_brin', 2), 'readings_brin')`; page 0 is the metapage, page 1 the revmap." }
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
    why: { vi: "Giá trị lặp lại nghe như dễ tóm tắt, nhưng BRIN tóm tắt theo khoảng khối chứ không theo giá trị. `v` lặp 0..49 trong mọi khoảng, nên min/max của khoảng nào cũng là 0..49 và BRIN không loại được khoảng nào. `read_at` tăng dần theo lần chèn nên BRIN loại được gần hết.", en: "Repeated values sound easy to summarize, but BRIN summarizes per block range, not per value. `v` cycles 0..49 in every range, so every range's min/max is 0..49 and BRIN can rule none out. `read_at` grows with insert order, so BRIN rules out almost all of them." }
---

## Ý chính

- BRIN (Block Range INdex) lưu một tóm tắt cho mỗi khoảng `pages_per_range` trang heap (mặc định 128). Opclass minmax lưu min và max.
- Truy vấn khoảng: BRIN trả về mọi khoảng có thể chứa dòng khớp, rồi Bitmap Heap Scan đọc và kiểm lại các trang đó. Index cực nhỏ, nhưng lossy.
- Chỉ hiệu quả khi giá trị tương quan với vị trí vật lý (`correlation` gần ±1), như log hay thời gian chèn. Dữ liệu xáo trộn làm mọi khoảng có min/max rộng, và BRIN không loại được gì.
- Tóm tắt khoảng mới: trang mới thuộc một khoảng đã tóm tắt thì tóm tắt được cập nhật; trang mở ra khoảng mới thì khoảng đó chưa có tóm tắt cho tới khi VACUUM chạy, khi gọi `brin_summarize_new_values` / `brin_summarize_range`, hoặc khi autovacuum xử lý yêu cầu nếu index đặt `autosummarize = on` (mặc định off).

## Ví dụ

Kết quả thật trên PGlite (20.000 dòng lúc tạo index, thêm 4000 dòng sau):

```text
readings_brin   (not summarized)  ranges 16  last_blk 120  heap_pages 153
readings2_brin  (summarized)      ranges 20  last_blk 152  heap_pages 153

Aggregate
  ->  Bitmap Heap Scan on readings
        Recheck Cond: ((read_at >= '2026-10-05 00:00:00'::timestamp without time zone) AND ...)
        ->  Bitmap Index Scan on readings_brin
```

16 khoảng × 8 trang = trang 0–127 đã tóm tắt; trang 128–152 (4 khoảng) chưa có tóm tắt. `brin_summarize_new_values` trả về 4 và index thứ hai có đủ 20 khoảng. Đo thêm: việc tóm tắt không bị ROLLBACK hoàn tác, vì nó chỉ sửa index, không sửa dữ liệu.

## Thực hành

Các opclass khác: minmax-multi (nhiều khoảng mỗi tóm tắt, chịu được ngoại lệ), bloom, inclusion (hộp bao cho hình học).

Đọc khoảng khối của index chưa và đã tóm tắt, xem planner dùng BRIN, rồi chọn cột nào hợp BRIN. Kỹ năng chuyên gia: chọn BRIN thay B-tree cho bảng append-only rất lớn, và biết giữ tóm tắt luôn mới.

# EN

## Key idea

- BRIN (Block Range INdex) stores one summary per range of `pages_per_range` heap pages (128 by default). The minmax opclass stores the min and max.
- Range query: BRIN returns every range that might hold matching rows, then a Bitmap Heap Scan reads and re-checks those pages. The index is tiny but lossy.
- It only works when values correlate with physical position (`correlation` near ±1), such as logs or insert time. Shuffled data gives every range a wide min/max and BRIN rules nothing out.
- Summarizing new ranges: a new page inside an already summarized range updates that summary; a new page that opens a new range leaves that range unsummarized until VACUUM runs, `brin_summarize_new_values` / `brin_summarize_range` is called, or autovacuum serves the request when the index has `autosummarize = on` (off by default).

## Example

Real output from PGlite (20,000 rows when the index was built, 4000 more afterwards):

```text
readings_brin   (not summarized)  ranges 16  last_blk 120  heap_pages 153
readings2_brin  (summarized)      ranges 20  last_blk 152  heap_pages 153

Aggregate
  ->  Bitmap Heap Scan on readings
        Recheck Cond: ((read_at >= '2026-10-05 00:00:00'::timestamp without time zone) AND ...)
        ->  Bitmap Index Scan on readings_brin
```

16 ranges × 8 pages = pages 0–127 are summarized; pages 128–152 (4 ranges) have no summary. `brin_summarize_new_values` returns 4 and the second index has all 20 ranges. Also measured: summarization is not undone by ROLLBACK, because it only changes the index, not the data.

## Practice

Other opclasses: minmax-multi (several intervals per summary, tolerates outliers), bloom, inclusion (bounding boxes for geometry).

Read the block ranges of an unsummarized and a summarized index, watch the planner use BRIN, then choose which column suits BRIN. Expert skill: choose BRIN over B-tree for a very large append-only table, and keep its summaries up to date.
