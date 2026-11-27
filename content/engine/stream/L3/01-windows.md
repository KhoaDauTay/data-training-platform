---
id: e-sm-l3-01
engine: stream
level: L3
module: process
title: Cửa sổ thời gian - tumbling, hopping, session
title_en: Time windows - tumbling, hopping, session
kind: lab
runtime: browser
minutes: 25
figures: [{ name: sm-windows, at: idea }]
objectives:
  - vi: Phân biệt ba loại cửa sổ - tumbling, hopping, session - và biết mỗi sự kiện vào mấy cửa sổ.
    en: Tell the three kinds of window apart - tumbling, hopping, session - and how many windows each event falls in.
  - vi: Viết từng loại bằng SQL - `date_bin`, `generate_series` với nửa khoảng mở, `lag` cộng tổng chạy.
    en: Write each kind in SQL - `date_bin`, `generate_series` with half-open ranges, `lag` plus a running total.
  - vi: Giữ đúng biên cửa sổ - đầu tính, cuối không tính.
    en: Keep window bounds right - the start included, the end excluded.
requires: [e-sm-l2-05]
sources:
  - { url: "https://kafka.apache.org/41/streams/developer-guide/dsl-api/#windowing", title: "Kafka Streams docs: Windowing", title_vi: "Tài liệu Kafka Streams: cửa sổ thời gian (grace period)" }
  - { url: "https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-BIN", title: "PostgreSQL 18 docs: date_bin", title_vi: "Hàm ngày giờ › date_bin" }
  - { url: "https://www.postgresql.org/docs/18/functions-window.html", title: "PostgreSQL 18 docs: Window functions", title_vi: "Hàm cửa sổ (window function)" }
lab:
  setup: |
    CREATE TABLE scans (
      scan_id int PRIMARY KEY,
      shipment_id text NOT NULL,
      scanned_at timestamp NOT NULL
    );
    INSERT INTO scans VALUES
      (1, 'SHP-101', '2026-10-31 10:02'),
      (2, 'SHP-102', '2026-10-31 10:12'),
      (3, 'SHP-101', '2026-10-31 10:14'),
      (4, 'SHP-103', '2026-10-31 10:20'),
      (5, 'SHP-102', '2026-10-31 10:30'),
      (6, 'SHP-101', '2026-10-31 10:31'),
      (7, 'SHP-103', '2026-10-31 10:44'),
      (8, 'SHP-102', '2026-10-31 10:50'),
      (9, 'SHP-103', '2026-10-31 11:05'),
      (10, 'SHP-101', '2026-10-31 11:20');
  steps:
    - task:
        vi: "Số lần quét trong mỗi cửa sổ tumbling 15 phút, tính từ nửa đêm 31/10: trả `window_start`, `scans`, xếp theo `window_start`."
        en: "Scans per 15-minute tumbling window, counted from midnight on 31 Oct: return `window_start`, `scans`, sorted by `window_start`."
      solution: |
        SELECT date_bin('15 minutes', scanned_at,
            timestamp '2026-10-31')
            AS window_start,
          count(*) AS scans
        FROM scans
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`date_bin('15 minutes', scanned_at, timestamp '2026-10-31')` cho đầu cửa sổ của mỗi lần quét."
        en: "`date_bin('15 minutes', scanned_at, timestamp '2026-10-31')` gives each scan's window start."
    - task:
        vi: "Cửa sổ hopping dài 30 phút, bước 15 phút, bắt đầu từ 09:45 tới 11:15 ngày 31/10. Đếm lần quét trong mỗi cửa sổ (đầu tính, cuối không tính), kể cả cửa sổ trống: trả `window_start`, `scans`, xếp theo `window_start`."
        en: "Hopping windows 30 minutes long with a 15-minute hop, starting from 09:45 to 11:15 on 31 Oct. Count the scans in each window (start included, end excluded), empty windows included: return `window_start`, `scans`, sorted by `window_start`."
      solution: |
        SELECT w.start AS window_start,
          count(s.scan_id) AS scans
        FROM generate_series(
            timestamp '2026-10-31 09:45',
            timestamp '2026-10-31 11:15',
            interval '15 minutes') AS w(start)
        LEFT JOIN scans s
          ON s.scanned_at >= w.start
         AND s.scanned_at
           < w.start + interval '30 minutes'
        GROUP BY w.start
        ORDER BY w.start
      check: rows
      ordered: true
      hint:
        vi: "`generate_series` tạo các đầu cửa sổ; nối với điều kiện `>= w.start` và `< w.start + interval '30 minutes'`. Lần quét lúc 10:30 thuộc cửa sổ bắt đầu 10:15 và 10:30, không thuộc cửa sổ 10:00."
        en: "`generate_series` makes the window starts; join on `>= w.start` and `< w.start + interval '30 minutes'`. The 10:30 scan belongs to the windows starting 10:15 and 10:30, not to the 10:00 one."
    - task:
        vi: "Cửa sổ session theo từng lô: một phiên kết thúc khi hai lần quét liền nhau cách hơn 20 phút. Trả `shipment_id`, `session_no` (1, 2, … trong mỗi lô), `session_start`, `session_end`, `scans`."
        en: "Session windows per shipment: a session ends when two consecutive scans are more than 20 minutes apart. Return `shipment_id`, `session_no` (1, 2, … within each shipment), `session_start`, `session_end`, `scans`."
      solution: |
        SELECT shipment_id, session_no,
          min(scanned_at) AS session_start,
          max(scanned_at) AS session_end,
          count(*) AS scans
        FROM (
          SELECT shipment_id, scanned_at,
            count(*) FILTER (WHERE gap IS NULL
              OR gap > interval '20 minutes')
              OVER (PARTITION BY shipment_id
                    ORDER BY scanned_at)
              AS session_no
          FROM (
            SELECT shipment_id, scanned_at,
              scanned_at - lag(scanned_at) OVER (
                PARTITION BY shipment_id
                ORDER BY scanned_at) AS gap
            FROM scans
          ) g
        ) s
        GROUP BY shipment_id, session_no
      check: rows
      hint:
        vi: "`lag` cho khoảng cách tới lần quét trước; đếm chạy các lần `gap > interval '20 minutes'` (và lần đầu, `gap IS NULL`) ra số phiên. Đúng 20 phút vẫn là cùng phiên."
        en: "`lag` gives the gap to the previous scan; a running count of `gap > interval '20 minutes'` (and the first scan, `gap IS NULL`) gives the session number. Exactly 20 minutes is still the same session."
