---
id: e-sm-l2-01
engine: stream
level: L2
module: delivery
title: Bảo đảm giao nhận - nhiều nhất, ít nhất, thực chất một lần
title_en: Delivery guarantees - at most, at least, effectively once
kind: concept
runtime: browser
minutes: 15
figures: [{ name: sm-delivery, at: idea }]
objectives:
  - vi: Nói thời điểm lưu vị trí (trước hay sau khi xử lý) quyết định mất hay trùng thế nào.
    en: Say how the moment of saving the position (before or after processing) decides loss or duplicates.
  - vi: Tìm sự kiện bị xử lý hai lần và sự kiện bị mất sau một lần sập.
    en: Find events processed twice and events lost after a crash.
  - vi: Hiểu "thực chất một lần" là ít nhất một lần cộng với consumer idempotent.
    en: Understand "effectively once" as at least once plus an idempotent consumer.
requires: [e-sm-l1-02]
sources:
  - { url: "https://kafka.apache.org/41/design/design/", title: "Kafka docs: Design (message delivery semantics)" }
  - { url: "https://debezium.io/documentation/faq/", title: "Debezium FAQ (events at least once when things go wrong)" }
  - { url: "https://www.postgresql.org/docs/18/functions-subquery.html", title: "PostgreSQL 18 docs: Subquery expressions (EXISTS)" }
lab:
  setup: |
    CREATE TABLE events (
      msg_offset int PRIMARY KEY,
      shipment_id text NOT NULL,
      fee_vnd int NOT NULL
    );
    INSERT INTO events VALUES
      (0, 'SHP-101', 50000), (1, 'SHP-102', 70000),
      (2, 'SHP-103', 40000), (3, 'SHP-104', 90000),
      (4, 'SHP-105', 60000), (5, 'SHP-106', 30000);
    CREATE TABLE deliveries (
      consumer text NOT NULL,
      msg_offset int NOT NULL
    );
    INSERT INTO deliveries VALUES
      ('at_most_once', 0), ('at_most_once', 1),
      ('at_most_once', 2), ('at_most_once', 4),
      ('at_most_once', 5),
      ('at_least_once', 0), ('at_least_once', 1),
      ('at_least_once', 2), ('at_least_once', 3),
      ('at_least_once', 2), ('at_least_once', 3),
      ('at_least_once', 4), ('at_least_once', 5);
  steps:
    - task:
        vi: "Sau lần sập, sự kiện nào bị một consumer xử lý hơn một lần? Trả `consumer`, `msg_offset`, `times`."
        en: "After the crash, which events did a consumer process more than once? Return `consumer`, `msg_offset`, `times`."
      solution: |
        SELECT consumer, msg_offset,
          count(*) AS times
        FROM deliveries
        GROUP BY consumer, msg_offset
        HAVING count(*) > 1
      check: rows
      hint:
        vi: "Gom theo cả `consumer` và `msg_offset`; gom chỉ theo offset sẽ trộn hai consumer với nhau."
        en: "Group by both `consumer` and `msg_offset`; grouping by offset alone mixes the two consumers."
    - task:
        vi: "Sự kiện nào consumer `at_most_once` không bao giờ xử lý? Trả `msg_offset`."
        en: "Which events did consumer `at_most_once` never process? Return `msg_offset`."
      solution: |
        SELECT e.msg_offset
        FROM events e
        WHERE NOT EXISTS (
          SELECT 1 FROM deliveries d
          WHERE d.consumer = 'at_most_once'
            AND d.msg_offset = e.msg_offset)
      check: rows
      hint:
        vi: "`NOT EXISTS` với điều kiện `consumer` nằm **bên trong** truy vấn con."
        en: "`NOT EXISTS` with the `consumer` condition **inside** the subquery."
