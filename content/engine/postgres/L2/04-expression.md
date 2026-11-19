---
id: e-pg-l2-04
engine: postgres
level: L2
module: partial-expr
title: Index trên biểu thức
title_en: Indexes on expressions
kind: lab
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Tạo index trên `lower(email)` để tìm email không phân biệt hoa thường mà vẫn nhanh.
    en: Index `lower(email)` so case-insensitive email lookups stay fast.
  - vi: Biết câu phải viết đúng biểu thức của index thì planner mới dùng.
    en: Know a query must use the index's exact expression for the planner to use it.
requires: [e-pg-l2-03]
sources:
  - https://www.postgresql.org/docs/18/indexes-expressional.html
  - https://www.postgresql.org/docs/18/indexes-unique.html
lab:
  setup: |
    CREATE TABLE users (
      id int PRIMARY KEY,
      email text NOT NULL
    );
    INSERT INTO users
    SELECT g, CASE WHEN g % 3 = 0 THEN 'User' || g || '@Example.com' ELSE 'user' || g || '@example.com' END
    FROM generate_series(1, 30000) AS g;
    ANALYZE users;
  steps:
    - task:
        vi: "Tạo index tên `users_email_lower_idx` trên biểu thức `lower(email)`."
        en: "Create an index named `users_email_lower_idx` on the expression `lower(email)`."
      solution: CREATE INDEX users_email_lower_idx ON users (lower(email))
      target: SELECT id FROM users WHERE lower(email) = 'user4242@example.com'
      check: catalog
      hint:
        vi: "Biểu thức đặt trong ngoặc như một cột: `ON users (lower(email))`."
        en: "Put the expression in the parentheses like a column: `ON users (lower(email))`."
    - task:
        vi: "Tìm `id` của người có email `USER4242@example.com`, không phân biệt hoa thường. Kế hoạch phải dùng `users_email_lower_idx`."
        en: "Find the `id` of the user whose email is `USER4242@example.com`, ignoring case. The plan must use `users_email_lower_idx`."
      solution: SELECT id FROM users WHERE lower(email) = 'user4242@example.com'
      check: plan
      hint:
        vi: "So `lower(email)` với chuỗi đã viết thường."
        en: "Compare `lower(email)` with the lower-cased string."
    - task:
        vi: "Thay index thường bằng luật: tạo unique index tên `users_email_ci_key` trên `lower(email)`, để không ai đăng ký trùng email chỉ khác hoa thường."
        en: "Turn it into a rule: create a unique index named `users_email_ci_key` on `lower(email)`, so nobody can sign up with the same email in different case."
      solution: CREATE UNIQUE INDEX users_email_ci_key ON users (lower(email))
      check: catalog
      hint:
        vi: "`CREATE UNIQUE INDEX ... ON users (lower(email))`."
        en: "`CREATE UNIQUE INDEX ... ON users (lower(email))`."
---
## Ý chính

Index thường lưu giá trị cột như đã ghi. Câu `WHERE lower(email) = '...'` hỏi về một giá trị khác (đã viết thường), nên index trên `email` không giúp được và planner quét cả bảng.

Index trên biểu thức lưu kết quả của biểu thức cho mỗi dòng. Khi câu dùng đúng biểu thức đó, planner tra index như với một cột:

- `CREATE INDEX ... ON users (lower(email))` phục vụ `WHERE lower(email) = ...`.
- Câu `WHERE email ILIKE ...` hay `WHERE upper(email) = ...` không khớp biểu thức nên không dùng được.
- Chi phí: biểu thức được tính lại mỗi lần ghi. Hàm trong index phải là `IMMUTABLE` (cùng đầu vào luôn ra cùng kết quả).

`CREATE UNIQUE INDEX` trên biểu thức là cách giữ luật "email không trùng, không phân biệt hoa thường" ngay trong database.

## Ví dụ

```sql
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user4242@example.com';
```

Chưa có index biểu thức, kế hoạch là Seq Scan với `Filter: (lower(email) = ...)`.

## Thực hành

Một phần ba email trong bảng có chữ hoa. Tạo index biểu thức, chứng minh nó được dùng, rồi biến nó thành luật unique.

# EN

## Key idea

An ordinary index stores the column value as written. A query with `WHERE lower(email) = '...'` asks about a different value (lower-cased), so an index on `email` cannot help and the planner scans the whole table.

An index on an expression stores the expression's result for each row. When a query uses that exact expression, the planner looks it up like a column:

- `CREATE INDEX ... ON users (lower(email))` serves `WHERE lower(email) = ...`.
- `WHERE email ILIKE ...` or `WHERE upper(email) = ...` do not match the expression, so they cannot use it.
- Cost: the expression is recomputed on every write. A function in an index must be `IMMUTABLE` (same input, always the same output).

A `CREATE UNIQUE INDEX` on an expression keeps the rule "no duplicate email, ignoring case" inside the database.

## Example

```sql
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user4242@example.com';
```

Without the expression index, the plan is a Seq Scan with `Filter: (lower(email) = ...)`.

## Practice

A third of the emails in the table contain capitals. Create the expression index, prove it is used, then turn it into a unique rule.
