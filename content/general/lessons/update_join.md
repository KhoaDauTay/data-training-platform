---
id: update_join
title: "Sửa và xóa dòng: UPDATE, DELETE và điều kiện từ bảng khác"
title_en: "Changing and removing rows: UPDATE, DELETE and conditions from another table"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đổi giá trị bằng `UPDATE … SET … WHERE` và xóa dòng bằng `DELETE … WHERE`.
    en: Change values with `UPDATE … SET … WHERE` and remove rows with `DELETE … WHERE`.
  - vi: Lấy điều kiện từ bảng khác bằng `UPDATE … FROM` và `DELETE … USING`.
    en: Take the condition from another table with `UPDATE … FROM` and `DELETE … USING`.
  - vi: Xóa bản trùng mà vẫn giữ lại đúng một bản.
    en: Delete duplicates while keeping exactly one copy.
syntax: |-
  UPDATE table_name [AS alias]
  SET column = expression [, ...]
  [ FROM other_table [, ...] ]
  [ WHERE condition ]
  [ RETURNING ... ]

  DELETE FROM table_name [AS alias]
  [ USING other_table [, ...] ]
  [ WHERE condition ]
  [ RETURNING ... ]
options:
  - { code: "SET col = expr", vi: "giá trị mới; biểu thức có thể dùng giá trị cũ của chính dòng đó", en: "the new value; the expression may use the row's own old value" }
  - { code: "WHERE …", vi: "chọn dòng bị đụng; bỏ trống là mọi dòng của bảng", en: "picks the rows touched; left out, every row of the table" }
  - { code: "UPDATE … FROM other", vi: "đưa bảng khác vào để lấy điều kiện hay giá trị; nối hai bảng trong `WHERE`", en: "brings in another table for a condition or a value; link the two tables in `WHERE`" }
  - { code: "DELETE … USING other", vi: "như `FROM` của `UPDATE`, cho câu xóa", en: "like `UPDATE`'s `FROM`, for a delete" }
  - { code: "WHERE id IN (SELECT …)", vi: "cách khác để lấy điều kiện từ bảng khác: một truy vấn con", en: "another way to take a condition from another table: a subquery" }
  - { code: "RETURNING …", vi: "trả các dòng vừa sửa (giá trị mới) hay vừa xóa", en: "returns the rows just changed (new values) or just removed" }
