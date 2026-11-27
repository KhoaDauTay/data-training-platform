---
id: e-sm-l1-01
engine: stream
level: L1
module: log
title: Sự kiện và trạng thái
title_en: Events and state
kind: concept
runtime: browser
minutes: 15
figures: [{ name: sm-events-state, at: idea }]
objectives:
  - vi: Phân biệt một bảng trạng thái (giá trị hiện tại) với một dòng sự kiện (mọi thay đổi theo thời gian).
    en: Tell a state table (the current value) from a stream of events (every change over time).
  - vi: Dựng lại trạng thái hiện tại từ sự kiện bằng dòng mới nhất của mỗi khóa.
    en: Rebuild the current state from events with the newest row per key.
  - vi: Biết câu hỏi nào chỉ sự kiện trả lời được.
    en: Know which questions only events can answer.
requires: []
sources:
  - { url: "https://kafka.apache.org/41/getting-started/introduction/#main-concepts-and-terminology", title: "Kafka docs: Main concepts and terminology", title_vi: "Tài liệu Kafka: khái niệm và thuật ngữ chính (thứ tự trong từng partition)" }
  - { url: "https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT", title: "PostgreSQL 18 docs: SELECT DISTINCT ON", title_vi: "SELECT DISTINCT ON" }
lab:
  setup: |
    CREATE TABLE shipment_events (
      event_id int PRIMARY KEY,
      shipment_id text NOT NULL,
      status text NOT NULL,
      event_time timestamp NOT NULL
    );
    INSERT INTO shipment_events VALUES
      (1, 'SHP-101', 'booked', '2026-10-31 08:00'),
      (2, 'SHP-102', 'booked', '2026-10-31 08:05'),
      (3, 'SHP-101', 'picked_up', '2026-10-31 09:10'),
      (4, 'SHP-103', 'booked', '2026-10-31 09:20'),
      (5, 'SHP-102', 'picked_up', '2026-10-31 10:00'),
      (6, 'SHP-101', 'in_transit', '2026-10-31 11:30'),
      (7, 'SHP-103', 'picked_up', '2026-10-31 12:15'),
      (8, 'SHP-102', 'delivered', '2026-10-31 15:40');
    CREATE TABLE shipments (
      shipment_id text PRIMARY KEY,
      status text NOT NULL,
      updated_at timestamp NOT NULL
    );
    INSERT INTO shipments VALUES
      ('SHP-101', 'in_transit', '2026-10-31 11:30'),
      ('SHP-102', 'delivered', '2026-10-31 15:40'),
      ('SHP-103', 'picked_up', '2026-10-31 12:15');
  steps:
    - task:
        vi: "Dựng lại trạng thái hiện tại của mỗi lô hàng chỉ từ `shipment_events`: trả `shipment_id`, `status`."
        en: "Rebuild each shipment's current status from `shipment_events` alone: return `shipment_id`, `status`."
      solution: |
        SELECT DISTINCT ON (shipment_id)
          shipment_id, status
        FROM shipment_events
        ORDER BY shipment_id, event_time DESC
      check: rows
      hint:
        vi: "`DISTINCT ON (shipment_id)` giữ dòng đầu của mỗi lô; xếp `event_time DESC` để dòng đầu là sự kiện mới nhất."
        en: "`DISTINCT ON (shipment_id)` keeps the first row per shipment; sort by `event_time DESC` so that row is the newest event."
    - task:
        vi: "Mỗi lô hàng đã đổi trạng thái bao nhiêu lần, tính cả lần đặt chỗ? Trả `shipment_id`, `changes`."
        en: "How many times has each shipment changed status, booking included? Return `shipment_id`, `changes`."
      solution: |
        SELECT shipment_id, count(*) AS changes
        FROM shipment_events
        GROUP BY shipment_id
      check: rows
      hint:
        vi: "Bảng `shipments` chỉ giữ một dòng mỗi lô; câu này phải đếm trên `shipment_events`."
        en: "The `shipments` table keeps one row per shipment; this question must count `shipment_events`."
