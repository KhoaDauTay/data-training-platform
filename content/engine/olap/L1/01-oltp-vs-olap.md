---
id: e-ol-l1-01
engine: olap
level: L1
module: workload
title: "OLTP và OLAP: hai kiểu tải"
title_en: "OLTP and OLAP: two workloads"
kind: concept
runtime: docs
docs_why: next
minutes: 15
figures: [{ name: ol-workloads, at: idea }]
objectives:
  - vi: Phân biệt tải giao dịch (OLTP, nhiều câu ngắn chạm vài dòng) với tải phân tích (OLAP, ít câu dài quét nhiều dòng).
    en: Tell a transactional workload (OLTP, many short queries touching a few rows) from an analytical one (OLAP, few long queries scanning many rows).
  - vi: Nhận ra một câu lệnh thuộc kiểu tải nào chỉ từ số dòng nó đọc và số cột nó cần.
    en: Recognise which workload a query belongs to from the rows it reads and the columns it needs.
requires: []
sources:
  - { url: "https://clickhouse.com/docs/intro", title: "ClickHouse docs: What is ClickHouse?", title_vi: "Tài liệu ClickHouse: ClickHouse là gì?" }
  - { url: "https://www.postgresql.org/docs/18/using-explain.html", title: "PostgreSQL 18 docs: Using EXPLAIN", title_vi: "Dùng EXPLAIN" }
demo_setup: |
  CREATE TABLE shipments (
    id int PRIMARY KEY,
    booked date, port text,
    mode text, teu int
  );
  INSERT INTO shipments
  SELECT i,
    date '2026-10-01' + i % 31,
    (ARRAY['VNDAD','VNSGN','VNHPH'])
      [1 + i % 3],
    (ARRAY['sea','air'])[1 + i % 2],
    1 + i % 4
  FROM generate_series(1, 3000) AS i;
  ANALYZE shipments;
quiz:
  - q:
      vi: "Trang theo dõi lô hàng mở đơn 2041 khi khách bấm vào. Câu lệnh đó thuộc kiểu tải nào?"
      en: "The tracking page opens shipment 2041 when a customer clicks it. Which workload is that query?"
    options:
      - { vi: "OLAP, vì bảng có hàng triệu dòng", en: "OLAP, since the table has millions of rows" }
      - { vi: "OLTP: đọc một dòng theo khóa", en: "OLTP: reading one row by key" }
      - { vi: "Cả hai, vì có `WHERE`", en: "Both, because it has a `WHERE`" }
    answer: 1
    trap: 0
    why:
      vi: "Bảng lớn không làm câu lệnh thành OLAP: kiểu tải tính theo việc câu lệnh làm, không theo cỡ bảng. Câu này tìm đúng một dòng theo khóa chính và trả ngay, như hàng nghìn lượt bấm khác mỗi phút, nên là OLTP. Có `WHERE` cũng chẳng nói gì, vì câu OLAP cũng lọc."
      en: "A big table does not make a query OLAP: the workload is about what the query does, not the table's size. This one finds exactly one row by its primary key and returns at once, like thousands of other clicks a minute, so it is OLTP. Having a `WHERE` says nothing either, since OLAP queries filter too."
  - q:
      vi: "Báo cáo tháng cộng `teu` theo cảng trên mọi lô của 31 ngày. Điều gì làm nó là tải OLAP?"
      en: "A monthly report sums `teu` by port over every shipment of 31 days. What makes it an OLAP workload?"
    options:
      - { vi: "Nó dùng hàm `sum`", en: "It uses the `sum` function" }
      - { vi: "Nó chạy vào cuối tháng", en: "It runs at the end of the month" }
      - { vi: "Nó quét nhiều dòng, cần ít cột", en: "It scans many rows, needs few columns" }
    answer: 2
    trap: 0
    why:
      vi: "Một câu OLTP cũng có thể gọi `sum` trên vài dòng của một đơn, nên hàm gộp không phải dấu hiệu. Dấu hiệu là hình dạng: câu đọc mọi lô trong tháng (cả nghìn dòng) nhưng chỉ cần hai cột `port` và `teu`. Hình dạng đó là lý do kho phân tích lưu theo cột. Giờ chạy cũng không quyết định kiểu tải."
      en: "An OLTP query can also call `sum` over a few rows of one order, so an aggregate is not the sign. The sign is the shape: the query reads every shipment of the month (thousands of rows) but needs only two columns, `port` and `teu`. That shape is why analytics stores keep columns apart. The time it runs does not decide the workload either."
---
## Mở bài

Cargo Query Logistics có hai kiểu người dùng trên cùng một bảng lô hàng: khách bấm xem từng lô, và phòng kinh doanh xem báo cáo cả tháng. Bài này đặt tên cho hai kiểu tải đó và cho thấy chúng đọc dữ liệu khác nhau thế nào.

## Ý chính

**OLTP** (online transaction processing, xử lý giao dịch) là nhiều câu lệnh ngắn, mỗi câu đọc hoặc ghi vài dòng theo khóa: đặt chỗ, đổi trạng thái, mở một lô. Điều quan trọng là thời gian trả lời từng câu và việc nhiều người ghi cùng lúc mà không hỏng dữ liệu.

