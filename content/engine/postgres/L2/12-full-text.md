---
id: e-pg-l2-12
engine: postgres
level: L2
module: search
title: Tìm kiếm toàn văn với tsvector và GIN
title_en: Full-text search with tsvector and GIN
kind: lab
runtime: browser
minutes: 16
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-gin-postings
objectives:
  - vi: Viết tìm kiếm theo từ bằng `to_tsvector`, `to_tsquery` và `@@`, xếp hạng bằng `ts_rank`.
    en: Write word search with `to_tsvector`, `to_tsquery` and `@@`, and rank with `ts_rank`.
  - vi: Tạo index GIN trên biểu thức `to_tsvector('english', body)` và viết câu khớp đúng biểu thức đó.
    en: Create a GIN index on the expression `to_tsvector('english', body)` and write queries that match it exactly.
  - vi: Chọn hàm dựng câu hỏi hợp với chữ người dùng gõ (`plainto_tsquery`, `websearch_to_tsquery`).
    en: Pick the query builder that fits what users type (`plainto_tsquery`, `websearch_to_tsquery`).
requires: [e-pg-l2-11]
sources:
  - https://www.postgresql.org/docs/18/textsearch-intro.html
  - https://www.postgresql.org/docs/18/textsearch-controls.html
  - https://www.postgresql.org/docs/18/textsearch-tables.html
  - https://www.postgresql.org/docs/18/textsearch-indexes.html
lab:
  setup: |
    CREATE TABLE articles (
      id int PRIMARY KEY,
      body text NOT NULL
    );
    INSERT INTO articles
    SELECT g,
           'The ' || (ARRAY['ship', 'truck', 'train', 'plane'])[1 + g % 4]
           || ' left the ' || CASE WHEN g % 3 = 0 THEN 'harbor' ELSE 'depot' END
           || ' with ' || (g % 50) || ' containers'
           || CASE WHEN g % 40 = 0 THEN ' after the crane was repaired' ELSE '' END
           || CASE WHEN g % 240 = 0 THEN '. The harbor crane cranes again' ELSE '' END
    FROM generate_series(1, 12000) AS g;
    ANALYZE articles;
  steps:
    - task:
        vi: "Đếm số bài nói tới cả harbor và crane (một cột, một dòng). Dùng cấu hình ngôn ngữ `english`."
        en: "Count the articles that mention both harbor and crane (one column, one row). Use the `english` configuration."
      solution: SELECT count(*) FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'harbor & crane')
      check: rows
      hint:
        vi: "`to_tsvector('english', body) @@ to_tsquery('english', 'harbor & crane')`."
        en: "`to_tsvector('english', body) @@ to_tsquery('english', 'harbor & crane')`."
    - task:
        vi: "Trong các bài đó, lấy `id` và điểm `ts_rank` của 3 bài điểm cao nhất; bằng điểm thì `id` nhỏ trước."
        en: "Among those articles, return the `id` and `ts_rank` score of the 3 highest-scoring ones; on a tie, smaller `id` first."
      solution: SELECT id, ts_rank(to_tsvector('english', body), to_tsquery('english', 'harbor & crane')) AS rank FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'harbor & crane') ORDER BY rank DESC, id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`ts_rank(vector, query)` cao hơn khi các từ xuất hiện nhiều hơn. Sắp `ORDER BY rank DESC, id`."
        en: "`ts_rank(vector, query)` is higher when the words appear more often. Sort with `ORDER BY rank DESC, id`."
    - task:
        vi: "Tạo index GIN tên `articles_fts_idx` trên biểu thức `to_tsvector('english', body)`."
        en: "Create a GIN index named `articles_fts_idx` on the expression `to_tsvector('english', body)`."
      solution: CREATE INDEX articles_fts_idx ON articles USING gin (to_tsvector('english', body))
      target: SELECT id FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'harbor & crane')
      check: catalog
      hint:
        vi: "Biểu thức index phải có tên cấu hình (`'english'`), nếu không nó phụ thuộc thiết lập của phiên và không được phép."
        en: "The index expression must name the configuration (`'english'`); otherwise it depends on a session setting and is not allowed."
    - task:
        vi: "Lấy `id` các bài nói tới cả harbor và crane. Kế hoạch phải dùng `articles_fts_idx`."
        en: "Return the `id` of articles mentioning both harbor and crane. The plan must use `articles_fts_idx`."
      solution: SELECT id FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'harbor & crane')
      check: plan
      hint:
        vi: Viết đúng biểu thức `to_tsvector('english', body)` như trong index.
        en: Write exactly the expression `to_tsvector('english', body)` used by the index.
    - task:
        vi: "Đội kỹ thuật cần `id` các bài nói tới crane và repaired. Câu phải nhanh: đi qua `articles_fts_idx`, không tính lại `tsvector` cho cả 12.000 bài."
        en: "The engineering team needs the `id` of articles mentioning crane and repaired. The query must be fast: through `articles_fts_idx`, without recomputing a `tsvector` for all 12,000 articles."
      solution: SELECT id FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'crane & repaired')
      check: rows
      perf: { table: articles }
      slow: SELECT id FROM articles WHERE to_tsvector(body) @@ to_tsquery('english', 'crane & repaired')
      hint:
        vi: "Ghi rõ `'english'` trong `to_tsvector`. Bỏ tên cấu hình vẫn ra cùng dòng (phiên đang dùng `english`) nhưng không còn khớp biểu thức của index."
        en: "Name `'english'` in `to_tsvector`. Leaving the configuration out gives the same rows (the session uses `english`) but no longer matches the index expression."