quiz:
  - q:
      vi: "Quản lý hỏi: hôm nay lô SHP-101 nằm ở trạng thái `picked_up` bao lâu? Bảng nào trả lời được?"
      en: "A manager asks: how long was SHP-101 in status `picked_up` today? Which table can answer?"
    options:
      - { vi: "`shipments`, vì nó có cột `updated_at`", en: "`shipments`, because it has an `updated_at` column" }
      - { vi: "Không bảng nào, vì thời gian không được lưu", en: "Neither, because durations are not stored" }
      - { vi: "`shipment_events`, vì nó giữ mọi lần đổi", en: "`shipment_events`, because it keeps every change" }
    answer: 2
    trap: 0
    why:
      vi: "`updated_at` nghe như đủ, nhưng nó chỉ là giờ của lần đổi cuối (11:30, sang `in_transit`); giờ vào `picked_up` (09:10) đã bị ghi đè. `shipment_events` giữ cả hai sự kiện, nên lấy 11:30 trừ 09:10 ra 2 giờ 20 phút."
      en: "`updated_at` sounds enough, but it is only the time of the last change (11:30, into `in_transit`); the time it entered `picked_up` (09:10) was overwritten. `shipment_events` keeps both events, so 11:30 minus 09:10 gives 2 hours 20 minutes."
  - q:
      vi: "Một đội muốn bảng trạng thái hiện tại nhưng chỉ nhận được dòng sự kiện. Họ cần làm gì?"
      en: "A team wants a current-status table but only receives the event stream. What do they need to do?"
    options:
      - { vi: "Giữ sự kiện mới nhất của mỗi khóa", en: "Keep the newest event per key" }
      - { vi: "Cộng tất cả sự kiện của mỗi khóa", en: "Add up all events per key" }
      - { vi: "Lấy sự kiện đầu tiên của mỗi khóa", en: "Take the first event per key" }
    answer: 0
    trap: 2
    why:
      vi: "Sự kiện đầu tiên chỉ cho biết lô hàng bắt đầu thế nào (`booked`). Trạng thái hiện tại là kết quả của sự kiện mới nhất, nên giữ dòng mới nhất của mỗi khóa, như `DISTINCT ON` ở bước 1. Cộng dồn chỉ đúng khi sự kiện là một lượng, ví dụ số tiền."
      en: "The first event only tells how the shipment started (`booked`). The current status is the result of the newest event, so keep the newest row per key, as `DISTINCT ON` does in step 1. Adding up is only right when events carry an amount, such as money."
---
## Mở bài

Cargo Query có hai cách lưu cùng một sự thật: bảng `shipments` giữ trạng thái hiện tại của mỗi lô, và bảng `shipment_events` ghi lại từng lần đổi. Khóa học này xoay quanh cách thứ hai, vì đó là thứ Kafka và CDC chuyển đi.

## Ý chính

**Trạng thái** là giá trị hiện tại: một dòng mỗi lô hàng, bị ghi đè mỗi lần đổi. Nó trả lời nhanh câu "bây giờ thế nào", nhưng quên mất lịch sử.

**Sự kiện** là một việc đã xảy ra: "lô SHP-101 chuyển sang `picked_up` lúc 09:10". Tài liệu Kafka mô tả một sự kiện có khóa, giá trị và thời điểm. Sự kiện không bị sửa; lần đổi sau là một sự kiện mới.

**Hai cách nhìn đổi được cho nhau.** Từ dòng sự kiện, lấy sự kiện mới nhất của mỗi khóa là ra trạng thái. Ngược lại, từ bảng trạng thái không dựng lại được lịch sử. Vì vậy các hệ thống truyền sự kiện, và ai cần trạng thái thì tự gom lại.

Hình cuối mục cho thấy ba sự kiện của một lô gom lại thành một dòng trạng thái.

## Ví dụ

Mọi sự kiện của lô SHP-101, theo thời gian:

```sql
SELECT event_id, status, event_time
FROM shipment_events
WHERE shipment_id = 'SHP-101'
ORDER BY event_time;
```

Bảng trạng thái chỉ còn một dòng cho mỗi lô:

```sql
SELECT shipment_id, status, updated_at
FROM shipments
ORDER BY shipment_id;
```

Thời gian SHP-101 ở trạng thái `picked_up`, chỉ tính được từ sự kiện:

```sql
SELECT max(event_time) FILTER (
    WHERE status = 'in_transit')
  - max(event_time) FILTER (
    WHERE status = 'picked_up')
    AS picked_up_for
FROM shipment_events
WHERE shipment_id = 'SHP-101';
```

## Lỗi hay gặp

Lấy `max(status)` để có trạng thái mới nhất: `max` so chữ theo bảng chữ cái, không theo thời gian.

```sql
-- WRONG: alphabetical, not newest
SELECT shipment_id,
  max(status) AS status
FROM shipment_events
GROUP BY shipment_id
ORDER BY shipment_id;
```

```sql
-- FIX: newest event per key
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM shipment_events
ORDER BY shipment_id, event_time DESC;
```

Đếm số lần đổi trạng thái trên bảng trạng thái chỉ ra một lần mỗi lô:

```sql
-- WRONG: one row per shipment
SELECT count(*) AS changes
FROM shipments;
```

```sql
-- FIX: count the events
SELECT count(*) AS changes
FROM shipment_events;
```

## Tóm tắt

- Trạng thái là giá trị hiện tại, bị ghi đè; sự kiện là một việc đã xảy ra, không bị sửa.
- Sự kiện mới nhất của mỗi khóa cho ra trạng thái; trạng thái không cho lại được lịch sử.
- Câu hỏi về thời gian và số lần đổi cần sự kiện.
- Kafka và CDC chuyển sự kiện; ai cần trạng thái thì tự gom lại.

# EN

## Opening

Cargo Query keeps the same truth in two ways: the `shipments` table holds each shipment's current status, and the `shipment_events` table records every change. This course is about the second way, because that is what Kafka and CDC move around.

## Key idea

**State** is the current value: one row per shipment, overwritten at every change. It answers "what is it now" quickly, but it forgets history.

**An event** is something that happened: "shipment SHP-101 moved to `picked_up` at 09:10". The Kafka docs describe an event as having a key, a value and a timestamp. An event is never changed; the next change is a new event.

**The two views convert one way.** From the event stream, the newest event per key gives the state. From a state table you cannot rebuild the history. That is why systems pass events around, and whoever needs state folds them up themselves.

The figure at the end of this section shows three events of one shipment folding into one state row.

## Example

Every event of shipment SHP-101, in time order:

```sql
SELECT event_id, status, event_time
FROM shipment_events
WHERE shipment_id = 'SHP-101'
ORDER BY event_time;
```

The state table keeps only one row per shipment:

```sql
SELECT shipment_id, status, updated_at
FROM shipments
ORDER BY shipment_id;
```

How long SHP-101 was `picked_up`, which only the events can tell:

```sql
SELECT max(event_time) FILTER (
    WHERE status = 'in_transit')
  - max(event_time) FILTER (
    WHERE status = 'picked_up')
    AS picked_up_for
FROM shipment_events
WHERE shipment_id = 'SHP-101';
```

## Common mistakes

Taking `max(status)` as the newest status: `max` compares text alphabetically, not by time.

```sql
-- WRONG: alphabetical, not newest
SELECT shipment_id,
  max(status) AS status
FROM shipment_events
GROUP BY shipment_id
ORDER BY shipment_id;
```

```sql
-- FIX: newest event per key
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM shipment_events
ORDER BY shipment_id, event_time DESC;
```

Counting status changes on the state table gives one per shipment:

```sql
-- WRONG: one row per shipment
SELECT count(*) AS changes
FROM shipments;
```

```sql
-- FIX: count the events
SELECT count(*) AS changes
FROM shipment_events;
```

## Recap

- State is the current value and gets overwritten; an event is something that happened and is never changed.
- The newest event per key gives the state; the state cannot give back the history.
- Questions about durations and numbers of changes need events.
- Kafka and CDC move events; whoever needs state folds them up.