quiz:
  - q:
      vi: "Cửa sổ hopping dài 30 phút, bước 15 phút. Một lần quét lúc 10:20 nằm trong mấy cửa sổ?"
      en: "Hopping windows are 30 minutes long with a 15-minute hop. How many windows does a 10:20 scan fall in?"
    options:
      - { vi: "Một, vì mỗi sự kiện chỉ thuộc một cửa sổ", en: "One, because each event belongs to one window" }
      - { vi: "Hai: cửa sổ bắt đầu 10:00 và 10:15", en: "Two: the windows starting 10:00 and 10:15" }
      - { vi: "Ba: 09:45, 10:00 và 10:15", en: "Three: 09:45, 10:00 and 10:15" }
    answer: 1
    trap: 0
    why:
      vi: "Một cửa sổ cho mỗi sự kiện là tính chất của tumbling, không phải hopping. Tài liệu Kafka Streams nói cửa sổ hopping chồng lên nhau, nên một sự kiện có thể thuộc nhiều cửa sổ. Ở đây cửa sổ 10:00 là [10:00, 10:30) và cửa sổ 10:15 là [10:15, 10:45), đều chứa 10:20; cửa sổ 09:45 kết thúc lúc 10:15 nên không chứa."
      en: "One window per event is a property of tumbling windows, not hopping ones. The Kafka Streams docs say hopping windows overlap, so an event can belong to several. Here the 10:00 window is [10:00, 10:30) and the 10:15 window is [10:15, 10:45), and both contain 10:20; the 09:45 window ends at 10:15, so it does not."
  - q:
      vi: "Vì sao cửa sổ session không viết được bằng `date_bin`?"
      en: "Why can session windows not be written with `date_bin`?"
    options:
      - { vi: "Vì `date_bin` chỉ nhận khoảng theo giờ", en: "Because `date_bin` only takes hour intervals" }
      - { vi: "Vì biên của chúng phụ thuộc vào chính dữ liệu", en: "Because their bounds depend on the data itself" }
      - { vi: "Vì session chỉ có trong Kafka, không có trong SQL", en: "Because sessions only exist in Kafka, not in SQL" }
    answer: 1
    trap: 2
    why:
      vi: "Session không phải thứ riêng của Kafka: bước 3 viết nó bằng SQL. `date_bin` cắt thời gian thành các khúc cố định cho mọi khóa, còn một phiên bắt đầu và kết thúc theo khoảng lặng giữa các sự kiện của từng khóa. Vì vậy phải nhìn lần quét trước (`lag`) rồi đánh số phiên."
      en: "Sessions are not a Kafka-only thing: step 3 writes one in SQL. `date_bin` cuts time into fixed pieces for every key, while a session starts and ends with the gaps between each key's events. That is why you look at the previous scan (`lag`) and then number the sessions."
---
## Mở bài

Đội kho Cargo Query muốn biết nhịp quét ở bến theo thời gian, không phải tổng cả ngày. Xử lý luồng gom sự kiện vào cửa sổ thời gian, và bài này viết ba loại cửa sổ quen thuộc bằng SQL.

