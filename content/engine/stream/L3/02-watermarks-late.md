---
id: e-sm-l3-02
engine: stream
level: L3
module: process
title: Watermark và sự kiện trễ
title_en: Watermarks and late events
kind: lab
runtime: browser
minutes: 25
figures: [{ name: sm-late-event, at: idea }]
objectives:
  - vi: Phân biệt thời điểm sự kiện xảy ra với thứ tự nó đến.
    en: Tell the time an event happened from the order it arrives in.
  - vi: Tính stream time (thời điểm lớn nhất đã thấy) và tìm sự kiện đến sai thứ tự.
    en: Compute stream time (the largest event time seen so far) and find out-of-order events.
  - vi: Áp một thời gian ân hạn (grace) để quyết định sự kiện trễ nào còn được nhận, sự kiện nào bị bỏ.
    en: Apply a grace period to decide which late events are still accepted and which are dropped.
requires: [e-sm-l3-01]
sources:
  - { url: "https://kafka.apache.org/41/streams/developer-guide/dsl-api/#windowing", title: "Kafka Streams docs: Windowing (grace period)" }
  - { url: "https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS", title: "PostgreSQL 18 docs: Window function calls (frames)" }
lab:
  setup: |
    CREATE TABLE arrivals (
      seq int PRIMARY KEY,
      scan_id int NOT NULL,
      event_time timestamp NOT NULL
    );
    INSERT INTO arrivals VALUES
      (1, 101, '2026-10-31 10:01'),
      (2, 102, '2026-10-31 10:04'),
      (3, 103, '2026-10-31 10:12'),
      (4, 104, '2026-10-31 10:09'),
      (5, 105, '2026-10-31 10:16'),
      (6, 106, '2026-10-31 10:21'),
      (7, 107, '2026-10-31 10:08'),
      (8, 108, '2026-10-31 10:11'),
      (9, 109, '2026-10-31 10:26'),
      (10, 110, '2026-10-31 10:19'),
      (11, 111, '2026-10-31 10:31');
  steps:
    - task:
        vi: "`seq` là thứ tự đến. Với mỗi sự kiện, tính stream time ngay sau khi nó đến: `event_time` lớn nhất trong các sự kiện đã đến tới lúc đó. Trả `seq`, `event_time`, `stream_time`."
        en: "`seq` is the arrival order. For each event, compute the stream time right after it arrives: the largest `event_time` among the events arrived so far. Return `seq`, `event_time`, `stream_time`."
      solution: |
        SELECT seq, event_time,
          max(event_time) OVER (ORDER BY seq)
            AS stream_time
        FROM arrivals
      check: rows
      hint:
        vi: "`max(event_time) OVER (ORDER BY seq)`: có `ORDER BY`, khung mặc định chạy từ đầu tới dòng hiện tại."
        en: "`max(event_time) OVER (ORDER BY seq)`: with `ORDER BY`, the default frame runs from the start to the current row."
    - task:
        vi: "Sự kiện nào đến sai thứ tự, tức `event_time` nhỏ hơn stream time trước khi nó đến? Trả `seq`, `event_time`."
        en: "Which events arrived out of order, that is, with an `event_time` below the stream time before they arrived? Return `seq`, `event_time`."
      solution: |
        SELECT seq, event_time
        FROM (
          SELECT seq, event_time,
            max(event_time) OVER (
              ORDER BY seq
              ROWS BETWEEN UNBOUNDED PRECEDING
                AND 1 PRECEDING) AS seen
          FROM arrivals
        ) a
        WHERE event_time < seen
      check: rows
      hint:
        vi: "So với giá trị lớn nhất của **mọi** sự kiện trước (`ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`), không chỉ sự kiện ngay trước: `seq` 8 lớn hơn `seq` 7 nhưng vẫn trễ."
        en: "Compare with the largest of **all** earlier events (`ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`), not just the one right before: `seq` 8 is above `seq` 7 but still late."
    - task:
        vi: "Cửa sổ tumbling 10 phút tính từ nửa đêm, ân hạn 5 phút: một cửa sổ đóng khi stream time chạm cuối cửa sổ cộng 5 phút. Sự kiện nào đến khi cửa sổ của nó đã đóng và bị bỏ? Trả `seq`, `event_time`."
        en: "10-minute tumbling windows counted from midnight, with a 5-minute grace period: a window closes when stream time reaches its end plus 5 minutes. Which events arrive after their window has closed and are dropped? Return `seq`, `event_time`."
      solution: |
        SELECT seq, event_time
        FROM (
          SELECT seq, event_time,
            date_bin('10 minutes', event_time,
              timestamp '2026-10-31')
              + interval '10 minutes'
              AS window_end,
            max(event_time) OVER (
              ORDER BY seq
              ROWS BETWEEN UNBOUNDED PRECEDING
                AND 1 PRECEDING) AS seen
          FROM arrivals
        ) a
        WHERE seen >= window_end
          + interval '5 minutes'
      check: rows
      hint:
        vi: "Cuối cửa sổ là `date_bin(...) + interval '10 minutes'`; bị bỏ khi stream time trước khi đến `>=` cuối cửa sổ `+ interval '5 minutes'`."
        en: "The window end is `date_bin(...) + interval '10 minutes'`; an event is dropped when the stream time before it arrived is `>=` the end `+ interval '5 minutes'`."
    - task:
        vi: "Kết quả cuối của mỗi cửa sổ, chỉ đếm sự kiện được nhận: trả `window_start`, `scans`, xếp theo `window_start`."
        en: "Each window's final result, counting only accepted events: return `window_start`, `scans`, sorted by `window_start`."
      solution: |
        SELECT window_start, count(*) AS scans
        FROM (
          SELECT date_bin('10 minutes',
              event_time,
              timestamp '2026-10-31')
              AS window_start,
            max(event_time) OVER (
              ORDER BY seq
              ROWS BETWEEN UNBOUNDED PRECEDING
                AND 1 PRECEDING) AS seen
          FROM arrivals
        ) a
        WHERE seen IS NULL
          OR seen < window_start
            + interval '15 minutes'
        GROUP BY window_start
        ORDER BY window_start
      check: rows
      ordered: true
      hint:
        vi: "Được nhận khi stream time trước khi đến còn nhỏ hơn đầu cửa sổ `+ interval '15 minutes'` (10 phút cửa sổ cộng 5 phút ân hạn); sự kiện đầu tiên có stream time NULL."
        en: "Accepted when the stream time before arrival is still below the window start `+ interval '15 minutes'` (10 minutes of window plus 5 of grace); the first event has a NULL stream time."
