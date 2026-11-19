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
    - task: { vi: "So hai index cùng 20.000 khóa: với mỗi index và mỗi loại trang (`type`: l = lá, r = gốc), đếm số trang, số mục sống trung bình và số byte trống trung bình (làm tròn). Duyệt mọi trang từ 1 tới trang cuối bằng `generate_series` + `bt_page_stats`. Sắp theo tên index rồi loại trang.", en: "Compare two indexes holding the same 20,000 keys: for each index and each page `type` (l = leaf, r = root), count pages, average live items and average free bytes (rounded). Walk every page from 1 to the last with `generate_series` + `bt_page_stats`. Order by index name, then page type." }
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
    why: { vi: "Trên dữ liệu thật: lá của `seq_keys_idx` trống trung bình 856 byte (~365 mục), lá của `mixed_keys_idx` trống 2649 byte (~275 mục). Index nhiều trang hơn thì nhiều I/O hơn cho cùng một lần quét; `REINDEX` xây lại từ dữ liệu đã sắp và nén lại.", en: "On the real data: `seq_keys_idx` leaves average 856 free bytes (~365 items), `mixed_keys_idx` leaves 2649 (~275 items). More pages means more I/O for the same scan; `REINDEX` rebuilds from sorted data and packs it again." }
---

## Ý chính

- B-tree của Postgres có metapage ở trang 0, một gốc, các tầng trong và tầng lá (tầng 0). Lá chứa khóa + TID trỏ về heap; trang trong chứa khóa phân cách + đường xuống trang con (downlink).
- Với khóa `int`, mỗi lá chứa vài trăm mục, nên 20.000 khóa chỉ cần 2 tầng (gốc + lá). Hàng trăm triệu dòng thường chỉ 3–4 tầng.
- Page split: lá không còn chỗ cho mục mới thì một phần mục sang trang mới và cha nhận thêm một downlink; cha đầy thì tách tiếp; gốc đầy thì cây cao thêm một tầng.
- Chèn khóa luôn tăng (id tự tăng, thời gian) đi vào lá phải nhất, và Postgres tách lệch để trang trái được đầy theo `fillfactor` (mặc định 90). Chèn lộn xộn (UUID ngẫu nhiên) tách giữa trang, nên index to hơn.

## Ví dụ

Kết quả thật trên PGlite (cùng 20.000 khóa `int`):

```text
bt_metap('seq_keys_idx'):  root 3, level 1

relname         type pages avg_items avg_free
mixed_keys_idx  l    73    275       2649
mixed_keys_idx  r    1     73        6696
seq_keys_idx    l    55    365       856
seq_keys_idx    r    1     55        7056
```

Gốc của `seq_keys_idx` có 55 mục, mỗi mục là một downlink xuống một lá.

## Thực hành

`bt_metap`, `bt_page_stats`, `bt_page_items` thuộc `pageinspect`. Chúng đọc trang thật, không phải mô phỏng.

Ba câu đọc trang thật. Sơ đồ B-tree cho bạn bấm từng bước một lần tách lá rồi so với số liệu trên. Kỹ năng chuyên gia: nhìn số trang và độ đầy của lá để biết index có phình vì kiểu chèn hay không, và khi nào đáng `REINDEX`.

# EN

## Key idea

- A B-tree has a metapage at page 0, a root, internal levels and the leaf level (level 0). Leaves hold keys + TIDs pointing into the heap; internal pages hold separator keys + downlinks to child pages.
- With `int` keys a leaf holds a few hundred items, so 20,000 keys need only 2 levels (root + leaves). Hundreds of millions of rows take 3–4 levels.
- Page split: when a leaf has no room for a new item, part of its items move to a new page and the parent gets one more downlink; a full parent splits in turn; a full root makes the tree one level taller.
- Always-increasing keys (serial ids, timestamps) go into the rightmost leaf, and Postgres splits unevenly so the left page stays at `fillfactor` (90 by default). Scattered inserts (random UUIDs) split pages in the middle, so the index is larger.

## Example

Real output from PGlite (the same 20,000 `int` keys):

```text
bt_metap('seq_keys_idx'):  root 3, level 1

relname         type pages avg_items avg_free
mixed_keys_idx  l    73    275       2649
mixed_keys_idx  r    1     73        6696
seq_keys_idx    l    55    365       856
seq_keys_idx    r    1     55        7056
```

The root of `seq_keys_idx` has 55 items, one downlink per leaf.

## Practice

`bt_metap`, `bt_page_stats` and `bt_page_items` come from `pageinspect`. They read real pages, not a simulation.

Three queries that read real pages. The B-tree diagram lets you step through a leaf split and compare it with the figures above. Expert skill: look at page counts and leaf fill to tell whether an index is bloated by its insert pattern, and when a `REINDEX` is worth it.
