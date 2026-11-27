---
id: e-ol-l5-03
engine: olap
level: L5
module: scale
title: "Bài tổng kết: báo cáo lưu bãi trên bốn shard bị lệch"
title_en: "Capstone: the dwell report over four shards is off"
kind: capstone
runtime: browser
minutes: 45
figures: [{ name: ol-capstone-l5, at: idea }]
objectives:
  - vi: Bỏ dòng gửi trùng trước khi chia shard, và kiểm cả hai bản của một dòng trùng rơi vào cùng một shard.
    en: Drop resent rows before sharding, and check that both copies of a duplicate land on the same shard.
  - vi: Gộp hai pha đúng cách, tổng và số đếm trên shard, chia một lần ở máy nhận câu, rồi nối với bảng tra cảng.
    en: Aggregate in two phases correctly, sums and counts on the shards, one division on the receiving server, then join the port lookup.
  - vi: Cộng số container khác nhau từ các shard khi khóa chia shard giữ mỗi container trên một shard.
    en: Add up distinct containers from the shards when the sharding key keeps each container on one shard.
requires: [e-ol-l5-01, e-ol-l3-03, e-ol-l4-04]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/special/distributed", title: "ClickHouse docs: Distributed table engine" }
  - { url: "https://clickhouse.com/docs/shards", title: "ClickHouse docs: Table parts, shards and replicas" }
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree", title: "ClickHouse docs: ReplacingMergeTree" }
  - { url: "https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT", title: "PostgreSQL 18 docs: SELECT DISTINCT ON" }
lab:
  setup: |
    CREATE TABLE ports (
      code text, name text
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Tien Sa'),
      ('VNHPH', 'Hai Phong'),
      ('VNSGN', 'Cat Lai');
    CREATE TABLE arrivals (
      id int, container_no int,
      port text, dwell_hours int
    );
    INSERT INTO arrivals
    SELECT g, 1 + g % 800,
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + (g / 800) % 3],
      8 + g % 24
    FROM generate_series(1, 8000) AS g;
    INSERT INTO arrivals
    SELECT 8000 + g, 4 * (1 + g % 200),
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + g % 3],
      72
    FROM generate_series(1, 2000) AS g;
    INSERT INTO arrivals
    SELECT * FROM arrivals
    WHERE id % 50 = 0;
  steps:
    - name: { vi: "Dòng gửi trùng", en: "Resent rows" }
      task:
        vi: "Hệ thống cảng gửi lại một số dòng với cùng `id`. Có bao nhiêu dòng thừa? Trả `resent`."
        en: "The port system resent some rows with the same `id`. How many extra rows are there? Return `resent`."
      solution: |
        SELECT count(*)
          - count(DISTINCT id) AS resent
        FROM arrivals;
      check: rows
      hint:
        vi: "`count(*) - count(DISTINCT id)`."
        en: "`count(*) - count(DISTINCT id)`."
    - name: { vi: "Chia shard sạch", en: "Clean shards" }
      task:
        vi: "Dựng bảng `sharded`: mỗi `id` một dòng, cột `shard` = `container_no % 4`, cùng mọi cột của `arrivals`."
        en: "Build table `sharded`: one row per `id`, a `shard` column = `container_no % 4`, plus every column of `arrivals`."
      solution: |
        CREATE TABLE sharded AS
        SELECT DISTINCT ON (id)
          container_no % 4 AS shard,
          a.*
        FROM arrivals a
        ORDER BY id;
      after: SELECT shard, count(*) AS row_count FROM sharded GROUP BY shard
      check: rows
      hint:
        vi: "`SELECT DISTINCT ON (id) container_no % 4 AS shard, a.* FROM arrivals a ORDER BY id`."
        en: "`SELECT DISTINCT ON (id) container_no % 4 AS shard, a.* FROM arrivals a ORDER BY id`."
    - name: { vi: "Pha 1", en: "Phase 1" }
      task:
        vi: "Mỗi shard trả trạng thái trung gian theo cảng: `shard`, `port`, `dwell_sum`, `n`."
        en: "Each shard returns intermediate states by port: `shard`, `port`, `dwell_sum`, `n`."
      solution: |
        SELECT shard, port,
          sum(dwell_hours) AS dwell_sum,
          count(*) AS n
        FROM sharded
        GROUP BY shard, port;
      check: rows
      hint:
        vi: "`sum(dwell_hours)` và `count(*)` theo `shard, port`."
        en: "`sum(dwell_hours)` and `count(*)` by `shard, port`."
    - name: { vi: "Pha 2 và tên cảng", en: "Phase 2 and port names" }
      task:
        vi: "Gộp lần cuối và nối với `ports`: thời gian lưu bãi trung bình theo tên cảng, làm tròn 2 chữ số: `name`, `avg_dwell`."
        en: "The final merge, joined with `ports`: average dwell time by port name, rounded to 2 decimals: `name`, `avg_dwell`."
      solution: |
        SELECT p.name,
          round(sum(s.dwell_sum)::numeric
            / sum(s.n), 2) AS avg_dwell
        FROM (SELECT shard, port,
            sum(dwell_hours) AS dwell_sum,
            count(*) AS n
          FROM sharded
          GROUP BY shard, port) s
        JOIN ports p ON p.code = s.port
        GROUP BY p.name;
      check: rows
      hint:
        vi: "Câu của bước 3 làm câu con, `JOIN ports p ON p.code = s.port`, rồi `sum(s.dwell_sum) / sum(s.n)` theo `p.name`."
        en: "Step 3's query as a subquery, `JOIN ports p ON p.code = s.port`, then `sum(s.dwell_sum) / sum(s.n)` by `p.name`."
    - name: { vi: "Số container", en: "Containers" }
      task:
        vi: "Số container khác nhau của cả cụm, cộng từ từng shard: `containers`."
        en: "The cluster's distinct containers, added up from each shard: `containers`."
      solution: |
        SELECT sum(c) AS containers
        FROM (SELECT shard,
            count(DISTINCT container_no)
              AS c
          FROM sharded
          GROUP BY shard) s;
      check: rows
      hint:
        vi: "`count(DISTINCT container_no)` theo `shard` trong câu con, ngoài là `sum(c)`."
        en: "`count(DISTINCT container_no)` by `shard` in a subquery, outside `sum(c)`."
