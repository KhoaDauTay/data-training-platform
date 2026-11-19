---
id: e-pg-l2-13
engine: postgres
level: L2
module: search
title: "pg_trgm: index cho LIKE '%...%'"
title_en: "pg_trgm: an index for LIKE '%...%'"
kind: predict
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Làm ô tìm tên "chứa chuỗi" (`ILIKE '%...%'`) dùng được index nhờ `pg_trgm`.
    en: Make a "contains" name search (`ILIKE '%...%'`) use an index with `pg_trgm`.
  - vi: Tìm tên gần giống (gõ sai chính tả) bằng `similarity`.
    en: Find near-matching names (typos) with `similarity`.
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
        vi: "Khách gõ nhầm \"Nguyen Ngoc Uyn 12032\". Lấy `id` và độ giống (`similarity`, làm tròn 2 chữ số) của 3 tên giống nhất; bằng nhau thì `id` nhỏ trước."
        en: "A user mistyped \"Nguyen Ngoc Uyn 12032\". Return the `id` and similarity (`similarity`, rounded to 2 decimals) of the 3 most similar names; on a tie, smaller `id` first."
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
  why:
    vi: "Với B-tree, đúng là `%` ở đầu làm index vô dụng. Nhưng `pg_trgm` tách chuỗi thành các bộ ba ký tự (\"ngo\", \"goc\", \"oc \"...) và GIN lưu mỗi bộ ba kèm danh sách dòng. Câu `ILIKE '%ngoc uyen 12%'` lấy giao các danh sách đó, rồi `Recheck Cond` kiểm lại chuỗi thật, vì có bộ ba chung chưa chắc đã khớp cả cụm."
    en: "With a B-tree, a leading `%` does make the index useless. But `pg_trgm` splits strings into three-letter groups (\"ngo\", \"goc\", \"oc \"...) and GIN stores each group with its list of rows. `ILIKE '%ngoc uyen 12%'` intersects those lists, then `Recheck Cond` checks the real string, because sharing trigrams does not guarantee the whole phrase matches."
---
## Ý chính

B-tree chỉ giúp `LIKE 'abc%'` (tiền tố). Ô tìm kiếm thật thường là "chứa": `ILIKE '%abc%'`, và B-tree không làm được.

Extension `pg_trgm` cắt chuỗi thành các trigram (bộ ba ký tự liên tiếp, có thêm khoảng trắng ở đầu và cuối từ). Hai chuỗi giống nhau thì có nhiều trigram chung.

- Index `USING gin (name gin_trgm_ops)` (hoặc `gist_trgm_ops`) phục vụ `LIKE`, `ILIKE`, biểu thức chính quy và toán tử giống nhau `%`.
- `similarity(a, b)` trả 0 tới 1; hợp cho gợi ý khi người dùng gõ sai.
- Index là "thô": nó tìm dòng có đủ trigram, rồi Postgres kiểm lại chuỗi thật.
- Chuỗi tìm quá ngắn (dưới 3 ký tự) cho ít trigram, nên index giúp được rất ít.

## Ví dụ

```sql
SELECT show_trgm('Ngoc') AS trigrams;
```

Kết quả: `{"  n"," ng",goc,ngo,"oc "}` (đã viết thường, có khoảng trắng đệm).

## Thực hành

Đoán kế hoạch của một câu `ILIKE '%...%'`, xem kế hoạch thật, rồi tìm tên gần giống với một tên gõ sai.

# EN

## Key idea

A B-tree only helps `LIKE 'abc%'` (a prefix). Real search boxes usually mean "contains": `ILIKE '%abc%'`, which a B-tree cannot do.

The `pg_trgm` extension cuts strings into trigrams (three consecutive characters, with spaces padded at word edges). Similar strings share many trigrams.

- An index `USING gin (name gin_trgm_ops)` (or `gist_trgm_ops`) serves `LIKE`, `ILIKE`, regular expressions and the similarity operator `%`.
- `similarity(a, b)` returns 0 to 1; handy for suggestions when users mistype.
- The index is lossy: it finds rows with all the trigrams, then Postgres rechecks the real string.
- A very short search string (under 3 characters) yields few trigrams, so the index helps very little.

## Example

```sql
SELECT show_trgm('Ngoc') AS trigrams;
```

Result: `{"  n"," ng",goc,ngo,"oc "}` (lower-cased, with padding spaces).

## Practice

Guess the plan of an `ILIKE '%...%'` query, see the real plan, then find names close to a mistyped one.
