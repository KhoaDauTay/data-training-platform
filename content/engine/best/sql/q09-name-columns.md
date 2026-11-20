---
id: e-bp-q09
engine: best
track: sql
level: L1
module: q
title: "Liệt kê cột, không SELECT * trong truy vấn lưu lại"
title_en: "Name your columns in saved queries"
kind: quiz
minutes: 2
objectives:
  - vi: "Trong truy vấn dùng lại (báo cáo, dashboard, view), liệt kê đúng các cột cần thay vì `SELECT *`."
    en: "In a query you reuse (report, dashboard, view), list exactly the columns you need instead of `SELECT *`."
avoid:
  vi: "Báo cáo đổi hình dạng hoặc kéo theo cột lớn không cần mỗi khi bảng thêm cột."
  en: "A report that changes shape, or drags along big unneeded columns, whenever the table gains a column."
requires: []
skills: [select]
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-select.html
  - https://www.sqlstyle.guide/
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: runs
  setup: null
  bad: |
    SELECT *
    FROM app_events
    WHERE session_id = 42
  good: |
    SELECT id, event, ts
    FROM app_events
    WHERE session_id = 42
    ORDER BY ts, id
  expect: null
quiz:
  - q:
      vi: "Một dashboard dùng `SELECT * FROM app_events`. Tuần sau ai đó thêm một cột `jsonb` lớn vào bảng. Dashboard bị gì?"
      en: "A dashboard uses `SELECT * FROM app_events`. Next week someone adds a large `jsonb` column to the table. What happens to the dashboard?"
    options:
      - { vi: "Không gì cả", en: "Nothing" }
      - { vi: "Kết quả có thêm một cột, và mỗi lần chạy kéo theo dữ liệu cột đó", en: "The result gains a column, and every run carries that column's data" }
      - { vi: "Truy vấn báo lỗi", en: "The query fails" }
    answer: 1
    why:
      vi: "`*` được mở ra lúc chạy thành mọi cột hiện có. Bảng đổi thì kết quả đổi theo, và cột lớn không ai cần vẫn được đọc và gửi đi."
      en: "`*` is expanded at run time into every column that exists. When the table changes the result changes with it, and a big column nobody needs is still read and sent."
---

## Ý chính

Truy vấn dùng lại (báo cáo, dashboard, view) liệt kê đúng các cột cần, có tên rõ nghĩa. `SELECT *` chỉ để xem nhanh một bảng.

## Vì sao

- `SELECT *` đổi hình dạng khi bảng thêm hay bớt cột, nên công cụ đọc kết quả theo vị trí cột có thể vỡ.
- Nó kéo theo cột lớn không cần (`jsonb`, chữ dài), và chặn Index Only Scan.
- Người đọc truy vấn không biết kết quả có những gì.

# EN

## Key idea

A query you reuse (report, dashboard, view) lists exactly the columns it needs, with clear names. Keep `SELECT *` for a quick look at a table.

## Why

- `SELECT *` changes shape when the table gains or loses a column, so tools that read the result by position can break.
- It drags along big columns you do not need (`jsonb`, long text), and it rules out an Index Only Scan.
- Someone reading the query cannot tell what the result contains.
