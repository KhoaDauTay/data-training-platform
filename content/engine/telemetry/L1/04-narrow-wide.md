---
id: e-tm-l1-04
engine: telemetry
level: L1
module: signals
title: "Lưu metric trong PostgreSQL: bảng hẹp và bảng rộng"
title_en: "Storing metrics in PostgreSQL: narrow and wide tables"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: tm-narrow-wide, at: idea }]
objectives:
  - vi: So sánh bảng hẹp (một dòng mỗi điểm đo) với bảng rộng (một cột mỗi metric).
    en: Compare a narrow table (one row per data point) with a wide table (one column per metric).
  - vi: Xoay bảng hẹp thành rộng bằng `FILTER`, và rộng thành hẹp bằng `LATERAL (VALUES …)`.
    en: Pivot narrow to wide with `FILTER`, and wide to narrow with `LATERAL (VALUES …)`.
  - vi: Chọn kiểu bảng theo việc metric mới xuất hiện thường hay hiếm.
    en: Choose the table shape by how often new metrics appear.
requires: [e-tm-l1-03]
sources:
  - { url: "https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES", title: "PostgreSQL: Aggregate expressions (FILTER)", title_vi: "Biểu thức gộp (FILTER)" }
  - { url: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL", title: "PostgreSQL: LATERAL subqueries", title_vi: "Truy vấn con LATERAL" }
  - { url: "https://prometheus.io/docs/concepts/data_model/", title: "Prometheus: Data model", title_vi: "Prometheus: mô hình dữ liệu" }
lab:
  setup: |
    CREATE TABLE metrics (
      ts timestamp, host text,
      name text, value float8
    );
    INSERT INTO metrics VALUES
      ('2026-10-31 10:00', 'h1', 'cpu', 40),
      ('2026-10-31 10:00', 'h1', 'mem_mb', 900),
      ('2026-10-31 10:01', 'h1', 'cpu', 60),
      ('2026-10-31 10:01', 'h1', 'mem_mb', 950),
      ('2026-10-31 10:01', 'h1', 'gpu', 30),
      ('2026-10-31 10:00', 'h2', 'cpu', 20),
      ('2026-10-31 10:00', 'h2', 'mem_mb', 400),
      ('2026-10-31 10:01', 'h2', 'cpu', 30),
      ('2026-10-31 10:01', 'h2', 'mem_mb', 420);
    CREATE TABLE host_stats (
      ts timestamp, host text,
      cpu float8, mem_mb float8
    );
    INSERT INTO host_stats VALUES
      ('2026-10-31 10:02', 'h1', 55, 960),
      ('2026-10-31 10:02', 'h2', 25, 410);
  steps:
    - task:
        vi: "Xoay bảng hẹp `metrics` thành bảng rộng: một dòng mỗi `ts` và `host`, cột `cpu` và `mem_mb`. Trả `ts`, `host`, `cpu`, `mem_mb`."
        en: "Pivot the narrow `metrics` table to a wide one: one row per `ts` and `host`, columns `cpu` and `mem_mb`. Return `ts`, `host`, `cpu`, `mem_mb`."
      solution: |
        SELECT ts, host,
          max(value) FILTER (WHERE name = 'cpu')
            AS cpu,
          max(value) FILTER (WHERE name = 'mem_mb')
            AS mem_mb
        FROM metrics
        GROUP BY ts, host
      check: rows
      hint:
        vi: "`GROUP BY ts, host`, rồi mỗi cột một `max(value) FILTER (WHERE name = …)`."
        en: "`GROUP BY ts, host`, then one `max(value) FILTER (WHERE name = …)` per column."
    - task:
        vi: "Ngược lại: xoay bảng rộng `host_stats` thành dòng hẹp. Trả `ts`, `host`, `name`, `value`."
        en: "The other way: turn the wide `host_stats` into narrow rows. Return `ts`, `host`, `name`, `value`."
      solution: |
        SELECT h.ts, h.host, x.name, x.value
        FROM host_stats h,
          LATERAL (VALUES ('cpu', h.cpu),
            ('mem_mb', h.mem_mb)) AS x(name, value)
      check: rows
      hint:
        vi: "`LATERAL (VALUES ('cpu', h.cpu), ('mem_mb', h.mem_mb)) AS x(name, value)` tạo hai dòng cho mỗi dòng rộng."
        en: "`LATERAL (VALUES ('cpu', h.cpu), ('mem_mb', h.mem_mb)) AS x(name, value)` makes two rows per wide row."
    - task:
        vi: "Từ bảng hẹp: CPU trung bình của mỗi host. Trả `host`, `avg_cpu`."
        en: "From the narrow table: each host's average CPU. Return `host`, `avg_cpu`."
      solution: |
        SELECT host, avg(value) AS avg_cpu
        FROM metrics
        WHERE name = 'cpu'
        GROUP BY host
      check: rows
      hint:
        vi: "`WHERE name = 'cpu'`, `avg(value)`, `GROUP BY host`."
        en: "`WHERE name = 'cpu'`, `avg(value)`, `GROUP BY host`."
    - task:
        vi: "Metric `gpu` mới xuất hiện ở `h1` mà không cần đổi bảng hẹp. Mỗi host gửi bao nhiêu metric khác nhau? Trả `host`, `n_metrics`."
        en: "The `gpu` metric just appeared on `h1` without changing the narrow table. How many distinct metrics does each host send? Return `host`, `n_metrics`."
      solution: |
        SELECT host,
          count(DISTINCT name) AS n_metrics
        FROM metrics
        GROUP BY host
      check: rows
      hint:
        vi: "`count(DISTINCT name)` theo `host`."
        en: "`count(DISTINCT name)` per `host`."
quiz:
  - q:
      vi: "Mỗi tuần đội vận hành thêm vài metric mới cho máy chủ. Kiểu bảng nào không phải đổi lược đồ?"
      en: "The ops team adds a few new host metrics every week. Which table shape needs no schema change?"
    options:
      - { vi: "Bảng rộng, thêm một cột mỗi lần", en: "Wide, add a column each time" }
      - { vi: "Bảng hẹp, một dòng mỗi điểm đo", en: "Narrow, one row per data point" }
      - { vi: "Cả hai đều phải đổi lược đồ", en: "Both need a schema change" }
    answer: 1
    trap: 0
    why:
      vi: "Thêm cột nghe đơn giản, nhưng đó chính là đổi lược đồ (`ALTER TABLE`) mỗi lần có metric mới, và dòng cũ mang `NULL` ở cột mới. Bảng hẹp lưu tên metric trong cột `name`, nên `gpu` xuất hiện chỉ là thêm dòng, như bước 4 của lab. Đổi lại, bảng hẹp nhiều dòng hơn và đọc nhiều metric cùng lúc phải xoay bằng `FILTER`."
      en: "Adding a column sounds simple, but it is a schema change (`ALTER TABLE`) for every new metric, and old rows carry `NULL` in the new column. The narrow table keeps the metric name in the `name` column, so `gpu` appearing is just new rows, as in step 4 of the lab. In return, the narrow table has more rows, and reading several metrics together means pivoting with `FILTER`."
  - q:
      vi: "Bảng hẹp có 9 dòng cho hai host, hai phút. Xoay thành rộng (cột `cpu`, `mem_mb`) thì được mấy dòng?"
      en: "The narrow table has 9 rows for two hosts over two minutes. Pivoted to wide (columns `cpu`, `mem_mb`), how many rows?"
    options:
      - { vi: "9 dòng", en: "9 rows" }
      - { vi: "2 dòng", en: "2 rows" }
      - { vi: "4 dòng", en: "4 rows" }
    answer: 2
    why:
      vi: "Bảng rộng có một dòng cho mỗi cặp (`ts`, `host`): 2 phút × 2 host = 4 dòng. Chín dòng hẹp gồm 4 lần đo `cpu`, 4 lần `mem_mb` và 1 lần `gpu`; `gpu` không có cột nên không thêm dòng. 2 dòng là đếm host, quên thời gian."
      en: "The wide table has one row per (`ts`, `host`) pair: 2 minutes × 2 hosts = 4 rows. The nine narrow rows are 4 `cpu` readings, 4 `mem_mb` and 1 `gpu`; `gpu` has no column, so it adds no row. 2 rows counts the hosts and forgets time."
---
## Mở bài

Máy chủ của Cargo Query gửi CPU, bộ nhớ, và từ hôm nay cả GPU. Lưu chúng trong PostgreSQL có hai cách quen thuộc: một bảng hẹp (một dòng mỗi điểm đo) hay một bảng rộng (một cột mỗi metric). Bài này làm cả hai và chuyển qua lại.

## Ý chính

**Bảng hẹp** (narrow) lưu `(ts, host, name, value)`: một dòng mỗi điểm đo. Nó gần với mô hình của Prometheus, nơi mỗi series là tên metric cộng nhãn và mỗi mẫu là một thời điểm với một giá trị. Metric mới chỉ là dòng mới, không đổi lược đồ; đổi lại số dòng nhiều và đọc nhiều metric cùng lúc phải xoay. **Bảng rộng** (wide) lưu `(ts, host, cpu, mem_mb)`: một dòng mỗi lần đo của một host, mỗi metric một cột có kiểu riêng. Đọc nhanh, gọn, nhưng metric mới là một `ALTER TABLE`, và metric thưa để lại nhiều `NULL`.

Xoay hẹp sang rộng: `GROUP BY ts, host` với `max(value) FILTER (WHERE name = 'cpu')` cho mỗi cột. Rộng sang hẹp: `LATERAL (VALUES ('cpu', cpu), ('mem_mb', mem_mb))`. Gom theo khoảng thời gian, lấp khoảng trống và index BRIN là chuyện của chuỗi thời gian trong SQL, ở thẻ chuỗi thời gian riêng; bài này chỉ bàn hình dạng bảng. Hình cuối mục đặt hai kiểu cạnh nhau.

## Cú pháp

```sql
-- narrow to wide
SELECT ts, host,
  max(value) FILTER
    (WHERE name = 'cpu') AS cpu
FROM metrics
GROUP BY ts, host;
```

- Hẹp: `(ts, host, name, value)`; metric mới = dòng mới.
- Rộng: `(ts, host, cpu, mem_mb)`; metric mới = cột mới.
- Rộng sang hẹp: `LATERAL (VALUES (…), (…)) AS x(name, value)`.

## Ví dụ

Bảng hẹp: một dòng mỗi điểm đo của `h1`.

```sql
SELECT ts, name, value
FROM metrics
WHERE host = 'h1'
ORDER BY ts, name;
```

Bảng rộng: một dòng mỗi lần đo.

```sql
SELECT ts, host, cpu, mem_mb
FROM host_stats
ORDER BY host;
```

## Lỗi hay gặp

Xoay mà quên `FILTER`: cột `cpu` nhận giá trị lớn nhất của mọi metric, tức bộ nhớ.

```sql
-- WRONG: max over every metric
SELECT ts, host, max(value) AS cpu
FROM metrics
GROUP BY ts, host
ORDER BY host, ts;
```

```sql
-- FIX: only the cpu rows
SELECT ts, host,
  max(value) FILTER
    (WHERE name = 'cpu') AS cpu
FROM metrics
GROUP BY ts, host
ORDER BY host, ts;
```

Tính trung bình trên bảng hẹp mà không lọc tên: trộn CPU với MB.

```sql
-- WRONG: averages cpu and mem_mb
SELECT host, avg(value) AS avg_cpu
FROM metrics
GROUP BY host ORDER BY host;
```

```sql
-- FIX: filter the metric first
SELECT host, avg(value) AS avg_cpu
FROM metrics
WHERE name = 'cpu'
GROUP BY host ORDER BY host;
```

## Thực hành

Bốn bước: xoay hẹp sang rộng, xoay rộng sang hẹp, tính CPU trung bình trên bảng hẹp, rồi đếm số metric mỗi host gửi khi `gpu` vừa xuất hiện.

## Tóm tắt

- Bảng hẹp: một dòng mỗi điểm đo, gần mô hình Prometheus, metric mới không đổi lược đồ.
- Bảng rộng: một cột mỗi metric, đọc gọn, metric mới cần `ALTER TABLE`.
- Hẹp sang rộng: `max(value) FILTER (WHERE name = …)`; rộng sang hẹp: `LATERAL (VALUES …)`.
- Trên bảng hẹp, luôn lọc `name` trước khi gộp.

# EN

## Opening

Cargo Query's hosts send CPU, memory and, from today, GPU. There are two familiar ways to store them in PostgreSQL: a narrow table (one row per data point) or a wide table (one column per metric). This lesson builds both and converts between them.

## Key idea

A **narrow** table stores `(ts, host, name, value)`: one row per data point. It is close to Prometheus' model, where each series is a metric name plus labels and each sample is a time with a value. A new metric is just new rows, no schema change; in return there are many rows, and reading several metrics together means pivoting. A **wide** table stores `(ts, host, cpu, mem_mb)`: one row per reading of a host, one typed column per metric. It reads fast and compact, but a new metric is an `ALTER TABLE`, and sparse metrics leave many `NULL`s.

Narrow to wide: `GROUP BY ts, host` with `max(value) FILTER (WHERE name = 'cpu')` for each column. Wide to narrow: `LATERAL (VALUES ('cpu', cpu), ('mem_mb', mem_mb))`. Bucketing by time, gap filling and BRIN indexes belong to time series in SQL, on the separate time-series card; this lesson is only about the table's shape. The figure at the end of this section puts the two shapes side by side.

## Syntax

```sql
-- narrow to wide
SELECT ts, host,
  max(value) FILTER
    (WHERE name = 'cpu') AS cpu
FROM metrics
GROUP BY ts, host;
```

- Narrow: `(ts, host, name, value)`; a new metric = new rows.
- Wide: `(ts, host, cpu, mem_mb)`; a new metric = a new column.
- Wide to narrow: `LATERAL (VALUES (…), (…)) AS x(name, value)`.

## Example

The narrow table: one row per data point of `h1`.

```sql
SELECT ts, name, value
FROM metrics
WHERE host = 'h1'
ORDER BY ts, name;
```

The wide table: one row per reading.

```sql
SELECT ts, host, cpu, mem_mb
FROM host_stats
ORDER BY host;
```

## Common mistakes

Pivoting without `FILTER`: the `cpu` column gets the largest value of every metric, that is the memory.

```sql
-- WRONG: max over every metric
SELECT ts, host, max(value) AS cpu
FROM metrics
GROUP BY ts, host
ORDER BY host, ts;
```

```sql
-- FIX: only the cpu rows
SELECT ts, host,
  max(value) FILTER
    (WHERE name = 'cpu') AS cpu
FROM metrics
GROUP BY ts, host
ORDER BY host, ts;
```

Averaging the narrow table without filtering the name: CPU gets mixed with MB.

```sql
-- WRONG: averages cpu and mem_mb
SELECT host, avg(value) AS avg_cpu
FROM metrics
GROUP BY host ORDER BY host;
```

```sql
-- FIX: filter the metric first
SELECT host, avg(value) AS avg_cpu
FROM metrics
WHERE name = 'cpu'
GROUP BY host ORDER BY host;
```

## Practice

Four steps: pivot narrow to wide, turn wide into narrow, compute the average CPU on the narrow table, then count the metrics each host sends now that `gpu` has appeared.

## Recap

- Narrow: one row per data point, close to Prometheus' model, a new metric needs no schema change.
- Wide: one column per metric, compact to read, a new metric needs `ALTER TABLE`.
- Narrow to wide: `max(value) FILTER (WHERE name = …)`; wide to narrow: `LATERAL (VALUES …)`.
- On a narrow table, always filter `name` before aggregating.
