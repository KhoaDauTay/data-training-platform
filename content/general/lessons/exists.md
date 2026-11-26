---
id: exists
title: "EXISTS và NOT EXISTS: có dòng nào khớp không?"
title_en: "EXISTS and NOT EXISTS: is there any matching row?"
minutes: 25
figures: [{ name: sql-not-in-null, at: pitfalls }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Giữ dòng có (hoặc không có) ít nhất một dòng liên quan ở bảng khác.
    en: Keep rows that have (or do not have) at least one related row in another table.
  - vi: Viết truy vấn con tương quan nối với câu ngoài bằng một điều kiện.
    en: Write a correlated subquery tied to the outer query by a condition.
  - vi: Chọn `NOT EXISTS` thay vì `NOT IN`, và `EXISTS` thay vì đếm.
    en: Pick `NOT EXISTS` over `NOT IN`, and `EXISTS` over counting.
syntax: |-
  SELECT a.column
  FROM table_a a
  WHERE [NOT] EXISTS (
    SELECT 1
    FROM table_b b
    WHERE b.a_id = a.id [AND condition]
  )
options:
  - { code: "EXISTS (SELECT 1 …)", vi: "đúng nếu truy vấn con trả ít nhất một dòng; cột chọn không quan trọng", en: "true if the subquery returns at least one row; the selected column does not matter" }
  - { code: "NOT EXISTS (…)", vi: "đúng nếu không có dòng nào; an toàn với NULL", en: "true if there is no row; safe with NULL" }
  - { code: "WHERE b.a_id = a.id", vi: "điều kiện tương quan: gắn truy vấn con với dòng ngoài đang xét", en: "the correlation: ties the subquery to the outer row being checked" }
  - { code: "SELECT 1", vi: "quy ước: chỉ cần biết có dòng hay không", en: "a convention: you only need to know whether a row exists" }
examples:
  - title: { vi: "Khách từng có đơn hoàn tiền", en: "Customers who ever had a refund" }
    sql: |-
      SELECT c.id, c.name
      FROM customers c
      WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'REFUNDED')
      ORDER BY c.id
    read:
      vi: "36 khách, mỗi người một dòng dù có người hoàn tiền nhiều lần. Với mỗi khách, Postgres hỏi: có đơn hoàn tiền nào của khách này không?"
      en: "36 customers, one row each even if someone had several refunds. For each customer, Postgres asks: is there any refunded order for this customer?"
  - title: { vi: "Cửa hàng không có đơn trong một ngày", en: "Stores with no order on a day" }
    sql: |-
      SELECT s.name
      FROM stores s
      WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.store_id = s.id AND o.order_date = '2026-10-29')
    read:
      vi: "Son Tra và Hoan Kiem, cùng kết quả với cách `LEFT JOIN … IS NULL` ở Phần 5. `NOT EXISTS` đọc giống câu hỏi hơn: \"không có đơn nào\"."
      en: "Son Tra and Hoan Kiem, the same result as the `LEFT JOIN … IS NULL` way of Part 5. `NOT EXISTS` reads closer to the question: \"no order at all\"."
  - title: { vi: "Khách ở Huế im lặng từ tháng 9", en: "Hue customers silent since September" }
    sql: |-
      SELECT c.id, c.name
      FROM customers c
      WHERE c.city = 'Hue'
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.order_date >= '2026-09-01')
    read:
      vi: "9 khách. Đơn khách vãng lai có `customer_id` trống không gây hại gì: chúng không khớp khách nào, và `NOT EXISTS` không bị NULL làm hỏng như `NOT IN`."
      en: "9 customers. Walk-in orders with an empty `customer_id` do no harm: they match no customer, and `NOT EXISTS` is not broken by NULL the way `NOT IN` is."
  - title: { vi: "Thử nghiệm có ít nhất một chuyển đổi", en: "Experiments with at least one conversion" }
    sql: |-
      SELECT e.name
      FROM experiments e
      WHERE EXISTS (SELECT 1 FROM assignments a WHERE a.experiment_id = e.id AND a.converted)
    read:
      vi: "Cả 2 thử nghiệm. `EXISTS` dừng ngay khi thấy dòng khớp đầu tiên, nên không cần đếm hết mọi khách được chia nhóm."
      en: "Both experiments. `EXISTS` stops at the first matching row, so it never has to count every assigned customer."
