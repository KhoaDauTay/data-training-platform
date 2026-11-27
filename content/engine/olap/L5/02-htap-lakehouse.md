---
id: e-ol-l5-02
engine: olap
level: L5
module: scale
title: "HTAP và lakehouse: PostgreSQL, CDC, Parquet và định dạng bảng mở"
title_en: "HTAP and the lakehouse: PostgreSQL, CDC, Parquet and open table formats"
kind: concept
runtime: docs
minutes: 25
figures: [{ name: ol-lakehouse, at: idea }]
objectives:
  - vi: Mô tả cách chia việc thường gặp, PostgreSQL giữ giao dịch, ClickHouse chạy phân tích, nối bằng CDC.
    en: Describe the common split, PostgreSQL keeps transactions, ClickHouse runs analytics, linked by CDC.
  - vi: Biết Parquet là định dạng file lưu theo cột, và ClickHouse đọc, ghi nó thế nào.
    en: Know that Parquet is a column-oriented file format, and how ClickHouse reads and writes it.
  - vi: Phân biệt truy vấn Iceberg, Delta Lake ngay tại chỗ với nạp vào MergeTree.
    en: Tell querying Iceberg or Delta Lake in place apart from loading into MergeTree.
requires: [e-ol-l1-01, e-ol-l3-03]
sources:
  - { url: "https://clickhouse.com/docs/get-started/migrate/postgres/overview", title: "ClickHouse docs: Migrating from PostgreSQL to ClickHouse" }
  - { url: "https://clickhouse.com/docs/integrations/postgresql", title: "ClickHouse docs: Connecting ClickHouse to PostgreSQL" }
  - { url: "https://clickhouse.com/docs/integrations/data-formats/parquet", title: "ClickHouse docs: Working with Parquet in ClickHouse" }
  - { url: "https://clickhouse.com/docs/use-cases/data-lake", title: "ClickHouse docs: Data lakehouse" }
  - { url: "https://www.postgresql.org/docs/18/logical-replication.html", title: "PostgreSQL 18 docs: Logical Replication" }
demo_setup: |
  CREATE TABLE orders (
    id int PRIMARY KEY, port text,
    teu int, status text
  );
  INSERT INTO orders
  SELECT g, (ARRAY['VNDAD', 'VNHPH',
      'VNSGN'])[1 + g % 3],
    1 + g % 4, 'booked'
  FROM generate_series(1, 12) AS g;
  CREATE TABLE order_log (
    lsn int, op text, id int,
    status text
  );
  INSERT INTO order_log
  SELECT id, 'c', id, status
  FROM orders;
  UPDATE orders SET status = 'sailed'
  WHERE id % 2 = 0;
  INSERT INTO order_log
  SELECT 12 + id, 'u', id, status
  FROM orders WHERE id % 2 = 0;
  DELETE FROM orders
  WHERE id IN (5, 9);
  INSERT INTO order_log VALUES
    (30, 'd', 5, NULL),
    (31, 'd', 9, NULL);
