---
id: e-bp-p08
engine: best
track: postgres
level: L3
module: p
title: "Sửa và xóa lớn theo lô"
title_en: "Batch large UPDATE and DELETE"
kind: quiz
minutes: 3
objectives:
  - vi: "Chia `UPDATE`/`DELETE` lớn thành lô theo khoảng khóa chính, mỗi lô một transaction, và bỏ qua dòng không cần đổi."
    en: "Split a large `UPDATE`/`DELETE` into batches by primary key range, one transaction per batch, and skip rows that need no change."
avoid:
  vi: "Một transaction khổng lồ giữ row lock lâu, sinh hàng loạt dead tuple, và mất trắng nếu bị hủy giữa chừng."
  en: "One huge transaction that holds row locks for long, creates a flood of dead tuples, and loses everything if cancelled halfway."
requires: [e-pg-l3-06]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/sql-update.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, status text NOT NULL);
    INSERT INTO orders SELECT i, CASE WHEN i % 4 = 0 THEN 'paid' ELSE 'PAID' END FROM generate_series(1, 10000) AS i;
  bad: |
    WITH changed AS (
      UPDATE orders SET status = upper(status)
      RETURNING id
    )
    SELECT count(*) AS rows_rewritten FROM changed
  good: |
    WITH changed AS (
      UPDATE orders SET status = upper(status)
      WHERE id >= 1 AND id < 1001 AND status <> upper(status)
      RETURNING id
    )
    SELECT count(*) AS rows_rewritten FROM changed
  expect: null
quiz:
  - q:
      vi: "`UPDATE orders SET status = upper(status)` trên bảng mà 3/4 dòng đã viết hoa. Postgres ghi lại bao nhiêu dòng?"
      en: "`UPDATE orders SET status = upper(status)` on a table where 3 out of 4 rows are already upper case. How many rows does Postgres rewrite?"
    options:
      - { vi: "Chỉ 1/4 số dòng, phần cần đổi", en: "Only a quarter of the rows, the ones that change" }
      - { vi: "Mọi dòng, kể cả dòng giá trị không đổi", en: "Every row, including rows whose value stays the same" }
      - { vi: "Không dòng nào, vì kết quả giống nhau", en: "None, because the result is the same" }
    answer: 1
    why:
      vi: "`UPDATE` ghi một phiên bản mới cho mọi dòng thỏa `WHERE`, dù giá trị không đổi. Mỗi phiên bản cũ thành dead tuple. Thêm `status <> upper(status)` thì chỉ ghi dòng cần đổi."
      en: "`UPDATE` writes a new version of every row that matches `WHERE`, even when the value does not change. Each old version becomes a dead tuple. Adding `status <> upper(status)` rewrites only the rows that need it."
---

## Ý chính

`UPDATE`/`DELETE` hàng triệu dòng thì chia lô theo khoảng khóa chính (vài nghìn dòng), mỗi lô một transaction, nghỉ giữa các lô. Thêm điều kiện bỏ qua dòng đã đúng. Dữ liệu theo kỳ thì xóa bằng `DROP`/`DETACH` partition.

## Vì sao

- Mỗi dòng được sửa là một phiên bản mới; phiên bản cũ thành dead tuple chờ VACUUM.
- Một transaction khổng lồ giữ row lock lâu, sinh WAL dồn dập và làm replica trễ.
- Hủy giữa chừng thì mất trắng; lô nhỏ thì làm tiếp từ lô sau.

# EN

## Key idea

An `UPDATE`/`DELETE` over millions of rows is split into batches by primary key range (a few thousand rows), one transaction per batch, with a pause between batches. Add a condition that skips rows already correct. Period-based data is removed with `DROP`/`DETACH` of a partition.

## Why

- Every updated row is a new version; the old version becomes a dead tuple waiting for VACUUM.
- One huge transaction holds row locks for long, produces WAL in bursts and makes replicas lag.
- Cancel it halfway and all the work is lost; with small batches you carry on from the next one.