quiz:
  - q:
      vi: "Index GIN được tạo trên `to_tsvector('english', body)`. Câu `WHERE to_tsvector(body) @@ to_tsquery('english', 'crane')` ra đúng kết quả. Kế hoạch là gì?"
      en: "A GIN index exists on `to_tsvector('english', body)`. The query `WHERE to_tsvector(body) @@ to_tsquery('english', 'crane')` returns the right rows. What is the plan?"
    options:
      - { vi: "Bitmap Index Scan: cấu hình mặc định của phiên cũng là `english`, nên hai biểu thức như nhau", en: "Bitmap Index Scan: the session's default configuration is `english` too, so the two expressions are the same" }
      - { vi: "Seq Scan: planner chỉ nhận đúng biểu thức của index, mà `to_tsvector(body)` là một biểu thức khác", en: "Seq Scan: the planner only accepts the index's exact expression, and `to_tsvector(body)` is a different one" }
      - { vi: "Lỗi, vì thiếu tên cấu hình", en: "An error, because the configuration is missing" }
    answer: 1
    trap: 0
    why:
      vi: "Kết quả giống hệt, nhưng planner so biểu thức theo cách viết, không theo giá trị. `to_tsvector(body)` một tham số đọc thiết lập `default_text_search_config` của phiên, thiết lập này có thể đổi bất cứ lúc nào, nên nó là một biểu thức khác với `to_tsvector('english', body)` của index. Planner chọn Seq Scan và tính lại vector cho từng dòng. Câu không lỗi: một `SELECT` được dùng hàm phụ thuộc phiên, chỉ biểu thức của index mới bị cấm."
      en: "The result is identical, but the planner compares expressions as written, not by value. One-argument `to_tsvector(body)` reads the session setting `default_text_search_config`, which can change at any time, so it is a different expression from the index's `to_tsvector('english', body)`. The planner picks a Seq Scan and recomputes the vector for every row. The query does not fail: a `SELECT` may use a session-dependent function, only an index expression may not."
  - q:
      vi: "Người dùng gõ vào ô tìm kiếm: harbor crane. Nên đưa chuỗi đó cho hàm nào?"
      en: "A user types into the search box: harbor crane. Which function should receive that string?"
    options:
      - { vi: "`to_tsquery('english', ...)`, vì nó là hàm chính", en: "`to_tsquery('english', ...)`, because it is the main function" }
      - { vi: "`plainto_tsquery` hoặc `websearch_to_tsquery`: chúng nhận chữ tự do và tự nối các từ bằng `&`", en: "`plainto_tsquery` or `websearch_to_tsquery`: they accept free text and join the words with `&` themselves" }
      - { vi: "`to_tsvector`, vì nó tách từ", en: "`to_tsvector`, because it splits words" }
    answer: 1
    trap: 0
    why:
      vi: "`to_tsquery` là hàm hay gặp nhất, nhưng nó đòi cú pháp câu hỏi có toán tử: `harbor crane`, hai từ chỉ cách nhau khoảng trắng, là lỗi cú pháp `42601`. `to_tsvector` tách từ của văn bản cần tìm trong đó, không tạo câu hỏi. `plainto_tsquery` nhận chữ tự do và nối mọi từ bằng `&`; `websearch_to_tsquery` hiểu thêm dấu ngoặc kép (cụm từ) và dấu trừ (loại trừ), như ô tìm của trang web."
      en: "`to_tsquery` is the one you meet most, but it demands query syntax with operators: `harbor crane`, two words separated only by a space, is syntax error `42601`. `to_tsvector` splits the words of the text being searched, it does not build a query. `plainto_tsquery` takes free text and joins every word with `&`; `websearch_to_tsquery` also understands quotes (a phrase) and a minus sign (exclude), like a web search box."
