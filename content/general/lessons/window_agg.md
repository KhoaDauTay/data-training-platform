---
id: window_agg
title: "Tổng chạy, trung bình trượt và tỉ trọng: SUM/AVG/COUNT OVER"
title_en: "Running totals, moving averages and shares: SUM/AVG/COUNT OVER"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Dùng `SUM`, `AVG`, `COUNT` làm hàm cửa sổ để giữ từng dòng mà vẫn có số tổng.
    en: Use `SUM`, `AVG`, `COUNT` as window functions to keep every row and still get a total.
  - vi: Tính tổng chạy với `ORDER BY` trong `OVER`, và tỉ trọng với `OVER ()`.
    en: Compute a running total with `ORDER BY` inside `OVER`, and a share with `OVER ()`.
  - vi: Viết khung `ROWS BETWEEN … PRECEDING AND CURRENT ROW` cho trung bình trượt, và biết bẫy đồng hạng của khung mặc định.
    en: Write a `ROWS BETWEEN … PRECEDING AND CURRENT ROW` frame for a moving average, and know the tie trap of the default frame.
syntax: |-
  SELECT column,
         aggregate(column) OVER (
           [PARTITION BY group_col]
           [ORDER BY sort_col]
           [ROWS BETWEEN n PRECEDING AND CURRENT ROW]
         )
  FROM table_name
options:
  - { code: "OVER ()", vi: "cả kết quả là một cửa sổ: tổng chung đặt cạnh mỗi dòng", en: "the whole result is one window: the grand total next to every row" }
  - { code: "OVER (PARTITION BY col)", vi: "tổng (hay trung bình) của nhóm của dòng đó", en: "the total (or average) of that row's group" }
  - { code: "OVER (ORDER BY col)", vi: "tổng chạy: từ dòng đầu tới dòng hiện tại", en: "a running total: from the first row to the current one" }
  - { code: "ROWS BETWEEN 2 PRECEDING AND CURRENT ROW", vi: "khung 3 dòng: hai dòng trước và dòng này", en: "a 3-row frame: the two rows before and this one" }
  - { code: "RANGE", vi: "khung mặc định: khi có `ORDER BY`, các dòng bằng nhau về thứ tự được cộng cùng lúc", en: "the default frame: with `ORDER BY`, rows equal in the order are added together" }
