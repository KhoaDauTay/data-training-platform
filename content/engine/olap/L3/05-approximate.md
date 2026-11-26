---
id: e-ol-l3-05
engine: olap
level: L3
module: clickhouse
title: "Hàm xấp xỉ: uniq và quantile"
title_en: "Approximate functions: uniq and quantile"
kind: concept
runtime: docs
minutes: 20
figures: [{ name: ol-approx, at: idea }]
objectives:
  - vi: Biết `uniq` và `quantile` của ClickHouse trả số xấp xỉ, đổi lấy tốc độ và bộ nhớ.
    en: Know that ClickHouse's `uniq` and `quantile` return approximate numbers, traded for speed and memory.
  - vi: Chọn hàm chính xác (`uniqExact`, `quantileExact`) khi con số phải khớp từng đơn vị.
    en: Pick the exact functions (`uniqExact`, `quantileExact`) when the number must match to the unit.
  - vi: Thấy trên PostgreSQL vì sao lấy mẫu rồi nhân lên đúng cho tổng nhưng sai cho số giá trị khác nhau.
    en: See on PostgreSQL why sampling and scaling up works for a count but not for a distinct count.
requires: [e-ol-l3-01]
sources:
  - { url: "https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq", title: "ClickHouse docs: uniq" }
  - { url: "https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile", title: "ClickHouse docs: quantile" }
  - { url: "https://www.postgresql.org/docs/18/sql-select.html#SQL-FROM", title: "PostgreSQL 18 docs: SELECT (TABLESAMPLE)" }
  - { url: "https://www.postgresql.org/docs/18/functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE", title: "PostgreSQL 18 docs: Ordered-Set Aggregate Functions" }
demo_setup: |
  CREATE TABLE visits (
    id int, container_id int,
    transit_h int
  );
  INSERT INTO visits
  SELECT i, 1 + (i * 37) % 4000,
    10 + (i * 13) % 90
  FROM generate_series(1, 40000) AS i;
quiz:
  - q:
      vi: "Bảng điều hành cần số container khác nhau trong tháng, sai lệch 1% là chấp nhận được, trên hàng tỉ dòng. Hàm nào hợp?"
      en: "A dashboard needs the number of distinct containers in a month, 1% off is fine, over billions of rows. Which function fits?"
    options:
      - { vi: "`uniqExact(container_id)`", en: "`uniqExact(container_id)`" }
      - { vi: "`uniq(container_id)`", en: "`uniq(container_id)`" }
      - { vi: "`count(container_id)`", en: "`count(container_id)`" }
    answer: 1
    trap: 0
    why:
      vi: "`uniqExact` cho số đúng tuyệt đối nhưng phải nhớ mọi giá trị khác nhau, tốn bộ nhớ trên hàng tỉ dòng, trong khi sai 1% vẫn được chấp nhận. Tài liệu ghi `uniq` tính xấp xỉ bằng lấy mẫu thích ứng, giữ tối đa 65.536 giá trị băm, và khuyên dùng nó trong hầu hết trường hợp. `count` đếm mọi dòng, kể cả container lặp lại."
      en: "`uniqExact` gives the exact number but has to remember every distinct value, costly in memory over billions of rows, while 1% off is acceptable. The docs say `uniq` approximates with adaptive sampling, keeping up to 65,536 hash values, and recommend it in almost all scenarios. `count` counts every row, repeated containers included."
  - q:
      vi: "Chạy `quantile(0.5)(transit_h)` hai lần trên cùng dữ liệu, ra hai số hơi khác nhau. Vì sao?"
      en: "Running `quantile(0.5)(transit_h)` twice on the same data gives two slightly different numbers. Why?"
    options:
      - { vi: "Dữ liệu đã bị đổi giữa hai lần", en: "The data changed in between" }
      - { vi: "Nó lấy mẫu, kết quả không tất định", en: "It samples; the result is not deterministic" }
      - { vi: "Có lỗi làm tròn số thực", en: "A floating-point rounding bug" }
    answer: 1
    trap: 0
    why:
      vi: "Dữ liệu không đổi, và đây không phải lỗi làm tròn. Tài liệu ghi `quantile` dùng lấy mẫu kiểu reservoir với tối đa 8.192 giá trị, và kết quả không tất định: mỗi lần chạy có thể giữ mẫu khác. Cần đúng từng giờ thì dùng `quantileExact`."
      en: "The data did not change, and it is not a rounding bug. The docs say `quantile` uses reservoir sampling with up to 8,192 values and that its result is not deterministic: each run may keep a different sample. For an exact number of hours, use `quantileExact`."
---
## Mở bài

Bảng điều hành của Cargo Query hiển thị số container khác nhau và thời gian vận chuyển trung vị trên hàng tỉ sự kiện. ClickHouse có hàm xấp xỉ cho đúng việc này; bài này đọc tài liệu của chúng và thử ý "lấy mẫu" trên PostgreSQL.

## Ý chính

**`uniq(x)`** tính số giá trị khác nhau **xấp xỉ**: theo tài liệu, nó lấy mẫu thích ứng và giữ tối đa 65.536 giá trị băm, và được khuyên dùng trong hầu hết trường hợp. **`quantile(p)(x)`** tính phân vị xấp xỉ bằng lấy mẫu reservoir tối đa 8.192 giá trị; kết quả không tất định. Khi số phải khớp từng đơn vị (đối soát, hóa đơn), dùng `uniqExact` hoặc `quantileExact`.

