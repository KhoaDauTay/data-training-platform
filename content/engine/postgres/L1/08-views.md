---
id: e-pg-l1-08
engine: postgres
level: L1
module: views
title: View và materialized view
title_en: Views and materialized views
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-view-vs-matview, at: idea }]
objectives:
  - vi: Lưu một câu hỏi hay dùng thành view để cả nhóm gọi lại bằng một tên.
    en: Save a frequent query as a view so the whole team can call it by name.
  - vi: Biết materialized view lưu sẵn kết quả, nhanh khi đọc nhưng cũ đi cho tới khi `REFRESH`.
    en: Know that a materialized view stores its result, fast to read but stale until `REFRESH`.
  - vi: Tránh ba bẫy hay gặp khi sửa view và làm mới materialized view.
    en: Avoid three common traps when changing a view and refreshing a materialized view.
requires: [e-pg-l1-07]
sources:
  - https://www.postgresql.org/docs/18/tutorial-views.html
  - https://www.postgresql.org/docs/18/sql-createview.html
  - https://www.postgresql.org/docs/18/rules-materializedviews.html
  - https://www.postgresql.org/docs/18/sql-creatematerializedview.html
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
      after: SELECT customer_id, total FROM customer_totals ORDER BY customer_id
      check: rows
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
quiz:
  - q:
      vi: "View `paid_orders` được tạo hôm qua. Sáng nay có thêm 50 đơn đã trả tiền. Đọc `paid_orders` bây giờ thì sao?"
      en: "View `paid_orders` was created yesterday. This morning 50 more paid orders came in. What happens when you read `paid_orders` now?"
    options:
      - { vi: "Không thấy 50 đơn mới cho tới khi làm mới view", en: "The 50 new orders are missing until the view is refreshed" }
      - { vi: "Thấy cả 50 đơn mới, vì view chạy lại câu gốc mỗi lần đọc", en: "All 50 new orders show, because the view reruns its query on every read" }
      - { vi: "Lỗi, vì dữ liệu gốc đã đổi", en: "An error, because the underlying data changed" }
    answer: 1
    trap: 0
    why:
      vi: "\"Không thấy 50 đơn mới\" nghe hợp lý vì view trông như một bảng, mà bảng thì giữ dữ liệu đã chép vào; nhưng view thường không lưu dòng nào, chỉ lưu câu `SELECT`. Mỗi lần đọc, Postgres chạy lại câu đó trên dữ liệu hiện tại, nên 50 đơn mới có mặt ngay và dữ liệu gốc đổi cũng không gây lỗi. Chỉ materialized view (lưu sẵn kết quả) mới cần `REFRESH`."
      en: "\"The 50 new orders are missing\" sounds right because a view looks like a table, and a table keeps the rows copied into it, but a plain view stores no rows, only its `SELECT`. Every read reruns that query on current data, so the 50 new orders show at once, and changed data causes no error. Only a materialized view (which stores its result) needs `REFRESH`."
  - q:
      vi: "Bạn muốn làm mới một materialized view mà người khác vẫn đọc được trong lúc đó. Cần gì?"
      en: "You want to refresh a materialized view while other people keep reading it. What do you need?"
    options:
      - { vi: "`REFRESH MATERIALIZED VIEW CONCURRENTLY` và một unique index trên materialized view", en: "`REFRESH MATERIALIZED VIEW CONCURRENTLY` and a unique index on the materialized view" }
      - { vi: "Chỉ cần `REFRESH MATERIALIZED VIEW`, nó không bao giờ chặn người đọc", en: "Just `REFRESH MATERIALIZED VIEW`; it never blocks readers" }
      - { vi: "Xóa rồi tạo lại materialized view", en: "Drop and recreate the materialized view" }
    answer: 0
    trap: 1
    why:
      vi: "\"Chỉ cần `REFRESH MATERIALIZED VIEW`\" nghe hợp lý vì đọc dữ liệu cũ thì có gì phải chặn, nhưng bản thường thay cả nội dung một lần và giữ một lock chặn mọi người đọc cho tới khi xong. Bản `CONCURRENTLY` tính kết quả mới bên cạnh rồi chỉ ghi phần khác biệt, nên người đọc không bị chặn; để ghép dòng cũ với dòng mới, nó cần một unique index. Xóa rồi tạo lại thì trong lúc đó view không tồn tại, người đọc gặp lỗi."
      en: "\"Just `REFRESH MATERIALIZED VIEW`\" sounds right because reading old data should not need to wait, but the plain form replaces the whole content at once and holds a lock that blocks every reader until it is done. The `CONCURRENTLY` form builds the new result on the side and writes only the differences, so readers are not blocked; to pair old rows with new ones it needs a unique index. Dropping and recreating leaves no view in between, so readers get errors."
