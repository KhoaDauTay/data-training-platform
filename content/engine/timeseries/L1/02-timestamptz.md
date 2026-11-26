---
id: e-ts-l1-02
engine: timeseries
level: L1
module: basics
title: Thời điểm thật với timestamptz
title_en: Real instants with timestamptz
kind: lab
runtime: browser
minutes: 18
figures: [{ name: ts-instant-wallclock, at: idea }]
objectives:
  - vi: Lưu số đo bằng `timestamptz` và biết nó giữ một thời điểm thật, không giữ múi giờ.
    en: Store measurements as `timestamptz` and know it holds a real instant, not a time zone.
  - vi: Gom theo ngày giờ Việt Nam bằng `AT TIME ZONE` mà vẫn dùng được index trên cột thời gian.
    en: Group by the Vietnam calendar day with `AT TIME ZONE` and still let the time index work.
  - vi: Đổi giờ địa phương kiểu `timestamp` của hai cảng về một thời điểm chung trước khi so sánh.
    en: Turn two ports' local `timestamp` values into one shared instant before comparing them.
requires: [e-ts-l1-01]
sources:
  - https://www.postgresql.org/docs/18/datatype-datetime.html
  - https://www.postgresql.org/docs/18/functions-datetime.html
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This
lab:
  setup: |
    CREATE TABLE readings (
      id int PRIMARY KEY,
      sensor_id int NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL
    );
    INSERT INTO readings
    SELECT g, 1 + g % 3,
      timestamptz '2026-10-10 00:00+07'
        + g * interval '1 minute',
      -18 + (g % 7) / 2.0
    FROM generate_series(1, 30000) g;
    CREATE INDEX readings_ts ON readings (ts);
    ANALYZE readings;
    CREATE TABLE gate_log (
      event_id int PRIMARY KEY,
      port text NOT NULL,
      local_ts timestamp NOT NULL
    );
    INSERT INTO gate_log VALUES
      (1, 'VNDAD', '2026-10-30 08:10'),
      (2, 'SGSIN', '2026-10-30 08:40'),
      (3, 'VNDAD', '2026-10-30 08:50'),
      (4, 'SGSIN', '2026-10-30 09:20');
    CREATE TABLE ports (
      port text PRIMARY KEY,
      tz text NOT NULL
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Asia/Ho_Chi_Minh'),
      ('SGSIN', 'Asia/Singapore');
  steps:
    - task:
        vi: "Đếm số đo theo ngày giờ Việt Nam, từ ngày 20/10 tới hết ngày 22/10/2026: trả `day`, `readings`, xếp theo ngày tăng dần."
        en: "Count readings per Vietnam calendar day, from 20 Oct through 22 Oct 2026: return `day`, `readings`, sorted by day ascending."
      solution: |
        SELECT (ts AT TIME ZONE
            'Asia/Ho_Chi_Minh')::date AS day,
          count(*) AS readings
        FROM readings
        WHERE ts >= '2026-10-20 00:00+07'
          AND ts < '2026-10-23 00:00+07'
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "Lọc bằng hai mốc có `+07`, rồi nhóm theo `(ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`."
        en: "Filter with two bounds that carry `+07`, then group by `(ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`."
    - task:
        vi: "Ngày 25/10/2026 giờ Việt Nam có bao nhiêu số đo, nhiệt độ trung bình bao nhiêu (làm tròn 2 chữ số)? Trả `readings`, `avg_c`. Bài chấm cả tốc độ: đúng mà không dùng được index `readings_ts` là chưa đạt."
        en: "How many readings did 25 Oct 2026 (Vietnam time) have, and what was the average temperature (rounded to 2 decimals)? Return `readings`, `avg_c`. Speed is graded too: a right answer that cannot use the index `readings_ts` does not pass."
      solution: |
        SELECT count(*) AS readings,
          round(avg(temp_c), 2) AS avg_c
        FROM readings
        WHERE ts >= '2026-10-25 00:00+07'
          AND ts < '2026-10-26 00:00+07'
      check: rows
      perf: { table: readings }
      slow: |
        SELECT count(*) AS readings,
          round(avg(temp_c), 2) AS avg_c
        FROM readings
        WHERE (ts AT TIME ZONE
            'Asia/Ho_Chi_Minh')::date
          = '2026-10-25'
      hint:
        vi: "So thẳng cột `ts` với đầu ngày `'2026-10-25 00:00+07'` và đầu ngày hôm sau; đừng bọc `ts` trong phép đổi."
        en: "Compare the column `ts` itself with the start of the day `'2026-10-25 00:00+07'` and the start of the next day; do not wrap `ts` in a conversion."
    - task:
        vi: "Sổ cổng `gate_log` ghi giờ địa phương của từng cảng (kiểu `timestamp`), múi giờ nằm trong `ports`. Xếp các lượt theo thời điểm thật: trả `event_id`, `port`, `at_utc` (thời điểm thật), xếp theo `at_utc` tăng dần."
        en: "The gate book `gate_log` stores each port's local time (type `timestamp`); the time zones are in `ports`. Put the events in real order: return `event_id`, `port`, `at_utc` (the real instant), sorted by `at_utc` ascending."
      solution: |
        SELECT g.event_id, g.port,
          g.local_ts AT TIME ZONE p.tz
            AS at_utc
        FROM gate_log g
        JOIN ports p USING (port)
        ORDER BY at_utc
      check: rows
      ordered: true
      hint:
        vi: "`local_ts AT TIME ZONE p.tz` đọc giờ địa phương trong múi `p.tz` và trả một `timestamptz`."
        en: "`local_ts AT TIME ZONE p.tz` reads the local time in zone `p.tz` and returns a `timestamptz`."
quiz:
  - q:
      vi: "Bảng lưu `ts timestamptz`. Một người ở Đà Nẵng ghi `'2026-10-30 08:10+07'`. Cột đó giữ gì?"
      en: "A table stores `ts timestamptz`. Someone in Da Nang writes `'2026-10-30 08:10+07'`. What does the column keep?"
    options:
      - { vi: "Giờ 08:10 cùng nhãn múi giờ `+07`", en: "The time 08:10 with the label `+07`" }
      - { vi: "Một thời điểm, tức 01:10 giờ UTC", en: "One instant, which is 01:10 UTC" }
      - { vi: "Giờ 08:10, bỏ `+07` đi", en: "The time 08:10, dropping `+07`" }
    answer: 1
    trap: 0
    why:
      vi: "Tên kiểu có chữ \"time zone\" nên dễ nghĩ nó lưu cả múi giờ, nhưng `timestamptz` không giữ nhãn `+07` nào. PostgreSQL đổi giá trị nhập vào thành một thời điểm thật (lưu theo UTC): 08:10 trừ 7 giờ là 01:10 UTC. Khi in ra, nó đổi thời điểm đó sang múi giờ của phiên (session time zone); phiên của lab ở đây là UTC nên bạn thấy `2026-10-30 01:10:00`. Bỏ hẳn `+07` là việc của kiểu `timestamp`, không phải `timestamptz`."
      en: "The type's name says \"time zone\", so it is easy to think it stores the zone, but `timestamptz` keeps no `+07` label. PostgreSQL turns the input into one real instant (stored as UTC): 08:10 minus 7 hours is 01:10 UTC. When it prints the value it converts that instant to the session time zone; the lab's session here is UTC, so you see `2026-10-30 01:10:00`. Dropping the `+07` altogether is what `timestamp` does, not `timestamptz`."
  - q:
      vi: "Cần số đo của ngày 25/10 giờ Việt Nam, có index trên `ts`. Câu lọc nào dùng được index?"
      en: "You need the readings of 25 Oct, Vietnam time, and `ts` has an index. Which filter can use the index?"
    options:
      - { vi: "`(ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = '2026-10-25'`", en: "`(ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = '2026-10-25'`" }
      - { vi: "`ts::date = '2026-10-25'`", en: "`ts::date = '2026-10-25'`" }
      - { vi: "`ts >= '2026-10-25 00:00+07' AND ts < '2026-10-26 00:00+07'`", en: "`ts >= '2026-10-25 00:00+07' AND ts < '2026-10-26 00:00+07'`" }
    answer: 2
    trap: 0
    why:
      vi: "Câu đầu cho đúng ngày Việt Nam, nhưng nó bọc `ts` trong một phép đổi, nên index trên `ts` (sắp theo giá trị gốc) không dùng được và PostgreSQL phải đọc cả 30.000 dòng. Câu `ts::date` vừa chậm vừa sai: nó cắt ngày theo múi của phiên (UTC), lệch 7 giờ so với ngày Việt Nam. Hai mốc có `+07` là hai thời điểm thật, so thẳng với cột `ts`, nên index tìm đúng 1.440 dòng của ngày đó."
      en: "The first filter gives the right Vietnam day, but it wraps `ts` in a conversion, so the index on `ts` (ordered by the raw value) cannot be used and PostgreSQL reads all 30,000 rows. The `ts::date` filter is slow and wrong: it cuts days in the session zone (UTC), 7 hours off the Vietnam day. The two bounds with `+07` are real instants compared with `ts` itself, so the index finds exactly the 1,440 rows of that day."
---
## Mở bài

Cảm biến trong kho lạnh ở cảng Tiên Sa gửi một số đo mỗi phút, còn người đọc báo cáo sống theo giờ Việt Nam. Bài này giữ thời điểm đúng khi lưu, rồi mới đổi sang giờ địa phương khi gom và hiển thị.

## Ý chính

**`timestamptz` lưu một thời điểm.** Giá trị `'2026-10-30 08:10+07'` được đổi thành một thời điểm thật (lưu theo UTC). Kiểu này không giữ nhãn `+07`: khi in ra, PostgreSQL đổi thời điểm đó sang múi giờ của phiên. Lab ở đây chạy với múi giờ phiên UTC, và bảng kết quả in giá trị đúng như PostgreSQL in, không tự đổi theo múi giờ máy bạn.

**`timestamp` (không múi) chỉ là giờ trên đồng hồ treo tường.** `08:10` ở Đà Nẵng và `08:10` ở Singapore là hai thời điểm khác nhau một giờ, nhưng kiểu `timestamp` coi chúng bằng nhau. Với số đo từ thiết bị, hãy lưu `timestamptz`.

**Đổi múi khi đọc, không khi lọc.** `ts AT TIME ZONE 'Asia/Ho_Chi_Minh'` trả giờ đồng hồ ở Việt Nam, dùng để gom theo ngày Việt Nam. Còn điều kiện lọc thì so thẳng `ts` với hai mốc có `+07`, để index trên `ts` vẫn dùng được.

Hình cuối mục cho thấy một thời điểm và hai cách đọc nó.

## Cú pháp

```sql
-- an instant, written with its offset
timestamptz '2026-10-30 08:10+07'
-- instant -> Vietnam wall clock
ts AT TIME ZONE 'Asia/Ho_Chi_Minh'
-- wall clock in a zone -> instant
local_ts AT TIME ZONE 'Asia/Singapore'
-- one Vietnam day, index-friendly
WHERE ts >= '2026-10-25 00:00+07'
  AND ts < '2026-10-26 00:00+07'
```

- `AT TIME ZONE` đổi hai chiều: từ `timestamptz` ra `timestamp` theo múi, và ngược lại.
- Dùng tên múi như `Asia/Ho_Chi_Minh`, không dùng `+07` cố định, vì có nơi đổi giờ theo mùa.

## Ví dụ

Cùng một thời điểm, in theo UTC (múi của phiên) và theo giờ Việt Nam:

```sql
SELECT ts AS at_utc,
  ts AT TIME ZONE 'Asia/Ho_Chi_Minh'
    AS at_vietnam
FROM readings
WHERE id = 1;
```

Số đo theo ngày Việt Nam, mỗi ngày đủ 1.440 phút:

```sql
SELECT (ts AT TIME ZONE
    'Asia/Ho_Chi_Minh')::date AS day,
  count(*) AS readings
FROM readings
WHERE ts >= '2026-10-11 00:00+07'
  AND ts < '2026-10-13 00:00+07'
GROUP BY 1 ORDER BY 1;
```

## Lỗi hay gặp

Cắt ngày bằng `ts::date` theo múi của phiên (UTC), nên mỗi "ngày" lệch 7 giờ:

```sql
-- WRONG: days cut in UTC
SELECT ts::date AS day, count(*)
FROM readings
WHERE ts < '2026-10-12 00:00+07'
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: days cut in Vietnam time
SELECT (ts AT TIME ZONE
    'Asia/Ho_Chi_Minh')::date AS day,
  count(*)
FROM readings
WHERE ts < '2026-10-12 00:00+07'
GROUP BY 1 ORDER BY 1;
```

Xếp giờ địa phương của hai cảng như thể cùng một đồng hồ: lượt 08:10 ở Đà Nẵng bị coi là sớm nhất.

```sql
-- WRONG: local clocks of two zones
SELECT event_id FROM gate_log
ORDER BY local_ts LIMIT 1;
```

```sql
-- FIX: compare real instants
SELECT g.event_id
FROM gate_log g JOIN ports p
  USING (port)
ORDER BY g.local_ts AT TIME ZONE p.tz
LIMIT 1;
```

Tên múi viết sai không được đoán giúp:

```sql
-- ERROR 22023
SELECT ts AT TIME ZONE 'Vietnam/Hanoi'
FROM readings LIMIT 1;
```

## Thực hành

Ba câu: đếm số đo theo ngày Việt Nam, tổng hợp một ngày sao cho vừa đúng vừa nhanh, và xếp các lượt qua cổng của hai cảng theo thời điểm thật.

## Tóm tắt

- `timestamptz` giữ một thời điểm thật; nó không giữ múi giờ nào.
- Phiên của lab là UTC, và bảng kết quả in đúng như PostgreSQL in.
- Gom theo giờ địa phương bằng `AT TIME ZONE 'Asia/Ho_Chi_Minh'`.
- Lọc bằng hai mốc có múi giờ, so thẳng với cột, để index còn dùng được.
- Giờ `timestamp` của nhiều nơi phải đổi về thời điểm thật trước khi so.

# EN

## Opening

The cold-store sensors at Tien Sa port send one reading a minute, while the people who read the reports live on Vietnam time. This lesson keeps the instant right when storing it, and converts to local time only when grouping and showing.

## Key idea

**`timestamptz` stores an instant.** The value `'2026-10-30 08:10+07'` becomes one real instant (stored as UTC). The type keeps no `+07` label: when printing, PostgreSQL converts the instant to the session time zone. The labs here run with session time zone UTC, and the result table prints values exactly as PostgreSQL prints them, never shifted to your computer's zone.

**`timestamp` (no zone) is only a wall-clock reading.** `08:10` in Da Nang and `08:10` in Singapore are one hour apart, but the `timestamp` type treats them as equal. Store device measurements as `timestamptz`.

**Convert when reading, not when filtering.** `ts AT TIME ZONE 'Asia/Ho_Chi_Minh'` returns the wall clock in Vietnam, for grouping by Vietnam day. The filter itself compares `ts` with two bounds that carry `+07`, so the index on `ts` can still be used.

The figure at the end of this section shows one instant and two ways to read it.

## Syntax

```sql
-- an instant, written with its offset
timestamptz '2026-10-30 08:10+07'
-- instant -> Vietnam wall clock
ts AT TIME ZONE 'Asia/Ho_Chi_Minh'
-- wall clock in a zone -> instant
local_ts AT TIME ZONE 'Asia/Singapore'
-- one Vietnam day, index-friendly
WHERE ts >= '2026-10-25 00:00+07'
  AND ts < '2026-10-26 00:00+07'
```

- `AT TIME ZONE` works both ways: from `timestamptz` to a zone's `timestamp`, and back.
- Use zone names such as `Asia/Ho_Chi_Minh`, not a fixed `+07`, because some places change their clocks with the seasons.

## Example

One instant, printed in UTC (the session zone) and in Vietnam time:

```sql
SELECT ts AS at_utc,
  ts AT TIME ZONE 'Asia/Ho_Chi_Minh'
    AS at_vietnam
FROM readings
WHERE id = 1;
```

Readings per Vietnam day, each day a full 1,440 minutes:

```sql
SELECT (ts AT TIME ZONE
    'Asia/Ho_Chi_Minh')::date AS day,
  count(*) AS readings
FROM readings
WHERE ts >= '2026-10-11 00:00+07'
  AND ts < '2026-10-13 00:00+07'
GROUP BY 1 ORDER BY 1;
```

## Common mistakes

Cutting days with `ts::date` in the session zone (UTC), so each "day" is 7 hours off:

```sql
-- WRONG: days cut in UTC
SELECT ts::date AS day, count(*)
FROM readings
WHERE ts < '2026-10-12 00:00+07'
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: days cut in Vietnam time
SELECT (ts AT TIME ZONE
    'Asia/Ho_Chi_Minh')::date AS day,
  count(*)
FROM readings
WHERE ts < '2026-10-12 00:00+07'
GROUP BY 1 ORDER BY 1;
```

Sorting two ports' local times as if they shared one clock: the 08:10 event in Da Nang comes out first.

```sql
-- WRONG: local clocks of two zones
SELECT event_id FROM gate_log
ORDER BY local_ts LIMIT 1;
```

```sql
-- FIX: compare real instants
SELECT g.event_id
FROM gate_log g JOIN ports p
  USING (port)
ORDER BY g.local_ts AT TIME ZONE p.tz
LIMIT 1;
```

A misspelt zone name is not guessed for you:

```sql
-- ERROR 22023
SELECT ts AT TIME ZONE 'Vietnam/Hanoi'
FROM readings LIMIT 1;
```

## Practice

Three questions: count readings per Vietnam day, summarise one day so the answer is both right and fast, and put two ports' gate events in real order.

## Recap

- `timestamptz` holds a real instant; it keeps no time zone.
- The lab session is UTC, and the result table prints exactly what PostgreSQL prints.
- Group by local time with `AT TIME ZONE 'Asia/Ho_Chi_Minh'`.
- Filter with two bounds that carry their zone, compared with the column itself, so the index still works.
- `timestamp` values from several places must become real instants before you compare them.
