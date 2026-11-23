---
id: e-pg-l5-01
engine: postgres
level: L5
module: index-internals
title: "Bên trong B-tree: tầng, trang và tách trang"
title_en: "B-tree internals: levels, pages and splits"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc metapage (`bt_metap`) và thống kê từng trang (`bt_page_stats`) của một B-tree thật", en: "Read the metapage (`bt_metap`) and per-page statistics (`bt_page_stats`) of a real B-tree" }
  - { vi: "Giải thích vì sao chèn khóa tăng dần cho lá gần đầy, còn chèn lộn xộn cho lá đầy khoảng một nửa tới hai phần ba", en: "Explain why ascending inserts leave leaves nearly full while scattered inserts leave them half to two-thirds full" }
  - { vi: "Đi từ gốc xuống lá bằng `bt_page_items`", en: "Walk from the root to a leaf with `bt_page_items`" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/btree.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
viz: pg-btree
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    DROP TABLE IF EXISTS seq_keys, mixed_keys CASCADE;
    CREATE TABLE seq_keys (k int NOT NULL);
    CREATE INDEX seq_keys_idx ON seq_keys (k);
    INSERT INTO seq_keys SELECT g FROM generate_series(1, 20000) g;
    CREATE TABLE mixed_keys (k int NOT NULL);
    CREATE INDEX mixed_keys_idx ON mixed_keys (k);
    INSERT INTO mixed_keys SELECT (g * 7919) % 20000 + 1 FROM generate_series(1, 20000) g;
  steps:
    - task: { vi: "Đọc metapage của `seq_keys_idx`: trang gốc và số tầng (root, level).", en: "Read the metapage of `seq_keys_idx`: the root page and the number of levels (root, level)." }
      solution: "SELECT root, level FROM bt_metap('seq_keys_idx')"
      check: rows
      hint: { vi: "`bt_metap(text)` của `pageinspect`. Tầng 0 là lá.", en: "`bt_metap(text)` from `pageinspect`. Level 0 is the leaf level." }
    - task: { vi: "So hai index cùng 20.000 khóa: với mỗi index và mỗi loại trang (`type`: l = lá, r = gốc), đếm số trang, số mục sống trung bình và số byte trống trung bình (làm tròn). Duyệt mọi trang từ 1 tới trang cuối bằng `generate_series` + `bt_page_stats`. Sắp theo tên index rồi loại trang. Đoán trước: index nào có nhiều lá hơn?", en: "Compare two indexes holding the same 20,000 keys: for each index and each page `type` (l = leaf, r = root), count pages, average live items and average free bytes (rounded). Walk every page from 1 to the last with `generate_series` + `bt_page_stats`. Order by index name, then page type. Guess first: which index has more leaves?" }
      solution: "SELECT i.relname, s.type, count(*) AS pages, round(avg(s.live_items)) AS avg_items, round(avg(s.free_size)) AS avg_free FROM pg_class i, generate_series(1, (pg_relation_size(i.oid) / 8192 - 1)::int) b, bt_page_stats(i.relname, b) s WHERE i.relname IN ('seq_keys_idx', 'mixed_keys_idx') GROUP BY 1, 2 ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Trang 0 là metapage, nên bắt đầu từ 1. Số trang = `pg_relation_size / 8192`.", en: "Page 0 is the metapage, so start at 1. Page count = `pg_relation_size / 8192`." }
    - task: { vi: "Đọc 4 mục đầu của trang gốc `seq_keys_idx` (lấy số trang từ `bt_metap`): `itemoffset`, `ctid` (ép text) và `data`.", en: "Read the first 4 items of the root page of `seq_keys_idx` (take the page number from `bt_metap`): `itemoffset`, `ctid` (cast to text) and `data`." }
      solution: "SELECT itemoffset, ctid::text, data FROM bt_page_items('seq_keys_idx', (SELECT root FROM bt_metap('seq_keys_idx'))) ORDER BY itemoffset LIMIT 4"
      check: rows
      ordered: true
      hint: { vi: "Ở trang trong (không phải lá), `ctid` trỏ tới trang con: (số trang, …).", en: "On an internal (non-leaf) page, `ctid` points to a child page: (page number, …)." }