**OLAP** (online analytical processing, xử lý phân tích) là ít câu lệnh hơn nhưng mỗi câu quét rất nhiều dòng để gộp: tổng TEU theo cảng, doanh thu theo tháng. Mỗi câu thường cần vài cột trong một bảng rộng. Tài liệu ClickHouse tự giới thiệu là một hệ quản trị CSDL lưu theo cột cho xử lý phân tích (OLAP).

PostgreSQL làm tốt OLTP và làm được OLAP vừa phải. Khi bảng phân tích lớn dần, người ta tách tải: OLTP ở PostgreSQL, OLAP ở một kho lưu theo cột. Bài lab ngay sau đo vì sao cách lưu quyết định chi phí của câu OLAP.

## Ví dụ

Một câu OLTP: đọc một lô theo khóa chính.

```sql
SELECT id, port, mode, teu
FROM shipments
WHERE id = 2041;
```

`EXPLAIN` cho thấy nó đi thẳng vào chỉ mục khóa chính, không quét bảng.

```sql
EXPLAIN (COSTS OFF)
SELECT id, port, mode, teu
FROM shipments
WHERE id = 2041;
```

Một câu OLAP: gộp mọi lô của tháng theo cảng.

```sql
SELECT port, sum(teu) AS teu
FROM shipments
GROUP BY port
ORDER BY port;
```

Nó phải đọc cả bảng: `Seq Scan` dưới một bước gộp.

```sql
EXPLAIN (COSTS OFF)
SELECT port, sum(teu) AS teu
FROM shipments
GROUP BY port;
```

## Lỗi hay gặp

Coi một câu là OLAP chỉ vì có hàm gộp. Câu dưới cũng gọi `sum` nhưng chỉ chạm một dòng: vẫn là OLTP.

```sql
-- WRONG: one row, not a report
SELECT sum(teu) AS teu
FROM shipments
WHERE id = 2041;
```

```sql
-- FIX: the report reads every row
SELECT sum(teu) AS teu
FROM shipments;
```

Đọc mọi cột cho một báo cáo chỉ cần hai cột. Ở kho lưu theo cột, các cột thừa là dữ liệu đọc thêm.

```sql
-- WRONG: every column, for a sum
SELECT *
FROM shipments
WHERE port = 'VNDAD'
ORDER BY id
LIMIT 3;
```

```sql
-- FIX: only the columns needed
SELECT port, sum(teu) AS teu
FROM shipments
WHERE port = 'VNDAD'
GROUP BY port;
```

## Tóm tắt

- OLTP: nhiều câu ngắn, mỗi câu vài dòng theo khóa, nhiều người ghi cùng lúc.
- OLAP: ít câu dài, mỗi câu quét nhiều dòng nhưng cần ít cột.
- Kiểu tải tính theo việc câu lệnh làm, không theo cỡ bảng hay hàm gộp.
- Khi OLAP lớn dần, tách nó sang kho lưu theo cột như ClickHouse.

# EN

## Opening

Cargo Query Logistics has two kinds of users on the same shipments table: customers who open one shipment at a time, and the sales team who read a whole month's report. This lesson names those two workloads and shows how differently they read data.

## Key idea

**OLTP** (online transaction processing) is many short queries, each reading or writing a few rows by key: a booking, a status change, opening one shipment. What matters is each query's response time and many people writing at once without corrupting data.

**OLAP** (online analytical processing) is fewer queries, but each scans very many rows to aggregate: total TEU by port, revenue by month. Each query usually needs a few columns of a wide table. The ClickHouse docs introduce it as a column-oriented database management system for online analytical processing (OLAP).

PostgreSQL does OLTP well and OLAP up to a point. As the analytics tables grow, teams split the workloads: OLTP in PostgreSQL, OLAP in a column store. The lab right after this lesson measures why the storage layout decides what an OLAP query costs.

## Example

An OLTP query: read one shipment by primary key.

```sql
SELECT id, port, mode, teu
FROM shipments
WHERE id = 2041;
```

`EXPLAIN` shows it goes straight to the primary key index, with no table scan.

```sql
EXPLAIN (COSTS OFF)
SELECT id, port, mode, teu
FROM shipments
WHERE id = 2041;
```

An OLAP query: aggregate every shipment of the month by port.

```sql
SELECT port, sum(teu) AS teu
FROM shipments
GROUP BY port
ORDER BY port;
```

It has to read the whole table: a `Seq Scan` under an aggregate step.

```sql
EXPLAIN (COSTS OFF)
SELECT port, sum(teu) AS teu
FROM shipments
GROUP BY port;
```

## Common mistakes

Calling a query OLAP just because it has an aggregate. The query below calls `sum` too but touches one row: it is still OLTP.

```sql
-- WRONG: one row, not a report
SELECT sum(teu) AS teu
FROM shipments
WHERE id = 2041;
```

```sql
-- FIX: the report reads every row
SELECT sum(teu) AS teu
FROM shipments;
```

Reading every column for a report that needs two. In a column store, the extra columns are extra data read.

```sql
-- WRONG: every column, for a sum
SELECT *
FROM shipments
WHERE port = 'VNDAD'
ORDER BY id
LIMIT 3;
```

```sql
-- FIX: only the columns needed
SELECT port, sum(teu) AS teu
FROM shipments
WHERE port = 'VNDAD'
GROUP BY port;
```

## Recap

- OLTP: many short queries, each a few rows by key, many writers at once.
- OLAP: few long queries, each scanning many rows but needing few columns.
- The workload is about what a query does, not the table size or an aggregate.
- When OLAP grows, move it to a column store such as ClickHouse.
