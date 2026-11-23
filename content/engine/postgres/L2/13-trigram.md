---
id: e-pg-l2-13
engine: postgres
level: L2
module: search
title: "pg_trgm: index cho LIKE '%...%'"
title_en: "pg_trgm: an index for LIKE '%...%'"
kind: predict
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Làm ô tìm tên "chứa chuỗi" (`ILIKE '%...%'`) dùng được index nhờ `pg_trgm`.
    en: Make a "contains" name search (`ILIKE '%...%'`) use an index with `pg_trgm`.
  - vi: Tìm tên gần giống (gõ sai chính tả) bằng `similarity`.
    en: Find near-matching names (typos) with `similarity`.
  - vi: Biết khi nào index trigram không giúp được, ví dụ chuỗi tìm quá ngắn.
    en: Know when a trigram index cannot help, for example when the search string is too short.
requires: [e-pg-l2-12]
sources:
  - https://www.postgresql.org/docs/18/pgtrgm.html
  - https://www.postgresql.org/docs/18/indexes-types.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE TABLE customers (
      id int PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO customers
    SELECT g,
           (ARRAY['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vo', 'Dang', 'Bui'])[1 + g % 8] || ' '
           || (ARRAY['Van', 'Thi', 'Minh', 'Quoc', 'Ngoc'])[1 + (g / 8) % 5] || ' '
           || (ARRAY['An', 'Binh', 'Chau', 'Dung', 'Giang', 'Hieu', 'Khanh', 'Lan', 'My', 'Nam',
                     'Oanh', 'Phuc', 'Quan', 'Son', 'Tam', 'Uyen', 'Vy', 'Xuan', 'Yen'])[1 + (g / 40) % 19]
           || ' ' || g
    FROM generate_series(1, 30000) AS g;
    CREATE INDEX customers_name_trgm ON customers USING gin (name gin_trgm_ops);
    ANALYZE customers;
  steps:
    - task:
        vi: "Khách gõ nhầm \"Nguyen Ngoc Uyn 12032\". Lấy `id` và độ giống (`similarity`, làm tròn 2 chữ số) của 3 tên giống nhất, xếp theo độ giống gốc (chưa làm tròn); bằng nhau thì `id` nhỏ trước."
        en: "A user mistyped \"Nguyen Ngoc Uyn 12032\". Return the `id` and similarity (`similarity`, rounded to 2 decimals) of the 3 most similar names, ordered by the raw similarity (before rounding); on a tie, smaller `id` first."
      solution: SELECT id, round(similarity(name, 'Nguyen Ngoc Uyn 12032')::numeric, 2) AS sim FROM customers ORDER BY similarity(name, 'Nguyen Ngoc Uyn 12032') DESC, id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`similarity(a, b)` từ 0 tới 1: tỉ lệ bộ ba ký tự chung."
        en: "`similarity(a, b)` runs from 0 to 1: the share of common three-letter groups."
predict:
  sql: SELECT id, name FROM customers WHERE name ILIKE '%ngoc uyen 12%'
  expect: { node: Bitmap Index Scan, index: customers_name_trgm }
  q:
    vi: "Tìm tên chứa \"ngoc uyen 12\" ở giữa, không phân biệt hoa thường. Có index GIN `gin_trgm_ops` trên `name`. Kế hoạch là gì?"
    en: "Search for names containing \"ngoc uyen 12\" in the middle, ignoring case. There is a GIN `gin_trgm_ops` index on `name`. What is the plan?"
  options:
    - { vi: "Seq Scan: `LIKE` có `%` ở đầu thì không index nào dùng được", en: "Seq Scan: no index can serve a `LIKE` that starts with `%`" }
    - { vi: "Bitmap Heap Scan qua `customers_name_trgm`, rồi `Recheck Cond`", en: "Bitmap Heap Scan through `customers_name_trgm`, then `Recheck Cond`" }
    - { vi: "Index Scan trả đúng các dòng khớp, không cần kiểm lại", en: "Index Scan returning exactly the matching rows, no recheck" }
  answer: 1
  trap: 0
  why:
    vi: "Nghe hợp lý vì với B-tree, đúng là `%` ở đầu làm index vô dụng. Nhưng `pg_trgm` tách chuỗi thành các bộ ba ký tự (\"ngo\", \"goc\", \"oc \"...) và GIN lưu mỗi bộ ba kèm danh sách dòng. Câu `ILIKE '%ngoc uyen 12%'` lấy giao các danh sách đó, rồi `Recheck Cond` kiểm lại chuỗi thật, vì có bộ ba chung chưa chắc đã khớp cả cụm."
    en: "It sounds right because with a B-tree a leading `%` does make the index useless. But `pg_trgm` splits strings into three-letter groups (\"ngo\", \"goc\", \"oc \"...) and GIN stores each group with its list of rows. `ILIKE '%ngoc uyen 12%'` intersects those lists, then `Recheck Cond` checks the real string, because sharing trigrams does not guarantee the whole phrase matches."