quiz:
  - q:
      vi: "Tăng ân hạn từ 5 lên 30 phút. Điều gì đổi?"
      en: "The grace period goes from 5 to 30 minutes. What changes?"
    options:
      - { vi: "Ít sự kiện bị bỏ hơn, nhưng kết quả cuối ra muộn hơn", en: "Fewer events dropped, but final results come later" }
      - { vi: "Không gì đổi, vì sự kiện vẫn đến theo thứ tự", en: "Nothing, because events still arrive in order" }
      - { vi: "Kết quả ra sớm hơn vì cửa sổ dài hơn", en: "Results come sooner because windows are longer" }
    answer: 0
    trap: 2
    why:
      vi: "Ân hạn không làm cửa sổ dài hơn: cửa sổ vẫn 10 phút, chỉ là nó chờ lâu hơn trước khi đóng. Chờ lâu thì nhận được nhiều sự kiện trễ hơn (ở lab, `seq` 7 và 10 sẽ được nhận), nhưng kết quả cuối của mỗi cửa sổ phải đợi thêm. Đó là đánh đổi giữa đúng và nhanh."
      en: "Grace does not make a window longer: it is still 10 minutes, it just waits longer before closing. Waiting longer accepts more late events (in the lab, `seq` 7 and 10 would be accepted), but each window's final result has to wait longer. That is the trade-off between complete and fast."
  - q:
      vi: "Vì sao stream time dựa trên `event_time` lớn nhất đã thấy chứ không dựa trên đồng hồ của máy xử lý?"
      en: "Why is stream time based on the largest `event_time` seen and not on the processing machine's clock?"
    options:
      - { vi: "Vì đồng hồ máy không bao giờ chính xác", en: "Because machine clocks are never accurate" }
      - { vi: "Để chạy lại dữ liệu cũ vẫn cho cùng kết quả", en: "So replaying old data still gives the same result" }
      - { vi: "Vì SQL không đọc được giờ hiện tại", en: "Because SQL cannot read the current time" }
    answer: 1
    trap: 2
    why:
      vi: "SQL đọc được giờ hiện tại (`now()`), nên đó không phải lý do. Nếu dựa vào đồng hồ máy, chạy lại nhật ký của hôm qua hôm nay sẽ đóng mọi cửa sổ ngay và bỏ hết sự kiện. Dựa vào thời điểm của chính sự kiện, chạy lại bao nhiêu lần cũng ra cùng một kết quả."
      en: "SQL can read the current time (`now()`), so that is not the reason. If it relied on the machine clock, replaying yesterday's log today would close every window at once and drop every event. Relying on the events' own times, any number of replays gives the same result."
