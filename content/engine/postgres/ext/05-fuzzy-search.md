---
id: e-pg-ext-05
engine: postgres
level: EXT
module: ext-text
title: "Tìm gần đúng: pg_trgm và fuzzystrmatch"
title_en: "Fuzzy search: pg_trgm and fuzzystrmatch"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-26" }
figures: [{ name: pg-ext-trigrams, at: idea }]
objectives:
  - vi: Đo độ giống của hai chuỗi bằng `similarity` và `word_similarity`, và lọc bằng toán tử `%`, `<%`.
    en: Measure how alike two strings are with `similarity` and `word_similarity`, and filter with the `%` and `<%` operators.
  - vi: Sửa mã gõ sai bằng `levenshtein`, khi chuỗi quá ngắn để trigram có ích.
    en: Fix a mistyped code with `levenshtein`, when the string is too short for trigrams to help.
  - vi: Biết vì sao `soundex` và `dmetaphone` không dùng được cho tên tiếng Việt.
    en: Know why `soundex` and `dmetaphone` do not work for Vietnamese names.
requires: [e-pg-ext-01]
sources:
  - https://www.postgresql.org/docs/18/pgtrgm.html
  - https://www.postgresql.org/docs/18/fuzzystrmatch.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
    CREATE TABLE shops (
      id int PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO shops VALUES
      (1, 'Den Long Hoi An'),
      (2, 'Den Long Pho Co'),
      (3, 'Long Den Ba Na'),
      (4, 'Hoi An Silk Lantern'),
      (5, 'Lantern Corner Da Nang'),
      (6, 'Den Giay Han Market'),
      (7, 'Pho Hoi Lamps'),
      (8, 'Hoi An Paper Lights'),
      (9, 'Den Tre Son Tra'),
      (10, 'Hoa Dang Hoi An');
    CREATE TABLE ports (
      code text PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Da Nang'), ('VNSGN', 'Ho Chi Minh (Cat Lai)'),
      ('VNHPH', 'Hai Phong'), ('SGSIN', 'Singapore'),
      ('THLCH', 'Laem Chabang'), ('HKHKG', 'Hong Kong'),
      ('CNSHA', 'Shanghai'), ('KRPUS', 'Busan'), ('JPTYO', 'Tokyo');
  steps:
    - task:
        vi: "Khách gõ \"Den Long Hoi Ann\". Lấy `id` và độ giống (`sim`, làm tròn 2 chữ số) của 3 quầy giống nhất, xếp theo độ giống gốc (chưa làm tròn) giảm dần; bằng nhau thì `id` nhỏ trước."
        en: "A customer types \"Den Long Hoi Ann\". Return the `id` and similarity (`sim`, rounded to 2 decimals) of the 3 most similar stalls, ordered by the raw similarity (before rounding), highest first; on a tie, smaller `id` first."
      solution: SELECT id, round(similarity(name, 'Den Long Hoi Ann')::numeric, 2) AS sim FROM shops ORDER BY similarity(name, 'Den Long Hoi Ann') DESC, id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`similarity(a, b)` từ 0 tới 1; sắp theo nó giảm dần rồi `LIMIT 3`."
        en: "`similarity(a, b)` runs from 0 to 1; sort by it descending, then `LIMIT 3`."
    - task:
        vi: "Quầy nào có trong tên một cụm gần giống \"Hoi Ann\" (toán tử độ giống theo từ, ngưỡng mặc định 0.6)? `id` và `name`, theo `id`."
        en: "Which stalls have a part of their name close to \"Hoi Ann\" (the word-similarity operator, default threshold 0.6)? `id` and `name`, by `id`."
      solution: SELECT id, name FROM shops WHERE 'Hoi Ann' <% name ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`'Hoi Ann' <% name` đúng khi `word_similarity('Hoi Ann', name)` vượt ngưỡng."
        en: "`'Hoi Ann' <% name` is true when `word_similarity('Hoi Ann', name)` passes the threshold."
    - task:
        vi: "Nhân viên gõ nhầm mã cảng thành `VNDDA`. Lấy mã cảng (`code`) cần ít lần sửa ký tự nhất để thành chuỗi đó; bằng nhau thì mã nhỏ trước."
        en: "Someone mistyped a port code as `VNDDA`. Return the port `code` that needs the fewest character edits to become that string; on a tie, the smaller code first."
      solution: SELECT code FROM ports ORDER BY levenshtein(code, 'VNDDA'), code LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "`levenshtein(a, b)` đếm số lần thêm, xóa hoặc thay một ký tự."
        en: "`levenshtein(a, b)` counts the single-character inserts, deletes and replacements."
    - task:
        vi: "Mã cảng nào cách `VNSGM` không quá một lần sửa? Cột `code`."
        en: "Which port codes are at most one edit away from `VNSGM`? Column `code`."
      solution: SELECT code FROM ports WHERE levenshtein(code, 'VNSGM') <= 1
      check: rows
      hint:
        vi: "`levenshtein(...) <= 1` trong `WHERE`."
        en: "`levenshtein(...) <= 1` in `WHERE`."
quiz:
  - q:
      vi: "`similarity('VNDAD', 'VNDDA')` chỉ là 0.33, còn `levenshtein` của chúng là 2. Mã cảng 5 ký tự gõ sai thì nên tìm bằng gì?"
      en: "`similarity('VNDAD', 'VNDDA')` is only 0.33, while their `levenshtein` is 2. Which tool should find a mistyped 5-character port code?"
    options:
      - { vi: "`similarity`, vì `pg_trgm` là công cụ tìm gần đúng chuẩn", en: "`similarity`, because `pg_trgm` is the standard fuzzy tool" }
      - { vi: "`levenshtein`, vì chuỗi ngắn có quá ít trigram để so", en: "`levenshtein`, because a short string has too few trigrams" }
      - { vi: "`soundex`, vì nó so cách đọc chứ không so chữ", en: "`soundex`, because it compares sound, not spelling" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `pg_trgm` là lựa chọn quen cho ô tìm kiếm, nhưng một chuỗi 5 ký tự chỉ có vài trigram, nên đổi chỗ hai chữ là mất gần hết điểm chung. `levenshtein` đếm thẳng số lần sửa: `VNDAD` cách `VNDDA` 2 lần, các mã khác từ 3 trở lên."
      en: "It sounds right because `pg_trgm` is the usual choice for a search box, but a 5-character string has only a few trigrams, so swapping two letters wipes out most of what they share. `levenshtein` counts the edits directly: `VNDAD` is 2 away from `VNDDA`, every other code 3 or more."
  - q:
      vi: "`difference('Hoi An', 'Hoa An')` trả 4, điểm cao nhất của `soundex`. Dùng `soundex` để gom tên tiếng Việt gần giống được không?"
      en: "`difference('Hoi An', 'Hoa An')` returns 4, the top `soundex` score. Can `soundex` group similar Vietnamese names?"
    options:
      - { vi: "Được: `soundex` so cách đọc, hợp với mọi ngôn ngữ", en: "Yes: `soundex` compares sound, which suits any language" }
      - { vi: "Không: luật của nó theo cách đọc tiếng Anh", en: "No: its rules follow English pronunciation" }
      - { vi: "Được, miễn là bỏ dấu tên trước khi so", en: "Yes, as long as the accents are removed first" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `soundex` sinh ra để so cách đọc, nhưng nó giữ chữ cái đầu rồi mã hóa phụ âm theo luật tiếng Anh và bỏ hết nguyên âm. \"Hoi An\" và \"Hoa An\" là hai nơi khác nhau mà vẫn được điểm tối đa; `dmetaphone('Nguyen')` ra `NKN`, đọc chữ \"g\" như tiếng Anh. Với tên Việt, dùng trigram trên chuỗi đã bỏ dấu."
      en: "It sounds right because `soundex` was made to compare sound, but it keeps the first letter, codes the consonants by English rules and drops every vowel. \"Hoi An\" and \"Hoa An\" are two different places yet score the maximum; `dmetaphone('Nguyen')` gives `NKN`, reading the \"g\" the English way. For Vietnamese names, use trigrams on the unaccented string."
---
## Mở bài

Khách của Chợ Lồng Đèn gõ "Den Long Hoi Ann" và mong thấy quầy "Den Long Hoi An". Nhân viên kho lại gõ mã cảng `VNDDA` thay vì `VNDAD`. Hai lỗi này cần hai công cụ khác nhau, và cả hai đều nằm trong các extension đi kèm PostgreSQL.

## Ý chính

`pg_trgm` cắt chuỗi thành các trigram: bộ ba ký tự liên tiếp, viết thường, có khoảng trắng đệm ở đầu và cuối mỗi từ. Độ giống là số trigram chung chia cho số trigram khác nhau của cả hai chuỗi, từ 0 tới 1. Phần index trigram cho `ILIKE` đã có ở bài `e-pg-l2-13`; bài này tập trung vào việc so độ giống.

- `similarity(a, b)` và toán tử `a % b` (đúng khi vượt `pg_trgm.similarity_threshold`, mặc định 0.3): so cả chuỗi.
- `word_similarity(a, b)` và `a <% b` (ngưỡng mặc định 0.6): tìm trong `b` một đoạn giống `a` nhất, hợp với ô tìm gõ vài chữ.
- `fuzzystrmatch` có `levenshtein(a, b)`: số lần thêm, xóa, thay một ký tự. Hợp với chuỗi ngắn như mã cảng, nơi trigram quá ít.
- `soundex`, `metaphone`, `dmetaphone` so cách đọc theo luật tiếng Anh.

Nhiều người nghĩ `soundex` "so cách đọc" nên dùng được cho mọi ngôn ngữ. Thật ra nó giữ chữ cái đầu, mã hóa phụ âm theo tiếng Anh và bỏ nguyên âm, nên với tên tiếng Việt nó gom nhầm và tách nhầm.

Hình ở cuối mục này cắt "Hoi An" và "Hoi Ann" thành trigram và đếm phần chung.

## Cú pháp

```sql
similarity(a, b)
a % b
word_similarity(a, b)
a <% b
levenshtein(a, b)
```

Ngưỡng của `%` và `<%` là tham số phiên: `SET pg_trgm.similarity_threshold = 0.4` và `pg_trgm.word_similarity_threshold`, cả hai trong khoảng 0 tới 1.

## Ví dụ

Trigram của hai cách gõ:

```sql
SELECT show_trgm('Hoi An') AS a,
       show_trgm('Hoi Ann') AS b;
```

7 và 8 trigram, chung 6.

```sql
SELECT similarity('Hoi Ann', 'Hoi An')
  AS sim;
```

6 chung trên 9 khác nhau: khoảng 0.67.

Các quầy vượt ngưỡng mặc định 0.3:

```sql
SELECT id, name FROM shops
WHERE name % 'Den Long Hoi Ann'
ORDER BY id;
```

4 quầy: `Den Long Hoi An` đứng đầu với 0.83, ba quầy kia chỉ quanh 0.35 đến 0.39.

Mã cảng gần mã gõ sai nhất:

```sql
SELECT code,
  levenshtein(code, 'VNDDA') AS edits
FROM ports
ORDER BY 2, 1 LIMIT 3;
```

`VNDAD` cần 2 lần sửa, các mã khác từ 3 trở lên.

## Lỗi hay gặp

Dùng `soundex` cho tên tiếng Việt:

```sql
-- WRONG: soundex follows English sounds
SELECT id, name FROM shops
WHERE soundex(name)
    = soundex('Hoi Ann')
ORDER BY id;
```

```sql
-- FIX: trigrams, part of the name
SELECT id, name FROM shops
WHERE 'Hoi Ann' <% name
ORDER BY id;
```

Bản sai không ra quầy nào: `soundex` chỉ nhìn chữ cái đầu và vài phụ âm của cả chuỗi. Bản sửa ra 4 quầy có "Hoi An" trong tên.

Đặt ngưỡng ngoài khoảng cho phép:

```sql
-- ERROR 22023: outside the valid range (0 .. 1)
SET pg_trgm.similarity_threshold = 2;
```

Ngưỡng là một tỉ lệ từ 0 tới 1. Ngưỡng thấp ra nhiều kết quả nhiễu, ngưỡng cao bỏ sót lỗi gõ.

## Thực hành

Tìm 3 quầy giống nhất với một tên gõ sai, tìm quầy có một phần tên gần giống, rồi sửa hai mã cảng gõ sai bằng `levenshtein`. Sau đó trả lời hai câu hỏi.

## Tóm tắt

- `similarity` và `%` so cả chuỗi; `word_similarity` và `<%` tìm đoạn giống nhất trong chuỗi dài.
- Độ giống là trigram chung chia trigram khác nhau, nên chuỗi càng ngắn càng dễ mất điểm.
- `levenshtein` đếm số lần sửa, hợp với mã ngắn như mã cảng.
- `soundex` và `dmetaphone` theo cách đọc tiếng Anh, không dùng cho tên tiếng Việt.

# EN

## Opening

A Lantern Market customer types "Den Long Hoi Ann" and expects the stall "Den Long Hoi An". A warehouse clerk types the port code `VNDDA` instead of `VNDAD`. These two mistakes need two different tools, and both ship as extensions with PostgreSQL.

## Key idea

`pg_trgm` cuts strings into trigrams: three consecutive characters, lower-cased, with spaces padded at the start and end of each word. Similarity is the number of shared trigrams divided by the number of distinct trigrams in both strings, from 0 to 1. The trigram index for `ILIKE` is in lesson `e-pg-l2-13`; this lesson is about comparing how alike strings are.

- `similarity(a, b)` and the operator `a % b` (true above `pg_trgm.similarity_threshold`, 0.3 by default): compare the whole string.
- `word_similarity(a, b)` and `a <% b` (default threshold 0.6): find the part of `b` most like `a`, which suits a search box with a few words typed.
- `fuzzystrmatch` has `levenshtein(a, b)`: the number of single-character inserts, deletes and replacements. It suits short strings such as port codes, where trigrams are too few.
- `soundex`, `metaphone` and `dmetaphone` compare pronunciation by English rules.

Many people think `soundex` "compares sound" and so works for any language. In fact it keeps the first letter, codes the consonants the English way and drops the vowels, so with Vietnamese names it groups the wrong names together and splits the right ones.

The figure at the end of this section cuts "Hoi An" and "Hoi Ann" into trigrams and counts what they share.

## Syntax

```sql
similarity(a, b)
a % b
word_similarity(a, b)
a <% b
levenshtein(a, b)
```

The thresholds of `%` and `<%` are session settings: `SET pg_trgm.similarity_threshold = 0.4` and `pg_trgm.word_similarity_threshold`, both between 0 and 1.

## Example

The trigrams of two spellings:

```sql
SELECT show_trgm('Hoi An') AS a,
       show_trgm('Hoi Ann') AS b;
```

7 and 8 trigrams, 6 shared.

```sql
SELECT similarity('Hoi Ann', 'Hoi An')
  AS sim;
```

6 shared out of 9 distinct: about 0.67.

The stalls above the default 0.3 threshold:

```sql
SELECT id, name FROM shops
WHERE name % 'Den Long Hoi Ann'
ORDER BY id;
```

4 stalls: `Den Long Hoi An` leads with 0.83, the other three only around 0.35 to 0.39.

The port codes closest to the mistyped one:

```sql
SELECT code,
  levenshtein(code, 'VNDDA') AS edits
FROM ports
ORDER BY 2, 1 LIMIT 3;
```

`VNDAD` needs 2 edits, every other code 3 or more.

## Common mistakes

Using `soundex` for Vietnamese names:

```sql
-- WRONG: soundex follows English sounds
SELECT id, name FROM shops
WHERE soundex(name)
    = soundex('Hoi Ann')
ORDER BY id;
```

```sql
-- FIX: trigrams, part of the name
SELECT id, name FROM shops
WHERE 'Hoi Ann' <% name
ORDER BY id;
```

The wrong version finds no stall: `soundex` only looks at the first letter and a few consonants of the whole string. The fix finds the 4 stalls with "Hoi An" in their name.

Setting a threshold outside its range:

```sql
-- ERROR 22023: outside the valid range (0 .. 1)
SET pg_trgm.similarity_threshold = 2;
```

The threshold is a ratio from 0 to 1. A low threshold brings noisy matches, a high one misses typos.

## Practice

Find the 3 stalls most like a mistyped name, find the stalls with a part of their name close to a search, then fix two mistyped port codes with `levenshtein`. Then answer two questions.

## Recap

- `similarity` and `%` compare whole strings; `word_similarity` and `<%` find the most similar part of a longer string.
- Similarity is shared trigrams over distinct trigrams, so the shorter the string, the easier it loses points.
- `levenshtein` counts edits, which suits short codes such as port codes.
- `soundex` and `dmetaphone` follow English pronunciation and do not work for Vietnamese names.