---
## Mở bài

Kho có 12.000 ghi chú vận chuyển, và tổ bảo trì muốn mọi ghi chú nói về cần cẩu ở cảng. `LIKE '%crane%'` bỏ sót "cranes", không xếp được bài nào sát nhất lên đầu, và phải đọc mọi dòng. Tìm kiếm toàn văn làm việc với từ thay vì ký tự.

## Ý chính

`to_tsvector('english', body)` biến văn bản thành một `tsvector`: danh sách "lexeme" đã chuẩn hóa kèm vị trí. Từ dừng như "the", "was" bị bỏ, "cranes" và "repaired" được đưa về gốc `crane`, `repair`. Cấu hình `english` quyết định cách tách và rút gọn; tiếng khác cần cấu hình khác.

Câu hỏi là một `tsquery`. `to_tsquery` nhận cú pháp riêng: `&` (và), `|` (hoặc), `!` (không), `<->` (từ liền sau), `<N>` (cách N vị trí). Với chữ người dùng gõ tự do thì dùng `plainto_tsquery` (nối mọi từ bằng `&`) hoặc `websearch_to_tsquery` (hiểu ngoặc kép và dấu trừ như ô tìm web). `vector @@ query` đúng khi văn bản khớp câu hỏi. `ts_rank` cho điểm theo số lần các từ xuất hiện, để xếp bài sát nhất lên đầu.

Index nên dùng cho tìm kiếm toàn văn là GIN: mỗi lexeme là một khóa, kèm danh sách bài chứa nó, nên `harbor & crane` chỉ là phép giao hai danh sách. Có hai cách đặt index: index thẳng biểu thức `to_tsvector('english', body)`, hoặc thêm một cột sinh kiểu `tsvector` rồi index cột đó. Cột sinh tốn chỗ lưu nhưng câu hỏi gọn hơn và không phải tính lại vector khi đọc kết quả.

Nhiều người nghĩ `to_tsvector(body)` và `to_tsvector('english', body)` là một, vì phiên đang dùng `english`. Thật ra bản không có tên cấu hình phụ thuộc thiết lập của phiên: không được dùng làm index, và cũng không khớp index đã có.

## Cú pháp

```sql
SELECT ... WHERE to_tsvector('config', column) @@ to_tsquery('config', 'word [ & | <-> ] word');
CREATE INDEX index_name ON table_name USING gin ( to_tsvector('config', column) );
SELECT ts_rank(vector, query) AS rank ...;
```

- `to_tsquery`: cú pháp câu hỏi đầy đủ (`&`, `|`, `!`, `<->`).
- `plainto_tsquery`: chữ tự do, các từ được nối bằng `&`.
- `websearch_to_tsquery`: chữ kiểu ô tìm web, có `"crane was"` và `-depot`.
- `config`: phải ghi rõ trong index, ví dụ `'english'`.

