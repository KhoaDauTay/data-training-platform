---
id: pattern_match
title: "LIKE và ILIKE: tìm theo mẫu chữ"
title_en: "LIKE and ILIKE: search by a text pattern"
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-like-patterns, at: idea }]
objectives:
  - vi: Tìm dòng mà một cột chữ bắt đầu, kết thúc hay chứa một đoạn chữ.
    en: Find rows where a text column starts with, ends with or contains a piece of text.
  - vi: Dùng đúng hai ký tự đại diện `%` và `_`.
    en: Use the two wildcards `%` and `_` correctly.
  - vi: Chọn `ILIKE` khi chữ hoa thường không quan trọng.
    en: Pick `ILIKE` when upper and lower case do not matter.
syntax: |-
  SELECT column_1
  FROM table_name
  WHERE text_column [NOT] LIKE 'pattern'
  -- ILIKE: the same, ignoring upper/lower case
options:
  - { code: "%", vi: "bất kỳ chuỗi nào, kể cả rỗng", en: "any run of characters, including none" }
  - { code: "_", vi: "đúng một ký tự bất kỳ", en: "exactly one character" }
  - { code: "'abc%'", vi: "bắt đầu bằng abc", en: "starts with abc" }
  - { code: "'%abc'", vi: "kết thúc bằng abc", en: "ends with abc" }
  - { code: "'%abc%'", vi: "chứa abc ở bất kỳ đâu", en: "contains abc anywhere" }
  - { code: "ILIKE", vi: "như `LIKE` nhưng không phân biệt hoa thường (riêng Postgres)", en: "like `LIKE` but ignores case (Postgres only)" }
  - { code: "NOT LIKE", vi: "giữ dòng không khớp mẫu", en: "keeps the rows that do not match" }
examples:
  - title: { vi: "Chứa một từ", en: "Containing a word" }
    sql: |-
      SELECT name
      FROM products
      WHERE name LIKE '%water%'
    read:
      vi: "2 dòng: nước suối và nước dừa. `%` ở hai đầu nghĩa là \"water\" có thể ở bất kỳ đâu trong tên."
      en: "2 rows: the mineral water and the coconut water. The `%` at both ends means \"water\" can sit anywhere in the name."
  - title: { vi: "Bắt đầu bằng một chữ, không kể hoa thường", en: "Starting with a letter, any case" }
    sql: |-
      SELECT name
      FROM products
      WHERE name ILIKE 'c%'
    read:
      vi: "3 món bắt đầu bằng C: nước dừa, hạt điều, sô-cô-la. Với `ILIKE`, mẫu chữ thường `c` vẫn khớp chữ hoa `C`."
      en: "3 items starting with C: the coconut water, the cashew nuts, the chocolate bar. With `ILIKE`, the lower-case pattern `c` still matches the capital `C`."
  - title: { vi: "Kết thúc bằng một tên miền", en: "Ending with a domain" }
    sql: |-
      SELECT email
      FROM customers
      WHERE email LIKE '%@mail.vn'
      ORDER BY email
      LIMIT 5
    read:
      vi: "5 email đầu tiên (theo thứ tự chữ) của 72 khách dùng `mail.vn`. Mẫu không có `%` ở cuối nên email phải kết thúc đúng bằng `@mail.vn`."
      en: "The first 5 emails (alphabetically) of the 72 customers on `mail.vn`. The pattern has no `%` at the end, so the email must end exactly with `@mail.vn`."
  - title: { vi: "Số điện thoại có mã quốc gia", en: "Phone numbers with a country code" }
    sql: |-
      SELECT full_name, phone
      FROM raw_signups
      WHERE phone LIKE '+84%'
    read:
      vi: "28 đăng ký ghi số theo dạng quốc tế. Bảng `raw_signups` bẩn có chủ ý: các dòng khác có số dạng `0905…`, có dấu gạch hay khoảng trắng."
      en: "28 sign-ups wrote the number in international form. The `raw_signups` table is dirty on purpose: other rows have numbers like `0905…`, with dashes or spaces."
  - title: { vi: "Đúng một ký tự với dấu gạch dưới", en: "Exactly one character with the underscore" }
    sql: |-
      SELECT name
      FROM products
      WHERE name LIKE '_____ %'
    read:
      vi: "6 món có từ đầu tiên dài đúng 5 chữ (Green, Dried, Paper…). Mỗi `_` thay cho đúng một ký tự, còn khoảng trắng sau đó phải có thật."
      en: "6 items whose first word is exactly 5 letters long (Green, Dried, Paper…). Each `_` stands for exactly one character, and the space after them must really be there."
