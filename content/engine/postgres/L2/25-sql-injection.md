---
id: e-pg-l2-25
engine: postgres
level: L2
module: functions
title: SQL injection và SQL động an toàn
title_en: SQL injection and safe dynamic SQL
kind: lab
runtime: browser
minutes: 18
figures: [{ name: pg-injection-bind, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Chỉ ra vì sao nối chuỗi người dùng nhập vào câu SQL động cho phép họ viết lại câu lệnh.
    en: Show why concatenating user input into dynamic SQL lets the user rewrite the statement.
  - vi: Truyền giá trị bằng `EXECUTE … USING` hoặc `format('%L')`, và tên bảng, tên cột bằng `format('%I')`.
    en: Pass values with `EXECUTE … USING` or `format('%L')`, and table or column names with `format('%I')`.
  - vi: Biết tham số `$1` chỉ thay được giá trị, không thay được tên, nên tên còn cần danh sách cho phép.
    en: Know that a `$1` parameter can stand for a value, never a name, so names also need an allow list.
requires: [e-pg-l2-18]
sources:
  - { url: https://www.postgresql.org/docs/18/plpgsql-statements.html#PLPGSQL-STATEMENTS-EXECUTING-DYN, title_vi: "PL/pgSQL › chạy câu lệnh động" }
  - { url: https://www.postgresql.org/docs/18/functions-string.html#FUNCTIONS-STRING-FORMAT, title_vi: "Hàm chuỗi › format" }
  - { url: https://www.postgresql.org/docs/18/sql-prepare.html, title_vi: "PREPARE" }
  - { url: https://www.postgresql.org/docs/18/sql-syntax-lexical.html#SQL-SYNTAX-DOLLAR-QUOTING, title_vi: "Cú pháp › chuỗi trong dấu đô la ($$)" }
lab:
  setup: |
    CREATE TABLE accounts (id int PRIMARY KEY, owner text NOT NULL, balance numeric(12,0) NOT NULL);
    INSERT INTO accounts VALUES (1, 'An', 500000), (2, 'Binh', 1200000), (3, 'Chi', 80000), (4, 'O''Hara', 300000);
    CREATE TABLE "order items" (id int PRIMARY KEY, qty int NOT NULL);
    INSERT INTO "order items" VALUES (1, 2), (2, 5);
    CREATE FUNCTION find_unsafe(p text) RETURNS SETOF accounts LANGUAGE plpgsql STABLE AS $$
    BEGIN
      RETURN QUERY EXECUTE 'SELECT * FROM accounts WHERE owner = ''' || p || '''';
    END $$;
  steps:
    - task:
        vi: "Hàm `find_unsafe(p)` nối `p` vào câu SQL. Gọi nó với một chuỗi không phải tên ai cả nhưng làm hàm trả về mã và chủ của mọi tài khoản (dùng chuỗi dollar `$$…$$` để khỏi phải nhân đôi dấu nháy)."
        en: "The function `find_unsafe(p)` concatenates `p` into its SQL. Call it with a string that is nobody's name but makes it return the id and owner of every account (use a dollar string `$$…$$` so you need not double the quotes)."
      solution: "SELECT id, owner FROM find_unsafe($$nobody' OR true --$$)"
      check: rows
      hint:
        vi: "Chuỗi của bạn đóng dấu nháy của hàm, thêm `OR true`, rồi `--` biến dấu nháy cuối thành chú thích."
        en: "Your string closes the function's quote, adds `OR true`, then `--` turns the last quote into a comment."
    - task:
        vi: "Viết hàm PL/pgSQL `find_safe(p text)` trả về `SETOF accounts`, cũng tìm theo `owner`, nhưng truyền `p` làm tham số (`EXECUTE … USING p`, hoặc `format` với `%L`). Bài chấm bằng cách gọi hàm với chuỗi của bước 1 (phải ra 0 dòng) và với `O'Hara` (phải ra 1 dòng)."
        en: "Write a PL/pgSQL function `find_safe(p text)` returning `SETOF accounts` that also searches by `owner`, but passes `p` as a parameter (`EXECUTE … USING p`, or `format` with `%L`). It is graded by calling it with the string of step 1 (must give 0 rows) and with `O'Hara` (must give 1 row)."
      solution: |-
        CREATE FUNCTION find_safe(p text) RETURNS SETOF accounts LANGUAGE plpgsql STABLE AS $$
        BEGIN
          RETURN QUERY EXECUTE 'SELECT * FROM accounts WHERE owner = $1' USING p;
        END $$
      after: "SELECT (SELECT count(*) FROM find_safe($$nobody' OR true --$$)) AS injected, (SELECT count(*) FROM find_safe($$O'Hara$$)) AS apostrophe"
      check: rows
      hint:
        vi: "Trong chuỗi lệnh viết `$1` ở chỗ giá trị, rồi `USING p` sau chuỗi. Giá trị đi riêng, không bao giờ thành chữ SQL."
        en: "Write `$1` where the value goes in the command string, then `USING p` after it. The value travels apart and never becomes SQL text."
    - task:
        vi: "Viết hàm `count_rows(tbl text)` trả về `bigint`: số dòng của bảng tên `tbl`, dựng câu bằng `format` với `%I` và chạy bằng `EXECUTE … INTO`. Bài chấm bằng `count_rows('accounts')` và `count_rows('order items')` (tên có dấu cách)."
        en: "Write a function `count_rows(tbl text)` returning `bigint`: the row count of the table named `tbl`, built with `format` and `%I` and run with `EXECUTE … INTO`. It is graded with `count_rows('accounts')` and `count_rows('order items')` (a name with a space)."
      solution: |-
        CREATE FUNCTION count_rows(tbl text) RETURNS bigint LANGUAGE plpgsql STABLE AS $$
        DECLARE n bigint;
        BEGIN
          EXECUTE format('SELECT count(*) FROM %I', tbl) INTO n;
          RETURN n;
        END $$
      after: "SELECT count_rows('accounts') AS accounts, count_rows('order items') AS items"
      check: rows
      hint:
        vi: "`%I` đặt tên trong dấu nháy kép khi cần, nên `order items` thành `\"order items\"`. Tham số `$1` không dùng được cho tên bảng."
        en: "`%I` puts the name in double quotes when needed, so `order items` becomes `\"order items\"`. A `$1` parameter cannot be used for a table name."
quiz:
  - q:
      vi: "Một hàm nhân đôi mọi dấu nháy đơn của chuỗi người dùng (`replace(p, '''', '''''')`) rồi mới nối vào câu SQL. Như vậy đã an toàn chưa?"
      en: "A function doubles every single quote in the user's string (`replace(p, '''', '''''')`) before concatenating it into the SQL. Is that safe now?"
    options:
      - { vi: "An toàn: không còn dấu nháy nào đóng được chuỗi", en: "Safe: no quote can close the string any more" }
      - { vi: "Chưa nên dùng: tự thoát ký tự dễ sót trường hợp (tên, số nối không nháy, cấu hình chuỗi khác); dùng `USING` hoặc `%L` để Postgres làm việc đó", en: "Not the way to go: hand-made escaping misses cases (names, numbers concatenated without quotes, other string settings); use `USING` or `%L` and let Postgres do it" }
      - { vi: "Chỉ cần giới hạn độ dài chuỗi dưới 20 ký tự", en: "Only the string length needs a limit under 20 characters" }
    answer: 1
    trap: 0
    why:
      vi: "Nhân đôi dấu nháy nghe đủ vì ví dụ tấn công ở bước 1 dùng dấu nháy, nhưng tự thoát (escape) chỉ chặn đúng một đường. Giới hạn 20 ký tự cũng không chặn được, vì `1 OR true` chỉ có 9 ký tự. Một số nối không có nháy (`WHERE id = ' || p`) vẫn nhận `1 OR true`, và tên bảng cần quy tắc khác hẳn. `EXECUTE … USING` gửi giá trị tách khỏi câu lệnh; `quote_literal`/`%L` và `quote_ident`/`%I` là các hàm thoát của chính Postgres."
      en: "Doubling quotes sounds enough because the step 1 attack used a quote, but hand escaping blocks only one road. A 20-character limit does not stop it either, since `1 OR true` is only 9 characters. A number concatenated without quotes (`WHERE id = ' || p`) still accepts `1 OR true`, and table names need a different rule entirely. `EXECUTE … USING` sends the value apart from the command; `quote_literal`/`%L` and `quote_ident`/`%I` are Postgres' own escaping functions."
  - q:
      vi: "Người dùng chọn tên bảng để xuất báo cáo. Cách nào đúng?"
      en: "The user picks the table name for a report. Which way is right?"
    options:
      - { vi: "`EXECUTE 'SELECT * FROM $1' USING tbl`", en: "`EXECUTE 'SELECT * FROM $1' USING tbl`" }
      - { vi: "Kiểm `tbl` có trong danh sách cho phép, rồi `format('SELECT * FROM %I', tbl)`", en: "Check that `tbl` is on an allow list, then `format('SELECT * FROM %I', tbl)`" }
      - { vi: "`format('SELECT * FROM %L', tbl)`", en: "`format('SELECT * FROM %L', tbl)`" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ tham số `$1` thay được mọi thứ. Thật ra nó chỉ thay giá trị: `FROM $1` là lỗi cú pháp. `%L` đặt tên trong nháy đơn, thành một chuỗi chứ không phải tên bảng. `%I` thoát tên đúng cách, và danh sách cho phép chặn người dùng đọc bảng họ không được xem."
      en: "Many people think a `$1` parameter can stand for anything. In fact it stands only for a value: `FROM $1` is a syntax error. `%L` puts the name in single quotes, making a string, not a table name. `%I` escapes the name correctly, and the allow list stops users reading tables they must not see."
---
## Mở bài

Một hàm tìm tài khoản theo tên chủ chạy tốt suốt một năm, cho tới khi có người gõ vào ô tìm kiếm `nobody' OR true --` và thấy số dư của mọi khách. Cùng hàm đó cũng báo lỗi với khách thật tên `O'Hara`. Hai triệu chứng có chung một nguyên nhân: dữ liệu bị nối thành chữ SQL.

## Ý chính

SQL injection xảy ra khi chữ do người dùng gõ được ghép vào câu lệnh rồi Postgres đọc cả câu như mã. Chỉ cần một dấu nháy đơn, chuỗi của người dùng đóng chuỗi của bạn và viết tiếp phần còn lại: thêm `OR true`, thêm câu khác, hay biến phần sau thành chú thích bằng `--`. Trong PostgreSQL chỗ hay gặp nhất là PL/pgSQL `EXECUTE` với chuỗi ghép bằng `||`, và mã ứng dụng ghép chuỗi trước khi gửi.

Nhiều người nghĩ chỉ cần nhân đôi dấu nháy là xong. Thật ra cách đúng là không để giá trị chạm vào chữ SQL. Với giá trị: `EXECUTE '… $1' USING p`, hay `PREPARE … $1` và tham số của driver; giá trị đi riêng, Postgres không bao giờ phân tích nó như mã. Khi buộc phải đưa giá trị vào chữ, dùng `format('%L')` hoặc `quote_literal`.

Tên bảng, tên cột không truyền bằng tham số được: `$1` chỉ thay một giá trị. Tên đi qua `format('%I')` hoặc `quote_ident`, các hàm này thêm nháy kép khi cần. `%s` chèn nguyên văn, nên với dữ liệu người dùng nó chẳng khác gì `||`. Tên do người dùng chọn còn cần danh sách cho phép, vì `%I` chặn được câu thứ hai nhưng không chặn việc đọc nhầm bảng.

Hình từng bước ở cuối mục này đưa cùng một chuỗi qua hai đường: ghép bằng `||` thì nó thành mã, truyền bằng `$1` thì nó chỉ là một giá trị.

## Cú pháp

```sql
EXECUTE command_string [ INTO target ] [ USING expression [, ...] ];
format(formatstr text [, arg ...])   -- %I name, %L value, %s raw text
quote_ident(text)  quote_literal(anyelement)  quote_nullable(anyelement)
PREPARE name (type [, ...]) AS statement;  EXECUTE name (value [, ...]);
```

- `USING` / `$1`: cho giá trị; giá trị không bao giờ thành chữ SQL.
- `%L`, `quote_literal`: cho giá trị; với `%L` NULL thành `NULL` không nháy.
- `%I`, `quote_ident`: cho tên bảng, tên cột; thêm nháy kép khi tên có chữ hoa hay dấu cách.
- `%s`, `||`: chỉ cho chữ SQL bạn tự viết, không bao giờ cho dữ liệu người dùng.

## Ví dụ

Gọi bình thường, hàm không an toàn vẫn đúng:

```sql
SELECT * FROM find_unsafe('Binh');
```

Xem câu lệnh hàm dựng ra khi người dùng gõ chuỗi tấn công: chữ `OR true` đã nằm trong câu, và `--` nuốt dấu nháy cuối.

```sql
SELECT 'SELECT * FROM accounts WHERE owner = ''' || $$nobody' OR true --$$ || '''' AS built;
```

Các hàm thoát của Postgres: tên có dấu cách được đặt trong nháy kép, dấu nháy trong giá trị được nhân đôi, NULL thành chữ `NULL`.

```sql
SELECT format('SELECT * FROM %I WHERE owner = %L', 'order items', $$O'Hara$$) AS built,
       quote_ident('order items') AS ident,
       quote_literal($$O'Hara$$) AS lit,
       quote_nullable(NULL) AS lit_null;
```

Câu đã chuẩn bị ở mức SQL: `$1` nhận cả chuỗi tấn công lẫn tên có dấu nháy như dữ liệu thường.

```sql
PREPARE by_owner(text) AS SELECT id, owner FROM accounts WHERE owner = $1;
EXECUTE by_owner($$O'Hara$$);
```

## Lỗi hay gặp

Khách thật tên `O'Hara` làm vỡ câu lệnh ghép chuỗi:

```sql
-- ERROR 42601: syntax error at or near "Hara"
SELECT * FROM find_unsafe($$O'Hara$$);
```

Ghép chuỗi cho phép người dùng viết lại điều kiện:

```sql
-- WRONG: the input rewrites the WHERE clause, every account comes back
SELECT count(*) AS hits FROM find_unsafe($$nobody' OR true --$$);
```

```sql
-- FIX: the value goes in with USING and stays a value
CREATE FUNCTION find_param(p text) RETURNS SETOF accounts LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY EXECUTE 'SELECT * FROM accounts WHERE owner = $1' USING p;
END $$;
SELECT count(*) AS hits FROM find_param($$nobody' OR true --$$);
```

Câu sai đếm ra 4: mọi tài khoản. Câu sửa đếm ra 0, vì không ai tên đúng như chuỗi đó.

Dùng `%L` cho tên bảng:

```sql
-- ERROR 42601: syntax error at or near "'order items'"
DO $$ BEGIN EXECUTE format('SELECT count(*) FROM %L', 'order items'); END $$;
```

`%L` tạo một chuỗi trong nháy đơn, và `FROM 'order items'` không phải tên bảng. Tên dùng `%I`.

## Thực hành

Ba bước: tự tấn công hàm `find_unsafe`, viết `find_safe` truyền giá trị bằng `USING`, rồi viết `count_rows` nhận tên bảng qua `%I`. Sau đó là hai câu hỏi.

## Tóm tắt

- Injection xảy ra khi chữ người dùng được ghép vào câu lệnh và Postgres đọc nó như mã.
- Giá trị: `EXECUTE … USING`, `PREPARE … $1` hoặc tham số của driver; khi buộc phải ghép, `%L` / `quote_literal`.
- Tên: `%I` / `quote_ident` cùng danh sách cho phép; `$1` không thay được tên, `%s` và `||` không bao giờ cho dữ liệu người dùng.
- Thẻ Best Practice `x01` (tham số hóa) và `x09` (SQL động với `format`) tóm lại hai luật này để tra nhanh.

# EN

## Opening

A function that finds accounts by owner name runs fine for a year, until someone types `nobody' OR true --` into the search box and sees every customer's balance. The same function also fails for a real customer named `O'Hara`. Both symptoms have one cause: data concatenated into SQL text.

## Key idea

SQL injection happens when text typed by a user is glued into a statement and Postgres reads the whole thing as code. One single quote is enough: the user's string closes your string and writes the rest, adding `OR true`, another statement, or turning what follows into a comment with `--`. In PostgreSQL the usual place is PL/pgSQL `EXECUTE` with a string built by `||`, and application code that builds strings before sending them.

Many people think doubling the quotes is enough. In fact the right way is to never let the value touch the SQL text. For values: `EXECUTE '… $1' USING p`, or `PREPARE … $1` and the driver's parameters; the value travels apart and Postgres never parses it as code. When a value must go into the text, use `format('%L')` or `quote_literal`.

Table and column names cannot be passed as parameters: `$1` only stands for a value. Names go through `format('%I')` or `quote_ident`, which add double quotes when needed. `%s` inserts text as is, so with user data it is no better than `||`. A name the user picks also needs an allow list, because `%I` stops a second statement but not a read of the wrong table.

The step-through figure at the end of this section sends one string down two paths: glued with `||` it becomes code, passed as `$1` it stays a value.

## Syntax

```sql
EXECUTE command_string [ INTO target ] [ USING expression [, ...] ];
format(formatstr text [, arg ...])   -- %I name, %L value, %s raw text
quote_ident(text)  quote_literal(anyelement)  quote_nullable(anyelement)
PREPARE name (type [, ...]) AS statement;  EXECUTE name (value [, ...]);
```

- `USING` / `$1`: for values; the value never becomes SQL text.
- `%L`, `quote_literal`: for values; with `%L` a NULL becomes an unquoted `NULL`.
- `%I`, `quote_ident`: for table and column names; adds double quotes for capitals or spaces.
- `%s`, `||`: only for SQL text you wrote yourself, never for user data.

## Example

Called normally, the unsafe function still works:

```sql
SELECT * FROM find_unsafe('Binh');
```

See the statement the function builds when a user types the attack string: `OR true` is now inside the statement, and `--` swallows the last quote.

```sql
SELECT 'SELECT * FROM accounts WHERE owner = ''' || $$nobody' OR true --$$ || '''' AS built;
```

Postgres' escaping functions: a name with a space goes in double quotes, a quote inside a value is doubled, NULL becomes the word `NULL`.

```sql
SELECT format('SELECT * FROM %I WHERE owner = %L', 'order items', $$O'Hara$$) AS built,
       quote_ident('order items') AS ident,
       quote_literal($$O'Hara$$) AS lit,
       quote_nullable(NULL) AS lit_null;
```

A prepared statement at the SQL level: `$1` takes the attack string and a name with a quote as plain data.

```sql
PREPARE by_owner(text) AS SELECT id, owner FROM accounts WHERE owner = $1;
EXECUTE by_owner($$O'Hara$$);
```

## Common mistakes

A real customer named `O'Hara` breaks the concatenated statement:

```sql
-- ERROR 42601: syntax error at or near "Hara"
SELECT * FROM find_unsafe($$O'Hara$$);
```

Concatenation lets the user rewrite the condition:

```sql
-- WRONG: the input rewrites the WHERE clause, every account comes back
SELECT count(*) AS hits FROM find_unsafe($$nobody' OR true --$$);
```

```sql
-- FIX: the value goes in with USING and stays a value
CREATE FUNCTION find_param(p text) RETURNS SETOF accounts LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY EXECUTE 'SELECT * FROM accounts WHERE owner = $1' USING p;
END $$;
SELECT count(*) AS hits FROM find_param($$nobody' OR true --$$);
```

The wrong version counts 4: every account. The fix counts 0, because nobody is named exactly that string.

Using `%L` for a table name:

```sql
-- ERROR 42601: syntax error at or near "'order items'"
DO $$ BEGIN EXECUTE format('SELECT count(*) FROM %L', 'order items'); END $$;
```

`%L` makes a string in single quotes, and `FROM 'order items'` is not a table name. Names use `%I`.

## Practice

Three steps: attack `find_unsafe` yourself, write `find_safe` that passes the value with `USING`, then write `count_rows` that takes a table name through `%I`. Then two questions.

## Recap

- Injection happens when user text is glued into a statement and Postgres reads it as code.
- Values: `EXECUTE … USING`, `PREPARE … $1` or the driver's parameters; when you must build text, `%L` / `quote_literal`.
- Names: `%I` / `quote_ident` plus an allow list; `$1` cannot stand for a name, and `%s` and `||` are never for user data.
- The Best Practice cards `x01` (parameterise) and `x09` (dynamic SQL with `format`) sum up these two rules for quick lookup.
