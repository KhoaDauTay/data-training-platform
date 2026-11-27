---
id: e-ts-l1-03
engine: timeseries
level: L1
module: basics
title: Gom theo khung giờ với date_trunc và date_bin
title_en: Time buckets with date_trunc and date_bin
kind: lab
runtime: browser
minutes: 18
figures: [{ name: ts-buckets, at: idea }]
objectives:
  - vi: Gom số đo theo giờ, theo ngày bằng `date_trunc`.
    en: Group measurements by hour or by day with `date_trunc`.
  - vi: Gom theo khung tùy ý (15 phút, 8 giờ) bằng `date_bin`, và chọn mốc gốc (origin) cho khung.
    en: Group into any bucket size (15 minutes, 8 hours) with `date_bin`, and choose the bucket origin.
  - vi: Biết một số đo nằm đúng ở ranh giới thuộc khung nào.
    en: Know which bucket a reading exactly on a boundary belongs to.
requires: [e-ts-l1-02]
sources:
  - { url: https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC, title_vi: "Hàm ngày giờ › date_trunc" }
  - { url: https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-BIN, title_vi: "Hàm ngày giờ › date_bin" }
lab:
  setup: |
    CREATE TABLE gate_events (
      id int PRIMARY KEY,
      ts timestamptz NOT NULL,
      lane int NOT NULL
    );
    INSERT INTO gate_events
    SELECT g,
      timestamptz '2026-10-30 06:00+00'
        + (g * 7 % 600) * interval '1 minute'
        + (g % 60) * interval '1 second',
      1 + g % 3
    FROM generate_series(1, 240) g;
  steps:
    - task:
        vi: "Mỗi giờ có bao nhiêu xe qua cổng? Trả `hour`, `trucks`, xếp theo giờ tăng dần."
        en: "How many trucks pass the gate each hour? Return `hour`, `trucks`, sorted by hour ascending."
      solution: |
        SELECT date_trunc('hour', ts) AS hour,
          count(*) AS trucks
        FROM gate_events
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`date_trunc('hour', ts)` cắt bỏ phút và giây; nhóm theo nó."
        en: "`date_trunc('hour', ts)` drops the minutes and seconds; group by it."
    - task:
        vi: "Trong giờ 08:00–09:00 (UTC) ngày 30/10, mỗi khung 15 phút có bao nhiêu xe? Trả `slot`, `trucks`, xếp theo `slot`."
        en: "Between 08:00 and 09:00 (UTC) on 30 Oct, how many trucks fall in each 15-minute bucket? Return `slot`, `trucks`, sorted by `slot`."
      solution: |
        SELECT date_bin('15 minutes', ts,
            '2026-10-30 00:00+00') AS slot,
          count(*) AS trucks
        FROM gate_events
        WHERE ts >= '2026-10-30 08:00+00'
          AND ts < '2026-10-30 09:00+00'
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`date_bin('15 minutes', ts, '2026-10-30 00:00+00')`: khung 15 phút tính từ nửa đêm."
        en: "`date_bin('15 minutes', ts, '2026-10-30 00:00+00')`: 15-minute buckets counted from midnight."
    - task:
        vi: "Cổng chạy ca 8 giờ, ca đầu bắt đầu lúc 06:00 (UTC). Mỗi ca có bao nhiêu xe? Trả `shift`, `trucks`, xếp theo `shift`."
        en: "The gate runs 8-hour shifts, the first starting at 06:00 (UTC). How many trucks does each shift handle? Return `shift`, `trucks`, sorted by `shift`."
      solution: |
        SELECT date_bin('8 hours', ts,
            '2026-10-30 06:00+00') AS shift,
          count(*) AS trucks
        FROM gate_events
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`date_trunc` chỉ cắt theo đơn vị lịch; ca 8 giờ bắt đầu 06:00 cần `date_bin('8 hours', ts, '2026-10-30 06:00+00')`."
        en: "`date_trunc` only cuts at calendar units; 8-hour shifts starting at 06:00 need `date_bin('8 hours', ts, '2026-10-30 06:00+00')`."
