---
id: e-sm-l1-03
engine: stream
level: L1
module: log
title: Partition và thứ tự theo khóa
title_en: Partitions and ordering per key
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sm-partitions, at: idea }]
objectives:
  - vi: Giải thích vì sao sự kiện cùng khóa luôn vào cùng một partition.
    en: Explain why events with the same key always go to the same partition.
  - vi: Biết thứ tự chỉ được bảo đảm trong một partition, không giữa các partition.
    en: Know that order is guaranteed within a partition, not across partitions.
  - vi: Tính độ trễ của một nhóm consumer theo từng partition.
    en: Compute a consumer group's lag per partition.
requires: [e-sm-l1-02]
sources:
  - { url: "https://kafka.apache.org/41/getting-started/introduction/#main-concepts-and-terminology", title: "Kafka docs: Main concepts and terminology (partitions, ordering)", title_vi: "Tài liệu Kafka: khái niệm và thuật ngữ chính (thứ tự trong từng partition)" }
  - { url: "https://kafka.apache.org/41/configuration/producer-configs/", title: "Kafka docs: Producer configs (partitioner.class)", title_vi: "Tài liệu Kafka: cấu hình producer (partitioner.class)" }
  - { url: "https://www.postgresql.org/docs/18/functions-math.html", title: "PostgreSQL 18 docs: Mathematical functions", title_vi: "Hàm toán học" }
lab:
  setup: |
    CREATE TABLE topic_log (
      partition_id int NOT NULL,
      msg_offset int NOT NULL,
      shipment_id text NOT NULL,
      status text NOT NULL,
      event_time timestamp NOT NULL,
      PRIMARY KEY (partition_id, msg_offset)
    );
    INSERT INTO topic_log VALUES
      (0, 0, 'SHP-101', 'booked', '2026-10-31 08:00'),
      (0, 1, 'SHP-104', 'booked', '2026-10-31 08:20'),
      (0, 2, 'SHP-101', 'picked_up', '2026-10-31 09:10'),
      (0, 3, 'SHP-104', 'picked_up', '2026-10-31 10:40'),
      (0, 4, 'SHP-101', 'in_transit', '2026-10-31 14:00'),
      (1, 0, 'SHP-108', 'booked', '2026-10-31 08:30'),
      (1, 1, 'SHP-108', 'picked_up', '2026-10-31 10:00'),
      (2, 0, 'SHP-103', 'booked', '2026-10-31 09:20'),
      (2, 1, 'SHP-103', 'picked_up', '2026-10-31 12:15'),
      (2, 2, 'SHP-103', 'in_transit', '2026-10-31 13:00'),
      (2, 3, 'SHP-103', 'delivered', '2026-10-31 16:00');
    CREATE TABLE consumer_offsets (
      group_id text NOT NULL,
      partition_id int NOT NULL,
      next_offset int NOT NULL,
      PRIMARY KEY (group_id, partition_id)
    );
    INSERT INTO consumer_offsets VALUES
      ('tracking', 0, 1), ('tracking', 1, 2),
      ('tracking', 2, 2);
  steps:
    - task:
        vi: "Topic có 3 partition, và lab chọn partition bằng `abs(hashtext(key)) % 3` (key là mã lô). Sự kiện đầu tiên của lô SHP-105 sẽ vào partition nào? Trả một cột `partition_id`."
        en: "The topic has 3 partitions, and the lab picks one with `abs(hashtext(key)) % 3`. Which partition will shipment SHP-105's first event go to? Return one column `partition_id`."
      solution: |
        SELECT abs(hashtext('SHP-105')) % 3
          AS partition_id
      check: rows
      hint:
        vi: "`hashtext` có thể ra số âm, nên lấy `abs` trước khi chia lấy dư."
        en: "`hashtext` can return a negative number, so take `abs` before the remainder."
    - task:
        vi: "Kiểm tra mọi sự kiện của một lô nằm trong cùng một partition: với mỗi lô, trả `shipment_id` và `partitions` (số partition khác nhau chứa sự kiện của nó)."
        en: "Check that all events of a shipment sit in one partition: for each shipment, return `shipment_id` and `partitions` (the number of different partitions holding its events)."
      solution: |
        SELECT shipment_id,
          count(DISTINCT partition_id)
            AS partitions
        FROM topic_log
        GROUP BY shipment_id
      check: rows
      hint:
        vi: "`count(DISTINCT partition_id)` đếm partition khác nhau, không đếm sự kiện."
        en: "`count(DISTINCT partition_id)` counts different partitions, not events."
    - task:
        vi: "Nhóm `tracking` lưu một vị trí cho từng partition. Tính lag của nhóm ở từng partition (offset sẽ ghi tiếp của partition đó trừ vị trí): trả `partition_id`, `lag`."
        en: "Group `tracking` saves one position per partition. Compute the group's lag in each partition (that partition's next offset to write minus the position): return `partition_id`, `lag`."
      solution: |
        SELECT c.partition_id,
          max(t.msg_offset) + 1
            - c.next_offset AS lag
        FROM consumer_offsets c
        JOIN topic_log t
          USING (partition_id)
        WHERE c.group_id = 'tracking'
        GROUP BY c.partition_id, c.next_offset
      check: rows
      hint:
        vi: "Offset chỉ có nghĩa trong một partition: lấy `max(msg_offset) + 1` của chính partition đó (nối theo `partition_id`)."
        en: "An offset only means something within one partition: take `max(msg_offset) + 1` of that partition itself (join on `partition_id`)."
