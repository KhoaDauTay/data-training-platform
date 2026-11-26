---
id: e-ol-l1-03
engine: olap
level: L1
module: workload
title: "Fact, dimension và lược đồ hình sao"
title_en: "Facts, dimensions and the star schema"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-star, at: idea }]
objectives:
  - vi: Phân biệt bảng fact (sự kiện đo được, có số để cộng) với bảng dimension (mô tả ai, ở đâu, khi nào).
    en: Tell a fact table (measured events, with numbers to add up) from a dimension table (who, where, when).
  - vi: Viết báo cáo bằng cách nối fact với dimension theo khóa rồi gom nhóm theo cột của dimension.
    en: Write a report by joining the fact to its dimensions on keys, then grouping by dimension columns.
  - vi: Nhận ra lược đồ bông tuyết (snowflake), nơi một dimension trỏ tiếp sang dimension khác.
    en: Recognise a snowflake schema, where one dimension points on to another dimension.
requires: [e-ol-l1-01]
sources:
  - { url: "https://clickhouse.com/docs/data-modeling/schema-design", title: "ClickHouse docs: Schema design" }
  - { url: "https://www.postgresql.org/docs/18/queries-table-expressions.html", title: "PostgreSQL 18 docs: Table Expressions" }
lab:
  setup: |
    CREATE TABLE dim_country (
      country_key int PRIMARY KEY,
      country text
    );
    INSERT INTO dim_country VALUES
      (1, 'Viet Nam'), (2, 'Singapore'),
      (3, 'China');
    CREATE TABLE dim_port (
      port_key int PRIMARY KEY,
      port text, country_key int
    );
    INSERT INTO dim_port VALUES
      (1, 'VNDAD', 1), (2, 'VNSGN', 1),
      (3, 'SGSIN', 2), (4, 'CNSHA', 3);
    CREATE TABLE dim_date (
      date_key date PRIMARY KEY,
      month text
    );
    INSERT INTO dim_date
    SELECT d::date, to_char(d, 'YYYY-MM')
    FROM generate_series(
      date '2026-09-01', date '2026-10-31',
      interval '1 day') AS d;
    CREATE TABLE fact_moves (
      date_key date, port_key int,
      teu int, revenue_vnd bigint
    );
    INSERT INTO fact_moves
    SELECT date '2026-09-01' + i % 61,
      1 + i % 7 % 4, 1 + i % 3,
      (1 + i % 3) * 1500000
    FROM generate_series(1, 600) AS i;
  steps:
    - task:
        vi: "Tổng TEU theo tên cảng: nối `fact_moves` với `dim_port`, trả `port`, `teu`."
        en: "Total TEU by port name: join `fact_moves` to `dim_port`, return `port`, `teu`."
      solution: |
        SELECT p.port, sum(f.teu) AS teu
        FROM fact_moves f
        JOIN dim_port p
          ON p.port_key = f.port_key
        GROUP BY p.port;
      check: rows
      hint:
        vi: "`JOIN dim_port p ON p.port_key = f.port_key`, rồi `GROUP BY p.port`."
        en: "`JOIN dim_port p ON p.port_key = f.port_key`, then `GROUP BY p.port`."
    - task:
        vi: "Doanh thu theo tháng: nối với `dim_date`, trả `month`, `revenue_vnd`."
        en: "Revenue by month: join to `dim_date`, return `month`, `revenue_vnd`."
      solution: |
        SELECT d.month,
          sum(f.revenue_vnd) AS revenue_vnd
        FROM fact_moves f
        JOIN dim_date d
          ON d.date_key = f.date_key
        GROUP BY d.month;
      check: rows
      hint:
        vi: "`JOIN dim_date d ON d.date_key = f.date_key`, `GROUP BY d.month`."
        en: "`JOIN dim_date d ON d.date_key = f.date_key`, `GROUP BY d.month`."
    - task:
        vi: "Bông tuyết: TEU theo quốc gia, đi `fact_moves` → `dim_port` → `dim_country`. Trả `country`, `teu`."
        en: "Snowflake: TEU by country, going `fact_moves` → `dim_port` → `dim_country`. Return `country`, `teu`."
      solution: |
        SELECT c.country, sum(f.teu) AS teu
        FROM fact_moves f
        JOIN dim_port p
          ON p.port_key = f.port_key
        JOIN dim_country c
          ON c.country_key = p.country_key
        GROUP BY c.country;
      check: rows
      hint:
        vi: "Hai phép nối: fact với cảng theo `port_key`, cảng với quốc gia theo `country_key`."
        en: "Two joins: fact to port on `port_key`, port to country on `country_key`."