---
## Mở bài

Máy quét ở bến gửi dữ liệu qua mạng di động, nên lần quét lúc 10:08 có thể đến sau lần quét lúc 10:21. Bài này cho thấy hệ thống xử lý luồng quyết định chờ sự kiện trễ tới đâu, và cái giá của mỗi lựa chọn.

## Ý chính

**Hai loại thời gian.** Thời điểm sự kiện (`event_time`) là lúc việc xảy ra; thứ tự đến (`seq`) là lúc hệ thống nhận nó. Cửa sổ gom theo thời điểm sự kiện, nên một sự kiện đến muộn vẫn thuộc cửa sổ cũ của nó.

**Stream time và watermark.** Kafka Streams theo dõi stream time: thời điểm sự kiện lớn nhất đã thấy. Apache Flink dùng watermark với cùng ý: một mốc nói rằng sự kiện cũ hơn mốc đó coi như đã đến hết. Sự kiện có thời điểm nhỏ hơn mốc là sự kiện đến sai thứ tự.

**Ân hạn (grace).** Tài liệu Kafka Streams nói thời gian ân hạn giới hạn mức trễ mà một cửa sổ còn chấp nhận: trong ví dụ của tài liệu, cửa sổ 09:00–10:00 còn nhận sự kiện sai thứ tự tới 10:10, rồi đóng. Sự kiện tới sau khi cửa sổ đã đóng không được tính vào cửa sổ đó nữa. Ân hạn dài thì đúng hơn nhưng kết quả ra muộn hơn.

Bài e-st-l1-03 gặp chuyện dữ liệu trễ ở kho, theo lịch đồng bộ; ở đây là luồng chạy liên tục. Hình cuối mục theo dõi sự kiện 10:08 bị bỏ.

## Cú pháp

```sql
-- stream time after each arrival
max(event_time) OVER (ORDER BY seq)
-- stream time BEFORE each arrival
max(event_time) OVER (
  ORDER BY seq
  ROWS BETWEEN UNBOUNDED PRECEDING
    AND 1 PRECEDING)
-- dropped: its window closed already
seen >= window_end
  + interval '5 minutes'
```

Cửa sổ 10 phút với ân hạn 5 phút trong Kafka Streams (Java, chỉ để đọc):

```text
TimeWindows.ofSizeAndGrace(
  Duration.ofMinutes(10),
  Duration.ofMinutes(5))
```

