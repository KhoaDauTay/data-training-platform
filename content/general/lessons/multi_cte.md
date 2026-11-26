---
id: multi_cte
title: "Nhiều CTE: xây câu trả lời từng bước"
title_en: "Several CTEs: build the answer step by step"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-cte-chain, at: idea }]
objectives:
  - vi: Viết nhiều CTE trong một `WITH`, bước sau đọc kết quả bước trước.
    en: Write several CTEs in one `WITH`, a later step reading an earlier one's result.
  - vi: Gộp hai bảng con riêng rẽ trước khi nối, để không nhân dòng.
    en: Aggregate two child tables separately before joining, so no rows multiply.
  - vi: So một số liệu với một mức chuẩn tính ra (trung bình, chỉ tiêu).
    en: Compare a figure with a computed benchmark (an average, a target).
syntax: |-
  WITH step_a AS (
    SELECT ...
  ),
  step_b AS (
    SELECT ... FROM step_a
  )
  SELECT ...
  FROM step_a
  JOIN step_b ON ...
options:
  - { code: "WITH a AS (…), b AS (…)", vi: "một chữ `WITH`, các CTE ngăn bằng dấu phẩy", en: "one `WITH`, the CTEs separated by commas" }
  - { code: "b AS (SELECT … FROM a)", vi: "CTE sau đọc được CTE đứng trước nó", en: "a later CTE can read the ones before it" }
  - { code: "FROM a, b", vi: "nối với một CTE một dòng (như một trung bình) để so", en: "cross with a one-row CTE (such as an average) to compare" }
  - { code: "WITH sales AS (…), targets AS (…)", vi: "mỗi CTE một tên khác nhau trong cùng `WITH`", en: "each CTE needs its own name inside one `WITH`" }
examples:
  - title: { vi: "Cửa hàng bán trên mức trung bình", en: "Stores selling above the average" }
    sql: |-
      WITH sales AS (
        SELECT o.store_id, sum(i.qty * i.unit_price_vnd) AS total
        FROM orders o
        JOIN order_items i ON i.order_id = o.id
        WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01'
        GROUP BY o.store_id
      ),
      avg_sales AS (
        SELECT avg(total) AS a FROM sales
      )
      SELECT sales.store_id, sales.total
      FROM sales, avg_sales
      WHERE sales.total > avg_sales.a
    read:
      vi: "Cửa hàng 1 và 3. Bước `avg_sales` đọc `sales` và trả một dòng duy nhất (mức trung bình), rồi câu chính nối mỗi cửa hàng với dòng đó để so."
      en: "Stores 1 and 3. The `avg_sales` step reads `sales` (a single row), then the main query pairs each store with that row to compare."
  - title: { vi: "Doanh số so với chỉ tiêu", en: "Sales against target" }
    sql: |-
      WITH t AS (
        SELECT store_id, target_vnd FROM store_targets WHERE month = '2026-10-01'
      ),
      a AS (
        SELECT o.store_id, sum(i.qty * i.unit_price_vnd) AS sales
        FROM orders o
        JOIN order_items i ON i.order_id = o.id
        WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'
        GROUP BY o.store_id
      )
      SELECT t.store_id, t.target_vnd, a.sales, a.sales >= t.target_vnd AS hit
      FROM t
      JOIN a ON a.store_id = t.store_id
      ORDER BY t.store_id
    read:
      vi: "5 cửa hàng, đều đạt chỉ tiêu tháng 10 (`hit` là `true`). Hai CTE ở cùng độ chi tiết (một dòng mỗi cửa hàng), nên phép nối giữa chúng an toàn."
      en: "5 stores, all meeting their October target (`hit` is `true`). Both CTEs share one grain (one row per store), so joining them is safe."
  - title: { vi: "Gộp hai bảng con trước khi nối", en: "Aggregating two child tables before the join" }
    sql: |-
      WITH items AS (
        SELECT order_id, sum(qty * unit_price_vnd) AS goods FROM order_items GROUP BY order_id
      ),
      paid AS (
        SELECT order_id, sum(amount_vnd) AS paid FROM payments GROUP BY order_id
      )
      SELECT o.id, items.goods, paid.paid
      FROM orders o
      JOIN items ON items.order_id = o.id
      JOIN paid ON paid.order_id = o.id
      WHERE o.order_date = '2026-10-30'
    read:
      vi: "11 đơn ngày 30/10, mỗi đơn một dòng với tiền hàng và tiền đã trả. Đơn 1410 trả 0 đồng: đáng hỏi lại. Mỗi bảng con được gộp về một dòng mỗi đơn trước khi gặp nhau."
      en: "11 orders of 30 October, one row each with the goods value and the amount paid. Order 1410 shows 0 paid: worth a question. Each child table is folded to one row per order before they meet."
