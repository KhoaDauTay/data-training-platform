---
id: e-bp-p05
engine: best
track: postgres
level: L3
module: p
title: "Tạo index trên bảng đang chạy: CONCURRENTLY"
title_en: "Build indexes on a live table CONCURRENTLY"
kind: quiz
minutes: 3
objectives:
  - vi: "Trên bảng đang phục vụ, dùng `CREATE INDEX CONCURRENTLY` (và `DROP INDEX CONCURRENTLY`), chạy ngoài transaction."
    en: "On a table in service, use `CREATE INDEX CONCURRENTLY` (and `DROP INDEX CONCURRENTLY`), run outside a transaction."
avoid:
  vi: "Ứng dụng đứng mọi lệnh ghi vào bảng suốt lúc dựng index."
  en: "An application whose writes to the table all stall while the index is being built."
requires: [e-pg-l2-14, e-pg-l4-09]
skills: [index_design]
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY
  - https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-TABLES
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine-hb
  check: runs
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, channel text NOT NULL);
    INSERT INTO orders SELECT i, CASE WHEN i % 3 = 0 THEN 'ONLINE' ELSE 'STORE' END FROM generate_series(1, 20000) AS i;
  bad: |
    CREATE INDEX orders_channel_ix ON orders (channel)
  good: |
    CREATE INDEX CONCURRENTLY orders_channel_cc_ix ON orders (channel)
  expect: null
quiz:
  - q:
      vi: "Công cụ migration bọc mọi lệnh trong `BEGIN … COMMIT`. Bạn đặt `CREATE INDEX CONCURRENTLY` vào đó. Chuyện gì xảy ra?"
      en: "Your migration tool wraps every statement in `BEGIN … COMMIT`. You put `CREATE INDEX CONCURRENTLY` inside. What happens?"
    options:
      - { vi: "Index được dựng bình thường", en: "The index is built as usual" }
      - { vi: "Báo lỗi `25001`: lệnh này không chạy được trong transaction block", en: "Error `25001`: this command cannot run inside a transaction block" }
      - { vi: "Postgres âm thầm bỏ chữ `CONCURRENTLY`", en: "Postgres silently drops the word `CONCURRENTLY`" }
    answer: 1
    why:
      vi: "Dựng index song song với các lệnh ghi cần nhiều transaction riêng, nên lệnh phải chạy một mình, ngoài transaction. Phải tắt transaction của migration cho đúng bước đó."
      en: "Building alongside writes needs several transactions of its own, so the command must run alone, outside a transaction. Turn off the migration's transaction for that one step."
---

## Ý chính

Trên bảng đang phục vụ, dùng `CREATE INDEX CONCURRENTLY`, `DROP INDEX CONCURRENTLY`, `REINDEX … CONCURRENTLY`. Lệnh này chạy riêng, ngoài transaction block.

## Vì sao

- `CREATE INDEX` thường giữ lock `SHARE` suốt lúc dựng: mọi `INSERT`, `UPDATE`, `DELETE` vào bảng phải chờ.
- `CONCURRENTLY` cho phép ghi tiếp trong lúc dựng, đổi lại tốn thời gian hơn và đọc bảng hai lần.
- Nếu thất bại, nó để lại index `INVALID`: xóa rồi làm lại.
- PGlite chỉ có một phiên, nên thẻ này không cho thấy cảnh chờ lock; cả hai bản đều dựng xong index.

# EN

## Key idea

On a table in service, use `CREATE INDEX CONCURRENTLY`, `DROP INDEX CONCURRENTLY`, `REINDEX … CONCURRENTLY`. It runs on its own, outside a transaction block.

## Why

- A plain `CREATE INDEX` holds a `SHARE` lock for the whole build: every `INSERT`, `UPDATE` and `DELETE` on the table waits.
- `CONCURRENTLY` lets writes go on during the build, at the price of a longer build that reads the table twice.
- If it fails, it leaves an `INVALID` index behind: drop it and try again.
- PGlite has a single session, so this card cannot show the lock wait; both versions finish building their index.
