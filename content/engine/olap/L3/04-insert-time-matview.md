---
id: e-ol-l3-04
engine: olap
level: L3
module: clickhouse
title: "Matview khi chèn và AggregatingMergeTree"
title_en: "Insert-time matviews and AggregatingMergeTree"
kind: lab
runtime: browser
minutes: 35
figures: [{ name: ol-insert-mv, at: idea }]
objectives:
  - vi: Hiểu matview tăng dần (incremental) của ClickHouse là một trigger chạy trên khối dữ liệu vừa chèn, ghi vào bảng đích.
    en: Understand that a ClickHouse incremental matview is a trigger that runs on the block just inserted and writes to a target table.
  - vi: Dựng cùng ý trên PostgreSQL bằng một trigger mức câu lệnh có bảng chuyển tiếp (transition table).
    en: Build the same idea on PostgreSQL with a statement-level trigger and a transition table.
  - vi: Biết matview kiểu này không thấy dữ liệu có sẵn, nên phải nạp bù (backfill).
    en: Know that such a matview does not see existing data, so it has to be backfilled.
requires: [e-ol-l3-01, e-ol-l2-02]
sources:
  - { url: "https://clickhouse.com/docs/materialized-view/incremental-materialized-view", title: "ClickHouse docs: Incremental materialized view", title_vi: "Tài liệu ClickHouse: materialized view tăng dần" }
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree", title: "ClickHouse docs: AggregatingMergeTree", title_vi: "Tài liệu ClickHouse: AggregatingMergeTree" }
  - { url: "https://clickhouse.com/docs/best-practices/use-materialized-views", title: "ClickHouse docs: Use materialized views", title_vi: "Tài liệu ClickHouse: dùng materialized view" }
  - { url: "https://www.postgresql.org/docs/18/sql-createtrigger.html", title: "PostgreSQL 18 docs: CREATE TRIGGER", title_vi: "CREATE TRIGGER" }
lab:
  setup: |
    CREATE TABLE events (
      day date, port text, teu int
    );
    INSERT INTO events
    SELECT date '2026-10-01' + i % 31,
      (ARRAY['VNDAD','VNSGN'])[1 + i % 2],
      1 + i % 3
    FROM generate_series(1, 600) AS i;
    CREATE TABLE daily (
      day date, port text,
      moves int, teu int,
      PRIMARY KEY (day, port)
    );
    CREATE FUNCTION add_daily()
    RETURNS trigger LANGUAGE plpgsql
    AS $$
    BEGIN
      INSERT INTO daily
      SELECT day, port, count(*),
        sum(teu)
      FROM new_rows
      GROUP BY day, port
      ON CONFLICT (day, port) DO UPDATE
      SET moves = daily.moves
          + EXCLUDED.moves,
        teu = daily.teu + EXCLUDED.teu;
      RETURN NULL;
    END $$;
  steps:
    - task:
        vi: "Tạo trigger `events_daily`: sau mỗi câu `INSERT` vào `events`, gọi `add_daily()` với các dòng mới trong bảng chuyển tiếp `new_rows`."
        en: "Create trigger `events_daily`: after each `INSERT` statement on `events`, call `add_daily()` with the new rows in transition table `new_rows`."
      solution: |
        CREATE TRIGGER events_daily
        AFTER INSERT ON events
        REFERENCING NEW TABLE AS new_rows
        FOR EACH STATEMENT
        EXECUTE FUNCTION add_daily();
      check: catalog
      hint:
        vi: "`AFTER INSERT ON events REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION add_daily()`."
        en: "`AFTER INSERT ON events REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION add_daily()`."
    - task:
        vi: "Chèn một lô hai dòng vào `events`: ngày `2026-11-01`, cảng `VNDAD`, 2 TEU và 3 TEU."
        en: "Insert a batch of two rows into `events`: day `2026-11-01`, port `VNDAD`, 2 TEU and 3 TEU."
      solution: |
        INSERT INTO events VALUES
          ('2026-11-01', 'VNDAD', 2),
          ('2026-11-01', 'VNDAD', 3);
      after: SELECT day, port, moves, teu FROM daily
      check: rows
      hint:
        vi: "Một câu `INSERT INTO events VALUES (…), (…)`; trigger tự ghi vào `daily`."
        en: "One `INSERT INTO events VALUES (…), (…)`; the trigger writes into `daily` by itself."
    - task:
        vi: "`daily` chưa có dữ liệu tháng 10 đã có sẵn. Nạp bù: thêm vào `daily` tổng theo ngày và cảng của các dòng trước `2026-11-01`."
        en: "`daily` lacks the October data that was already there. Backfill: add to `daily` the totals by day and port of the rows before `2026-11-01`."
      solution: |
        INSERT INTO daily
        SELECT day, port, count(*),
          sum(teu)
        FROM events
        WHERE day < '2026-11-01'
        GROUP BY day, port;
      after: SELECT sum(moves) AS moves, sum(teu) AS teu FROM daily
      check: rows
      hint:
        vi: "`INSERT INTO daily SELECT day, port, count(*), sum(teu) FROM events WHERE day < '2026-11-01' GROUP BY day, port`."
        en: "`INSERT INTO daily SELECT day, port, count(*), sum(teu) FROM events WHERE day < '2026-11-01' GROUP BY day, port`."
    - task:
        vi: "Báo cáo từ bảng tổng, không quét `events`: TEU theo cảng, `port`, `teu`."
        en: "Report from the summary table, without scanning `events`: TEU by port, `port`, `teu`."
      solution: |
        SELECT port, sum(teu) AS teu
        FROM daily
        GROUP BY port;
      check: rows
      hint:
        vi: "`sum(teu)` trên `daily`, `GROUP BY port`."
        en: "`sum(teu)` on `daily`, `GROUP BY port`."