---
## Mở bài

Cả nhóm phân tích ngày nào cũng gõ lại cùng một câu lọc "đơn lớn đã trả tiền", mỗi người một kiểu, và con số không ai khớp ai. Có cách nào lưu câu đó một lần, đặt tên, để mọi người cùng gọi?

## Ý chính

View là một câu `SELECT` được đặt tên. Nó không chứa dòng nào: mỗi lần đọc view, Postgres thay tên view bằng câu gốc rồi chạy trên dữ liệu hiện tại. Nhờ vậy view luôn mới, và một logic lọc hay join chỉ cần viết đúng một lần. View cũng giúp chỉ cho người khác thấy những cột họ cần.

Nhiều người nghĩ view chạy nhanh hơn câu gốc vì "đã có sẵn". Thật ra view thường không lưu gì cả: đọc view tốn đúng bằng chạy câu gốc, và planner tối ưu cả hai như nhau.

Materialized view thì khác: nó chạy câu gốc một lần và lưu kết quả xuống đĩa như một bảng. Đọc rất nhanh, có thể tạo index trên nó, nhưng kết quả đứng yên cho tới khi bạn gõ `REFRESH MATERIALIZED VIEW`. Nó hợp với báo cáo tổng hợp nặng, nơi dữ liệu cũ vài phút hay vài giờ vẫn chấp nhận được.

`REFRESH` thường khóa materialized view trong lúc làm mới. Bản `CONCURRENTLY` để người khác vẫn đọc bản cũ, nhưng cần một unique index trên materialized view để so từng dòng.

Hình cuối mục này đặt hai thứ cạnh nhau: view `big_orders` chỉ lưu câu lệnh, materialized view `paid_count` lưu dòng kết quả và chỉ đổi khi `REFRESH`.

## Cú pháp

```sql
CREATE [ OR REPLACE ] VIEW view_name [ ( column [, ...] ) ] AS select_query;
CREATE MATERIALIZED VIEW [ IF NOT EXISTS ] mv_name AS select_query [ WITH [ NO ] DATA ];
REFRESH MATERIALIZED VIEW [ CONCURRENTLY ] mv_name;
DROP VIEW [ IF EXISTS ] view_name [ CASCADE ];
```

- `OR REPLACE`: thay câu gốc; chỉ được thêm cột ở cuối, không được bỏ hay đổi tên cột.
- `WITH NO DATA`: tạo materialized view rỗng, đọc được sau lần `REFRESH` đầu.
- `CONCURRENTLY`: làm mới mà không chặn người đọc; cần unique index.
- `CASCADE`: xóa luôn đối tượng phụ thuộc.

## Ví dụ

Tạo view các đơn lớn rồi đọc nó như một bảng:

```sql
CREATE VIEW big_orders AS SELECT id, customer_id, amount FROM orders WHERE amount >= 900;
SELECT count(*) AS n, min(amount) AS smallest FROM big_orders;
```

Ra 140 đơn, đơn nhỏ nhất 905.00.

```sql
INSERT INTO orders VALUES (5000, 7, 990, 'paid');
SELECT count(*) AS n FROM big_orders;
```

Thành 141 ngay: view chạy lại câu gốc nên thấy đơn vừa thêm.

```sql
CREATE MATERIALIZED VIEW paid_count AS SELECT count(*) AS n FROM orders WHERE status = 'paid';
INSERT INTO orders VALUES (5001, 1, 10, 'paid');
SELECT n AS before_refresh FROM paid_count;
REFRESH MATERIALIZED VIEW paid_count;
SELECT n AS after_refresh FROM paid_count;
```