quiz:
  - q:
      vi: "Cùng index `customers_name_trgm`, ô tìm nhận chuỗi ngắn: `WHERE name ILIKE '%an%'`. Kế hoạch là gì?"
      en: "Same `customers_name_trgm` index, and the search box gets a short string: `WHERE name ILIKE '%an%'`. What is the plan?"
    options:
      - { vi: "Bitmap Index Scan qua `customers_name_trgm`, vì có index trigram thì mọi `ILIKE` đều dùng nó", en: "Bitmap Index Scan through `customers_name_trgm`, because with a trigram index every `ILIKE` uses it" }
      - { vi: "Seq Scan: hai ký tự không tạo ra trigram nào trọn vẹn, nên index không lọc được gì", en: "Seq Scan: two characters make no complete trigram, so the index cannot filter anything" }
      - { vi: "Index Only Scan, vì chỉ cần cột `name`", en: "Index Only Scan, because only column `name` is needed" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì câu dài hơn vừa đi qua index, nhưng index trigram chỉ tìm được bằng các bộ ba nằm trọn trong mẫu. `%an%` không có bộ ba nào, và chuỗi \"an\" lại có trong hơn nửa số tên, nên Postgres đọc cả bảng. Ô tìm thật thường đợi người dùng gõ ít nhất 3 ký tự."
      en: "It sounds right because the longer search just went through the index, but a trigram index can only search with groups of three that lie entirely inside the pattern. `%an%` has none, and \"an\" appears in more than half of the names anyway, so Postgres reads the whole table. Real search boxes usually wait for at least 3 characters."
---
## Mở bài

Ô tìm khách hàng của tổng đài cho gõ một mẩu bất kỳ của tên, như "ngoc uyen", và mỗi lần gõ là một lần quét 30.000 dòng. Nhân viên còn hay gõ sai dấu, sai chữ. Liệu một index có giúp được câu `ILIKE` bắt đầu bằng `%`?

## Ý chính

B-tree chỉ giúp tìm theo tiền tố, `LIKE 'abc%'`, và cả việc đó cũng chỉ khi collation là `C` hoặc index dùng `text_pattern_ops`. Ô tìm kiếm thật thường là "chứa": `ILIKE '%abc%'`. Không biết chuỗi bắt đầu bằng gì thì B-tree không có điểm nào để bắt đầu tìm.

Extension `pg_trgm` cắt chuỗi thành các trigram: bộ ba ký tự liên tiếp, đã viết thường, có thêm khoảng trắng đệm ở đầu và cuối mỗi từ. Hai chuỗi giống nhau thì có nhiều trigram chung, và một chuỗi chứa "ngoc uyen" thì chắc chắn chứa mọi bộ ba của "ngoc uyen".

- Index `USING gin (name gin_trgm_ops)` (hoặc `gist_trgm_ops`) phục vụ `LIKE`, `ILIKE`, biểu thức chính quy và toán tử giống nhau `%`.
- `similarity(a, b)` trả 0 tới 1: tỉ lệ trigram chung. Toán tử `a % b` đúng khi độ giống vượt ngưỡng `pg_trgm.similarity_threshold` (mặc định 0.3).
- Index là "thô": nó tìm dòng có đủ trigram, rồi Postgres kiểm lại chuỗi thật ở bước `Recheck Cond`.
- Mẫu không có bộ ba nào trọn vẹn (như `%an%`) thì index không lọc được gì.

Nhiều người nghĩ `%` ở đầu mẫu luôn làm mọi index vô dụng. Thật ra điều đó chỉ đúng với B-tree; index trigram được làm ra chính cho loại câu này.

## Ví dụ

```sql
SELECT show_trgm('Ngoc') AS trigrams;
```

Kết quả: `{"  n"," ng",goc,ngo,"oc "}` (đã viết thường, có khoảng trắng đệm).

```sql
SELECT similarity('Nguyen Ngoc Uyen', 'Nguyen Ngoc Uyn') AS sim, show_limit() AS threshold;
```

Hai tên chỉ lệch một chữ vẫn giống nhau khoảng 0.86, trên ngưỡng 0.3, nên `%` coi chúng là gần giống.

## Thực hành

Đoán kế hoạch của một câu `ILIKE '%...%'`, xem kế hoạch thật, tìm tên gần giống với một tên gõ sai, rồi trả lời một câu hỏi về chuỗi tìm quá ngắn.

## Tóm tắt

- B-tree chỉ giúp tiền tố; `ILIKE '%abc%'` cần index trigram `gin_trgm_ops`.
- Index trigram là thô: tìm qua các bộ ba, rồi `Recheck Cond` kiểm chuỗi thật.
- `similarity` và `%` tìm tên gần giống khi người dùng gõ sai.
- Mẫu quá ngắn không có trigram trọn vẹn, nên Postgres quay về Seq Scan.

# EN

## Opening

The call centre's customer search lets staff type any piece of a name, such as "ngoc uyen", and every keystroke scans 30,000 rows. Staff also mistype letters. Can an index help an `ILIKE` that starts with `%`?

## Key idea

A B-tree only helps prefix searches, `LIKE 'abc%'`, and even that only when the collation is `C` or the index uses `text_pattern_ops`. Real search boxes usually mean "contains": `ILIKE '%abc%'`. Without knowing how the string starts, a B-tree has nowhere to begin.

The `pg_trgm` extension cuts strings into trigrams: three consecutive characters, lower-cased, with spaces padded at the start and end of each word. Similar strings share many trigrams, and a string containing "ngoc uyen" surely contains every trigram of "ngoc uyen".

- An index `USING gin (name gin_trgm_ops)` (or `gist_trgm_ops`) serves `LIKE`, `ILIKE`, regular expressions and the similarity operator `%`.
- `similarity(a, b)` returns 0 to 1: the share of common trigrams. The operator `a % b` is true when similarity passes the `pg_trgm.similarity_threshold` (0.3 by default).
- The index is lossy: it finds rows with all the trigrams, then Postgres checks the real string in a `Recheck Cond` step.
- A pattern with no complete trigram (such as `%an%`) gives the index nothing to filter on.

Many people think a leading `%` makes every index useless. In fact that is only true of a B-tree; trigram indexes were made for exactly this kind of query.

## Example

```sql
SELECT show_trgm('Ngoc') AS trigrams;
```

Result: `{"  n"," ng",goc,ngo,"oc "}` (lower-cased, with padding spaces).

```sql
SELECT similarity('Nguyen Ngoc Uyen', 'Nguyen Ngoc Uyn') AS sim, show_limit() AS threshold;
```

Two names one letter apart are still about 0.86 alike, above the 0.3 threshold, so `%` treats them as close.

## Practice

Guess the plan of an `ILIKE '%...%'` query, see the real plan, find names close to a mistyped one, then answer a question about a search string that is too short.

## Recap

- A B-tree only helps prefixes; `ILIKE '%abc%'` needs a `gin_trgm_ops` trigram index.
- A trigram index is lossy: it searches through the groups of three, then `Recheck Cond` checks the real string.
- `similarity` and `%` find close names when users mistype.
- A pattern that is too short has no complete trigram, so Postgres falls back to a Seq Scan.