quiz:
  - q:
      vi: "Tạo matview tăng dần trên bảng `events` đã có 600 dòng, rồi chèn 2 dòng. Bảng đích có dữ liệu của bao nhiêu dòng?"
      en: "An incremental matview is created on table `events`, which already has 600 rows, then 2 rows are inserted. The target holds the data of how many rows?"
    options:
      - { vi: "602", en: "602" }
      - { vi: "2", en: "2" }
      - { vi: "600", en: "600" }
    answer: 1
    trap: 0
    why:
      vi: "602 là nếu matview đọc lại cả bảng như matview của PostgreSQL, nhưng tài liệu ClickHouse mô tả nó là trigger chỉ chạy trên khối dữ liệu vừa chèn. 600 dòng có sẵn không bao giờ đi qua nó, nên bảng đích chỉ có 2 dòng mới. Muốn có dữ liệu cũ thì phải tự chèn bù."
      en: "602 would be right if the matview reread the whole table, like a PostgreSQL matview, but the ClickHouse docs describe it as a trigger that runs only on the block just inserted. The 600 existing rows never pass through it, so the target has only the 2 new rows. To get the old data you have to backfill it yourself."
  - q:
      vi: "Bảng đích AggregatingMergeTree giữ `sumState(teu)`. Đọc tổng đúng bằng gì?"
      en: "An AggregatingMergeTree target holds `sumState(teu)`. What reads the right total?"
    options:
      - { vi: "`sum(teu)` như bảng thường", en: "`sum(teu)` like a normal table" }
      - { vi: "`sumMerge(teu)` với `GROUP BY`", en: "`sumMerge(teu)` with `GROUP BY`" }
      - { vi: "`SELECT teu` không gộp", en: "`SELECT teu` with no aggregate" }
    answer: 1
    trap: 0
    why:
      vi: "Cột đó không chứa số mà chứa trạng thái gộp dở (kiểu `AggregateFunction`), nên `sum` thường không dùng được. Tài liệu ghi: ghi bằng hàm có hậu tố `-State`, đọc bằng cùng hàm với hậu tố `-Merge` và `GROUP BY`, vì nhiều part chưa gộp có thể còn nhiều dòng cho một khóa. Đọc không gộp thì nhận các trạng thái rời, không phải tổng."
      en: "The column holds no number but a partial aggregate state (type `AggregateFunction`), so a plain `sum` does not work. The docs say: write with the `-State` suffix, read with the same function and the `-Merge` suffix plus `GROUP BY`, since unmerged parts may still hold several rows for one key. Reading with no aggregate returns loose states, not totals."