pitfalls:
  - title: { vi: "LIKE phân biệt hoa thường", en: "LIKE is case-sensitive" }
    wrong: "SELECT name FROM products WHERE name LIKE '%Water%'"
    fix: "SELECT name FROM products WHERE name ILIKE '%water%'"
    why:
      vi: "Trong dữ liệu, từ \"water\" viết thường, nên mẫu `%Water%` không khớp dòng nào: 0 dòng, không báo lỗi. Khi không chắc dữ liệu viết hoa thế nào, dùng `ILIKE`."
      en: "The data spells \"water\" in lower case, so the pattern `%Water%` matches nothing: 0 rows, no error. When you are not sure how the data is capitalised, use `ILIKE`."
  - title: { vi: "Quên ký tự đại diện", en: "Forgetting the wildcards" }
    wrong: "SELECT name FROM products WHERE name LIKE 'water'"
    fix: "SELECT name FROM products WHERE name LIKE '%water%'"
    why:
      vi: "Không có `%`, `LIKE 'water'` giống hệt `= 'water'`: chỉ khớp tên đúng bằng \"water\". Không món nào tên như vậy nên ra 0 dòng."
      en: "Without `%`, `LIKE 'water'` is the same as `= 'water'`: it only matches a name that is exactly \"water\". No item has that name, so 0 rows."
  - title: { vi: "Dùng dấu bằng với mẫu", en: "Using equals with a pattern" }
    wrong: "SELECT name FROM products WHERE name = '%water%'"
    fix: "SELECT name FROM products WHERE name LIKE '%water%' ORDER BY name"
    why:
      vi: "`=` không hiểu ký tự đại diện: nó tìm tên đúng bằng chuỗi `%water%`, có cả dấu phần trăm. Chỉ `LIKE` và `ILIKE` đọc `%` và `_` là ký tự đại diện."
      en: "`=` knows no wildcards: it looks for a name equal to the text `%water%`, percent signs included. Only `LIKE` and `ILIKE` read `%` and `_` as wildcards."
quiz:
  - q:
      vi: "`WHERE name LIKE 'Co%'` có khớp \"coconut water\" (viết thường) không?"
      en: "Does `WHERE name LIKE 'Co%'` match \"coconut water\" (lower case)?"
    options:
      - { vi: "Có, SQL không phân biệt hoa thường", en: "Yes, SQL ignores case" }
      - { vi: "Không, `LIKE` phân biệt hoa thường; dùng `ILIKE`", en: "No, `LIKE` is case-sensitive; use `ILIKE`" }
      - { vi: "Có, nếu cột kiểu text", en: "Yes, if the column is text" }
    answer: 1
    trap: 0
    why:
      vi: "Từ khóa SQL không phân biệt hoa thường (`select` hay `SELECT` đều được), nên nhiều người tưởng giá trị chữ cũng vậy. Trong Postgres, so chữ phân biệt hoa thường; `ILIKE` là cách bỏ qua."
      en: "SQL keywords ignore case (`select` or `SELECT` both work), so many people assume text values do too. In Postgres, text comparison is case-sensitive; `ILIKE` is the way around it."
  - q:
      vi: "Mẫu `'_a%'` khớp tên nào?"
      en: "Which names does the pattern `'_a%'` match?"
    options:
      - { vi: "Tên có chữ a ở vị trí thứ hai", en: "Names with an a in second place" }
      - { vi: "Tên bắt đầu bằng dấu gạch dưới rồi chữ a", en: "Names starting with an underscore and then an a" }
      - { vi: "Tên có chữ a ở bất kỳ đâu", en: "Names with an a anywhere" }
    answer: 0
    trap: 1
    why:
      vi: "Dấu `_` trông như một ký tự thật, nhưng trong `LIKE` nó là đại diện cho đúng một ký tự bất kỳ. Muốn tìm dấu gạch dưới thật, phải viết `\\_`."
      en: "The `_` looks like a literal character, but in `LIKE` it stands for exactly one character. To find a real underscore, write `\\_`."
recap:
  - vi: "`%` = bất kỳ chuỗi nào, `_` = đúng một ký tự; không có chúng thì `LIKE` giống `=`."
    en: "`%` = any run of characters, `_` = exactly one; without them `LIKE` acts like `=`."
  - vi: "`LIKE` phân biệt hoa thường; `ILIKE` thì không."
    en: "`LIKE` is case-sensitive; `ILIKE` is not."
  - vi: "Chỉ `LIKE`/`ILIKE` hiểu ký tự đại diện; `=` thì không."
    en: "Only `LIKE`/`ILIKE` understand wildcards; `=` does not."
sources:
  - https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-LIKE
---
## Mở bài

Một khách gọi tới: "Bên bạn có bán nước gì không, loại có chữ water ấy?" Bạn không biết tên đầy đủ của món, chỉ biết một đoạn chữ nằm đâu đó trong tên. Phép so bằng `=` không giúp được.

## Ý chính

`LIKE` so một cột chữ với một **mẫu**. Trong mẫu, `%` thay cho bất kỳ chuỗi nào (kể cả rỗng) và `_` thay cho đúng một ký tự; mọi ký tự khác phải khớp y hệt. `ILIKE` làm điều tương tự nhưng bỏ qua hoa thường. Thêm `NOT` để giữ những dòng không khớp.

Nhiều người nghĩ **so chữ trong SQL không phân biệt hoa thường**, vì từ khóa SQL viết sao cũng được. Thật ra dữ liệu thì khác: `LIKE '%Water%'` và `LIKE '%water%'` là hai mẫu khác nhau, và mẫu sai trả 0 dòng mà không cảnh báo.

## Cú pháp

Mẫu luôn nằm trong nháy đơn.

# EN

## Opening

A customer calls: "Do you sell any water, the kind with water in the name?" You do not know the item's full name, only a piece of text somewhere inside it. An equality test with `=` cannot help.

## Key idea

`LIKE` compares a text column with a **pattern**. In the pattern, `%` stands for any run of characters (even none) and `_` for exactly one character; every other character must match exactly. `ILIKE` does the same but ignores upper and lower case. Add `NOT` to keep the rows that do not match.

Many people think **text comparison in SQL ignores case**, because SQL keywords can be written either way. Data is different: `LIKE '%Water%'` and `LIKE '%water%'` are two different patterns, and the wrong one returns 0 rows without a warning.

## Syntax

The pattern always sits in single quotes.
