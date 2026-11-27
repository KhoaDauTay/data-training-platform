---
id: e-ds-l4-05
engine: design
level: L4
module: denormalize
title: Khi nào phi chuẩn hóa - grain, star schema, bản sao có kiểm soát
title_en: When to denormalise - grain, star schemas, controlled copies
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-star-schema, at: idea }]
objectives:
  - vi: Nói được vì sao bảng báo cáo hay bảng tài liệu cố ý lưu lặp, và cái giá phải trả khi ghi.
    en: Say why reporting tables and document tables repeat data on purpose, and what it costs on writes.
  - vi: Đọc một star schema theo grain của bảng fact.
    en: Read a star schema by the grain of its fact table.
  - vi: Giữ bản sao khớp nguồn bằng materialized view, cột generated hoặc trigger.
    en: Keep a copy in step with its source with a materialized view, a generated column or a trigger.
requires: [e-ds-l4-02]
sources:
  - { url: https://www.postgresql.org/docs/18/rules-materializedviews.html, title_vi: "Materialized view" }
  - { url: https://www.postgresql.org/docs/18/sql-refreshmaterializedview.html, title_vi: "REFRESH MATERIALIZED VIEW" }
  - { url: https://www.postgresql.org/docs/18/ddl-generated-columns.html, title_vi: "Cột sinh tự động (generated column)" }
  - { url: https://www.postgresql.org/docs/18/datatype-json.html, title_vi: "Kiểu JSON" }
lab:
  setup: |
    CREATE TABLE stores (id int PRIMARY KEY, city text NOT NULL);
    CREATE TABLE products (id int PRIMARY KEY, name text NOT NULL, category text NOT NULL);
    CREATE TABLE sales (
      id int PRIMARY KEY,
      product_id int NOT NULL REFERENCES products (id),
      store_id int NOT NULL REFERENCES stores (id),
      sold_on date NOT NULL,
      qty int NOT NULL,
      price numeric(10,2) NOT NULL
    );
    INSERT INTO stores VALUES (1, 'Hue'), (2, 'Da Nang'), (3, 'Hoi An');
    INSERT INTO products VALUES (1, 'pen', 'office'), (2, 'bag', 'travel'), (3, 'map', 'travel');
    INSERT INTO sales VALUES
      (1, 1, 1, '2026-10-01', 10, 5.00), (2, 2, 1, '2026-10-02', 1, 300.00), (3, 3, 2, '2026-10-02', 4, 20.00),
      (4, 1, 2, '2026-10-03', 20, 5.00), (5, 2, 3, '2026-10-04', 2, 300.00);
  steps:
    - task:
        vi: "Tạo materialized view `city_revenue` từ đúng câu `SELECT st.city, sum(s.qty * s.price) AS revenue FROM sales s JOIN stores st ON st.id = s.store_id GROUP BY st.city`, nhưng chưa đổ dữ liệu (`WITH NO DATA`)."
        en: "Create the materialized view `city_revenue` from exactly `SELECT st.city, sum(s.qty * s.price) AS revenue FROM sales s JOIN stores st ON st.id = s.store_id GROUP BY st.city`, but with no data yet (`WITH NO DATA`)."
      solution: CREATE MATERIALIZED VIEW city_revenue AS SELECT st.city, sum(s.qty * s.price) AS revenue FROM sales s JOIN stores st ON st.id = s.store_id GROUP BY st.city WITH NO DATA
      check: catalog
      hint:
        vi: "`CREATE MATERIALIZED VIEW name AS SELECT … WITH NO DATA`."
        en: "`CREATE MATERIALIZED VIEW name AS SELECT … WITH NO DATA`."
    - task:
        vi: "Đổ dữ liệu cho `city_revenue` để đọc được."
        en: "Fill `city_revenue` so it can be read."
      solution: REFRESH MATERIALIZED VIEW city_revenue
      after: SELECT city, revenue FROM city_revenue ORDER BY city
      check: rows
      ordered: true
      hint:
        vi: "`REFRESH MATERIALIZED VIEW city_revenue` chạy lại câu `SELECT` và lưu kết quả."
        en: "`REFRESH MATERIALIZED VIEW city_revenue` reruns the `SELECT` and stores the result."
    - task:
        vi: "Báo cáo nhanh: đọc `city_revenue`, trả `city`, `revenue`, doanh thu cao nhất trước."
        en: "A quick report: read `city_revenue`, return `city`, `revenue`, highest revenue first."
      solution: SELECT city, revenue FROM city_revenue ORDER BY revenue DESC
      check: rows
      ordered: true
      hint:
        vi: "Đọc như một bảng, `ORDER BY revenue DESC`."
        en: "Read it like a table, `ORDER BY revenue DESC`."
quiz:
  - q:
      vi: "Bạn tạo materialized view tổng doanh thu lúc 9 giờ. 10 giờ có thêm đơn. Đọc view lúc 11 giờ thấy gì?"
      en: "You create a revenue materialized view at 9 o'clock. More orders arrive at 10. What do you see reading it at 11?"
    options:
      - { vi: "Số mới nhất: view luôn tính lại khi đọc", en: "The latest figure: the view always recomputes on read" }
      - { vi: "Số lúc 9 giờ, cho tới khi chạy `REFRESH MATERIALIZED VIEW`", en: "The 9 o'clock figure, until you run `REFRESH MATERIALIZED VIEW`" }
      - { vi: "Lỗi, vì dữ liệu nguồn đã đổi", en: "An error, because the source data changed" }
    answer: 1
    trap: 0
    why:
      vi: "View thường thì tính lại mỗi lần đọc, nhưng materialized view lưu kết quả lúc 9 giờ như một bảng, nên lúc 11 giờ vẫn trả số cũ. Nó cũng không báo lỗi: Postgres không theo dõi bảng nguồn để biết view đã cũ. Số chỉ mới sau `REFRESH MATERIALIZED VIEW`; vì vậy mỗi bản sao cần ghi rõ ai làm mới và lúc nào."
      en: "A plain view recomputes on every read, but a materialized view stored its 9 o'clock result like a table, so at 11 it still returns the old figure. It raises no error either: Postgres does not watch the source tables to know the view is stale. The figure updates only after `REFRESH MATERIALIZED VIEW`; that is why every copy needs a note saying who refreshes it and when."
  - q:
      vi: "Bảng fact `sales` có grain \"một dòng = một món trong một đơn\". Cột nào KHÔNG nên đặt vào nó?"
      en: "Fact table `sales` has the grain \"one row = one item in one order\". Which column should NOT go in it?"
    options:
      - { vi: "`qty` của món đó", en: "That item's `qty`" }
      - { vi: "`order_total` của cả đơn", en: "The whole order's `order_total`" }
      - { vi: "`product_id` của món đó", en: "That item's `product_id`" }
    answer: 1
    trap: 2
    why:
      vi: "`product_id` không thừa: nó là khóa ngoại tới bảng chiều sản phẩm, cách bảng fact nối ra các chiều. `qty` cũng đúng chỗ vì nó đo chính món đó. `order_total` thì đo cả đơn, khác mức chi tiết (grain) của dòng: một đơn ba món lặp tổng ba lần, và `sum(order_total)` cộng nó ba lần. Tổng của đơn thuộc về một bảng fact ở grain đơn hàng, hoặc tính bằng `sum` trên các món."
      en: "`product_id` is not redundant: it is the foreign key to the product dimension, the way a fact table joins out to its dimensions. `qty` belongs too, since it measures that item. `order_total` measures the whole order, a different grain from the row: a three-item order repeats the total three times, and `sum(order_total)` adds it three times. The order total belongs in a fact table at order grain, or is computed with `sum` over the items."
---
## Mở bài

Cấp 4 dạy tách bảng để mỗi sự thật nằm một chỗ, vậy mà kho dữ liệu, MongoDB và DynamoDB lại cố ý lưu lặp. Không mâu thuẫn: chuẩn hóa tối ưu cho ghi đúng, phi chuẩn hóa tối ưu cho đọc nhanh. Bài này nói khi nào đổi, và cách giữ các bản sao không nói dối.

## Ý chính

Phi chuẩn hóa là cố ý lưu một sự thật ở nhiều chỗ để đọc ít phép nối hơn. Cái giá luôn trả ở phía ghi: mỗi lần nguồn đổi, mọi bản sao phải đổi theo, nếu không chúng lệch nhau như dị thường sửa trong bài Dị thường dữ liệu và dạng chuẩn 1. Vì vậy câu hỏi đúng không phải "có chuẩn không", mà "bản sao này được ai giữ cho khớp".

Báo cáo dùng **star schema**: một bảng **fact** ở giữa (mỗi dòng là một sự kiện đo được: một món bán ra) và các bảng **chiều** quanh nó (sản phẩm, cửa hàng, ngày). Điều đầu tiên phải chốt là **grain**: một dòng fact nghĩa là gì. Mọi số đo phải cùng grain, nếu không `sum` sẽ cộng lặp. Nút Nâng cao C2 "Star schema và grain" ở Lộ trình học đi sâu phần này.

Ba cách giữ bản sao trong Postgres. **Materialized view**: lưu kết quả một truy vấn, đọc nhanh như bảng, cũ cho tới khi `REFRESH`. **Cột generated**: tính từ các cột cùng dòng, database tự cập nhật, không ghi tay được. **Trigger**: chạy code mỗi khi nguồn đổi, mạnh nhất và cũng dễ sai nhất. Với dữ liệu luôn đọc cả khối, một tài liệu `jsonb` gom các phần lại cũng là một dạng phi chuẩn hóa hợp lý.

Khi nào đáng làm: đọc nhiều hơn ghi rất nhiều, phép nối hay phép gom đo được là chậm bằng `EXPLAIN ANALYZE` chứ không phải đoán, và người dùng chấp nhận số hơi cũ. Thử theo thứ tự rẻ trước: viết lại câu và thêm index, rồi materialized view, cuối cùng mới tới cột hay bảng bản sao giữ bằng trigger. Mỗi bản sao cần ba dòng ghi chú: nguồn là bảng nào, làm mới lúc nào, và trễ bao lâu thì chấp nhận được. Thiếu ba dòng đó, bản sao sớm muộn sẽ nói dối mà không ai biết. Vòng đo và sửa đó là bài `e-pg-l5-18`.

Hình cuối mục này vẽ star schema của lab: `sales` ở giữa, `products` và `stores` quanh nó, và báo cáo doanh thu theo thành phố và loại hàng.

## Ví dụ

Đọc star schema: fact `sales` nối hai chiều, gom theo thành phố và nhóm hàng.

```sql
SELECT st.city, p.category, sum(s.qty * s.price) AS revenue
FROM sales s JOIN stores st ON st.id = s.store_id JOIN products p ON p.id = s.product_id
GROUP BY st.city, p.category ORDER BY st.city, p.category;
```

Cột generated: thành tiền của mỗi dòng do database tính và giữ.

```sql
CREATE TABLE ex_lines (id int PRIMARY KEY, qty int NOT NULL, price numeric(10,2) NOT NULL,
  amount numeric(12,2) GENERATED ALWAYS AS (qty * price) STORED);
INSERT INTO ex_lines (id, qty, price) VALUES (1, 3, 10.00);
UPDATE ex_lines SET qty = 5 WHERE id = 1;
SELECT id, qty, price, amount FROM ex_lines;
```

Một tài liệu jsonb gom đơn và các món, đọc một lần:

```sql
SELECT jsonb_build_object('store', st.city, 'items', jsonb_agg(jsonb_build_object('product', s.product_id, 'qty', s.qty) ORDER BY s.id)) AS doc
FROM sales s JOIN stores st ON st.id = s.store_id WHERE st.id = 1 GROUP BY st.city;
```

## Lỗi hay gặp

Quên làm mới materialized view: báo cáo trả số cũ mà không báo gì.

```sql
-- WRONG: the materialized view still shows the total from before the new sale
CREATE MATERIALIZED VIEW ex_total AS SELECT sum(qty * price) AS revenue FROM sales;
INSERT INTO sales VALUES (6, 3, 3, '2026-10-05', 5, 20.00);
SELECT revenue FROM ex_total;
```

```sql
-- FIX: refresh it after the source changes (on a schedule, or after each load)
REFRESH MATERIALIZED VIEW ex_total;
SELECT revenue FROM ex_total;
```

Câu sai ra 1130, tổng của năm dòng bán ban đầu; câu đúng ra 1230, vì đã cộng thêm dòng mới 5 × 20 = 100.

Đọc một materialized view tạo `WITH NO DATA` trước lần làm mới đầu tiên:

```sql
CREATE MATERIALIZED VIEW ex_empty AS SELECT count(*) AS n FROM sales WITH NO DATA;
-- ERROR 55000: materialized view "ex_empty" has not been populated
SELECT n FROM ex_empty;
```

Ghi tay vào cột generated: database từ chối, bản sao không thể lệch.

```sql
-- ERROR 428C9: cannot insert a non-DEFAULT value into column "amount"
INSERT INTO ex_lines (id, qty, price, amount) VALUES (2, 1, 10.00, 99.00);
```

## Thực hành

Lab tạo một materialized view doanh thu theo thành phố chưa có dữ liệu, làm mới nó, rồi đọc báo cáo.

## Tóm tắt

- Phi chuẩn hóa đổi ghi đúng dễ lấy đọc nhanh; luôn hỏi ai giữ bản sao cho khớp.
- Star schema: fact ở giữa, chiều xung quanh; chốt grain trước, số đo cùng grain.
- Materialized view nhanh nhưng cũ tới lần `REFRESH`; cột generated tự khớp; trigger mạnh nhưng dễ sai.
- `jsonb` gom phần luôn đọc cùng nhau; phần hay tìm riêng thì vẫn để bảng.

# EN

## Opening

Level 4 teaches splitting tables so each fact lives in one place, yet data warehouses, MongoDB and DynamoDB repeat data on purpose. There is no contradiction: normalisation optimises for correct writes, denormalisation for fast reads. This lesson says when to make the trade, and how to keep copies from lying.

## Key idea

Denormalising means storing one fact in several places on purpose so reads need fewer joins. The price is always paid on writes: whenever the source changes, every copy must follow, or they drift apart like the update anomaly in the lesson on data anomalies and first normal form. So the right question is not "is it normalised" but "who keeps this copy in step".

Reporting uses a **star schema**: a **fact** table in the middle (each row a measured event: one item sold) and **dimension** tables around it (product, store, date). The first thing to settle is the **grain**: what one fact row means. Every measure must share that grain, or `sum` adds things twice. The advanced node C2 "Star schemas and grain" on the learning path goes deeper.

Three ways to keep copies in Postgres. **Materialized view**: stores a query's result, reads as fast as a table, stale until `REFRESH`. **Generated column**: computed from columns of the same row, updated by the database, never written by hand. **Trigger**: runs code whenever the source changes, the most powerful and the easiest to get wrong. For data always read as a whole, a `jsonb` document that gathers the parts is a sound form of denormalisation too.

When it is worth it: reads far outnumber writes, the join or aggregation is measured as slow with `EXPLAIN ANALYZE` rather than guessed, and users accept slightly old numbers. Try the cheap things first: rewrite the query and add an index, then a materialized view, and only last a copied column or table kept by a trigger. Every copy needs three lines of notes: which table is its source, when it is refreshed, and how much delay is acceptable. Without those three lines a copy will sooner or later lie and nobody will notice. That measure-and-fix loop is lesson `e-pg-l5-18`.

The figure at the end of this section draws the lab's star schema: `sales` in the middle, `products` and `stores` around it, and the revenue report by city and category.

## Example

Reading a star schema: fact `sales` joined to two dimensions, grouped by city and category.

```sql
SELECT st.city, p.category, sum(s.qty * s.price) AS revenue
FROM sales s JOIN stores st ON st.id = s.store_id JOIN products p ON p.id = s.product_id
GROUP BY st.city, p.category ORDER BY st.city, p.category;
```

A generated column: each line's amount is computed and kept by the database.

```sql
CREATE TABLE ex_lines (id int PRIMARY KEY, qty int NOT NULL, price numeric(10,2) NOT NULL,
  amount numeric(12,2) GENERATED ALWAYS AS (qty * price) STORED);
INSERT INTO ex_lines (id, qty, price) VALUES (1, 3, 10.00);
UPDATE ex_lines SET qty = 5 WHERE id = 1;
SELECT id, qty, price, amount FROM ex_lines;
```

A jsonb document gathering a store and its items, read in one go:

```sql
SELECT jsonb_build_object('store', st.city, 'items', jsonb_agg(jsonb_build_object('product', s.product_id, 'qty', s.qty) ORDER BY s.id)) AS doc
FROM sales s JOIN stores st ON st.id = s.store_id WHERE st.id = 1 GROUP BY st.city;
```

## Common mistakes

Forgetting to refresh a materialized view: the report returns an old figure without a word.

```sql
-- WRONG: the materialized view still shows the total from before the new sale
CREATE MATERIALIZED VIEW ex_total AS SELECT sum(qty * price) AS revenue FROM sales;
INSERT INTO sales VALUES (6, 3, 3, '2026-10-05', 5, 20.00);
SELECT revenue FROM ex_total;
```

```sql
-- FIX: refresh it after the source changes (on a schedule, or after each load)
REFRESH MATERIALIZED VIEW ex_total;
SELECT revenue FROM ex_total;
```

The wrong query returns 1130, the total of the five original sales; the fixed one returns 1230, because it adds the new sale, 5 × 20 = 100.

Reading a materialized view created `WITH NO DATA` before its first refresh:

```sql
CREATE MATERIALIZED VIEW ex_empty AS SELECT count(*) AS n FROM sales WITH NO DATA;
-- ERROR 55000: materialized view "ex_empty" has not been populated
SELECT n FROM ex_empty;
```

Writing a generated column by hand: the database refuses, so the copy cannot drift.

```sql
-- ERROR 428C9: cannot insert a non-DEFAULT value into column "amount"
INSERT INTO ex_lines (id, qty, price, amount) VALUES (2, 1, 10.00, 99.00);
```

## Practice

The lab creates a revenue-by-city materialized view with no data, refreshes it, then reads the report.

## Recap

- Denormalising trades easy correct writes for fast reads; always ask who keeps the copy in step.
- Star schema: fact in the middle, dimensions around; settle the grain first, measures share it.
- A materialized view is fast but stale until `REFRESH`; a generated column stays in step by itself; a trigger is powerful but easy to get wrong.
- `jsonb` gathers parts always read together; parts searched on their own stay in tables.
