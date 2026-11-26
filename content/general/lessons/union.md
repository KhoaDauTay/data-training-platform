---
id: union
title: "UNION: xếp chồng hai kết quả"
title_en: "UNION: stack two results"
minutes: 20
figures: [{ name: sql-set-ops, at: idea, variant: union }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Ghép dòng của hai câu `SELECT` thành một kết quả bằng `UNION ALL` hay `UNION`.
    en: Stack the rows of two `SELECT`s into one result with `UNION ALL` or `UNION`.
  - vi: Chọn `UNION ALL` khi cần giữ mọi dòng, `UNION` khi muốn bỏ trùng.
    en: Pick `UNION ALL` to keep every row and `UNION` to remove duplicates.
  - vi: Khớp số cột, kiểu và thứ tự cột của hai bên.
    en: Match the column count, types and order on both sides.
syntax: |-
  SELECT column_1, column_2 FROM table_a [WHERE ...]
  UNION [ALL]
  SELECT column_1, column_2 FROM table_b [WHERE ...]
  [ORDER BY column_1]
options:
  - { code: "UNION ALL", vi: "giữ mọi dòng của cả hai bên, kể cả dòng trùng", en: "keeps every row of both sides, duplicates included" }
  - { code: "UNION", vi: "bỏ dòng trùng (trên mọi cột) sau khi xếp chồng", en: "removes duplicate rows (on every column) after stacking" }
  - { code: "SELECT a, b … UNION SELECT c, d …", vi: "hai bên phải có cùng số cột, kiểu tương thích, theo vị trí", en: "both sides need the same number of columns, compatible types, by position" }
  - { code: "AS kind", vi: "lấy từ câu `SELECT` đầu tiên", en: "taken from the first `SELECT`" }
  - { code: "… ORDER BY day", vi: "xếp cả kết quả chung, viết một lần ở cuối", en: "sorts the combined result, written once at the end" }
examples:
  - title: { vi: "Cửa hàng và vài khách trong một danh sách", en: "Stores and a few customers in one list" }
    sql: |-
      SELECT name, city FROM stores
      UNION ALL
      SELECT name, city FROM customers WHERE id <= 3
    read:
      vi: "8 dòng = 5 cửa hàng + 3 khách. Hai câu có cùng hai cột (tên, thành phố), nên xếp chồng được; cột của kết quả mang tên từ câu đầu."
      en: "8 rows = 5 stores + 3 customers. Both queries have the same two columns (name, city), so they stack; the result's columns take their names from the first query."
  - title: { vi: "Mọi thành phố, mỗi nơi một lần", en: "Every city, each once" }
    sql: |-
      SELECT city FROM stores
      UNION
      SELECT city FROM customers WHERE city IS NOT NULL
      ORDER BY city
    read:
      vi: "5 thành phố. Hai bên có tổng 288 dòng, `UNION` bỏ trùng còn 5. `ORDER BY` viết một lần ở cuối và xếp cả kết quả chung."
      en: "5 cities. The two sides hold 288 rows together; `UNION` removes the repeats and leaves 5. `ORDER BY` is written once at the end and sorts the combined result."
  - title: { vi: "Một bảng tóm tắt từ ba câu đếm", en: "A summary table from three counts" }
    sql: |-
      SELECT 'store' AS kind, count(*) AS n FROM stores
      UNION ALL
      SELECT 'product', count(*) FROM products
      UNION ALL
      SELECT 'customer', count(*) FROM customers
    read:
      vi: "3 dòng: 5 cửa hàng, 30 sản phẩm, 300 khách. Cột hằng số `kind` cho biết mỗi dòng đến từ đâu; tên cột chỉ cần ghi ở câu đầu."
      en: "3 rows: 5 stores, 30 products, 300 customers. The constant column `kind` tells where each row came from; column names only need to be written in the first query."
  - title: { vi: "Dòng thời gian từ hai bảng", en: "A timeline from two tables" }
    sql: |-
      SELECT order_date AS day, 'order' AS kind FROM orders WHERE order_date = '2026-10-31'
      UNION ALL
      SELECT paid_at::date, 'payment' FROM payments WHERE paid_at >= '2026-10-31' AND paid_at < '2026-11-01'
      ORDER BY day, kind
    read:
      vi: "10 sự kiện ngày 31/10: 5 đơn và 5 khoản thanh toán. Cột ngày được đưa về cùng kiểu `date` ở cả hai bên trước khi xếp chồng."
      en: "10 events on 31 October: 5 orders and 5 payments. The date column is brought to the same `date` type on both sides before stacking."
pitfalls:
  - title: { vi: "Hai bên khác số cột", en: "Different column counts" }
    wrong: "SELECT name, city FROM stores UNION SELECT name FROM customers"
    fix: "SELECT name, city FROM stores UNION SELECT name, city FROM customers"
    why:
      vi: "`UNION` ghép theo vị trí cột, nên hai bên phải có cùng số cột: lỗi 42601. Thêm cột còn thiếu (hoặc một hằng số, `NULL`) cho bên ít cột hơn."
      en: "`UNION` matches columns by position, so both sides need the same number: error 42601. Add the missing column (or a constant, `NULL`) to the shorter side."
  - title: { vi: "Cột đổi chỗ", en: "Columns in swapped order" }
    wrong: "SELECT name, price_vnd FROM products WHERE category = 'Drinks' UNION SELECT price_vnd, name FROM products WHERE category = 'Snacks'"
    fix: "SELECT name, price_vnd FROM products WHERE category = 'Drinks' UNION SELECT name, price_vnd FROM products WHERE category = 'Snacks'"
    why:
      vi: "Cột ghép theo vị trí, không theo tên: cột 1 của bên dưới (giá, số) phải khớp cột 1 bên trên (tên, chữ). Kiểu không khớp thì lỗi 42804; nếu kiểu tình cờ khớp, dữ liệu lẫn lặng lẽ. Viết cột theo cùng thứ tự."
      en: "Columns match by position, not by name: column 1 of the lower query (price, a number) must fit column 1 of the upper one (name, text). Mismatched types give error 42804; if the types happen to fit, the data mixes silently. Write the columns in the same order."
  - title: { vi: "UNION bỏ mất dòng trùng cần đếm", en: "UNION drops repeats you needed to count" }
    wrong: "SELECT p.category FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = 1417 UNION SELECT p.category FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = 1418"
    fix: "SELECT p.category FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = 1417 UNION ALL SELECT p.category FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = 1418"
    why:
      vi: "Câu hỏi là nhóm hàng của mọi dòng hàng trong hai đơn (để đếm sau đó). `UNION` gộp các dòng giống nhau nên chỉ còn 3, trong khi có 6 dòng hàng. Mặc định dùng `UNION ALL`; chỉ dùng `UNION` khi thật sự muốn bỏ trùng."
      en: "The question is the category of every line in two orders (to count later). `UNION` merges equal rows and leaves 3, while there are 6 lines. Default to `UNION ALL`; use `UNION` only when you really want repeats removed."
quiz:
  - q:
      vi: "`UNION` và `UNION ALL` khác nhau ở đâu?"
      en: "How do `UNION` and `UNION ALL` differ?"
    options:
      - { vi: "`UNION ALL` bỏ trùng mạnh hơn", en: "`UNION ALL` removes duplicates more thoroughly" }
      - { vi: "`UNION` bỏ dòng trùng, `UNION ALL` giữ mọi dòng (và làm ít việc hơn)", en: "`UNION` removes duplicate rows, `UNION ALL` keeps every row (and does less work)" }
      - { vi: "Không khác", en: "No difference" }
    answer: 1
    trap: 0
    why:
      vi: "Chữ \"ALL\" nghe như \"bỏ trùng tất cả\", nên dễ hiểu ngược. Nó nghĩa là \"giữ tất cả\". `UNION` phải so mọi dòng để bỏ trùng, nên còn tốn thêm công."
      en: "\"ALL\" sounds like \"remove all duplicates\", so it is easy to read it backwards. It means \"keep all\". `UNION` has to compare every row to drop repeats, which costs extra work."
  - q:
      vi: "Kết quả của `UNION` lấy tên cột từ đâu?"
      en: "Where does a `UNION` result take its column names from?"
    options:
      - { vi: "Từ câu `SELECT` đầu tiên", en: "From the first `SELECT`" }
      - { vi: "Từ câu `SELECT` cuối cùng", en: "From the last `SELECT`" }
      - { vi: "Postgres đặt tên `column1`, `column2`", en: "Postgres names them `column1`, `column2`" }
    answer: 0
    trap: 1
    why:
      vi: "Câu cuối nằm gần `ORDER BY` nên có người đoán tên lấy từ đó. Tên (và vì vậy `ORDER BY day`) luôn theo câu đầu tiên; các câu sau chỉ cần đúng vị trí và kiểu."
      en: "The last query sits next to the `ORDER BY`, so some guess the names come from there. The names (and so `ORDER BY day`) always follow the first query; the later ones only need the right position and type."
recap:
  - vi: "`UNION ALL` xếp chồng và giữ mọi dòng; `UNION` bỏ trùng."
    en: "`UNION ALL` stacks and keeps every row; `UNION` removes duplicates."
  - vi: "Cùng số cột, kiểu tương thích, khớp theo vị trí; tên lấy từ câu đầu."
    en: "Same column count, compatible types, matched by position; names come from the first query."
  - vi: "Một `ORDER BY` ở cuối cho cả kết quả."
    en: "One `ORDER BY` at the end sorts the whole result."
sources:
  - https://www.postgresql.org/docs/current/queries-union.html
---
## Mở bài

Quản lý muốn một dòng thời gian ngày 31/10: mọi đơn **và** mọi khoản thanh toán, xếp theo thời gian. Hai loại sự kiện nằm ở hai bảng khác nhau. Bạn không nối chúng cạnh nhau; bạn đặt dòng của bảng này **dưới** dòng của bảng kia.

## Ý chính

`UNION ALL` lấy kết quả của hai câu `SELECT` và xếp chồng: dòng của câu thứ hai nằm dưới dòng của câu thứ nhất. Hai câu phải có cùng số cột, kiểu tương thích, khớp theo vị trí. `UNION` (không có `ALL`) làm như vậy rồi bỏ những dòng giống hệt nhau.

Nhiều người nghĩ **`UNION` là lựa chọn mặc định an toàn**. Thật ra việc bỏ trùng có thể làm mất dòng bạn cần (hai dòng hàng cùng nhóm hàng là hai dòng thật), và tốn thêm công để so. Dùng `UNION ALL` trừ khi câu hỏi muốn danh sách không trùng.

Hình cuối mục này đặt `UNION ALL` và `UNION` cạnh nhau trên thành phố của cửa hàng và của khách: một bên giữ trùng, một bên bỏ trùng.

## Cú pháp

`ORDER BY` (nếu có) đứng một lần ở cuối và áp cho cả kết quả.

# EN

## Opening

The manager wants a timeline of 31 October: every order **and** every payment, in time order. The two kinds of event live in two different tables. You do not put them side by side; you put one table's rows **under** the other's.

## Key idea

`UNION ALL` takes the results of two `SELECT`s and stacks them: the second query's rows go under the first's. Both queries need the same number of columns, with compatible types, matched by position. `UNION` (without `ALL`) does the same, then removes rows that are exactly equal.

Many people think **`UNION` is the safe default**. In fact removing repeats can lose rows you need (two lines of the same category are two real lines), and it costs extra work to compare. Use `UNION ALL` unless the question wants a list with no repeats.

The figure at the end of this section puts `UNION ALL` and `UNION` side by side on the stores' and the customers' cities: one keeps repeats, the other removes them.

## Syntax

`ORDER BY` (if any) appears once at the end and applies to the whole result.