examples:
  - title: { vi: "Sửa một nhóm dòng", en: "Changing a group of rows" }
    sql: |-
      UPDATE products
      SET price_vnd = price_vnd * 105 / 100
      WHERE category = 'Household'
      RETURNING name, price_vnd
    read:
      vi: "6 món đồ gia dụng tăng giá 5%: nước rửa chén từ 32.000 lên 33.600. Giá mới tính từ giá cũ của chính dòng đó; `WHERE` giữ các nhóm khác nguyên vẹn."
      en: "6 household items go up 5%: the dish soap from 32,000 to 33,600. The new price is computed from the row's own old price; `WHERE` leaves the other categories alone."
  - title: { vi: "Điều kiện nằm ở bảng khác: UPDATE … FROM", en: "The condition lives in another table: UPDATE … FROM" }
    sql: |-
      UPDATE store_targets t
      SET target_vnd = t.target_vnd + 1000000
      FROM stores s
      WHERE s.id = t.store_id
        AND s.city = 'Hanoi'
        AND t.month = '2026-12-01'
      RETURNING t.store_id, t.target_vnd
    read:
      vi: "1 dòng: cửa hàng số 5 (Hoan Kiem, Hà Nội) từ 9 lên 10 triệu. `FROM stores s` đưa thành phố vào, `s.id = t.store_id` nối hai bảng."
      en: "1 row: store 5 (Hoan Kiem, Hanoi) goes from 9 to 10 million. `FROM stores s` brings the city in, `s.id = t.store_id` links the two tables."
  - title: { vi: "Điều kiện bằng truy vấn con", en: "The condition as a subquery" }
    sql: |-
      UPDATE products
      SET price_vnd = price_vnd - 1000
      WHERE id IN (SELECT product_id FROM order_items WHERE order_id = 1416)
      RETURNING name, price_vnd
    read:
      vi: "3 món có trong đơn 1416 được giảm 1.000 đồng. `IN (SELECT …)` cho cùng ý với `FROM`; chọn cách nào dễ đọc hơn cho câu hỏi của bạn."
      en: "The 3 items in order 1416 get 1,000 VND off. `IN (SELECT …)` says the same thing as `FROM`; pick whichever reads better for your question."
  - title: { vi: "Xóa dữ liệu bẩn", en: "Deleting dirty data" }
    sql: |-
      DELETE FROM raw_signups
      WHERE signup_date > '2026-10-31'
      RETURNING id, full_name, signup_date
    read:
      vi: "4 lượt đăng ký mang ngày trong tương lai (2027) bị xóa. Trước khi xóa thật, chạy `SELECT` với cùng `WHERE` để đếm; `RETURNING` cho thấy chính xác những gì đã mất."
      en: "4 sign-ups dated in the future (2027) are deleted. Before deleting for real, run a `SELECT` with the same `WHERE` to count; `RETURNING` shows exactly what was removed."
  - title: { vi: "Xóa bản trùng, giữ một bản", en: "Deleting duplicates, keeping one" }
    sql: |-
      DELETE FROM payments p
      USING payments q
      WHERE p.order_id = q.order_id
        AND p.amount_vnd = q.amount_vnd
        AND p.id > q.id
      RETURNING p.id, p.order_id, p.amount_vnd
    read:
      vi: "13 lần thu bị ghi hai lần. Bảng được nối với chính nó: mỗi dòng `p` thấy bản sao `q` cùng đơn, cùng số tiền, và chỉ dòng có `id` lớn hơn bị xóa, nên bản đầu ở lại."
      en: "13 payments were recorded twice. The table is paired with itself: each row `p` sees its copy `q` with the same order and amount, and only the row with the larger `id` is deleted, so the first copy stays."
pitfalls:
  - title: { vi: "Quên WHERE", en: "Forgetting WHERE" }
    wrong: "UPDATE products SET price_vnd = price_vnd + 1000 RETURNING name, price_vnd"
    fix: "UPDATE products SET price_vnd = price_vnd + 1000 WHERE category = 'Snacks' RETURNING name, price_vnd"
    why:
      vi: "Muốn tăng giá nhóm ăn vặt mà quên `WHERE`: cả 30 món đều tăng, không lỗi nào báo. Viết `WHERE` trước, thử nó bằng một câu `SELECT`, rồi mới đổi chữ `SELECT` thành `UPDATE`."
      en: "Meaning to raise the snack prices but forgetting `WHERE`: all 30 items go up and no error says so. Write the `WHERE` first, try it with a `SELECT`, and only then turn the `SELECT` into an `UPDATE`."
  - title: { vi: "UPDATE … FROM thiếu điều kiện nối", en: "UPDATE … FROM without the join condition" }
    wrong: "UPDATE store_targets t SET target_vnd = t.target_vnd + 1000000 FROM stores s WHERE s.city = 'Hanoi' AND t.month = '2026-12-01' RETURNING t.store_id, t.target_vnd"
    fix: "UPDATE store_targets t SET target_vnd = t.target_vnd + 1000000 FROM stores s WHERE s.id = t.store_id AND s.city = 'Hanoi' AND t.month = '2026-12-01' RETURNING t.store_id, t.target_vnd"
    why:
      vi: "Thiếu `s.id = t.store_id`, mỗi dòng chỉ tiêu đi cùng cửa hàng Hà Nội bất kể nó thuộc cửa hàng nào, nên cả 5 cửa hàng được cộng thay vì 1. Bảng trong `FROM` luôn cần điều kiện nối với bảng bị sửa."
      en: "Without `s.id = t.store_id`, every target row pairs with the Hanoi store whatever store it belongs to, so all 5 stores get the increase instead of 1. A table in `FROM` always needs a condition linking it to the table being changed."
  - title: { vi: "Xóa trùng bằng <> là xóa cả hai", en: "Deduplicating with <> deletes both" }
    wrong: "DELETE FROM payments p USING payments q WHERE p.order_id = q.order_id AND p.amount_vnd = q.amount_vnd AND p.id <> q.id RETURNING p.id, p.order_id"
    fix: "DELETE FROM payments p USING payments q WHERE p.order_id = q.order_id AND p.amount_vnd = q.amount_vnd AND p.id > q.id RETURNING p.id, p.order_id"
    why:
      vi: "Với `<>`, bản đầu thấy bản sau và bản sau thấy bản đầu, nên cả hai bị xóa: 26 dòng thay vì 13, và các đơn ấy mất luôn lần thu. Dùng `>` (hay `<`) để chỉ một phía của mỗi cặp bị xóa."
      en: "With `<>`, the first copy sees the second and the second sees the first, so both are deleted: 26 rows instead of 13, and those orders lose their payment entirely. Use `>` (or `<`) so only one side of each pair is deleted."
  - title: { vi: "Cú pháp xóa có JOIN của MySQL", en: "MySQL's delete-with-JOIN syntax" }
    wrong: "DELETE p FROM payments p JOIN payments q ON q.order_id = p.order_id AND q.amount_vnd = p.amount_vnd AND p.id > q.id"
    fix: "DELETE FROM payments p USING payments q WHERE q.order_id = p.order_id AND q.amount_vnd = p.amount_vnd AND p.id > q.id RETURNING p.order_id, p.amount_vnd"
    why:
      vi: "Theo tài liệu MySQL, `DELETE p FROM … JOIN …` là cách xóa có nối ở đó; Postgres không nhận và báo lỗi cú pháp 42601. Ở Postgres, bảng phụ đi vào `USING`, điều kiện nối vào `WHERE`."
      en: "Per the MySQL manual, `DELETE p FROM … JOIN …` is how a joined delete is written there; Postgres does not accept it and raises syntax error 42601. In Postgres the extra table goes in `USING` and the join condition in `WHERE`."