PostgreSQL chỉ có bản chính xác: `count(DISTINCT x)` và `percentile_cont(p) WITHIN GROUP (ORDER BY x)`. Để thấy ý lấy mẫu, dùng `TABLESAMPLE BERNOULLI (10) REPEATABLE (7)`: khoảng 10% số dòng, cùng mẫu mỗi lần nhờ hạt giống. Nhân 10 số dòng của mẫu cho ra gần đúng tổng số dòng; nhưng nhân 10 số giá trị khác nhau thì sai, vì một container lặp lại nhiều lần trong bảng chỉ xuất hiện một lần trong mẫu. Vì vậy `uniq` cần thuật toán riêng, không chỉ là lấy mẫu rồi nhân.

## Ví dụ

```text
-- ClickHouse (read only)
SELECT uniq(container_id),
  quantile(0.5)(transit_h)
FROM visits;
```

Số chính xác trên PostgreSQL.

```sql
SELECT count(DISTINCT container_id)
    AS containers,
  percentile_cont(0.5) WITHIN GROUP
    (ORDER BY transit_h) AS median_h
FROM visits;
```

Đếm dòng trên mẫu 10% rồi nhân 10: gần với 40.000.

```sql
SELECT count(*) * 10 AS est_rows
FROM visits
TABLESAMPLE BERNOULLI (10)
  REPEATABLE (7);
```

## Lỗi hay gặp

Nhân số giá trị khác nhau của mẫu lên 10 lần: ra quá xa số thật (4.000).

```sql
-- WRONG: scaled distinct count
SELECT count(DISTINCT container_id)
  * 10 AS containers
FROM visits
TABLESAMPLE BERNOULLI (10)
  REPEATABLE (7);
```

```sql
-- FIX: exact on all rows
SELECT count(DISTINCT container_id)
  AS containers
FROM visits;
```

Lấy trung bình thay cho trung vị: trung bình kéo theo các chuyến rất dài, trung vị thì không.

```sql
-- WRONG: the mean is not the median
SELECT round(avg(transit_h), 1)
  AS mid_h
FROM visits;
```

```sql
-- FIX: the 0.5 quantile
SELECT percentile_disc(0.5)
  WITHIN GROUP (ORDER BY transit_h)
  AS mid_h
FROM visits;
```

## Tóm tắt

- `uniq` và `quantile` của ClickHouse cho số xấp xỉ, nhanh và ít bộ nhớ.
- `quantile` không tất định; `uniq` giữ tối đa 65.536 giá trị băm.
- Cần số khớp từng đơn vị thì dùng `uniqExact`, `quantileExact`.
- Lấy mẫu rồi nhân đúng cho số dòng, sai cho số giá trị khác nhau.

# EN

## Opening

Cargo Query's dashboard shows the number of distinct containers and the median transit time over billions of events. ClickHouse has approximate functions for exactly this; this lesson reads their docs and tries the "sampling" idea on PostgreSQL.

## Key idea

**`uniq(x)`** computes an **approximate** number of distinct values: according to the docs, it uses adaptive sampling and keeps up to 65,536 hash values, and it is recommended in almost all scenarios. **`quantile(p)(x)`** computes an approximate quantile with reservoir sampling of up to 8,192 values; its result is not deterministic. When the number must match to the unit (reconciliation, invoices), use `uniqExact` or `quantileExact`.

PostgreSQL has only the exact versions: `count(DISTINCT x)` and `percentile_cont(p) WITHIN GROUP (ORDER BY x)`. To see the sampling idea, use `TABLESAMPLE BERNOULLI (10) REPEATABLE (7)`: about 10% of the rows, the same sample each time thanks to the seed. Multiplying the sample's row count by 10 gives roughly the total row count; but multiplying its distinct count by 10 is wrong, since a container repeated many times in the table appears only once in the sample. That is why `uniq` needs its own algorithm, not just sample-and-scale.

## Example

```text
-- ClickHouse (read only)
SELECT uniq(container_id),
  quantile(0.5)(transit_h)
FROM visits;
```

The exact numbers on PostgreSQL.

```sql
SELECT count(DISTINCT container_id)
    AS containers,
  percentile_cont(0.5) WITHIN GROUP
    (ORDER BY transit_h) AS median_h
FROM visits;
```

Count the rows of a 10% sample and multiply by 10: close to 40,000.

```sql
SELECT count(*) * 10 AS est_rows
FROM visits
TABLESAMPLE BERNOULLI (10)
  REPEATABLE (7);
```

## Common mistakes

Multiplying the sample's distinct count by 10: far from the real number (4,000).

```sql
-- WRONG: scaled distinct count
SELECT count(DISTINCT container_id)
  * 10 AS containers
FROM visits
TABLESAMPLE BERNOULLI (10)
  REPEATABLE (7);
```

```sql
-- FIX: exact on all rows
SELECT count(DISTINCT container_id)
  AS containers
FROM visits;
```

Taking the mean for the median: the mean is pulled by very long trips, the median is not.

```sql
-- WRONG: the mean is not the median
SELECT round(avg(transit_h), 1)
  AS mid_h
FROM visits;
```

```sql
-- FIX: the 0.5 quantile
SELECT percentile_disc(0.5)
  WITHIN GROUP (ORDER BY transit_h)
  AS mid_h
FROM visits;
```

## Recap

- ClickHouse's `uniq` and `quantile` give approximate numbers, fast and with little memory.
- `quantile` is not deterministic; `uniq` keeps up to 65,536 hash values.
- When the number must match to the unit, use `uniqExact`, `quantileExact`.
- Sample-and-scale works for row counts, not for distinct counts.
