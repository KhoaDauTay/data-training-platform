---
id: e-ts-l3-04
engine: timeseries
level: L3
module: storage
title: "Bài tổng kết: canh container lạnh ở cảng Tiên Sa"
title_en: "Capstone: watching the reefers at Tien Sa port"
kind: capstone
runtime: browser
minutes: 35
figures: [{ name: ts-reefer-watch, at: idea }]
objectives:
  - vi: Ghép các kỹ năng của khóa vào một ca trực thật trên 28.570 số đo nhiệt độ của 10 container lạnh.
    en: Combine the course's skills in a real duty shift over 28,570 temperature readings from 10 reefers.
  - vi: Tìm container im lặng, số phút vượt ngưỡng và từng đợt vượt ngưỡng, với câu vừa đúng vừa nhanh.
    en: Find silent containers, minutes above the threshold and each excursion episode, with queries both right and fast.
  - vi: Dựng bảng tổng hợp theo giờ để báo cáo khỏi đọc lại số đo thô.
    en: Build an hourly rollup so reports no longer reread the raw readings.
requires: [e-ts-l3-03]
sources:
  - https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-LATERAL
  - https://www.postgresql.org/docs/18/functions-window.html
  - https://www.postgresql.org/docs/18/rules-materializedviews.html
lab:
  setup: |
    CREATE TABLE reefers (
      container_id text PRIMARY KEY,
      setpoint_c numeric(4,1) NOT NULL
    );
    INSERT INTO reefers
    SELECT 'CQRU' || (2000 + n),
      CASE WHEN n % 3 = 0 THEN 2
        ELSE -18 END
    FROM generate_series(1, 10) n;
    CREATE TABLE reefer_temps (
      container_id text NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL,
      PRIMARY KEY (container_id, ts)
    );
    INSERT INTO reefer_temps
    SELECT r.container_id,
      timestamptz '2026-10-29 00:00+00'
        + m * interval '1 minute',
      r.setpoint_c + ((m + n) % 5 - 2) / 2.0
        + CASE WHEN n = 4 AND (m BETWEEN 2280
            AND 2319 OR m BETWEEN 2400
            AND 2409) THEN 5 ELSE 0 END
    FROM generate_series(1, 10) n
    JOIN reefers r
      ON r.container_id = 'CQRU' || (2000 + n),
      generate_series(0, 2879) m
    WHERE NOT (n = 9 AND m >= 2650);
    ANALYZE reefers;
    ANALYZE reefer_temps;
  steps:
    - name: { vi: "Màn hình trực", en: "The duty screen" }
      task:
        vi: "Số đo mới nhất của từng container trong `reefers`: trả `container_id`, `ts`, `temp_c`. Bài chấm cả tốc độ: câu phải đi qua index `reefer_temps_pkey`, không đọc cả bảng `reefer_temps`."
        en: "The newest reading of each container in `reefers`: return `container_id`, `ts`, `temp_c`. Speed is graded too: the query must go through the index `reefer_temps_pkey`, not read the whole `reefer_temps` table."
      solution: |
        SELECT r.container_id, t.ts, t.temp_c
        FROM reefers r
        CROSS JOIN LATERAL (
          SELECT ts, temp_c
          FROM reefer_temps x
          WHERE x.container_id
            = r.container_id
          ORDER BY x.ts DESC
          LIMIT 1) t
      check: rows
      perf: { table: reefer_temps }
      slow: |
        SELECT DISTINCT ON (container_id)
          container_id, ts, temp_c
        FROM reefer_temps
        ORDER BY container_id, ts DESC
      hint:
        vi: "Đi từ `reefers`, mỗi container một câu con `LATERAL` với `ORDER BY x.ts DESC LIMIT 1`, như bài giá trị mới nhất."
        en: "Start from `reefers`, one `LATERAL` subquery per container with `ORDER BY x.ts DESC LIMIT 1`, as in the latest-value lesson."
    - name: { vi: "Container im lặng", en: "Silent containers" }
      task:
        vi: "Lúc 00:00 (UTC) ngày 31/10, container nào không gửi gì từ 23:30 trở đi? Trả `container_id`, `last_ts`."
        en: "At 00:00 (UTC) on 31 Oct, which containers have sent nothing since 23:30? Return `container_id`, `last_ts`."
      solution: |
        SELECT r.container_id,
          t.ts AS last_ts
        FROM reefers r
        CROSS JOIN LATERAL (
          SELECT ts FROM reefer_temps x
          WHERE x.container_id
            = r.container_id
          ORDER BY x.ts DESC
          LIMIT 1) t
        WHERE t.ts < '2026-10-30 23:30+00'
      check: rows
      hint:
        vi: "Lấy giờ mới nhất của mỗi container như câu trước, rồi lọc `t.ts < '2026-10-30 23:30+00'`."
        en: "Take each container's newest time as in the previous step, then filter `t.ts < '2026-10-30 23:30+00'`."
    - name: { vi: "Phút vượt ngưỡng", en: "Minutes above the limit" }
      task:
        vi: "Trong ngày 30/10 (UTC), mỗi container có bao nhiêu phút nhiệt độ cao hơn mức đặt (`setpoint_c`) quá 3 °C? Chỉ trả container có ít nhất một phút như vậy: `container_id`, `minutes`."
        en: "On 30 Oct (UTC), how many minutes was each container more than 3 °C above its setpoint (`setpoint_c`)? Return only containers with at least one such minute: `container_id`, `minutes`."
      solution: |
        SELECT t.container_id,
          count(*) AS minutes
        FROM reefer_temps t
        JOIN reefers r USING (container_id)
        WHERE t.ts >= '2026-10-30 00:00+00'
          AND t.ts < '2026-10-31 00:00+00'
          AND t.temp_c > r.setpoint_c + 3
        GROUP BY t.container_id
      check: rows
      hint:
        vi: "Nối `reefers` để có `setpoint_c`, lọc `t.temp_c > r.setpoint_c + 3` trong ngày, rồi đếm theo container."
        en: "Join `reefers` to get `setpoint_c`, filter `t.temp_c > r.setpoint_c + 3` within the day, then count per container."
    - name: { vi: "Từng đợt", en: "Each episode" }
      task:
        vi: "Gom các phút vượt ngưỡng liên tiếp (mỗi phút một số đo) thành từng đợt. Trả `container_id`, `started`, `ended`, `minutes`, xếp theo `container_id`, `started`."
        en: "Merge consecutive minutes above the limit (one reading a minute) into episodes. Return `container_id`, `started`, `ended`, `minutes`, sorted by `container_id`, `started`."
      solution: |
        SELECT container_id,
          min(ts) AS started,
          max(ts) AS ended,
          count(*) AS minutes
        FROM (
          SELECT t.container_id, t.ts,
            t.ts - row_number() OVER (
                PARTITION BY t.container_id
                ORDER BY t.ts)
              * interval '1 minute' AS grp
          FROM reefer_temps t
          JOIN reefers r USING (container_id)
          WHERE t.temp_c > r.setpoint_c + 3) x
        GROUP BY container_id, grp
        ORDER BY container_id, started
      check: rows
      ordered: true
      hint:
        vi: "Trong các dòng vượt ngưỡng, `ts - row_number() OVER (PARTITION BY container_id ORDER BY ts) * interval '1 minute'` giữ nguyên trong một đợt."
        en: "Among the rows above the limit, `ts - row_number() OVER (PARTITION BY container_id ORDER BY ts) * interval '1 minute'` stays the same within one episode."
    - name: { vi: "Bảng theo giờ", en: "The hourly table" }
      task:
        vi: "Tạo materialized view `reefer_hourly`: mỗi container mỗi giờ (UTC) một dòng với `container_id`, `hour`, `readings` (số số đo), `sum_c` (tổng nhiệt độ), `max_c` (nhiệt độ cao nhất)."
        en: "Create the materialized view `reefer_hourly`: one row per container per hour (UTC) with `container_id`, `hour`, `readings` (the number of readings), `sum_c` (the sum of temperatures), `max_c` (the highest temperature)."
      solution: |
        CREATE MATERIALIZED VIEW reefer_hourly AS
        SELECT container_id,
          date_trunc('hour', ts) AS hour,
          count(*) AS readings,
          sum(temp_c) AS sum_c,
          max(temp_c) AS max_c
        FROM reefer_temps
        GROUP BY 1, 2
      check: rows
      after: |
        SELECT container_id,
          count(*) AS hours,
          sum(readings) AS readings,
          sum(sum_c) AS sum_c,
          max(max_c) AS max_c
        FROM reefer_hourly
        GROUP BY container_id
        ORDER BY container_id
      hint:
        vi: "`CREATE MATERIALIZED VIEW reefer_hourly AS SELECT container_id, date_trunc('hour', ts) AS hour, count(*) AS readings, sum(temp_c) AS sum_c, max(temp_c) AS max_c FROM reefer_temps GROUP BY 1, 2`."
        en: "`CREATE MATERIALIZED VIEW reefer_hourly AS SELECT container_id, date_trunc('hour', ts) AS hour, count(*) AS readings, sum(temp_c) AS sum_c, max(temp_c) AS max_c FROM reefer_temps GROUP BY 1, 2`."
