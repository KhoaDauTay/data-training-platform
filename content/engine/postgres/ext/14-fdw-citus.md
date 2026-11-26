---
id: e-pg-ext-14
engine: postgres
level: EXT
module: ext-server
title: "postgres_fdw và Citus: dữ liệu ở máy khác"
title_en: "postgres_fdw and Citus: data on other machines"
kind: concept
runtime: docs
docs_why: ext
minutes: 14
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-fdw-pushdown, at: idea }
objectives:
  - vi: Đọc một bảng ở server khác qua postgres_fdw và biết điều kiện nào được gửi sang đó.
    en: Read a table on another server through postgres_fdw and know which conditions are sent there.
  - vi: Giải thích Citus chia một bảng theo cột phân tán, và vì sao các bảng hay join nên chia theo cùng cột.
    en: Explain how Citus splits a table by its distribution column, and why tables that join often should share it.
  - vi: Viết bản tương đương trong một database bằng hai schema, để thấy phần nào là chi phí mạng.
    en: Write the one-database equivalent with two schemas, to see which part is network cost.
demo_setup: |
  CREATE SCHEMA market;
  CREATE SCHEMA cargo;
  CREATE TABLE market.orders (
    id int PRIMARY KEY,
    shop_id int NOT NULL,
    city text NOT NULL,
    total int NOT NULL
  );
  INSERT INTO market.orders
  SELECT g, g % 50 + 1, (ARRAY['Da Nang', 'Hoi An', 'Hue'])[g % 3 + 1], 100 + g % 400
  FROM generate_series(1, 5000) AS g;
  CREATE TABLE cargo.shipments (
    id int PRIMARY KEY,
    order_id int NOT NULL,
    port text NOT NULL,
    status text NOT NULL
  );
  INSERT INTO cargo.shipments
  SELECT g, g * 2, (ARRAY['VNDAD', 'VNSGN'])[g % 2 + 1], (ARRAY['booked', 'sailed', 'arrived'])[g % 3 + 1]
  FROM generate_series(1, 2000) AS g;
  ANALYZE market.orders;
  ANALYZE cargo.shipments;
sources:
  - https://www.postgresql.org/docs/18/postgres-fdw.html
  - https://www.postgresql.org/docs/18/sql-importforeignschema.html
  - https://docs.citusdata.com/en/stable/develop/api_udf.html
  - https://docs.citusdata.com/en/stable/