pitfalls:
  - title: { vi: "Nối hai bảng con rồi mới cộng", en: "Joining two child tables, then summing" }
    wrong: "SELECT o.id, sum(i.qty * i.unit_price_vnd) AS goods, sum(p.amount_vnd) AS paid FROM orders o JOIN order_items i ON i.order_id = o.id JOIN payments p ON p.order_id = o.id WHERE o.order_date = '2026-10-30' GROUP BY o.id"
    fix: "WITH items AS (SELECT order_id, sum(qty * unit_price_vnd) AS goods FROM order_items GROUP BY order_id), paid AS (SELECT order_id, sum(amount_vnd) AS paid FROM payments GROUP BY order_id) SELECT o.id, items.goods, paid.paid FROM orders o JOIN items ON items.order_id = o.id JOIN paid ON paid.order_id = o.id WHERE o.order_date = '2026-10-30'"
    why:
      vi: "Một đơn có 3 dòng hàng và 1 khoản thanh toán; nối cả hai thì khoản thanh toán lặp 3 lần, nên \"đã trả\" gấp ba (đơn 1411: 2.206.500 thay vì 735.500). Gộp mỗi bảng con riêng trong một CTE rồi mới nối."
      en: "An order has 3 lines and 1 payment; joining both repeats the payment 3 times, so \"paid\" triples (order 1411: 2,206,500 instead of 735,500). Fold each child table in its own CTE, then join."
  - title: { vi: "Hai CTE trùng tên", en: "Two CTEs with the same name" }
    wrong: "WITH a AS (SELECT store_id FROM orders), a AS (SELECT id FROM stores) SELECT * FROM a"
    fix: "WITH a AS (SELECT store_id FROM orders), b AS (SELECT id FROM stores) SELECT * FROM b"
    why:
      vi: "Trong một `WITH`, mỗi tên chỉ được dùng một lần: lỗi 42712. Đặt tên theo ý nghĩa (`sales`, `targets`) thay cho `a`, `b` để vừa tránh trùng vừa dễ đọc."
      en: "Inside one `WITH`, each name may be used only once: error 42712. Name steps by meaning (`sales`, `targets`) instead of `a`, `b`, to avoid clashes and read easily."
  - title: { vi: "Đọc một CTE đứng sau", en: "Reading a CTE that comes later" }
    wrong: "WITH b AS (SELECT avg(total) AS a FROM sales), sales AS (SELECT store_id, 1 AS total FROM orders) SELECT * FROM b"
    fix: "WITH sales AS (SELECT store_id, 1 AS total FROM orders), b AS (SELECT avg(total) AS a FROM sales) SELECT * FROM b"
    why:
      vi: "Một CTE chỉ thấy các CTE đứng trước nó. `b` đọc `sales` khi `sales` chưa được định nghĩa, nên Postgres đi tìm một bảng thật tên `sales`: lỗi 42P01. Sắp các bước theo thứ tự phụ thuộc."
      en: "A CTE only sees the CTEs above it. `b` reads `sales` before `sales` is defined, so Postgres looks for a real table called `sales`: error 42P01. Order the steps by what depends on what."
