---
id: null_logic
title: "NULL: giá trị \"chưa biết\" và IS NULL"
title_en: "NULL: the \"unknown\" value and IS NULL"
minutes: 25
figures: [{ name: sql-null-truth, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tìm dòng có ô trống, hoặc không trống, bằng `IS NULL` / `IS NOT NULL`.
    en: Find rows with an empty cell, or a filled one, with `IS NULL` / `IS NOT NULL`.
  - vi: Giải thích vì sao `= NULL` và `<> 'x'` bỏ qua ô trống.
    en: Explain why `= NULL` and `<> 'x'` skip empty cells.
  - vi: Viết điều kiện "khác x" mà vẫn giữ ô trống khi câu hỏi cần.
    en: Write a "not x" condition that keeps empty cells when the question needs them.
syntax: |-
  SELECT column_1
  FROM table_name
  WHERE column IS [NOT] NULL
     OR column IS [NOT] DISTINCT FROM 'value'
options:
  - { code: "IS NULL", vi: "ô trống", en: "the cell is empty" }
  - { code: "IS NOT NULL", vi: "ô có giá trị", en: "the cell has a value" }
  - { code: "= NULL", vi: "không bao giờ đúng: so với cái chưa biết ra chưa biết", en: "never true: comparing with an unknown gives unknown" }
  - { code: "IS DISTINCT FROM", vi: "như `<>`, nhưng coi NULL là một giá trị so được", en: "like `<>`, but treats NULL as a value it can compare" }
  - { code: "TRUE / FALSE / NULL", vi: "ba kết quả của một điều kiện; `WHERE` chỉ giữ dòng ra TRUE", en: "the three outcomes of a condition; `WHERE` keeps only TRUE rows" }
examples:
  - title: { vi: "Khách chưa có email", en: "Customers with no email" }
    sql: |-
      SELECT id, name, email
      FROM customers
      WHERE email IS NULL
      ORDER BY id
      LIMIT 5
    read:
      vi: "5 trong 13 khách chưa có email, bắt đầu từ khách 23. Cột `email` của họ trống, không phải chuỗi rỗng."
      en: "5 of the 13 customers with no email, starting with customer 23. Their `email` cell is empty, not an empty string."
  - title: { vi: "Đơn online chưa giao", en: "Online orders not yet delivered" }
    sql: |-
      SELECT count(*)
      FROM orders
      WHERE channel = 'ONLINE' AND delivered_on IS NULL
    read:
      vi: "43 đơn online chưa có ngày giao. Trong lab, ô trống ở `delivered_on` có nghĩa cụ thể: hàng còn đang đi."
      en: "43 online orders have no delivery date. In the lab, an empty `delivered_on` has a clear meaning: the parcel is still on its way."
  - title: { vi: "Ba phép thử với NULL", en: "Three tests with NULL" }
    sql: |-
      SELECT NULL = NULL AS eq, NULL IS NULL AS is_null, 1 + NULL AS plus
    read:
      vi: "`NULL = NULL` không ra TRUE mà ra NULL; chỉ `IS NULL` trả TRUE. Phép tính với NULL cũng ra NULL: cộng gì với \"chưa biết\" vẫn là chưa biết."
      en: "`NULL = NULL` is not TRUE but NULL; only `IS NULL` returns TRUE. Arithmetic with NULL is NULL too: anything plus \"unknown\" is still unknown."
  - title: { vi: "\"Không ở Huế\", tính cả người chưa ghi thành phố", en: "\"Not in Hue\", counting people with no city" }
    sql: |-
      SELECT count(*)
      FROM customers
      WHERE city IS DISTINCT FROM 'Hue'
    read:
      vi: "271 khách: 254 người ở thành phố khác cộng 17 người chưa có thành phố. `IS DISTINCT FROM` coi ô trống là \"khác Huế\"."
      en: "271 customers: 254 in other cities plus 17 with no city. `IS DISTINCT FROM` treats an empty cell as \"not Hue\"."
  - title: { vi: "Lọc bỏ ô trống trước khi so", en: "Dropping empty cells before comparing" }
    sql: |-
      SELECT name, birth_year
      FROM customers
      WHERE birth_year IS NOT NULL AND birth_year >= 2003
    read:
      vi: "9 khách sinh từ 2003. Ở đây `IS NOT NULL` không đổi kết quả (ô trống đã không qua `>=`), nhưng nó nói rõ với người đọc rằng bạn đã nghĩ tới ô trống."
      en: "9 customers born in 2003 or later. Here `IS NOT NULL` does not change the result (empty cells already fail `>=`), but it tells the reader you have thought about them."
pitfalls:
  - title: { vi: "So bằng với NULL", en: "Testing equality with NULL" }
    wrong: "SELECT count(*) FROM customers WHERE email = NULL"
    fix: "SELECT count(*) FROM customers WHERE email IS NULL"
    why:
      vi: "`email = NULL` ra NULL cho mọi dòng, và `WHERE` chỉ giữ dòng ra TRUE: 0 dòng, không lỗi. Kiểm tra ô trống luôn bằng `IS NULL` (câu sửa ra 13)."
      en: "`email = NULL` is NULL for every row, and `WHERE` only keeps TRUE rows: 0 rows, no error. Always test for an empty cell with `IS NULL` (the fix gives 13)."
  - title: { vi: "\"Khác\" làm mất ô trống", en: "\"Not equal\" loses the empty cells" }
    wrong: "SELECT count(*) FROM customers WHERE city <> 'Hue'"
    fix: "SELECT count(*) FROM customers WHERE city <> 'Hue' OR city IS NULL"
    why:
      vi: "Câu hỏi là \"khách không ở Huế\". Với 17 khách chưa có thành phố, `city <> 'Hue'` ra NULL nên họ bị bỏ: 254 thay vì 271. Thêm `OR city IS NULL`, hoặc dùng `IS DISTINCT FROM`."
      en: "The question is \"customers not in Hue\". For the 17 with no city, `city <> 'Hue'` is NULL, so they are dropped: 254 instead of 271. Add `OR city IS NULL`, or use `IS DISTINCT FROM`."
  - title: { vi: "NOT không cứu được NULL", en: "NOT does not rescue NULL" }
    wrong: "SELECT count(*) FROM customers WHERE NOT (city = 'Hue')"
    fix: "SELECT count(*) FROM customers WHERE NOT (city IS NOT DISTINCT FROM 'Hue')"
    why:
      vi: "Đảo một điều kiện ra NULL vẫn là NULL, nên `NOT (city = 'Hue')` cũng bỏ 17 khách chưa có thành phố. Chỉ các phép `IS …` mới trả TRUE/FALSE chắc chắn."
      en: "Negating a NULL condition is still NULL, so `NOT (city = 'Hue')` also drops the 17 customers with no city. Only the `IS …` tests return a firm TRUE/FALSE."
quiz:
  - q:
      vi: "Bảng có 300 khách. `count(*) WHERE city = 'Hue'` ra 29 và `count(*) WHERE city <> 'Hue'` ra 254. Vì sao tổng không phải 300?"
      en: "The table has 300 customers. `count(*) WHERE city = 'Hue'` gives 29 and `count(*) WHERE city <> 'Hue'` gives 254. Why is the total not 300?"
    options:
      - { vi: "17 khách có `city` trống: với họ cả hai điều kiện đều ra NULL", en: "17 customers have an empty `city`: for them both conditions are NULL" }
      - { vi: "Có khách bị đếm hai lần", en: "Some customers are counted twice" }
      - { vi: "`<>` không dùng được với chữ", en: "`<>` does not work on text" }
    answer: 0
    trap: 1
    why:
      vi: "Hai điều kiện trông như bù nhau nên tổng \"phải\" là 300; khi không khớp, người ta nghi đếm trùng. Thật ra SQL có ba kết quả: TRUE, FALSE và NULL. Dòng có ô trống không thuộc bên nào."
      en: "The two conditions look complementary, so the total \"must\" be 300; when it is not, people suspect double counting. SQL has three outcomes: TRUE, FALSE and NULL. A row with an empty cell belongs to neither side."
  - q:
      vi: "`WHERE delivered_on = NULL` trả bao nhiêu dòng?"
      en: "How many rows does `WHERE delivered_on = NULL` return?"
    options:
      - { vi: "Mọi đơn chưa giao", en: "Every undelivered order" }
      - { vi: "0, luôn luôn", en: "0, always" }
      - { vi: "Báo lỗi cú pháp", en: "A syntax error" }
    answer: 1
    trap: 0
    why:
      vi: "Trong nhiều ngôn ngữ lập trình `x == null` là cách kiểm tra rỗng, nên câu này trông đúng. Trong SQL, so bằng với NULL ra NULL cho mọi dòng, và Postgres không báo lỗi, chỉ trả 0 dòng."
      en: "In many programming languages `x == null` is how you test for nothing, so this looks right. In SQL, equality with NULL is NULL for every row, and Postgres raises no error, it just returns 0 rows."
recap:
  - vi: "NULL là \"chưa biết\"; so sánh hay tính toán với nó ra NULL."
    en: "NULL means \"unknown\"; comparing or computing with it gives NULL."
  - vi: "Kiểm tra ô trống bằng `IS NULL` / `IS NOT NULL`, không bao giờ `= NULL`."
    en: "Test for empty cells with `IS NULL` / `IS NOT NULL`, never `= NULL`."
  - vi: "`<>` và `NOT` bỏ qua ô trống; dùng `IS DISTINCT FROM` khi cần giữ chúng."
    en: "`<>` and `NOT` skip empty cells; use `IS DISTINCT FROM` when you need to keep them."
sources:
  - https://www.postgresql.org/docs/current/functions-comparison.html
  - https://www.postgresql.org/docs/current/functions-logical.html
---
## Mở bài

Nhóm chăm sóc khách hỏi: "Bao nhiêu khách không ở Huế?" Bạn đếm `city` khác `Hue` rồi đếm `city` bằng `Hue`, cộng lại thì thiếu 17 người. Không ai bị mất: họ là những người chưa ghi thành phố.

## Ý chính

NULL là ô trống, nghĩa là "chưa biết". Vì không biết giá trị, mọi phép so với nó (`=`, `<>`, `<`) ra NULL thay vì TRUE hay FALSE, và `WHERE` chỉ giữ dòng ra TRUE. Muốn hỏi "ô này có trống không", dùng `IS NULL` hoặc `IS NOT NULL`: hai phép này luôn trả TRUE hoặc FALSE.

Nhiều người nghĩ **`city <> 'Hue'` gồm mọi người không ở Huế**. Thật ra nó chỉ gồm những người có thành phố và thành phố đó khác Huế. Người chưa có thành phố bị bỏ lặng lẽ. Khi câu hỏi muốn tính cả họ, thêm `OR city IS NULL` hoặc viết `IS DISTINCT FROM`.

Hình cuối mục này là hai bảng chân trị của `AND` và `OR`; ô nào là NULL cũng ghi chữ NULL. Hàng dưới hình cho thấy `NULL = NULL` ra NULL, còn `NULL IS NULL` ra TRUE.

## Cú pháp

`IS NULL` viết liền sau tên cột, không có dấu bằng.

# EN

## Opening

Customer care asks: "How many customers are not in Hue?" You count `city` not equal to `Hue`, then `city` equal to `Hue`, add them up, and 17 people are missing. Nobody was lost: they are the customers who never entered a city.

## Key idea

NULL is an empty cell, meaning "unknown". Since the value is unknown, every comparison with it (`=`, `<>`, `<`) gives NULL instead of TRUE or FALSE, and `WHERE` only keeps rows that give TRUE. To ask "is this cell empty", use `IS NULL` or `IS NOT NULL`: these two always return TRUE or FALSE.

Many people think **`city <> 'Hue'` covers everyone not in Hue**. In fact it only covers people who have a city and whose city is not Hue. People with no city are dropped silently. When the question should include them, add `OR city IS NULL` or write `IS DISTINCT FROM`.

The figure at the end of this section shows the truth tables of `AND` and `OR`; every NULL cell says NULL in words. The row under them shows that `NULL = NULL` gives NULL, while `NULL IS NULL` gives TRUE.

## Syntax

`IS NULL` comes right after the column name, with no equals sign.
