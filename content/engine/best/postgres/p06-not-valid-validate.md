---
id: e-bp-p06
engine: best
track: postgres
level: L4
module: p
title: "Thêm ràng buộc trên bảng lớn: NOT VALID rồi VALIDATE"
title_en: "Add constraints NOT VALID, then VALIDATE"
kind: quiz
minutes: 4
objectives:
  - vi: "Thêm `CHECK` hay `FOREIGN KEY` vào bảng lớn theo hai bước: `ADD CONSTRAINT … NOT VALID`, rồi `VALIDATE CONSTRAINT`."
    en: "Add a `CHECK` or `FOREIGN KEY` to a large table in two steps: `ADD CONSTRAINT … NOT VALID`, then `VALIDATE CONSTRAINT`."
avoid:
  vi: "Bảng bị chặn cả đọc lẫn ghi trong lúc Postgres quét toàn bộ dòng cũ để kiểm ràng buộc mới."
  en: "A table blocked for reads and writes while Postgres scans every old row to check a new constraint."
requires: [e-pg-l1-04, e-pg-l4-09]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-TABLES
  - https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-LOCK-TIMEOUT
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    ALTER TABLE order_items ADD CONSTRAINT qty_positive CHECK (qty > 0);
  good: |
    BEGIN;
    SET LOCAL lock_timeout = '3s';
    ALTER TABLE order_items ADD CONSTRAINT qty_positive CHECK (qty > 0) NOT VALID;
    COMMIT;
    BEGIN;
    SET LOCAL lock_timeout = '3s';
    ALTER TABLE order_items VALIDATE CONSTRAINT qty_positive;
    COMMIT;
  expect: null
quiz:
  - q:
      vi: "Ngay sau `ADD CONSTRAINT qty_positive CHECK (qty > 0) NOT VALID`, một lệnh chèn dòng có `qty` = 0. Chuyện gì xảy ra?"
      en: "Right after `ADD CONSTRAINT qty_positive CHECK (qty > 0) NOT VALID`, an insert brings a row with `qty` = 0. What happens?"
    options:
      - { vi: "Được nhận, vì ràng buộc chưa được kiểm", en: "It is accepted, because the constraint is not validated yet" }
      - { vi: "Bị từ chối với lỗi `23514`: `NOT VALID` chỉ bỏ qua dòng cũ", en: "It is refused with error `23514`: `NOT VALID` only skips the old rows" }
      - { vi: "Được nhận nhưng có cảnh báo", en: "It is accepted with a warning" }
    answer: 1
    why:
      vi: "`NOT VALID` áp ràng buộc ngay cho mọi dòng mới hay dòng được sửa; nó chỉ hoãn việc quét dòng cũ. `VALIDATE CONSTRAINT` quét sau đó với lock nhẹ hơn."
      en: "`NOT VALID` enforces the constraint at once on every new or updated row; it only postpones scanning the old rows. `VALIDATE CONSTRAINT` scans them afterwards under a lighter lock."
---

## Ý chính

Thêm `CHECK` hay `FOREIGN KEY` vào bảng lớn theo hai bước: `ADD CONSTRAINT … NOT VALID` (nhanh, áp ngay cho dòng mới), rồi `VALIDATE CONSTRAINT` (quét dòng cũ). Mỗi bước đặt `lock_timeout` ngắn.

## Vì sao

- `ADD CONSTRAINT` thường quét cả bảng trong lúc giữ lock mạnh.
- `VALIDATE CONSTRAINT` quét với lock nhẹ hơn, nên đọc và ghi bình thường vẫn chạy tiếp.
- Còn dòng cũ vi phạm thì `VALIDATE` báo `23514`; sửa dữ liệu rồi chạy lại.

## Ví dụ

Chạy cả hai bản trên PGlite (PostgreSQL 18.6), đọc `pg_locks` trong từng transaction: `ADD CONSTRAINT` thường giữ `AccessExclusiveLock`; `VALIDATE CONSTRAINT` chỉ giữ `ShareUpdateExclusiveLock`.

# EN

## Key idea

Add a `CHECK` or `FOREIGN KEY` to a large table in two steps: `ADD CONSTRAINT … NOT VALID` (fast, enforced on new rows at once), then `VALIDATE CONSTRAINT` (scans the old rows). Each step sets a short `lock_timeout`.

## Why

- A plain `ADD CONSTRAINT` scans the whole table while holding a strong lock.
- `VALIDATE CONSTRAINT` scans under a lighter lock, so normal reads and writes keep going.
- If old rows still break the rule, `VALIDATE` fails with `23514`; fix the data and run it again.

## Example

Running both versions on PGlite (PostgreSQL 18.6) and reading `pg_locks` inside each transaction: the plain `ADD CONSTRAINT` holds `AccessExclusiveLock`; `VALIDATE CONSTRAINT` holds only `ShareUpdateExclusiveLock`.