quiz:
  - q:
      vi: "Hai sự kiện của SHP-101 ghi lúc 09:10 và 14:00 vào partition 0. Consumer có thể đọc sự kiện 14:00 trước không?"
      en: "Two events of SHP-101 were written at 09:10 and 14:00 to partition 0. Can a consumer read the 14:00 event first?"
    options:
      - { vi: "Có, nếu consumer đó chạy nhanh hơn", en: "Yes, if that consumer runs faster" }
      - { vi: "Có, vì Kafka không giữ thứ tự", en: "Yes, because Kafka keeps no order" }
      - { vi: "Không, trong một partition đọc theo thứ tự ghi", en: "No, a partition is read in write order" }
    answer: 2
    trap: 1
    why:
      vi: "Kafka không giữ thứ tự giữa các partition, nên câu này nghe đúng; nhưng cả hai sự kiện ở cùng partition 0, và tài liệu Kafka bảo đảm consumer đọc một partition đúng theo thứ tự đã ghi. Tốc độ consumer không đổi thứ tự đó."
      en: "Kafka keeps no order across partitions, so this sounds right; but both events are in partition 0, and the Kafka docs guarantee that a consumer reads a partition in exactly the order it was written. Consumer speed does not change that order."
  - q:
      vi: "Partition 0 có offset lớn nhất là 4, partition 2 là 3. Sự kiện nào được ghi sau cùng trong topic?"
      en: "Partition 0's largest offset is 4, partition 2's is 3. Which event was written last in the topic?"
    options:
      - { vi: "Không biết được từ offset; phải xem thời điểm", en: "Offsets cannot tell; look at the timestamps" }
      - { vi: "Sự kiện offset 4, vì 4 lớn hơn 3", en: "The offset 4 event, because 4 is larger than 3" }
      - { vi: "Sự kiện offset 3, vì partition 2 lớn hơn", en: "The offset 3 event, because partition 2 is larger" }
    answer: 0
    trap: 1
    why:
      vi: "So 4 với 3 trông tự nhiên, nhưng mỗi partition đếm offset riêng từ 0, nên offset của hai partition không so được với nhau. Ở đây offset 4 của partition 0 ghi lúc 14:00, còn offset 3 của partition 2 ghi lúc 16:00. Muốn biết thứ tự toàn topic phải dựa vào thời điểm của sự kiện."
      en: "Comparing 4 with 3 feels natural, but each partition counts its offsets from 0 on its own, so offsets of two partitions cannot be compared. Here partition 0's offset 4 was written at 14:00, while partition 2's offset 3 was written at 16:00. Ordering across the topic has to rely on the events' timestamps."