quiz:
  - q:
      vi: "Trong `WITH a AS (…), b AS (…)`, `a` có đọc được `b` không?"
      en: "In `WITH a AS (…), b AS (…)`, can `a` read `b`?"
    options:
      - { vi: "Có, mọi CTE trong cùng `WITH` thấy nhau", en: "Yes, every CTE in one `WITH` sees the others" }
      - { vi: "Không, chỉ CTE sau đọc được CTE trước", en: "No, only a later CTE can read an earlier one" }
      - { vi: "Có, nếu thêm `RECURSIVE`", en: "Yes, if you add `RECURSIVE`" }
    answer: 1
    trap: 0
    why:
      vi: "Vì các CTE cùng nằm trong một `WITH`, dễ nghĩ chúng ngang hàng. Postgres đọc chúng từ trên xuống, nên một bước chỉ dùng được các bước đã có. (`RECURSIVE` cho một CTE đọc chính nó, chuyện của phần nâng cao.)"
      en: "Since the CTEs share one `WITH`, it is easy to think they are peers. Postgres reads them top to bottom, so a step can only use steps already defined. (`RECURSIVE` lets a CTE read itself, an advanced topic.)"
  - q:
      vi: "Vì sao ví dụ 3 gộp `order_items` và `payments` thành hai CTE riêng trước khi nối?"
      en: "Why does example 3 fold `order_items` and `payments` into two separate CTEs before joining?"
    options:
      - { vi: "Để chạy nhanh hơn, kết quả như nhau", en: "To run faster; the result is the same" }
      - { vi: "Để mỗi bảng con còn một dòng mỗi đơn; nối thẳng sẽ nhân dòng của bên này theo bên kia và làm sai tổng", en: "So each child table has one row per order; joining them directly multiplies one side's rows by the other's and breaks the totals" }
      - { vi: "Vì Postgres không cho nối ba bảng", en: "Because Postgres does not allow joining three tables" }
    answer: 1
    trap: 0
    why:
      vi: "Dễ tưởng CTE ở đây chỉ để gọn hay nhanh. Thật ra kết quả khác hẳn: nối hai bảng con của cùng một đơn tạo mọi cặp dòng hàng × khoản trả, nên mỗi tổng bị nhân lên."
      en: "It is easy to think the CTEs are only for neatness or speed. The result actually differs: joining two child tables of one order makes every line × payment pair, so each total is multiplied."
recap:
  - vi: "Một `WITH`, nhiều CTE ngăn bằng dấu phẩy, mỗi cái một tên."
    en: "One `WITH`, several CTEs separated by commas, each with its own name."
  - vi: "CTE sau đọc được CTE trước, không ngược lại."
    en: "A later CTE can read an earlier one, never the reverse."
  - vi: "Hai bảng con: gộp riêng từng cái về cùng một độ chi tiết, rồi mới nối."
    en: "Two child tables: fold each to the same grain separately, then join."
sources:
  - https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-SELECT
---
## Mở bài

Kế toán hỏi: "Với mỗi đơn hôm 30/10, tiền hàng là bao nhiêu và khách đã trả bao nhiêu?" Tiền hàng nằm ở `order_items` (nhiều dòng mỗi đơn), tiền trả ở `payments` (một hoặc nhiều dòng mỗi đơn). Nối thẳng cả ba bảng thì con số sai mà không ai báo.

## Ý chính

Một `WITH` chứa được nhiều CTE, ngăn bằng dấu phẩy. Mỗi CTE là một bước có tên; bước sau đọc được bước trước, và câu chính đọc được tất cả. Cách này giúp bạn đưa mọi thứ về **cùng một độ chi tiết** (một dòng mỗi đơn, hay mỗi cửa hàng) trước khi đặt chúng cạnh nhau.

Nhiều người nghĩ **nối hết các bảng rồi `GROUP BY` một lần là đủ**. Khi có hai bảng con của cùng một bảng cha, phép nối tạo mọi cặp dòng giữa hai bảng con, và mọi `sum` bị nhân lên. Gộp riêng từng bảng con trước là cách sửa.

## Cú pháp

Chỉ có một chữ `WITH`; các CTE sau chỉ cần tên và `AS`.

# EN

## Opening

Accounting asks: "For each order of 30 October, what was the goods value and how much has the customer paid?" The goods value lives in `order_items` (several rows per order), the money paid in `payments` (one or more rows per order). Joining all three tables directly gives wrong numbers that nobody flags.

## Key idea

One `WITH` can hold several CTEs, separated by commas. Each CTE is a named step; a later step can read the earlier ones, and the main query can read them all. This lets you bring everything to **the same grain** (one row per order, or per store) before putting them side by side.

Many people think **joining every table and running one `GROUP BY` is enough**. When a parent table has two child tables, the join makes every pair of rows between the two children, and every `sum` is multiplied. Folding each child table separately first is the fix.

## Syntax

There is only one `WITH`; the later CTEs only need their name and `AS`.
