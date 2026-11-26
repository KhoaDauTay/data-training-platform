---
id: e-bp-p03
engine: best
track: postgres
level: L3
module: p
title: "Đừng tắt autovacuum; giữ transaction ngắn"
title_en: "Keep autovacuum on, keep transactions short"
kind: quiz
minutes: 3
objectives:
  - vi: "Giữ autovacuum bật, chỉnh ngưỡng riêng cho bảng ghi nhiều, và đặt `idle_in_transaction_session_timeout`."
    en: "Keep autovacuum on, tune per-table thresholds for write-heavy tables, and set `idle_in_transaction_session_timeout`."
avoid:
  vi: "Bảng và index phình mãi vì dead tuple không được dọn, hoặc vì một phiên bỏ quên transaction đang mở."
  en: "Tables and indexes that keep bloating because dead tuples are never cleaned, or because a session left a transaction open."
requires: [e-pg-l3-06, e-pg-l5-14]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/sql-createtable.html#SQL-CREATETABLE-STORAGE-PARAMETERS
  - https://www.postgresql.org/docs/18/runtime-config-client.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    ALTER TABLE orders SET (autovacuum_enabled = false);
  good: |
    ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05);
    SET idle_in_transaction_session_timeout = '60s';
  expect: null
quiz:
  - q:
      vi: "Bảng `orders` bị sửa liên tục và đang phình. Cách nào đúng?"
      en: "Table `orders` is updated all the time and keeps growing. What is the right move?"
    options:
      - { vi: "Tắt autovacuum cho bảng để nó khỏi tốn tài nguyên", en: "Turn autovacuum off for the table so it stops using resources" }
      - { vi: "Giữ autovacuum bật và hạ `autovacuum_vacuum_scale_factor` cho riêng bảng đó", en: "Keep autovacuum on and lower `autovacuum_vacuum_scale_factor` for that table only" }
      - { vi: "Chạy `VACUUM FULL` mỗi giờ", en: "Run `VACUUM FULL` every hour" }
    answer: 1
    why:
      vi: "Mỗi lần sửa để lại phiên bản dòng cũ (dead tuple); chỉ VACUUM dọn chúng để chỗ trống được dùng lại, nên tắt autovacuum làm bảng phình nhanh hơn. Hạ ngưỡng cho bảng ghi nhiều để autovacuum chạy sớm hơn. `VACUUM FULL` viết lại cả bảng và giữ lock chặn mọi truy cập."
      en: "Every update leaves an old row version (dead tuple); only VACUUM cleans them so their space can be reused, so turning autovacuum off makes the table grow faster. Lower the threshold on a write-heavy table so autovacuum runs sooner. `VACUUM FULL` rewrites the whole table and holds a lock that blocks all access."
---

## Ý chính

Không tắt autovacuum. Bảng ghi nhiều thì chỉnh ngưỡng riêng (`autovacuum_vacuum_scale_factor`…). Không để phiên "idle in transaction": đặt `idle_in_transaction_session_timeout` và theo dõi transaction mở lâu nhất.

## Vì sao

- MVCC để lại phiên bản dòng cũ (dead tuple); chỉ VACUUM dọn được để chỗ trống được dùng lại.
- Một transaction mở lâu giữ lại mọi dead tuple tạo sau khi nó bắt đầu, nên bảng và index phình.
- Không vacuum đủ còn dẫn tới nguy cơ wraparound của transaction ID.
- PGlite chỉ có một phiên và không có tiến trình autovacuum, nên thẻ này chỉ có cú pháp.

# EN

## Key idea

Do not turn autovacuum off. For write-heavy tables, tune per-table thresholds (`autovacuum_vacuum_scale_factor`…). Do not leave sessions "idle in transaction": set `idle_in_transaction_session_timeout` and watch the oldest open transaction.

## Why

- MVCC leaves old row versions behind (dead tuples); only VACUUM cleans them so the space can be reused.
- A long-open transaction keeps every dead tuple created after it started, so tables and indexes bloat.
- Not vacuuming enough also leads towards transaction ID wraparound.
- PGlite has a single session and no autovacuum process, so this card is syntax only.