quiz:
  - q:
      vi: "Bảng `orders` ở máy kia, đọc qua postgres_fdw. Câu lọc `WHERE my_norm(city) = 'hoi an'`, với `my_norm` là hàm bạn tự viết. Điều gì xảy ra?"
      en: "Table `orders` lives on the other server, read through postgres_fdw. The query filters `WHERE my_norm(city) = 'hoi an'`, where `my_norm` is a function you wrote. What happens?"
    options:
      - { vi: "Máy kia tự tìm thấy `my_norm` theo tên và lọc trước khi gửi", en: "The other server finds `my_norm` by name and filters before sending" }
      - { vi: "Báo lỗi: hàm tự viết không dùng được với bảng ngoại", en: "An error: home-made functions cannot be used on a foreign table" }
      - { vi: "Mọi dòng đi qua mạng, máy của bạn lọc sau khi nhận", en: "Every row crosses the network, your server filters after receiving" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe hợp lý vì cả hai máy đều là Postgres, nhưng postgres_fdw chỉ gửi điều kiện dùng kiểu, toán tử và hàm có sẵn (hoặc thuộc extension khai trong tùy chọn `extensions` của server), và phải là IMMUTABLE. Hàm của bạn không thuộc loại đó, nên máy kia gửi mọi dòng. `EXPLAIN VERBOSE` cho thấy câu thật được gửi đi."
      en: "It sounds right because both servers are Postgres, but postgres_fdw only sends conditions that use built-in types, operators and functions (or ones from an extension listed in the server's `extensions` option), and they must be IMMUTABLE. Your function is neither, so the other server sends every row. `EXPLAIN VERBOSE` shows the query actually sent."
  - q:
      vi: "Trong Citus, `orders` chia theo `shop_id`. Bảng `order_items` hay join với `orders`. Nên chia `order_items` thế nào?"
      en: "In Citus, `orders` is distributed by `shop_id`. Table `order_items` is often joined to `orders`. How should `order_items` be distributed?"
    options:
      - { vi: "Theo `shop_id` (thêm cột nếu cần), để hai bảng nằm chung shard", en: "By `shop_id` (adding the column if needed), so both tables share shards" }
      - { vi: "Theo khóa chính `id` của nó, để dữ liệu chia thật đều", en: "By its own primary key `id`, so the data is spread evenly" }
      - { vi: "Không chia: để nó là bảng thường trên máy điều phối", en: "Not at all: keep it a plain table on the coordinator" }
    answer: 0
    trap: 1
    why:
      vi: "Chia theo khóa chính nghe hợp lý vì dữ liệu đều nhất, nhưng khi đó dòng của một đơn nằm ở máy khác với đơn của nó, và mọi join phải chuyển dữ liệu giữa các máy. Cùng cột phân tán, cùng kiểu và cùng số shard thì Citus đặt chúng chung chỗ (colocation), và join chạy ngay trong từng máy."
      en: "Distributing by the primary key sounds right because it spreads data most evenly, but then an order's items sit on a different machine from the order, and every join must move data between machines. Same distribution column, same type and same shard count make Citus place them together (colocation), and the join runs inside each machine."
---
## Mở bài

Đơn hàng của Chợ Lồng Đèn nằm trên một server, chuyến hàng của Cargo Query trên server khác. Báo cáo cần cả hai trong một câu. Mỗi dòng đi qua mạng đều tốn thời gian, nên câu hỏi thật là: lọc ở đâu.

## Ý chính

postgres_fdw là extension có sẵn trong bản phân phối Postgres, cho phép đọc và ghi bảng ở một server Postgres khác như bảng ngoại (foreign table). Bạn khai server, ánh xạ người dùng, rồi `IMPORT FOREIGN SCHEMA` để tạo định nghĩa cho cả schema một lần. Khi truy vấn, postgres_fdw gửi sang máy kia phần nó gửi được: điều kiện `WHERE` dùng kiểu, toán tử và hàm có sẵn, IMMUTABLE, và join giữa hai bảng ngoại cùng server. Phần còn lại chạy ở máy bạn, sau khi dòng đã qua mạng.

Nhiều người nghĩ hai máy cùng là Postgres thì mọi điều kiện đều được gửi. Thật ra hàm bạn tự viết không được gửi, trừ khi nó thuộc một extension khai trong tùy chọn `extensions` và có ở cả hai máy. `EXPLAIN VERBOSE` in dòng `Remote SQL`: đó là câu máy kia thật sự nhận.

Citus là extension biến nhiều server Postgres thành một cụm. Một bảng phân tán được chia thành nhiều shard theo một cột phân tán, chia bằng hash. Bảng nhỏ dùng chung (như danh sách cảng) là bảng tham chiếu, chép đủ lên mọi máy. Các bảng hay join nên chia theo cùng cột để nằm chung shard, gọi là colocation.

postgres_fdw cần một server thứ hai, Citus cần cả cụm: không bản nào chạy trong trình duyệt. Phần chạy được ở bài này đặt hai "máy" thành hai schema trong một database: cùng câu join, không có mạng.

## Cú pháp

```text
CREATE EXTENSION postgres_fdw;
CREATE SERVER cargo_srv
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'cargo.internal',
    port '5432', dbname 'cargo');
CREATE USER MAPPING FOR CURRENT_USER
  SERVER cargo_srv
  OPTIONS (user 'reporter',
    password '<secret>');
IMPORT FOREIGN SCHEMA public
  FROM SERVER cargo_srv INTO cargo;
SELECT create_distributed_table(
  'orders', 'shop_id');
SELECT create_reference_table(
  'ports');
```

- `IMPORT FOREIGN SCHEMA`: tạo bảng ngoại cho mọi bảng của schema bên kia.
- `create_distributed_table(table, column)`: chia bảng theo hash của cột đó.
- `create_reference_table(table)`: chép bảng nhỏ lên mọi máy.

## Ví dụ

Join đơn và chuyến hàng; ở đây hai schema, với postgres_fdw là hai server:

```sql
SELECT o.city, s.status,
       count(*) AS shipments
FROM market.orders o
JOIN cargo.shipments s
  ON s.order_id = o.id
WHERE o.city = 'Hoi An'
GROUP BY o.city, s.status
ORDER BY s.status;
```

Ba dòng, một cho mỗi trạng thái chuyến hàng của đơn Hội An.

Bao nhiêu dòng thật sự cần đi qua "mạng" nếu `orders` ở máy khác:

```sql
SELECT count(*) AS all_rows,
  count(*) FILTER (
    WHERE city = 'Hoi An')
    AS hoi_an_rows
FROM market.orders;
```

5 000 dòng nếu lọc ở máy bạn, 1 667 nếu điều kiện được gửi sang.

Tổng tiền theo cửa hàng, việc Citus làm song song trên từng shard rồi gộp:

```sql
SELECT shop_id,
       sum(total) AS revenue
FROM market.orders
GROUP BY shop_id
ORDER BY revenue DESC
LIMIT 3;
```

Mỗi shard tính tổng của các cửa hàng nó giữ; máy điều phối chỉ gộp và lấy 3 dòng đầu.

## Lỗi hay gặp

Quên schema của bảng nhập về:

```sql
-- ERROR 42P01:
SELECT count(*) FROM shipments;
```

`IMPORT FOREIGN SCHEMA ... INTO cargo` đặt bảng ngoại vào schema `cargo`; gọi `cargo.shipments` hoặc thêm schema vào `search_path`.

Lấy một trang dữ liệu về rồi mới lọc:

```sql
-- WRONG: filters only the first page
SELECT count(*) AS hoi_an
FROM (SELECT * FROM market.orders
      ORDER BY id LIMIT 500) o
WHERE o.city = 'Hoi An';
```

```sql
-- FIX: let the data's server filter
SELECT count(*) AS hoi_an
FROM market.orders
WHERE city = 'Hoi An';
```

Câu sai đếm 167 vì chỉ lọc 500 dòng đầu; câu đúng đếm 1 667. Đặt điều kiện ở câu chạm bảng, để nó được gửi tới nơi giữ dữ liệu.

## Tóm tắt

- postgres_fdw đọc bảng ở server khác; chỉ điều kiện dùng hàm có sẵn, IMMUTABLE mới được gửi sang.
- `EXPLAIN VERBOSE` in `Remote SQL`, câu máy kia thật sự nhận.
- Citus chia bảng theo cột phân tán; bảng hay join nên chung cột để nằm chung shard.
- Bản tương đương trong một database: hai schema, cùng câu join, không chi phí mạng.

# EN

## Opening

Lantern Market's orders live on one server, Cargo Query's shipments on another. The report needs both in one query. Every row that crosses the network costs time, so the real question is: where does the filter run.

## Key idea

postgres_fdw is an extension shipped with the Postgres distribution that lets you read and write tables on another Postgres server as foreign tables. You declare the server, map the user, then `IMPORT FOREIGN SCHEMA` to create the definitions for a whole schema at once. When you query, postgres_fdw sends the other server what it can: `WHERE` conditions that use built-in, IMMUTABLE types, operators and functions, and joins between two foreign tables on the same server. The rest runs on your server, after the rows have crossed the network.

Many people think that since both servers are Postgres, every condition is sent. In fact a function you wrote is not sent, unless it belongs to an extension listed in the `extensions` option and installed on both sides. `EXPLAIN VERBOSE` prints a `Remote SQL` line: that is the query the other server actually receives.

Citus is an extension that turns several Postgres servers into one cluster. A distributed table is split into many shards by a distribution column, using a hash. A small shared table (such as the port list) is a reference table, copied in full to every machine. Tables that join often should be split by the same column so they share shards, which is called colocation.

postgres_fdw needs a second server and Citus needs a whole cluster: neither runs in the browser. What runs in this lesson puts the two "servers" as two schemas in one database: the same join, no network.

## Syntax

```text
CREATE EXTENSION postgres_fdw;
CREATE SERVER cargo_srv
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'cargo.internal',
    port '5432', dbname 'cargo');
CREATE USER MAPPING FOR CURRENT_USER
  SERVER cargo_srv
  OPTIONS (user 'reporter',
    password '<secret>');
IMPORT FOREIGN SCHEMA public
  FROM SERVER cargo_srv INTO cargo;
SELECT create_distributed_table(
  'orders', 'shop_id');
SELECT create_reference_table(
  'ports');
```

- `IMPORT FOREIGN SCHEMA`: creates a foreign table for every table of the other schema.
- `create_distributed_table(table, column)`: splits the table by a hash of that column.
- `create_reference_table(table)`: copies a small table to every machine.

## Example

Join orders and shipments; here two schemas, with postgres_fdw two servers:

```sql
SELECT o.city, s.status,
       count(*) AS shipments
FROM market.orders o
JOIN cargo.shipments s
  ON s.order_id = o.id
WHERE o.city = 'Hoi An'
GROUP BY o.city, s.status
ORDER BY s.status;
```

Three rows, one per shipment status of Hoi An orders.

How many rows really need to cross the "network" if `orders` sits on another server:

```sql
SELECT count(*) AS all_rows,
  count(*) FILTER (
    WHERE city = 'Hoi An')
    AS hoi_an_rows
FROM market.orders;
```

5,000 rows if your server filters, 1,667 if the condition is sent over.

Revenue per shop, which Citus computes on each shard in parallel and then merges:

```sql
SELECT shop_id,
       sum(total) AS revenue
FROM market.orders
GROUP BY shop_id
ORDER BY revenue DESC
LIMIT 3;
```

Each shard totals the shops it holds; the coordinator only merges and takes the top 3 rows.

## Common mistakes

Forgetting the schema of the imported tables:

```sql
-- ERROR 42P01:
SELECT count(*) FROM shipments;
```

`IMPORT FOREIGN SCHEMA ... INTO cargo` puts the foreign tables in schema `cargo`; call `cargo.shipments` or add the schema to `search_path`.

Fetching a page of data and filtering afterwards:

```sql
-- WRONG: filters only the first page
SELECT count(*) AS hoi_an
FROM (SELECT * FROM market.orders
      ORDER BY id LIMIT 500) o
WHERE o.city = 'Hoi An';
```

```sql
-- FIX: let the data's server filter
SELECT count(*) AS hoi_an
FROM market.orders
WHERE city = 'Hoi An';
```

The wrong query counts 167 because it filters only the first 500 rows; the right one counts 1,667. Put the condition on the query that touches the table, so it is sent to where the data lives.

## Recap

- postgres_fdw reads tables on another server; only conditions with built-in, IMMUTABLE functions are sent there.
- `EXPLAIN VERBOSE` prints `Remote SQL`, the query the other server actually receives.
- Citus splits a table by its distribution column; tables that join often should share it to share shards.
- The one-database equivalent: two schemas, the same join, no network cost.
