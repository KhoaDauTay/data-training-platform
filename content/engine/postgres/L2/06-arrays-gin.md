---
id: e-pg-l2-06
engine: postgres
level: L2
module: index-types
title: Mảng và index GIN
title_en: Arrays and GIN indexes
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-gin-postings
objectives:
  - vi: Lưu nhãn trong cột mảng và lọc bằng `= ANY`, `@>` và `&&`.
    en: Store tags in an array column and filter with `= ANY`, `@>` and `&&`.
  - vi: Tạo index GIN cho mảng và viết điều kiện bằng toán tử mà GIN hiểu.
    en: Create a GIN index on an array and write the filter with an operator GIN understands.
requires: [e-pg-l2-05]
sources:
  - https://www.postgresql.org/docs/18/arrays.html
  - https://www.postgresql.org/docs/18/functions-array.html
  - https://www.postgresql.org/docs/18/gin.html
lab:
  setup: |
    CREATE TABLE posts (
      id int PRIMARY KEY,
      title text NOT NULL,
      tags text[] NOT NULL
    );
    INSERT INTO posts
    SELECT g, 'Post ' || g,
           ARRAY[(ARRAY['sql', 'python', 'excel', 'bi'])[1 + g % 4],
                 (ARRAY['beginner', 'advanced'])[1 + (g / 4) % 2]]
           || CASE WHEN g % 150 = 0 THEN ARRAY['postgres'] ELSE ARRAY[]::text[] END
    FROM generate_series(1, 30000) AS g;
    ANALYZE posts;
  steps:
    - task:
        vi: "Đếm số bài có nhãn `sql` và cũng có nhãn `beginner` (một cột, một dòng)."
        en: "Count the posts tagged both `sql` and `beginner` (one column, one row)."
      solution: SELECT count(*) FROM posts WHERE tags @> ARRAY['sql', 'beginner']
      check: rows
      hint:
        vi: "`tags @> ARRAY[...]` nghĩa là mảng chứa mọi phần tử đã cho."
        en: "`tags @> ARRAY[...]` means the array contains every listed element."
    - task:
        vi: "Tạo index GIN tên `posts_tags_idx` trên cột `tags`."
        en: "Create a GIN index named `posts_tags_idx` on column `tags`."
      solution: CREATE INDEX posts_tags_idx ON posts USING gin (tags)
      target: SELECT id, title FROM posts WHERE tags @> ARRAY['postgres']
      check: catalog
      hint:
        vi: "`CREATE INDEX name ON table USING gin (col)`."
        en: "`CREATE INDEX name ON table USING gin (col)`."
    - task:
        vi: "Lấy `id, title` của các bài có nhãn `postgres`. Kế hoạch phải dùng `posts_tags_idx`."
        en: "Return `id, title` of the posts tagged `postgres`. The plan must use `posts_tags_idx`."
      solution: SELECT id, title FROM posts WHERE tags @> ARRAY['postgres']
      check: plan
      hint:
        vi: "`'postgres' = ANY(tags)` không dùng được GIN; viết lại bằng `@>`."
        en: "`'postgres' = ANY(tags)` cannot use GIN; rewrite it with `@>`."
---
## Ý chính

Postgres có kiểu mảng: `text[]`, `int[]`... Một cột nhãn `tags text[]` thay được một bảng phụ khi nhãn chỉ để lọc.

- `'sql' = ANY(tags)`: mảng có phần tử `sql`.
- `tags @> ARRAY['sql', 'beginner']`: mảng chứa mọi phần tử đã cho.
- `tags && ARRAY['sql', 'bi']`: hai mảng có ít nhất một phần tử chung.

B-tree không giúp được các câu này, vì nó so cả mảng như một giá trị. GIN là index "đảo ngược": mỗi phần tử (mỗi nhãn) là một khóa, kèm danh sách các dòng chứa nó. Tìm `@> ARRAY['postgres']` là đọc đúng danh sách của khóa `postgres`; với nhiều phần tử thì lấy giao các danh sách.

Bẫy: GIN cho mảng hiểu `@>`, `<@`, `&&` và `=`, nhưng không hiểu `= ANY(...)`. Cùng ý nghĩa, viết bằng `@>` mới dùng được index.

GIN đọc nhanh nhưng ghi chậm hơn B-tree, vì một dòng sinh ra nhiều khóa.

## Ví dụ

```sql
CREATE INDEX demo_tags_idx ON posts USING gin (tags);
EXPLAIN SELECT id FROM posts WHERE 'postgres' = ANY(tags);
```

Dù có index GIN, câu `= ANY` vẫn là Seq Scan.

## Thực hành

200 trên 30 000 bài có nhãn `postgres`. Đếm theo nhãn, tạo index GIN, rồi viết câu dùng được nó.

# EN

## Key idea

Postgres has array types: `text[]`, `int[]`... A `tags text[]` column can replace a side table when tags are only used for filtering.

- `'sql' = ANY(tags)`: the array has an element `sql`.
- `tags @> ARRAY['sql', 'beginner']`: the array contains every listed element.
- `tags && ARRAY['sql', 'bi']`: the two arrays share at least one element.

A B-tree cannot help with these, because it compares the whole array as one value. GIN is an "inverted" index: each element (each tag) is a key, with a list of the rows that contain it. Finding `@> ARRAY['postgres']` reads exactly the list for key `postgres`; with several elements it intersects the lists.

Trap: GIN on arrays understands `@>`, `<@`, `&&` and `=`, but not `= ANY(...)`. Same meaning, but only the `@>` form can use the index.

GIN reads fast but writes slower than a B-tree, because one row produces many keys.

## Example

```sql
CREATE INDEX demo_tags_idx ON posts USING gin (tags);
EXPLAIN SELECT id FROM posts WHERE 'postgres' = ANY(tags);
```

Even with a GIN index, the `= ANY` query is a Seq Scan.

## Practice

200 of the 30,000 posts are tagged `postgres`. Count by tag, create a GIN index, then write a query that can use it.