quiz:
  - q:
      vi: "Khóa chia shard là `container_no`. Hai bản của một dòng gửi trùng (cùng `id`, cùng `container_no`) đi tới đâu?"
      en: "The sharding key is `container_no`. Where do the two copies of a resent row (same `id`, same `container_no`) go?"
    options:
      - { vi: "Hai shard ngẫu nhiên", en: "Two random shards" }
      - { vi: "Cùng một shard", en: "The same shard" }
      - { vi: "Mọi shard, mỗi nơi một bản", en: "Every shard, one copy each" }
    answer: 1
    trap: 0
    why:
      vi: "Khóa chia shard không ngẫu nhiên: tài liệu ghi shard được chọn bằng giá trị khóa chia lấy dư cho số shard, nên cùng `container_no` luôn ra cùng shard. Nhờ vậy việc bỏ dòng trùng trên từng shard (như ReplacingMergeTree gộp part trên shard đó) gặp được cả hai bản. Chép một dòng lên mọi shard là việc của bản sao (replica), không phải của chia shard."
      en: "The sharding key is not random: the docs say the shard is the key's value modulo the number of shards, so the same `container_no` always gives the same shard. That way dropping duplicates on each shard (as ReplacingMergeTree does when merging parts there) sees both copies. Copying a row to every server is what replicas do, not sharding."
  - q:
      vi: "Báo cáo cũ lấy trung bình của trung bình từng shard và ra Tien Sa thấp hơn thật. Vì sao?"
      en: "The old report averaged each shard's average and showed Tien Sa lower than the truth. Why?"
    options:
      - { vi: "Bảng `ports` thiếu một cảng", en: "Table `ports` misses a port" }
      - { vi: "Dòng trùng chưa được bỏ", en: "Duplicates were not dropped" }
      - { vi: "Shard 0 đông hơn mà nặng như nhau", en: "Shard 0 is bigger but weighs the same" }
    answer: 2
    trap: 1
    why:
      vi: "Dòng gửi trùng chỉ chiếm 1 trên 50 dòng và rải đều, nên không kéo trung bình xuống nhiều như vậy; bảng `ports` cũng đủ ba cảng. Shard 0 giữ thêm 2.000 dòng giữ hàng ở hải quan, mỗi dòng 72 giờ; lấy trung bình của trung bình thì mỗi shard nặng như nhau, nên phần lưu bãi lâu đó bị tính nhẹ đi. Cộng tổng và cộng số đếm rồi mới chia thì mỗi dòng nặng như nhau."
      en: "Resent rows are only 1 in 50 and spread evenly, so they cannot pull the average down that far; table `ports` has all three ports too. Shard 0 holds 2,000 extra customs-hold rows of 72 hours each; averaging the averages gives every shard the same weight, so that long dwell counts too little. Adding the sums and the counts, then dividing, gives every row the same weight."