## Ví dụ

Văn bản và câu hỏi sau khi chuẩn hóa:

```sql
SELECT to_tsvector('english', 'The harbor crane cranes again') AS vector,
       to_tsquery('english', 'harbor & cranes') AS query;
```

Kết quả: `'crane':3,4 'harbor':2` và `'harbor' & 'crane'`. "The" bị bỏ; "cranes" thành `crane`.

Ba cách dựng câu hỏi từ chữ người dùng:

```sql
SELECT plainto_tsquery('english', 'harbor cranes') AS plain,
       websearch_to_tsquery('english', 'harbor -depot "crane was"') AS web,
       phraseto_tsquery('english', 'crane was repaired') AS phrase;
```

`web` ra `'harbor' & !'depot' & 'crane'`; `phrase` ra `'crane' <2> 'repair'`, vì từ dừng "was" vẫn giữ chỗ của nó.

Tạo index rồi xem kế hoạch:

```sql
CREATE INDEX demo_fts ON articles USING gin (to_tsvector('english', body));
EXPLAIN SELECT id FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'crane & repaired');
```

Kế hoạch là `Bitmap Index Scan on demo_fts`: index trả danh sách bài, `Recheck Cond` kiểm lại từng bài.

## Lỗi hay gặp

Đưa chữ tự do cho `to_tsquery`:

```sql
-- ERROR 42601: syntax error in tsquery: "harbor crane"
SELECT to_tsquery('english', 'harbor crane');
```

Dùng `plainto_tsquery` hoặc `websearch_to_tsquery` cho chữ người dùng gõ.

Index không ghi tên cấu hình:

```sql
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX demo_bad ON articles USING gin (to_tsvector(body));
```

Hàm hai tham số không đổi kết quả theo phiên nên được phép; ghi `to_tsvector('english', body)`.

Ép chữ thẳng sang `tsquery`:

```sql
-- WRONG: ::tsquery does not normalise, 'cranes' never matches the lexeme crane
SELECT count(*) AS hits FROM articles WHERE to_tsvector('english', body) @@ 'cranes'::tsquery;
```

```sql
-- FIX: let to_tsquery normalise the word
SELECT count(*) AS hits FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'cranes');
```

Câu sai ra 0, câu đúng ra 300: phép ép kiểu không rút gọn từ.

## Thực hành

12.000 bài viết ngắn về hàng hóa. Tìm, xếp hạng, tạo index GIN, cho câu tìm dùng index, rồi viết một câu tìm đủ nhanh để qua thanh hiệu năng. Sau lab là hai câu hỏi.

## Tóm tắt

- `to_tsvector` tách và rút gọn từ; `@@` hỏi văn bản có khớp câu hỏi không.
- `to_tsquery` cần cú pháp `&`, `|`, `<->`; chữ người dùng gõ thì dùng `plainto_tsquery` hoặc `websearch_to_tsquery`.
- `ts_rank` xếp bài sát nhất lên đầu.
- Index GIN trên `to_tsvector('english', body)` chỉ giúp câu viết đúng biểu thức đó, có tên cấu hình.

# EN

## Opening

The warehouse has 12,000 shipping notes, and the maintenance crew wants every note about cranes at the harbor. `LIKE '%crane%'` misses "cranes", cannot put the closest notes first, and must read every row. Full-text search works with words instead of characters.

## Key idea

`to_tsvector('english', body)` turns text into a `tsvector`: a list of normalised "lexemes" with their positions. Stop words such as "the" and "was" are dropped, and "cranes" and "repaired" are reduced to their stems `crane`, `repair`. The `english` configuration decides how words are split and reduced; other languages need other configurations.

