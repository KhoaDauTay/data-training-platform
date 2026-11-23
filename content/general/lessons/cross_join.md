---
id: cross_join
title: "CROSS JOIN: dựng lưới mọi tổ hợp"
title_en: "CROSS JOIN: build a grid of every combination"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Ghép mọi dòng của bảng này với mọi dòng của bảng kia để có một lưới đầy đủ.
    en: Pair every row of one table with every row of another to get a full grid.
  - vi: Dùng lưới cửa hàng × ngày rồi `LEFT JOIN` dữ liệu thật vào, để ô không có số liệu vẫn hiện số 0.
    en: Build a store × day grid, then `LEFT JOIN` the real data onto it, so cells with no data still show 0.
  - vi: Ước lượng số dòng trước khi chạy, và nhận ra một `CROSS JOIN` vô tình.
    en: Estimate the row count before running, and spot an accidental `CROSS JOIN`.
syntax: |-
  SELECT a.column, b.column
  FROM table_a a
  CROSS JOIN table_b b
  [LEFT JOIN facts f ON f.a_id = a.id AND f.b_key = b.key]
  [WHERE filter_on_a AND filter_on_b]
options:
  - { code: "CROSS JOIN", vi: "mọi dòng của a đi với mọi dòng của b; không có `ON`", en: "every row of a with every row of b; there is no `ON`" }
  - { code: "FROM a, b", vi: "cách viết cũ, cùng nghĩa với `CROSS JOIN`", en: "the old spelling, same as `CROSS JOIN`" }
  - { code: "số dòng = n × m", vi: "5 cửa hàng × 3 ngày = 15 dòng", en: "5 stores × 3 days = 15 rows" }
  - { code: "(VALUES ('A'), ('B')) AS v(x)", vi: "một bảng nhỏ viết ngay trong câu, hay dùng làm một trục của lưới", en: "a small table written inside the query, handy as one axis of the grid" }
  - { code: "LEFT JOIN … ON", vi: "đặt số liệu thật lên lưới; ô không có số liệu vẫn còn", en: "lays the real data onto the grid; cells with no data stay" }
examples:
  - title: { vi: "Lưới cửa hàng × ngày", en: "A store × day grid" }
    sql: |-
      SELECT s.name, d.date_key
      FROM stores s
      CROSS JOIN dim_date d
      WHERE d.date_key BETWEEN '2026-10-29' AND '2026-10-31'
      ORDER BY s.name, d.date_key
    read:
      vi: "15 dòng = 5 cửa hàng × 3 ngày. Không có điều kiện ghép nào: mỗi cửa hàng gặp đủ mọi ngày. `dim_date` là bảng lịch, có mọi ngày của 2025–2026."
      en: "15 rows = 5 stores × 3 days. There is no join condition: every store meets every day. `dim_date` is a calendar table holding every day of 2025–2026."
  - title: { vi: "Đặt số đơn lên lưới, kể cả số 0", en: "Order counts on the grid, zeros included" }
    sql: |-
      SELECT s.name, d.date_key, count(o.id) AS orders
      FROM stores s
      CROSS JOIN dim_date d
      LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = d.date_key
      WHERE d.date_key BETWEEN '2026-10-29' AND '2026-10-31'
      GROUP BY s.name, d.date_key
      ORDER BY s.name, d.date_key
    read:
      vi: "Vẫn 15 dòng; Hoan Kiem ngày 29/10 có 0 đơn mà vẫn hiện. Chỉ nhóm theo `orders` thì ô đó biến mất và biểu đồ theo ngày bị \"hụt\" một cột."
      en: "Still 15 rows; Hoan Kiem on 29 October has 0 orders and still shows. Grouping `orders` alone would lose that cell and leave a gap in a daily chart."
  - title: { vi: "Một trục viết tay bằng VALUES", en: "A hand-written axis with VALUES" }
    sql: |-
      SELECT s.name, c.channel
      FROM stores s
      CROSS JOIN (VALUES ('ONLINE'), ('STORE')) AS c(channel)
      ORDER BY s.name, c.channel
    read:
      vi: "10 dòng = 5 cửa hàng × 2 kênh. `VALUES` dựng một bảng hai dòng ngay trong câu; tiện khi trục của lưới không nằm sẵn trong bảng nào."
      en: "10 rows = 5 stores × 2 channels. `VALUES` builds a two-row table inside the query; handy when an axis of the grid is not in any table."
  - title: { vi: "Cách viết cũ bằng dấu phẩy", en: "The old comma spelling" }
    sql: |-
      SELECT p.name, s.name AS store
      FROM products p, stores s
      WHERE p.category = 'Stationery' AND s.city = 'Hanoi'
    read:
      vi: "6 dòng = 6 món văn phòng phẩm × 1 cửa hàng ở Hà Nội. Dấu phẩy giữa hai bảng là `CROSS JOIN`; các điều kiện ở đây chỉ lọc từng bảng, không ghép chúng."
      en: "6 rows = 6 stationery items × 1 store in Hanoi. A comma between two tables is a `CROSS JOIN`; the conditions here only filter each table, they do not pair them."
  - title: { vi: "Kiểm tra cỡ của lưới", en: "Checking the size of the grid" }
    sql: |-
      SELECT count(*)
      FROM stores
      CROSS JOIN products
    read:
      vi: "150 = 5 × 30. Trước khi ghép hai bảng lớn, nhân số dòng của chúng: 10.000 × 10.000 là 100 triệu dòng."
      en: "150 = 5 × 30. Before crossing two big tables, multiply their row counts: 10,000 × 10,000 is 100 million rows."