pitfalls:
  - title: { vi: "JOIN làm khách lặp lại", en: "A JOIN repeats the customers" }
    wrong: "SELECT c.id, c.name FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'REFUNDED'"
    fix: "SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'REFUNDED')"
    why:
      vi: "Phép nối tạo một dòng cho mỗi đơn hoàn tiền, nên khách hoàn tiền hai lần xuất hiện hai lần: 38 dòng cho 36 khách. `EXISTS` chỉ trả lời có hay không."
      en: "The join makes one row per refunded order, so a customer with two refunds appears twice: 38 rows for 36 customers. `EXISTS` only answers yes or no."
  - title: { vi: "NOT IN thay cho NOT EXISTS", en: "NOT IN instead of NOT EXISTS" }
    wrong: "SELECT c.id FROM customers c WHERE c.id NOT IN (SELECT o.customer_id FROM orders o WHERE o.order_date >= '2026-10-20')"
    fix: "SELECT c.id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.order_date >= '2026-10-20')"
    why:
      vi: "Danh sách mã khách có NULL (đơn vãng lai), nên `NOT IN` không đúng với ai: 0 dòng thay vì 235. `NOT EXISTS` so từng cặp, NULL chỉ đơn giản là không khớp. Hình cuối mục này vẽ chuỗi phép so của khách 3: một dòng NULL trong danh sách làm cả chuỗi ra NULL."
      en: "The list of customer ids holds NULL (walk-in orders), so `NOT IN` is true for nobody: 0 rows instead of 235. `NOT EXISTS` checks pair by pair, and NULL simply does not match. The figure at the end of this section draws customer 3's chain of comparisons: one NULL row in the list turns the whole chain into NULL."
  - title: { vi: "Quên điều kiện tương quan", en: "Forgetting the correlation" }
    wrong: "SELECT s.name FROM stores s WHERE EXISTS (SELECT 1 FROM orders o WHERE o.order_date = '2026-10-29')"
    fix: "SELECT s.name FROM stores s WHERE EXISTS (SELECT 1 FROM orders o WHERE o.store_id = s.id AND o.order_date = '2026-10-29')"
    why:
      vi: "Thiếu `o.store_id = s.id`, truy vấn con hỏi \"có đơn nào ngày 29/10 không\", câu trả lời là có, cho mọi cửa hàng: 5 dòng thay vì 3. Truy vấn con phải nhắc tới dòng ngoài."
      en: "Without `o.store_id = s.id`, the subquery asks \"is there any order on 29 October\", and the answer is yes for every store: 5 rows instead of 3. The subquery has to mention the outer row."
