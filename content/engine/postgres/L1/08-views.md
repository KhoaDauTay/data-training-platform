---
id: e-pg-l1-08
engine: postgres
level: L1
module: views
title: View và materialized view
title_en: Views and materialized views
kind: lab
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Lưu một câu hỏi hay dùng thành view để cả nhóm gọi lại bằng một tên.
    en: Save a frequent query as a view so the whole team can call it by name.
  - vi: Biết materialized view lưu sẵn kết quả, nhanh khi đọc nhưng cũ đi cho tới khi `REFRESH`.
    en: Know that a materialized view stores its result, fast to read but stale until `REFRESH`.
requires: [e-pg-l1-07]
sources:
  - https://www.postgresql.org/docs/18/tutorial-views.html
  - https://www.postgresql.org/docs/18/sql-createview.html
  - https://www.postgresql.org/docs/18/rules-materializedviews.html
  - https://www.postgresql.org/docs/18/sql-refreshmaterializedview.html
lab:
  setup: |
    CREATE TABLE orders (
      id int PRIMARY KEY,
      customer_id int NOT NULL,
      amount numeric(10,2) NOT NULL,
      status text NOT NULL
    );
    INSERT INTO orders
    SELECT g, 1 + g % 40, (g % 97) * 10 + 5,
           CASE WHEN g % 10 = 0 THEN 'cancelled' ELSE 'paid' END
    FROM generate_series(1, 2000) AS g;
  steps:
    - task:
        vi: "Tạo view `paid_orders` gồm `id, customer_id, amount` của các đơn có `status = 'paid'`."
        en: "Create view `paid_orders` with `id, customer_id, amount` of the orders whose `status = 'paid'`."
      solution: CREATE VIEW paid_orders AS SELECT id, customer_id, amount FROM orders WHERE status = 'paid'
      check: catalog
      hint:
        vi: "`CREATE VIEW name AS SELECT ...`: phần sau `AS` là một câu SELECT bình thường."
        en: "`CREATE VIEW name AS SELECT ...`: what follows `AS` is an ordinary SELECT."
    - task:
        vi: Từ view `paid_orders`, đếm số đơn và tính tổng tiền (hai cột, một dòng).
        en: From view `paid_orders`, count the orders and sum the amounts (two columns, one row).
      solution: SELECT count(*), sum(amount) FROM paid_orders
      check: rows
      hint:
        vi: Dùng view như một bảng trong `FROM`.
        en: Use the view like a table in `FROM`.
    - task:
        vi: "Tạo materialized view `customer_totals` gồm `customer_id` và `total` = tổng `amount` của đơn đã trả tiền, nhóm theo khách."
        en: "Create materialized view `customer_totals` with `customer_id` and `total` = the sum of `amount` over paid orders, grouped by customer."
      solution: CREATE MATERIALIZED VIEW customer_totals AS SELECT customer_id, sum(amount) AS total FROM orders WHERE status = 'paid' GROUP BY customer_id
      check: catalog
      hint:
        vi: "`CREATE MATERIALIZED VIEW name AS SELECT ...`, đặt tên cột tổng bằng `AS total`."
        en: "`CREATE MATERIALIZED VIEW name AS SELECT ...`, and name the sum column with `AS total`."
    - task:
        vi: Lấy 3 khách có `total` lớn nhất từ `customer_totals`; bằng nhau thì `customer_id` nhỏ trước.
        en: Return the 3 customers with the largest `total` from `customer_totals`; on a tie, smaller `customer_id` first.
      solution: SELECT customer_id, total FROM customer_totals ORDER BY total DESC, customer_id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`ORDER BY total DESC, customer_id LIMIT 3`."
        en: "`ORDER BY total DESC, customer_id LIMIT 3`."
---
## Ý chính

View là một câu `SELECT` được đặt tên. Nó không lưu dữ liệu: mỗi lần đọc view, Postgres chạy lại câu gốc trên dữ liệu hiện tại. View giúp gói một logic phức tạp (lọc, join) vào một tên, và chỉ cho người khác thấy những cột cần thấy.

Materialized view thì chạy câu gốc một lần và lưu kết quả như một bảng. Đọc rất nhanh, có thể tạo index trên nó, nhưng kết quả đứng yên cho tới khi bạn gõ `REFRESH MATERIALIZED VIEW`. Hợp với báo cáo tổng hợp nặng mà chấp nhận dữ liệu cũ vài phút hoặc vài giờ.

`REFRESH MATERIALIZED VIEW CONCURRENTLY` cho phép người khác vẫn đọc trong lúc làm mới, nhưng cần một index unique trên materialized view.

## Ví dụ

```sql
CREATE MATERIALIZED VIEW paid_count AS SELECT count(*) AS n FROM orders WHERE status = 'paid';
INSERT INTO orders VALUES (5001, 1, 10, 'paid');
SELECT n AS before_refresh FROM paid_count;
REFRESH MATERIALIZED VIEW paid_count;
SELECT n AS after_refresh FROM paid_count;
```

Trước khi làm mới, `paid_count` vẫn là 1800 dù vừa thêm một đơn; sau `REFRESH` mới thành 1801.

## Thực hành

Bảng `orders` có 2 000 đơn, 10% bị hủy. Tạo một view và một materialized view, rồi đọc từ chúng như từ bảng.

# EN

## Key idea

A view is a named `SELECT`. It stores no data: every time you read the view, Postgres runs the original query against current data. Views wrap complex logic (filters, joins) under one name and expose only the columns others should see.

A materialized view runs its query once and stores the result like a table. Reads are very fast and you can index it, but the result stays frozen until you run `REFRESH MATERIALIZED VIEW`. It suits heavy summary reports where data a few minutes or hours old is acceptable.

`REFRESH MATERIALIZED VIEW CONCURRENTLY` lets others keep reading during the refresh, but it needs a unique index on the materialized view.

## Example

```sql
CREATE MATERIALIZED VIEW paid_count AS SELECT count(*) AS n FROM orders WHERE status = 'paid';
INSERT INTO orders VALUES (5001, 1, 10, 'paid');
SELECT n AS before_refresh FROM paid_count;
REFRESH MATERIALIZED VIEW paid_count;
SELECT n AS after_refresh FROM paid_count;
```

Before the refresh, `paid_count` still says 1800 even though an order was just added; after `REFRESH` it becomes 1801.

## Practice

Table `orders` has 2,000 orders, 10% of them cancelled. Create a view and a materialized view, then read from them like tables.