pitfalls:
  - title: { vi: "CROSS JOIN khi bạn muốn JOIN", en: "CROSS JOIN when you meant JOIN" }
    wrong: "SELECT count(*) FROM orders o CROSS JOIN stores s WHERE o.order_date = '2026-10-31'"
    fix: "SELECT count(*) FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-31'"
    why:
      vi: "Thiếu điều kiện ghép, mỗi đơn đi với cả 5 cửa hàng: 25 dòng thay vì 5, và mọi tổng tính trên đó gấp 5 lần. Khi số dòng tăng đúng bằng cỡ của một bảng, hãy tìm `ON` bị thiếu."
      en: "With no join condition, each order goes with all 5 stores: 25 rows instead of 5, and every total built on it is 5 times too big. When the row count grows by exactly one table's size, look for a missing `ON`."
  - title: { vi: "count(*) trên lưới đếm cả ô trống", en: "count(*) on the grid counts empty cells" }
    wrong: "SELECT s.name, d.date_key, count(*) AS orders FROM stores s CROSS JOIN dim_date d LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = d.date_key WHERE d.date_key BETWEEN '2026-10-29' AND '2026-10-31' GROUP BY s.name, d.date_key"
    fix: "SELECT s.name, d.date_key, count(o.id) AS orders FROM stores s CROSS JOIN dim_date d LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = d.date_key WHERE d.date_key BETWEEN '2026-10-29' AND '2026-10-31' GROUP BY s.name, d.date_key"
    why:
      vi: "Ô không có đơn vẫn là một dòng của lưới, nên `count(*)` cho nó 1: Hoan Kiem ngày 29/10 hiện 1 đơn thay vì 0. Đếm cột của bảng số liệu (`o.id`)."
      en: "A cell with no order is still one row of the grid, so `count(*)` gives it 1: Hoan Kiem on 29 October shows 1 order instead of 0. Count a column of the data table (`o.id`)."
  - title: { vi: "Nối thường sau lưới làm mất ô trống", en: "A plain join after the grid drops empty cells" }
    wrong: "SELECT s.name, d.date_key, count(o.id) AS orders FROM stores s CROSS JOIN dim_date d JOIN orders o ON o.store_id = s.id AND o.order_date = d.date_key WHERE d.date_key BETWEEN '2026-10-29' AND '2026-10-31' GROUP BY s.name, d.date_key"
    fix: "SELECT s.name, d.date_key, count(o.id) AS orders FROM stores s CROSS JOIN dim_date d LEFT JOIN orders o ON o.store_id = s.id AND o.order_date = d.date_key WHERE d.date_key BETWEEN '2026-10-29' AND '2026-10-31' GROUP BY s.name, d.date_key ORDER BY s.name"
    why:
      vi: "Dựng lưới để giữ ô trống, rồi `JOIN` thường lại bỏ chúng: 12 dòng thay vì 15. Số liệu thật phải gắn vào lưới bằng `LEFT JOIN`."
      en: "You built the grid to keep empty cells, then a plain `JOIN` throws them away: 12 rows instead of 15. Real data must be attached to the grid with `LEFT JOIN`."