Trước `REFRESH` vẫn là 1801 dù vừa thêm một đơn đã trả tiền; sau `REFRESH` mới thành 1802.

```sql
SELECT relname, relkind, pg_relation_size(oid) AS bytes
FROM pg_class WHERE relname IN ('orders', 'big_orders', 'paid_count') ORDER BY relname;
```

View (`relkind` là `v`) có 0 byte; materialized view (`m`) và bảng (`r`) có dữ liệu thật trên đĩa.

## Lỗi hay gặp

Dùng `OR REPLACE` để bỏ bớt cột:

```sql
-- ERROR 42P16: cannot drop columns from view
CREATE OR REPLACE VIEW big_orders AS SELECT id, amount FROM orders WHERE amount >= 900;
```

`OR REPLACE` chỉ cho thêm cột ở cuối. Muốn đổi hình dạng view thì `DROP VIEW` rồi tạo lại.

Làm mới không chặn người đọc khi chưa có unique index:

```sql
CREATE MATERIALIZED VIEW status_counts AS SELECT status, count(*) AS n FROM orders GROUP BY status;
-- ERROR 55000: cannot refresh materialized view "public.status_counts" concurrently
REFRESH MATERIALIZED VIEW CONCURRENTLY status_counts;
```

```sql
CREATE UNIQUE INDEX status_counts_status ON status_counts (status);
REFRESH MATERIALIZED VIEW CONCURRENTLY status_counts;
SELECT status, n FROM status_counts ORDER BY status;
```

Có unique index trên `status` thì `CONCURRENTLY` chạy được.

Tưởng `SELECT *` trong view tự có cột mới của bảng:

```sql
-- WRONG: the star was expanded when the view was created
CREATE VIEW orders_all AS SELECT * FROM orders;
ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'web';
SELECT count(*) AS view_columns FROM information_schema.columns WHERE table_name = 'orders_all';
```

```sql
-- FIX: recreate the view to pick up the new column
CREATE OR REPLACE VIEW orders_all AS SELECT * FROM orders;
SELECT count(*) AS view_columns FROM information_schema.columns WHERE table_name = 'orders_all';
```

Bản sai vẫn 4 cột: dấu `*` được mở thành danh sách cột lúc tạo view. Tạo lại view thì mới có cột thứ 5.

## Thực hành

Bảng `orders` có 2.000 đơn, 10 % bị hủy. Tạo một view và một materialized view, rồi đọc từ chúng như từ bảng; sau đó trả lời hai câu hỏi.

## Tóm tắt

- View là câu `SELECT` có tên, không lưu dòng, luôn đọc dữ liệu hiện tại.
- Materialized view lưu kết quả: đọc nhanh, đánh index được, nhưng cũ cho tới khi `REFRESH`.
- `REFRESH ... CONCURRENTLY` không chặn người đọc và cần unique index.
- `CREATE OR REPLACE VIEW` chỉ thêm cột ở cuối; `SELECT *` trong view không tự nhận cột mới.

# EN

## Opening

Every day the analytics team retypes the same "big paid orders" filter, each person in their own way, and nobody's numbers match. Is there a way to save that query once, give it a name, and let everyone call it?

## Key idea

A view is a named `SELECT`. It holds no rows: every time you read the view, Postgres replaces its name with the original query and runs it on current data. So a view is always fresh, and a filter or join only has to be written correctly once. A view also lets you show other people only the columns they need.

Many people think a view runs faster than its query because it is "already prepared". In fact a plain view stores nothing: reading it costs exactly what running the query costs, and the planner optimises both the same way.

A materialized view is different: it runs its query once and stores the result on disk like a table. Reads are very fast and you can index it, but the result stays frozen until you run `REFRESH MATERIALIZED VIEW`. It suits heavy summary reports where data a few minutes or hours old is acceptable.

A plain `REFRESH` locks the materialized view while it works. The `CONCURRENTLY` form lets others keep reading the old version, but it needs a unique index on the materialized view to match rows.

The figure at the end of this section puts the two side by side: the view `big_orders` stores only its query, while the materialized view `paid_count` stores result rows that change only on `REFRESH`.

## Syntax

