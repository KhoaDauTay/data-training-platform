---
id: e-pg-l2-05
engine: postgres
level: L2
module: index-types
title: Index Hash chỉ biết dấu bằng
title_en: A Hash index only knows equality
kind: predict
runtime: browser
minutes: 7
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Biết index Hash chỉ phục vụ `=`, và vì sao B-tree vẫn là lựa chọn mặc định.
    en: Know that a Hash index serves only `=`, and why B-tree remains the default choice.
requires: [e-pg-l2-04]
sources:
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/hash-index.html
lab:
  setup: |
    CREATE TABLE sessions (
      token text NOT NULL,
      user_id int NOT NULL
    );
    INSERT INTO sessions SELECT md5(g::text), g % 3000 FROM generate_series(1, 30000) AS g;
    CREATE INDEX sessions_token_hash ON sessions USING hash (token);
    ANALYZE sessions;
  steps:
    - task:
        vi: "Tìm `user_id` của phiên có `token = md5('42')`. Kế hoạch phải dùng `sessions_token_hash`."
        en: "Find the `user_id` of the session whose `token = md5('42')`. The plan must use `sessions_token_hash`."
      solution: SELECT user_id FROM sessions WHERE token = md5('42')
      check: plan
      hint:
        vi: Một điều kiện bằng là đúng việc của index Hash.
        en: An equality is exactly what a Hash index is for.
predict:
  sql: SELECT user_id FROM sessions WHERE token BETWEEN 'a00' AND 'a01'
  expect: { node: Seq Scan, table: sessions }
  q:
    vi: "Bảng có index Hash `sessions_token_hash` trên `token`. Câu này chỉ khớp vài dòng. Postgres đọc thế nào?"
    en: "The table has a Hash index `sessions_token_hash` on `token`. This query matches only a few rows. How does Postgres read it?"
  options:
    - { vi: "Index Scan dùng `sessions_token_hash`", en: "Index Scan using `sessions_token_hash`" }
    - { vi: "Bitmap Heap Scan dùng `sessions_token_hash`", en: "Bitmap Heap Scan using `sessions_token_hash`" }
    - { vi: "Seq Scan trên `sessions`", en: "Seq Scan on `sessions`" }
  answer: 2
  why:
    vi: "Đi qua index nghe hợp lý vì câu chỉ khớp vài dòng, mà câu chọn lọc thì thường dùng index; nhưng index Hash lưu mã băm 32 bit của giá trị, không lưu thứ tự. Nó trả lời được \"bằng đúng giá trị này\" nhưng không trả lời được \"nằm giữa a00 và a01\". Dù câu rất chọn lọc, planner vẫn phải Seq Scan. Một B-tree thì dùng được cho cả hai."
    en: "Using the index is tempting because the query matches only a few rows, and selective queries usually go through an index, but a Hash index stores a 32-bit hash of each value, not its order. It can answer \"equal to this value\" but not \"between a00 and a01\". However selective the query is, the planner must Seq Scan. A B-tree would serve both."
---
## Ý chính

Index Hash băm giá trị thành một mã 32 bit và lưu theo mã đó. Docs chính thức nói rõ nó chỉ xử lý được phép so sánh `=`.

- Hợp: khóa dài chỉ bao giờ tra bằng (token, URL dài), vì index chỉ lưu mã băm 4 byte chứ không lưu cả giá trị.
- Không hợp: khoảng (`<`, `BETWEEN`), `ORDER BY`, `LIKE 'abc%'`, unique, nhiều cột. B-tree làm được tất cả những việc đó.

Index Hash chỉ có một cột và không kiểm unique được. Vì vậy B-tree vẫn là mặc định hợp lý; chỉ chọn Hash khi đo thấy nó nhỏ hơn hoặc nhanh hơn cho đúng một kiểu câu bằng.

## Ví dụ

```sql
EXPLAIN SELECT user_id FROM sessions WHERE token = md5('42');
```

Câu bằng: `Index Scan using sessions_token_hash`, với `Index Cond: (token = '...')`.

## Thực hành

Đoán kế hoạch của một câu khoảng trên cột chỉ có index Hash, rồi viết câu bằng dùng được index đó.

# EN

## Key idea

A Hash index hashes each value into a 32-bit code and stores entries by that code. The official docs state it can only handle the `=` comparison.

- Good fit: long keys that are only ever looked up by equality (tokens, long URLs), since the index stores the 4-byte hash rather than the whole value.
- Poor fit: ranges (`<`, `BETWEEN`), `ORDER BY`, `LIKE 'abc%'`, uniqueness, multiple columns. A B-tree does all of these.

A Hash index has a single column and cannot check uniqueness. So B-tree remains the sensible default; pick Hash only when you measure it as smaller or faster for one kind of equality query.

## Example

```sql
EXPLAIN SELECT user_id FROM sessions WHERE token = md5('42');
```

Equality: `Index Scan using sessions_token_hash`, with `Index Cond: (token = '...')`.

## Practice

Guess the plan of a range query on a column that only has a Hash index, then write an equality query that can use it.