quiz:
  - q:
      vi: "`stores` có 5 dòng, `dim_date` có 730 dòng. `stores CROSS JOIN dim_date` (không lọc) có bao nhiêu dòng?"
      en: "`stores` has 5 rows, `dim_date` 730. How many rows does `stores CROSS JOIN dim_date` (no filter) have?"
    options:
      - { vi: "735", en: "735" }
      - { vi: "3650", en: "3650" }
      - { vi: "730, bảng lớn hơn quyết định", en: "730, the bigger table decides" }
    answer: 1
    trap: 0
    why:
      vi: "\"Ghép hai bảng\" nghe như đặt chúng nối đuôi nhau, nên dễ cộng 5 + 730. `CROSS JOIN` là mọi cặp, nên số dòng là tích: 5 × 730."
      en: "\"Combining two tables\" sounds like stacking them, so 5 + 730 is a tempting sum. `CROSS JOIN` makes every pair, so the row count is the product: 5 × 730."
  - q:
      vi: "Khi nào nên dùng `CROSS JOIN` có chủ ý?"
      en: "When should you use a `CROSS JOIN` on purpose?"
    options:
      - { vi: "Khi cần mọi tổ hợp, như lưới cửa hàng × ngày để ô trống cũng hiện", en: "When you need every combination, such as a store × day grid so empty cells show" }
      - { vi: "Khi hai bảng không có khóa chung, để \"cho chúng khớp\"", en: "When two tables share no key, to \"make them match\"" }
      - { vi: "Không bao giờ, nó luôn là lỗi", en: "Never, it is always a mistake" }
    answer: 0
    trap: 2
    why:
      vi: "Vì `CROSS JOIN` vô tình là lỗi hay gặp, nhiều người nghĩ nó luôn sai. Dùng có chủ ý, nó là cách chuẩn để dựng lưới đầy đủ trước khi đặt số liệu lên. Hai bảng không có khóa chung thì ghép mọi cặp không làm chúng \"khớp\", chỉ nhân dòng."
      en: "Because an accidental `CROSS JOIN` is a common bug, many people think it is always wrong. Used on purpose, it is the standard way to build a full grid before laying data on it. For two tables with no shared key, pairing everything does not make them \"match\"; it only multiplies rows."
recap:
  - vi: "`CROSS JOIN` ghép mọi cặp: số dòng là tích hai bảng."
    en: "`CROSS JOIN` makes every pair: the row count is the product of both tables."
  - vi: "Dựng lưới bằng `CROSS JOIN`, đặt số liệu bằng `LEFT JOIN`, đếm bằng `count(o.id)`."
    en: "Build the grid with `CROSS JOIN`, lay data on with `LEFT JOIN`, count with `count(o.id)`."
  - vi: "Số dòng tăng đúng bằng cỡ một bảng: tìm `ON` bị thiếu."
    en: "Row count grown by exactly one table's size: look for a missing `ON`."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
  - https://www.postgresql.org/docs/current/queries-values.html
---
## Mở bài

Biểu đồ số đơn theo ngày của từng cửa hàng có chỗ "hụt": hôm Hoan Kiem không bán được đơn nào, ngày đó không có trên trục. Dữ liệu đơn hàng chỉ có ngày **có** đơn. Bạn cần một lưới đủ mọi cửa hàng × mọi ngày trước, rồi mới đặt số liệu lên.

## Ý chính

`CROSS JOIN` ghép mỗi dòng của bảng này với **mọi** dòng của bảng kia, không cần điều kiện. 5 cửa hàng × 3 ngày cho 15 dòng: một lưới đầy đủ. Sau đó `LEFT JOIN` bảng số liệu vào lưới; ô không có số liệu vẫn còn, và `count(o.id)` cho nó 0.

Nhiều người nghĩ **`CROSS JOIN` chỉ là lỗi quên điều kiện ghép**. Đúng là quên `ON` sẽ cho ra đúng một `CROSS JOIN` ngoài ý muốn, nhân số dòng lên. Nhưng dùng có chủ ý, nó là công cụ duy nhất tạo ra những dòng **không có** trong dữ liệu, như ngày không bán được gì.

## Cú pháp

`CROSS JOIN` không có `ON`. Lọc từng bảng trong `WHERE` để lưới không lớn hơn mức cần.

# EN

## Opening

The chart of daily orders per store has gaps: on a day Hoan Kiem sold nothing, that day is missing from its axis. The order data only holds days **with** orders. You need a grid of every store × every day first, and only then lay the numbers on it.

## Key idea

`CROSS JOIN` pairs each row of one table with **every** row of another, with no condition. 5 stores × 3 days gives 15 rows: a full grid. Then `LEFT JOIN` the data table onto the grid; cells with no data stay, and `count(o.id)` gives them 0.

Many people think **`CROSS JOIN` is just the bug of a forgotten join condition**. It is true that forgetting `ON` gives exactly an unwanted `CROSS JOIN` that multiplies rows. But used on purpose, it is the one tool that creates rows that are **not** in the data, such as days when nothing sold.

## Syntax

`CROSS JOIN` has no `ON`. Filter each table in `WHERE` so the grid is no bigger than needed.