- `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`: mọi dòng trước, không tính dòng hiện tại.
- Sự kiện đầu tiên không có dòng trước, nên stream time trước nó là NULL.

## Ví dụ

Thứ tự đến và thời điểm sự kiện cạnh nhau:

```sql
SELECT seq, scan_id, event_time
FROM arrivals
ORDER BY seq;
```

Mỗi sự kiện, cửa sổ 10 phút của nó và lúc cửa sổ đóng:

```sql
SELECT seq, event_time,
  date_bin('10 minutes', event_time,
    timestamp '2026-10-31')
    + interval '15 minutes'
    AS closes_at
FROM arrivals
ORDER BY seq;
```

## Lỗi hay gặp

Chỉ so với sự kiện ngay trước: `seq` 8 (10:11) lớn hơn `seq` 7 (10:08) nên trông như đúng thứ tự, dù stream time đã là 10:21.

```sql
-- WRONG: only the previous event
SELECT seq, event_time FROM (
  SELECT seq, event_time,
    lag(event_time) OVER (
      ORDER BY seq) AS prev
  FROM arrivals) a
WHERE event_time < prev
ORDER BY seq;
```

```sql
-- FIX: every earlier event
SELECT seq, event_time FROM (
  SELECT seq, event_time,
    max(event_time) OVER (
      ORDER BY seq
      ROWS BETWEEN UNBOUNDED PRECEDING
        AND 1 PRECEDING) AS seen
  FROM arrivals) a
WHERE event_time < seen
ORDER BY seq;
```

Bỏ quên ân hạn: cửa sổ đóng ngay ở cuối của nó, nên cả sự kiện chỉ trễ vài phút cũng bị bỏ.

```sql
-- WRONG: no grace period
SELECT count(*) AS dropped FROM (
  SELECT event_time,
    date_bin('10 minutes', event_time,
      timestamp '2026-10-31')
      + interval '10 minutes' AS e,
    max(event_time) OVER (
      ORDER BY seq
      ROWS BETWEEN UNBOUNDED PRECEDING
        AND 1 PRECEDING) AS seen
  FROM arrivals) a
WHERE seen >= e;
```

```sql
-- FIX: 5 minutes of grace
SELECT count(*) AS dropped FROM (
  SELECT event_time,
    date_bin('10 minutes', event_time,
      timestamp '2026-10-31')
      + interval '10 minutes' AS e,
    max(event_time) OVER (
      ORDER BY seq
      ROWS BETWEEN UNBOUNDED PRECEDING
        AND 1 PRECEDING) AS seen
  FROM arrivals) a
WHERE seen >= e + interval '5 minutes';
```

## Thực hành

Bốn bước: tính stream time, tìm sự kiện sai thứ tự, tìm sự kiện bị bỏ vì cửa sổ đã đóng, rồi đếm kết quả cuối của mỗi cửa sổ.

## Tóm tắt

- Thời điểm sự kiện khác thứ tự đến; cửa sổ gom theo thời điểm sự kiện.
- Stream time (Kafka Streams) hay watermark (Flink): mốc thời điểm lớn nhất đã thấy.
- Sai thứ tự = thời điểm nhỏ hơn mốc của **mọi** sự kiện trước, không chỉ sự kiện ngay trước.
- Ân hạn quyết định sự kiện trễ nào còn được nhận: dài thì đúng hơn, ngắn thì nhanh hơn.

# EN

## Opening

The hub's scanners send data over a mobile network, so the 10:08 scan can arrive after the 10:21 scan. This lesson shows how a stream processor decides how long to wait for late events, and what each choice costs.

## Key idea

**Two kinds of time.** Event time (`event_time`) is when something happened; arrival order (`seq`) is when the system received it. Windows group by event time, so an event that arrives late still belongs to its old window.

**Stream time and watermarks.** Kafka Streams tracks stream time: the largest event time seen so far. Apache Flink uses watermarks with the same idea: a mark saying that events older than it are considered all arrived. An event whose time is below the mark arrived out of order.