quiz:
  - q: { vi: "Vì sao `seq_keys_idx` có 55 lá còn `mixed_keys_idx` có 73 lá, dù cùng 20.000 khóa?", en: "Why does `seq_keys_idx` have 55 leaves and `mixed_keys_idx` 73, with the same 20,000 keys?" }
    options:
      - { vi: "Khóa tăng dần luôn chèn vào lá phải nhất; khi lá đó đầy, Postgres tách lệch để giữ trang trái gần đầy (theo fillfactor 90). Khóa lộn xộn chèn vào giữa, tách đôi trang, nên lá chỉ đầy một phần", en: "Ascending keys always go into the rightmost leaf; when it fills, Postgres splits unevenly and keeps the left page nearly full (fillfactor 90). Scattered keys land in the middle and split pages in two, so leaves stay partly full" }
      - { vi: "Index khóa lộn xộn có dedup", en: "The scattered-key index uses deduplication" }
      - { vi: "VACUUM chưa chạy trên `seq_keys`", en: "VACUUM has not run on `seq_keys`" }
    answer: 0
    trap: 1
    why: { vi: "Nghe hợp lý vì dedup cũng đổi số mục trên lá, nhưng ở đây mọi khóa đều khác nhau nên không có gì để gộp. Trên dữ liệu thật: lá của `seq_keys_idx` trống trung bình 856 byte (~365 mục), lá của `mixed_keys_idx` trống 2649 byte (~275 mục). Quét toàn bộ index thì đọc thêm trang; một câu chỉ tra vài khóa đọc thêm nhiều lắm một hai trang lá.", en: "It sounds right because deduplication also changes the number of items per leaf, but here every key is distinct, so there is nothing to merge. On the real data: `seq_keys_idx` leaves average 856 free bytes (~365 items), `mixed_keys_idx` leaves 2649 (~275 items). A full index scan reads more pages; a query that looks up a few keys reads at most a leaf page or two more." }
  - q: { vi: "Bạn xóa 90% dòng của một bảng rồi chạy `VACUUM`. Kích thước file của index B-tree thay đổi thế nào?", en: "You delete 90% of a table's rows, then run `VACUUM`. What happens to the file size of its B-tree index?" }
    options:
      - { vi: "Giảm theo số dòng: VACUUM trả trang trống về cho hệ điều hành", en: "It shrinks with the rows: VACUUM gives empty pages back to the operating system" }
      - { vi: "Không đổi: lá rỗng hẳn được đánh dấu xóa để dùng lại cho lần tách sau; muốn file nhỏ lại thì `REINDEX`", en: "It stays the same: leaves that became empty are marked deleted and reused by later splits; to shrink the file, `REINDEX`" }
      - { vi: "Giảm một nửa, vì Postgres gộp các lá còn đầy một nửa", en: "It halves, because Postgres merges half-full leaves" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì ít dòng thì index phải nhỏ đi, nhưng VACUUM chỉ dọn mục chết và đánh dấu trang rỗng hẳn là đã xóa; file giữ nguyên cỡ. Postgres cũng không gộp lá còn đầy một phần. Ví dụ trong bài: `grow_pkey` vẫn 5 trang sau DELETE + VACUUM, và còn 2 trang sau `REINDEX`.", en: "It sounds right because fewer rows should mean a smaller index, but VACUUM only removes dead items and marks fully empty pages deleted; the file keeps its size. Postgres does not merge partly full leaves either. The lesson's example: `grow_pkey` is still 5 pages after DELETE + VACUUM, and 2 pages after `REINDEX`." }
---

## Mở bài

Hai bảng nhận cùng 20.000 khóa `int`, chỉ khác thứ tự chèn, vậy mà một index lớn hơn index kia gần một phần ba. Bài này mở trang thật của B-tree để xem chỗ chênh nằm ở đâu.

## Ý chính

B-tree của Postgres xếp trang thành tầng. Trang 0 là metapage, ghi trang nào đang là gốc và cây có mấy tầng. Tầng 0 là lá: mỗi mục là một khóa kèm TID trỏ về dòng trong heap. Trang trong (từ tầng 1 trở lên) chỉ giữ khóa phân cách và đường xuống trang con (downlink). Lá anh em nối với nhau bằng con trỏ trái/phải, nên quét một khoảng chỉ cần đi ngang.

Một lá `int` chứa vài trăm mục, nên 20.000 khóa vừa trong 2 tầng, và hàng trăm triệu dòng thường chỉ cần 3–4 tầng. Khi lá hết chỗ cho mục mới, Postgres tách nó: một phần mục sang trang mới, trang cha nhận thêm một downlink. Cha đầy thì tách tiếp; gốc đầy thì cây cao thêm một tầng.

Nhiều người nghĩ kích thước index chỉ phụ thuộc số dòng. Thật ra thứ tự chèn cũng quyết định. Khóa luôn tăng (id tự tăng, thời gian) đi vào lá phải nhất, và Postgres tách lệch để trang trái được đầy theo `fillfactor` (mặc định 90). Khóa lộn xộn (UUID ngẫu nhiên) rơi vào giữa cây và tách trang làm đôi, nên lá chỉ đầy khoảng một nửa tới hai phần ba.

Một lá đã tách không bao giờ được gộp lại. VACUUM chỉ đánh dấu trang rỗng hẳn là đã xóa để dùng lại; file không nhỏ đi. Muốn index gọn lại thì `REINDEX`, việc này dựng cây mới từ dữ liệu đã sắp.

## Cú pháp

```sql
SELECT * FROM bt_metap('index_name');
SELECT * FROM bt_page_stats('index_name', block_number);
SELECT * FROM bt_page_items('index_name', block_number);
CREATE INDEX index_name ON table_name (column) [ WITH ( fillfactor = 10..100 ) ];
REINDEX INDEX [ CONCURRENTLY ] index_name;
```

- `bt_metap`: trang gốc (`root`), số tầng trên lá (`level`).
- `block_number`: từ 1 tới số trang trừ 1; trang 0 là metapage.
- `bt_page_stats`: loại trang (`l` lá, `i` trong, `r` gốc, `d` đã xóa), số mục sống, byte trống, trang anh em.
- `fillfactor`: độ đầy của lá khi dựng index hoặc khi tách lá phải nhất; B-tree mặc định 90.

## Ví dụ

Metapage của index khóa lộn xộn:

```sql
SELECT root, level, fastroot, fastlevel FROM bt_metap('mixed_keys_idx');
```

Gốc ở trang 3, `level` = 1: một tầng trong (chính là gốc) trên tầng lá.

Thống kê lá đầu tiên của nó:

```sql
SELECT blkno, type, live_items, free_size, btpo_prev, btpo_next
FROM bt_page_stats('mixed_keys_idx', 1);
```

Lá 1 có 284 mục và còn 2468 byte trống; `btpo_prev` = 0 nghĩa là không có anh em bên trái, `btpo_next` chỉ trang lá kế tiếp.

Xem gốc tách khi cây lớn lên:

```sql
CREATE TABLE grow (k int PRIMARY KEY);
INSERT INTO grow SELECT g FROM generate_series(1, 300) AS g;
SELECT level, pg_relation_size('grow_pkey') / 8192 AS pages FROM bt_metap('grow_pkey');
```

```sql
INSERT INTO grow SELECT g FROM generate_series(301, 1000) AS g;
SELECT level, pg_relation_size('grow_pkey') / 8192 AS pages FROM bt_metap('grow_pkey');
```

300 khóa vừa một lá, và lá đó cũng là gốc (`level` 0, 2 trang gồm metapage). Thêm 700 khóa thì lá tách, một gốc mới xuất hiện ở tầng 1 và index có 5 trang.

## Lỗi hay gặp

Đọc trang 0 như một trang thường:

```sql
-- ERROR 22023: block 0 is a meta page
SELECT * FROM bt_page_stats('seq_keys_idx', 0);
```

Trang 0 chỉ đọc được bằng `bt_metap`. Duyệt trang bắt đầu từ 1.

Đưa tên bảng thay cho tên index:

```sql
-- ERROR 42809: "seq_keys" is not a btree index
SELECT * FROM bt_metap('seq_keys');
```

Các hàm `bt_*` chỉ nhận index B-tree. Tìm tên index trong `pg_indexes` trước.

Lấy số trang làm số lá:

```sql
-- WRONG: the file also holds the metapage and the root
SELECT pg_relation_size('seq_keys_idx') / 8192 AS leaves;
```

```sql
-- FIX: count only pages of type l
SELECT count(*) AS leaves
FROM generate_series(1, (pg_relation_size('seq_keys_idx') / 8192 - 1)::int) AS b,
  bt_page_stats('seq_keys_idx', b) AS s
WHERE s.type = 'l';
```

Câu sai ra 57, câu đúng ra 55: file còn chứa metapage và gốc, ở cây lớn còn có trang trong và trang đã xóa.

Chờ VACUUM làm index nhỏ lại:

```sql
-- WRONG: VACUUM keeps the pages in the file
DELETE FROM grow WHERE k > 100;
VACUUM grow;
SELECT pg_relation_size('grow_pkey') / 8192 AS pages;
```

```sql
-- FIX: REINDEX builds a compact tree
REINDEX INDEX grow_pkey;
SELECT pg_relation_size('grow_pkey') / 8192 AS pages;
```

Sau VACUUM index vẫn 5 trang; sau `REINDEX` chỉ còn 2. Trên production dùng `REINDEX INDEX CONCURRENTLY` để không chặn ghi.

## Thực hành

Ba câu đọc trang thật của `seq_keys_idx` và `mixed_keys_idx`: metapage, thống kê mọi trang, rồi các mục của trang gốc. Sơ đồ B-tree cho bạn bấm từng bước một lần tách lá để so với số liệu, rồi hai câu hỏi.

## Tóm tắt

- Trang 0 là metapage; tầng 0 là lá, trang trong giữ khóa phân cách và downlink.
- Lá đầy thì tách, cha nhận downlink mới; gốc đầy thì cây cao thêm một tầng.
- Khóa tăng dần cho lá gần đầy theo `fillfactor`; khóa lộn xộn cho lá đầy một nửa tới hai phần ba.
- Đọc cây bằng `bt_metap`, `bt_page_stats`, `bt_page_items` của `pageinspect`.
- VACUUM không làm file index nhỏ lại; `REINDEX` thì có.

# EN

## Opening

Two tables receive the same 20,000 `int` keys, only in a different order, yet one index is almost a third larger than the other. This lesson opens real B-tree pages to see where the difference comes from.

## Key idea

A Postgres B-tree arranges its pages in levels. Page 0 is the metapage: it records which page is the root and how many levels the tree has. Level 0 is the leaf level: each item is a key with a TID pointing to the row in the heap. Internal pages (level 1 and up) only hold separator keys and links down to child pages (downlinks). Sibling leaves are linked left and right, so a range scan just walks sideways.

An `int` leaf holds a few hundred items, so 20,000 keys fit in 2 levels, and hundreds of millions of rows usually need only 3–4. When a leaf has no room for a new item, Postgres splits it: part of its items move to a new page and the parent gets one more downlink. A full parent splits in turn; a full root makes the tree one level taller.

Many people think the size of an index depends only on the number of rows. In fact the insert order matters too. Always-increasing keys (serial ids, timestamps) go into the rightmost leaf, and Postgres splits unevenly so the left page stays at `fillfactor` (90 by default). Scattered keys (random UUIDs) land in the middle of the tree and split pages in two, so leaves end up only half to two-thirds full.

A split leaf is never merged back. VACUUM only marks fully empty pages as deleted so they can be reused; the file does not shrink. To compact an index, run `REINDEX`, which builds a new tree from sorted data.

## Syntax

```sql
SELECT * FROM bt_metap('index_name');
SELECT * FROM bt_page_stats('index_name', block_number);
SELECT * FROM bt_page_items('index_name', block_number);
CREATE INDEX index_name ON table_name (column) [ WITH ( fillfactor = 10..100 ) ];
REINDEX INDEX [ CONCURRENTLY ] index_name;
```

- `bt_metap`: the root page (`root`) and the number of levels above the leaves (`level`).
- `block_number`: from 1 to the page count minus 1; page 0 is the metapage.
- `bt_page_stats`: page type (`l` leaf, `i` internal, `r` root, `d` deleted), live items, free bytes, sibling pages.
- `fillfactor`: how full leaves are packed at build time or when the rightmost leaf splits; 90 by default for B-tree.

## Example

The metapage of the scattered-key index:

```sql
SELECT root, level, fastroot, fastlevel FROM bt_metap('mixed_keys_idx');
```

The root is page 3 and `level` = 1: one internal level (the root itself) above the leaf level.

Statistics of its first leaf:

```sql
SELECT blkno, type, live_items, free_size, btpo_prev, btpo_next
FROM bt_page_stats('mixed_keys_idx', 1);
```

Leaf 1 holds 284 items and has 2468 free bytes; `btpo_prev` = 0 means it has no left sibling, and `btpo_next` names the next leaf page.

Watch the root split as the tree grows:

```sql
CREATE TABLE grow (k int PRIMARY KEY);
INSERT INTO grow SELECT g FROM generate_series(1, 300) AS g;
SELECT level, pg_relation_size('grow_pkey') / 8192 AS pages FROM bt_metap('grow_pkey');
```

```sql
INSERT INTO grow SELECT g FROM generate_series(301, 1000) AS g;
SELECT level, pg_relation_size('grow_pkey') / 8192 AS pages FROM bt_metap('grow_pkey');
```

300 keys fit in one leaf, and that leaf is also the root (`level` 0, 2 pages with the metapage). After 700 more keys the leaf splits, a new root appears at level 1 and the index has 5 pages.

## Common mistakes

Reading page 0 as an ordinary page:

```sql
-- ERROR 22023: block 0 is a meta page
SELECT * FROM bt_page_stats('seq_keys_idx', 0);
```

Page 0 can only be read with `bt_metap`. Walk the pages starting at 1.

Passing a table name instead of an index name:

```sql
-- ERROR 42809: "seq_keys" is not a btree index
SELECT * FROM bt_metap('seq_keys');
```

The `bt_*` functions only take B-tree indexes. Look the index name up in `pg_indexes` first.

Taking the page count as the leaf count:

```sql
-- WRONG: the file also holds the metapage and the root
SELECT pg_relation_size('seq_keys_idx') / 8192 AS leaves;
```

```sql
-- FIX: count only pages of type l
SELECT count(*) AS leaves
FROM generate_series(1, (pg_relation_size('seq_keys_idx') / 8192 - 1)::int) AS b,
  bt_page_stats('seq_keys_idx', b) AS s
WHERE s.type = 'l';
```

The wrong query says 57, the right one 55: the file also holds the metapage and the root, and a bigger tree also has internal and deleted pages.

Waiting for VACUUM to shrink the index:

```sql
-- WRONG: VACUUM keeps the pages in the file
DELETE FROM grow WHERE k > 100;
VACUUM grow;
SELECT pg_relation_size('grow_pkey') / 8192 AS pages;
```

```sql
-- FIX: REINDEX builds a compact tree
REINDEX INDEX grow_pkey;
SELECT pg_relation_size('grow_pkey') / 8192 AS pages;
```

After VACUUM the index is still 5 pages; after `REINDEX` it is 2. In production use `REINDEX INDEX CONCURRENTLY` so writes are not blocked.

## Practice

Three queries read real pages of `seq_keys_idx` and `mixed_keys_idx`: the metapage, statistics of every page, then the items of the root page. The B-tree diagram lets you step through a leaf split to compare with the figures, then two questions.

## Recap

- Page 0 is the metapage; level 0 holds the leaves, internal pages hold separator keys and downlinks.
- A full leaf splits and its parent gets a new downlink; a full root makes the tree one level taller.
- Ascending keys leave leaves nearly full at `fillfactor`; scattered keys leave them half to two-thirds full.
- Read the tree with `bt_metap`, `bt_page_stats` and `bt_page_items` from `pageinspect`.
- VACUUM does not shrink an index file; `REINDEX` does.
