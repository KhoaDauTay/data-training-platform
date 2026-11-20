---
id: e-bp-p30
engine: best
track: postgres
level: L3
module: p
title: "Nâng work_mem cho một câu nặng bằng SET LOCAL"
title_en: "Raise work_mem per query with SET LOCAL, not globally"
kind: quiz
minutes: 3
objectives:
  - vi: "Nâng `work_mem` cho một báo cáo nặng bằng `SET LOCAL` trong transaction của nó, giữ mặc định toàn cục nhỏ."
    en: "Raise `work_mem` for one heavy report with `SET LOCAL` inside its transaction, keeping the global default small."
avoid:
  vi: "Máy hết RAM vì `work_mem` toàn cục lớn bị nhân với mọi nút sort, hash và mọi phiên."
  en: "A server running out of memory because a large global `work_mem` is multiplied by every sort and hash node and every session."
requires: [e-pg-l5-12]
skills: []
adv: [a10]
sources:
  - https://www.postgresql.org/docs/18/runtime-config-resource.html#GUC-WORK-MEM
  - https://www.postgresql.org/docs/18/sql-set.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    ALTER SYSTEM SET work_mem = '64MB';
  good: |
    BEGIN;
    SET LOCAL work_mem = '64MB';
    SELECT k, count(*) AS n FROM big GROUP BY k;
    COMMIT;
  expect: null
quiz:
  - q:
      vi: "`work_mem` = 64 MB. Một câu có 3 nút sort, chạy cùng lúc ở 50 phiên. Trần bộ nhớ cho các nút đó vào khoảng bao nhiêu?"
      en: "`work_mem` = 64 MB. A query has 3 sort nodes and runs in 50 sessions at once. Roughly what is the memory ceiling for those nodes?"
    options:
      - { vi: "64 MB", en: "64 MB" }
      - { vi: "Khoảng 9,4 GB (64 MB × 3 × 50)", en: "About 9.4 GB (64 MB × 3 × 50)" }
      - { vi: "64 MB mỗi phiên", en: "64 MB per session" }
    answer: 1
    why:
      vi: "`work_mem` là trần cho từng nút sort (nút hash được gấp `hash_mem_multiplier` lần), không phải cho cả câu hay cả máy. Nâng toàn cục thì nhân lên theo số nút và số phiên. `SET LOCAL` chỉ nâng cho đúng transaction cần."
      en: "`work_mem` caps each sort node (a hash node gets `hash_mem_multiplier` times that), not a whole query or the whole server. Raising it globally multiplies by nodes and sessions. `SET LOCAL` raises it only for the transaction that needs it."
---

## Ý chính

Báo cáo nặng (gom nhóm, sort lớn) chạy `SET LOCAL work_mem = '64MB'` trong transaction của nó. Giữ mặc định toàn cục nhỏ.

## Vì sao

- `work_mem` (mặc định 4 MB) là trần **cho từng** nút sort, và nút hash được gấp `hash_mem_multiplier` lần (mặc định 2); docs chính thức nhắc một câu có thể có "several sort and hash operations" cùng lúc, nhân thêm với số phiên.
- Nâng toàn cục có thể làm hết RAM.
- Nâng cho một câu thì đổi được kế hoạch thực thi: hash trong bộ nhớ thay vì sort.
- Lệnh `SET LOCAL` và câu báo cáo là hai câu riêng, nên thẻ này chỉ có cú pháp.

## Ví dụ

Trên PGlite (PostgreSQL 18.6), câu gom 200.000 khóa khác nhau: với 4 MB, `EXPLAIN` cho `GroupAggregate` trên `Sort`; sau `SET LOCAL work_mem = '64MB'`, cho `HashAggregate`. Sau `COMMIT`, `work_mem` về lại 4 MB.

# EN

## Key idea

A heavy report (grouping, a large sort) runs `SET LOCAL work_mem = '64MB'` inside its own transaction. Keep the global default small.

## Why

- `work_mem` (4 MB by default) caps **each** sort node, and a hash node gets `hash_mem_multiplier` times that (2 by default); the official docs warn a query may run "several sort and hash operations" at once, multiplied again by the number of sessions.
- Raising it globally can exhaust RAM.
- Raising it for one query can change the execution plan: an in-memory hash instead of a sort.
- `SET LOCAL` and the report query are two separate statements, so this card is syntax only.

## Example

On PGlite (PostgreSQL 18.6), a query grouping 200,000 distinct keys: at 4 MB, `EXPLAIN` shows `GroupAggregate` over a `Sort`; after `SET LOCAL work_mem = '64MB'`, it shows `HashAggregate`. After `COMMIT`, `work_mem` is back to 4 MB.
