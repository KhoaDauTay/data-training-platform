---
id: e-pg-l2-05
engine: postgres
level: L2
module: index-types
title: Index Hash chỉ biết dấu bằng
title_en: A Hash index only knows equality
kind: predict
runtime: browser
minutes: 9
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Biết index Hash chỉ phục vụ `=`, và vì sao B-tree vẫn là lựa chọn mặc định.
    en: Know that a Hash index serves only `=`, and why B-tree remains the default choice.
  - vi: Nhận ra các câu Hash không phục vụ được (khoảng, sắp xếp, tiền tố, unique, nhiều cột) trước khi chọn nó.
    en: Spot the queries Hash cannot serve (ranges, sorting, prefixes, uniqueness, several columns) before choosing it.
requires: [e-pg-l2-04]
figures: [{ name: pg-hash-equal-only, at: idea }]
sources:
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/hash-index.html
lab:
  setup: |
    CREATE TABLE sessions (
      id int PRIMARY KEY,
      token text NOT NULL,
      user_id int NOT NULL
    );
    INSERT INTO sessions SELECT g, md5(g::text), g % 3000 FROM generate_series(1, 30000) AS g;
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
    - task:
        vi: "Tìm `id, user_id` của phiên có token `md5('7')`. Bài chấm cả tốc độ: đúng mà không dùng được `sessions_token_hash` là chưa đạt."
        en: "Find the `id, user_id` of the session whose token is `md5('7')`. Speed is graded too: a right answer that cannot use `sessions_token_hash` does not pass."
      solution: SELECT id, user_id FROM sessions WHERE token = md5('7')
      check: rows
      perf: { table: sessions }
      slow: SELECT id, user_id FROM sessions WHERE token BETWEEN md5('7') AND md5('7')
      hint:
        vi: "Hash chỉ hiểu `=`; một khoảng chỉ chứa đúng một giá trị vẫn là khoảng."
        en: "Hash only understands `=`; a range that holds just one value is still a range."
quiz:
  - q:
      vi: "Cần một index để chặn hai phiên trùng `token`. Index Hash có làm được không?"
      en: "You need an index that blocks two sessions with the same `token`. Can a Hash index do it?"
    options:
      - { vi: "Có: Hash so bằng chính xác, nên kiểm trùng là việc của nó", en: "Yes: Hash compares exact equality, so checking duplicates is its job" }
      - { vi: "Không: Postgres không cho tạo unique index kiểu Hash; dùng B-tree hoặc ràng buộc `UNIQUE`", en: "No: Postgres does not allow a unique Hash index; use a B-tree or a `UNIQUE` constraint" }
      - { vi: "Có, nếu thêm `INCLUDE (token)`", en: "Yes, if you add `INCLUDE (token)`" }
    answer: 1
    trap: 0
    why:
      vi: "Kiểm trùng chỉ cần so bằng nên Hash nghe hợp, nhưng trong Postgres chỉ B-tree hỗ trợ unique index: `CREATE UNIQUE INDEX ... USING hash` báo lỗi `0A000` (tính năng không được hỗ trợ). `INCLUDE` không đổi được điều đó, vì nó chỉ thêm cột để trả về. Ràng buộc (constraint) `UNIQUE` luôn tự dựng một B-tree, nên đó là cách chặn trùng."
      en: "Checking duplicates only needs equality, so Hash sounds fine, but in Postgres only B-tree supports unique indexes: `CREATE UNIQUE INDEX ... USING hash` fails with `0A000` (feature not supported). `INCLUDE` cannot change that, since it only adds columns to return. A `UNIQUE` constraint always builds its own B-tree, so that is how you block duplicates."
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
  trap: 0
  why:
    vi: "Đi qua index nghe hợp lý vì câu chỉ khớp vài dòng, mà câu khớp ít dòng thường dùng index. Nhưng index Hash chỉ lưu mã băm 32 bit của mỗi giá trị: hai token gần nhau như `a00…` và `a01…` có mã băm nằm ở hai chỗ bất kỳ, nên index không biết thứ tự. Nó trả lời được \"bằng đúng giá trị này\", không trả lời được \"nằm giữa a00 và a01\", nên cả Index Scan lẫn Bitmap Heap Scan qua nó đều không có. Planner phải Seq Scan; một B-tree thì phục vụ được cả bằng lẫn khoảng."
    en: "Using the index sounds right because the query matches only a few rows, and such queries usually go through an index. But a Hash index stores only a 32-bit hash of each value: two close tokens like `a00…` and `a01…` hash to unrelated places, so the index knows no order. It can answer \"equal to this value\", not \"between a00 and a01\", so neither an Index Scan nor a Bitmap Heap Scan through it exists. The planner must Seq Scan; a B-tree would serve both equality and ranges."
---
## Mở bài

Mỗi lần người dùng mở một trang, ứng dụng tra phiên đăng nhập bằng một `token` dài 32 ký tự. Câu tra luôn là "bằng đúng token này", không bao giờ là khoảng hay sắp xếp. Đó là trường hợp hiếm hoi mà index Hash đáng được cân nhắc.

## Ý chính

Index Hash băm mỗi giá trị thành một mã 32 bit và xếp các mục theo mã đó. Tài liệu chính thức nói rõ nó chỉ xử lý được phép so sánh `=`. Index chỉ lưu mã băm 4 byte chứ không lưu cả giá trị, nên với khóa dài nó thường nhỏ hơn B-tree.