The question is a `tsquery`. `to_tsquery` takes its own syntax: `&` (and), `|` (or), `!` (not), `<->` (followed by), `<N>` (N positions apart). For free text typed by users, use `plainto_tsquery` (joins every word with `&`) or `websearch_to_tsquery` (understands quotes and a minus sign like a web search box). `vector @@ query` is true when the text matches the question. `ts_rank` scores by how often the words appear, so the closest articles come first.

The index to use for full-text search is GIN: each lexeme is a key with a list of the articles that contain it, so `harbor & crane` is just the intersection of two lists. There are two ways to set it up: index the expression `to_tsvector('english', body)` directly, or add a generated `tsvector` column and index that. A generated column costs storage, but queries are shorter and reading results does not recompute the vector.

Many people think `to_tsvector(body)` and `to_tsvector('english', body)` are the same, since the session uses `english`. In fact the version without a configuration depends on a session setting: it cannot be indexed, and it does not match an existing index either.

## Syntax

```sql
SELECT ... WHERE to_tsvector('config', column) @@ to_tsquery('config', 'word [ & | <-> ] word');
CREATE INDEX index_name ON table_name USING gin ( to_tsvector('config', column) );
SELECT ts_rank(vector, query) AS rank ...;
```

- `to_tsquery`: full query syntax (`&`, `|`, `!`, `<->`).
- `plainto_tsquery`: free text, words joined with `&`.
- `websearch_to_tsquery`: web-search-box text, with `"crane was"` and `-depot`.
- `config`: must be written in the index, for example `'english'`.

## Example

Text and question after normalisation:

```sql
SELECT to_tsvector('english', 'The harbor crane cranes again') AS vector,
       to_tsquery('english', 'harbor & cranes') AS query;
```

Result: `'crane':3,4 'harbor':2` and `'harbor' & 'crane'`. "The" is dropped; "cranes" becomes `crane`.

Three ways to build a question from user text:

```sql
SELECT plainto_tsquery('english', 'harbor cranes') AS plain,
       websearch_to_tsquery('english', 'harbor -depot "crane was"') AS web,
       phraseto_tsquery('english', 'crane was repaired') AS phrase;
```

`web` gives `'harbor' & !'depot' & 'crane'`; `phrase` gives `'crane' <2> 'repair'`, because the stop word "was" still keeps its position.

Create the index, then look at the plan:

```sql
CREATE INDEX demo_fts ON articles USING gin (to_tsvector('english', body));
EXPLAIN SELECT id FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'crane & repaired');
```

The plan is a `Bitmap Index Scan on demo_fts`: the index returns a list of articles, and `Recheck Cond` checks each one again.

## Common mistakes

Giving free text to `to_tsquery`:

```sql
-- ERROR 42601: syntax error in tsquery: "harbor crane"
SELECT to_tsquery('english', 'harbor crane');
```

Use `plainto_tsquery` or `websearch_to_tsquery` for what users type.

An index without a configuration name:

```sql
-- ERROR 42P17: functions in index expression must be marked IMMUTABLE
CREATE INDEX demo_bad ON articles USING gin (to_tsvector(body));
```

The two-argument function does not change with the session, so it is allowed; write `to_tsvector('english', body)`.

Casting text straight to `tsquery`:

```sql
-- WRONG: ::tsquery does not normalise, 'cranes' never matches the lexeme crane
SELECT count(*) AS hits FROM articles WHERE to_tsvector('english', body) @@ 'cranes'::tsquery;
```

```sql
-- FIX: let to_tsquery normalise the word
SELECT count(*) AS hits FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('english', 'cranes');
```

The wrong query finds 0, the right one 300: a cast does not reduce words.

## Practice

12,000 short articles about cargo. Search, rank, create a GIN index, make the search use it, then write a search fast enough to pass the performance bar. Two questions follow the lab.

## Recap

- `to_tsvector` splits and reduces words; `@@` asks whether the text matches the question.
- `to_tsquery` needs the `&`, `|`, `<->` syntax; for what users type, use `plainto_tsquery` or `websearch_to_tsquery`.
- `ts_rank` puts the closest articles first.
- A GIN index on `to_tsvector('english', body)` only helps queries that write that exact expression, configuration included.
