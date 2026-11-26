---
id: where
title: "WHERE: chỉ giữ những dòng thỏa điều kiện"
title_en: "WHERE: keep only the rows that pass a condition"
minutes: 25
figures: [{ name: sql-rows-columns, at: idea, variant: rows }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Viết một điều kiện so sánh trên cột số, chữ và ngày để giữ đúng những dòng cần.
    en: Write a comparison on a number, text or date column to keep exactly the rows you need.
  - vi: Ghép nhiều điều kiện bằng `AND`, `OR`, `NOT`, `IN` và `BETWEEN`, có ngoặc đúng chỗ.
    en: Combine conditions with `AND`, `OR`, `NOT`, `IN` and `BETWEEN`, with brackets in the right place.
  - vi: Nhận ra khi một điều kiện chạy êm nhưng giữ sai dòng.
    en: Notice when a condition runs quietly but keeps the wrong rows.
syntax: |-
  SELECT column_1, column_2
  FROM table_name
  WHERE condition [AND | OR condition ...]
options:
  - { code: "= <> < <= > >=", vi: "so sánh bằng, khác, nhỏ hơn, lớn hơn (và bằng)", en: "equal, not equal, less than, greater than (or equal)" }
  - { code: "AND", vi: "cả hai điều kiện cùng đúng", en: "both conditions hold" }
  - { code: "OR", vi: "ít nhất một điều kiện đúng", en: "at least one condition holds" }
  - { code: "NOT", vi: "đảo một điều kiện", en: "negates a condition" }
  - { code: "IN ('a', 'b')", vi: "bằng một trong các giá trị của danh sách", en: "equal to one of the values in the list" }
  - { code: "BETWEEN x AND y", vi: "từ x đến y, tính cả hai đầu; x phải là đầu nhỏ", en: "from x to y, both ends included; x must be the lower end" }
  - { code: "( )", vi: "ngoặc quyết định điều kiện nào ghép với điều kiện nào", en: "brackets decide which condition goes with which" }
examples:
  - title: { vi: "So bằng trên một cột chữ", en: "Equality on a text column" }
    sql: |-
      SELECT name, city
      FROM customers
      WHERE city = 'Hue'
    read:
      vi: "29 dòng: chỉ khách có `city` đúng bằng `Hue`. Bảng có 300 khách, những dòng không thỏa điều kiện không có mặt. Giá trị chữ nằm trong nháy đơn và phải khớp cả hoa thường."
      en: "29 rows: only customers whose `city` is exactly `Hue`. The table holds 300 customers; the rows that fail the condition are left out. A text value sits in single quotes and must match upper and lower case too."
  - title: { vi: "So sánh trên một cột số", en: "A comparison on a number column" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      WHERE price_vnd >= 100000
    read:
      vi: "4 sản phẩm có giá từ 100.000 đồng trở lên, từ bột giặt 129.000 tới đèn bàn 259.000. Số viết không có nháy và không có dấu chấm ngăn hàng nghìn."
      en: "4 products priced at 100,000 VND or more, from the laundry powder at 129,000 to the desk lamp at 259,000. A number is written without quotes and without thousands separators."
  - title: { vi: "Khoảng ngày và một điều kiện nữa", en: "A date range plus one more condition" }
    sql: |-
      SELECT id, store_id, order_date, status
      FROM orders
      WHERE order_date BETWEEN '2026-10-25' AND '2026-10-26'
        AND status = 'CANCELLED'
    read:
      vi: "1 dòng: đơn 1379 của cửa hàng 4, bị hủy ngày 26/10/2026. `BETWEEN` tính cả hai ngày đầu và cuối; `AND` đòi cả hai điều kiện cùng đúng."
      en: "1 row: order 1379 of store 4, cancelled on 26 October 2026. `BETWEEN` includes both the first and the last day; `AND` needs both conditions to hold."
  - title: { vi: "Danh sách giá trị với IN", en: "A list of values with IN" }
    sql: |-
      SELECT name, category, price_vnd
      FROM products
      WHERE category IN ('Snacks', 'Stationery')
        AND price_vnd < 20000
    read:
      vi: "4 món rẻ hơn 20.000 đồng thuộc một trong hai nhóm hàng. `IN` gọn hơn hai phép so bằng nối bằng `OR`, và không cần lo ngoặc."
      en: "4 items under 20,000 VND that belong to one of the two categories. `IN` is shorter than two equalities joined by `OR`, and needs no worry about brackets."
  - title: { vi: "Ngoặc quanh OR", en: "Brackets around OR" }
    sql: |-
      SELECT name, category
      FROM products
      WHERE category <> 'Drinks'
        AND (price_vnd < 15000 OR price_vnd > 150000)
    read:
      vi: "4 dòng: món không phải đồ uống, và hoặc rất rẻ hoặc rất đắt. Nhờ ngoặc, điều kiện `<>` áp lên cả hai nhánh của `OR`."
      en: "4 rows: items that are not drinks and are either very cheap or very expensive. Thanks to the brackets, the `<>` condition applies to both branches of the `OR`."
pitfalls:
  - title: { vi: "Trộn AND với OR mà không có ngoặc", en: "Mixing AND with OR without brackets" }
    wrong: "SELECT name, city, birth_year FROM customers WHERE city = 'Hue' OR city = 'Can Tho' AND birth_year >= 2000"
    fix: "SELECT name, city, birth_year FROM customers WHERE (city = 'Hue' OR city = 'Can Tho') AND birth_year >= 2000"
    why:
      vi: "`AND` được tính trước `OR`, nên câu sai đọc là: mọi khách ở Huế, cộng khách ở Cần Thơ sinh từ 2000. Kết quả 32 dòng thay vì 4, không có lỗi nào báo. Khi một câu có cả `AND` lẫn `OR`, luôn đặt ngoặc."
      en: "`AND` binds before `OR`, so the wrong query reads: every customer in Hue, plus the Can Tho customers born in 2000 or later. It returns 32 rows instead of 4 and reports no error. When a query has both `AND` and `OR`, always add brackets."
  - title: { vi: "Quên nháy đơn quanh giá trị chữ", en: "Forgetting the single quotes around text" }
    wrong: "SELECT name FROM customers WHERE city = Hue"
    fix: "SELECT name FROM customers WHERE city = 'Hue'"
    why:
      vi: "Không có nháy, `Hue` được hiểu là tên một cột. Postgres không tìm thấy cột đó và dừng với lỗi 42703. Chữ luôn nằm trong nháy đơn; số và tên cột thì không."
      en: "Without quotes, `Hue` is read as a column name. Postgres finds no such column and stops with error 42703. Text always goes in single quotes; numbers and column names do not."
  - title: { vi: "BETWEEN với hai đầu đảo ngược", en: "BETWEEN with its ends swapped" }
    wrong: "SELECT name, price_vnd FROM products WHERE price_vnd BETWEEN 50000 AND 20000"
    fix: "SELECT name, price_vnd FROM products WHERE price_vnd BETWEEN 20000 AND 50000"
    why:
      vi: "`BETWEEN x AND y` nghĩa là `>= x AND <= y`. Đặt đầu lớn trước thì không số nào vừa lớn hơn 50.000 vừa nhỏ hơn 20.000: 0 dòng, không lỗi. Viết đầu nhỏ trước (câu sửa ra 14 món)."
      en: "`BETWEEN x AND y` means `>= x AND <= y`. With the larger end first, no number is both above 50,000 and below 20,000: 0 rows, no error. Write the lower end first (the fix returns 14 items)."
quiz:
  - q:
      vi: "`WHERE city = 'Hue' OR city = 'Hanoi' AND birth_year > 1990` giữ những ai?"
      en: "Who does `WHERE city = 'Hue' OR city = 'Hanoi' AND birth_year > 1990` keep?"
    options:
      - { vi: "Khách ở Huế hoặc Hà Nội, và sinh sau 1990", en: "Customers in Hue or Hanoi who were born after 1990" }
      - { vi: "Mọi khách ở Huế, cộng khách ở Hà Nội sinh sau 1990", en: "Every customer in Hue, plus the Hanoi customers born after 1990" }
      - { vi: "Câu báo lỗi vì thiếu ngoặc", en: "The query fails because brackets are missing" }
    answer: 1
    trap: 0
    why:
      vi: "Đọc từ trái sang phải thì dễ tin đáp án đầu. Nhưng `AND` gắn chặt hơn `OR`, nên điều kiện năm sinh chỉ đi với Hà Nội. Muốn nghĩa đầu tiên thì đặt ngoặc quanh hai thành phố."
      en: "Reading left to right makes the first answer feel right. But `AND` binds tighter than `OR`, so the birth-year condition only goes with Hanoi. For the first meaning, put brackets around the two cities."
  - q:
      vi: "`WHERE order_date BETWEEN '2026-10-01' AND '2026-10-31'` trên một cột `date` có lấy đơn ngày 31/10 không?"
      en: "Does `WHERE order_date BETWEEN '2026-10-01' AND '2026-10-31'` on a `date` column keep the orders of 31 October?"
    options:
      - { vi: "Có, BETWEEN tính cả hai đầu", en: "Yes, BETWEEN includes both ends" }
      - { vi: "Không, đầu cuối bị loại như trong nhiều ngôn ngữ lập trình", en: "No, the upper end is excluded, as in many programming languages" }
      - { vi: "Chỉ khi thêm `=`", en: "Only if you add `=`" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều hàm khoảng trong lập trình bỏ đầu cuối, nên người ta hay nghĩ SQL cũng vậy. `BETWEEN` thì tính cả hai đầu. Lưu ý: trên cột có giờ (`timestamp`), `'2026-10-31'` là nửa đêm đầu ngày, nên phần còn lại của ngày 31 bị bỏ; Phần 3 dạy cách viết khoảng nửa mở."
      en: "Many range functions in programming leave out the upper end, so people expect SQL to do the same. `BETWEEN` includes both ends. Note: on a column with a time (`timestamp`), `'2026-10-31'` is midnight at the start of the day, so the rest of the 31st is left out; Part 3 shows the half-open range."
  - q:
      vi: "Vì sao `WHERE category IN ('Snacks', 'Stationery')` an toàn hơn hai phép so bằng nối bằng `OR` khi còn điều kiện khác?"
      en: "Why is `WHERE category IN ('Snacks', 'Stationery')` safer than two equalities joined by `OR` when there are other conditions?"
    options:
      - { vi: "Vì IN luôn nhanh hơn OR", en: "Because IN is always faster than OR" }
      - { vi: "Vì IN là một điều kiện duy nhất, nên `AND` phía sau không thể chỉ bám vào một nhánh", en: "Because IN is a single condition, so a following `AND` cannot cling to just one branch" }
      - { vi: "Vì OR không dùng được với chữ", en: "Because OR does not work with text" }
    answer: 1
    why:
      vi: "Kết quả của hai cách là như nhau khi viết đúng. Điểm khác là `IN` gói danh sách lại thành một điều kiện, nên không có chuyện thứ tự `AND`/`OR` làm lệch nghĩa như bẫy đầu tiên."
      en: "Written correctly, both give the same result. The difference is that `IN` wraps the list into one condition, so the `AND`/`OR` order cannot bend its meaning as in the first pitfall."
recap:
  - vi: "`WHERE` lọc dòng, không đổi cột; nó chạy trước `SELECT`."
    en: "`WHERE` filters rows and leaves the columns alone; it runs before `SELECT`."
  - vi: "Chữ trong nháy đơn, số không nháy; so chữ phân biệt hoa thường."
    en: "Text in single quotes, numbers without; text comparison is case-sensitive."
  - vi: "`AND` gắn chặt hơn `OR`: có cả hai thì đặt ngoặc, hoặc dùng `IN`."
    en: "`AND` binds tighter than `OR`: with both, add brackets or use `IN`."
  - vi: "`BETWEEN` tính cả hai đầu và cần đầu nhỏ trước."
    en: "`BETWEEN` includes both ends and needs the lower end first."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-WHERE
  - https://www.postgresql.org/docs/current/functions-comparison.html
  - https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-PRECEDENCE
---
## Mở bài

Trưởng nhóm chăm sóc khách hỏi: "Ai là khách của mình ở Huế?" Bảng `customers` có 300 người ở nhiều thành phố, nhưng câu hỏi chỉ cần một nhóm. Bạn cần một cách nói với Postgres: giữ dòng này, bỏ dòng kia.

## Ý chính

`WHERE` đặt sau `FROM` và mang một điều kiện. Postgres xét từng dòng của bảng: điều kiện đúng thì giữ, sai thì bỏ. Cột của kết quả không đổi, chỉ số dòng ít đi. Điều kiện là một phép so sánh (`=`, `<>`, `<`, `>`…), và nhiều điều kiện ghép lại bằng `AND` (cả hai cùng đúng) hoặc `OR` (ít nhất một đúng).

Nhiều người nghĩ **Postgres đọc điều kiện từ trái sang phải như một câu văn**. Thật ra `AND` luôn được ghép trước `OR`, giống phép nhân đi trước phép cộng. Câu chạy được nhưng nghĩa khác điều bạn định nói, và không có lỗi nào cảnh báo. Ngoặc là cách để nói rõ ý mình.

Hình cuối mục này dùng lại bảng `stores`: `WHERE city = 'Da Nang'` giữ hai dòng đầu và gạch ba dòng còn lại, nhưng không bớt cột nào. `SELECT` cắt theo chiều dọc, `WHERE` cắt theo chiều ngang.

## Cú pháp

`WHERE` đứng ngay sau `FROM` và trước `ORDER BY`. Mỗi điều kiện trả đúng hoặc sai cho từng dòng.

# EN

## Opening

The customer care lead asks: "Who are our customers in Hue?" The `customers` table holds 300 people across many cities, but the question needs one group. You need a way to tell Postgres: keep this row, drop that one.

## Key idea

`WHERE` comes after `FROM` and carries a condition. Postgres looks at every row of the table: when the condition is true the row stays, when false it goes. The result's columns do not change, only the number of rows shrinks. A condition is a comparison (`=`, `<>`, `<`, `>`…), and several conditions combine with `AND` (both true) or `OR` (at least one true).

Many people think **Postgres reads a condition left to right like a sentence**. In fact `AND` is always grouped before `OR`, just as multiplication comes before addition. The query runs but means something other than what you meant, and no error warns you. Brackets are how you say what you mean.

The figure at the end of this section reuses the `stores` table: `WHERE city = 'Da Nang'` keeps the first two rows and strikes the other three, but drops no column. `SELECT` cuts vertically, `WHERE` cuts horizontally.

## Syntax

`WHERE` comes right after `FROM` and before `ORDER BY`. Each condition gives true or false for every row.
