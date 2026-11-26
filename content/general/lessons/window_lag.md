---
id: window_lag
title: "So với dòng trước, dòng sau: LAG và LEAD"
title_en: "Comparing with the previous and next row: LAG and LEAD"
minutes: 25
figures: [{ name: sql-lag-prev-row, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Lấy giá trị của dòng trước bằng `LAG` và dòng sau bằng `LEAD`, theo một thứ tự bạn chọn.
    en: Take the previous row's value with `LAG` and the next row's with `LEAD`, in an order you choose.
  - vi: Tính thay đổi và khoảng cách giữa hai dòng liền nhau, trong từng nhóm.
    en: Compute the change and the gap between two neighbouring rows, inside each group.
  - vi: Đặt giá trị mặc định cho dòng đầu, và lọc theo kết quả của `LAG` ở câu ngoài.
    en: Give the first row a default value, and filter on `LAG`'s result in the outer query.
syntax: |-
  SELECT column,
         LAG(column [, offset [, default]])  OVER ([PARTITION BY group_col] ORDER BY sort_col),
         LEAD(column [, offset [, default]]) OVER ([PARTITION BY group_col] ORDER BY sort_col),
         FIRST_VALUE(column) OVER (PARTITION BY group_col ORDER BY sort_col)
  FROM table_name
options:
  - { code: "LAG(col)", vi: "giá trị của dòng ngay trước theo thứ tự trong `OVER`", en: "the value of the row just before, in the `OVER` order" }
  - { code: "LEAD(col)", vi: "giá trị của dòng ngay sau", en: "the value of the row just after" }
  - { code: "offset", vi: "lùi (hay tiến) bao nhiêu dòng; mặc định 1", en: "how many rows back (or ahead); 1 by default" }
  - { code: "default", vi: "giá trị khi không có dòng đó (dòng đầu với `LAG`); mặc định NULL", en: "the value when there is no such row (the first row for `LAG`); NULL by default" }
  - { code: "PARTITION BY col", vi: "dòng đầu của mỗi nhóm không nhìn sang nhóm trước", en: "the first row of each group never looks into the previous group" }
  - { code: "FIRST_VALUE(col)", vi: "giá trị của dòng đầu trong nhóm, đặt cạnh mỗi dòng", en: "the value of the group's first row, placed next to every row" }
examples:
  - title: { vi: "Thay đổi so với ngày trước", en: "The change from the day before" }
    sql: |-
      WITH d AS (
        SELECT order_date, count(*) AS n
        FROM orders
        WHERE store_id = 3 AND order_date BETWEEN '2026-10-25' AND '2026-10-31'
        GROUP BY order_date
      )
      SELECT order_date, n,
             LAG(n, 1, 0) OVER (ORDER BY order_date) AS prev,
             n - LAG(n, 1, 0) OVER (ORDER BY order_date) AS change
      FROM d
      ORDER BY order_date
    read:
      vi: "6 ngày có đơn ở Ben Thanh. Ngày 28/10 có 6 đơn, tăng 4 so với ngày có đơn trước đó. Tham số thứ ba `0` cho dòng đầu một giá trị trước thay vì NULL. Ngày 26/10 không có đơn nên không có dòng: `LAG` lấy dòng trước, không phải ngày trước."
      en: "6 days with orders at Ben Thanh. On 28 October there are 6 orders, up 4 from the previous day with orders. The third argument `0` gives the first row a previous value instead of NULL. 26 October had no order, so it has no row: `LAG` takes the previous row, not the previous day."
  - title: { vi: "Khoảng cách tới đơn kế tiếp", en: "The gap to the next order" }
    sql: |-
      SELECT id, order_date,
             LEAD(order_date) OVER (ORDER BY order_date, id) AS next_date,
             LEAD(order_date) OVER (ORDER BY order_date, id) - order_date AS gap_days
      FROM orders
      WHERE customer_id = 7
      ORDER BY order_date, id
    read:
      vi: "Khách số 7 có 4 đơn. Khoảng nghỉ dài nhất là 260 ngày, từ 22/11/2025 tới 09/08/2026. Đơn cuối không có đơn sau nên `LEAD` trả NULL. Trừ hai ngày ra số ngày."
      en: "Customer 7 has 4 orders. The longest break is 260 days, from 2025-11-22 to 2026-08-09. The last order has no next one, so `LEAD` returns NULL. Subtracting two dates gives a number of days."
  - title: { vi: "Đơn đầu tiên của mỗi khách, cạnh mọi đơn", en: "Each customer's first order, next to every order" }
    sql: |-
      SELECT customer_id, id, order_date,
             FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS first_order
      FROM orders
      WHERE customer_id IN (7, 8)
      ORDER BY customer_id, order_date, id
    read:
      vi: "8 dòng; mỗi dòng mang ngày đơn đầu tiên của chính khách đó. `PARTITION BY customer_id` làm khách 8 bắt đầu lại, không mượn ngày của khách 7."
      en: "8 rows; each carries the first order date of that very customer. `PARTITION BY customer_id` makes customer 8 start over, without borrowing customer 7's date."
  - title: { vi: "Lọc theo khoảng cách", en: "Filtering on the gap" }
    sql: |-
      WITH g AS (
        SELECT id, order_date,
               order_date - LAG(order_date) OVER (ORDER BY order_date, id) AS gap
        FROM orders
        WHERE customer_id = 7
      )
      SELECT id, order_date, gap
      FROM g
      WHERE gap > 30
    read:
      vi: "1 dòng: đơn 951, sau 260 ngày vắng. Khoảng cách tính trong CTE, rồi câu ngoài mới lọc `gap > 30`, vì `WHERE` của cùng câu chưa thấy hàm cửa sổ."
      en: "1 row: order 951, after 260 days away. The gap is computed in the CTE and only the outer query filters `gap > 30`, because the same query's `WHERE` cannot see window functions."
pitfalls:
  - title: { vi: "Quên PARTITION BY", en: "Forgetting PARTITION BY" }
    wrong: "SELECT store_id, month, target_vnd, LAG(target_vnd) OVER (ORDER BY store_id, month) AS prev FROM store_targets WHERE store_id IN (4, 5) AND month BETWEEN '2026-02-01' AND '2026-06-01' ORDER BY store_id, month"
    fix: "SELECT store_id, month, target_vnd, LAG(target_vnd) OVER (PARTITION BY store_id ORDER BY month) AS prev FROM store_targets WHERE store_id IN (4, 5) AND month BETWEEN '2026-02-01' AND '2026-06-01' ORDER BY store_id, month"
    why:
      vi: "Không chia nhóm, dòng đầu của cửa hàng 5 (tháng 2) nhận chỉ tiêu tháng 6 của cửa hàng 4 làm \"tháng trước\". Với `PARTITION BY store_id`, dòng đầu mỗi cửa hàng có NULL, đúng nghĩa \"chưa có tháng trước\"."
      en: "With no groups, store 5's first row (February) gets store 4's June target as its \"previous month\". With `PARTITION BY store_id`, each store's first row gets NULL, which truly means \"no previous month\"."
  - title: { vi: "LAG trong WHERE", en: "LAG in WHERE" }
    wrong: "SELECT id, order_date FROM orders WHERE customer_id = 7 AND order_date - LAG(order_date) OVER (ORDER BY order_date) > 30"
    fix: "WITH g AS (SELECT id, order_date, order_date - LAG(order_date) OVER (ORDER BY order_date, id) AS gap FROM orders WHERE customer_id = 7) SELECT id, order_date FROM g WHERE gap > 30"
    why:
      vi: "Như mọi hàm cửa sổ, `LAG` chạy sau `WHERE`, nên Postgres báo 42P20. Tính nó trong CTE, rồi lọc ở câu ngoài."
      en: "Like every window function, `LAG` runs after `WHERE`, so Postgres raises 42P20. Compute it in a CTE and filter in the outer query."
  - title: { vi: "Thứ tự trong OVER ngược với câu hỏi", en: "An OVER order that runs against the question" }
    wrong: "SELECT id, order_date, LAG(order_date) OVER (ORDER BY order_date DESC, id) AS prev_date FROM orders WHERE customer_id = 7 ORDER BY order_date, id"
    fix: "SELECT id, order_date, LAG(order_date) OVER (ORDER BY order_date, id) AS prev_date FROM orders WHERE customer_id = 7 ORDER BY order_date, id"
    why:
      vi: "\"Dòng trước\" được định nghĩa bởi `ORDER BY` trong `OVER`, không phải `ORDER BY` cuối câu. Sắp giảm dần trong `OVER` làm `LAG` trả về đơn **sau** đó, dù bảng kết quả vẫn hiện theo ngày tăng."
      en: "\"The previous row\" is defined by the `ORDER BY` inside `OVER`, not by the query's final `ORDER BY`. Sorting descending inside `OVER` makes `LAG` return the **later** order, even though the result is still shown by ascending date."
quiz:
  - q:
      vi: "Có ngày không có đơn nào. `LAG(n) OVER (ORDER BY order_date)` trên bảng số đơn theo ngày trả gì cho ngày ngay sau khoảng trống?"
      en: "Some day has no orders. On a table of daily order counts, what does `LAG(n) OVER (ORDER BY order_date)` return for the day right after the gap?"
    options:
      - { vi: "0, số đơn của ngày trống", en: "0, the count of the empty day" }
      - { vi: "Số đơn của dòng ngay trước trong bảng, tức ngày có đơn gần nhất trước đó", en: "The count of the row just before in the table, that is, the last earlier day with orders" }
      - { vi: "NULL", en: "NULL" }
    answer: 1
    trap: 0
    why:
      vi: "`LAG` đếm dòng, không đếm ngày. Ngày không có đơn không có dòng nào, nên nó bị bỏ qua. Muốn so với đúng ngày hôm trước, dựng lịch đủ ngày (`dim_date` hay `generate_series`) rồi `LEFT JOIN` số đơn vào trước."
      en: "`LAG` counts rows, not days. A day with no orders has no row, so it is skipped. To compare with the actual previous day, build a full calendar (`dim_date` or `generate_series`) and `LEFT JOIN` the counts onto it first."
  - q:
      vi: "`LEAD(order_date)` trên dòng cuối cùng của một nhóm trả gì?"
      en: "What does `LEAD(order_date)` return on the last row of a group?"
    options:
      - { vi: "Ngày của dòng đầu nhóm kế tiếp", en: "The date of the next group's first row" }
      - { vi: "NULL, trừ khi bạn cho giá trị mặc định ở tham số thứ ba", en: "NULL, unless you give a default as the third argument" }
      - { vi: "Báo lỗi", en: "An error" }
    answer: 1
    trap: 0
    why:
      vi: "Với `PARTITION BY`, cửa sổ dừng ở biên nhóm: dòng cuối không có dòng sau trong nhóm của nó, nên ra NULL (hoặc giá trị mặc định). Chỉ khi quên `PARTITION BY` thì nó mới nhìn sang nhóm khác."
      en: "With `PARTITION BY`, the window stops at the group boundary: the last row has no next row inside its group, so it gets NULL (or the default). Only when `PARTITION BY` is forgotten does it look into another group."
recap:
  - vi: "`LAG` = dòng trước, `LEAD` = dòng sau, theo `ORDER BY` trong `OVER`."
    en: "`LAG` = the previous row, `LEAD` = the next row, by the `ORDER BY` inside `OVER`."
  - vi: "`PARTITION BY` giữ mỗi nhóm riêng; dòng đầu nhận NULL hoặc giá trị mặc định."
    en: "`PARTITION BY` keeps each group apart; the first row gets NULL or the default."
  - vi: "`LAG` đếm dòng, không đếm ngày; lọc theo nó ở câu ngoài."
    en: "`LAG` counts rows, not days; filter on it in the outer query."
sources:
  - https://www.postgresql.org/docs/current/functions-window.html
  - https://www.postgresql.org/docs/current/tutorial-window.html
---
## Mở bài

"Hôm nay bán nhiều hơn hôm trước bao nhiêu?" và "Khách này nghỉ bao lâu giữa hai lần mua?" đều cần so một dòng với dòng bên cạnh nó. Không có hàm cửa sổ, bạn phải tự nối bảng với chính nó; có `LAG` và `LEAD`, chỉ một cột.

## Ý chính

`LAG(column)` lấy giá trị của dòng **trước**, `LEAD(column)` của dòng **sau**, theo thứ tự trong `OVER (ORDER BY …)`. Lấy giá trị hiện tại trừ `LAG` là ra thay đổi; trừ hai ngày là ra số ngày. `PARTITION BY` giữ mỗi nhóm (mỗi khách, mỗi cửa hàng) riêng, để dòng đầu không mượn số của nhóm khác.

Nhiều người nghĩ **`LAG` trả giá trị của ngày hôm trước**. Thật ra nó trả giá trị của **dòng** trước. Nếu một ngày không có dữ liệu, ngày đó không có dòng, và `LAG` lặng lẽ so với ngày xa hơn. Khi câu hỏi nói "so với hôm qua", dựng lịch đủ ngày trước.

Hình cuối mục này dời cột `n` xuống một dòng trên số đơn của Ben Thanh: ngày 26/10 không có dòng, nên `prev` của 27/10 là số của 25/10.

## Cú pháp

Tham số thứ hai là số dòng lùi (mặc định 1), tham số thứ ba là giá trị khi không có dòng đó.

# EN

## Opening

"How many more did we sell today than the day before?" and "How long did this customer wait between two purchases?" both need to compare a row with its neighbour. Without window functions you would join the table to itself; with `LAG` and `LEAD` it is one column.

## Key idea

`LAG(column)` takes the value of the **previous** row, `LEAD(column)` of the **next** row, in the order given by `OVER (ORDER BY …)`. The current value minus `LAG` is the change; subtracting two dates gives a number of days. `PARTITION BY` keeps each group (each customer, each store) apart, so the first row never borrows another group's number.

Many people think **`LAG` returns the value of the previous day**. In fact it returns the value of the previous **row**. If a day has no data, it has no row, and `LAG` quietly compares with an earlier day. When the question says "compared with yesterday", build a full calendar first.

The figure at the end of this section shifts the `n` column down one row on Ben Thanh's orders: 26 Oct has no row, so 27 Oct's `prev` is 25 Oct's number.

## Syntax

The second argument is how many rows back (1 by default), the third is the value when there is no such row.