quiz:
  - q:
      vi: "Theo tài liệu ClickHouse, cách nào được khuyên cho phần lớn trường hợp để giữ ClickHouse khớp với PostgreSQL?"
      en: "According to the ClickHouse docs, which approach is recommended for most cases to keep ClickHouse in sync with PostgreSQL?"
    options:
      - { vi: "CDC thời gian thực qua ClickPipes", en: "Real-time CDC through ClickPipes" }
      - { vi: "Nạp lô mỗi đêm, luôn luôn", en: "A nightly batch load, always" }
      - { vi: "Chạy báo cáo trên máy chính", en: "Run reports on the primary" }
    answer: 0
    trap: 1
    why:
      vi: "Nạp lô vẫn dùng được, nhưng tài liệu chỉ gọi nó là lựa chọn cho các lần chuyển đơn giản, một lần, và thay đổi của PostgreSQL tới ClickHouse chậm một khoảng. Cách được khuyên cho phần lớn trường hợp là CDC thời gian thực qua ClickPipes: thay đổi đã commit được sao sang liên tục. Chạy báo cáo nặng trên máy PostgreSQL chính là điều tài liệu nói nên chuyển đi, vì cơ sở dữ liệu giao dịch chạm giới hạn với câu phân tích trên dữ liệu lớn."
      en: "Batch loading still works, but the docs call it an option for simpler, one-off migrations, and PostgreSQL changes reach ClickHouse with a delay. The approach recommended for most cases is real-time CDC through ClickPipes: committed changes are replicated continuously. Running heavy reports on the PostgreSQL primary is what the docs say to move away from, since transactional databases hit limits on analytical queries over large data."
  - q:
      vi: "Bảng Iceberg của đội dữ liệu nằm trên object storage. ClickHouse có cần nạp nó vào MergeTree trước khi truy vấn không?"
      en: "The data team's Iceberg table sits in object storage. Must ClickHouse load it into MergeTree before querying it?"
    options:
      - { vi: "Có, chỉ đọc được part của nó", en: "Yes, it reads only its own parts" }
      - { vi: "Không, `iceberg()` đọc tại chỗ", en: "No, `iceberg()` reads in place" }
      - { vi: "Không, nhưng phải đổi ra CSV", en: "No, but convert it to CSV first" }
    answer: 1
    trap: 0
    why:
      vi: "ClickHouse không chỉ đọc part của chính nó: tài liệu ghi nó truy vấn được định dạng bảng mở ngay trên object storage mà không nhân bản dữ liệu, bằng hàm bảng như `iceberg()`. Nạp vào MergeTree là lựa chọn thêm khi cần nhiều câu đồng thời và độ trễ thấp, như dashboard. Không cần đổi sang CSV; dữ liệu Iceberg thường đã là file theo cột."
      en: "ClickHouse does not read only its own parts: the docs say it can query open table formats directly in object storage without duplicating data, using table functions like `iceberg()`. Loading into MergeTree is an extra option for high concurrency and low latency, such as dashboards. No CSV conversion is needed; Iceberg data is usually column files already."
  - q:
      vi: "Parquet là gì?"
      en: "What is Parquet?"
    options:
      - { vi: "File chữ từng dòng như CSV", en: "A row-by-row text file like CSV" }
      - { vi: "Một engine bảng của ClickHouse", en: "A ClickHouse table engine" }
      - { vi: "Định dạng file lưu theo cột", en: "A column-oriented file format" }
    answer: 2
    trap: 0
    why:
      vi: "CSV ghi từng dòng một, còn tài liệu ClickHouse mô tả Parquet là định dạng file hiệu quả, lưu dữ liệu theo cột. Parquet cũng không phải engine bảng: ClickHouse đọc nó qua hàm bảng `file()` với định dạng `Parquet` và ghi ra bằng `INTO OUTFILE … FORMAT Parquet`."
      en: "CSV writes one row at a time, while the ClickHouse docs describe Parquet as an efficient file format that stores data column by column. Nor is Parquet a table engine: ClickHouse reads it through the `file()` table function with format `Parquet` and writes it with `INTO OUTFILE … FORMAT Parquet`."
---
## Mở bài

Cargo Query giữ đơn hàng trong PostgreSQL, nhưng báo cáo trên cả năm dữ liệu làm máy chính chậm lại. Bài này nói về cách chia việc giữa hai loại cơ sở dữ liệu, cách thay đổi đi từ bên này sang bên kia, và chỗ của file Parquet và định dạng bảng mở.

## Ý chính

Phục vụ cả hai kiểu tải, giao dịch và phân tích, thường được gọi là **HTAP** (hybrid transactional/analytical processing). Tài liệu ClickHouse mô tả một cách chia hay gặp: cơ sở dữ liệu giao dịch chạm giới hạn khi chạy câu phân tích trên dữ liệu lớn, nên giữ PostgreSQL làm nơi ghi giao dịch chính và chuyển câu phân tích sang ClickHouse. Thay đổi đã commit được sao sang bằng **CDC** (change data capture). Tài liệu khuyên CDC thời gian thực qua ClickPipes cho phần lớn trường hợp; nạp lô định kỳ dùng được cho lần chuyển đơn giản, đổi lại dữ liệu chậm một khoảng. Engine `MaterializedPostgreSQL` cũng sao chép được, nhưng còn là tính năng thử nghiệm. Phía PostgreSQL, thay đổi được đọc ra bằng logical replication.

