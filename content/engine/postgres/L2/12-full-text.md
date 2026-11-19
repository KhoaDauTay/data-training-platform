---
id: e-pg-l2-12
engine: postgres
level: L2
module: search
title: Tìm kiếm toàn văn với tsvector và GIN
title_en: Full-text search with tsvector and GIN
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-gin-postings
objectives:
  - vi: Viết tìm kiếm theo từ bằng `to_tsvector`, `to_tsquery` và `@@`, xếp hạng bằng `ts_rank`.
    en: Write word search with `to_tsvector`, `to_tsquery` and `@@`, and rank with `ts_rank`.
  - vi: Tạo index GIN trên biểu thức `to_tsvector('english', body)` và viết câu khớp đúng biểu thức đó.
    en: Create a GIN index on the expression `to_tsvector('english', body)` and write queries that match it exactly.
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
---
## Ý chính

`LIKE '%crane%'` so chuỗi ký tự: không hiểu từ, không hiểu "cranes" là dạng của "crane", và không xếp hạng được. Tìm kiếm toàn văn thì làm việc với từ:

- `to_tsvector('english', body)` tách văn bản thành các "lexeme" đã chuẩn hóa (bỏ từ dừng như "the", đưa "cranes" về `crane`), kèm vị trí.
- `to_tsquery('english', 'harbor & crane')` là câu hỏi: `&` (và), `|` (hoặc), `!` (không), `<->` (từ liền sau).
- `vector @@ query` đúng khi văn bản khớp câu hỏi.
- `ts_rank` cho điểm theo tần suất từ, để xếp kết quả.

Index được khuyên dùng cho tìm kiếm toàn văn là GIN: mỗi lexeme là một khóa, kèm danh sách bài chứa nó. Có thể index thẳng biểu thức `to_tsvector('english', body)` (khi đó câu phải viết đúng biểu thức đó) hoặc lưu sẵn một cột `tsvector` tính sẵn.

## Ví dụ

```sql
SELECT to_tsvector('english', 'The harbor crane cranes again') AS vector,
       to_tsquery('english', 'harbor & cranes') AS query;
```

Kết quả: `'crane':3,4 'harbor':2` và `'harbor' & 'crane'`. "The" bị bỏ; "cranes" thành `crane`.

## Thực hành

12 000 bài viết ngắn về hàng hóa. Tìm, xếp hạng, rồi làm câu tìm dùng index GIN.

# EN

## Key idea

`LIKE '%crane%'` compares characters: it does not know words, does not know "cranes" is a form of "crane", and cannot rank. Full-text search works with words:

- `to_tsvector('english', body)` splits text into normalised "lexemes" (dropping stop words such as "the", turning "cranes" into `crane`), with positions.
- `to_tsquery('english', 'harbor & crane')` is the question: `&` (and), `|` (or), `!` (not), `<->` (followed by).
- `vector @@ query` is true when the text matches the question.
- `ts_rank` scores by word frequency, so results can be ordered.

GIN is the preferred index type for full-text search: each lexeme is a key with a list of the articles that contain it. You can index the expression `to_tsvector('english', body)` directly (queries must then use that exact expression) or keep a generated `tsvector` column.

## Example

```sql
SELECT to_tsvector('english', 'The harbor crane cranes again') AS vector,
       to_tsquery('english', 'harbor & cranes') AS query;
```

Result: `'crane':3,4 'harbor':2` and `'harbor' & 'crane'`. "The" is dropped; "cranes" becomes `crane`.

## Practice

12,000 short articles about cargo. Search, rank, then make the search use a GIN index.