quiz:
  - q:
      vi: "Bạn cần xóa mọi dòng của một bảng lớn. `DELETE FROM t` (không `WHERE`) khác `TRUNCATE t` ở điểm nào?"
      en: "You need to remove every row of a big table. How does `DELETE FROM t` (no `WHERE`) differ from `TRUNCATE t`?"
    options:
      - { vi: "Giống hệt nhau, `TRUNCATE` chỉ là tên khác", en: "They are identical; `TRUNCATE` is just another name" }
      - { vi: "`DELETE` xóa từng dòng (có `WHERE`, `RETURNING`, trigger theo dòng); `TRUNCATE` bỏ cả bảng một lần, nhanh hơn nhiều nhưng không lọc được", en: "`DELETE` removes row by row (it takes `WHERE`, `RETURNING`, row triggers); `TRUNCATE` drops all rows at once, much faster but with no filter" }
      - { vi: "`DELETE` không hoàn tác được, `TRUNCATE` thì được", en: "`DELETE` cannot be rolled back, `TRUNCATE` can" }
    answer: 1
    trap: 0
    why:
      vi: "Kết quả cuối giống nhau nên dễ tưởng là một. Nhưng `DELETE` đi qua từng dòng và để lại dòng chết cho VACUUM (tiến trình dọn dẹp của Postgres) dọn, còn `TRUNCATE` thay cả tệp dữ liệu. Ở Postgres cả hai đều hoàn tác được trong một transaction."
      en: "The end result looks the same, so it is easy to think they are one. But `DELETE` visits every row and leaves dead rows for VACUUM to clean, while `TRUNCATE` replaces the whole data file. In Postgres both can be rolled back inside a transaction."
  - q:
      vi: "`UPDATE store_targets t SET … FROM stores s WHERE s.city = 'Hanoi'` (không có `s.id = t.store_id`) sửa những dòng nào?"
      en: "Which rows does `UPDATE store_targets t SET … FROM stores s WHERE s.city = 'Hanoi'` (no `s.id = t.store_id`) change?"
    options:
      - { vi: "Chỉ chỉ tiêu của cửa hàng Hà Nội, vì Postgres tự nối theo khóa ngoại", en: "Only the Hanoi store's targets, because Postgres joins on the foreign key by itself" }
      - { vi: "Mọi dòng của `store_targets`: không có điều kiện nối, mỗi dòng đều nối được với cửa hàng Hà Nội", en: "Every row of `store_targets`: with no join condition, every row pairs with the Hanoi store" }
      - { vi: "Không dòng nào, câu báo lỗi", en: "No rows; the statement fails" }
    answer: 1
    trap: 0
    why:
      vi: "Postgres không bao giờ tự đoán điều kiện nối, kể cả khi có khóa ngoại. `FROM` không có điều kiện là nối mọi cặp, nên dòng nào cũng thỏa `WHERE`."
      en: "Postgres never guesses a join condition, not even when a foreign key exists. `FROM` without a condition pairs everything, so every row satisfies the `WHERE`."