quiz:
  - q:
      vi: "Bảng `dim_port` có cột `port` và `country_key`, không có số nào để cộng. Nó là gì?"
      en: "Table `dim_port` has columns `port` and `country_key`, and no number to add up. What is it?"
    options:
      - { vi: "Một dimension", en: "A dimension" }
      - { vi: "Một fact nhỏ", en: "A small fact" }
      - { vi: "Một bảng tạm", en: "A temporary table" }
    answer: 0
    trap: 1
    why:
      vi: "Bảng ít dòng dễ bị gọi là fact nhỏ, nhưng fact được nhận ra bằng việc nó ghi sự kiện có số đo (TEU, doanh thu), không bằng cỡ. `dim_port` chỉ mô tả cảng ở đâu, thuộc nước nào, nên là dimension: ta gom nhóm theo nó, không cộng nó. Nó cũng không phải bảng tạm: báo cáo nào cũng nối tới nó."
      en: "A small table is easily called a small fact, but a fact is known by recording events with measures (TEU, revenue), not by size. `dim_port` only describes where a port is and which country it belongs to, so it is a dimension: we group by it, we do not add it up. Nor is it a temporary table: every report joins to it."
  - q:
      vi: "Thêm `dim_country` sau `dim_port` biến lược đồ hình sao thành gì?"
      en: "Adding `dim_country` behind `dim_port` turns the star schema into what?"
    options:
      - { vi: "Một fact thứ hai", en: "A second fact" }
      - { vi: "Lược đồ bông tuyết", en: "A snowflake schema" }
      - { vi: "Bảng phẳng một cột", en: "A flat one-column table" }
    answer: 1
    trap: 0
    why:
      vi: "`dim_country` không có số đo, nên không phải fact thứ hai. Khi một dimension trỏ tiếp sang dimension khác (cảng → quốc gia), hình sao có thêm nhánh và gọi là bông tuyết. Đổi lại cho việc không lặp tên nước, báo cáo theo quốc gia cần thêm một phép nối."
      en: "`dim_country` has no measures, so it is not a second fact. When one dimension points on to another (port → country), the star grows branches and is called a snowflake. In exchange for not repeating country names, a report by country needs one more join."
---
## Mở bài

Phòng kinh doanh của Cargo Query hỏi TEU theo cảng, theo tháng, theo quốc gia. Kho phân tích trả lời mọi câu đó từ cùng một cách xếp bảng: lược đồ hình sao.

## Ý chính

Bảng **fact** ghi các sự kiện đo được, mỗi dòng một sự kiện, với các số để cộng: `fact_moves` có `teu` và `revenue_vnd` cho mỗi lượt hàng qua cảng. Bảng **dimension** mô tả ngữ cảnh: cảng nào (`dim_port`), ngày nào thuộc tháng nào (`dim_date`). Fact giữ khóa của các dimension.

Fact ở giữa, các dimension quanh nó: đó là **lược đồ hình sao** (star schema). Một báo cáo nối fact với vài dimension rồi gom nhóm theo cột của dimension. Khi một dimension trỏ tiếp sang dimension khác, như cảng → quốc gia, lược đồ gọi là **bông tuyết** (snowflake): đỡ lặp dữ liệu, thêm một phép nối.

Tài liệu ClickHouse về thiết kế lược đồ khuyên dùng phép nối vừa phải (2 đến 3 bảng là ổn) và thường gộp bảng lại lúc ghi (denormalize) để bớt phép nối lúc đọc. Trước khi cộng, luôn biết mỗi dòng fact là gì (grain, xem bài `e-st-l2-08`).

## Cú pháp

```sql
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port;
```