**Parquet** là định dạng file lưu dữ liệu theo cột. ClickHouse đọc nó bằng hàm bảng `file()`, tự suy ra cột và kiểu từ file, và ghi kết quả ra bằng `INTO OUTFILE … FORMAT Parquet`.

**Lakehouse** đặt dữ liệu trên object storage theo định dạng bảng mở: Iceberg, Delta Lake, Hudi, Paimon. Tài liệu ghi ClickHouse truy vấn chúng ngay tại chỗ, không nhân bản dữ liệu, bằng `iceberg()`, `deltaLake()`…; khi cần nhiều câu đồng thời với độ trễ thấp, nạp vào MergeTree làm lớp phân tích thời gian thực.

Các ví dụ dưới chạy trên PostgreSQL: một bảng đơn hàng, nhật ký thay đổi của nó như CDC gửi đi, và cách dựng lại bản sao phân tích từ nhật ký đó.

## Ví dụ

```text
-- ClickHouse (read only)
SELECT port, sum(teu)
FROM file('orders.parquet',
  Parquet)
GROUP BY port;

SELECT count()
FROM iceberg(
  's3://lake/orders/');

SELECT * FROM orders
INTO OUTFILE 'orders.parquet'
FORMAT Parquet;
```

Cách một file theo cột xếp dữ liệu: mỗi cột là một khối liền nhau.

```sql
SELECT 'port' AS col,
  string_agg(port, ','
    ORDER BY id) AS chunk
FROM orders
UNION ALL
SELECT 'teu',
  string_agg(teu::text, ','
    ORDER BY id)
FROM orders;
```

Dựng lại bản sao phân tích từ nhật ký thay đổi: bản mới nhất của mỗi đơn, bỏ đơn đã xóa.

```sql
SELECT id, status
FROM (SELECT DISTINCT ON (id)
    id, op, status
  FROM order_log
  ORDER BY id, lsn DESC) s
WHERE op <> 'd'
ORDER BY id;
```

Bản sao khớp với bảng gốc: không dòng nào lệch.

```sql
SELECT count(*) AS mismatches
FROM (
  SELECT id, status FROM orders
  EXCEPT
  SELECT id, status
  FROM (SELECT DISTINCT ON (id)
      id, op, status
    FROM order_log
    ORDER BY id, lsn DESC) s
  WHERE op <> 'd'
) d;
```

## Lỗi hay gặp

Đếm dòng của nhật ký thay đổi làm số đơn hàng: mỗi lần sửa và mỗi lần xóa cũng là một dòng.

```sql
-- WRONG: counts changes
SELECT count(*) AS orders
FROM order_log;
```

```sql
-- FIX: latest state per order
SELECT count(*) AS orders
FROM (SELECT DISTINCT ON (id)
    id, op
  FROM order_log
  ORDER BY id, lsn DESC) s
WHERE op <> 'd';
```

Lấy bản mới nhất mà quên sự kiện xóa: đơn đã xóa vẫn còn trong bản sao.

```sql
-- WRONG: deleted orders stay
SELECT count(*) AS orders
FROM (SELECT DISTINCT ON (id)
    id, op
  FROM order_log
  ORDER BY id, lsn DESC) s;
```

```sql
-- FIX: drop the deletes
SELECT count(*) AS orders
FROM (SELECT DISTINCT ON (id)
    id, op
  FROM order_log
  ORDER BY id, lsn DESC) s
WHERE op <> 'd';
```

## Tóm tắt

- HTAP hay gặp: PostgreSQL giữ giao dịch, ClickHouse chạy phân tích, nối bằng CDC.
- Tài liệu khuyên CDC thời gian thực; nạp lô thì dữ liệu chậm một khoảng.
- Parquet là file lưu theo cột; ClickHouse đọc bằng `file()`, ghi bằng `INTO OUTFILE`.
- Iceberg, Delta Lake đọc được tại chỗ; nạp vào MergeTree khi cần độ trễ thấp.
- Dựng bản sao từ nhật ký: bản mới nhất mỗi khóa, bỏ sự kiện xóa.