## Ý chính

**Tumbling.** Tài liệu Kafka Streams gọi đây là cửa sổ cố định, không chồng lấn, không khe hở: mỗi sự kiện thuộc đúng một cửa sổ. Trong PostgreSQL, `date_bin` cho đầu cửa sổ của mỗi sự kiện.

**Hopping.** Cửa sổ có độ dài và bước nhảy (hop). Khi bước ngắn hơn độ dài, các cửa sổ chồng lên nhau và một sự kiện thuộc nhiều cửa sổ. Trong SQL: tạo các đầu cửa sổ bằng `generate_series`, rồi nối sự kiện vào mọi cửa sổ chứa nó.

**Biên cửa sổ.** Kafka Streams lấy đầu cửa sổ tính vào, cuối không tính: [10:00, 10:30). Viết `>= start AND < start + size`; dùng `<=` thì một sự kiện đúng lúc 10:30 bị đếm vào hai cửa sổ liền nhau.

**Session.** Một phiên là một quãng có hoạt động, kết thúc khi có một khoảng lặng dài hơn mức cho phép. Biên phụ thuộc vào dữ liệu của từng khóa, nên cần `lag` để thấy khoảng cách tới sự kiện trước, rồi đếm chạy các lần khoảng cách vượt mức để đánh số phiên.

Hình cuối mục so ba loại cửa sổ trên cùng một trục thời gian.

## Cú pháp

```sql
-- tumbling
date_bin('15 minutes', scanned_at,
  timestamp '2026-10-31')
-- hopping: every window holding it
FROM generate_series(a, b,
  interval '15 minutes') AS w(start)
JOIN scans s
  ON s.scanned_at >= w.start
 AND s.scanned_at
   < w.start + interval '30 minutes'
-- session: gap to the previous event
scanned_at - lag(scanned_at) OVER (
  PARTITION BY shipment_id
  ORDER BY scanned_at)
```

Cùng ba cửa sổ trong Kafka Streams (Java, chỉ để đọc):

```text
TimeWindows.ofSizeWithNoGrace(
  Duration.ofMinutes(15))
TimeWindows.ofSizeWithNoGrace(
  Duration.ofMinutes(30))
  .advanceBy(Duration.ofMinutes(15))
SessionWindows
  .ofInactivityGapWithNoGrace(
    Duration.ofMinutes(20))
```

- `date_bin(step, value, origin)`: làm tròn xuống theo bước (step), tính từ mốc (origin).
- `LEFT JOIN` giữ cả cửa sổ trống, với `count(s.scan_id)` = 0.

## Ví dụ

Mọi lần quét theo thời gian:

```sql
SELECT scan_id, shipment_id, scanned_at
FROM scans
ORDER BY scanned_at;
```

Mỗi lần quét và đầu cửa sổ tumbling 15 phút của nó:

```sql
SELECT scan_id, scanned_at,
  date_bin('15 minutes', scanned_at,
    timestamp '2026-10-31') AS w
FROM scans
ORDER BY scanned_at;
```

Khoảng cách tới lần quét trước của cùng lô:

```sql
SELECT shipment_id, scanned_at,
  scanned_at - lag(scanned_at) OVER (
    PARTITION BY shipment_id
    ORDER BY scanned_at) AS gap
FROM scans
ORDER BY shipment_id, scanned_at;
```

## Lỗi hay gặp

Dùng `<=` ở cuối cửa sổ: lần quét lúc 10:30 bị đếm cả vào cửa sổ 10:00.

```sql
-- WRONG: the end is included
SELECT count(*) AS scans
FROM scans
WHERE scanned_at
  >= timestamp '2026-10-31 10:00'
  AND scanned_at
  <= timestamp '2026-10-31 10:30';
```

```sql
-- FIX: [start, end)
SELECT count(*) AS scans
FROM scans
WHERE scanned_at
  >= timestamp '2026-10-31 10:00'
  AND scanned_at
  < timestamp '2026-10-31 10:30';
```

Gom theo giờ thay cho cửa sổ 15 phút làm mất nhịp trong giờ:

```sql
-- WRONG: hourly buckets
SELECT date_trunc('hour', scanned_at)
    AS w, count(*) AS scans
FROM scans
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: 15-minute buckets
SELECT date_bin('15 minutes',
    scanned_at,
    timestamp '2026-10-31') AS w,
  count(*) AS scans
FROM scans
GROUP BY 1 ORDER BY 1;
```

## Thực hành

Ba bước: đếm lần quét theo cửa sổ tumbling, theo cửa sổ hopping chồng lấn, rồi tách phiên quét của từng lô theo khoảng lặng 20 phút.

## Tóm tắt

