---
id: string_fn
title: "Hàm chuỗi: làm sạch và cắt ghép chữ"
title_en: "String functions: clean, cut and join text"
minutes: 25
figures: [{ name: sql-text-functions, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Làm sạch chữ nhập tay bằng `trim`, `lower`, `upper`, `replace`.
    en: Clean hand-typed text with `trim`, `lower`, `upper`, `replace`.
  - vi: Cắt một phần chuỗi bằng `left`, `substring`, `split_part` và đo độ dài bằng `length`.
    en: Cut part of a string with `left`, `substring`, `split_part` and measure it with `length`.
  - vi: Ghép chữ bằng `||` và biết khi nào ô trống làm mất cả chuỗi.
    en: Join text with `||` and know when an empty cell wipes out the whole string.
syntax: |-
  SELECT upper(trim(column)) AS clean,
         split_part(email, '@', 2) AS domain,
         first_name || ' ' || last_name AS full_name
  FROM table_name
options:
  - { code: "trim(s)", vi: "bỏ khoảng trắng ở hai đầu", en: "removes spaces at both ends" }
  - { code: "lower(s) / upper(s)", vi: "đổi cả chuỗi sang chữ thường / chữ hoa", en: "turns the whole string lower / upper case" }
  - { code: "replace(s, from, to)", vi: "thay mọi lần xuất hiện của một đoạn", en: "replaces every occurrence of a piece" }
  - { code: "left(s, n) / substring(s, start, n)", vi: "lấy n ký tự đầu / từ vị trí start (đếm từ 1)", en: "takes the first n characters / n from position start (counting from 1)" }
  - { code: "split_part(s, sep, k)", vi: "phần thứ k khi cắt chuỗi theo dấu sep", en: "the k-th piece when the string is cut at sep" }
  - { code: "length(s)", vi: "số ký tự", en: "number of characters" }
  - { code: "a || b", vi: "ghép hai chuỗi; một bên NULL thì kết quả NULL", en: "joins two strings; if one side is NULL the result is NULL" }
  - { code: "concat_ws(sep, a, b)", vi: "ghép có dấu ngăn, bỏ qua NULL", en: "joins with a separator, skipping NULLs" }
examples:
  - title: { vi: "Làm sạch tên nhập tay", en: "Cleaning typed-in names" }
    sql: |-
      SELECT full_name, upper(trim(full_name)) AS clean
      FROM raw_signups
      ORDER BY id
      LIMIT 5
    read:
      vi: "Cột gốc có khoảng trắng thừa và hoa thường lẫn lộn (`  HOANG GIA HUY`, `tran thi binh  `). Sau `trim` rồi `upper`, cả 5 tên cùng một dạng. Hàm lồng nhau chạy từ trong ra ngoài."
      en: "The source column has extra spaces and mixed case (`  HOANG GIA HUY`, `tran thi binh  `). After `trim` and then `upper`, all 5 names share one form. Nested functions run from the inside out."
  - title: { vi: "Lấy tên miền của email", en: "Taking the domain of an email" }
    sql: |-
      SELECT email, split_part(email, '@', 2) AS domain
      FROM customers
      WHERE id <= 5
    read:
      vi: "5 dòng, cột `domain` là phần sau dấu `@`: `mail.vn`, `outlook.com`… Cắt theo dấu ngăn thì `split_part` gọn hơn đếm vị trí."
      en: "5 rows; the `domain` column is the part after `@`: `mail.vn`, `outlook.com`… When cutting at a separator, `split_part` is simpler than counting positions."
  - title: { vi: "Độ dài và vài ký tự đầu", en: "Length and the first few characters" }
    sql: |-
      SELECT name, length(name) AS chars, left(name, 5) AS short
      FROM products
      WHERE category = 'Drinks'
    read:
      vi: "6 đồ uống. Tên dài nhất là nước suối (18 ký tự); `left(name, 5)` lấy 5 ký tự đầu, kể cả khoảng trắng (`Iced `)."
      en: "6 drinks. The longest name is the mineral water (18 characters); `left(name, 5)` takes the first 5 characters, spaces included (`Iced `)."
  - title: { vi: "Ghép thành một nhãn", en: "Joining into one label" }
    sql: |-
      SELECT name || ' (' || category || ')' AS label
      FROM products
      WHERE price_vnd > 100000
    read:
      vi: "4 nhãn như `Desk lamp (Stationery)`. `||` nối các mảnh theo đúng thứ tự viết; khoảng trắng và ngoặc cũng là mảnh chữ."
      en: "4 labels such as `Desk lamp (Stationery)`. `||` joins the pieces in the order written; the space and the brackets are text pieces too."
  - title: { vi: "Bỏ khoảng trắng bên trong số điện thoại", en: "Removing spaces inside phone numbers" }
    sql: |-
      SELECT replace(phone, ' ', '') AS phone
      FROM raw_signups
      ORDER BY id
      LIMIT 6
    read:
      vi: "`0905 185 455` thành `0905185455`. `replace` chỉ thay đúng đoạn bạn đưa, nên số có dấu gạch (`090-5074-182`) vẫn giữ nguyên; ô trống vẫn trống."
      en: "`0905 185 455` becomes `0905185455`. `replace` only swaps the exact piece you give it, so a number with dashes (`090-5074-182`) stays as it is; an empty cell stays empty."
pitfalls:
  - title: { vi: "Ghép với một ô trống", en: "Joining with an empty cell" }
    wrong: "SELECT name || ', ' || city AS label FROM customers WHERE id BETWEEN 15 AND 18"
    fix: "SELECT concat_ws(', ', name, city) AS label FROM customers WHERE id BETWEEN 15 AND 18"
    why:
      vi: "Khách 17 chưa có thành phố, và `||` gặp NULL thì cả chuỗi thành NULL: tên khách cũng biến mất. `concat_ws` bỏ qua phần trống và vẫn giữ tên."
      en: "Customer 17 has no city, and `||` meeting a NULL turns the whole string into NULL: the name vanishes too. `concat_ws` skips the empty part and keeps the name."
  - title: { vi: "Đếm vị trí từ 0", en: "Counting positions from 0" }
    wrong: "SELECT substring(email, 0, 5) AS first5 FROM customers WHERE id <= 3"
    fix: "SELECT substring(email, 1, 5) AS first5 FROM customers WHERE id <= 3"
    why:
      vi: "Trong SQL, ký tự đầu tiên ở vị trí 1. Bắt đầu từ 0 thì Postgres tính cả một vị trí \"trước chuỗi\", nên chỉ ra 4 ký tự mà không báo lỗi."
      en: "In SQL the first character is at position 1. Starting at 0, Postgres counts a position \"before the string\", so you get only 4 characters and no error."
  - title: { vi: "So chữ khi còn khoảng trắng thừa", en: "Comparing text that still has extra spaces" }
    wrong: "SELECT id FROM raw_signups WHERE lower(full_name) = 'tran thi binh'"
    fix: "SELECT id FROM raw_signups WHERE lower(trim(full_name)) = 'tran thi binh'"
    why:
      vi: "`lower` sửa hoa thường nhưng không sửa khoảng trắng: `tran thi binh  ` có hai dấu cách ở cuối nên không bằng. Làm sạch đủ cả hai rồi mới so."
      en: "`lower` fixes the case but not the spaces: `tran thi binh  ` has two trailing spaces, so it is not equal. Clean both before comparing."
quiz:
  - q:
      vi: "`'Hue' || NULL` cho ra gì?"
      en: "What does `'Hue' || NULL` give?"
    options:
      - { vi: "`Hue`, vì NULL là chuỗi rỗng", en: "`Hue`, because NULL is an empty string" }
      - { vi: "NULL", en: "NULL" }
      - { vi: "Lỗi kiểu dữ liệu", en: "A type error" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều ngôn ngữ coi giá trị trống như chuỗi rỗng khi ghép. Với `||` của SQL, NULL là \"không biết\", và ghép với cái không biết thì ra không biết. Dùng `concat_ws` hoặc `concat` khi cột có thể trống."
      en: "Many languages treat a missing value as an empty string when joining. With SQL's `||`, NULL means \"unknown\", and joining with an unknown gives an unknown. Use `concat_ws` or `concat` when a column may be empty."
  - q:
      vi: "`upper(trim(name))` chạy hàm nào trước?"
      en: "Which function runs first in `upper(trim(name))`?"
    options:
      - { vi: "`trim`, hàm bên trong chạy trước", en: "`trim`, the inner function runs first" }
      - { vi: "`upper`, vì nó viết trước", en: "`upper`, because it is written first" }
      - { vi: "Cả hai cùng lúc", en: "Both at once" }
    answer: 0
    trap: 1
    why:
      vi: "Đọc từ trái sang phải thì dễ tưởng `upper` trước. Như trong toán, giá trị bên trong ngoặc phải có trước: `trim` cho ra chuỗi sạch, rồi `upper` đổi nó thành chữ hoa."
      en: "Reading left to right suggests `upper` goes first. As in maths, the value inside the brackets has to exist first: `trim` produces the clean string, then `upper` turns it upper case."
recap:
  - vi: "`trim`, `lower`/`upper`, `replace` làm sạch; `left`, `substring`, `split_part` cắt; `length` đo."
    en: "`trim`, `lower`/`upper`, `replace` clean; `left`, `substring`, `split_part` cut; `length` measures."
  - vi: "Vị trí ký tự đếm từ 1."
    en: "Character positions count from 1."
  - vi: "`||` với một NULL là NULL; `concat_ws` bỏ qua NULL."
    en: "`||` with a NULL is NULL; `concat_ws` skips NULLs."
sources:
  - https://www.postgresql.org/docs/current/functions-string.html
---
## Mở bài

Bảng đăng ký mới (`raw_signups`) do khách tự gõ: tên có khoảng trắng thừa, hoa thường lẫn lộn, số điện thoại mỗi người một kiểu. Trước khi đếm hay so, bạn phải đưa chữ về một dạng.

## Ý chính

Hàm chuỗi nhận một giá trị chữ và trả một giá trị chữ (hay một số, như `length`), tính riêng cho từng dòng. Chúng không đổi dữ liệu trong bảng, chỉ đổi cái bạn nhìn thấy trong kết quả. Có thể lồng hàm vào nhau; hàm trong cùng chạy trước.

Nhiều người nghĩ **ô trống khi ghép chữ sẽ thành chuỗi rỗng**. Thật ra với `||`, chỉ cần một mảnh là NULL thì cả kết quả là NULL, kể cả phần chữ đang có. Khi cột có thể trống, dùng `concat_ws` (bỏ qua NULL), hoặc thay ô trống trước bằng `COALESCE` (bài "COALESCE: thay ô trống bằng một giá trị dự phòng").

## Cú pháp

Mọi hàm chuỗi dùng được trong `SELECT`, `WHERE`, `GROUP BY` và `ORDER BY`.

# EN

## Opening

The new sign-up table (`raw_signups`) is typed in by customers: names with extra spaces, mixed case, phone numbers in every style. Before you count or compare anything, you have to bring the text into one form.

## Key idea

A string function takes a text value and returns a text value (or a number, like `length`), computed separately for each row. It does not change the data in the table, only what you see in the result. Functions can be nested; the innermost one runs first.

Many people think **an empty cell becomes an empty string when you join text**. In fact with `||`, a single NULL piece makes the whole result NULL, including the text you had. When a column may be empty, use `concat_ws` (which skips NULLs), or replace the empty cell first with `COALESCE` (lesson "COALESCE: replace an empty cell with a fallback").

## Syntax

Every string function works in `SELECT`, `WHERE`, `GROUP BY` and `ORDER BY`.