```sql
CREATE [ OR REPLACE ] VIEW view_name [ ( column [, ...] ) ] AS select_query;
CREATE MATERIALIZED VIEW [ IF NOT EXISTS ] mv_name AS select_query [ WITH [ NO ] DATA ];
REFRESH MATERIALIZED VIEW [ CONCURRENTLY ] mv_name;
DROP VIEW [ IF EXISTS ] view_name [ CASCADE ];
```

- `OR REPLACE`: replaces the query; it may only add columns at the end, never drop or rename them.
- `WITH NO DATA`: creates an empty materialized view, readable after the first `REFRESH`.
- `CONCURRENTLY`: refreshes without blocking readers; needs a unique index.
- `CASCADE`: also drops the objects that depend on it.

## Example

Create a view of the big orders, then read it like a table:

```sql
CREATE VIEW big_orders AS SELECT id, customer_id, amount FROM orders WHERE amount >= 900;
SELECT count(*) AS n, min(amount) AS smallest FROM big_orders;
```

It shows 140 orders, the smallest being 905.00.

```sql
INSERT INTO orders VALUES (5000, 7, 990, 'paid');
SELECT count(*) AS n FROM big_orders;
```

It becomes 141 at once: the view reruns its query, so it sees the new order.

```sql
CREATE MATERIALIZED VIEW paid_count AS SELECT count(*) AS n FROM orders WHERE status = 'paid';
INSERT INTO orders VALUES (5001, 1, 10, 'paid');
SELECT n AS before_refresh FROM paid_count;
REFRESH MATERIALIZED VIEW paid_count;
SELECT n AS after_refresh FROM paid_count;
```

Before `REFRESH` it still says 1801 even though a paid order was just added; after `REFRESH` it becomes 1802.

```sql
SELECT relname, relkind, pg_relation_size(oid) AS bytes
FROM pg_class WHERE relname IN ('orders', 'big_orders', 'paid_count') ORDER BY relname;
```

The view (`relkind` is `v`) takes 0 bytes; the materialized view (`m`) and the table (`r`) hold real data on disk.

## Common mistakes

Using `OR REPLACE` to drop a column:

```sql
-- ERROR 42P16: cannot drop columns from view
CREATE OR REPLACE VIEW big_orders AS SELECT id, amount FROM orders WHERE amount >= 900;
```

`OR REPLACE` may only add columns at the end. To change a view's shape, run `DROP VIEW` and create it again.

Refreshing without blocking readers before there is a unique index:

```sql
CREATE MATERIALIZED VIEW status_counts AS SELECT status, count(*) AS n FROM orders GROUP BY status;
-- ERROR 55000: cannot refresh materialized view "public.status_counts" concurrently
REFRESH MATERIALIZED VIEW CONCURRENTLY status_counts;
```

```sql
CREATE UNIQUE INDEX status_counts_status ON status_counts (status);
REFRESH MATERIALIZED VIEW CONCURRENTLY status_counts;
SELECT status, n FROM status_counts ORDER BY status;
```

With a unique index on `status`, `CONCURRENTLY` works.

Believing `SELECT *` in a view picks up the table's new columns:

```sql
-- WRONG: the star was expanded when the view was created
CREATE VIEW orders_all AS SELECT * FROM orders;
ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'web';
SELECT count(*) AS view_columns FROM information_schema.columns WHERE table_name = 'orders_all';
```

```sql
-- FIX: recreate the view to pick up the new column
CREATE OR REPLACE VIEW orders_all AS SELECT * FROM orders;
SELECT count(*) AS view_columns FROM information_schema.columns WHERE table_name = 'orders_all';
```

The wrong version still has 4 columns: `*` was expanded into a column list when the view was created. Recreating the view brings in the 5th column.

## Practice

Table `orders` has 2,000 orders, 10% of them cancelled. Create a view and a materialized view, then read from them like tables; after that, answer two questions.

## Recap

- A view is a named `SELECT`; it stores no rows and always reads current data.
- A materialized view stores its result: fast to read, indexable, but stale until `REFRESH`.
- `REFRESH ... CONCURRENTLY` does not block readers and needs a unique index.
- `CREATE OR REPLACE VIEW` only adds columns at the end; `SELECT *` in a view does not pick up new columns.