# EN

## Opening

Cargo Query keeps its orders in PostgreSQL, but reports over a whole year of data slow the primary down. This lesson covers how work is split between the two kinds of database, how changes travel from one to the other, and where Parquet files and open table formats fit.

## Key idea

Serving both kinds of load, transactions and analytics, is often called **HTAP** (hybrid transactional/analytical processing). The ClickHouse docs describe a common split: transactional databases hit limits on analytical queries over large data, so PostgreSQL stays the transactional system of record and analytical queries move to ClickHouse. Committed changes are replicated by **CDC** (change data capture). The docs recommend real-time CDC through ClickPipes for most cases; periodic batch loading works for simpler migrations, at the cost of a delay. The `MaterializedPostgreSQL` engine can also replicate, but it is still an experimental feature. On the PostgreSQL side, changes are read out through logical replication.

**Parquet** is a file format that stores data column by column. ClickHouse reads it with the `file()` table function, inferring columns and types from the file, and writes results out with `INTO OUTFILE … FORMAT Parquet`.

A **lakehouse** keeps data in object storage in open table formats: Iceberg, Delta Lake, Hudi, Paimon. The docs say ClickHouse queries them in place, without duplicating data, with `iceberg()`, `deltaLake()`…; when many concurrent low-latency queries are needed, load the data into MergeTree as a real-time analytics layer.

The examples below run on PostgreSQL: an orders table, its change log as CDC would send it, and how to rebuild the analytical copy from that log.

## Example

```text
-- ClickHouse (read only)
SELECT port, sum(teu)
FROM file('orders.parquet',
  Parquet)
GROUP BY port;

SELECT count()
FROM iceberg(
  's3://lake/orders/');

SELECT * FROM orders
INTO OUTFILE 'orders.parquet'
FORMAT Parquet;
```

How a column file lays out data: each column is one contiguous block.

```sql
SELECT 'port' AS col,
  string_agg(port, ','
    ORDER BY id) AS chunk
FROM orders
UNION ALL
SELECT 'teu',
  string_agg(teu::text, ','
    ORDER BY id)
FROM orders;
```

Rebuilding the analytical copy from the change log: the latest version of each order, dropping deleted ones.

```sql
SELECT id, status
FROM (SELECT DISTINCT ON (id)
    id, op, status
  FROM order_log
  ORDER BY id, lsn DESC) s
WHERE op <> 'd'
ORDER BY id;
```

The copy matches the source table: no row differs.

```sql
SELECT count(*) AS mismatches
FROM (
  SELECT id, status FROM orders
  EXCEPT
  SELECT id, status
  FROM (SELECT DISTINCT ON (id)
      id, op, status
    FROM order_log
    ORDER BY id, lsn DESC) s
  WHERE op <> 'd'
) d;
```

## Common mistakes

Counting the change log's rows as the number of orders: every update and every delete is a row too.

```sql
-- WRONG: counts changes
SELECT count(*) AS orders
FROM order_log;
```

```sql
-- FIX: latest state per order
SELECT count(*) AS orders
FROM (SELECT DISTINCT ON (id)
    id, op
  FROM order_log
  ORDER BY id, lsn DESC) s
WHERE op <> 'd';
```

Taking the latest version but forgetting delete events: deleted orders stay in the copy.

```sql
-- WRONG: deleted orders stay
SELECT count(*) AS orders
FROM (SELECT DISTINCT ON (id)
    id, op
  FROM order_log
  ORDER BY id, lsn DESC) s;
```

```sql
-- FIX: drop the deletes
SELECT count(*) AS orders
FROM (SELECT DISTINCT ON (id)
    id, op
  FROM order_log
  ORDER BY id, lsn DESC) s
WHERE op <> 'd';
```

## Recap

- Common HTAP: PostgreSQL keeps transactions, ClickHouse runs analytics, linked by CDC.
- The docs recommend real-time CDC; with batch loads the data lags.
- Parquet is a column file; ClickHouse reads it with `file()` and writes it with `INTO OUTFILE`.
- Iceberg and Delta Lake can be read in place; load into MergeTree for low latency.
- Rebuild a copy from the log: the latest version per key, deletes dropped.