---
## Mở bài

Một nhật ký duy nhất không theo kịp hàng nghìn lô hàng, nên Kafka chia topic thành nhiều partition. Bài này cho thấy cái giá của việc chia: thứ tự chỉ còn đúng trong từng partition, và vì vậy khóa của sự kiện rất quan trọng.

## Ý chính

**Partition.** Một topic được chia thành nhiều partition, mỗi partition là một nhật ký chỉ ghi thêm với offset riêng bắt đầu từ 0. Các partition nằm trên nhiều máy, nên nhiều consumer đọc song song được.

**Cùng khóa, cùng partition.** Tài liệu Kafka nói sự kiện có cùng khóa (ví dụ mã lô hàng) được ghi vào cùng một partition. Khi sự kiện có khóa, producer chọn partition dựa trên giá trị băm (hash) của khóa. Lab dùng `abs(hashtext(...)) % 3` của PostgreSQL thay cho hàm băm của Kafka: con số khác, nhưng ý giống nhau.

**Thứ tự.** Kafka bảo đảm consumer đọc một partition đúng thứ tự đã ghi. Giữa các partition thì không có thứ tự chung, và offset của hai partition không so được với nhau. Vì vậy hãy chọn khóa sao cho những sự kiện cần đúng thứ tự (mọi lần đổi của một lô) có cùng khóa.

**Lag theo partition.** Nhóm consumer lưu một vị trí cho mỗi partition, nên lag cũng tính riêng từng partition. Hình cuối mục cho thấy ba khóa đi vào ba partition.

## Cú pháp

```sql
-- the lab's stand-in for Kafka's hash
abs(hashtext('SHP-105')) % 3
-- one key, one partition?
count(DISTINCT partition_id)
-- lag per partition
max(t.msg_offset) + 1 - c.next_offset
JOIN topic_log t USING (partition_id)
```

- `hashtext`: hàm băm chữ có sẵn của PostgreSQL; nó có thể trả số âm.
- `%`: phép chia lấy dư, cho ra số partition từ 0 tới 2.

## Ví dụ

Mỗi partition là một nhật ký riêng, offset bắt đầu lại từ 0:

```sql
SELECT partition_id, msg_offset,
  shipment_id, status
FROM topic_log
ORDER BY partition_id, msg_offset;
```

Partition mà hàm băm của lab chọn cho từng lô đã có:

```sql
SELECT DISTINCT shipment_id,
  abs(hashtext(shipment_id)) % 3 AS p
FROM topic_log
ORDER BY shipment_id;
```

Các lần đổi của SHP-101 theo offset, cũng là thứ tự ghi:

```sql
SELECT msg_offset, status, event_time
FROM topic_log
WHERE shipment_id = 'SHP-101'
ORDER BY msg_offset;
```

## Lỗi hay gặp

Lấy sự kiện có offset lớn nhất làm sự kiện mới nhất của cả topic:

```sql
-- WRONG: offsets of two partitions
SELECT partition_id, msg_offset, status
FROM topic_log
ORDER BY msg_offset DESC LIMIT 1;
```

```sql
-- FIX: compare event times
SELECT partition_id, msg_offset, status
FROM topic_log
ORDER BY event_time DESC LIMIT 1;
```

Quên `abs`: `hashtext` âm cho ra một partition không tồn tại.

```sql
-- WRONG: partition -2
SELECT hashtext('SHP-105') % 3 AS p;
```

