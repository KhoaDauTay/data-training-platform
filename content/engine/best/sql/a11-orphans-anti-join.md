---
id: e-bp-a11
engine: best
track: sql
level: L2
module: a
title: "Tìm bản ghi mồ côi bằng anti join"
title_en: "Find orphans with an anti join"
kind: quiz
minutes: 3
objectives:
  - vi: "Trước khi `JOIN` hai bảng không có foreign key, đếm bản ghi mồ côi bằng `LEFT JOIN … IS NULL` và báo cáo con số đó."
    en: "Before you `JOIN` two tables with no foreign key, count orphans with `LEFT JOIN … IS NULL` and report that number."
avoid:
  vi: "Tổng thanh toán thấp hơn sổ sách mà không ai biết vì sao."
  en: "A payment total below the books, and nobody knows why."
requires: [e-pg-l1-04]
skills: [anti_join, left_join]
adv: [c1]
sources:
  - https://www.postgresql.org/docs/18/queries-table-expressions.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS payments
    FROM payments p
    JOIN orders o ON o.id = p.order_id
  good: |
    SELECT count(*) AS payments,
           count(*) FILTER (WHERE o.id IS NULL) AS orphan_payments
    FROM payments p
    LEFT JOIN orders o ON o.id = p.order_id
  expect: null
quiz:
  - q:
      vi: "`payments.order_id` không có foreign key. Có 8 khoản trả trỏ tới đơn không tồn tại. `payments JOIN orders` làm gì với chúng?"
      en: "`payments.order_id` has no foreign key. 8 payments point to orders that do not exist. What does `payments JOIN orders` do with them?"
    options:
      - { vi: "Báo lỗi vi phạm khóa ngoại", en: "Raises a foreign key violation" }
      - { vi: "Âm thầm bỏ chúng", en: "Silently drops them" }
      - { vi: "Giữ chúng với các cột của đơn là NULL", en: "Keeps them with NULL order columns" }
    answer: 1
    why:
      vi: "`INNER JOIN` chỉ giữ dòng khớp ở cả hai bên. Không có ràng buộc nên cũng không có lỗi. `LEFT JOIN` + `o.id IS NULL` cho bạn thấy và đếm được chúng."
      en: "An `INNER JOIN` keeps only rows that match on both sides. With no constraint, there is no error either. `LEFT JOIN` + `o.id IS NULL` lets you see and count them."
---

## Ý chính

Trước khi `INNER JOIN` hai bảng không có foreign key, đếm bản ghi mồ côi bằng `LEFT JOIN … WHERE right_table.id IS NULL` (hoặc `NOT EXISTS`), và báo cáo con số đó cùng kết quả.

## Vì sao

- `INNER JOIN` âm thầm bỏ các dòng không khớp.
- Tổng trong báo cáo thấp hơn sổ sách mà không ai biết vì sao.
- Một cột "mồ côi" giúp người đọc tin con số còn lại.

## Ví dụ

Trên `lab`, bản `JOIN` đếm 1.387 khoản trả. Bản `LEFT JOIN` đếm đủ 1.395 và chỉ ra 8 khoản mồ côi.

# EN

## Key idea

Before an `INNER JOIN` between two tables with no foreign key, count orphans with `LEFT JOIN … WHERE right_table.id IS NULL` (or `NOT EXISTS`), and report that number with the result.

## Why

- An `INNER JOIN` silently drops rows that do not match.
- The report's total is lower than the books, and nobody knows why.
- An "orphans" column helps readers trust the rest of the numbers.

## Example

On `lab`, the `JOIN` version counts 1,387 payments. The `LEFT JOIN` version counts all 1,395 and shows 8 orphans.