quiz:
  - q:
      vi: "`CQRU2004` vượt ngưỡng 50 phút trong ngày 30/10. Báo cáo cho khách nên nói gì?"
      en: "`CQRU2004` was above the limit for 50 minutes on 30 Oct. What should the report to the customer say?"
    options:
      - { vi: "Một sự cố kéo dài 50 phút", en: "One incident lasting 50 minutes" }
      - { vi: "Hai đợt: 40 phút từ 14:00 và 10 phút từ 16:00", en: "Two episodes: 40 minutes from 14:00 and 10 minutes from 16:00" }
      - { vi: "50 cảnh báo, mỗi phút một cảnh báo", en: "50 alerts, one per minute" }
    answer: 1
    trap: 0
    why:
      vi: "Con số 50 phút đúng, nên dễ gộp thành một sự cố, nhưng đó là tổng của hai đợt cách nhau 80 phút: 14:00–14:39 (40 phút) và 16:00–16:09 (10 phút). Hai đợt nghĩa là máy lạnh hồi lại rồi hỏng lần nữa, điều khách cần biết để kiểm hàng. Cách đảo và khoảng trống tách được hai đợt vì `ts` trừ `row_number()` nhân 1 phút đổi giá trị khi có khoảng trống. Báo 50 cảnh báo lẻ thì người đọc không thấy được hình dạng của sự cố."
      en: "The 50 minutes are right, so it is tempting to call it one incident, but they are the sum of two episodes 80 minutes apart: 14:00–14:39 (40 minutes) and 16:00–16:09 (10 minutes). Two episodes mean the cooling recovered and then failed again, which the customer needs to know to inspect the cargo. Gaps and islands separates them because `ts` minus `row_number()` times 1 minute changes value at a gap. Fifty single alerts would hide the shape of the incident."
  - q:
      vi: "Báo cáo tuần chỉ cần nhiệt độ trung bình mỗi giờ. Vì sao `reefer_hourly` lưu `sum_c` và `readings` thay vì `avg_c`?"
      en: "The weekly report only needs the hourly average temperature. Why does `reefer_hourly` store `sum_c` and `readings` instead of `avg_c`?"
    options:
      - { vi: "Để gộp tiếp lên ngày, tuần mà trung bình vẫn đúng", en: "So it can roll up to days and weeks with a right average" }
      - { vi: "Vì `avg` không chạy được trong materialized view", en: "Because `avg` cannot run inside a materialized view" }
      - { vi: "Để bảng nhỏ hơn", en: "To make the table smaller" }
    answer: 0
    trap: 1
    why:
      vi: "`avg` chạy bình thường trong materialized view, nên đó không phải lý do; hai cột cũng không làm bảng nhỏ hơn một cột. Lý do là gộp tiếp: `CQRU2009` mất tín hiệu lúc 20:10 ngày 30/10, nên giờ 20:00 của nó chỉ có 10 số đo thay vì 60, và trung bình của các trung bình giờ sẽ tính giờ 10 số đo nặng như giờ 60 số đo. Với `sum(sum_c) / sum(readings)`, trung bình ngày hay tuần luôn bằng trung bình của số đo thô."
      en: "`avg` runs fine inside a materialized view, so that is not the reason; two columns do not make the table smaller than one either. The reason is rolling up further: `CQRU2009` lost its signal at 20:10 on 30 Oct, so its 20:00 hour holds only 10 readings instead of 60, and an average of hourly averages would weigh that 10-reading hour as much as a 60-reading one. With `sum(sum_c) / sum(readings)`, the daily or weekly average always equals the average of the raw readings."