```sql
-- FIX: a remainder from 0 to 2
SELECT abs(hashtext('SHP-105')) % 3
  AS p;
```

## Thực hành

Ba bước: tìm partition cho một khóa mới, kiểm tra mỗi lô chỉ nằm ở một partition, rồi tính lag của nhóm `tracking` ở từng partition.

## Tóm tắt

- Topic chia thành partition; mỗi partition có offset riêng từ 0.
- Sự kiện cùng khóa vào cùng partition, vì producer chọn partition theo hash của khóa.
- Thứ tự chỉ được bảo đảm trong một partition; offset của hai partition không so được.
- Vị trí và lag của nhóm consumer tính theo từng partition.

# EN

## Opening

One single log cannot keep up with thousands of shipments, so Kafka splits a topic into partitions. This lesson shows the price of splitting: order only holds within each partition, which is why an event's key matters so much.

## Key idea

**Partitions.** A topic is split into partitions, and each partition is an append-only log with its own offsets starting at 0. Partitions live on several machines, so several consumers can read in parallel.

**Same key, same partition.** The Kafka docs say events with the same key (a shipment id, for example) are written to the same partition. When an event has a key, the producer picks the partition from a hash of the key. The lab uses PostgreSQL's `abs(hashtext(...)) % 3` instead of Kafka's hash function: the numbers differ, the idea is the same.

**Order.** Kafka guarantees that a consumer reads a partition in exactly the order it was written. Across partitions there is no shared order, and offsets of two partitions cannot be compared. So choose the key so that the events that must stay in order (every change of one shipment) share it.

**Lag per partition.** A consumer group saves one position per partition, so lag is computed per partition too. The figure at the end of this section shows three keys going to three partitions.

## Syntax

```sql
-- the lab's stand-in for Kafka's hash
abs(hashtext('SHP-105')) % 3
-- one key, one partition?
count(DISTINCT partition_id)
-- lag per partition
max(t.msg_offset) + 1 - c.next_offset
JOIN topic_log t USING (partition_id)
```

- `hashtext`: PostgreSQL's built-in text hash; it can return a negative number.
- `%`: the remainder, which gives a partition number from 0 to 2.

## Example

Each partition is its own log, and offsets start again at 0:

```sql
SELECT partition_id, msg_offset,
  shipment_id, status
FROM topic_log
ORDER BY partition_id, msg_offset;
```

The partition the lab's hash picks for each shipment already there:

```sql
SELECT DISTINCT shipment_id,
  abs(hashtext(shipment_id)) % 3 AS p
FROM topic_log
ORDER BY shipment_id;
```

SHP-101's changes by offset, which is also the write order:

```sql
SELECT msg_offset, status, event_time
FROM topic_log
WHERE shipment_id = 'SHP-101'
ORDER BY msg_offset;
```

## Common mistakes

Taking the event with the largest offset as the newest event of the whole topic:

```sql
-- WRONG: offsets of two partitions
SELECT partition_id, msg_offset, status
FROM topic_log
ORDER BY msg_offset DESC LIMIT 1;
```

```sql
-- FIX: compare event times
SELECT partition_id, msg_offset, status
FROM topic_log
ORDER BY event_time DESC LIMIT 1;
```

Forgetting `abs`: a negative `hashtext` gives a partition that does not exist.

```sql
-- WRONG: partition -2
SELECT hashtext('SHP-105') % 3 AS p;
```

```sql
-- FIX: a remainder from 0 to 2
SELECT abs(hashtext('SHP-105')) % 3
  AS p;
```

## Practice

Three steps: find the partition for a new key, check that each shipment sits in one partition only, then compute group `tracking`'s lag in each partition.

## Recap

- A topic is split into partitions; each partition has its own offsets from 0.
- Events with the same key go to the same partition, because the producer picks it from a hash of the key.
- Order is guaranteed only within a partition; offsets of two partitions cannot be compared.
- A consumer group's position and lag are per partition.
