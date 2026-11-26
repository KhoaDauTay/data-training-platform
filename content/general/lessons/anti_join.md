---
id: anti_join
title: "Anti-join: tìm dòng không có cặp"
title_en: "Anti-join: find the rows with no match"
minutes: 25
figures: [{ name: sql-left-join-on-vs-where, at: idea, variant: anti }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tìm khách chưa mua, sản phẩm chưa bán, khoản tiền không khớp đơn nào bằng `LEFT JOIN … IS NULL`.
    en: Find customers who never bought, products never sold, payments matching no order with `LEFT JOIN … IS NULL`.
  - vi: Đặt điều kiện "trong khoảng thời gian nào" vào `ON`.
    en: Put the "within which period" condition in `ON`.
  - vi: "Kiểm tra NULL trên đúng cột: khóa của bảng bên phải."
    en: "Test NULL on the right column: the key of the right-hand table."
syntax: |-
  SELECT l.column
  FROM left_table l
  LEFT JOIN right_table r ON r.foreign_key = l.key [AND condition_on_r]
  WHERE r.key IS NULL
options:
  - { code: "LEFT JOIN … ON", vi: "giữ mọi dòng bên trái, ghép với dòng bên phải nếu có", en: "keeps every left row, paired with right rows when there are any" }
  - { code: "WHERE r.id IS NULL", vi: "chỉ giữ dòng không ghép được (khóa bên phải trống)", en: "keeps only the rows that found no partner (right key empty)" }
  - { code: "ON … AND r.date >= …", vi: "\"không có trong giai đoạn này\": điều kiện thuộc về phép nối", en: "\"none in this period\": the condition belongs to the join" }
  - { code: "r.id", vi: "kiểm tra cột không bao giờ trống khi có cặp, thường là khóa chính", en: "test a column that is never empty for a real partner, usually the primary key" }
examples:
  - title: { vi: "Cửa hàng không có đơn nào trong một ngày", en: "Stores with no order on a day" }
    sql: |-
      SELECT s.name
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-29'
      WHERE o.id IS NULL
    read:
      vi: "Son Tra và Hoan Kiem. Ba cửa hàng còn lại có đơn hôm đó nên `o.id` có giá trị và bị lọc bỏ."
      en: "Son Tra and Hoan Kiem. The other three stores had orders that day, so their `o.id` has a value and they are filtered out."
  - title: { vi: "Khách im lặng từ tháng 9", en: "Customers silent since September" }
    sql: |-
      SELECT c.id, c.name
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.order_date >= '2026-09-01'
      WHERE o.id IS NULL
      ORDER BY c.id
    read:
      vi: "117 khách không đặt đơn nào từ 01/09/2026, đầu danh sách là khách 3. Họ có thể đã mua trước đó; điều kiện thời gian trong `ON` chỉ xét các đơn mới."
      en: "117 customers placed no order since 1 September 2026, starting with customer 3. They may have bought earlier; the time condition in `ON` only looks at recent orders."
  - title: { vi: "Khoản thanh toán không khớp đơn nào", en: "Payments that match no order" }
    sql: |-
      SELECT p.order_id, p.amount_vnd
      FROM payments p
      LEFT JOIN orders o ON o.id = p.order_id
      WHERE o.id IS NULL
    read:
      vi: "8 khoản trỏ tới mã đơn 99901–99908, không có trong `orders`. `payments.order_id` không có khóa ngoại nên dữ liệu kiểu này lọt vào được: anti-join là phép kiểm tra chất lượng dữ liệu."
      en: "8 payments point at order ids 99901–99908, which are not in `orders`. `payments.order_id` has no foreign key, so data like this can slip in: an anti-join is a data-quality check."
  - title: { vi: "Nhân viên không quản lý ai", en: "Staff who manage nobody" }
    sql: |-
      SELECT e.name
      FROM staff e
      LEFT JOIN staff r ON r.manager_id = e.id
      WHERE r.id IS NULL
      ORDER BY e.name
    read:
      vi: "8 người, toàn thu ngân, nhân viên kho và một chuyên viên phân tích. Bảng `staff` được nối với chính nó: bên phải là \"những người báo cáo cho e\"."
      en: "8 people, all cashiers, stock clerks and one analyst. The `staff` table is joined to itself: the right side is \"the people who report to e\"."
  - title: { vi: "Sản phẩm không có trong một loạt đơn", en: "Products missing from a batch of orders" }
    sql: |-
      SELECT p.id, p.name
      FROM products p
      LEFT JOIN order_items i ON i.product_id = p.id AND i.order_id BETWEEN 1410 AND 1420
      WHERE i.order_id IS NULL
      ORDER BY p.id
    read:
      vi: "9 sản phẩm không xuất hiện trong 11 đơn mới nhất. `order_items` không có cột `id`, nên kiểm tra một cột luôn có giá trị khi có cặp: `order_id`."
      en: "9 products do not appear in the 11 newest orders. `order_items` has no `id` column, so test a column that always has a value for a real partner: `order_id`."
pitfalls:
  - title: { vi: "Điều kiện thời gian đặt ở WHERE", en: "The time condition placed in WHERE" }
    wrong: "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.order_date >= '2026-09-01' AND o.id IS NULL"
    fix: "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.order_date >= '2026-09-01' WHERE o.id IS NULL"
    why:
      vi: "Trong `WHERE`, hai điều kiện mâu thuẫn: dòng không có cặp có `order_date` trống nên trượt điều kiện ngày, còn dòng có cặp thì trượt `IS NULL`. Kết quả luôn 0 dòng. Điều kiện về bảng phải nằm trong `ON`."
      en: "In `WHERE` the two conditions contradict each other: an unmatched row has an empty `order_date` and fails the date test, while a matched row fails `IS NULL`. The result is always 0 rows. Conditions on the right table belong in `ON`."
  - title: { vi: "Kiểm tra NULL trên cột có thể trống", en: "Testing NULL on a column that can be empty" }
    wrong: "SELECT s.name FROM stores s LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-29' WHERE o.delivered_on IS NULL"
    fix: "SELECT s.name FROM stores s LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = '2026-10-29' WHERE o.id IS NULL"
    why:
      vi: "`delivered_on` trống cả khi có cặp thật (đơn tại quầy, đơn chưa giao), nên câu sai giữ lại 9 dòng, lẫn cả cửa hàng có đơn. Kiểm tra cột không bao giờ trống khi có cặp: khóa chính `o.id`."
      en: "`delivered_on` is empty even for real partners (in-store orders, undelivered ones), so the wrong query keeps 9 rows, including stores that did have orders. Test a column that is never empty for a real partner: the primary key `o.id`."
quiz:
  - q:
      vi: "Trong `LEFT JOIN orders o … WHERE o.id IS NULL`, vì sao `o.id` trống?"
      en: "In `LEFT JOIN orders o … WHERE o.id IS NULL`, why is `o.id` empty?"
    options:
      - { vi: "Vì một số đơn có mã trống", en: "Because some orders have an empty id" }
      - { vi: "Vì dòng bên trái không ghép được đơn nào, nên mọi cột của `o` là NULL", en: "Because the left row matched no order, so every column of `o` is NULL" }
      - { vi: "Vì `LEFT JOIN` xóa mã đơn", en: "Because `LEFT JOIN` erases the order id" }
    answer: 1
    trap: 0
    why:
      vi: "Đọc chữ \"id IS NULL\" thì dễ nghĩ dữ liệu có đơn mất mã. Nhưng `id` là khóa chính, không bao giờ trống; nó chỉ trống trong kết quả khi không có đơn nào được ghép. Đó chính là dấu hiệu \"không có cặp\"."
      en: "Reading \"id IS NULL\", it is easy to think some orders lost their id. But `id` is the primary key and is never empty; it is only empty in the result when no order was paired. That is the very sign of \"no match\"."
  - q:
      vi: "Muốn \"khách không mua gì trong tháng 10\", điều kiện tháng 10 đặt ở đâu?"
      en: "For \"customers who bought nothing in October\", where does the October condition go?"
    options:
      - { vi: "Trong `ON`, cùng điều kiện nối", en: "In `ON`, next to the join condition" }
      - { vi: "Trong `WHERE`, cùng `IS NULL`", en: "In `WHERE`, next to `IS NULL`" }
      - { vi: "Ở đâu cũng được", en: "Either place" }
    answer: 0
    trap: 1
    why:
      vi: "`WHERE` là nơi quen thuộc cho mọi bộ lọc, nên đặt ở đó trông tự nhiên. Nhưng câu hỏi là \"không có cặp trong tháng 10\": tháng 10 quyết định cặp nào được tính, nên nó thuộc về phép nối. Đặt ở `WHERE` thì luôn ra 0 dòng."
      en: "`WHERE` is the usual home for filters, so it feels natural there. But the question is \"no partner in October\": October decides which partners count, so it belongs to the join. In `WHERE` it always gives 0 rows."
recap:
  - vi: "Anti-join = `LEFT JOIN` + `WHERE r.id IS NULL`."
    en: "Anti-join = `LEFT JOIN` + `WHERE r.id IS NULL`."
  - vi: "Điều kiện \"trong giai đoạn nào\" đặt trong `ON`."
    en: "The \"in which period\" condition goes in `ON`."
  - vi: "Kiểm tra NULL trên khóa chính của bảng phải, không trên cột có thể trống."
    en: "Test NULL on the right table's primary key, not on a column that may be empty."
  - vi: "Phần 6 dạy cách viết khác: `NOT EXISTS` (và vì sao tránh `NOT IN`)."
    en: "Part 6 shows another spelling: `NOT EXISTS` (and why to avoid `NOT IN`)."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
---
## Mở bài

Marketing muốn gửi ưu đãi cho "những khách không đặt đơn nào từ tháng 9". Dữ liệu cho bạn biết ai **đã** mua; câu hỏi lại là về những người **không có** dòng nào. Bạn cần tìm chỗ trống.

## Ý chính

Anti-join tìm dòng của bảng A không có cặp nào ở bảng B. Cách viết bằng phép nối: `LEFT JOIN` để giữ mọi dòng của A, rồi `WHERE` giữ những dòng mà khóa của B trống, tức là không ghép được. Mọi điều kiện về B (thời gian, trạng thái) phải nằm trong `ON`, vì chúng quyết định cặp nào được tính.

Nhiều người nghĩ **kiểm tra cột nào của B trống cũng được**. Thật ra chỉ cột không bao giờ trống khi có cặp thật mới đáng tin, thường là khóa chính. Một cột có thể trống tự nhiên (như ngày giao) sẽ để lọt cả những dòng có cặp.

Hình cuối mục này là bước cuối của hình trong bài `LEFT JOIN`: sau `WHERE o.id IS NULL` chỉ còn Ben Thanh và Hoan Kiem, hai cửa hàng không có đơn ngày 26/10.

## Cú pháp

Ba phần luôn đi cùng nhau: `LEFT JOIN`, điều kiện trong `ON`, `IS NULL` trên khóa.

# EN

## Opening

Marketing wants to send an offer to "the customers who have not ordered since September". The data tells you who **did** buy; the question is about the people with **no** row at all. You need to find the gaps.

## Key idea

An anti-join finds the rows of table A that have no partner in table B. With a join: `LEFT JOIN` to keep every row of A, then `WHERE` keeps the rows where B's key is empty, meaning nothing was paired. Every condition about B (period, status) must sit in `ON`, because it decides which partners count.

Many people think **testing any column of B for emptiness works**. In fact only a column that is never empty for a real partner can be trusted, usually the primary key. A column that can be empty by nature (such as a delivery date) lets matched rows slip through.

The figure at the end of this section is the last step of the one in the `LEFT JOIN` lesson: after `WHERE o.id IS NULL` only Ben Thanh and Hoan Kiem remain, the two stores with no order on 26 Oct.

## Syntax

Three parts always go together: `LEFT JOIN`, the condition in `ON`, `IS NULL` on the key.
