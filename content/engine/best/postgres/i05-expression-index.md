---
id: e-bp-i05
engine: best
track: postgres
level: L3
module: i
title: "Expression index khi truy vấn luôn dùng một biểu thức"
title_en: "Expression indexes for a fixed expression"
kind: quiz
minutes: 3
objectives:
  - vi: "Tạo index trên đúng biểu thức mà truy vấn so sánh, ví dụ `lower(email)`, và viết điều kiện y như biểu thức đó."
    en: "Index the exact expression the query compares, such as `lower(email)`, and write the condition exactly like it."
avoid:
  vi: "Quét cả bảng thành viên dù cột email đã có index."
  en: "A full scan of the members table although the email column is indexed."
requires: [e-pg-l2-04]
skills: [sargable, index_design, string_fn]
adv: []
sources:
  - https://www.postgresql.org/docs/18/indexes-expressional.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE members_a (id int PRIMARY KEY, email text NOT NULL);
    INSERT INTO members_a SELECT i, 'User' || i || '@Mail.vn' FROM generate_series(1, 20000) AS i;
    CREATE TABLE members_b AS SELECT * FROM members_a;
    CREATE INDEX members_a_email_ix ON members_a (email);
    CREATE INDEX members_b_email_lower_ix ON members_b (lower(email));
    ANALYZE members_a;
    ANALYZE members_b;
  bad: |
    SELECT id FROM members_a WHERE lower(email) = 'user42@mail.vn'
  good: |
    SELECT id FROM members_b WHERE lower(email) = 'user42@mail.vn'
  expect: { compare: cost }
quiz:
  - q:
      vi: "Bảng có index `ON members (email)`. Truy vấn `WHERE lower(email) = 'user42@mail.vn'` có dùng được index đó không?"
      en: "A table has an index `ON members (email)`. Can the query `WHERE lower(email) = 'user42@mail.vn'` use it?"
    options:
      - { vi: "Có, vì cùng cột `email`", en: "Yes, it is the same `email` column" }
      - { vi: "Không, cần index trên chính `lower(email)`", en: "No, it needs an index on `lower(email)` itself" }
      - { vi: "Chỉ khi bảng nhỏ", en: "Only when the table is small" }
    answer: 1
    why:
      vi: "Index trên `email` lưu giá trị gốc, có hoa có thường. Nó không trả lời được câu hỏi về `lower(email)`. Index biểu thức lưu sẵn `lower(email)` đã tính, nên điều kiện viết đúng biểu thức đó mới dùng được."
      en: "An index on `email` stores the original mixed-case values. It cannot answer a question about `lower(email)`. An expression index stores `lower(email)` precomputed, so a condition written with that exact expression can use it."
---

## Ý chính

Truy vấn luôn so `lower(email)` thì index chính biểu thức đó: `CREATE INDEX … (lower(email))`, và viết điều kiện y như biểu thức ấy.

## Vì sao

- Index trên `email` không dùng được cho `lower(email) = …`, cùng lý do với điều kiện sargable.
- Expression index lưu sẵn giá trị đã tính: đọc rẻ, ghi tốn thêm một phép tính.

## Ví dụ

Cùng 20.000 thành viên, cùng câu hỏi, cùng một dòng. Bảng có index trên `email`: `Seq Scan`, cost 428. Bảng có index trên `lower(email)`: `Index Scan`, cost 8,3.

# EN

## Key idea

When queries always compare `lower(email)`, index that expression: `CREATE INDEX … (lower(email))`, and write the condition exactly like it.

## Why

- An index on `email` cannot serve `lower(email) = …`, for the same reason as a non-sargable condition.
- An expression index stores the computed value: cheap reads, one extra computation per write.

## Example

Same 20,000 members, same question, same single row. The table indexed on `email`: `Seq Scan`, cost 428. The table indexed on `lower(email)`: `Index Scan`, cost 8.3.
