---
id: e-bp-s08
engine: best
track: postgres
level: L1
module: s
title: "Tên snake_case chữ thường, không nháy kép"
title_en: "Lower-case snake_case names, no double quotes"
kind: quiz
minutes: 2
objectives:
  - vi: "Đặt tên bảng và cột chữ thường, `snake_case`, để không bao giờ phải nháy kép; tên đẹp cho báo cáo đặt bằng alias."
    en: "Name tables and columns in lower-case `snake_case` so they never need double quotes; give report-friendly names with aliases."
avoid:
  vi: "Lỗi \"không tồn tại\" mỗi khi ai đó quên nháy kép đúng hoa thường."
  en: "\"Does not exist\" errors every time someone forgets the exact quoted case."
requires: [e-pg-l1-02]
skills: [select]
adv: []
sources:
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_upper_case_table_or_column_names
  - https://www.postgresql.org/docs/18/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: error
  setup: |
    CREATE TABLE "SalesDaily" ("SaleDay" date NOT NULL, "Revenue" bigint NOT NULL);
    CREATE TABLE sales_daily (sale_day date NOT NULL, revenue bigint NOT NULL);
    INSERT INTO "SalesDaily" VALUES ('2026-10-30', 1200000), ('2026-10-31', 950000);
    INSERT INTO sales_daily VALUES ('2026-10-30', 1200000), ('2026-10-31', 950000);
  bad: |
    SELECT SaleDay, Revenue FROM SalesDaily
  good: |
    SELECT sale_day, revenue AS "Revenue" FROM sales_daily
  expect: { code: "42P01" }
quiz:
  - q:
      vi: "Bảng được tạo bằng `CREATE TABLE \"SalesDaily\" (…)`. Câu `SELECT * FROM SalesDaily` làm gì?"
      en: "A table was created with `CREATE TABLE \"SalesDaily\" (…)`. What does `SELECT * FROM SalesDaily` do?"
    options:
      - { vi: "Đọc bảng bình thường", en: "Reads the table as usual" }
      - { vi: "Báo lỗi `42P01`: Postgres tìm bảng `salesdaily`", en: "Fails with `42P01`: Postgres looks for a table named `salesdaily`" }
      - { vi: "Đọc một bảng rỗng", en: "Reads an empty table" }
    answer: 1
    why:
      vi: "Postgres hạ chữ thường mọi tên không nháy, nên `SalesDaily` thành `salesdaily`, khác `\"SalesDaily\"`. Đặt tên `sales_daily` ngay từ đầu thì không ai phải nháy."
      en: "Postgres folds every unquoted name to lower case, so `SalesDaily` becomes `salesdaily`, which is not `\"SalesDaily\"`. Name it `sales_daily` from the start and nobody needs quotes."
---

## Ý chính

Tên bảng và cột viết chữ thường, `snake_case`, không cần nháy kép. Tên đẹp cho báo cáo thì đặt bằng alias: `revenue AS "Revenue"`.

## Vì sao

- Postgres hạ chữ thường mọi tên không nháy.
- Tạo bằng `"SalesDaily"` thì mọi truy vấn về sau phải nháy đúng hoa thường; quên là lỗi `42P01` (bảng) hoặc `42703` (cột).
- Công cụ, ORM và đồng nghiệp đều phải nhớ quy tắc đó.

## Ví dụ

`SELECT SaleDay, Revenue FROM SalesDaily` báo `relation "salesdaily" does not exist`. Bảng `sales_daily` đọc được mà không cần nháy, và alias vẫn cho cột tên `Revenue`.

# EN

## Key idea

Name tables and columns in lower-case `snake_case` that never needs double quotes. For report-friendly names use an alias: `revenue AS "Revenue"`.

## Why

- Postgres folds every unquoted name to lower case.
- Create it as `"SalesDaily"` and every query after that must quote the exact case; forgetting gives error `42P01` (table) or `42703` (column).
- Tools, ORMs and colleagues all have to remember that rule.

## Example

`SELECT SaleDay, Revenue FROM SalesDaily` fails with `relation "salesdaily" does not exist`. Table `sales_daily` reads without quotes, and the alias still names the column `Revenue`.
