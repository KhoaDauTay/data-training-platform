---
id: e-pg-l1-02
engine: postgres
level: L1
module: types
title: Đọc kiểu cột từ catalog
title_en: Read column types from the catalog
kind: lab
minutes: 6
objectives:
  - vi: Hỏi Postgres kiểu của từng cột qua `information_schema.columns`
    en: Ask Postgres for each column's type through `information_schema.columns`
  - vi: Thấy `numeric` so bằng `=` cho đúng kết quả
    en: See `numeric` compare with `=` correctly
requires: [e-pg-l1-01]
sources:
  - https://www.postgresql.org/docs/current/infoschema-columns.html
  - https://www.postgresql.org/docs/current/datatype-numeric.html
lab:
  steps:
    - task:
        vi: Liệt kê tên cột và kiểu dữ liệu của bảng `products` trong schema `lab`, theo thứ tự cột trong bảng.
        en: List the column names and data types of table `products` in schema `lab`, in the table's column order.
      solution: SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'lab' AND table_name = 'products' ORDER BY ordinal_position;
      check: rows
      ordered: true
      hint:
        vi: Lọc `table_schema` và `table_name`, sắp theo `ordinal_position`.
        en: Filter on `table_schema` and `table_name`, sort by `ordinal_position`.
    - task:
        vi: Viết một câu trả về đúng một ô, cho biết 0.1 cộng 0.2 có bằng 0.3 không khi tính bằng `numeric`.
        en: Write a query that returns one cell saying whether 0.1 plus 0.2 equals 0.3 when computed as `numeric`.
      solution: SELECT 0.1::numeric + 0.2::numeric = 0.3::numeric;
      check: rows
      hint:
        vi: Ép kiểu từng số bằng `::numeric` rồi so bằng `=`.
        en: Cast each number with `::numeric`, then compare with `=`.
---

## Ý chính

Postgres tự mô tả chính nó: mọi bảng, cột và kiểu đều nằm trong catalog. `information_schema.columns` là cách đọc chuẩn SQL, có một dòng cho mỗi cột.

## Thực hành

Chạy thử từng câu trước khi nộp. Kết quả đúng có hai cột: tên cột và kiểu.

# EN

## Key idea

Postgres describes itself: every table, column and type lives in the catalog. `information_schema.columns` is the standard SQL way to read it, one row per column.

## Practice

Run each query before you submit it. The right result has two columns: the column name and its type.
