---
id: e-ol-l5-01
engine: olap
level: L5
module: scale
title: "Bảng Distributed và chia shard"
title_en: "Distributed tables and sharding"
kind: lab
runtime: browser
minutes: 35
figures: [{ name: ol-shards, at: idea }]
objectives:
  - vi: Giải thích shard, bảng Distributed và khóa chia shard (sharding key) chọn shard cho mỗi dòng.
    en: Explain shards, the Distributed table and how the sharding key picks a shard for each row.
  - vi: Gộp hai pha như ClickHouse làm với `GROUP BY`; mỗi shard trả trạng thái trung gian, máy nhận câu gộp lần cuối.
    en: Aggregate in two phases as ClickHouse does for `GROUP BY`; each shard returns intermediate states, the receiving server does the final step.
  - vi: Tránh lấy trung bình của các trung bình, và chọn khóa chia shard để đếm phân biệt không bị trùng.
    en: Avoid averaging averages, and choose a sharding key so distinct counts do not overlap.
requires: [e-ol-l3-01, e-ol-l2-01]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/special/distributed", title: "ClickHouse docs: Distributed table engine" }
  - { url: "https://clickhouse.com/docs/shards", title: "ClickHouse docs: Table parts, shards and replicas" }
  - { url: "https://www.postgresql.org/docs/18/functions-aggregate.html", title: "PostgreSQL 18 docs: Aggregate Functions" }
lab:
  setup: |
    CREATE TABLE arrivals (
      id int, container_no int,
      port text, teu int,
      dwell_hours int
    );
    INSERT INTO arrivals
    SELECT g, 1 + g % 900,
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + (g / 900) % 3],
      1 + g % 4, 10 + g % 20
    FROM generate_series(1, 9000) AS g;
    INSERT INTO arrivals
    SELECT 9000 + g, 3 * (1 + g % 300),
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + g % 3],
      2, 80
    FROM generate_series(1, 3000) AS g;
  steps:
    - task:
        vi: "Có 3 shard, khóa chia shard là `container_no`: dòng đi tới shard `container_no % 3`. Mỗi shard nhận bao nhiêu dòng? Trả `shard`, `row_count`."
        en: "There are 3 shards and the sharding key is `container_no`: a row goes to shard `container_no % 3`. How many rows does each shard get? Return `shard`, `row_count`."
      solution: |
        SELECT container_no % 3 AS shard,
          count(*) AS row_count
        FROM arrivals
        GROUP BY 1;
      check: rows
      hint:
        vi: "`container_no % 3 AS shard`, `count(*)` theo `shard`."
        en: "`container_no % 3 AS shard`, `count(*)` by `shard`."
    - task:
        vi: "Chia dữ liệu thật sự: dựng bảng `sharded` gồm cột `shard` (`container_no % 3`) và mọi cột của `arrivals`."
        en: "Actually split the data: build table `sharded` with a `shard` column (`container_no % 3`) and every column of `arrivals`."
      solution: |
        CREATE TABLE sharded AS
        SELECT container_no % 3 AS shard,
          a.*
        FROM arrivals a;
      after: SELECT shard, count(*) AS row_count, count(DISTINCT container_no) AS containers FROM sharded GROUP BY shard
      check: rows
      hint:
        vi: "`CREATE TABLE sharded AS SELECT container_no % 3 AS shard, a.* FROM arrivals a`."
        en: "`CREATE TABLE sharded AS SELECT container_no % 3 AS shard, a.* FROM arrivals a`."
    - task:
        vi: "Pha 1: mỗi shard trả trạng thái trung gian cho mỗi cảng: `shard`, `port`, `dwell_sum` (tổng `dwell_hours`), `n` (số dòng)."
        en: "Phase 1: each shard returns intermediate states per port: `shard`, `port`, `dwell_sum` (sum of `dwell_hours`), `n` (row count)."
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
    - task:
        vi: "Pha 2, ở máy nhận câu: gộp các trạng thái đó thành thời gian lưu bãi trung bình mỗi cảng, làm tròn 2 chữ số: `port`, `avg_dwell`."
        en: "Phase 2, on the receiving server: merge those states into the average dwell time per port, rounded to 2 decimals: `port`, `avg_dwell`."
      solution: |
        SELECT port,
          round(sum(dwell_sum)::numeric
            / sum(n), 2) AS avg_dwell
        FROM (SELECT shard, port,
            sum(dwell_hours) AS dwell_sum,
            count(*) AS n
          FROM sharded
          GROUP BY shard, port) p
        GROUP BY port;
      check: rows
      hint:
        vi: "Câu của bước 3 làm câu con, rồi `sum(dwell_sum) / sum(n)` theo `port`."
        en: "Step 3's query as a subquery, then `sum(dwell_sum) / sum(n)` by `port`."
    - task:
        vi: "Số container khác nhau trên cả cụm, cộng từ số đếm của từng shard: `containers`."
        en: "The number of distinct containers across the cluster, added up from each shard's count: `containers`."
      solution: |
        SELECT sum(c) AS containers
        FROM (SELECT shard,
            count(DISTINCT container_no)
              AS c
          FROM sharded
          GROUP BY shard) s;
      check: rows
      hint:
        vi: "Câu con `count(DISTINCT container_no)` theo `shard`, ngoài là `sum(c)`."
        en: "Subquery `count(DISTINCT container_no)` by `shard`, outside `sum(c)`."