Hash không phục vụ được: khoảng (`<`, `BETWEEN`), `ORDER BY`, tìm theo tiền tố `LIKE 'abc%'`, index nhiều cột, unique. B-tree làm được tất cả những việc đó, và cũng phục vụ `=` rất tốt. Vì vậy B-tree vẫn là mặc định hợp lý; chỉ chọn Hash khi đo thấy nó nhỏ hơn hoặc nhanh hơn cho đúng một kiểu câu bằng.

Nhiều người nghĩ cứ câu nào chọn lọc (khớp ít dòng) thì có index là dùng được. Thật ra index chỉ dùng được khi toán tử của câu nằm trong những gì index hiểu. Câu khoảng khớp 6 dòng vẫn Seq Scan nếu cột chỉ có index Hash; ngay cả `BETWEEN x AND x`, khoảng chỉ chứa một giá trị, cũng vậy.

Hình từng bước ở cuối mục này xếp sáu mục mẫu của index theo mã băm, để thấy vì sao dấu bằng tìm được còn một khoảng thì không.

## Ví dụ

Câu bằng đi qua index Hash:

```sql
EXPLAIN SELECT user_id FROM sessions WHERE token = md5('99');
```

Kế hoạch là `Index Scan using sessions_token_hash` với `Index Cond: (token = '...')`: hàm `md5('99')` được tính một lần thành hằng số trước khi tra.

```sql
CREATE INDEX demo_token_btree ON sessions (token);
SELECT pg_size_pretty(pg_relation_size('sessions_token_hash')) AS hash_size,
       pg_size_pretty(pg_relation_size('demo_token_btree')) AS btree_size;
```

Trên 30.000 token, Hash chiếm `1040 kB`, B-tree `1752 kB`. Nhỏ hơn, nhưng B-tree làm được nhiều việc hơn.

## Lỗi hay gặp

Dùng Hash để giữ luật không trùng:

```sql
-- ERROR 0A000: access method "hash" does not support unique indexes
CREATE UNIQUE INDEX demo_token_key ON sessions USING hash (token);
```

Dùng Hash cho nhiều cột:

```sql
-- ERROR 0A000: access method "hash" does not support multicolumn indexes
CREATE INDEX demo_token_user ON sessions USING hash (token, user_id);
```

Cả hai trường hợp đều cần B-tree.

## Thực hành

Đoán kế hoạch của một câu khoảng trên cột chỉ có index Hash, viết một câu bằng dùng được index đó, rồi tra một phiên khác sao cho vừa đúng vừa nhanh.

## Tóm tắt

- Index Hash lưu mã băm 32 bit và chỉ phục vụ `=`.
- Không khoảng, không `ORDER BY`, không tiền tố, không unique, không nhiều cột.
- Câu chọn lọc cũng không dùng được index nếu toán tử không phải thứ index hiểu.
- B-tree vẫn là mặc định; chọn Hash chỉ khi đo thấy lợi cho một kiểu câu bằng.

# EN

## Opening

Every time a user opens a page, the application looks up the login session by a 32-character `token`. The lookup is always "equal to this token", never a range or a sort. That is one of the rare cases where a Hash index is worth considering.

## Key idea

A Hash index hashes each value into a 32-bit code and files entries by that code. The official docs state it can only handle the `=` comparison. The index stores the 4-byte hash rather than the whole value, so for long keys it is often smaller than a B-tree.

Hash cannot serve: ranges (`<`, `BETWEEN`), `ORDER BY`, prefix search `LIKE 'abc%'`, multicolumn indexes, uniqueness. A B-tree does all of these, and serves `=` very well too. So B-tree remains the sensible default; pick Hash only when you measure it as smaller or faster for one kind of equality query.

Many people think any selective query (matching few rows) can use an index if one exists. In fact an index is usable only when the query's operator is one the index understands. A range matching 6 rows still does a Seq Scan if the column only has a Hash index; so does `BETWEEN x AND x`, a range holding a single value.

The step-through figure at the end of this section lays six sample index entries out in hash-code order, to show why an equality can be found and a range cannot.

## Example

An equality goes through the Hash index:

```sql
EXPLAIN SELECT user_id FROM sessions WHERE token = md5('99');
```

The plan is `Index Scan using sessions_token_hash` with `Index Cond: (token = '...')`: the function `md5('99')` is computed once into a constant before the lookup.

```sql
CREATE INDEX demo_token_btree ON sessions (token);
SELECT pg_size_pretty(pg_relation_size('sessions_token_hash')) AS hash_size,
       pg_size_pretty(pg_relation_size('demo_token_btree')) AS btree_size;
```

For 30,000 tokens, Hash takes `1040 kB` and the B-tree `1752 kB`. Smaller, but the B-tree can do much more.

## Common mistakes

Using Hash to enforce no duplicates:

```sql
-- ERROR 0A000: access method "hash" does not support unique indexes
CREATE UNIQUE INDEX demo_token_key ON sessions USING hash (token);
```

Using Hash on several columns:

```sql
-- ERROR 0A000: access method "hash" does not support multicolumn indexes
CREATE INDEX demo_token_user ON sessions USING hash (token, user_id);
```

Both cases need a B-tree.

## Practice

Guess the plan of a range query on a column that only has a Hash index, write an equality query that can use it, then look up another session so the answer is both right and fast.

## Recap

- A Hash index stores a 32-bit hash and serves only `=`.
- No ranges, no `ORDER BY`, no prefixes, no uniqueness, no multiple columns.
- Even a selective query cannot use an index whose operators do not match.
- B-tree stays the default; pick Hash only when measurements show a gain for one kind of equality query.