**Grace.** The Kafka Streams docs say a grace period bounds how late an event a window still accepts: in the docs' example, the 09:00–10:00 window accepts out-of-order events until 10:10, then closes. An event arriving after its window closed is no longer counted in that window. A long grace is more complete but gives results later.

Lesson e-st-l1-03 met late data in the warehouse, on a sync schedule; here the stream runs continuously. The figure at the end of this section follows the 10:08 event being dropped.

## Syntax

```sql
-- stream time after each arrival
max(event_time) OVER (ORDER BY seq)
-- stream time BEFORE each arrival
max(event_time) OVER (
  ORDER BY seq
  ROWS BETWEEN UNBOUNDED PRECEDING
    AND 1 PRECEDING)
-- dropped: its window closed already
seen >= window_end
  + interval '5 minutes'
```

A 10-minute window with 5 minutes of grace in Kafka Streams (Java, to read only):

```text
TimeWindows.ofSizeAndGrace(
  Duration.ofMinutes(10),
  Duration.ofMinutes(5))
```

- `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`: every earlier row, not the current one.
- The first event has no earlier row, so the stream time before it is NULL.

## Example

Arrival order and event time side by side:

```sql
SELECT seq, scan_id, event_time
FROM arrivals
ORDER BY seq;
```

Each event, its 10-minute window and when that window closes:

```sql
SELECT seq, event_time,
  date_bin('10 minutes', event_time,
    timestamp '2026-10-31')
    + interval '15 minutes'
    AS closes_at
FROM arrivals
ORDER BY seq;
```

## Common mistakes

Comparing with the previous event only: `seq` 8 (10:11) is above `seq` 7 (10:08), so it looks in order, even though stream time is already 10:21.

```sql
-- WRONG: only the previous event
SELECT seq, event_time FROM (
  SELECT seq, event_time,
    lag(event_time) OVER (
      ORDER BY seq) AS prev
  FROM arrivals) a
WHERE event_time < prev
ORDER BY seq;
```

```sql
-- FIX: every earlier event
SELECT seq, event_time FROM (
  SELECT seq, event_time,
    max(event_time) OVER (
      ORDER BY seq
      ROWS BETWEEN UNBOUNDED PRECEDING
        AND 1 PRECEDING) AS seen
  FROM arrivals) a
WHERE event_time < seen
ORDER BY seq;
```

Forgetting the grace period: the window closes right at its end, so even events only a few minutes late are dropped.

```sql
-- WRONG: no grace period
SELECT count(*) AS dropped FROM (
  SELECT event_time,
    date_bin('10 minutes', event_time,
      timestamp '2026-10-31')
      + interval '10 minutes' AS e,
    max(event_time) OVER (
      ORDER BY seq
      ROWS BETWEEN UNBOUNDED PRECEDING
        AND 1 PRECEDING) AS seen
  FROM arrivals) a
WHERE seen >= e;
```

```sql
-- FIX: 5 minutes of grace
SELECT count(*) AS dropped FROM (
  SELECT event_time,
    date_bin('10 minutes', event_time,
      timestamp '2026-10-31')
      + interval '10 minutes' AS e,
    max(event_time) OVER (
      ORDER BY seq
      ROWS BETWEEN UNBOUNDED PRECEDING
        AND 1 PRECEDING) AS seen
  FROM arrivals) a
WHERE seen >= e + interval '5 minutes';
```

## Practice

Four steps: compute stream time, find out-of-order events, find the events dropped because their window had closed, then count each window's final result.

## Recap

- Event time differs from arrival order; windows group by event time.
- Stream time (Kafka Streams) or a watermark (Flink): the mark of the largest event time seen.
- Out of order = a time below the mark of **all** earlier events, not just the one before.
- Grace decides which late events are still accepted: longer is more complete, shorter is faster.