---
## Mở bài

Cảng Tiên Sa có 10 container lạnh trên bãi, mỗi cái gửi nhiệt độ mỗi phút: 28.570 số đo trong hai ngày. Ca trực của bạn bắt đầu lúc 00:00 (UTC) ngày 31/10, và trưởng ca cần năm câu trả lời trước khi bàn giao.

## Ý chính

**Bối cảnh.** Bảng `reefers` giữ mức nhiệt đặt của từng container: hàng đông -18 °C, hàng mát 2 °C. Bảng `reefer_temps` có khóa chính `(container_id, ts)`, nên mọi câu "theo từng container, theo thời gian" đi qua được index. Ngưỡng cảnh báo là cao hơn mức đặt quá 3 °C, tính theo từng container chứ không theo một con số chung.

**Năm việc, năm kỹ năng.** Màn hình trực cần số mới nhất của từng container (`LATERAL` + index, bài `e-ts-l1-05`). Container im lặng là container có số mới nhất quá cũ. Phút vượt ngưỡng là một phép nối với `reefers` rồi đếm. Từng đợt dùng đảo và khoảng trống (bài `e-ts-l2-04`). Bảng theo giờ là một materialized view lưu tổng và số đếm (bài `e-ts-l3-01`).

**Đúng và nhanh.** Bước đầu chấm cả tốc độ: `DISTINCT ON` cho đúng dòng nhưng phải đọc và sắp cả 28.570 dòng, còn `LATERAL` chỉ đọc 10 mục index.