quiz:
  - q:
      vi: "Bảng `arrivals_all` dùng `ENGINE = Distributed(cluster, db, arrivals, container_no)`. Bảng đó giữ dữ liệu gì?"
      en: "Table `arrivals_all` uses `ENGINE = Distributed(cluster, db, arrivals, container_no)`. What data does it hold?"
    options:
      - { vi: "Không giữ dữ liệu nào", en: "No data of its own" }
      - { vi: "Một bản đủ của mọi shard", en: "A full copy of every shard" }
      - { vi: "Chỉ các part mới nhất", en: "Only the newest parts" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe tự nhiên khi nghĩ bảng gộp giữ một bản đủ, nhưng tài liệu ghi bảng Distributed không giữ dữ liệu của riêng nó. Nó chỉ chuyển câu `SELECT` tới mọi shard và chuyển dòng chèn vào tới shard theo khóa chia shard, ở đây `container_no`. Các part nằm ở bảng `arrivals` trên từng shard."
      en: "It is natural to think the combined table keeps a full copy, but the docs say a Distributed table stores no data of its own. It only forwards `SELECT` queries to every shard and routes inserted rows to a shard by the sharding key, here `container_no`. The parts live in table `arrivals` on each shard."
  - q:
      vi: "Câu `SELECT port, avg(dwell_hours) … GROUP BY port` chạy qua bảng Distributed trên 3 shard. Mỗi shard gửi gì về máy nhận câu?"
      en: "Query `SELECT port, avg(dwell_hours) … GROUP BY port` runs through a Distributed table over 3 shards. What does each shard send to the receiving server?"
    options:
      - { vi: "Mọi dòng thô của nó", en: "All of its raw rows" }
      - { vi: "Trạng thái trung gian (tổng, đếm)", en: "Intermediate states (sum, count)" }
      - { vi: "Trung bình đã tính xong", en: "Its finished average" }
    answer: 1
    trap: 2
    why:
      vi: "Nếu mỗi shard gửi trung bình đã xong, máy nhận câu chỉ còn cách lấy trung bình của các trung bình, và kết quả sai khi các shard có số dòng khác nhau. Tài liệu ghi việc gộp bắt đầu trên các shard, rồi trạng thái trung gian của hàm gộp được gửi về để máy nhận câu gộp lần cuối; với `avg` đó là tổng và số đếm. Gửi mọi dòng thô sẽ bỏ phí lợi ích của việc gộp tại chỗ."
      en: "If each shard sent a finished average, the receiving server could only average the averages, which is wrong when the shards hold different row counts. The docs say aggregation starts on the shards, then the aggregate functions' intermediate states are sent back for the final aggregation; for `avg` that is a sum and a count. Sending every raw row would waste the point of aggregating in place."
  - q:
      vi: "Bạn muốn `count(DISTINCT container_no)` trên mỗi shard cộng lại ra đúng số của cả cụm. Chọn khóa chia shard nào?"
      en: "You want each shard's `count(DISTINCT container_no)` to add up to the cluster's true count. Which sharding key?"
    options:
      - { vi: "`rand()`, ngẫu nhiên", en: "`rand()`, random" }
      - { vi: "`port`, theo cảng", en: "`port`, by port" }
      - { vi: "`container_no`", en: "`container_no`" }
    answer: 2
    trap: 0
    why:
      vi: "`rand()` rải dòng của cùng một container sang nhiều shard, nên mỗi shard đều đếm container đó và tổng bị lớn hơn. Chia theo `port` cũng vậy khi một container ghé nhiều cảng. Tài liệu ghi chia theo một mã như `UserID` giữ dữ liệu của một người dùng trên một shard; chia theo `container_no` thì mỗi container chỉ nằm trên một shard, nên cộng các số đếm là đúng."
      en: "`rand()` spreads one container's rows over several shards, so every shard counts it and the total is too big. Sharding by `port` does the same when a container visits several ports. The docs say sharding by an id like `UserID` keeps one user's data on one shard; sharding by `container_no` puts each container on exactly one shard, so adding the counts is right."
---
## Mở bài

Bảng cập bến của Cargo Query đã vượt cỡ một máy, nên đội dữ liệu chia nó ra ba shard. Bài này làm lại trên PostgreSQL việc chia dòng, việc gộp hai pha mà ClickHouse dùng cho `GROUP BY`, và hai cái bẫy khi cộng kết quả từ các shard.

## Ý chính

Một **shard** giữ một phần dữ liệu của bảng và là một bảng ClickHouse bình thường, truy vấn riêng được. Theo tài liệu, chia shard dùng khi dữ liệu quá lớn cho một máy hoặc một máy quá chậm. **Bảng Distributed** không giữ dữ liệu của riêng nó: câu `SELECT` được gửi tới mọi shard, và dòng chèn vào được chuyển tới shard bằng **khóa chia shard** (sharding key): lấy giá trị khóa chia lấy dư cho số shard. `rand()` rải dòng ngẫu nhiên; một mã như `UserID` giữ dữ liệu của một người dùng trên một shard.

Với `GROUP BY`, tài liệu ghi việc gộp bắt đầu trên từng shard, rồi **trạng thái trung gian** của các hàm gộp được gửi về máy nhận câu để gộp lần cuối. Với `avg`, trạng thái là tổng và số đếm; lấy trung bình của các trung bình là sai khi các shard có số dòng khác nhau.

Bản sao (replica) là chuyện khác: mỗi shard có thể có nhiều bản sao trên nhiều máy để dữ liệu còn khi một máy hỏng, và việc sao chép cần thành phần Keeper.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE TABLE arrivals_all
AS arrivals
ENGINE = Distributed(
  cluster, db, arrivals,
  container_no);
```

```sql
SELECT port,
  sum(dwell_sum)::numeric / sum(n)
    AS avg_dwell
FROM (SELECT container_no % 3
    AS shard, port,
    sum(dwell_hours) AS dwell_sum,
    count(*) AS n
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port;
```

- Pha 1 (mỗi shard): tổng và số đếm theo nhóm.
- Pha 2 (máy nhận câu): cộng các tổng, cộng các số đếm, rồi mới chia.

## Ví dụ

Kết quả đúng nếu mọi dòng nằm trên một máy, để so với kết quả gộp hai pha.

```sql
SELECT port,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM arrivals
GROUP BY port
ORDER BY port;
```

Với khóa `container_no`, không container nào nằm trên hai shard.

```sql
SELECT count(*) AS split_containers
FROM (SELECT container_no
  FROM arrivals
  GROUP BY container_no
  HAVING count(DISTINCT
    container_no % 3) > 1) s;
```

## Lỗi hay gặp

Lấy trung bình của trung bình từng shard: shard 0 có thêm 3.000 dòng lưu bãi lâu, nên bị tính nhẹ đi.

```sql
-- WRONG: average of averages
SELECT port,
  round(avg(a), 2) AS avg_dwell
FROM (SELECT container_no % 3
    AS shard, port,
    avg(dwell_hours) AS a
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

```sql
-- FIX: merge sums and counts
SELECT port,
  round(sum(s)::numeric
    / sum(n), 2) AS avg_dwell
FROM (SELECT container_no % 3
    AS shard, port,
    sum(dwell_hours) AS s,
    count(*) AS n
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

Chia shard theo mã dòng (như `rand()`) rồi cộng số container đếm trên từng shard: một container nằm trên nhiều shard nên bị đếm nhiều lần.

```sql
-- WRONG: rows spread by id
SELECT sum(c) AS containers
FROM (SELECT id % 3 AS shard,
    count(DISTINCT container_no)
      AS c
  FROM arrivals
  GROUP BY 1) s;
```

```sql
-- FIX: shard by container_no
SELECT sum(c) AS containers
FROM (SELECT container_no % 3
    AS shard,
    count(DISTINCT container_no)
      AS c
  FROM arrivals
  GROUP BY 1) s;
```

## Thực hành

Năm bước: đếm dòng mỗi shard theo khóa `container_no`, dựng bảng `sharded`, pha 1 trả tổng và số đếm, pha 2 gộp thành trung bình mỗi cảng, rồi cộng số container khác nhau từ các shard.

## Tóm tắt

- Bảng Distributed không giữ dữ liệu; nó gửi `SELECT` tới mọi shard và chuyển dòng chèn theo khóa chia shard.
- Shard được chọn bằng giá trị khóa chia lấy dư cho số shard.
- `GROUP BY` gộp hai pha: shard gửi trạng thái trung gian, máy nhận câu gộp lần cuối.
- Không lấy trung bình của trung bình; chọn khóa để một thực thể nằm trên một shard.

# EN

## Opening

Cargo Query's arrivals table has outgrown one server, so the data team splits it over three shards. This lesson redoes on PostgreSQL how rows are split, the two-phase aggregation ClickHouse uses for `GROUP BY`, and two traps when adding up results from the shards.

## Key idea

A **shard** holds part of a table's data and is a regular ClickHouse table that can be queried on its own. According to the docs, sharding is for data too large for one server, or a server too slow for it. A **Distributed table** stores no data of its own: `SELECT` queries go to every shard, and inserted rows are routed by the **sharding key**: the key's value modulo the number of shards. `rand()` spreads rows randomly; an id like `UserID` keeps one user's data on one shard.

For `GROUP BY`, the docs say aggregation starts on each shard, then the aggregate functions' **intermediate states** are sent to the receiving server for the final aggregation. For `avg`, the state is a sum and a count; averaging the averages is wrong when the shards hold different row counts.

Replicas are a separate matter: each shard can have several replicas on several servers so data survives a failed server, and replication needs the Keeper component.

## Syntax

```text
-- ClickHouse (read only)
CREATE TABLE arrivals_all
AS arrivals
ENGINE = Distributed(
  cluster, db, arrivals,
  container_no);
```

```sql
SELECT port,
  sum(dwell_sum)::numeric / sum(n)
    AS avg_dwell
FROM (SELECT container_no % 3
    AS shard, port,
    sum(dwell_hours) AS dwell_sum,
    count(*) AS n
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port;
```

- Phase 1 (each shard): sum and count per group.
- Phase 2 (receiving server): add the sums, add the counts, then divide.

## Example

The right result if every row sat on one server, to compare with the two-phase result.

```sql
SELECT port,
  round(avg(dwell_hours), 2)
    AS avg_dwell
FROM arrivals
GROUP BY port
ORDER BY port;
```

With key `container_no`, no container sits on two shards.

```sql
SELECT count(*) AS split_containers
FROM (SELECT container_no
  FROM arrivals
  GROUP BY container_no
  HAVING count(DISTINCT
    container_no % 3) > 1) s;
```

## Common mistakes

Averaging each shard's average: shard 0 has 3,000 extra rows of long dwell, so it is weighted too lightly.

```sql
-- WRONG: average of averages
SELECT port,
  round(avg(a), 2) AS avg_dwell
FROM (SELECT container_no % 3
    AS shard, port,
    avg(dwell_hours) AS a
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

```sql
-- FIX: merge sums and counts
SELECT port,
  round(sum(s)::numeric
    / sum(n), 2) AS avg_dwell
FROM (SELECT container_no % 3
    AS shard, port,
    sum(dwell_hours) AS s,
    count(*) AS n
  FROM arrivals
  GROUP BY 1, 2) p
GROUP BY port
ORDER BY port;
```

Sharding by row id (like `rand()`) and then adding the containers counted on each shard: one container sits on several shards, so it is counted several times.

```sql
-- WRONG: rows spread by id
SELECT sum(c) AS containers
FROM (SELECT id % 3 AS shard,
    count(DISTINCT container_no)
      AS c
  FROM arrivals
  GROUP BY 1) s;
```

```sql
-- FIX: shard by container_no
SELECT sum(c) AS containers
FROM (SELECT container_no % 3
    AS shard,
    count(DISTINCT container_no)
      AS c
  FROM arrivals
  GROUP BY 1) s;
```

## Practice

Five steps: count the rows per shard with key `container_no`, build table `sharded`, phase 1 returns sums and counts, phase 2 merges them into an average per port, then add up the distinct containers from the shards.

## Recap

- A Distributed table holds no data; it sends `SELECT` to every shard and routes inserts by the sharding key.
- The shard is the sharding key's value modulo the number of shards.
- `GROUP BY` runs in two phases: shards send intermediate states, the receiving server finishes.
- Never average averages; pick a key that keeps one entity on one shard.
