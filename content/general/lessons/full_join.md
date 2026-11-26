---
id: full_join
title: "FULL JOIN: đối soát hai bên, giữ cả dòng lẻ"
title_en: "FULL JOIN: reconcile two sides, keeping the strays"
minutes: 25
figures: [{ name: sql-join-family, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đặt hai danh sách cạnh nhau và giữ dòng chỉ có ở một bên, như chỉ tiêu và doanh số.
    en: Put two lists side by side and keep rows found on one side only, such as targets and sales.
  - vi: Lấy cột khóa chung bằng `COALESCE` của hai bên.
    en: Take the shared key column as a `COALESCE` of both sides.
  - vi: Tìm dòng lệch giữa hai bảng (đối soát) bằng `FULL JOIN … WHERE … IS NULL`.
    en: Find mismatched rows between two tables (reconciliation) with `FULL JOIN … WHERE … IS NULL`.
syntax: |-
  SELECT COALESCE(a.key, b.key) AS key, a.value, b.value
  FROM side_a a
  FULL [OUTER] JOIN side_b b ON b.key = a.key
options:
  - { code: "FULL JOIN", vi: "giữ dòng nối được, dòng chỉ có bên trái, và dòng chỉ có bên phải", en: "keeps matched rows, left-only rows and right-only rows" }
  - { code: "COALESCE(a.key, b.key)", vi: "khóa chung: lấy bên nào có giá trị", en: "the shared key: take whichever side has it" }
  - { code: "WHERE a.key IS NULL OR b.key IS NULL", vi: "chỉ giữ dòng lệch (đối soát)", en: "keeps only the mismatches (reconciliation)" }
  - { code: "WITH a AS (…), b AS (…)", vi: "gộp mỗi bên về cùng độ chi tiết (mỗi dòng là cùng một thứ, như một cửa hàng) trước khi nối", en: "fold each side to the same grain before joining" }
examples:
  - title: { vi: "Chỉ tiêu và doanh số tháng 2", en: "February targets and sales" }
    sql: |-
      WITH t AS (
        SELECT store_id, target_vnd FROM store_targets WHERE month = '2026-02-01'
      ),
      a AS (
        SELECT o.store_id, sum(i.qty * i.unit_price_vnd) AS sales
        FROM orders o
        JOIN order_items i ON i.order_id = o.id
        WHERE o.status = 'PAID' AND o.order_date >= '2026-02-01' AND o.order_date < '2026-03-01'
        GROUP BY o.store_id
      )
      SELECT COALESCE(t.store_id, a.store_id) AS store_id, t.target_vnd, a.sales
      FROM t
      FULL JOIN a ON a.store_id = t.store_id
      ORDER BY 1
    read:
      vi: "5 cửa hàng. Cửa hàng 4 có doanh số mà chưa có chỉ tiêu (ô `target_vnd` trống); `LEFT JOIN` từ `t` sẽ làm mất nó, `LEFT JOIN` từ `a` thì làm mất cửa hàng có chỉ tiêu mà chưa bán."
      en: "5 stores. Store 4 has sales but no target yet (empty `target_vnd`); a `LEFT JOIN` from `t` would lose it, a `LEFT JOIN` from `a` would lose a store with a target but no sales."
  - title: { vi: "So số lượng bán hai ngày", en: "Comparing units sold on two days" }
    sql: |-
      WITH a AS (
        SELECT i.product_id, sum(i.qty) AS q FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE o.order_date = '2026-10-30' GROUP BY i.product_id
      ),
      b AS (
        SELECT i.product_id, sum(i.qty) AS q FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE o.order_date = '2026-10-31' GROUP BY i.product_id
      )
      SELECT COALESCE(a.product_id, b.product_id) AS product_id, a.q AS day30, b.q AS day31
      FROM a
      FULL JOIN b ON b.product_id = a.product_id
      ORDER BY 1
    read:
      vi: "26 sản phẩm bán ít nhất một trong hai ngày. Món 1 chỉ bán ngày 30 (ô `day31` trống), món 3 chỉ bán ngày 31. Một dòng cho mỗi món, dù nó ở bên nào."
      en: "26 products sold on at least one of the two days. Item 1 sold only on the 30th (empty `day31`), item 3 only on the 31st. One row per item, whichever side it is on."
  - title: { vi: "Đối soát đơn và thanh toán", en: "Reconciling orders and payments" }
    sql: |-
      SELECT p.order_id, o.id, p.amount_vnd, o.status
      FROM payments p
      FULL JOIN orders o ON o.id = p.order_id
      WHERE p.order_id IS NULL OR o.id IS NULL
    read:
      vi: "100 dòng lệch: 92 đơn không có khoản thanh toán nào và 8 khoản tiền trỏ tới đơn không tồn tại (99901–99908). Một câu cho cả hai chiều của phép đối soát."
      en: "100 mismatches: 92 orders with no payment at all and 8 payments pointing at orders that do not exist (99901–99908). One query covers both directions of the reconciliation."
  - title: { vi: "Hai ngày, mọi cửa hàng có đơn", en: "Two days, every store with orders" }
    sql: |-
      WITH s AS (
        SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id
      ),
      t AS (
        SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id
      )
      SELECT COALESCE(s.store_id, t.store_id) AS store_id, s.n AS d29, t.n AS d31
      FROM s
      FULL JOIN t ON t.store_id = s.store_id
      ORDER BY 1
    read:
      vi: "4 cửa hàng; cửa hàng 5 không có đơn ngày 29 nhưng có ngày 31, nên `d29` trống. `COALESCE` cho cột `store_id` luôn có giá trị."
      en: "4 stores; store 5 had no order on the 29th but one on the 31st, so `d29` is empty. `COALESCE` keeps the `store_id` column always filled."
pitfalls:
  - title: { vi: "Lấy khóa từ một bên", en: "Taking the key from one side" }
    wrong: "WITH s AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id), t AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id) SELECT s.store_id, s.n AS d29, t.n AS d31 FROM s FULL JOIN t ON t.store_id = s.store_id"
    fix: "WITH s AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id), t AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id) SELECT COALESCE(s.store_id, t.store_id) AS store_id, s.n AS d29, t.n AS d31 FROM s FULL JOIN t ON t.store_id = s.store_id"
    why:
      vi: "Dòng chỉ có bên phải (cửa hàng 5) có `s.store_id` trống, nên kết quả có một dòng không biết là cửa hàng nào. Với `FULL JOIN`, khóa luôn là `COALESCE` của hai bên."
      en: "The right-only row (store 5) has an empty `s.store_id`, so the result has a row that names no store. With `FULL JOIN`, the key is always a `COALESCE` of both sides."
  - title: { vi: "LEFT JOIN khi hai bên đều có thể thiếu", en: "LEFT JOIN when either side may be missing" }
    wrong: "WITH s AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id), t AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id) SELECT COALESCE(s.store_id, t.store_id) AS store_id, s.n AS d29, t.n AS d31 FROM s LEFT JOIN t ON t.store_id = s.store_id"
    fix: "WITH s AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id), t AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id) SELECT COALESCE(s.store_id, t.store_id) AS store_id, s.n AS d29, t.n AS d31 FROM s FULL JOIN t ON t.store_id = s.store_id ORDER BY 1"
    why:
      vi: "`LEFT JOIN` chỉ giữ dòng lẻ của bên trái: cửa hàng 5 (chỉ có đơn ngày 31) biến mất, còn 3 dòng thay vì 4. Khi không bên nào là \"danh sách đủ\", dùng `FULL JOIN`."
      en: "`LEFT JOIN` only keeps the left side's strays: store 5 (orders only on the 31st) vanishes, 3 rows instead of 4. When neither side is the \"complete list\", use `FULL JOIN`."
  - title: { vi: "Lọc một bên trong WHERE", en: "Filtering one side in WHERE" }
    wrong: "WITH s AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id), t AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id) SELECT COALESCE(s.store_id, t.store_id) AS store_id, s.n AS d29, t.n AS d31 FROM s FULL JOIN t ON t.store_id = s.store_id WHERE s.n > 0"
    fix: "WITH s AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-29' GROUP BY store_id), t AS (SELECT store_id, count(*) AS n FROM orders WHERE order_date = '2026-10-31' GROUP BY store_id) SELECT COALESCE(s.store_id, t.store_id) AS store_id, s.n AS d29, t.n AS d31 FROM s FULL JOIN t ON t.store_id = s.store_id ORDER BY store_id"
    why:
      vi: "Dòng chỉ có bên phải có `s.n` trống, nên `s.n > 0` loại nó: `FULL JOIN` thành `LEFT JOIN` mà không ai nhận ra. Lọc trong CTE của từng bên, hoặc viết điều kiện có tính tới ô trống."
      en: "A right-only row has an empty `s.n`, so `s.n > 0` drops it: the `FULL JOIN` quietly becomes a `LEFT JOIN`. Filter inside each side's CTE, or write the condition so it allows for empty cells."
quiz:
  - q:
      vi: "Bảng A có 5 dòng, B có 4 dòng, 3 dòng nối được (khóa không lặp). `A FULL JOIN B` có bao nhiêu dòng?"
      en: "Table A has 5 rows, B has 4, 3 of them match (keys do not repeat). How many rows does `A FULL JOIN B` have?"
    options:
      - { vi: "9, cộng hai bảng", en: "9, the two tables added up" }
      - { vi: "6: 3 dòng nối + 2 chỉ có ở A + 1 chỉ có ở B", en: "6: 3 matched + 2 only in A + 1 only in B" }
      - { vi: "20, mọi cặp", en: "20, every pair" }
    answer: 1
    trap: 0
    why:
      vi: "\"Giữ cả hai bên\" nghe như cộng hết số dòng. Nhưng dòng nối được chỉ ra một lần, mang cột của cả hai bên; chỉ dòng có ở một bên mới đứng riêng, với cột bên kia trống: 3 + 2 + 1 = 6."
      en: "\"Keep both sides\" sounds like adding up all the rows. But a matched pair appears once, carrying both sides' columns; only the one-sided rows stand alone, with the other side's columns empty: 3 + 2 + 1 = 6."
  - q:
      vi: "Vì sao ví dụ đối soát cần `FULL JOIN` thay vì hai câu `LEFT JOIN`?"
      en: "Why does the reconciliation example use `FULL JOIN` instead of two `LEFT JOIN` queries?"
    options:
      - { vi: "Hai câu `LEFT JOIN` cho kết quả khác", en: "Two `LEFT JOIN` queries give a different result" }
      - { vi: "Một câu cho cả hai chiều lệch trong cùng một bảng kết quả; hai câu cũng làm được nhưng phải gộp hai kết quả lại", en: "One query shows both kinds of mismatch in one result; two queries work too but must be combined" }
      - { vi: "`LEFT JOIN` không dùng được với bảng `payments`", en: "`LEFT JOIN` does not work on `payments`" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người tin `FULL JOIN` tìm ra điều mà hai phép nối trái không tìm được. Thật ra hai anti-join (một mỗi chiều) cộng lại bằng đúng các dòng lệch; `FULL JOIN` chỉ gói cả hai vào một câu và một bảng."
      en: "Many believe `FULL JOIN` finds something two left joins cannot. In fact two anti-joins (one each way) add up to exactly the mismatches; `FULL JOIN` just wraps both into one query and one table."
recap:
  - vi: "`FULL JOIN` = dòng nối được + dòng chỉ có bên trái + dòng chỉ có bên phải."
    en: "`FULL JOIN` = matched rows + left-only rows + right-only rows."
  - vi: "Khóa chung là `COALESCE` của hai bên."
    en: "The shared key is a `COALESCE` of both sides."
  - vi: "Gộp mỗi bên về cùng độ chi tiết trước; lọc trong từng bên, không lọc một bên ở `WHERE`."
    en: "Fold each side to one grain first; filter inside each side, not one side in `WHERE`."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
---
## Mở bài

Giám đốc đặt hai con số cạnh nhau: chỉ tiêu tháng 2 và doanh số tháng 2 của từng cửa hàng. Cửa hàng mới chưa có chỉ tiêu nhưng đã bán được hàng; một cửa hàng khác có thể có chỉ tiêu mà chưa bán gì. Không bên nào là danh sách đủ.

## Ý chính

`FULL JOIN` giữ mọi dòng của cả hai bên. Dòng nối được ra một lần, với cột của cả hai; dòng chỉ có ở một bên vẫn ra, cột bên kia để trống. Vì khóa có thể trống ở một trong hai bên, cột khóa của kết quả viết bằng `COALESCE(a.key, b.key)`. Thêm `WHERE a.key IS NULL OR b.key IS NULL` là có ngay danh sách đối soát.

Nhiều người nghĩ **`LEFT JOIN` là đủ cho mọi phép "giữ dòng thiếu"**. Nó chỉ giữ dòng lẻ của **một** bên. Khi cả hai bên đều có thể có dòng mà bên kia không có, chỉ `FULL JOIN` thấy được cả hai.

Hình cuối mục này chạy ba kiểu nối trên hai ngày đơn hàng, mỗi bên có một cửa hàng bên kia không có: ngày 23/10 có đơn của cửa hàng 1, 2, 3, 5, ngày 24/10 của 1, 2, 3, 4. `INNER JOIN` ra 3 dòng; `LEFT JOIN` từ ngày 23 ra 4 dòng và mất cửa hàng 4; `FULL JOIN` ra 5 dòng, có ô trống ở cả hai bên.

## Cú pháp

`FULL JOIN` thường đi cùng hai CTE đã gộp về cùng độ chi tiết, và một `COALESCE` cho khóa.

# EN

## Opening

The director puts two numbers side by side: each store's February target and February sales. A new store has no target yet but has already sold; another store might have a target but no sales. Neither side is the complete list.

## Key idea

`FULL JOIN` keeps every row of both sides. A matched pair appears once with both sides' columns; a row found on one side only still appears, with the other side's columns empty. Since the key can be empty on either side, the result's key column is written as `COALESCE(a.key, b.key)`. Add `WHERE a.key IS NULL OR b.key IS NULL` and you have a reconciliation list.

Many people think **`LEFT JOIN` covers every "keep the missing rows" case**. It only keeps the strays of **one** side. When both sides can hold rows the other lacks, only `FULL JOIN` sees both.

The figure at the end of this section runs three joins on two days of orders, each side holding a store the other lacks: 23 Oct has orders from stores 1, 2, 3, 5, and 24 Oct from 1, 2, 3, 4. `INNER JOIN` gives 3 rows; a `LEFT JOIN` from the 23rd gives 4 rows and loses store 4; `FULL JOIN` gives 5 rows, with empty cells on both sides.

## Syntax

`FULL JOIN` usually comes with two CTEs folded to the same grain, and a `COALESCE` for the key.