quiz:
  - q:
      vi: "Consumer đọc lô, lưu vị trí, rồi mới xử lý. Nó sập giữa lúc xử lý. Chuyện gì xảy ra với lô đó?"
      en: "A consumer reads a batch, saves its position, then processes. It crashes mid-processing. What happens to that batch?"
    options:
      - { vi: "Phần chưa xử lý bị mất: nhiều nhất một lần", en: "The unprocessed part is lost: at most once" }
      - { vi: "Cả lô bị xử lý lại: ít nhất một lần", en: "The whole batch is redone: at least once" }
      - { vi: "Kafka tự chạy lại phần còn lại: đúng một lần", en: "Kafka reruns the rest itself: exactly once" }
    answer: 0
    trap: 1
    why:
      vi: "Xử lý lại nghe như điều consumer sẽ làm sau khi khởi động, nhưng vị trí đã lưu nằm sau lô, nên nó đọc tiếp từ lô kế. Tài liệu Kafka gọi cách lưu vị trí trước khi xử lý là at-most-once: sự kiện có thể mất nhưng không bao giờ lặp. Kafka không tự chạy lại việc xử lý của consumer."
      en: "Redoing it sounds like what the consumer will do after a restart, but the saved position is already past the batch, so it reads on from the next one. The Kafka docs call saving the position before processing at-most-once: events may be lost but are never redelivered. Kafka does not rerun a consumer's processing for it."
  - q:
      vi: "Đội tài chính muốn phí không bao giờ bị tính hai lần và không bao giờ bị sót. Cách nào đúng?"
      en: "Finance wants a fee never charged twice and never missed. Which approach is right?"
    options:
      - { vi: "Lưu vị trí trước khi xử lý cho chắc", en: "Save the position before processing, to be safe" }
      - { vi: "Lưu vị trí sau, và bỏ trùng theo offset", en: "Save the position after, and drop duplicates by offset" }
      - { vi: "Lưu vị trí sau mỗi sự kiện là đủ", en: "Saving the position after each event is enough" }
    answer: 1
    trap: 2
    why:
      vi: "Lưu sau mỗi sự kiện làm khoảng trùng nhỏ lại, nhưng vẫn có lúc consumer xử lý xong rồi sập trước khi lưu, nên sự kiện đó vẫn chạy hai lần. Lưu trước thì có thể sót. Cách đúng: ít nhất một lần (lưu sau) cộng với một khóa bỏ trùng (offset hay id sự kiện) để lần chạy thứ hai không đổi kết quả."
      en: "Saving after each event makes the duplicate window smaller, but the consumer can still finish an event and crash before saving, so that event still runs twice. Saving before can miss events. The right way: at least once (save after) plus a dedupe key (the offset or an event id), so a second run does not change the result."
---
## Mở bài

Đêm qua consumer tính phí của Cargo Query sập giữa chừng và khởi động lại. Có lô hàng bị tính phí hai lần, có lô không bị tính: bài này tìm ra vì sao, và thời điểm lưu vị trí quyết định điều gì.

## Ý chính

**Nhiều nhất một lần (at-most-once).** Consumer lưu vị trí trước rồi mới xử lý. Nếu sập giữa chừng, nó đọc tiếp từ sau lô: sự kiện có thể mất nhưng không bao giờ lặp.

**Ít nhất một lần (at-least-once).** Consumer xử lý trước rồi mới lưu vị trí. Nếu sập trước khi lưu, nó đọc lại từ vị trí cũ: không mất, nhưng vài sự kiện chạy hai lần. Tài liệu Kafka nói Kafka bảo đảm ít nhất một lần theo mặc định. Debezium cũng nói khi có sự cố, ứng dụng có thể thấy một sự kiện nhiều hơn một lần.

**Thực chất một lần (effectively-once).** Không cách lưu vị trí nào tránh được cả mất lẫn trùng khi máy có thể sập giữa hai việc. Cách thực tế là ít nhất một lần cộng với một consumer idempotent: chạy lại một sự kiện không đổi kết quả, nhờ một khóa bỏ trùng. Kafka có "exactly-once" riêng cho đường Kafka tới Kafka; bài cuối cấp 3 nói rõ ranh giới đó.

**Trong lab.** Bảng `deliveries` ghi lại mỗi lần một consumer xử lý một offset trong đêm sập. Hình cuối mục so ba cách.

## Ví dụ

Cách lưu vị trí, viết theo kiểu cấu hình consumer (chỉ để đọc):

```text
enable.auto.commit=false
# at-most-once:  commit, then process
# at-least-once: process, then commit
```

Phí thật của cả lô, mỗi sự kiện một lần:

```sql
SELECT sum(fee_vnd) AS fee_vnd
FROM events;
```

Phí mỗi consumer đã tính trong đêm sập:

```sql
SELECT d.consumer,
  sum(e.fee_vnd) AS billed_vnd
FROM deliveries d
JOIN events e USING (msg_offset)
GROUP BY d.consumer
ORDER BY d.consumer;
```

## Lỗi hay gặp

Cộng phí của consumer at-least-once mà không bỏ trùng:

```sql
-- WRONG: offsets 2 and 3 billed twice
SELECT sum(e.fee_vnd) AS billed_vnd
FROM deliveries d
JOIN events e USING (msg_offset)
WHERE d.consumer = 'at_least_once';
```