examples:
  - title: { vi: "Tỉ trọng của mỗi nhóm", en: "Each group's share" }
    sql: |-
      SELECT category, count(*) AS n,
             round(100.0 * count(*) / SUM(count(*)) OVER (), 1) AS pct
      FROM products
      GROUP BY category
      ORDER BY category
    read:
      vi: "5 nhóm, mỗi nhóm 6 món, đúng 20%. `GROUP BY` chạy trước, rồi `SUM(count(*)) OVER ()` cộng số đếm của mọi nhóm (30) và đặt cạnh từng dòng để chia."
      en: "5 categories, 6 items each, exactly 20%. `GROUP BY` runs first, then `SUM(count(*)) OVER ()` adds up every group's count (30) and places it next to each row for the division."
  - title: { vi: "Tổng chạy", en: "A running total" }
    sql: |-
      WITH d AS (
        SELECT order_date, count(*) AS n
        FROM orders
        WHERE store_id = 3 AND order_date BETWEEN '2026-10-25' AND '2026-10-31'
        GROUP BY order_date
      )
      SELECT order_date, n, SUM(n) OVER (ORDER BY order_date) AS running
      FROM d
      ORDER BY order_date
    read:
      vi: "Ben Thanh: 4 đơn ngày 25/10, cộng dồn tới 31/10 là 22 đơn. Có `ORDER BY` trong `OVER` thì tổng dừng ở dòng hiện tại thay vì lấy cả bảng."
      en: "Ben Thanh: 4 orders on 25 October, 22 orders accumulated by 31 October. With `ORDER BY` inside `OVER`, the total stops at the current row instead of taking the whole table."
  - title: { vi: "Trung bình trượt 3 dòng", en: "A 3-row moving average" }
    sql: |-
      WITH d AS (
        SELECT order_date, count(*) AS n
        FROM orders
        WHERE store_id = 3 AND order_date BETWEEN '2026-10-25' AND '2026-10-31'
        GROUP BY order_date
      )
      SELECT order_date, n,
             round(AVG(n) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg3
      FROM d
      ORDER BY order_date
    read:
      vi: "Ngày 30/10: trung bình của 6, 4, 4 là 4,67. Khung `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` chỉ nhìn 3 dòng, nên con số mượt hơn số từng ngày mà không trôi theo cả quá khứ."
      en: "On 30 October: the average of 6, 4, 4 is 4.67. The `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` frame looks at 3 rows only, so the number is smoother than each day's count without dragging the whole past along."
  - title: { vi: "So mỗi món với trung bình nhóm của nó", en: "Each item against its group's average" }
    sql: |-
      SELECT name, category, price_vnd,
             round(AVG(price_vnd) OVER (PARTITION BY category)) AS cat_avg
      FROM products
      WHERE category IN ('Drinks', 'Household')
      ORDER BY category, price_vnd
    read:
      vi: "12 dòng: đồ uống trung bình khoảng 20.167 đồng, đồ gia dụng khoảng 53.833. Mỗi món giữ dòng của mình, nên có thể so trực tiếp: bột giặt 129.000 gấp hơn hai lần trung bình nhóm."
      en: "12 rows: drinks average about 20,167 VND, household items about 53,833. Each item keeps its own row, so you can compare directly: the laundry powder at 129,000 is more than twice its group's average."
pitfalls:
  - title: { vi: "Tổng chạy và các dòng đồng hạng", en: "Running totals and tied rows" }
    wrong: "SELECT id, order_date, COUNT(*) OVER (ORDER BY order_date) AS running FROM orders WHERE store_id = 3 AND order_date >= '2026-10-28' ORDER BY order_date, id"
    fix: "SELECT id, order_date, COUNT(*) OVER (ORDER BY order_date, id) AS running FROM orders WHERE store_id = 3 AND order_date >= '2026-10-28' ORDER BY order_date, id"
    why:
      vi: "Khung mặc định là `RANGE`: mọi đơn cùng ngày là \"đồng hạng\" nên được đếm cùng lúc, và cả 6 đơn ngày 28/10 đều hiện 6. Thêm `id` vào `ORDER BY` (hoặc dùng `ROWS`) để tổng chạy tăng từng dòng 1, 2, 3."
      en: "The default frame is `RANGE`: every order of the same day is a \"peer\", so they are counted together, and all 6 orders of 28 October show 6. Add `id` to the `ORDER BY` (or use `ROWS`) so the running total grows row by row 1, 2, 3."
  - title: { vi: "GROUP BY khi bạn muốn giữ từng dòng", en: "GROUP BY when you want to keep every row" }
    wrong: "SELECT name, category, SUM(price_vnd) FROM products GROUP BY category"
    fix: "SELECT name, category, SUM(price_vnd) OVER (PARTITION BY category) AS cat_total FROM products WHERE category = 'Drinks'"
    why:
      vi: "`GROUP BY category` gộp mỗi nhóm thành một dòng, nên `name` không còn chỗ: Postgres báo 42803. Muốn tổng nhóm đứng cạnh từng món, dùng `SUM(…) OVER (PARTITION BY category)`."
      en: "`GROUP BY category` collapses each group into one row, so `name` has nowhere to go: Postgres raises 42803. To put the group total next to each item, use `SUM(…) OVER (PARTITION BY category)`."
  - title: { vi: "Trung bình trượt quên khung", en: "A moving average without a frame" }
    wrong: "WITH d AS (SELECT order_date, count(*) AS n FROM orders WHERE store_id = 3 AND order_date BETWEEN '2026-10-25' AND '2026-10-31' GROUP BY order_date) SELECT order_date, n, round(AVG(n) OVER (ORDER BY order_date), 2) AS avg3 FROM d ORDER BY order_date"
    fix: "WITH d AS (SELECT order_date, count(*) AS n FROM orders WHERE store_id = 3 AND order_date BETWEEN '2026-10-25' AND '2026-10-31' GROUP BY order_date) SELECT order_date, n, round(AVG(n) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg3 FROM d ORDER BY order_date"
    why:
      vi: "Không có khung, `AVG … OVER (ORDER BY …)` là trung bình từ dòng đầu tới hiện tại (trung bình tích lũy), không phải 3 dòng gần nhất: ngày 30/10 ra 4,00 thay vì 4,67. Ghi rõ `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`."
      en: "With no frame, `AVG … OVER (ORDER BY …)` is the average from the first row to the current one (a cumulative average), not the last 3 rows: 30 October shows 4.00 instead of 4.67. Spell out `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`."
quiz:
  - q:
      vi: "`SUM(x) OVER ()` và `SUM(x) OVER (ORDER BY d)` khác nhau thế nào?"
      en: "How do `SUM(x) OVER ()` and `SUM(x) OVER (ORDER BY d)` differ?"
    options:
      - { vi: "Giống nhau; `ORDER BY` chỉ sắp lại kết quả", en: "They are the same; `ORDER BY` only re-sorts the result" }
      - { vi: "Cái đầu là tổng của mọi dòng; cái sau là tổng chạy tới dòng hiện tại", en: "The first is the total of every row; the second is a running total up to the current row" }
      - { vi: "Cái sau báo lỗi vì thiếu `PARTITION BY`", en: "The second fails because it lacks `PARTITION BY`" }
    answer: 1
    trap: 0
    why:
      vi: "Thêm `ORDER BY` vào `OVER` đổi cả khung: từ \"mọi dòng\" thành \"từ đầu tới dòng này\". Nó không chỉ sắp xếp; muốn sắp kết quả, dùng `ORDER BY` cuối câu."
      en: "Adding `ORDER BY` to `OVER` changes the frame too: from \"every row\" to \"from the start to this row\". It does not just sort; to sort the result, use the final `ORDER BY`."
  - q:
      vi: "Bạn cần tổng doanh thu của mỗi cửa hàng nằm cạnh từng đơn của cửa hàng đó. Cách nào?"
      en: "You need each store's total revenue next to every order of that store. Which way?"
    options:
      - { vi: "`GROUP BY store_id` rồi chọn thêm cột của đơn", en: "`GROUP BY store_id` and also select the order's columns" }
      - { vi: "`SUM(…) OVER (PARTITION BY store_id)`", en: "`SUM(…) OVER (PARTITION BY store_id)`" }
      - { vi: "`SUM(…) OVER (ORDER BY store_id)`", en: "`SUM(…) OVER (ORDER BY store_id)`" }
    answer: 1
    trap: 0
    why:
      vi: "`GROUP BY` gộp mất từng đơn (và báo 42803 nếu bạn vẫn chọn cột của đơn). `PARTITION BY` cho tổng của nhóm mà giữ nguyên mọi dòng; `ORDER BY store_id` sẽ ra tổng chạy qua các cửa hàng, không phải tổng từng cửa hàng."
      en: "`GROUP BY` collapses the orders (and raises 42803 if you still select order columns). `PARTITION BY` gives the group total and keeps every row; `ORDER BY store_id` would give a running total across stores, not each store's total."
recap:
  - vi: "`OVER ()` = tổng chung cạnh mỗi dòng; `PARTITION BY` = tổng của nhóm; `ORDER BY` = tổng chạy."
    en: "`OVER ()` = grand total next to each row; `PARTITION BY` = the group's total; `ORDER BY` = a running total."
  - vi: "Khung mặc định cộng các dòng đồng hạng cùng lúc; thêm cột phân định hay dùng `ROWS`."
    en: "The default frame adds tied rows together; add a tie-breaking column or use `ROWS`."
  - vi: "Trung bình trượt cần khung rõ ràng: `ROWS BETWEEN n PRECEDING AND CURRENT ROW`."
    en: "A moving average needs an explicit frame: `ROWS BETWEEN n PRECEDING AND CURRENT ROW`."
sources:
  - https://www.postgresql.org/docs/current/tutorial-window.html
  - https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  - https://www.postgresql.org/docs/current/functions-window.html
---
## Mở bài

Báo cáo tuần cần ba cột cạnh số đơn mỗi ngày: cộng dồn từ đầu tuần, trung bình ba ngày gần nhất, và phần trăm của cả tuần. Cả ba là phép cộng hay trung bình quen thuộc, chỉ là không được gộp mất từng ngày.

## Ý chính

`SUM`, `AVG`, `COUNT`, `MIN`, `MAX` thêm `OVER (…)` thì thành hàm cửa sổ: mỗi dòng giữ nguyên và nhận con số tính trên một **khung** dòng. `OVER ()` là cả kết quả; `PARTITION BY` là nhóm của dòng; có `ORDER BY` thì khung chạy từ dòng đầu tới dòng hiện tại, thành tổng chạy.

Nhiều người nghĩ **`ORDER BY` trong `OVER` chỉ để sắp xếp**. Thật ra nó đổi khung. Và khung mặc định tính theo giá trị: các dòng có cùng giá trị sắp xếp (cùng ngày chẳng hạn) được cộng cùng một lúc. Muốn đúng "từng dòng", thêm cột phân định hoặc viết `ROWS BETWEEN …`.

## Cú pháp

Hàm gộp thường và hàm cửa sổ có thể đứng chung: `GROUP BY` chạy trước, `OVER` tính trên kết quả đã gộp.

# EN

## Opening

The weekly report needs three columns next to each day's order count: the total so far this week, the average of the last three days, and the share of the whole week. All three are familiar sums or averages; they just must not collapse the days.

## Key idea

`SUM`, `AVG`, `COUNT`, `MIN`, `MAX` with `OVER (…)` become window functions: every row stays and gets a number computed over a **frame** of rows. `OVER ()` is the whole result; `PARTITION BY` is the row's group; with `ORDER BY`, the frame runs from the first row to the current one, which makes a running total.

Many people think **`ORDER BY` inside `OVER` only sorts**. In fact it changes the frame. And the default frame works by value: rows with the same sort value (the same day, say) are added at once. To get true "row by row", add a tie-breaking column or write `ROWS BETWEEN …`.

## Syntax

Ordinary aggregates and window functions can sit together: `GROUP BY` runs first, then `OVER` computes over the grouped result.