---
## Mở bài

Bảng cập bến của Cargo Query giờ nằm trên bốn shard, và báo cáo thời gian lưu bãi theo cảng cho ra con số khác với khi còn một máy. Bạn cần tìm hai lỗi: dòng gửi trùng chưa bỏ, và cách gộp kết quả từ các shard.

## Ý chính

Dữ liệu có ba điều cần biết. Hệ thống cảng gửi lại một số dòng với cùng `id`. Các container có `container_no` chia hết cho 4, tức nằm ở shard 0, có thêm 2.000 lần giữ hàng ở hải quan, mỗi lần 72 giờ. Và bảng tra `ports` nhỏ, đọc trong mọi câu.

Cách làm theo các bài trước: bỏ dòng trùng theo `id` (như ReplacingMergeTree trên từng shard; khóa `container_no` đưa hai bản về cùng shard), cho mỗi shard trả **tổng và số đếm**, rồi ở máy nhận câu cộng lại và chia một lần, sau đó mới nối với bảng tra cảng. Vì khóa giữ mỗi container trên một shard, số container khác nhau của cả cụm bằng tổng số đếm của từng shard.

## Cú pháp

```text
-- ClickHouse (read only)
SELECT port, avg(dwell_hours)
FROM arrivals_all
GROUP BY port;
```

```sql
SELECT DISTINCT ON (id)
  container_no % 4 AS shard,
  a.*
FROM arrivals a
ORDER BY id;
```

- `DISTINCT ON (id)`: một dòng mỗi `id`, như sau khi gộp part.
- Pha 1 trả `sum` và `count`; pha 2 cộng chúng rồi mới chia.

## Ví dụ

Cùng `id` luôn ở cùng shard: không `id` nào có hai giá trị shard.

```sql
SELECT count(*) AS split_ids
FROM (SELECT id FROM arrivals
  GROUP BY id
  HAVING count(DISTINCT
    container_no % 4) > 1) s;
```

Kết quả đúng khi mọi dòng (đã bỏ trùng) nằm trên một máy.

```sql
SELECT port,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM (SELECT DISTINCT ON (id) *
  FROM arrivals ORDER BY id) a
GROUP BY port
ORDER BY port;
```

## Lỗi hay gặp

Tính trung bình khi chưa bỏ dòng gửi trùng: các dòng trùng được tính hai lần.

```sql
-- WRONG: resent rows counted
SELECT count(*) AS row_count,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM arrivals;
```

```sql
-- FIX: one row per id
SELECT count(*) AS row_count,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM (SELECT DISTINCT ON (id) *
  FROM arrivals ORDER BY id) a;
```

Lấy trung bình của trung bình từng shard: shard 0 nhiều dòng hơn nhưng bị tính như các shard khác.