Hình cuối mục cho thấy ca trực đọc cùng một bảng số đo theo ba cách: màn hình, container im lặng và các đợt vượt ngưỡng.

## Cú pháp

```sql
-- the newest row per container
CROSS JOIN LATERAL (
  SELECT ts, temp_c
  FROM reefer_temps x
  WHERE x.container_id
    = r.container_id
  ORDER BY x.ts DESC LIMIT 1) t
-- a per-container threshold
WHERE t.temp_c > r.setpoint_c + 3
-- one key per episode
t.ts - row_number() OVER (
    PARTITION BY t.container_id
    ORDER BY t.ts)
  * interval '1 minute'
```

- Ngưỡng theo container nằm trong bảng `reefers`, nối vào bằng `USING (container_id)`.
- Bảng theo giờ lưu `sum_c` và `readings` để gộp tiếp cho đúng.

## Ví dụ

Mức nhiệt đặt và số container mỗi mức:

```sql
SELECT setpoint_c,
  count(*) AS containers
FROM reefers
GROUP BY setpoint_c
ORDER BY setpoint_c;
```

Nhiệt độ cao nhất mỗi giờ của `CQRU2004` quanh đợt đầu:

```sql
SELECT date_trunc('hour', ts) AS hour,
  max(temp_c) AS max_c
FROM reefer_temps
WHERE container_id = 'CQRU2004'
  AND ts >= '2026-10-30 12:00+00'
  AND ts < '2026-10-30 17:00+00'
GROUP BY 1 ORDER BY 1;
```

## Lỗi hay gặp

Một ngưỡng chung -15 °C cho mọi container: hàng mát đặt 2 °C lúc nào cũng "vượt ngưỡng".

```sql
-- WRONG: one limit for every cargo
SELECT count(DISTINCT container_id)
  AS alarmed
FROM reefer_temps
WHERE temp_c > -15
  AND ts >= '2026-10-30 00:00+00';
```

```sql
-- FIX: the limit follows the setpoint
SELECT count(DISTINCT t.container_id)
  AS alarmed
FROM reefer_temps t
JOIN reefers r USING (container_id)
WHERE t.temp_c > r.setpoint_c + 3
  AND t.ts >= '2026-10-30 00:00+00';
```

Đi từ bảng số đo để tìm container im lặng: container không gửi gì từ đầu sẽ không bao giờ hiện ra, và container nào cũng có số đo cũ trước 23:30.

```sql
-- WRONG: counts readings, not silence
SELECT count(DISTINCT container_id)
  AS silent
FROM reefer_temps
WHERE ts < '2026-10-30 23:30+00';
```

```sql
-- FIX: newest reading per container
SELECT count(*) AS silent
FROM reefers r
WHERE NOT EXISTS (
  SELECT FROM reefer_temps x
  WHERE x.container_id = r.container_id
    AND x.ts >= '2026-10-30 23:30+00');
```

## Thực hành

Năm bước: màn hình trực vừa đúng vừa nhanh, container im lặng, số phút vượt ngưỡng, từng đợt vượt ngưỡng, và bảng tổng hợp theo giờ. Sau đó là hai câu hỏi về cách báo cáo.

## Tóm tắt

