---
id: e-sm-l1-02
engine: stream
level: L1
module: log
title: Nhật ký chỉ ghi thêm, offset và vị trí consumer
title_en: An append-only log, offsets and consumer positions
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sm-log-offsets, at: idea }]
objectives:
  - vi: Mô hình một nhật ký sự kiện bằng một bảng chỉ ghi thêm, mỗi dòng một offset.
    en: Model an event log as an append-only table, one offset per row.
  - vi: Đọc lô kế tiếp của một nhóm consumer từ vị trí đã lưu, và tính độ trễ (lag).
    en: Read a consumer group's next batch from its saved position, and compute its lag.
  - vi: Lưu vị trí đúng nghĩa của Kafka, offset của sự kiện kế tiếp cần đọc.
    en: Save the position the way Kafka means it, the offset of the next event to read.
requires: [e-sm-l1-01]
sources:
  - { url: "https://kafka.apache.org/41/getting-started/introduction/#main-concepts-and-terminology", title: "Kafka docs: Main concepts and terminology" }
  - { url: "https://kafka.apache.org/41/design/design/", title: "Kafka docs: Design (consumer position, offsets)" }
  - { url: "https://www.postgresql.org/docs/18/plpgsql-trigger.html", title: "PostgreSQL 18 docs: Trigger functions" }
lab:
  setup: |
    CREATE TABLE events (
      msg_offset int PRIMARY KEY,
      shipment_id text NOT NULL,
      status text NOT NULL,
      event_time timestamp NOT NULL
    );
    INSERT INTO events VALUES
      (0, 'SHP-101', 'booked', '2026-10-31 08:00'),
      (1, 'SHP-102', 'booked', '2026-10-31 08:05'),
      (2, 'SHP-101', 'picked_up', '2026-10-31 09:10'),
      (3, 'SHP-103', 'booked', '2026-10-31 09:20'),
      (4, 'SHP-102', 'picked_up', '2026-10-31 10:00'),
      (5, 'SHP-101', 'in_transit', '2026-10-31 11:30'),
      (6, 'SHP-103', 'picked_up', '2026-10-31 12:15'),
      (7, 'SHP-102', 'delivered', '2026-10-31 15:40');
    CREATE TABLE consumer_offsets (
      group_id text PRIMARY KEY,
      next_offset int NOT NULL
    );
    INSERT INTO consumer_offsets VALUES
      ('billing', 3), ('tracking', 6);
    CREATE FUNCTION append_only() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'events is append-only';
    END $$;
    CREATE TRIGGER events_append_only
      BEFORE UPDATE OR DELETE ON events
      FOR EACH ROW EXECUTE FUNCTION append_only();
  steps:
    - task:
        vi: "Nhóm `billing` đọc tiếp từ vị trí đã lưu. Trả lô 3 sự kiện kế tiếp của nhóm: `msg_offset`, `shipment_id`, `status`, xếp theo offset tăng dần."
        en: "Group `billing` reads on from its saved position. Return the group's next batch of 3 events: `msg_offset`, `shipment_id`, `status`, sorted by offset ascending."
      solution: |
        SELECT e.msg_offset, e.shipment_id,
          e.status
        FROM events e
        JOIN consumer_offsets c
          ON c.group_id = 'billing'
        WHERE e.msg_offset >= c.next_offset
        ORDER BY e.msg_offset
        LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`next_offset` là offset của sự kiện kế tiếp cần đọc, nên điều kiện là `>=`, không phải `>`."
        en: "`next_offset` is the offset of the next event to read, so the condition is `>=`, not `>`."
    - task:
        vi: "Độ trễ (lag) của mỗi nhóm là số sự kiện nhóm chưa đọc: offset cuối của nhật ký cộng 1, trừ `next_offset`. Trả `group_id`, `lag`."
        en: "Each group's lag is the number of events it has not read yet: the log's last offset plus 1, minus `next_offset`. Return `group_id`, `lag`."
      solution: |
        SELECT c.group_id,
          (SELECT max(msg_offset) + 1
             FROM events) - c.next_offset
            AS lag
        FROM consumer_offsets c
      check: rows
      hint:
        vi: "Offset kế tiếp sẽ được ghi là `max(msg_offset) + 1`; trừ `next_offset` của nhóm."
        en: "The next offset to be written is `max(msg_offset) + 1`; subtract the group's `next_offset`."
    - task:
        vi: "`billing` đã xử lý xong offset 3, 4 và 5. Lưu vị trí mới của nhóm (offset kế tiếp cần đọc) và trả lại dòng vừa đổi."
        en: "`billing` has finished offsets 3, 4 and 5. Save the group's new position (the next offset to read) and return the row you changed."
      solution: |
        UPDATE consumer_offsets
        SET next_offset = 6
        WHERE group_id = 'billing'
        RETURNING group_id, next_offset
      after: SELECT group_id, next_offset FROM consumer_offsets ORDER BY group_id
      check: rows
      ordered: true
      hint:
        vi: "Lưu offset của sự kiện kế tiếp, tức 5 + 1 = 6, không phải 5."
        en: "Save the offset of the next event, 5 + 1 = 6, not 5."