recap:
  - vi: "`UPDATE … SET … WHERE` đổi dòng, `DELETE … WHERE` xóa dòng; thiếu `WHERE` là đụng cả bảng."
    en: "`UPDATE … SET … WHERE` changes rows, `DELETE … WHERE` removes them; without `WHERE` the whole table is hit."
  - vi: "Điều kiện ở bảng khác: `UPDATE … FROM`, `DELETE … USING`, và nhớ điều kiện nối."
    en: "A condition in another table: `UPDATE … FROM`, `DELETE … USING`, and remember the join condition."
  - vi: "Xóa trùng: nối bảng với chính nó và chỉ xóa một phía, `p.id > q.id`."
    en: "Deduplicating: pair the table with itself and delete one side only, `p.id > q.id`."
  - vi: "Chạy `SELECT` với cùng `WHERE` trước khi sửa hay xóa thật."
    en: "Run a `SELECT` with the same `WHERE` before changing or deleting for real."
sources:
  - https://www.postgresql.org/docs/current/sql-update.html
  - https://www.postgresql.org/docs/current/sql-delete.html
  - https://www.postgresql.org/docs/current/dml-update.html
  - https://www.postgresql.org/docs/current/sql-truncate.html
---
## Mở bài

Giá đồ gia dụng tăng 5%, chỉ tiêu tháng 12 của Hà Nội cần cộng thêm, và bảng thu tiền có những dòng ghi hai lần. Đây là sửa và xóa dữ liệu đã có, việc mà một chữ `WHERE` bị quên có thể biến thành thảm họa.

## Ý chính

`UPDATE` đổi giá trị của các dòng thỏa `WHERE`; `DELETE` xóa chúng. Khi điều kiện nằm ở bảng khác, Postgres cho thêm một danh sách bảng: `UPDATE … FROM` và `DELETE … USING`, rồi bạn nối các bảng trong `WHERE` như một phép JOIN. `RETURNING` trả lại đúng các dòng đã đổi hay đã mất.

Nhiều người nghĩ **có khóa ngoại thì Postgres tự biết nối hai bảng**. Thật ra không: thiếu điều kiện nối là mọi dòng đều nối được, và câu sửa đụng cả bảng. Thói quen an toàn: viết câu `SELECT` với cùng `FROM` và `WHERE`, đếm dòng, rồi mới đổi nó thành câu sửa hay xóa.

## Cú pháp

`FROM` của `UPDATE` và `USING` của `DELETE` là cú pháp riêng của Postgres; chuẩn SQL dùng truy vấn con trong `WHERE`, cách đó cũng chạy ở đây.

# EN

## Opening

Household prices go up 5%, Hanoi's December target needs a top-up, and the payments table has rows recorded twice. This is changing and removing existing data, where one forgotten `WHERE` can turn into a disaster.

## Key idea

`UPDATE` changes values in the rows that satisfy `WHERE`; `DELETE` removes them. When the condition lives in another table, Postgres lets you add a list of tables: `UPDATE … FROM` and `DELETE … USING`, and you link the tables in `WHERE` like a JOIN. `RETURNING` gives back exactly the rows changed or removed.

Many people think **a foreign key lets Postgres link two tables by itself**. It does not: with no join condition every row pairs up, and the statement hits the whole table. A safe habit: write the `SELECT` with the same `FROM` and `WHERE`, count the rows, and only then turn it into the change or the delete.

## Syntax

`UPDATE`'s `FROM` and `DELETE`'s `USING` are Postgres's own syntax; standard SQL uses a subquery in `WHERE`, which works here too.
