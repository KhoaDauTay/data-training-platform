---
id: e-bp-q22
engine: best
track: sql
level: L1
module: q
title: "Định dạng nhất quán, không GROUP BY 1"
title_en: "Consistent style, no GROUP BY 1"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết truy vấn lưu lại với từ khóa viết hoa, mỗi mệnh đề một dòng, alias có nghĩa và tên cột thay cho số thứ tự."
    en: "Write saved queries with upper-case keywords, one clause per line, meaningful aliases and column names instead of positions."
avoid:
  vi: "Báo cáo đổi nghĩa âm thầm khi ai đó chèn thêm một cột vào `SELECT`."
  en: "A report that silently changes meaning when someone inserts a column into the `SELECT`."
requires: []
skills: [select, group_by]
adv: []
sources:
  - https://www.sqlstyle.guide/
  - https://www.postgresql.org/docs/18/sql-select.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: same
  setup: null
  bad: |
    select s.city,count(*) from orders o join stores s on s.id=o.store_id group by 1 order by 2 desc,1
  good: |
    SELECT s.city,
           count(*) AS orders
    FROM orders AS o
    JOIN stores AS s ON s.id = o.store_id
    GROUP BY s.city
    ORDER BY orders DESC, s.city
  expect: null
lint:
  rule: q22
  tip:
    vi: "`GROUP BY` hay `ORDER BY` theo số thứ tự cột sẽ đổi nghĩa khi ai đó chèn một cột vào `SELECT`. Viết tên cột thì an toàn hơn."
    en: "`GROUP BY` or `ORDER BY` by column position changes meaning when someone inserts a column into the `SELECT`. Column names are safer."
quiz:
  - q:
      vi: "Câu có `SELECT s.city, count(*) … GROUP BY 1`. Một đồng nghiệp chèn `s.name` lên đầu danh sách `SELECT`. Chuyện gì xảy ra?"
      en: "A query has `SELECT s.city, count(*) … GROUP BY 1`. A colleague inserts `s.name` at the front of the `SELECT` list. What happens?"
    options:
      - { vi: "Vẫn gom theo thành phố", en: "It still groups by city" }
      - { vi: "Giờ gom theo `s.name`, hoặc báo lỗi vì `s.city` không nằm trong `GROUP BY`", en: "It now groups by `s.name`, or fails because `s.city` is not in `GROUP BY`" }
      - { vi: "Postgres tự đánh số lại", en: "Postgres renumbers it for you" }
    answer: 1
    why:
      vi: "`GROUP BY 1` nghĩa là \"cột đầu tiên của `SELECT`\". Postgres không tự đánh số lại: cột đầu giờ là `s.name`, nên nhóm đổi theo, hoặc câu báo lỗi vì `s.city` không còn trong `GROUP BY`. Viết `GROUP BY s.city` thì nghĩa không phụ thuộc vị trí."
      en: "`GROUP BY 1` means \"the first column of the `SELECT`\". Postgres does not renumber it: the first column is now `s.name`, so the groups change, or the query fails because `s.city` is no longer in `GROUP BY`. `GROUP BY s.city` does not depend on position."
---

## Ý chính

Truy vấn lưu lại cần dễ đọc: từ khóa viết hoa, tên `snake_case` chữ thường, mỗi mệnh đề chính một dòng, alias có nghĩa với `AS`, và `GROUP BY`/`ORDER BY` theo tên cột, không theo số thứ tự.

## Vì sao

- Truy vấn được đọc nhiều hơn được viết.
- Số thứ tự cột đổi nghĩa âm thầm khi ai đó chèn một cột vào `SELECT`.
- Nút Format của BoonData sửa phần khoảng trắng; tên cột thì bạn phải tự viết.

## Ví dụ

Hai câu trả cùng số đơn theo thành phố. Bản viết thường, dồn một dòng, dùng `group by 1 order by 2 desc,1` khó đọc và dễ vỡ hơn.

# EN

## Key idea

Saved queries need to be readable: upper-case keywords, lower-case `snake_case` names, one main clause per line, meaningful aliases with `AS`, and `GROUP BY`/`ORDER BY` by column name, not by position.

## Why

- Queries are read more often than they are written.
- Column positions silently change meaning when someone inserts a column into the `SELECT`.
- BoonData's Format button fixes the spacing; the column names are up to you.

## Example

Both queries return the same orders per city. The lower-case one-liner with `group by 1 order by 2 desc,1` is harder to read and easier to break.