quiz:
  - q:
      vi: "Nhóm `tracking` lưu `next_offset` = 6. Sau khi khởi động lại, nó đọc tiếp từ sự kiện nào?"
      en: "Group `tracking` saved `next_offset` = 6. After a restart, which event does it read next?"
    options:
      - { vi: "Offset 7, vì 6 đã được ghi lại là đã đọc", en: "Offset 7, because 6 was recorded as read" }
      - { vi: "Offset 6, vì đó là sự kiện kế tiếp cần đọc", en: "Offset 6, because it is the next event to read" }
      - { vi: "Offset 0, vì consumer luôn đọc lại từ đầu", en: "Offset 0, because a consumer always rereads from the start" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu coi số đã lưu là sự kiện cuối đã đọc, nhưng Kafka định nghĩa vị trí của consumer là offset của sự kiện kế tiếp cần đọc. Vì vậy nhóm đọc lại đúng từ offset 6. Đọc từ 0 chỉ xảy ra khi nhóm chưa lưu vị trí nào và được cấu hình đọc từ đầu."
      en: "It sounds right if the saved number is taken as the last event read, but Kafka defines a consumer's position as the offset of the next event to read. So the group resumes exactly at offset 6. Reading from 0 only happens when the group has saved no position and is configured to start from the beginning."
  - q:
      vi: "Một sự kiện trong nhật ký bị ghi sai trạng thái. Cách sửa nào giữ đúng tinh thần nhật ký chỉ ghi thêm?"
      en: "An event in the log has the wrong status. Which fix keeps to the spirit of an append-only log?"
    options:
      - { vi: "`UPDATE` dòng đó cho đúng trạng thái", en: "`UPDATE` that row to the right status" }
      - { vi: "Ghi thêm một sự kiện mới sửa lại trạng thái", en: "Append a new event that corrects the status" }
      - { vi: "Xóa dòng đó rồi chèn lại cùng offset", en: "Delete the row and insert it again at the same offset" }
    answer: 1
    trap: 2
    why:
      vi: "Xóa rồi chèn lại cùng offset trông như không đổi gì, nhưng consumer đã đọc offset đó sẽ không bao giờ đọc lại, nên các bên thấy hai sự thật khác nhau. Nhật ký chỉ ghi thêm: sửa sai bằng một sự kiện mới ở cuối, để mọi consumer cùng nhận bản sửa theo thứ tự. `UPDATE` cũng phá điều đó, và bảng `events` trong lab chặn nó bằng trigger."
      en: "Deleting and reinserting at the same offset looks like no change, but a consumer that already read that offset will never read it again, so readers end up with two different truths. A log is append-only: fix a mistake with a new event at the end, so every consumer gets the correction in order. `UPDATE` breaks that too, and the lab's `events` table blocks it with a trigger."
---
## Mở bài

Đội giao vận của Cargo Query ghi mọi thay đổi trạng thái lô hàng vào một nhật ký, và nhiều đội khác đọc nhật ký đó theo nhịp riêng. Bài này dựng lại nhật ký bằng một bảng PostgreSQL: offset là số thứ tự, mỗi nhóm consumer giữ vị trí của mình.

## Ý chính

**Nhật ký chỉ ghi thêm.** Kafka lưu sự kiện vào các topic; mỗi sự kiện mới được nối vào cuối một partition và nhận một offset tăng dần. Sự kiện không bị xóa khi có người đọc: topic giữ chúng theo cấu hình thời hạn lưu (retention). Ở đây bảng `events` đóng vai một partition: `msg_offset` là offset, và một trigger chặn `UPDATE`/`DELETE` để bảng chỉ được ghi thêm.

**Vị trí của consumer.** Tài liệu Kafka nói vị trí của consumer trong một partition "chỉ là một số nguyên": offset của sự kiện kế tiếp cần đọc. Mỗi nhóm consumer (consumer group) lưu số đó riêng, nên `billing` và `tracking` đọc cùng một nhật ký mà không ảnh hưởng nhau. Bảng `consumer_offsets` giữ số đó cho từng nhóm.

**Độ trễ (lag).** Lag là số sự kiện đã ghi mà nhóm chưa đọc: offset sẽ được ghi tiếp theo trừ vị trí của nhóm. Lag tăng nghĩa là consumer chậm hơn tốc độ ghi.

Bài này chỉ có một partition; bài sau chia nhật ký thành nhiều partition theo khóa. Hình cuối mục cho thấy hai nhóm đứng ở hai vị trí khác nhau trên cùng một nhật ký.

## Cú pháp

```sql
-- the next batch from a saved position
WHERE msg_offset >= next_offset
ORDER BY msg_offset LIMIT 3
-- lag: next offset to write - position
(SELECT max(msg_offset) + 1
   FROM events) - next_offset
-- commit: the NEXT offset to read
UPDATE consumer_offsets
SET next_offset = 6
WHERE group_id = 'billing';
```

- `next_offset`: offset của sự kiện kế tiếp cần đọc, không phải sự kiện cuối đã đọc.
- Trong Kafka, việc lưu vị trí gọi là commit offset; ở đây nó là một câu `UPDATE`.

## Ví dụ

Nhật ký theo thứ tự offset: mỗi dòng là một sự kiện, không dòng nào bị sửa.

```sql
SELECT msg_offset, shipment_id, status
FROM events
ORDER BY msg_offset;
```

Vị trí đã lưu của hai nhóm consumer:

```sql
SELECT group_id, next_offset
FROM consumer_offsets
ORDER BY group_id;
```

Những gì `tracking` còn phải đọc:

```sql
SELECT e.msg_offset, e.status
FROM events e
JOIN consumer_offsets c
  ON c.group_id = 'tracking'
WHERE e.msg_offset >= c.next_offset
ORDER BY e.msg_offset;
```

## Lỗi hay gặp

Dùng `>` thay cho `>=` làm nhóm bỏ qua sự kiện ở đúng vị trí đã lưu:

```sql
-- WRONG: skips offset 3
SELECT e.msg_offset FROM events e
JOIN consumer_offsets c
  ON c.group_id = 'billing'
WHERE e.msg_offset > c.next_offset
ORDER BY 1 LIMIT 3;
```

```sql
-- FIX: the saved offset is still unread
SELECT e.msg_offset FROM events e
JOIN consumer_offsets c
  ON c.group_id = 'billing'
WHERE e.msg_offset >= c.next_offset
ORDER BY 1 LIMIT 3;
```

Lấy offset lớn nhất trừ vị trí làm lag thiếu một sự kiện:

```sql
-- WRONG: one short
SELECT group_id,
  (SELECT max(msg_offset) FROM events)
    - next_offset AS lag
FROM consumer_offsets;
```

```sql
-- FIX: the next offset to write
SELECT group_id,
  (SELECT max(msg_offset) + 1
     FROM events) - next_offset AS lag
FROM consumer_offsets;
```

Sửa một sự kiện đã ghi: trigger của nhật ký từ chối.

```sql
-- ERROR P0001
UPDATE events SET status = 'lost'
WHERE msg_offset = 4;
```

## Thực hành

Ba bước: đọc lô kế tiếp của `billing`, tính lag của từng nhóm, rồi lưu vị trí mới sau khi xử lý xong lô.

## Tóm tắt

- Nhật ký chỉ ghi thêm: sự kiện mới vào cuối với offset tăng dần, sửa sai bằng một sự kiện mới.
- Vị trí của consumer là offset của sự kiện kế tiếp cần đọc; đọc bằng `>=`.
- Mỗi nhóm consumer giữ vị trí riêng trên cùng một nhật ký.
- Lag = offset sẽ ghi tiếp theo trừ vị trí của nhóm.

# EN

## Opening

Cargo Query's operations team writes every shipment status change to a log, and several other teams read that log at their own pace. This lesson rebuilds the log as a PostgreSQL table: the offset is the sequence number, and each consumer group keeps its own position.

## Key idea

**An append-only log.** Kafka stores events in topics; each new event is appended to the end of a partition and gets an increasing offset. Events are not deleted when someone reads them: a topic keeps them for a configured retention period. Here the `events` table plays one partition: `msg_offset` is the offset, and a trigger blocks `UPDATE`/`DELETE` so the table can only be appended to.

**A consumer's position.** The Kafka docs say a consumer's position in a partition is "just a single integer": the offset of the next event to read. Each consumer group saves that number on its own, so `billing` and `tracking` read the same log without affecting each other. The `consumer_offsets` table keeps that number per group.

**Lag.** Lag is the number of events written that the group has not read yet: the offset to be written next minus the group's position. Growing lag means the consumer is slower than the writers.

This lesson has one partition; the next one splits the log into partitions by key. The figure at the end of this section shows two groups standing at two different positions on one log.

## Syntax

```sql
-- the next batch from a saved position
WHERE msg_offset >= next_offset
ORDER BY msg_offset LIMIT 3
-- lag: next offset to write - position
(SELECT max(msg_offset) + 1
   FROM events) - next_offset
-- commit: the NEXT offset to read
UPDATE consumer_offsets
SET next_offset = 6
WHERE group_id = 'billing';
```

- `next_offset`: the offset of the next event to read, not of the last event read.
- In Kafka, saving the position is called committing the offset; here it is one `UPDATE`.

## Example

The log in offset order: each row is one event, and no row is ever changed.

```sql
SELECT msg_offset, shipment_id, status
FROM events
ORDER BY msg_offset;
```

The saved positions of the two consumer groups:

```sql
SELECT group_id, next_offset
FROM consumer_offsets
ORDER BY group_id;
```

What `tracking` still has to read:

```sql
SELECT e.msg_offset, e.status
FROM events e
JOIN consumer_offsets c
  ON c.group_id = 'tracking'
WHERE e.msg_offset >= c.next_offset
ORDER BY e.msg_offset;
```

## Common mistakes

Using `>` instead of `>=` makes the group skip the event at exactly its saved position:

```sql
-- WRONG: skips offset 3
SELECT e.msg_offset FROM events e
JOIN consumer_offsets c
  ON c.group_id = 'billing'
WHERE e.msg_offset > c.next_offset
ORDER BY 1 LIMIT 3;
```

```sql
-- FIX: the saved offset is still unread
SELECT e.msg_offset FROM events e
JOIN consumer_offsets c
  ON c.group_id = 'billing'
WHERE e.msg_offset >= c.next_offset
ORDER BY 1 LIMIT 3;
```

Taking the largest offset minus the position as the lag is one event short:

```sql
-- WRONG: one short
SELECT group_id,
  (SELECT max(msg_offset) FROM events)
    - next_offset AS lag
FROM consumer_offsets;
```

```sql
-- FIX: the next offset to write
SELECT group_id,
  (SELECT max(msg_offset) + 1
     FROM events) - next_offset AS lag
FROM consumer_offsets;
```

Changing an event already written: the log's trigger refuses.

```sql
-- ERROR P0001
UPDATE events SET status = 'lost'
WHERE msg_offset = 4;
```

## Practice

Three steps: read `billing`'s next batch, compute each group's lag, then save the new position once the batch is done.

## Recap

- An append-only log: new events go at the end with increasing offsets; a mistake is fixed with a new event.
- A consumer's position is the offset of the next event to read; read with `>=`.
- Each consumer group keeps its own position on the same log.
- Lag = the offset to be written next minus the group's position.
