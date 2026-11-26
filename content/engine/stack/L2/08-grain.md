---
id: e-st-l2-08
engine: stack
level: L2
module: dbt
title: "Mart, fact, dimension và grain"
title_en: "Marts, facts, dimensions and grain"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: st-grain-fanout, at: idea }]
objectives:
  - vi: Nói được grain của một bảng fact (một dòng là gì) trước khi cộng hay đếm trên nó.
    en: State a fact table's grain (what one row is) before summing or counting on it.
  - vi: Thấy vì sao nối đơn với dòng hàng rồi cộng tổng đơn làm doanh thu bị nhân lên.
    en: See why joining orders to their items and then summing the order total multiplies revenue.
  - vi: Dựng một mart gom về đúng grain trước khi nối.
    en: Build a mart that aggregates to the right grain before joining.
requires: [e-st-l2-02]
sources:
  - { url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/", title: "Kimball Group: Grain" }
  - { url: "https://docs.getdbt.com/best-practices/how-we-structure/4-marts", title: "dbt docs: Marts: business-defined entities" }
lab:
  setup: |
    CREATE SCHEMA marts;
    CREATE TABLE marts.fct_orders (
      order_id int, customer_id int,
      order_date date, amount_vnd int
    );
    INSERT INTO marts.fct_orders VALUES
      (801, 41, '2026-10-30', 300000),
      (802, 41, '2026-10-30', 120000),
      (803, 42, '2026-10-31', 200000),
      (804, 43, '2026-10-31', 90000);
    CREATE TABLE marts.fct_order_items (
      order_id int, line_no int,
      product text, qty int, line_vnd int
    );
    INSERT INTO marts.fct_order_items VALUES
      (801, 1, 'lamp', 1, 150000),
      (801, 2, 'silk', 2, 100000),
      (801, 3, 'tea', 1, 50000),
      (802, 1, 'tea', 2, 120000),
      (803, 1, 'lamp', 1, 150000),
      (803, 2, 'tea', 1, 50000),
      (804, 1, 'silk', 1, 90000);
    CREATE TABLE marts.dim_customers (
      customer_id int, name text, city text
    );
    INSERT INTO marts.dim_customers VALUES
      (41, 'Lan Silk', 'Da Nang'),
      (42, 'Minh Tea', 'Hoi An'),
      (43, 'Hoa Lamp', 'Da Nang');
  steps:
    - task:
        vi: "Doanh thu theo ngày từ `fct_orders` (một dòng mỗi đơn): `order_date`, `revenue_vnd`."
        en: "Revenue per day from `fct_orders` (one row per order): `order_date`, `revenue_vnd`."
      solution: |
        select order_date,
          sum(amount_vnd) as revenue_vnd
        from {{ ref('fct_orders') }}
        group by order_date
      check: rows
      hint:
        vi: "`sum(amount_vnd)` trên `{{ ref('fct_orders') }}`, `group by order_date`."
        en: "`sum(amount_vnd)` on `{{ ref('fct_orders') }}`, `group by order_date`."
    - task:
        vi: "Mỗi đơn có bao nhiêu dòng hàng và bao nhiêu món, từ `fct_order_items` (một dòng mỗi dòng hàng): `order_id`, `lines` (số dòng), `units` (tổng `qty`)."
        en: "How many lines and how many units each order has, from `fct_order_items` (one row per order line): `order_id`, `lines` (row count), `units` (total `qty`)."
      solution: |
        select order_id,
          count(*) as lines,
          sum(qty) as units
        from {{ ref('fct_order_items') }}
        group by order_id
      check: rows
      hint:
        vi: "`count(*)` và `sum(qty)` trên `{{ ref('fct_order_items') }}`, `group by order_id`."
        en: "`count(*)` and `sum(qty)` on `{{ ref('fct_order_items') }}`, `group by order_id`."
    - task:
        vi: "Dựng model `customer_sales` (marts, bảng): mỗi khách một dòng, `customer_id`, `orders` (số đơn), `revenue_vnd` (tổng `amount_vnd` của đơn), `units` (tổng `qty` của dòng hàng). Đọc hai fact bằng `ref()` và gom dòng hàng về từng đơn trước khi nối."
        en: "Build model `customer_sales` (marts, a table): one row per customer, `customer_id`, `orders` (order count), `revenue_vnd` (total of the orders' `amount_vnd`), `units` (total `qty` of the lines). Read both facts with `ref()` and roll the lines up to each order before joining."
      model: { name: customer_sales, layer: marts, materialized: table }
      solution: |
        {{ config(materialized='table') }}
        with units as (
          select order_id, sum(qty) as units
          from {{ ref('fct_order_items') }}
          group by order_id
        )
        select o.customer_id,
          count(*) as orders,
          sum(o.amount_vnd) as revenue_vnd,
          sum(u.units) as units
        from {{ ref('fct_orders') }} o
        join units u
          on u.order_id = o.order_id
        group by o.customer_id
      after: SELECT customer_id, orders, revenue_vnd, units FROM marts.customer_sales
      check: rows
      hint:
        vi: "Một CTE `units` gom `fct_order_items` theo `order_id`, rồi nối với `fct_orders` và gom theo `customer_id`."
        en: "A CTE `units` grouping `fct_order_items` by `order_id`, then join it to `fct_orders` and group by `customer_id`."
    - task:
        vi: "Doanh thu theo thành phố: nối model `customer_sales` với `dim_customers` (một dòng mỗi khách), trả `city`, `revenue_vnd`."
        en: "Revenue by city: join model `customer_sales` to `dim_customers` (one row per customer), return `city`, `revenue_vnd`."
      solution: |
        select d.city,
          sum(s.revenue_vnd) as revenue_vnd
        from {{ ref('customer_sales') }} s
        join {{ ref('dim_customers') }} d
          on d.customer_id = s.customer_id
        group by d.city
      check: rows
      hint:
        vi: "Hai bảng cùng grain khách, nên nối theo `customer_id` rồi `group by d.city`."
        en: "Both tables have the customer grain, so join on `customer_id` and `group by d.city`."
quiz:
  - q:
      vi: "Đơn 801 có tổng 300.000 đồng và 3 dòng hàng. Nối `fct_orders` với `fct_order_items` rồi `sum(amount_vnd)` cho đơn 801: ra bao nhiêu?"
      en: "Order 801 totals 300,000 VND and has 3 item lines. Join `fct_orders` to `fct_order_items` and `sum(amount_vnd)` for order 801: what comes out?"
    options:
      - { vi: "300.000 đồng", en: "300,000 VND" }
      - { vi: "900.000 đồng", en: "900,000 VND" }
      - { vi: "100.000 đồng", en: "100,000 VND" }
    answer: 1
    trap: 0
    why:
      vi: "300.000 là tổng thật của đơn nên dễ chọn, nhưng sau phép nối đơn 801 xuất hiện một lần cho mỗi dòng hàng, tức 3 dòng, mỗi dòng mang nguyên `amount_vnd` 300.000. Cộng lại: 3 × 300.000 = 900.000. 100.000 là chia đều tổng cho 3 dòng, việc phép nối không làm. Gom về grain đơn trước, rồi mới nối."
      en: "300,000 is the order's true total, so it is tempting, but after the join order 801 appears once per item line, that is 3 rows, each carrying the whole `amount_vnd` of 300,000. Summed: 3 × 300,000 = 900,000. 100,000 would be the total split evenly over 3 lines, which a join does not do. Roll up to the order grain first, then join."
  - q:
      vi: "Grain của `fct_order_items` là gì?"
      en: "What is the grain of `fct_order_items`?"
    options:
      - { vi: "Một dòng cho mỗi dòng hàng của một đơn", en: "One row per line of an order" }
      - { vi: "Một dòng cho mỗi sản phẩm", en: "One row per product" }
      - { vi: "Một dòng cho mỗi đơn", en: "One row per order" }
    answer: 0
    trap: 1
    why:
      vi: "Bảng có cột `product` nên dễ nghĩ mỗi dòng là một sản phẩm, nhưng `tea` xuất hiện ở ba đơn khác nhau (801, 802, 803), nên sản phẩm không phải khóa. Một đơn cũng có nhiều dòng (801 có 3). Khóa là cặp `order_id`, `line_no`: một dòng hàng của một đơn."
      en: "The table has a `product` column, so it is easy to think each row is a product, but `tea` appears in three different orders (801, 802, 803), so the product is not the key. One order also has several rows (801 has 3). The key is the pair `order_id`, `line_no`: one line of one order."
---
## Mở bài

Chợ Lồng Đèn có hai mart: `fct_orders` và `fct_order_items`. Một báo cáo doanh thu theo khách nối hai bảng rồi cộng, và khách Lan Silk bỗng mua hơn gấp đôi (1.020.000 thay vì 420.000 đồng). Bài này tìm vì sao, bằng một khái niệm: grain.

## Ý chính

**Grain** của một bảng là câu trả lời cho "một dòng là gì". `fct_orders` có grain một dòng mỗi đơn; `fct_order_items` có grain một dòng mỗi dòng hàng. Bảng **fact** ghi sự kiện đo được (đơn, dòng hàng, thanh toán); bảng **dimension** mô tả ai, cái gì, ở đâu (khách, sản phẩm). Mart là các bảng cuối của dbt mà người phân tích đọc.

Nối hai bảng khác grain thì dòng của bảng thô hơn bị lặp: đơn 801 có 3 dòng hàng nên sau phép nối nó xuất hiện 3 lần, và `sum(amount_vnd)` cộng tổng đơn 3 lần. Đếm `count(*)` sau phép nối cũng ra số dòng hàng, không phải số đơn. Lỗi này không báo đỏ: câu chạy được và số trông hợp lý.

Cách chữa: gom mỗi bảng về cùng một grain trước khi nối (dòng hàng về đơn, đơn về khách), hoặc lấy mỗi số đo từ bảng có đúng grain của nó. Hình cuối mục cho thấy một đơn tỏa thành ba dòng sau phép nối.

## Cú pháp

```sql
-- roll lines up to the order first
WITH units AS (
  SELECT order_id, sum(qty) AS units
  FROM marts.fct_order_items
  GROUP BY order_id)
SELECT o.order_id, o.amount_vnd,
  u.units
FROM marts.fct_orders o
JOIN units u USING (order_id);
```

- Trước khi nối, nói grain của từng bảng; sau khi nối, grain là của bảng mịn hơn.
- Số đo của đơn (`amount_vnd`) lấy ở grain đơn; số đo của dòng hàng (`qty`) gom lên rồi mới nối.

## Ví dụ

Grain đơn: đơn 801 là một dòng.

```sql
SELECT order_id, amount_vnd
FROM marts.fct_orders
WHERE order_id = 801;
```

Grain dòng hàng: cùng đơn 801 là ba dòng.

```sql
SELECT order_id, line_no, product,
  line_vnd
FROM marts.fct_order_items
WHERE order_id = 801
ORDER BY line_no;
```

## Lỗi hay gặp

Nối rồi cộng tổng đơn: đơn 801 được cộng ba lần.

```sql
-- WRONG: the order total repeats
SELECT o.customer_id,
  sum(o.amount_vnd) AS revenue_vnd
FROM marts.fct_orders o
JOIN marts.fct_order_items i
  ON i.order_id = o.order_id
GROUP BY o.customer_id
ORDER BY o.customer_id;
```

```sql
-- FIX: sum at the order grain
SELECT customer_id,
  sum(amount_vnd) AS revenue_vnd
FROM marts.fct_orders
GROUP BY customer_id
ORDER BY customer_id;
```

Đếm đơn sau phép nối: ra số dòng hàng.

```sql
-- WRONG: counts item lines
SELECT o.customer_id,
  count(*) AS orders
FROM marts.fct_orders o
JOIN marts.fct_order_items i
  ON i.order_id = o.order_id
GROUP BY o.customer_id
ORDER BY o.customer_id;
```

```sql
-- FIX: count distinct orders
SELECT o.customer_id,
  count(DISTINCT o.order_id) AS orders
FROM marts.fct_orders o
JOIN marts.fct_order_items i
  ON i.order_id = o.order_id
GROUP BY o.customer_id
ORDER BY o.customer_id;
```

## Thực hành

Bốn bước: doanh thu theo ngày ở grain đơn, số dòng và số món của từng đơn ở grain dòng hàng, rồi model `customer_sales` gom cả hai về grain khách, cuối cùng nối nó với `dim_customers` (cùng grain khách) để ra doanh thu theo thành phố.

## Tóm tắt

- Grain = một dòng là gì; nói nó trước khi cộng hay đếm.
- Nối hai bảng khác grain thì dòng của bảng thô bị lặp, và tổng của nó bị nhân.
- Gom về cùng grain trước khi nối; lấy mỗi số đo ở grain của nó.
- `count(*)` sau phép nối đếm dòng của bảng mịn hơn.

# EN

## Opening

Lantern Market has two marts: `fct_orders` and `fct_order_items`. A revenue-by-customer report joins them and sums, and customer Lan Silk suddenly buys more than twice as much (1,020,000 instead of 420,000 VND). This lesson finds out why, with one concept: grain.

## Key idea

A table's **grain** is the answer to "what is one row". `fct_orders` has the grain one row per order; `fct_order_items` has one row per order line. A **fact** table records measured events (orders, lines, payments); a **dimension** table describes who, what and where (customers, products). Marts are dbt's final tables that analysts read.

Join two tables of different grain and the rows of the coarser one repeat: order 801 has 3 lines, so after the join it appears 3 times, and `sum(amount_vnd)` adds the order total 3 times. A `count(*)` after the join also counts lines, not orders. This error raises nothing: the query runs and the number looks plausible.

The fix: roll each table up to the same grain before joining (lines to orders, orders to customers), or take each measure from the table that has its grain. The figure at the end of this section shows one order fanning out into three rows after the join.

## Syntax

```sql
-- roll lines up to the order first
WITH units AS (
  SELECT order_id, sum(qty) AS units
  FROM marts.fct_order_items
  GROUP BY order_id)
SELECT o.order_id, o.amount_vnd,
  u.units
FROM marts.fct_orders o
JOIN units u USING (order_id);
```

- Before joining, state each table's grain; after the join, the grain is the finer table's.
- An order measure (`amount_vnd`) is taken at the order grain; a line measure (`qty`) is rolled up before joining.

## Example

The order grain: order 801 is one row.

```sql
SELECT order_id, amount_vnd
FROM marts.fct_orders
WHERE order_id = 801;
```

The line grain: the same order 801 is three rows.

```sql
SELECT order_id, line_no, product,
  line_vnd
FROM marts.fct_order_items
WHERE order_id = 801
ORDER BY line_no;
```

## Common mistakes

Join, then sum the order total: order 801 is added three times.

```sql
-- WRONG: the order total repeats
SELECT o.customer_id,
  sum(o.amount_vnd) AS revenue_vnd
FROM marts.fct_orders o
JOIN marts.fct_order_items i
  ON i.order_id = o.order_id
GROUP BY o.customer_id
ORDER BY o.customer_id;
```

```sql
-- FIX: sum at the order grain
SELECT customer_id,
  sum(amount_vnd) AS revenue_vnd
FROM marts.fct_orders
GROUP BY customer_id
ORDER BY customer_id;
```

Counting orders after the join: it gives the number of lines.

```sql
-- WRONG: counts item lines
SELECT o.customer_id,
  count(*) AS orders
FROM marts.fct_orders o
JOIN marts.fct_order_items i
  ON i.order_id = o.order_id
GROUP BY o.customer_id
ORDER BY o.customer_id;
```

```sql
-- FIX: count distinct orders
SELECT o.customer_id,
  count(DISTINCT o.order_id) AS orders
FROM marts.fct_orders o
JOIN marts.fct_order_items i
  ON i.order_id = o.order_id
GROUP BY o.customer_id
ORDER BY o.customer_id;
```

## Practice

Four steps: revenue per day at the order grain, the lines and units of each order at the line grain, then model `customer_sales` rolling both up to the customer grain, and finally joining it to `dim_customers` (also the customer grain) for revenue by city.

## Recap

- Grain = what one row is; state it before summing or counting.
- Join two tables of different grain and the coarser table's rows repeat, multiplying its totals.
- Roll up to the same grain before joining; take each measure at its own grain.
- `count(*)` after a join counts the finer table's rows.