```sql
-- FIX: each offset once
SELECT sum(e.fee_vnd) AS billed_vnd
FROM events e
WHERE EXISTS (
  SELECT 1 FROM deliveries d
  WHERE d.consumer = 'at_least_once'
    AND d.msg_offset = e.msg_offset);
```

Đặt điều kiện của bảng bên phải vào `WHERE` biến `LEFT JOIN` thành `JOIN`, nên sự kiện bị mất không hiện ra:

```sql
-- WRONG: the lost offset disappears
SELECT e.msg_offset
FROM events e
LEFT JOIN deliveries d
  ON d.msg_offset = e.msg_offset
WHERE d.consumer = 'at_most_once'
ORDER BY 1;
```

```sql
-- FIX: the condition in ON
SELECT e.msg_offset
FROM events e
LEFT JOIN deliveries d
  ON d.msg_offset = e.msg_offset
 AND d.consumer = 'at_most_once'
WHERE d.msg_offset IS NULL
ORDER BY 1;
```

## Tóm tắt

- Lưu vị trí trước khi xử lý: nhiều nhất một lần, có thể mất.
- Lưu vị trí sau khi xử lý: ít nhất một lần, có thể trùng; đây là mặc định của Kafka.
- Thực chất một lần = ít nhất một lần + consumer idempotent với khóa bỏ trùng.
- Sau một lần sập, tìm trùng bằng `GROUP BY ... HAVING` và tìm mất bằng `NOT EXISTS`.

# EN

## Opening

Last night Cargo Query's fee consumer crashed halfway and restarted. Some shipments were charged twice and some were not charged at all: this lesson finds out why, and what the moment of saving the position decides.

## Key idea

**At most once.** The consumer saves its position first, then processes. If it crashes halfway, it reads on from after the batch: events can be lost but are never repeated.

**At least once.** The consumer processes first, then saves its position. If it crashes before saving, it rereads from the old position: nothing is lost, but some events run twice. The Kafka docs say Kafka guarantees at-least-once delivery by default. Debezium also says that when things go wrong, applications may see an event more than once.

**Effectively once.** No way of saving the position avoids both loss and duplicates when a machine can crash between the two steps. The practical way is at least once plus an idempotent consumer: running an event again does not change the result, thanks to a dedupe key. Kafka has its own "exactly-once" for the path from Kafka to Kafka; the last concept lesson of level 3 draws that line.

**In the lab.** The `deliveries` table records every time a consumer processed an offset on the night of the crash. The figure at the end of this section compares the three ways.

## Example

The ways of saving the position, written as consumer settings (to read only):

```text
enable.auto.commit=false
# at-most-once:  commit, then process
# at-least-once: process, then commit
```

The real fee of the whole batch, each event once:

```sql
SELECT sum(fee_vnd) AS fee_vnd
FROM events;
```

The fee each consumer charged on the night of the crash:

```sql
SELECT d.consumer,
  sum(e.fee_vnd) AS billed_vnd
FROM deliveries d
JOIN events e USING (msg_offset)
GROUP BY d.consumer
ORDER BY d.consumer;
```

## Common mistakes

Adding up the at-least-once consumer's fees without dropping duplicates:

```sql
-- WRONG: offsets 2 and 3 billed twice
SELECT sum(e.fee_vnd) AS billed_vnd
FROM deliveries d
JOIN events e USING (msg_offset)
WHERE d.consumer = 'at_least_once';
```

```sql
-- FIX: each offset once
SELECT sum(e.fee_vnd) AS billed_vnd
FROM events e
WHERE EXISTS (
  SELECT 1 FROM deliveries d
  WHERE d.consumer = 'at_least_once'
    AND d.msg_offset = e.msg_offset);
```

Putting the right-hand table's condition in `WHERE` turns the `LEFT JOIN` into a `JOIN`, so the lost event never shows:

```sql
-- WRONG: the lost offset disappears
SELECT e.msg_offset
FROM events e
LEFT JOIN deliveries d
  ON d.msg_offset = e.msg_offset
WHERE d.consumer = 'at_most_once'
ORDER BY 1;
```

```sql
-- FIX: the condition in ON
SELECT e.msg_offset
FROM events e
LEFT JOIN deliveries d
  ON d.msg_offset = e.msg_offset
 AND d.consumer = 'at_most_once'
WHERE d.msg_offset IS NULL
ORDER BY 1;
```

## Recap

- Save the position before processing: at most once, events can be lost.
- Save the position after processing: at least once, events can repeat; this is Kafka's default.
- Effectively once = at least once + an idempotent consumer with a dedupe key.
- After a crash, find duplicates with `GROUP BY ... HAVING` and losses with `NOT EXISTS`.