- Số mới nhất của từng thiết bị: `LATERAL` + index `(container_id, ts)`.
- Ngưỡng theo từng thiết bị nằm trong bảng của nó, không phải một con số chung.
- Phút vượt ngưỡng cho biết tổng; đảo và khoảng trống cho biết từng đợt.
- Bảng theo giờ lưu tổng và số đếm để báo cáo ngày, tuần vẫn đúng.

# EN

## Opening

Tien Sa port has 10 reefers in the yard, each sending its temperature every minute: 28,570 readings over two days. Your duty shift starts at 00:00 (UTC) on 31 Oct, and the shift lead needs five answers before the handover.

## Key idea

**The setting.** Table `reefers` holds each container's setpoint: frozen cargo at -18 °C, chilled cargo at 2 °C. Table `reefer_temps` has the primary key `(container_id, ts)`, so every "per container, over time" query can go through the index. The alarm limit is more than 3 °C above the setpoint, per container rather than one shared number.

**Five jobs, five skills.** The duty screen needs each container's newest reading (`LATERAL` + index, lesson `e-ts-l1-05`). A silent container is one whose newest reading is too old. Minutes above the limit are a join with `reefers` and a count. Episodes use gaps and islands (lesson `e-ts-l2-04`). The hourly table is a materialized view that stores sums and counts (lesson `e-ts-l3-01`).

**Right and fast.** The first step grades speed too: `DISTINCT ON` gives the right rows but must read and sort all 28,570 rows, while `LATERAL` reads only 10 index entries.

The figure at the end of this section shows the shift reading one readings table three ways: the screen, the silent container and the episodes above the limit.

## Syntax

```sql
-- the newest row per container
CROSS JOIN LATERAL (
  SELECT ts, temp_c
  FROM reefer_temps x
  WHERE x.container_id
    = r.container_id
  ORDER BY x.ts DESC LIMIT 1) t
-- a per-container threshold
WHERE t.temp_c > r.setpoint_c + 3
-- one key per episode
t.ts - row_number() OVER (
    PARTITION BY t.container_id
    ORDER BY t.ts)
  * interval '1 minute'
```

- The per-container limit lives in table `reefers`, joined with `USING (container_id)`.
- The hourly table stores `sum_c` and `readings` so it rolls up correctly.

## Example

The setpoints and how many containers use each:

```sql
SELECT setpoint_c,
  count(*) AS containers
FROM reefers
GROUP BY setpoint_c
ORDER BY setpoint_c;
```

The highest temperature per hour of `CQRU2004` around the first episode:

```sql
SELECT date_trunc('hour', ts) AS hour,
  max(temp_c) AS max_c
FROM reefer_temps
WHERE container_id = 'CQRU2004'
  AND ts >= '2026-10-30 12:00+00'
  AND ts < '2026-10-30 17:00+00'
GROUP BY 1 ORDER BY 1;
```

## Common mistakes

One shared limit of -15 °C for every container: chilled cargo set to 2 °C is "above the limit" all the time.

```sql
-- WRONG: one limit for every cargo
SELECT count(DISTINCT container_id)
  AS alarmed
FROM reefer_temps
WHERE temp_c > -15
  AND ts >= '2026-10-30 00:00+00';
```

```sql
-- FIX: the limit follows the setpoint
SELECT count(DISTINCT t.container_id)
  AS alarmed
FROM reefer_temps t
JOIN reefers r USING (container_id)
WHERE t.temp_c > r.setpoint_c + 3
  AND t.ts >= '2026-10-30 00:00+00';
```

Starting from the readings to find silent containers: a container that never sent anything never shows up, and every container present has old readings too.

```sql
-- WRONG: counts readings, not silence
SELECT count(DISTINCT container_id)
  AS silent
FROM reefer_temps
WHERE ts < '2026-10-30 23:30+00';
```

```sql
-- FIX: newest reading per container
SELECT count(*) AS silent
FROM reefers r
WHERE NOT EXISTS (
  SELECT FROM reefer_temps x
  WHERE x.container_id = r.container_id
    AND x.ts >= '2026-10-30 23:30+00');
```

## Practice

Five steps: a duty screen that is both right and fast, silent containers, minutes above the limit, each episode above the limit, and the hourly rollup. Then two questions on how to report.

## Recap

- Each device's newest reading: `LATERAL` + an index on `(container_id, ts)`.
- A per-device limit lives in the device's own table, not one shared number.
- Minutes above the limit give the total; gaps and islands give each episode.
- The hourly table stores sums and counts so daily and weekly reports stay right.