```sql
-- WRONG: average of averages
SELECT port,
  round(avg(a), 2) AS avg_dwell
FROM (SELECT container_no % 4
    AS shard, port,
    avg(dwell_hours) AS a
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

```sql
-- FIX: sums and counts
SELECT port,
  round(sum(s)::numeric
    / sum(n), 2) AS avg_dwell
FROM (SELECT container_no % 4
    AS shard, port,
    sum(dwell_hours) AS s,
    count(*) AS n
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

## Thực hành

Năm bước: đếm dòng gửi trùng, dựng `sharded` đã bỏ trùng, pha 1 trên từng shard, pha 2 kèm tên cảng, rồi cộng số container khác nhau từ các shard.

## Tóm tắt

- Bỏ dòng trùng trước khi gộp; cùng khóa chia shard thì hai bản về cùng shard.
- Shard trả tổng và số đếm; máy nhận câu cộng lại rồi chia một lần.
- Nối với bảng tra nhỏ sau khi đã gộp.
- Khóa giữ mỗi container trên một shard thì cộng được số đếm phân biệt.

# EN

## Opening

Cargo Query's arrivals table now sits on four shards, and the dwell-time report by port gives a different number than it did on one server. You need to find two faults: resent rows not dropped, and the way results from the shards are combined.

## Key idea

Three things matter in the data. The port system resent some rows with the same `id`. Containers whose `container_no` is divisible by 4, which sit on shard 0, have 2,000 extra customs holds of 72 hours each. And the lookup table `ports` is small and read in every query.

The approach from the earlier lessons: drop duplicates by `id` (as ReplacingMergeTree does on each shard; key `container_no` sends both copies to the same shard), have each shard return **sums and counts**, then on the receiving server add them up and divide once, and only then join the port lookup. Because the key keeps each container on one shard, the cluster's distinct containers equal the sum of each shard's count.

## Syntax

```text
-- ClickHouse (read only)
SELECT port, avg(dwell_hours)
FROM arrivals_all
GROUP BY port;
```

```sql
SELECT DISTINCT ON (id)
  container_no % 4 AS shard,
  a.*
FROM arrivals a
ORDER BY id;
```

- `DISTINCT ON (id)`: one row per `id`, as after a part merge.
- Phase 1 returns `sum` and `count`; phase 2 adds them, then divides.

## Example

The same `id` is always on the same shard: no `id` has two shard values.

```sql
SELECT count(*) AS split_ids
FROM (SELECT id FROM arrivals
  GROUP BY id
  HAVING count(DISTINCT
    container_no % 4) > 1) s;
```

The right result if every row (duplicates dropped) sat on one server.

```sql
SELECT port,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM (SELECT DISTINCT ON (id) *
  FROM arrivals ORDER BY id) a
GROUP BY port
ORDER BY port;
```

## Common mistakes

Averaging before dropping resent rows: the duplicates are counted twice.

```sql
-- WRONG: resent rows counted
SELECT count(*) AS row_count,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM arrivals;
```

```sql
-- FIX: one row per id
SELECT count(*) AS row_count,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM (SELECT DISTINCT ON (id) *
  FROM arrivals ORDER BY id) a;
```

Averaging each shard's average: shard 0 has more rows but weighs the same as the others.

```sql
-- WRONG: average of averages
SELECT port,
  round(avg(a), 2) AS avg_dwell
FROM (SELECT container_no % 4
    AS shard, port,
    avg(dwell_hours) AS a
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

```sql
-- FIX: sums and counts
SELECT port,
  round(sum(s)::numeric
    / sum(n), 2) AS avg_dwell
FROM (SELECT container_no % 4
    AS shard, port,
    sum(dwell_hours) AS s,
    count(*) AS n
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

## Practice

Five steps: count the resent rows, build the deduplicated `sharded`, phase 1 on each shard, phase 2 with port names, then add up distinct containers from the shards.

## Recap

- Drop duplicates before aggregating; with the same sharding key both copies land on one shard.
- Shards return sums and counts; the receiving server adds them and divides once.
- Join the small lookup table after aggregating.
- A key that keeps each container on one shard lets you add up distinct counts.