quiz:
  - q:
      vi: "`EXISTS (SELECT NULL FROM orders WHERE …)` có khác `EXISTS (SELECT 1 FROM orders WHERE …)` không?"
      en: "Is `EXISTS (SELECT NULL FROM orders WHERE …)` different from `EXISTS (SELECT 1 FROM orders WHERE …)`?"
    options:
      - { vi: "Có, chọn NULL thì EXISTS luôn sai", en: "Yes, selecting NULL makes EXISTS always false" }
      - { vi: "Không: EXISTS chỉ xem có dòng hay không, không xem giá trị", en: "No: EXISTS only checks whether a row exists, not its values" }
      - { vi: "Có, `SELECT 1` nhanh hơn hẳn", en: "Yes, `SELECT 1` is much faster" }
    answer: 1
    trap: 0
    why:
      vi: "Sau những bài về NULL, dễ nghĩ chọn NULL sẽ làm hỏng điều kiện. Nhưng một dòng chứa NULL vẫn là một dòng, và `EXISTS` chỉ đếm \"có dòng\". `SELECT 1` chỉ là quy ước cho dễ đọc."
      en: "After the lessons on NULL, it is easy to think selecting NULL breaks the test. But a row holding NULL is still a row, and `EXISTS` only cares that a row exists. `SELECT 1` is just a readable convention."
  - q:
      vi: "Muốn biết \"khách này có đơn nào ở cửa hàng 2 không\", vì sao `EXISTS` tốt hơn `(SELECT count(*) …) > 0`?"
      en: "To know \"does this customer have any order at store 2\", why is `EXISTS` better than `(SELECT count(*) …) > 0`?"
    options:
      - { vi: "Kết quả khác nhau", en: "They give different results" }
      - { vi: "Cùng kết quả, nhưng `EXISTS` dừng ở dòng khớp đầu tiên, còn đếm phải đi hết mọi dòng khớp", en: "Same result, but `EXISTS` stops at the first match while counting must visit every match" }
      - { vi: "`count` không dùng được trong truy vấn con", en: "`count` cannot be used in a subquery" }
    answer: 1
    trap: 0
    why:
      vi: "Hai cách cho cùng dòng nên trông tương đương. Nhưng đếm làm nhiều việc hơn câu hỏi cần; trên bảng lớn, kế hoạch của cách đếm có thể đắt hơn hàng trăm lần. Hỏi \"có không\" thì dùng `EXISTS`."
      en: "Both return the same rows, so they look equivalent. But counting does more work than the question needs; on a big table the counting plan can cost hundreds of times more. To ask \"is there any\", use `EXISTS`."
recap:
  - vi: "`EXISTS` hỏi \"có ít nhất một dòng khớp không\"; không nhân dòng như phép nối."
    en: "`EXISTS` asks \"is there at least one matching row\"; it does not multiply rows like a join."
  - vi: "Truy vấn con phải nhắc tới dòng ngoài (điều kiện tương quan)."
    en: "The subquery must mention the outer row (the correlation)."
  - vi: "`NOT EXISTS` an toàn với NULL; `NOT IN` thì không."
    en: "`NOT EXISTS` is safe with NULL; `NOT IN` is not."
sources:
  - https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS
---
## Mở bài

Chăm sóc khách muốn danh sách "khách đã từng có đơn hoàn tiền", mỗi người một dòng. Bạn không cần biết họ hoàn tiền bao nhiêu lần hay đơn nào, chỉ cần biết **có hay không**.

## Ý chính

`EXISTS (SELECT 1 …)` đúng khi truy vấn con trả ít nhất một dòng. Truy vấn con thường **tương quan**: nó nhắc tới một cột của câu ngoài (`o.customer_id = c.id`), nên với mỗi dòng ngoài, Postgres hỏi lại một câu riêng cho dòng đó. `NOT EXISTS` là phần bù đúng nghĩa: không có dòng nào.

Nhiều người nghĩ **`NOT EXISTS` và `NOT IN` là hai cách viết của cùng một ý**. Khi danh sách có NULL, chúng khác hẳn: `NOT IN` ra 0 dòng, còn `NOT EXISTS` vẫn đúng. Vì vậy với câu hỏi "không có", hãy dùng `NOT EXISTS`.

## Cú pháp

Truy vấn con trong `EXISTS` thường viết `SELECT 1`; cột chọn không ảnh hưởng kết quả.

# EN

## Opening

Customer care wants the list of "customers who ever had a refunded order", one row each. You do not need to know how many refunds or which orders, only **whether there is one**.

## Key idea

`EXISTS (SELECT 1 …)` is true when the subquery returns at least one row. The subquery is usually **correlated**: it mentions a column of the outer query (`o.customer_id = c.id`), so for each outer row Postgres asks a separate question about that row. `NOT EXISTS` is the true opposite: no row at all.

Many people think **`NOT EXISTS` and `NOT IN` are two spellings of one idea**. When the list holds NULL they differ completely: `NOT IN` returns 0 rows, while `NOT EXISTS` stays right. So for a "has none" question, use `NOT EXISTS`.

## Syntax

The subquery inside `EXISTS` is usually written `SELECT 1`; the selected column does not change the result.
