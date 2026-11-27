---
id: e-ts-l1-04
engine: timeseries
level: L1
module: basics
title: Lấp khoảng trống bằng generate_series
title_en: Filling gaps with generate_series
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-gap-fill, at: idea }]
objectives:
  - vi: Dựng đủ mọi khung thời gian bằng `generate_series`, rồi `LEFT JOIN` số đo vào.
    en: Build every time bucket with `generate_series`, then `LEFT JOIN` the readings onto it.
  - vi: Đếm khung trống ra 0 bằng `count(r.ts)`, và giữ trung bình của khung trống là NULL.
    en: Count an empty bucket as 0 with `count(r.ts)`, and keep an empty bucket's average as NULL.
  - vi: Lấp khung trống bằng số đo gần nhất trước đó (giữ giá trị cuối, LOCF) với `LATERAL`.
    en: Fill an empty slot with the latest earlier reading (last observation carried forward, LOCF) with `LATERAL`.
requires: [e-ts-l1-03]
sources:
  - { url: https://www.postgresql.org/docs/18/functions-srf.html, title_vi: "Hàm trả về nhiều dòng (set returning)" }
  - { url: https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-LATERAL, title_vi: "Biểu thức bảng › truy vấn con LATERAL" }
lab:
  setup: |
    CREATE TABLE readings (
      ts timestamptz PRIMARY KEY,
      temp_c numeric(4,1) NOT NULL
    );
    INSERT INTO readings
    SELECT timestamptz '2026-10-30 00:00+00'
        + g * interval '10 minutes',
      -18 + (g % 5) / 2.0
    FROM generate_series(0, 143) g
    WHERE g NOT BETWEEN 50 AND 52
      AND g NOT BETWEEN 80 AND 91
      AND g <> 100;
  steps:
    - task:
        vi: "Cảm biến gửi một số đo mỗi 10 phút. Trong giờ 08:00–09:00 (UTC) ngày 30/10, những mốc 10 phút nào không có số đo? Trả `slot`, xếp tăng dần."
        en: "The sensor sends one reading every 10 minutes. Between 08:00 and 09:00 (UTC) on 30 Oct, which 10-minute slots have no reading? Return `slot`, sorted ascending."
      solution: |
        SELECT s.slot
        FROM generate_series(
            timestamptz '2026-10-30 08:00+00',
            timestamptz '2026-10-30 08:50+00',
            interval '10 minutes') AS s(slot)
        LEFT JOIN readings r ON r.ts = s.slot
        WHERE r.ts IS NULL
        ORDER BY s.slot
      check: rows
      ordered: true
      hint:
        vi: "Dựng các mốc bằng `generate_series(start, stop, interval '10 minutes')`, `LEFT JOIN` số đo, giữ dòng có `r.ts IS NULL`."
        en: "Build the slots with `generate_series(start, stop, interval '10 minutes')`, `LEFT JOIN` the readings, keep the rows where `r.ts IS NULL`."
    - task:
        vi: "Mỗi giờ từ 12:00 tới 16:00 (UTC, gồm cả giờ 16:00) có bao nhiêu số đo? Giờ không có số đo phải hiện 0. Trả `hour`, `readings`, xếp theo giờ."
        en: "How many readings does each hour from 12:00 to 16:00 (UTC, including the 16:00 hour) have? An hour with none must show 0. Return `hour`, `readings`, sorted by hour."
      solution: |
        SELECT h.hour,
          count(r.ts) AS readings
        FROM generate_series(
            timestamptz '2026-10-30 12:00+00',
            timestamptz '2026-10-30 16:00+00',
            interval '1 hour') AS h(hour)
        LEFT JOIN readings r
          ON r.ts >= h.hour
         AND r.ts < h.hour + interval '1 hour'
        GROUP BY h.hour
        ORDER BY h.hour
      check: rows
      ordered: true
      hint:
        vi: "`count(r.ts)` đếm số đo thật; `count(*)` đếm cả dòng NULL mà `LEFT JOIN` thêm vào cho giờ trống."
        en: "`count(r.ts)` counts real readings; `count(*)` also counts the NULL row that `LEFT JOIN` adds for an empty hour."
    - task:
        vi: "Màn hình cần một giá trị cho mọi mốc 10 phút từ 08:10 tới 08:50 (UTC). Mốc thiếu số đo thì hiện số đo gần nhất trước đó. Trả `slot`, `temp_c` (đã lấp), xếp theo `slot`."
        en: "The screen needs a value for every 10-minute slot from 08:10 to 08:50 (UTC). A slot without a reading shows the latest reading before it. Return `slot`, `temp_c` (filled), sorted by `slot`."
      solution: |
        SELECT s.slot, l.temp_c
        FROM generate_series(
            timestamptz '2026-10-30 08:10+00',
            timestamptz '2026-10-30 08:50+00',
            interval '10 minutes') AS s(slot)
        CROSS JOIN LATERAL (
          SELECT temp_c FROM readings x
          WHERE x.ts <= s.slot
          ORDER BY x.ts DESC
          LIMIT 1) l
        ORDER BY s.slot
      check: rows
      ordered: true
      hint:
        vi: "Với mỗi mốc, `LATERAL` chạy một câu con: số đo có `ts <= s.slot`, sắp giảm dần, lấy một dòng."
        en: "For each slot, `LATERAL` runs a subquery: readings with `ts <= s.slot`, sorted descending, one row."
quiz:
  - q:
      vi: "Sau `LEFT JOIN` từ chuỗi giờ sang số đo, một giờ không có số đo nào. `count(*)` trả bao nhiêu cho giờ đó?"
      en: "After a `LEFT JOIN` from the hour series to the readings, one hour has no reading. What does `count(*)` return for that hour?"
    options:
      - { vi: "0, vì giờ đó không có số đo", en: "0, because the hour has no reading" }
      - { vi: "NULL, vì không có gì để đếm", en: "NULL, because there is nothing to count" }
      - { vi: "1, vì vẫn còn một dòng của giờ đó", en: "1, because the hour still has one row" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe như giờ trống phải ra 0, nhưng `LEFT JOIN` giữ giờ đó bằng một dòng, với mọi cột của `readings` là NULL. `count(*)` đếm dòng, nên ra 1. `count(r.ts)` chỉ đếm giá trị khác NULL, nên ra 0, đúng con số cần báo. Hàm đếm không bao giờ trả NULL; chỉ `sum`, `avg` mới ra NULL khi không có giá trị."
      en: "It sounds like an empty hour must give 0, but `LEFT JOIN` keeps that hour as one row, with every `readings` column NULL. `count(*)` counts rows, so it returns 1. `count(r.ts)` counts only non-NULL values, so it returns 0, the number you want to report. A count never returns NULL; only `sum` and `avg` return NULL when there are no values."
  - q:
      vi: "Giờ 14:00 không có số đo nào. Báo cáo nhiệt độ trung bình nên ghi gì cho giờ đó?"
      en: "The 14:00 hour has no reading at all. What should the average temperature report show for that hour?"
    options:
      - { vi: "NULL, hoặc ghi rõ là không có dữ liệu", en: "NULL, or say clearly that there is no data" }
      - { vi: "0 °C, để bảng không có ô trống", en: "0 °C, so the table has no empty cell" }
      - { vi: "Trung bình của cả ngày", en: "The average of the whole day" }
    answer: 0
    trap: 1
    why:
      vi: "Điền 0 làm bảng gọn, nhưng 0 °C là một nhiệt độ thật: với container lạnh giữ -18 °C, nó đọc như sự cố rã đông, trong khi thật ra chỉ là mất tín hiệu. Lấy trung bình cả ngày cũng là bịa một số đo không có. Để NULL (hoặc ghi \"không có dữ liệu\") giữ đúng sự thật; nếu màn hình cần một số, hãy lấp bằng số đo gần nhất và nói rõ đó là giá trị lấp."
      en: "Filling 0 keeps the table tidy, but 0 °C is a real temperature: for a reefer held at -18 °C it reads like a thaw, when the truth is a lost signal. Using the whole day's average also invents a reading that does not exist. Leaving NULL (or saying \"no data\") keeps the truth; if a screen needs a number, fill it with the latest reading and say that it is filled."
---
## Mở bài

Cảm biến container lạnh gửi một số đo mỗi 10 phút, nhưng sóng ở bãi cảng không ổn định. `GROUP BY` chỉ trả những khung có dữ liệu, nên khung mất tín hiệu biến mất khỏi báo cáo thay vì hiện ra là trống.

## Ý chính

**Dựng khung trước, nối số đo sau.** `generate_series(start, stop, step)` sinh ra mọi mốc thời gian, kể cả mốc không có số đo. `LEFT JOIN` số đo vào chuỗi đó: mốc có số đo được ghép, mốc không có vẫn còn một dòng với cột của `readings` là NULL.

**Đếm và trung bình của khung trống.** `count(r.ts)` bỏ qua NULL nên cho 0; `count(*)` đếm dòng nên cho 1. `avg(r.temp_c)` của khung trống là NULL, và nên giữ NULL: điền 0 °C là bịa ra một nhiệt độ.

**Giữ giá trị cuối (LOCF).** Khi màn hình cần một số cho mọi mốc, có thể lấy số đo gần nhất trước mốc đó. `CROSS JOIN LATERAL` cho phép câu con nhìn thấy mốc `s.slot` của từng dòng: "số đo có `ts <= s.slot`, mới nhất". Khóa chính trên `ts` giúp mỗi lần tìm chỉ đọc một dòng của index.

Hình cuối mục cho thấy ba mốc mất tín hiệu được giữ lại và lấp bằng số trước đó.

## Cú pháp

```sql
-- every slot, then the readings
FROM generate_series(
    timestamptz '2026-10-30 08:00+00',
    timestamptz '2026-10-30 08:50+00',
    interval '10 minutes') AS s(slot)
LEFT JOIN readings r ON r.ts = s.slot
-- count real readings only
count(r.ts)
-- carry the last value forward
CROSS JOIN LATERAL (
  SELECT temp_c FROM readings x
  WHERE x.ts <= s.slot
  ORDER BY x.ts DESC LIMIT 1) l
```

- Đầu và cuối của `generate_series` đều được lấy.
- Với khung một giờ, nối bằng khoảng: `r.ts >= h.hour AND r.ts < h.hour + interval '1 hour'`.

## Ví dụ

`GROUP BY` một mình làm mất giờ 14:00:

```sql
SELECT date_trunc('hour', ts) AS hour,
  count(*) AS readings
FROM readings
WHERE ts >= '2026-10-30 12:00+00'
  AND ts < '2026-10-30 17:00+00'
GROUP BY 1 ORDER BY 1;
```

Số đo thật và số đã lấp, cạnh nhau:

```sql
SELECT s.slot, r.temp_c AS measured,
  l.temp_c AS filled
FROM generate_series(
    timestamptz '2026-10-30 08:10+00',
    timestamptz '2026-10-30 08:50+00',
    interval '10 minutes') AS s(slot)
LEFT JOIN readings r ON r.ts = s.slot
CROSS JOIN LATERAL (
  SELECT temp_c FROM readings x
  WHERE x.ts <= s.slot
  ORDER BY x.ts DESC LIMIT 1) l
ORDER BY s.slot;
```

## Lỗi hay gặp

`count(*)` đếm cả dòng NULL của giờ trống, nên giờ 14:00 ra 1:

```sql
-- WRONG: the empty hour shows 1
SELECT h.hour, count(*) AS readings
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: count the readings
SELECT h.hour, count(r.ts) AS readings
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

Điền 0 cho trung bình của giờ trống: 0 °C trông như container đang rã đông.

```sql
-- WRONG: 0 °C is a made-up reading
SELECT h.hour, coalesce(
    round(avg(r.temp_c), 2), 0) AS avg_c
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: no reading, no average
SELECT h.hour,
  round(avg(r.temp_c), 2) AS avg_c
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

## Thực hành

Ba câu: tìm mốc thiếu số đo, đếm số đo mỗi giờ kể cả giờ trống, và lấp mốc trống bằng số đo gần nhất.

## Tóm tắt

- `GROUP BY` chỉ trả khung có dữ liệu; khung trống biến mất.
- Dựng mọi khung bằng `generate_series`, rồi `LEFT JOIN` số đo vào.
- Đếm bằng `count(r.ts)`; trung bình của khung trống là NULL, đừng điền 0.
- Lấp bằng số đo gần nhất với `CROSS JOIN LATERAL`, và nói rõ đó là giá trị lấp.

# EN

## Opening

The reefer sensors send one reading every 10 minutes, but radio coverage in the yard is patchy. `GROUP BY` only returns buckets that have data, so a bucket with a lost signal disappears from the report instead of showing up as empty.

## Key idea

**Build the buckets first, join the readings after.** `generate_series(start, stop, step)` produces every moment, including moments with no reading. `LEFT JOIN` the readings onto that series: a moment with a reading is matched, a moment without one still keeps a row whose `readings` columns are NULL.

**Count and average of an empty bucket.** `count(r.ts)` skips NULL, so it gives 0; `count(*)` counts rows, so it gives 1. `avg(r.temp_c)` of an empty bucket is NULL, and it should stay NULL: filling 0 °C invents a temperature.

**Carry the last value forward (LOCF).** When a screen needs a number for every slot, it can take the latest reading before that slot. `CROSS JOIN LATERAL` lets the subquery see each row's slot `s.slot`: "readings with `ts <= s.slot`, newest first". The primary key on `ts` lets each lookup read a single index entry.

The figure at the end of this section shows three slots with a lost signal kept and filled with the reading before them.

## Syntax

```sql
-- every slot, then the readings
FROM generate_series(
    timestamptz '2026-10-30 08:00+00',
    timestamptz '2026-10-30 08:50+00',
    interval '10 minutes') AS s(slot)
LEFT JOIN readings r ON r.ts = s.slot
-- count real readings only
count(r.ts)
-- carry the last value forward
CROSS JOIN LATERAL (
  SELECT temp_c FROM readings x
  WHERE x.ts <= s.slot
  ORDER BY x.ts DESC LIMIT 1) l
```

- Both the start and the end of `generate_series` are included.
- For one-hour buckets, join on a range: `r.ts >= h.hour AND r.ts < h.hour + interval '1 hour'`.

## Example

`GROUP BY` on its own loses the 14:00 hour:

```sql
SELECT date_trunc('hour', ts) AS hour,
  count(*) AS readings
FROM readings
WHERE ts >= '2026-10-30 12:00+00'
  AND ts < '2026-10-30 17:00+00'
GROUP BY 1 ORDER BY 1;
```

Measured and filled values side by side:

```sql
SELECT s.slot, r.temp_c AS measured,
  l.temp_c AS filled
FROM generate_series(
    timestamptz '2026-10-30 08:10+00',
    timestamptz '2026-10-30 08:50+00',
    interval '10 minutes') AS s(slot)
LEFT JOIN readings r ON r.ts = s.slot
CROSS JOIN LATERAL (
  SELECT temp_c FROM readings x
  WHERE x.ts <= s.slot
  ORDER BY x.ts DESC LIMIT 1) l
ORDER BY s.slot;
```

## Common mistakes

`count(*)` also counts the NULL row of the empty hour, so 14:00 shows 1:

```sql
-- WRONG: the empty hour shows 1
SELECT h.hour, count(*) AS readings
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: count the readings
SELECT h.hour, count(r.ts) AS readings
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

Filling 0 for the empty hour's average: 0 °C looks like a reefer thawing.

```sql
-- WRONG: 0 °C is a made-up reading
SELECT h.hour, coalesce(
    round(avg(r.temp_c), 2), 0) AS avg_c
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: no reading, no average
SELECT h.hour,
  round(avg(r.temp_c), 2) AS avg_c
FROM generate_series(
    timestamptz '2026-10-30 13:00+00',
    timestamptz '2026-10-30 15:00+00',
    interval '1 hour') AS h(hour)
LEFT JOIN readings r
  ON r.ts >= h.hour
 AND r.ts < h.hour + interval '1 hour'
GROUP BY 1 ORDER BY 1;
```

## Practice

Three questions: find the slots missing a reading, count readings per hour including empty hours, and fill empty slots with the latest reading.

## Recap

- `GROUP BY` only returns buckets with data; empty buckets disappear.
- Build every bucket with `generate_series`, then `LEFT JOIN` the readings.
- Count with `count(r.ts)`; an empty bucket's average is NULL, do not fill 0.
- Fill with the latest reading through `CROSS JOIN LATERAL`, and say the value is filled.