---
## Mở bài

Báo cáo TEU theo ngày ở L2 dùng matview làm mới theo lịch. ClickHouse làm khác: bảng tổng được cập nhật ngay lúc mỗi lô dữ liệu được chèn. Bài này dựng lại cơ chế đó trên PostgreSQL bằng một trigger.

## Ý chính

Matview **tăng dần** (incremental) của ClickHouse, theo tài liệu, chỉ là một trigger chạy câu lệnh trên khối dữ liệu vừa được chèn vào bảng nguồn; tên bảng nguồn trong câu được thay bằng khối đó, và kết quả được chèn vào một **bảng đích** riêng. Nó chỉ chạy khi có chèn vào bảng nguồn, nên dữ liệu có sẵn từ trước phải được nạp bù.

Bảng đích hay dùng **AggregatingMergeTree**: các dòng cùng khóa sắp xếp được thay bằng một dòng giữ **trạng thái gộp** (kiểu `AggregateFunction`). Ghi bằng hàm có hậu tố `-State` (`sumState`), đọc bằng hậu tố `-Merge` (`sumMerge`) với `GROUP BY`, vì part chưa gộp vẫn có thể giữ nhiều dòng cho một khóa.

PostgreSQL không có matview chạy khi chèn, nhưng có trigger **mức câu lệnh** với **bảng chuyển tiếp** `NEW TABLE`: hàm nhìn thấy đúng các dòng của câu `INSERT` vừa chạy, như khối chèn của ClickHouse. `ON CONFLICT … DO UPDATE` cộng dồn vào dòng đã có, thay cho bước gộp.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE TABLE daily (
  day Date, port String,
  teu AggregateFunction(
    sum, UInt32)
)
ENGINE = AggregatingMergeTree
ORDER BY (day, port);

CREATE MATERIALIZED VIEW daily_mv
TO daily AS
SELECT day, port,
  sumState(teu) AS teu
FROM events
GROUP BY day, port;

SELECT port, sumMerge(teu)
FROM daily GROUP BY port;
```

```sql
CREATE TRIGGER events_daily
AFTER INSERT ON events
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION add_daily();
```

- `REFERENCING NEW TABLE AS new_rows`: các dòng câu `INSERT` vừa thêm.
- `FOR EACH STATEMENT`: chạy một lần cho mỗi lô, không cho mỗi dòng.

## Ví dụ

Bảng tổng còn trống dù `events` đã có 600 dòng: chưa có lần chèn nào qua trigger.

```sql
SELECT (SELECT count(*) FROM events)
    AS event_rows,
  (SELECT count(*) FROM daily)
    AS daily_rows;
```

Gắn trigger, chèn một lô, rồi đọc bảng tổng: chỉ có lô mới.

```sql
CREATE TRIGGER ev_daily
AFTER INSERT ON events
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION add_daily();
INSERT INTO events VALUES
  ('2026-11-01', 'VNDAD', 2);
SELECT day, port, moves, teu
FROM daily;
```

## Lỗi hay gặp

Đọc bảng tổng như thể nó đã có mọi dòng: thiếu toàn bộ dữ liệu trước khi gắn trigger.

```sql
-- WRONG: the summary misses old rows
SELECT sum(moves) AS moves
FROM daily;
```

```sql
-- FIX: backfill the old rows first
INSERT INTO daily
SELECT day, port, count(*),
  sum(teu)