- Nối fact với dimension theo khóa của dimension.
- Gom nhóm theo cột mô tả của dimension, cộng cột số đo của fact.

## Ví dụ

Fact giữ khóa, không giữ tên cảng.

```sql
SELECT date_key, port_key,
  teu, revenue_vnd
FROM fact_moves
ORDER BY date_key, port_key
LIMIT 3;
```

Đếm số lượt và TEU theo cảng.

```sql
SELECT p.port, count(*) AS moves,
  sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port
ORDER BY p.port;
```

## Lỗi hay gặp

Nối sai cột: khóa quốc gia của cảng không phải khóa cảng của fact.

```sql
-- WRONG: country_key is not port_key
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.country_key = f.port_key
GROUP BY p.port;
```

```sql
-- FIX: join on the port key
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port;
```

Gom nhóm theo khóa thay vì theo tên: kết quả đúng số nhưng không đọc được, và hai cảng cùng tên ở hai nước sẽ tách rời. Báo cáo cần cột mô tả.

```sql
-- WRONG: keys, not names
SELECT f.port_key, sum(f.teu) AS teu
FROM fact_moves f
GROUP BY f.port_key;
```

```sql
-- FIX: group by the dimension column
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port;
```

## Thực hành

Ba báo cáo trên cùng một fact: theo cảng, theo tháng, rồi theo quốc gia qua hai phép nối.

## Tóm tắt

- Fact: mỗi dòng một sự kiện đo được, có số để cộng và khóa của dimension.
- Dimension: mô tả ai, ở đâu, khi nào; ta gom nhóm theo nó.
- Hình sao: fact ở giữa; bông tuyết: dimension trỏ tiếp sang dimension.
- Biết grain của fact trước khi cộng.

# EN

## Opening

Cargo Query's sales team asks for TEU by port, by month, by country. An analytics store answers all of them from one table layout: the star schema.

## Key idea

A **fact** table records measured events, one row per event, with numbers to add up: `fact_moves` has `teu` and `revenue_vnd` for each cargo move through a port. A **dimension** table describes the context: which port (`dim_port`), which day belongs to which month (`dim_date`). The fact holds the dimensions' keys.

The fact in the middle, the dimensions around it: that is the **star schema**. A report joins the fact to a few dimensions, then groups by dimension columns. When one dimension points on to another, like port → country, the schema is called a **snowflake**: less repeated data, one more join.

The ClickHouse docs on schema design advise using joins sparingly (2 to 3 tables is fine) and often combining tables at insert time (denormalizing) to save joins at read time. Before adding up, always know what one fact row is (the grain, see lesson `e-st-l2-08`).

## Syntax

```sql
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port;
```

- Join the fact to a dimension on the dimension's key.
- Group by the dimension's descriptive column, add up the fact's measure.

## Example

The fact holds keys, not port names.

```sql
SELECT date_key, port_key,
  teu, revenue_vnd
FROM fact_moves
ORDER BY date_key, port_key
LIMIT 3;
```

Count moves and TEU by port.

```sql
SELECT p.port, count(*) AS moves,
  sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port
ORDER BY p.port;
```

## Common mistakes

Joining on the wrong column: a port's country key is not the fact's port key.

```sql
-- WRONG: country_key is not port_key
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.country_key = f.port_key
GROUP BY p.port;
```

```sql
-- FIX: join on the port key
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port;
```

Grouping by the key instead of the name: the numbers are right but unreadable, and two ports with one name in two countries would stay apart. A report needs the descriptive column.

```sql
-- WRONG: keys, not names
SELECT f.port_key, sum(f.teu) AS teu
FROM fact_moves f
GROUP BY f.port_key;
```

```sql
-- FIX: group by the dimension column
SELECT p.port, sum(f.teu) AS teu
FROM fact_moves f
JOIN dim_port p
  ON p.port_key = f.port_key
GROUP BY p.port;
```

## Practice

Three reports on one fact: by port, by month, then by country through two joins.

## Recap

- Fact: one measured event per row, with numbers to add up and the dimensions' keys.
- Dimension: who, where, when; we group by it.
- Star: the fact in the middle; snowflake: a dimension points on to a dimension.
- Know the fact's grain before adding up.