- Tumbling: cố định, không chồng lấn, mỗi sự kiện một cửa sổ; `date_bin`.
- Hopping: độ dài và bước nhảy, chồng lấn, một sự kiện nhiều cửa sổ; `generate_series` và nối.
- Biên cửa sổ là [đầu, cuối): viết `>=` và `<`.
- Session: biên theo khoảng lặng của từng khóa; `lag` rồi đếm chạy.

# EN

## Opening

Cargo Query's warehouse team wants the pace of scans at the hub over time, not one total for the day. Stream processing groups events into time windows, and this lesson writes the three usual kinds of window in SQL.

## Key idea

**Tumbling.** The Kafka Streams docs call these fixed-size, non-overlapping, gap-less windows: each event belongs to exactly one window. In PostgreSQL, `date_bin` gives each event's window start.

**Hopping.** A window has a size and a hop. When the hop is shorter than the size, windows overlap and an event belongs to several of them. In SQL: make the window starts with `generate_series`, then join each event to every window that contains it.

**Window bounds.** Kafka Streams takes the window start as included and the end as excluded: [10:00, 10:30). Write `>= start AND < start + size`; with `<=`, an event at exactly 10:30 is counted in two neighbouring windows.

**Session.** A session is a period of activity that ends when a gap of inactivity is longer than allowed. Its bounds depend on each key's data, so you need `lag` to see the gap to the previous event, then a running count of the gaps over the limit to number the sessions.

The figure at the end of this section compares the three kinds of window on one time axis.

## Syntax

```sql
-- tumbling
date_bin('15 minutes', scanned_at,
  timestamp '2026-10-31')
-- hopping: every window holding it
FROM generate_series(a, b,
  interval '15 minutes') AS w(start)
JOIN scans s
  ON s.scanned_at >= w.start
 AND s.scanned_at
   < w.start + interval '30 minutes'
-- session: gap to the previous event
scanned_at - lag(scanned_at) OVER (
  PARTITION BY shipment_id
  ORDER BY scanned_at)
```

The same three windows in Kafka Streams (Java, to read only):

```text
TimeWindows.ofSizeWithNoGrace(
  Duration.ofMinutes(15))
TimeWindows.ofSizeWithNoGrace(
  Duration.ofMinutes(30))
  .advanceBy(Duration.ofMinutes(15))
SessionWindows
  .ofInactivityGapWithNoGrace(
    Duration.ofMinutes(20))
```

- `date_bin(step, value, origin)`: rounds down by the step, counted from the origin.
- The `LEFT JOIN` keeps empty windows too, with `count(s.scan_id)` = 0.

## Example

Every scan in time order:

```sql
SELECT scan_id, shipment_id, scanned_at
FROM scans
ORDER BY scanned_at;
```

Each scan and the start of its 15-minute tumbling window:

```sql
SELECT scan_id, scanned_at,
  date_bin('15 minutes', scanned_at,
    timestamp '2026-10-31') AS w
FROM scans
ORDER BY scanned_at;
```

The gap to the same shipment's previous scan:

```sql
SELECT shipment_id, scanned_at,
  scanned_at - lag(scanned_at) OVER (
    PARTITION BY shipment_id
    ORDER BY scanned_at) AS gap
FROM scans
ORDER BY shipment_id, scanned_at;
```

## Common mistakes

Using `<=` at the window's end: the 10:30 scan is also counted in the 10:00 window.

```sql
-- WRONG: the end is included
SELECT count(*) AS scans
FROM scans
WHERE scanned_at
  >= timestamp '2026-10-31 10:00'
  AND scanned_at
  <= timestamp '2026-10-31 10:30';
```

```sql
-- FIX: [start, end)
SELECT count(*) AS scans
FROM scans
WHERE scanned_at
  >= timestamp '2026-10-31 10:00'
  AND scanned_at
  < timestamp '2026-10-31 10:30';
```

Grouping by hour instead of 15-minute windows hides the pace within the hour:

```sql
-- WRONG: hourly buckets
SELECT date_trunc('hour', scanned_at)
    AS w, count(*) AS scans
FROM scans
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: 15-minute buckets
SELECT date_bin('15 minutes',
    scanned_at,
    timestamp '2026-10-31') AS w,
  count(*) AS scans
FROM scans
GROUP BY 1 ORDER BY 1;
```

## Practice

Three steps: count scans per tumbling window, per overlapping hopping window, then split each shipment's scans into sessions by a 20-minute gap.

## Recap

- Tumbling: fixed, non-overlapping, one window per event; `date_bin`.
- Hopping: a size and a hop, overlapping, one event in several windows; `generate_series` and a join.
- Window bounds are [start, end): write `>=` and `<`.
- Session: bounds come from each key's gaps; `lag` then a running count.
