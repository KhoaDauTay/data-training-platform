---
id: e-pg-l2-04
engine: postgres
level: L2
module: partial-expr
title: Index trên biểu thức
title_en: Indexes on expressions
kind: lab
runtime: browser
minutes: 12
figures: [{ name: pg-expression-index, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tạo index trên `lower(email)` để tìm email không phân biệt hoa thường mà vẫn nhanh.
    en: Index `lower(email)` so case-insensitive email lookups stay fast.
  - vi: Biết câu phải viết đúng biểu thức của index thì planner mới dùng.
    en: Know a query must use the index's exact expression for the planner to use it.
  - vi: Dùng unique index trên biểu thức để chặn email trùng chỉ khác hoa thường, và biết vì sao hàm trong index phải `IMMUTABLE`.
    en: Use a unique index on an expression to block emails that differ only in case, and know why a function in an index must be `IMMUTABLE`.
requires: [e-pg-l2-03]
sources:
  - https://www.postgresql.org/docs/18/indexes-expressional.html
  - https://www.postgresql.org/docs/18/indexes-unique.html
  - https://www.postgresql.org/docs/18/xfunc-volatility.html
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
        vi: "Biến nó thành luật (giữ index ở bước 1): tạo unique index tên `users_email_ci_key` trên `lower(email)`, để không ai đăng ký trùng email chỉ khác hoa thường."
        en: "Turn it into a rule (keep the step 1 index): create a unique index named `users_email_ci_key` on `lower(email)`, so nobody can sign up with the same email in different case."
      solution: CREATE UNIQUE INDEX users_email_ci_key ON users (lower(email))
      check: catalog
      hint:
        vi: "`CREATE UNIQUE INDEX ... ON users (lower(email))`."
        en: "`CREATE UNIQUE INDEX ... ON users (lower(email))`."
    - task:
        vi: "Trang đăng nhập nhận `USER9999@EXAMPLE.COM`. Trả `id, email` của người đó, không phân biệt hoa thường. Bài chấm cả tốc độ: đúng mà không dùng được index biểu thức là chưa đạt."
        en: "The login page receives `USER9999@EXAMPLE.COM`. Return that user's `id, email`, ignoring case. Speed is graded too: a right answer that cannot use the expression index does not pass."
      solution: SELECT id, email FROM users WHERE lower(email) = 'user9999@example.com'
      check: rows
      perf: { table: users }
      slow: SELECT id, email FROM users WHERE upper(email) = 'USER9999@EXAMPLE.COM'
      hint:
        vi: "Index lưu `lower(email)`, nên hãy viết thường chuỗi nhập vào rồi so với `lower(email)`."
        en: "The index stores `lower(email)`, so lower-case the input and compare it with `lower(email)`."
quiz:
  - q:
      vi: "Bảng có index trên `lower(email)`. Câu `WHERE email ILIKE 'an@example.com'` cũng không phân biệt hoa thường. Nó có dùng được index đó không?"
      en: "The table has an index on `lower(email)`. The query `WHERE email ILIKE 'an@example.com'` also ignores case. Can it use that index?"
    options:
      - { vi: "Có: hai cách cùng không phân biệt hoa thường", en: "Yes: both ways ignore case" }
      - { vi: "Không: chỉ biểu thức `lower(email)` viết đúng như trong index mới khớp", en: "No: only the expression `lower(email)`, written exactly as in the index, matches" }
      - { vi: "Có, nhưng chỉ khi bảng nhỏ", en: "Yes, but only on a small table" }
    answer: 1
    trap: 0
    why:
      vi: "Hai cách trả cùng các dòng, nhưng planner không so ý nghĩa: nó tìm trong câu đúng biểu thức đã lưu trong index, ở đây là `lower(email)`. `email ILIKE ...` là một toán tử khác trên cột `email` gốc, nên kế hoạch là Seq Scan, dù bảng lớn hay nhỏ: đây là chuyện biểu thức có khớp không, không phải chuyện chi phí. Viết `lower(email) = lower(...)` thì index được dùng."
      en: "Both ways return the same rows, but the planner does not compare meanings: it looks in the query for the exact expression stored in the index, here `lower(email)`. `email ILIKE ...` is a different operator on the raw `email` column, so the plan is a Seq Scan whatever the table size: the question is whether the expression matches, not what it costs. Write `lower(email) = lower(...)` and the index is used."
  - q:
      vi: "Vì sao Postgres bắt hàm trong index phải là `IMMUTABLE`?"
      en: "Why does Postgres require a function in an index to be `IMMUTABLE`?"
    options:
      - { vi: "Để index được dựng nhanh hơn", en: "So the index builds faster" }
      - { vi: "Index lưu kết quả lúc ghi; nếu cùng đầu vào mà hàm trả khác đi thì lần tìm sau không thấy dòng", en: "The index stores the result at write time; if the function could return something else for the same input, a later lookup would miss the row" }
      - { vi: "Vì hàm `VOLATILE` không chạy được trong `SELECT`", en: "Because `VOLATILE` functions cannot run in a `SELECT`" }
    answer: 1
    why:
      vi: "Index tính kết quả của hàm một lần lúc ghi dòng rồi lưu lại; lúc tìm, Postgres tính lại hàm trên giá trị cần tìm và so với giá trị đã lưu. Nếu cùng đầu vào mà hàm trả khác đi (vì đọc giờ hay đọc bảng), giá trị lưu không còn khớp và lần tìm bỏ sót dòng. `IMMUTABLE` không làm dựng index nhanh hơn, và hàm `VOLATILE` vẫn chạy bình thường trong `SELECT`. Hàm tự viết mặc định là `VOLATILE`; chỉ khai báo `IMMUTABLE` khi nó thật sự chỉ phụ thuộc đầu vào."
      en: "An index computes the function once when the row is written and stores the result; at lookup time Postgres computes the function on the searched value and compares it with the stored one. If the same input could give another result (because the function reads the clock or a table), the stored value no longer matches and the lookup misses the row. `IMMUTABLE` does not make the build faster, and a `VOLATILE` function runs fine in a `SELECT`. A function you write is `VOLATILE` by default; declare it `IMMUTABLE` only when it truly depends on its input alone."
---
## Mở bài

Khách gõ email lúc thì có chữ hoa, lúc thì không, nên trang đăng nhập so `lower(email)` với chuỗi đã viết thường. Câu đó đúng, nhưng mỗi lần đăng nhập nó đọc hết 30.000 dòng. Index trên cột `email` không cứu được, vì nó lưu giá trị gốc chứ không lưu bản viết thường.

## Ý chính

Index thường lưu giá trị cột như đã ghi. Câu `WHERE lower(email) = '...'` hỏi về một giá trị khác (đã viết thường), nên index trên `email` không giúp được và planner quét cả bảng.

Index trên biểu thức lưu kết quả của biểu thức cho mỗi dòng. Khi câu dùng đúng biểu thức đó, planner tra index như với một cột. Cái giá phải trả: biểu thức được tính lại ở mỗi lần ghi dòng, và `ANALYZE` thu thêm thống kê cho biểu thức để planner ước số dòng đúng hơn.

Nhiều người nghĩ cứ câu nào không phân biệt hoa thường là dùng được index `lower(email)`. Thật ra planner chỉ khớp biểu thức, không khớp ý nghĩa: `email ILIKE ...` hay `upper(email) = ...` cho cùng kết quả nhưng là biểu thức khác, nên vẫn Seq Scan.

Hàm trong index phải là `IMMUTABLE`: cùng đầu vào thì luôn ra cùng kết quả. Index lưu kết quả lúc ghi; nếu hàm có thể đổi kết quả theo giờ, theo cài đặt hay theo dữ liệu khác, lần tìm sau sẽ không thấy dòng. `lower` là `IMMUTABLE`; hàm bạn tự viết thì mặc định là `VOLATILE`.

`CREATE UNIQUE INDEX` trên biểu thức là cách giữ luật "email không trùng, không phân biệt hoa thường" ngay trong database.

Hình từng bước ở cuối mục này đặt hai index cạnh nhau: cùng một dòng, index trên `email` và index trên `lower(email)` giữ hai chuỗi khác nhau.

## Cú pháp

```sql
CREATE [ UNIQUE ] INDEX index_name ON table_name ( ( expression ) [, ...] );
CREATE INDEX index_name ON table_name ( function_name ( column ) );
```

- Biểu thức tổng quát cần thêm một cặp ngoặc; một lời gọi hàm thì không.
- Câu hỏi phải viết đúng `expression` đó thì planner mới dùng index.
- Mọi hàm trong `expression` phải `IMMUTABLE`.

## Ví dụ

Chưa có index biểu thức:

```sql
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user1236@example.com';
```

Kế hoạch là `Seq Scan on users` với `Filter: (lower(email) = ...)`.

```sql
CREATE INDEX demo_lower ON users (lower(email));
ANALYZE users;
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user1236@example.com';
```

Giờ là `Index Scan using demo_lower`, ước đúng 1 dòng nhờ `ANALYZE` đã có thống kê của `lower(email)`.

```sql
SELECT id, email FROM users WHERE lower(email) = 'user1236@example.com';
```

Dòng trả về là `User1236@Example.com`: email lưu nguyên dạng gốc, chỉ phép so là không phân biệt hoa thường.

## Lỗi hay gặp

So bằng một biểu thức khác với index:

```sql
-- WRONG: upper() is not the indexed expression
EXPLAIN SELECT id FROM users WHERE upper(email) = 'USER1236@EXAMPLE.COM';
```

```sql
-- FIX: use the exact indexed expression
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user1236@example.com';
```

Cùng một người dùng, nhưng câu sai là `Seq Scan`, câu sửa là `Index Scan using demo_lower`.

Dùng hàm tự viết mà quên khai báo `IMMUTABLE`:

```sql
CREATE FUNCTION email_domain(e text) RETURNS text LANGUAGE plpgsql
AS $$ BEGIN RETURN split_part(e, '@', 2); END $$;
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX demo_domain ON users (email_domain(email));
```

Hàm không khai báo gì là `VOLATILE`. Nếu nó thật sự chỉ phụ thuộc đầu vào, thêm `IMMUTABLE` vào `CREATE FUNCTION`; nếu không (đọc bảng, đọc giờ), đừng đưa nó vào index.

Tạo unique index khi dữ liệu đã có bản trùng:

```sql
INSERT INTO users VALUES (30001, 'user3@example.com');
-- ERROR 23505: could not create unique index "demo_email_ci"
CREATE UNIQUE INDEX demo_email_ci ON users (lower(email));
```

`User3@Example.com` đã có sẵn, nên sau khi viết thường hai email trùng nhau. Phải gộp hoặc sửa các bản trùng trước, rồi mới tạo được luật unique.

## Thực hành

Một phần ba email trong bảng có chữ hoa. Tạo index biểu thức, chứng minh nó được dùng, biến nó thành luật unique, rồi viết câu tìm cho trang đăng nhập vừa đúng vừa nhanh.

## Tóm tắt

- Index trên biểu thức lưu kết quả của biểu thức, ví dụ `lower(email)`, cho mỗi dòng.
- Câu hỏi phải viết đúng biểu thức của index; cùng kết quả nhưng khác biểu thức thì vẫn Seq Scan.
- Hàm trong index phải `IMMUTABLE`; hàm tự viết mặc định là `VOLATILE`.
- Unique index trên `lower(email)` chặn email trùng chỉ khác hoa thường.

# EN

## Opening

Customers type their email sometimes with capitals and sometimes without, so the login page compares `lower(email)` with a lower-cased string. That query is right, but every login reads all 30,000 rows. An index on column `email` cannot save it, because it stores the original value, not the lower-cased one.

## Key idea

An ordinary index stores the column value as written. A query with `WHERE lower(email) = '...'` asks about a different value (lower-cased), so an index on `email` cannot help and the planner scans the whole table.

An index on an expression stores the expression's result for each row. When a query uses that exact expression, the planner looks it up like a column. The price: the expression is computed again on every row write, and `ANALYZE` also collects statistics for the expression so the planner estimates row counts better.

Many people think any case-insensitive query can use an index on `lower(email)`. In fact the planner matches expressions, not meanings: `email ILIKE ...` or `upper(email) = ...` return the same rows but are different expressions, so they still Seq Scan.

A function in an index must be `IMMUTABLE`: same input, always the same output. The index stores the result at write time; if the function could change its result with the clock, a setting or other data, a later lookup would miss the row. `lower` is `IMMUTABLE`; a function you write yourself is `VOLATILE` by default.

A `CREATE UNIQUE INDEX` on an expression keeps the rule "no duplicate email, ignoring case" inside the database.

The step-through figure at the end of this section puts two indexes side by side: for the same row, the index on `email` and the index on `lower(email)` hold two different strings.

## Syntax

```sql
CREATE [ UNIQUE ] INDEX index_name ON table_name ( ( expression ) [, ...] );
CREATE INDEX index_name ON table_name ( function_name ( column ) );
```

- A general expression needs an extra pair of parentheses; a single function call does not.
- A query must use that exact `expression` for the planner to use the index.
- Every function in `expression` must be `IMMUTABLE`.

## Example

Without an expression index:

```sql
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user1236@example.com';
```

The plan is `Seq Scan on users` with `Filter: (lower(email) = ...)`.

```sql
CREATE INDEX demo_lower ON users (lower(email));
ANALYZE users;
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user1236@example.com';
```

Now it is `Index Scan using demo_lower`, estimating exactly 1 row because `ANALYZE` now has statistics for `lower(email)`.

```sql
SELECT id, email FROM users WHERE lower(email) = 'user1236@example.com';
```

The row returned is `User1236@Example.com`: the email is stored as typed, only the comparison ignores case.

## Common mistakes

Comparing with an expression other than the indexed one:

```sql
-- WRONG: upper() is not the indexed expression
EXPLAIN SELECT id FROM users WHERE upper(email) = 'USER1236@EXAMPLE.COM';
```

```sql
-- FIX: use the exact indexed expression
EXPLAIN SELECT id FROM users WHERE lower(email) = 'user1236@example.com';
```

Same user, but the wrong query is a `Seq Scan` and the fixed one an `Index Scan using demo_lower`.

Using your own function without declaring it `IMMUTABLE`:

```sql
CREATE FUNCTION email_domain(e text) RETURNS text LANGUAGE plpgsql
AS $$ BEGIN RETURN split_part(e, '@', 2); END $$;
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX demo_domain ON users (email_domain(email));
```

A function with no marking is `VOLATILE`. If it truly depends only on its input, add `IMMUTABLE` to the `CREATE FUNCTION`; if not (it reads a table or the clock), keep it out of indexes.

Creating a unique index when the data already holds a duplicate:

```sql
INSERT INTO users VALUES (30001, 'user3@example.com');
-- ERROR 23505: could not create unique index "demo_email_ci"
CREATE UNIQUE INDEX demo_email_ci ON users (lower(email));
```

`User3@Example.com` is already there, so once lower-cased the two emails clash. Merge or fix the duplicates first, then the unique rule can be created.

## Practice

A third of the emails in the table contain capitals. Create the expression index, prove it is used, turn it into a unique rule, then write the login lookup so it is both right and fast.

## Recap

- An index on an expression stores the expression's result, for example `lower(email)`, for each row.
- A query must use the index's exact expression; same result with another expression still means a Seq Scan.
- A function in an index must be `IMMUTABLE`; a function you write is `VOLATILE` by default.
- A unique index on `lower(email)` blocks emails that differ only in case.
