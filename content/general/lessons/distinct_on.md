---
id: distinct_on
title: "DISTINCT ON: dòng đầu tiên của mỗi nhóm"
title_en: "DISTINCT ON: the first row of each group"
minutes: 20
figures: [{ name: sql-distinct-on, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Lấy đúng một dòng cho mỗi nhóm, như đơn mới nhất của từng khách.
    en: Take exactly one row per group, such as each customer's latest order.
  - vi: Viết `ORDER BY` quyết định dòng nào là "đầu tiên", có cột phân xử.
    en: Write the `ORDER BY` that decides which row is "first", with a tie-breaker.
  - vi: Biết vì sao cột nhóm phải đứng đầu `ORDER BY`.
    en: Know why the group columns must lead the `ORDER BY`.
syntax: |-
  SELECT DISTINCT ON (group_column) group_column, other_column
  FROM table_name
  ORDER BY group_column, pick_column DESC, tie_breaker DESC
options:
  - { code: "DISTINCT ON (a)", vi: "giữ dòng đầu tiên của mỗi giá trị `a` (riêng Postgres)", en: "keeps the first row of each value of `a` (Postgres only)" }
  - { code: "ORDER BY a, …", vi: "bắt buộc bắt đầu bằng các cột của `DISTINCT ON`", en: "must start with the `DISTINCT ON` columns" }
  - { code: "…, order_date DESC", vi: "phần sau quyết định dòng nào thắng trong nhóm", en: "the rest decides which row wins inside the group" }
  - { code: "…, id DESC", vi: "cột phân xử khi hai dòng bằng nhau", en: "the tie-breaker when two rows are equal" }
examples:
  - title: { vi: "Đơn mới nhất của mỗi khách", en: "Each customer's latest order" }
    sql: |-
      SELECT DISTINCT ON (customer_id) customer_id, id, order_date
      FROM orders
      WHERE customer_id BETWEEN 1 AND 5
      ORDER BY customer_id, order_date DESC, id DESC
    read:
      vi: "5 dòng, mỗi khách một đơn: khách 5 có đơn 1416 ngày 31/10. Trong mỗi nhóm `customer_id`, dòng xếp đầu (ngày mới nhất, rồi mã lớn nhất) được giữ."
      en: "5 rows, one order per customer: customer 5 has order 1416 on 31 October. Within each `customer_id` group, the row sorted first (latest date, then highest id) is kept."
  - title: { vi: "Đơn online gần nhất của mỗi cửa hàng", en: "Each store's latest online order" }
    sql: |-
      SELECT DISTINCT ON (store_id) store_id, id, order_date
      FROM orders
      WHERE channel = 'ONLINE'
      ORDER BY store_id, order_date DESC, id DESC
    read:
      vi: "5 cửa hàng; cửa hàng 4 có đơn online cuối ngày 26/10. `WHERE` lọc trước, `DISTINCT ON` chọn trong phần còn lại."
      en: "5 stores; store 4's last online order was on 26 October. `WHERE` filters first, `DISTINCT ON` picks from what is left."
  - title: { vi: "Món đắt nhất của mỗi nhóm hàng", en: "The priciest item of each category" }
    sql: |-
      SELECT DISTINCT ON (category) category, name, price_vnd
      FROM products
      ORDER BY category, price_vnd DESC
    read:
      vi: "5 dòng, như đèn bàn cho văn phòng phẩm. Với `GROUP BY` bạn có `max(price_vnd)` nhưng không có tên món; `DISTINCT ON` giữ nguyên cả dòng."
      en: "5 rows, such as the desk lamp for stationery. `GROUP BY` would give `max(price_vnd)` but not the item's name; `DISTINCT ON` keeps the whole row."
  - title: { vi: "Khoản thanh toán đầu tiên của mỗi đơn bị trùng", en: "The first payment of each duplicated order" }
    sql: |-
      SELECT DISTINCT ON (order_id) order_id, paid_at, amount_vnd
      FROM payments
      WHERE order_id IN (97, 194, 291)
      ORDER BY order_id, paid_at
    read:
      vi: "3 đơn bị ghi tiền hai lần, mỗi đơn giữ khoản trả sớm nhất. Đây là cách hay dùng để bỏ dòng trùng mà vẫn chọn rõ dòng nào ở lại."
      en: "3 orders were charged twice; each keeps its earliest payment. This is a common way to drop duplicates while saying clearly which row stays."
  - title: { vi: "Thành phố hiện tại từ bảng lịch sử", en: "The current city from a history table" }
    sql: |-
      SELECT DISTINCT ON (customer_id) customer_id, city, valid_from
      FROM dim_customer
      WHERE customer_id <= 40
      ORDER BY customer_id, valid_from DESC
    read:
      vi: "40 dòng, một dòng mỗi khách: phiên bản có `valid_from` mới nhất. Khách đã chuyển nhà có hai dòng trong bảng nhưng chỉ còn một ở đây."
      en: "40 rows, one per customer: the version with the latest `valid_from`. Customers who moved have two rows in the table but only one here."
pitfalls:
  - title: { vi: "Không nói dòng nào thắng", en: "Not saying which row wins" }
    wrong: "SELECT DISTINCT ON (category) category, name, price_vnd FROM products ORDER BY category"
    fix: "SELECT DISTINCT ON (category) category, name, price_vnd FROM products ORDER BY category, price_vnd DESC"
    why:
      vi: "`ORDER BY category` chỉ xếp các nhóm, không xếp trong nhóm, nên dòng được giữ là bất kỳ (ở đây ra trà xanh 12.000 cho đồ uống). Thêm cột quyết định dòng thắng."
      en: "`ORDER BY category` only sorts the groups, not inside them, so the kept row is any row (here green tea at 12,000 for drinks). Add the column that decides the winner."
  - title: { vi: "ORDER BY không bắt đầu bằng cột nhóm", en: "ORDER BY not starting with the group column" }
    wrong: "SELECT DISTINCT ON (customer_id) customer_id, id, order_date FROM orders WHERE customer_id BETWEEN 1 AND 5 ORDER BY order_date DESC"
    fix: "SELECT DISTINCT ON (customer_id) customer_id, id, order_date FROM orders WHERE customer_id BETWEEN 1 AND 5 ORDER BY customer_id, order_date DESC, id DESC"
    why:
      vi: "Postgres cần các dòng của cùng một nhóm nằm liền nhau, nên `ORDER BY` phải mở đầu bằng cột của `DISTINCT ON`: lỗi 42P10. Đặt `customer_id` lên đầu, rồi mới tới ngày."
      en: "Postgres needs the rows of one group next to each other, so the `ORDER BY` must begin with the `DISTINCT ON` columns: error 42P10. Put `customer_id` first, then the date."
  - title: { vi: "Quên DESC nên lấy dòng cũ nhất", en: "Forgetting DESC takes the oldest row" }
    wrong: "SELECT DISTINCT ON (customer_id) customer_id, id, order_date FROM orders WHERE customer_id BETWEEN 1 AND 5 ORDER BY customer_id, order_date"
    fix: "SELECT DISTINCT ON (customer_id) customer_id, id, order_date FROM orders WHERE customer_id BETWEEN 1 AND 5 ORDER BY customer_id, order_date DESC, id DESC"
    why:
      vi: "\"Đầu tiên\" là đầu theo thứ tự bạn viết. Xếp ngày tăng dần thì dòng đầu là đơn cũ nhất: khách 5 ra đơn 96 năm 2025 thay vì đơn 1416. Muốn mới nhất thì `DESC`."
      en: "\"First\" means first in the order you wrote. Dates going up put the oldest order first: customer 5 gets order 96 from 2025 instead of order 1416. For the newest, use `DESC`."
quiz:
  - q:
      vi: "Hai đơn của cùng một khách cùng ngày mới nhất. Với `ORDER BY customer_id, order_date DESC`, `DISTINCT ON` giữ đơn nào?"
      en: "Two orders of one customer share the latest date. With `ORDER BY customer_id, order_date DESC`, which one does `DISTINCT ON` keep?"
    options:
      - { vi: "Đơn có mã nhỏ hơn, vì nó được tạo trước", en: "The one with the smaller id, because it was created first" }
      - { vi: "Một trong hai, không được hứa; thêm `id DESC` để chắc", en: "Either one, nothing is promised; add `id DESC` to be sure" }
      - { vi: "Cả hai", en: "Both" }
    answer: 1
    trap: 0
    why:
      vi: "Thứ tự tạo nghe như một luật ngầm, nên dễ đoán đơn cũ hơn. Khi các cột `ORDER BY` bằng nhau, Postgres có thể đưa dòng nào lên trước cũng được; kết quả có thể đổi giữa hai lần chạy. Luôn có cột phân xử."
      en: "Creation order sounds like a hidden rule, so the older order is a tempting guess. When the `ORDER BY` columns tie, Postgres may put either row first, and the result can change between runs. Always add a tie-breaker."
  - q:
      vi: "`DISTINCT ON` khác `DISTINCT` thế nào?"
      en: "How does `DISTINCT ON` differ from `DISTINCT`?"
    options:
      - { vi: "Không khác, chỉ là cách viết dài hơn", en: "No difference, it is just longer" }
      - { vi: "`DISTINCT` bỏ dòng trùng ở mọi cột; `DISTINCT ON (a)` giữ một dòng mỗi giá trị `a`, các cột khác lấy từ dòng đó", en: "`DISTINCT` removes rows repeated on every column; `DISTINCT ON (a)` keeps one row per value of `a`, the other columns taken from that row" }
      - { vi: "`DISTINCT ON` chỉ dùng được với một cột", en: "`DISTINCT ON` only works with one column" }
    answer: 1
    trap: 0
    why:
      vi: "Hai từ khóa trông gần giống nên dễ coi là một. `DISTINCT` cần mọi cột bằng nhau mới gộp; `DISTINCT ON` chỉ nhìn các cột trong ngoặc, và `ORDER BY` chọn dòng đại diện."
      en: "The two keywords look alike, so it is easy to treat them as one. `DISTINCT` only merges rows equal on every column; `DISTINCT ON` looks only at the bracketed columns, and `ORDER BY` picks the representative row."
recap:
  - vi: "`DISTINCT ON (a)` giữ dòng đầu tiên của mỗi nhóm `a`, theo `ORDER BY`."
    en: "`DISTINCT ON (a)` keeps the first row of each group `a`, by the `ORDER BY`."
  - vi: "`ORDER BY` mở đầu bằng cột nhóm (lỗi 42P10), rồi cột chọn dòng thắng, rồi cột phân xử."
    en: "The `ORDER BY` starts with the group columns (error 42P10), then the column that picks the winner, then a tie-breaker."
  - vi: "Muốn mới nhất thì `DESC`."
    en: "For the newest row, use `DESC`."
sources:
  - https://www.postgresql.org/docs/current/sql-select.html#SQL-DISTINCT
---
## Mở bài

Chăm sóc khách hỏi: "Với mỗi khách, đơn gần nhất của họ là đơn nào?" Bạn cần **cả dòng** của đơn đó (mã, ngày), không chỉ ngày lớn nhất. `GROUP BY` với `max` cho ngày nhưng làm mất mã đơn.

## Ý chính

`DISTINCT ON (customer_id)` giữ một dòng cho mỗi giá trị của cột trong ngoặc: dòng đứng đầu nhóm theo `ORDER BY`. Vì vậy `ORDER BY` làm hai việc: mở đầu bằng cột nhóm (để các dòng cùng nhóm nằm liền nhau), rồi xếp trong nhóm để dòng bạn muốn lên đầu.

Nhiều người nghĩ **Postgres tự biết "dòng đầu" là dòng mới nhất**. Thật ra "đầu" chỉ có nghĩa theo `ORDER BY` bạn viết. Không có cột chọn dòng thắng, hoặc có mà không có cột phân xử khi hòa, dòng được giữ là may rủi.

Hình từng bước ở cuối mục này xếp các đơn của khách 5 rồi giữ dòng đầu của mỗi khách.

## Cú pháp

`DISTINCT ON` là cú pháp riêng của Postgres; cách viết chuẩn dùng hàm cửa sổ (Phần 10).

# EN

## Opening

Customer care asks: "For each customer, which is their latest order?" You need **the whole row** of that order (id, date), not just the largest date. `GROUP BY` with `max` gives the date but loses the order id.

## Key idea

`DISTINCT ON (customer_id)` keeps one row for each value of the bracketed column: the row that comes first in its group by the `ORDER BY`. So the `ORDER BY` does two jobs: it starts with the group column (so a group's rows sit together), then sorts inside the group so the row you want comes first.

Many people think **Postgres knows that "first" means the newest**. In fact "first" only means first by the `ORDER BY` you wrote. With no column picking the winner, or one with no tie-breaker for ties, the kept row is luck.

The step-through figure at the end of this section sorts customer 5's orders, then keeps the first row of each customer.

## Syntax

`DISTINCT ON` is Postgres's own syntax; the standard way uses window functions (Part 10).