quiz:
  - q:
      vi: "Một xe qua cổng lúc 08:15:00 đúng. Với `date_bin('15 minutes', ts, '2026-10-30 00:00+00')`, xe đó thuộc khung nào?"
      en: "A truck passes at exactly 08:15:00. With `date_bin('15 minutes', ts, '2026-10-30 00:00+00')`, which bucket does it belong to?"
    options:
      - { vi: "Khung 08:00, vì nó kết thúc khung đó", en: "The 08:00 bucket, because it ends that bucket" }
      - { vi: "Khung 08:15, vì khung gồm điểm đầu", en: "The 08:15 bucket, because a bucket includes its start" }
      - { vi: "Cả hai khung, mỗi bên một nửa", en: "Both buckets, half each" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như 08:15 là điểm cuối của khung 08:00–08:15, nhưng mỗi khung gồm điểm đầu và không gồm điểm cuối: khung 08:00 chứa từ 08:00:00 tới trước 08:15:00. Nên `date_bin` trả về 08:15 cho xe đó, và mỗi số đo thuộc đúng một khung. Không có chuyện chia đôi: đếm như vậy thì tổng các khung sẽ không bằng số xe."
      en: "08:15 sounds like the end of the 08:00–08:15 bucket, but each bucket includes its start and excludes its end: the 08:00 bucket holds 08:00:00 up to just before 08:15:00. So `date_bin` returns 08:15 for that truck, and every reading belongs to exactly one bucket. Nothing is split in half: counting that way would make the buckets add up to a different number of trucks."
  - q:
      vi: "Cần gom theo ca 8 giờ bắt đầu lúc 06:00. Cách nào cho đúng?"
      en: "You need 8-hour shifts starting at 06:00. Which way gives it?"
    options:
      - { vi: "`date_trunc('day', ts)`, rồi chia ba", en: "`date_trunc('day', ts)`, then split into three" }
      - { vi: "`date_bin('8 hours', ts, '2026-10-30 06:00+00')`", en: "`date_bin('8 hours', ts, '2026-10-30 06:00+00')`" }
      - { vi: "`date_bin('8 hours', ts, '2026-10-30 00:00+00')`", en: "`date_bin('8 hours', ts, '2026-10-30 00:00+00')`" }
    answer: 1
    trap: 2
    why:
      vi: "Câu thứ ba đúng cỡ khung 8 giờ, nhưng mốc gốc (origin) là nửa đêm, nên khung chạy 00–08, 08–16, 16–24 và lệch ca thật 2 giờ. `date_bin` xếp khung liên tiếp từ mốc gốc, nên mốc 06:00 cho đúng các ca 06–14, 14–22. `date_trunc('day')` chỉ cho một khung cả ngày; nó không chia được ca."
      en: "The third option has the right 8-hour size, but its origin is midnight, so the buckets run 00–08, 08–16, 16–24 and miss the real shifts by 2 hours. `date_bin` lays buckets end to end from the origin, so an origin at 06:00 gives the real 06–14 and 14–22 shifts. `date_trunc('day')` gives only one whole-day bucket; it cannot split shifts."
---
## Mở bài

Cổng cảng Tiên Sa ghi giờ từng xe ra vào, nhưng người điều độ cần số xe mỗi giờ, mỗi 15 phút, mỗi ca. Gom theo khung thời gian là việc đầu tiên của mọi báo cáo chuỗi thời gian.

## Ý chính

`date_trunc(unit, ts)` cắt về đầu một đơn vị lịch: giây, phút, giờ, ngày, tuần, tháng, năm. `date_trunc('hour', ts)` biến 08:37:12 thành 08:00:00. Nhóm theo kết quả đó là có số mỗi giờ.

`date_bin(stride, ts, origin)` gom theo khung tùy ý. Khung xếp liên tiếp từ mốc gốc (origin), mỗi khung dài đúng cỡ đã cho, và `date_bin` trả về điểm đầu của khung chứa `ts`. Nó làm được những thứ `date_trunc` không làm được: khung 15 phút, ca 8 giờ bắt đầu 06:00. `date_bin` không nhận cỡ khung tính bằng tháng hay năm, vì tháng dài ngắn khác nhau.

**Ranh giới.** Mỗi khung gồm điểm đầu, không gồm điểm cuối. Xe qua lúc 08:15:00 thuộc khung 08:15, không thuộc khung 08:00, nên mỗi số đo nằm đúng một khung.

**Múi giờ.** Các lab từ bài này ghi và gom theo UTC, như phần lớn hệ thống đo; đổi sang giờ Việt Nam là việc của bước hiển thị, như bài `e-ts-l1-02`. `date_trunc` với `timestamptz` cắt theo múi của phiên, và có dạng ba tham số `date_trunc('day', ts, 'Asia/Ho_Chi_Minh')` để cắt theo một múi khác.

Hình cuối mục cho thấy hai xe sát ranh giới 08:15 rơi vào hai khung khác nhau.

## Cú pháp

```sql
-- calendar units
date_trunc('hour', ts)
date_trunc('day', ts,
  'Asia/Ho_Chi_Minh')
-- any size, from an origin
date_bin('15 minutes', ts,
  '2026-10-30 00:00+00')
date_bin('8 hours', ts,
  '2026-10-30 06:00+00')
```

- Cả hai trả về điểm đầu của khung; nhóm theo giá trị đó.
- Mốc gốc của `date_bin` có thể là bất kỳ thời điểm nào, kể cả trước hoặc sau dữ liệu.

## Ví dụ

Mỗi giờ, mỗi làn có bao nhiêu xe:

```sql
SELECT date_trunc('hour', ts) AS hour,
  lane, count(*) AS trucks
FROM gate_events
WHERE ts < '2026-10-30 08:00+00'
GROUP BY 1, 2
ORDER BY 1, 2;
```

Một mốc gốc lệch 7 phút làm khung chạy 08:07, 08:22…:

```sql
SELECT date_bin('15 minutes', ts,
    '2026-10-30 00:07+00') AS slot,
  count(*) AS trucks
FROM gate_events
WHERE ts >= '2026-10-30 08:00+00'
  AND ts < '2026-10-30 09:00+00'
GROUP BY 1 ORDER BY 1;
```

## Lỗi hay gặp

Gom ca bằng `date_trunc('day')`: mọi xe dồn vào một khung cả ngày.

```sql
-- WRONG: one bucket for the whole day
SELECT date_trunc('day', ts) AS shift,
  count(*) AS trucks
FROM gate_events
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: 8-hour buckets from 06:00
SELECT date_bin('8 hours', ts,
    '2026-10-30 06:00+00') AS shift,
  count(*) AS trucks
FROM gate_events
GROUP BY 1 ORDER BY 1;
```

`date_bin` không nhận khung tính theo tháng:

```sql
-- ERROR 0A000
SELECT date_bin('1 month', ts,
  '2026-10-01 00:00+00')
FROM gate_events LIMIT 1;
```

## Thực hành

Ba câu: số xe mỗi giờ, số xe mỗi 15 phút trong một giờ cao điểm, và số xe mỗi ca 8 giờ.

## Tóm tắt

- `date_trunc` cắt về đầu một đơn vị lịch: giờ, ngày, tháng.
- `date_bin` gom theo cỡ tùy ý, tính từ một mốc gốc bạn chọn.
- Mỗi khung gồm điểm đầu, không gồm điểm cuối.
- Theo tháng thì dùng `date_trunc('month', ts)`, không dùng `date_bin`.

# EN

## Opening

The Tien Sa port gate logs the time of every truck, but the dispatcher needs trucks per hour, per 15 minutes, per shift. Grouping into time buckets is the first step of every time-series report.

## Key idea

`date_trunc(unit, ts)` cuts back to the start of a calendar unit: second, minute, hour, day, week, month, year. `date_trunc('hour', ts)` turns 08:37:12 into 08:00:00. Grouping by that result gives per-hour figures.

`date_bin(stride, ts, origin)` groups into buckets of any size. Buckets are laid end to end from the origin, each exactly the given size, and `date_bin` returns the start of the bucket holding `ts`. It does what `date_trunc` cannot: 15-minute buckets, 8-hour shifts starting at 06:00. `date_bin` does not take sizes in months or years, because months differ in length.

**Boundaries.** Each bucket includes its start and excludes its end. A truck at 08:15:00 belongs to the 08:15 bucket, not the 08:00 one, so each reading lands in exactly one bucket.

**Time zones.** From this lesson on, the labs record and group in UTC, like most measuring systems; converting to Vietnam time is the display step, as in lesson `e-ts-l1-02`. `date_trunc` on a `timestamptz` cuts in the session zone, and its three-argument form `date_trunc('day', ts, 'Asia/Ho_Chi_Minh')` cuts in another zone.

The figure at the end of this section shows two trucks close to the 08:15 boundary landing in two different buckets.

## Syntax

```sql
-- calendar units
date_trunc('hour', ts)
date_trunc('day', ts,
  'Asia/Ho_Chi_Minh')
-- any size, from an origin
date_bin('15 minutes', ts,
  '2026-10-30 00:00+00')
date_bin('8 hours', ts,
  '2026-10-30 06:00+00')
```

- Both return the start of the bucket; group by that value.
- The origin of `date_bin` can be any instant, even before or after the data.

## Example

Trucks per hour and per lane:

```sql
SELECT date_trunc('hour', ts) AS hour,
  lane, count(*) AS trucks
FROM gate_events
WHERE ts < '2026-10-30 08:00+00'
GROUP BY 1, 2
ORDER BY 1, 2;
```

An origin 7 minutes off makes the buckets run 08:07, 08:22…:

```sql
SELECT date_bin('15 minutes', ts,
    '2026-10-30 00:07+00') AS slot,
  count(*) AS trucks
FROM gate_events
WHERE ts >= '2026-10-30 08:00+00'
  AND ts < '2026-10-30 09:00+00'
GROUP BY 1 ORDER BY 1;
```

## Common mistakes

Grouping shifts with `date_trunc('day')`: every truck lands in one whole-day bucket.

```sql
-- WRONG: one bucket for the whole day
SELECT date_trunc('day', ts) AS shift,
  count(*) AS trucks
FROM gate_events
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: 8-hour buckets from 06:00
SELECT date_bin('8 hours', ts,
    '2026-10-30 06:00+00') AS shift,
  count(*) AS trucks
FROM gate_events
GROUP BY 1 ORDER BY 1;
```

`date_bin` does not take a bucket measured in months:

```sql
-- ERROR 0A000
SELECT date_bin('1 month', ts,
  '2026-10-01 00:00+00')
FROM gate_events LIMIT 1;
```

## Practice

Three questions: trucks per hour, trucks per 15 minutes in one busy hour, and trucks per 8-hour shift.

## Recap

- `date_trunc` cuts back to the start of a calendar unit: hour, day, month.
- `date_bin` groups into any size, counted from an origin you choose.
- Each bucket includes its start and excludes its end.
- For months use `date_trunc('month', ts)`, not `date_bin`.
