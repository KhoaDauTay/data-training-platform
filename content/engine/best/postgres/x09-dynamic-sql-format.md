---
id: e-bp-x09
engine: best
track: postgres
level: L2
module: x
title: "SQL động: format('%I') cho tên, USING hoặc %L cho giá trị"
title_en: "Dynamic SQL: %I for names, USING or %L for values"
kind: quiz
minutes: 3
objectives:
  - vi: "Dựng câu SQL từ chữ bằng `format('%I', …)` cho tên và `EXECUTE … USING` (hoặc `%L`) cho giá trị, không nối chuỗi."
    en: "Build SQL from text with `format('%I', …)` for names and `EXECUTE … USING` (or `%L`) for values, never by concatenation."
avoid:
  vi: "Một tên bảng do người dùng chọn biến thành hai câu lệnh, câu thứ hai xóa bảng."
  en: "A table name picked by a user that turns into two statements, the second one dropping a table."
requires: []
skills: [string_fn]
adv: []
sources:
  - https://www.postgresql.org/docs/18/plpgsql-statements.html#PLPGSQL-STATEMENTS-EXECUTING-DYN
  - https://www.postgresql.org/docs/18/functions-string.html#FUNCTIONS-STRING-FORMAT
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT 'SELECT count(*) FROM ' || 'orders; DROP TABLE orders' AS sql_text
  good: |
    SELECT format('SELECT count(*) FROM %I', 'orders; DROP TABLE orders') AS sql_text
  expect: null
quiz:
  - q:
      vi: "Một hàm dựng câu bằng `format('SELECT count(*) FROM %I', table_name)`. Người dùng gửi tên `orders; DROP TABLE orders`. Câu dựng ra là gì?"
      en: "A function builds a query with `format('SELECT count(*) FROM %I', table_name)`. A user sends the name `orders; DROP TABLE orders`. What query is built?"
    options:
      - { vi: "Hai câu: đếm `orders` rồi xóa `orders`", en: "Two statements: count `orders`, then drop `orders`" }
      - { vi: "Một câu đọc từ một bảng tên lạ trong nháy kép, sẽ báo bảng không tồn tại", en: "One query reading from an oddly named, double-quoted table, which will fail as not existing" }
      - { vi: "Báo lỗi ngay trong `format`", en: "An error inside `format` itself" }
    answer: 1
    why:
      vi: "`%I` đặt tên trong nháy kép khi cần, nên cả chuỗi chỉ là một tên bảng. Dấu `;` không còn tách câu."
      en: "`%I` double-quotes the name when needed, so the whole string is just one table name. The `;` no longer splits statements."
---

## Ý chính

Khi dựng câu SQL từ chữ (tên bảng người dùng chọn, bộ lọc của dashboard, script phân tích): tên đi qua `format('%I', …)` hoặc `quote_ident`, giá trị đi qua `EXECUTE … USING` (tốt nhất) hoặc `format('%L', …)`. Không bao giờ nối chuỗi `'…' || input`.

## Vì sao

- SQL injection không chỉ có ở ứng dụng; báo cáo động và script phân tích cũng dựng câu từ chữ.
- Nối chuỗi để dấu `;` trong chữ tách thành câu thứ hai.
- `%I` đặt tên trong nháy kép, `%L` đặt giá trị trong nháy đơn và nhân đôi nháy bên trong, nên chữ người dùng chỉ còn là dữ liệu.

# EN

## Key idea

When you build SQL from text (a table name a user picked, a dashboard filter, an analysis script): names go through `format('%I', …)` or `quote_ident`, values go through `EXECUTE … USING` (best) or `format('%L', …)`. Never concatenate `'…' || input`.

## Why

- SQL injection is not only an application problem; dynamic reports and analysis scripts build queries from text too.
- Concatenation lets a `;` inside the text start a second statement.
- `%I` double-quotes names, and `%L` single-quotes values and doubles any quotes inside, so the user's text stays data.