FROM events
WHERE day < '2026-11-01'
GROUP BY day, port;
SELECT sum(moves) AS moves
FROM daily;
```

Chèn thẳng vào bảng tổng một khóa đã có: PostgreSQL từ chối, vì không có bước gộp như AggregatingMergeTree. Hàm của trigger dùng `ON CONFLICT` cho việc đó.

```sql
-- ERROR 23505: duplicate key
INSERT INTO daily
VALUES ('2026-11-01', 'VNDAD', 1, 1);
```

## Thực hành

Bốn bước: gắn trigger, chèn một lô và thấy bảng tổng đổi, nạp bù dữ liệu tháng 10, rồi báo cáo từ bảng tổng.

## Tóm tắt

- Matview tăng dần của ClickHouse là trigger trên khối vừa chèn, ghi vào bảng đích.
- Nó không thấy dữ liệu có sẵn: phải nạp bù.
- AggregatingMergeTree giữ trạng thái gộp: ghi `-State`, đọc `-Merge` với `GROUP BY`.
- PostgreSQL: trigger mức câu lệnh với `NEW TABLE`, cộng dồn bằng `ON CONFLICT`.

# EN

## Opening

The daily TEU report in L2 used a matview refreshed on a schedule. ClickHouse does it differently: the summary table is updated the moment each batch of data is inserted. This lesson rebuilds that mechanism on PostgreSQL with a trigger.

## Key idea

A ClickHouse **incremental** matview, according to the docs, is just a trigger that runs a query on the block of data just inserted into the source table; the source table in the query is replaced by that block, and the result is inserted into a separate **target table**. It runs only on inserts into the source table, so data that was already there must be backfilled.

The target is often an **AggregatingMergeTree**: rows with the same sorting key are replaced by one row holding an **aggregate state** (type `AggregateFunction`). Write with the `-State` suffix (`sumState`), read with the `-Merge` suffix (`sumMerge`) and `GROUP BY`, since unmerged parts may still hold several rows for one key.

PostgreSQL has no matview that runs on insert, but it has **statement-level** triggers with a **transition table** `NEW TABLE`: the function sees exactly the rows of the `INSERT` that just ran, like ClickHouse's inserted block. `ON CONFLICT … DO UPDATE` adds into the existing row, in place of the merge step.

## Syntax

```text
-- ClickHouse (read only)
CREATE TABLE daily (
  day Date, port String,
  teu AggregateFunction(
    sum, UInt32)
)
ENGINE = AggregatingMergeTree
ORDER BY (day, port);

CREATE MATERIALIZED VIEW daily_mv
TO daily AS
SELECT day, port,
  sumState(teu) AS teu
FROM events
GROUP BY day, port;

SELECT port, sumMerge(teu)
FROM daily GROUP BY port;
```

```sql
CREATE TRIGGER events_daily
AFTER INSERT ON events
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION add_daily();
```

- `REFERENCING NEW TABLE AS new_rows`: the rows the `INSERT` just added.
- `FOR EACH STATEMENT`: runs once per batch, not once per row.

## Example

The summary table is still empty though `events` has 600 rows: no insert has gone through the trigger yet.

```sql
SELECT (SELECT count(*) FROM events)
    AS event_rows,
  (SELECT count(*) FROM daily)
    AS daily_rows;
```

Attach the trigger, insert a batch, then read the summary: only the new batch is there.

```sql
CREATE TRIGGER ev_daily
AFTER INSERT ON events
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION add_daily();
INSERT INTO events VALUES
  ('2026-11-01', 'VNDAD', 2);
SELECT day, port, moves, teu
FROM daily;
```

## Common mistakes

Reading the summary as if it held every row: all the data from before the trigger is missing.

```sql
-- WRONG: the summary misses old rows
SELECT sum(moves) AS moves
FROM daily;
```

```sql
-- FIX: backfill the old rows first
INSERT INTO daily
SELECT day, port, count(*),
  sum(teu)
FROM events
WHERE day < '2026-11-01'
GROUP BY day, port;
SELECT sum(moves) AS moves
FROM daily;
```

Inserting straight into the summary a key it already has: PostgreSQL refuses, since there is no merge step like AggregatingMergeTree's. The trigger's function uses `ON CONFLICT` for that.

```sql
-- ERROR 23505: duplicate key
INSERT INTO daily
VALUES ('2026-11-01', 'VNDAD', 1, 1);
```

## Practice

Four steps: attach the trigger, insert a batch and watch the summary change, backfill October, then report from the summary.

## Recap

- A ClickHouse incremental matview is a trigger on the block just inserted, writing to a target table.
- It does not see existing data: backfill it.
- AggregatingMergeTree keeps aggregate states: write `-State`, read `-Merge` with `GROUP BY`.
- PostgreSQL: a statement-level trigger with `NEW TABLE`, adding up with `ON CONFLICT`.
