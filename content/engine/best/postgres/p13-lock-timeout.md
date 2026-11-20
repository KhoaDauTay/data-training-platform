---
id: e-bp-p13
engine: best
track: postgres
level: L4
module: p
title: "Biết lệnh DDL lấy lock gì, và luôn đặt lock_timeout"
title_en: "Know each DDL's lock, and always set lock_timeout"
kind: quiz
minutes: 4
objectives:
  - vi: "Tra lock mode của từng lệnh migration, và chạy lệnh lấy `ACCESS EXCLUSIVE` sau `SET LOCAL lock_timeout` ngắn, có thử lại."
    en: "Look up the lock mode of each migration statement, and run statements that take `ACCESS EXCLUSIVE` after a short `SET LOCAL lock_timeout`, with a retry."
avoid:
  vi: "Một `ALTER TABLE` chờ sau một truy vấn dài và làm đứng mọi truy vấn xếp sau nó."
  en: "An `ALTER TABLE` waiting behind a long query and stalling every query queued after it."
requires: [e-pg-l4-09]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-TABLES
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-LOCK-TIMEOUT
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    ALTER TABLE orders ADD COLUMN note text;
  good: |
    BEGIN;
    SET LOCAL lock_timeout = '2s';
    ALTER TABLE orders ADD COLUMN note text;
    COMMIT;
  expect: null
quiz:
  - q:
      vi: "Một báo cáo dài đang đọc `orders`. Bạn chạy `ALTER TABLE orders ADD COLUMN note text` không có `lock_timeout`. Các truy vấn `SELECT` đến sau đó thì sao?"
      en: "A long report is reading `orders`. You run `ALTER TABLE orders ADD COLUMN note text` with no `lock_timeout`. What happens to `SELECT` queries that arrive after it?"
    options:
      - { vi: "Chạy bình thường, `SELECT` không bao giờ phải chờ", en: "They run as usual, a `SELECT` never waits" }
      - { vi: "Xếp hàng sau `ALTER TABLE` đang chờ lock, nên bảng như bị đứng", en: "They queue behind the `ALTER TABLE` that is waiting for its lock, so the table looks frozen" }
      - { vi: "`ALTER TABLE` hủy báo cáo đang chạy", en: "The `ALTER TABLE` cancels the running report" }
    answer: 1
    why:
      vi: "`ACCESS EXCLUSIVE` xung đột với mọi lock mode, kể cả lock của `SELECT`. Lệnh đang chờ lock đó cũng chặn các lệnh đến sau. `lock_timeout` làm lệnh bỏ cuộc sau 2 giây thay vì chờ mãi."
      en: "`ACCESS EXCLUSIVE` conflicts with every lock mode, including the one a `SELECT` takes. A statement waiting for it also blocks the statements that come after. `lock_timeout` makes it give up after 2 seconds instead of waiting forever."
---

## Ý chính

Trước khi chạy migration (script đổi schema theo từng bước), tra lock mode của từng lệnh (docs, hoặc thử trong transaction rồi đọc `pg_locks`). Lệnh lấy `ACCESS EXCLUSIVE` (phần lớn `ALTER TABLE`) phải ngắn, chạy sau `SET LOCAL lock_timeout` vài giây, và có thử lại.

## Vì sao

- Lệnh DDL đang **chờ** lock cũng chặn mọi truy vấn xếp sau nó.
- Mặc định `lock_timeout` là 0, tức chờ mãi; một `ALTER TABLE` sau một truy vấn dài có thể làm đứng cả bảng.
- `SET LOCAL` chỉ có hiệu lực tới hết transaction, không đổi phiên.
- PGlite chỉ có một phiên, nên thẻ này không chạy được cảnh chờ lock.

## Ví dụ

Chạy bản Nên trên PGlite (PostgreSQL 18.6), đọc `pg_locks` trước `COMMIT`: `ALTER TABLE` giữ `AccessExclusiveLock` và `lock_timeout` là `2s`. Cùng cách đo, `CREATE INDEX` giữ `ShareLock`.

# EN

## Key idea

Before running a migration (a script that changes the schema step by step), look up each statement's lock mode (the docs, or try it in a transaction and read `pg_locks`). Statements that take `ACCESS EXCLUSIVE` (most `ALTER TABLE` forms) must be short, run after a `SET LOCAL lock_timeout` of a few seconds, and be retried.

## Why

- A DDL statement that is **waiting** for its lock also blocks every query queued behind it.
- `lock_timeout` defaults to 0, meaning wait forever; one `ALTER TABLE` behind a long query can freeze the whole table.
- `SET LOCAL` lasts until the end of the transaction and leaves the session unchanged.
- PGlite has a single session, so this card cannot run the lock wait.

## Example

Running the Do version on PGlite (PostgreSQL 18.6) and reading `pg_locks` before `COMMIT`: `ALTER TABLE` holds `AccessExclusiveLock` and `lock_timeout` is `2s`. Measured the same way, `CREATE INDEX` holds `ShareLock`.
