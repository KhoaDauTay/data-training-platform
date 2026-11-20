---
id: e-bp-s07
engine: best
track: postgres
level: L2
module: s
title: "UNIQUE NULLS NOT DISTINCT khi NULL cũng phải duy nhất"
title_en: "NULLS NOT DISTINCT when NULL must be unique too"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `UNIQUE NULLS NOT DISTINCT` khi nghiệp vụ coi NULL là một giá trị phải duy nhất (từ PostgreSQL 15)."
    en: "Use `UNIQUE NULLS NOT DISTINCT` when the business treats NULL as one value that must be unique (from PostgreSQL 15 on)."
avoid:
  vi: "Một lần nạp \"chạy lại cho an toàn\" chèn thêm dòng trùng mỗi lần, vì hai NULL không bị coi là trùng."
  en: "A load that is \"safe to rerun\" adds another duplicate row every time, because two NULLs never count as equal."
requires: [e-pg-l1-04, e-pg-l1-05]
skills: [null_logic]
adv: []
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
  - https://www.postgresql.org/docs/18/sql-createtable.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE pref_plain (customer_id int, kind text NOT NULL, UNIQUE (customer_id, kind));
    CREATE TABLE pref_nnd (customer_id int, kind text NOT NULL, UNIQUE NULLS NOT DISTINCT (customer_id, kind));
    INSERT INTO pref_plain VALUES (7, 'default'), (NULL, 'default') ON CONFLICT DO NOTHING;
    INSERT INTO pref_plain VALUES (7, 'default'), (NULL, 'default') ON CONFLICT DO NOTHING;
    INSERT INTO pref_nnd VALUES (7, 'default'), (NULL, 'default') ON CONFLICT DO NOTHING;
    INSERT INTO pref_nnd VALUES (7, 'default'), (NULL, 'default') ON CONFLICT DO NOTHING;
  bad: |
    SELECT count(*) AS default_rows
    FROM pref_plain
    WHERE kind = 'default'
  good: |
    SELECT count(*) AS default_rows
    FROM pref_nnd
    WHERE kind = 'default'
  expect: null
quiz:
  - q:
      vi: "Bảng có `UNIQUE (customer_id, kind)`. Chèn `(NULL, 'default')` hai lần. Chuyện gì xảy ra?"
      en: "A table has `UNIQUE (customer_id, kind)`. You insert `(NULL, 'default')` twice. What happens?"
    options:
      - { vi: "Lần thứ hai báo trùng (`23505`)", en: "The second insert fails as a duplicate (`23505`)" }
      - { vi: "Cả hai dòng được ghi", en: "Both rows are written" }
      - { vi: "Lần thứ hai ghi đè lần thứ nhất", en: "The second overwrites the first" }
    answer: 1
    why:
      vi: "Mặc định hai NULL \"khác nhau\" với ràng buộc `UNIQUE`, nên không có gì trùng, và `ON CONFLICT DO NOTHING` cũng không bắt được. Với `NULLS NOT DISTINCT`, dòng thứ hai bị coi là trùng."
      en: "By default two NULLs are \"distinct\" for a `UNIQUE` constraint, so nothing conflicts, and `ON CONFLICT DO NOTHING` never fires. With `NULLS NOT DISTINCT`, the second row counts as a duplicate."
---

## Ý chính

Ràng buộc duy nhất trên cột có thể NULL, mà nghiệp vụ coi NULL là "một giá trị", thì viết `UNIQUE NULLS NOT DISTINCT`. Ví dụ: mỗi khách chỉ một thiết lập mặc định, kể cả khách vãng lai không có `customer_id`.

## Vì sao

- Mặc định `UNIQUE` coi hai NULL là khác nhau, nên nhận bao nhiêu dòng `(NULL, 'default')` cũng được.
- `ON CONFLICT DO NOTHING` chỉ bỏ qua dòng mà ràng buộc coi là trùng. Không có xung đột thì mỗi lần chạy lại thêm một dòng.
- Có từ PostgreSQL 15.

# EN

## Key idea

A unique constraint on a nullable column, where the business treats NULL as "one value", is written `UNIQUE NULLS NOT DISTINCT`. Example: each customer has one default setting, including walk-in customers with no `customer_id`.

## Why

- By default `UNIQUE` treats two NULLs as different, so it accepts any number of `(NULL, 'default')` rows.
- `ON CONFLICT DO NOTHING` only skips rows the constraint sees as duplicates. With no conflict, every rerun adds a row.
- Available from PostgreSQL 15.
