---
id: e-bp-i09
engine: best
track: postgres
level: L3
module: i
title: "Đừng giữ index thừa: tìm index trùng và index không dùng"
title_en: "Remove duplicate and unused indexes"
kind: quiz
minutes: 4
objectives:
  - vi: "Tìm index có cột là tiền tố của một index khác trên cùng bảng, và index có `idx_scan = 0` sau một chu kỳ tải đủ dài."
    en: "Find indexes whose columns are a prefix of another index on the same table, and indexes with `idx_scan = 0` after a long enough load cycle."
avoid:
  vi: "Mỗi lần ghi phải cập nhật một index mà không truy vấn nào cần."
  en: "Every write updating an index that no query needs."
requires: [e-pg-l5-11]
skills: [index_design]
adv: []
sources:
  - https://www.postgresql.org/docs/18/indexes-examine.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
  - https://www.postgresql.org/docs/18/catalog-pg-index.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, store_id int NOT NULL, order_date date NOT NULL);
    INSERT INTO orders SELECT i, i % 20, DATE '2025-01-01' + i % 670 FROM generate_series(1, 20000) AS i;
    CREATE INDEX orders_store_ix ON orders (store_id);
    CREATE INDEX orders_store_date_ix ON orders (store_id, order_date);
    ANALYZE orders;
  bad: |
    SELECT count(*) AS indexes
    FROM pg_indexes
    WHERE tablename = 'orders'
  good: |
    SELECT a.indexrelid::regclass AS redundant_index,
           b.indexrelid::regclass AS covered_by,
           pg_relation_size(a.indexrelid) AS bytes
    FROM pg_index AS a
    JOIN pg_index AS b ON b.indrelid = a.indrelid AND b.indexrelid <> a.indexrelid
    WHERE a.indrelid = 'orders'::regclass
      AND NOT a.indisunique
      AND b.indkey::text LIKE a.indkey::text || ' %'
    ORDER BY bytes DESC
  expect: null
quiz:
  - q:
      vi: "Bảng có index `(store_id)` và `(store_id, order_date)`. Câu `WHERE store_id = 3` cần index nào?"
      en: "A table has indexes on `(store_id)` and on `(store_id, order_date)`. Which one does `WHERE store_id = 3` need?"
    options:
      - { vi: "Bắt buộc phải có `(store_id)`", en: "It must have `(store_id)`" }
      - { vi: "`(store_id, order_date)` đã phục vụ được, nên `(store_id)` thường là thừa", en: "`(store_id, order_date)` already serves it, so `(store_id)` is usually redundant" }
      - { vi: "Không index nào dùng được", en: "Neither index can be used" }
    answer: 1
    why:
      vi: "Index nhiều cột dùng được cho điều kiện trên cột đầu của nó. Index chỉ có cột đầu đó là bản sao nhỏ hơn, vẫn tốn ở mỗi lần ghi. Kiểm `idx_scan` trước khi xóa."
      en: "A multicolumn index can serve conditions on its leading column. An index on just that column is a smaller copy that still costs every write. Check `idx_scan` before dropping it."
---

## Ý chính

Định kỳ tìm index thừa:

- index có cột là tiền tố của index khác trên cùng bảng (`(a)` khi đã có `(a, b)`);
- index có `idx_scan = 0` trong `pg_stat_user_indexes` sau một chu kỳ tải đủ dài.

Xóa bằng `DROP INDEX CONCURRENTLY`.

## Vì sao

- Mỗi index làm chậm mọi `INSERT` và `UPDATE`, và chiếm bộ nhớ đệm.
- Index trên cột bị sửa còn chặn HOT update.
- Đếm số index không nói index nào thừa; phải đọc catalog `pg_index` và số `idx_scan`.
- `idx_scan` chỉ có nghĩa với tải thật: trên database vừa dựng của thẻ này, mọi index đều có `idx_scan` = 0.

# EN

## Key idea

Look for unneeded indexes regularly:

- an index whose columns are a prefix of another index on the same table (`(a)` when `(a, b)` exists);
- an index with `idx_scan = 0` in `pg_stat_user_indexes` after a long enough load cycle.

Drop them with `DROP INDEX CONCURRENTLY`.

## Why

- Every index slows every `INSERT` and `UPDATE`, and takes cache memory.
- An index on a column that gets updated also blocks HOT updates.
- Counting indexes says nothing about which are redundant; read the `pg_index` catalog and the `idx_scan` numbers.
- `idx_scan` only means something under real load: on this card's freshly built database, every index shows `idx_scan` = 0.
