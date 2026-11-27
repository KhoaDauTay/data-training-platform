---
id: e-sm-l3-03
engine: stream
level: L3
module: process
title: Chuyện "đúng một lần" - hứa gì và không hứa gì
title_en: Exactly-once claims - what is promised and what is not
kind: concept
runtime: browser
minutes: 15
figures: [{ name: sm-exactly-once, at: idea }]
objectives:
  - vi: Nói rõ "exactly-once" của Kafka bao phần nào của đường đi và dừng ở đâu.
    en: Say which part of the path Kafka's "exactly-once" covers and where it stops.
  - vi: Đạt kết quả thực chất một lần khi ghi ra PostgreSQL - lưu kết quả và offset trong cùng một transaction.
    en: Get effectively-once results when writing to PostgreSQL - save the result and the offset in the same transaction.
requires: [e-sm-l2-02, e-sm-l3-02]
sources:
  - { url: "https://kafka.apache.org/41/design/design/", title: "Kafka docs: Design (delivery semantics, idempotent producer, transactions)", title_vi: "Tài liệu Kafka: thiết kế (bảo đảm giao nhận, producer idempotent, transaction)" }
  - { url: "https://debezium.io/documentation/faq/", title: "Debezium FAQ (at least once when things go wrong)", title_vi: "Hỏi đáp Debezium (ít nhất một lần khi có lỗi)" }
  - { url: "https://www.postgresql.org/docs/18/logicaldecoding-explanation.html", title: "PostgreSQL 18 docs: Logical decoding concepts (changes sent again after a crash)", title_vi: "Khái niệm logical decoding (thay đổi được gửi lại sau khi máy sập)" }
lab:
  setup: |
    CREATE TABLE events (
      msg_offset int PRIMARY KEY,
      fee_vnd int NOT NULL
    );
    INSERT INTO events VALUES
      (0, 50000), (1, 50000), (2, 40000),
      (3, 90000), (4, 40000), (5, 30000),
      (6, 20000);
    CREATE TABLE revenue (
      id int PRIMARY KEY,
      total_vnd bigint NOT NULL
    );
    INSERT INTO revenue VALUES (1, 100000);
    CREATE TABLE consumer_offsets (
      group_id text PRIMARY KEY,
      next_offset int NOT NULL
    );
    INSERT INTO consumer_offsets VALUES
      ('billing', 2);
    CREATE TABLE received (
      seq int PRIMARY KEY,
      msg_offset int NOT NULL,
      fee_vnd int NOT NULL
    );
    INSERT INTO received VALUES
      (1, 2, 40000), (2, 3, 90000),
      (3, 2, 40000), (4, 3, 90000),
      (5, 4, 40000);
  steps:
    - task:
        vi: "Áp lô offset 2 tới 4 cho nhóm `billing` trong một câu lệnh: cộng tổng `fee_vnd` của lô vào `revenue` (dòng `id` = 1) **và** lưu `next_offset` = 5, để hai việc cùng thành hoặc cùng hỏng."
        en: "Apply the batch of offsets 2 to 4 for group `billing` in one statement: add the batch's total `fee_vnd` to `revenue` (row `id` = 1) **and** save `next_offset` = 5, so both succeed or fail together."
      solution: |
        WITH b AS (
          SELECT sum(fee_vnd) AS fee
          FROM events
          WHERE msg_offset >= 2
            AND msg_offset < 5
        ), t AS (
          UPDATE revenue
          SET total_vnd = total_vnd
            + (SELECT fee FROM b)
          WHERE id = 1
          RETURNING total_vnd
        )
        UPDATE consumer_offsets
        SET next_offset = 5
        WHERE group_id = 'billing'
        RETURNING next_offset
      after: SELECT (SELECT total_vnd FROM revenue WHERE id = 1) AS total_vnd, (SELECT next_offset FROM consumer_offsets WHERE group_id = 'billing') AS next_offset
      check: rows
      hint:
        vi: "Một `UPDATE` trong `WITH` (`t`) và một `UPDATE` ở ngoài: PostgreSQL chạy cả câu trong một transaction."
        en: "One `UPDATE` inside `WITH` (`t`) and one `UPDATE` outside: PostgreSQL runs the whole statement in one transaction."
    - task:
        vi: "Consumer sập và khởi động lại. Nó sẽ đọc lại những offset nào, dựa vào vị trí đã lưu? Trả `msg_offset`, xếp tăng dần."
        en: "The consumer crashes and restarts. Which offsets will it read again, based on the saved position? Return `msg_offset`, sorted ascending."
      solution: |
        SELECT msg_offset
        FROM events
        WHERE msg_offset >= (
          SELECT next_offset
          FROM consumer_offsets
          WHERE group_id = 'billing')
        ORDER BY msg_offset
      check: rows
      ordered: true
      hint:
        vi: "Đọc vị trí từ `consumer_offsets`, không gõ cứng số; vị trí là offset kế tiếp cần đọc, nên dùng `>=`."
        en: "Read the position from `consumer_offsets`, do not hard-code it; the position is the next offset to read, so use `>=`."
quiz:
  - q:
      vi: "Nhóm bật exactly-once của Kafka (producer có transaction, consumer `read_committed`), rồi ghi mỗi sự kiện vào PostgreSQL. Hàng trong PostgreSQL có chắc chỉ ghi một lần không?"
      en: "A team turns on Kafka's exactly-once (a transactional producer, `read_committed` consumers), then writes each event to PostgreSQL. Are the rows in PostgreSQL sure to be written once?"
    options:
      - { vi: "Có, vì Kafka đã bảo đảm đúng một lần", en: "Yes, because Kafka already guarantees exactly once" }
      - { vi: "Có, nếu PostgreSQL chạy ở mức SERIALIZABLE", en: "Yes, if PostgreSQL runs at SERIALIZABLE" }
      - { vi: "Không, phần ghi ra ngoài cần idempotent riêng", en: "No, the external write needs its own idempotence" }
    answer: 2
    trap: 0
    why:
      vi: "Tài liệu Kafka nói exactly-once đạt được trong Kafka Streams và với producer có transaction cùng consumer `read_committed`; hệ thống đích khác cần tự phối hợp. Consumer có thể ghi xong vào PostgreSQL rồi sập trước khi commit offset, nên sự kiện được đọc và ghi lại. Mức cô lập SERIALIZABLE không biết gì về offset của Kafka."
      en: "The Kafka docs say exactly-once is achieved in Kafka Streams and with a transactional producer plus `read_committed` consumers; other destination systems have to cooperate. A consumer can finish writing to PostgreSQL and crash before committing its offset, so the event is read and written again. The SERIALIZABLE isolation level knows nothing about Kafka offsets."
  - q:
      vi: "Bước 1 lưu `next_offset` trong PostgreSQL cùng transaction với `revenue`. Vì sao như vậy cho kết quả thực chất một lần?"
      en: "Step 1 saves `next_offset` in PostgreSQL in the same transaction as `revenue`. Why does that give effectively-once results?"
    options:
      - { vi: "Kết quả và vị trí luôn khớp nhau, nên chạy lại bắt đầu đúng chỗ", en: "Result and position always match, so a rerun starts at the right place" }
      - { vi: "Vì PostgreSQL chặn Kafka giao lại sự kiện", en: "Because PostgreSQL stops Kafka from redelivering" }
      - { vi: "Vì lô nhỏ nên không thể sập giữa chừng", en: "Because the batch is small, so it cannot crash halfway" }
    answer: 0
    trap: 1
    why:
      vi: "PostgreSQL không điều khiển được Kafka; Kafka vẫn có thể giao lại. Điều quan trọng là tổng tiền và vị trí đã lưu không bao giờ lệch nhau: nếu sập trước commit thì cả hai chưa đổi và lô chạy lại từ offset 2; nếu sập sau thì cả hai đã đổi và consumer đọc tiếp từ offset 5. Lô nhỏ đến đâu thì máy vẫn có thể sập giữa chừng."
      en: "PostgreSQL cannot control Kafka; Kafka may still redeliver. What matters is that the total and the saved position never disagree: a crash before the commit leaves both unchanged and the batch reruns from offset 2; a crash after it leaves both changed and the consumer reads on from offset 5. However small the batch, a machine can still crash halfway."
---
## Mở bài

"Bật exactly-once là xong" là câu nghe nhiều nhất về xử lý luồng, và cũng dễ hiểu sai nhất. Bài này tách ba lời hứa khác nhau, rồi cho thấy cách thật sự giữ tổng phí của Cargo Query đúng.

## Ý chính

**Trong Kafka.** Tài liệu Kafka mô tả producer idempotent (broker bỏ bản ghi trùng khi producer gửi lại, nhờ id producer và số thứ tự) và transaction (ghi vào nhiều partition, tất cả thành hoặc không gì). Kết hợp với consumer `read_committed`, đường từ Kafka tới Kafka, như Kafka Streams, đạt exactly-once. Tài liệu cũng nói hệ thống đích khác cần tự phối hợp.

**Ra ngoài Kafka.** Debezium nói khi có sự cố, ứng dụng có thể thấy sự kiện ít nhất một lần. Tài liệu PostgreSQL nói sau một lần sập, replication slot có thể quay về LSN cũ và gửi lại thay đổi, và client phải tự tránh tác hại của việc xử lý một message nhiều lần. Không giao thức nào qua mạng tránh được cả mất lẫn trùng khi máy có thể sập giữa hai việc.

**Thực chất một lần (effectively-once).** Hai cách đã gặp: consumer idempotent với khóa bỏ trùng (bài e-sm-l2-02), hoặc lưu kết quả **và** offset trong cùng một transaction của database đích, như lab này. Khi đó kết quả và vị trí không bao giờ lệch nhau, và chạy lại luôn bắt đầu đúng chỗ.

Hình cuối mục đặt ba lời hứa cạnh nhau.

## Ví dụ

Tổng hiện tại và vị trí đã lưu, trước khi áp lô:

```sql
SELECT (SELECT total_vnd FROM revenue
        WHERE id = 1) AS total_vnd,
  (SELECT next_offset
     FROM consumer_offsets
    WHERE group_id = 'billing')
    AS next_offset;
```

Những gì consumer ít nhất một lần đã nhận: offset 2 và 3 đến hai lần.

```sql
SELECT seq, msg_offset, fee_vnd
FROM received
ORDER BY seq;
```

## Lỗi hay gặp

Cộng mọi thứ đã nhận: offset 2 và 3 bị tính hai lần.

```sql
-- WRONG: counts redeliveries
SELECT sum(fee_vnd) AS batch_fee
FROM received;
```

```sql
-- FIX: one copy per offset
SELECT sum(fee_vnd) AS batch_fee
FROM (SELECT DISTINCT ON (msg_offset)
    msg_offset, fee_vnd
  FROM received
  ORDER BY msg_offset) r;
```

Bỏ trùng theo giá trị tiền thay vì theo offset: offset 2 và 4 cùng là 40000, nên một khoản bị mất.

```sql
-- WRONG: dedupe by value, not by key
SELECT sum(DISTINCT fee_vnd)
  AS batch_fee
FROM received;
```

```sql
-- FIX: dedupe by offset
SELECT sum(fee_vnd) AS batch_fee
FROM (SELECT DISTINCT ON (msg_offset)
    msg_offset, fee_vnd
  FROM received
  ORDER BY msg_offset) r;
```

## Tóm tắt

- Exactly-once của Kafka bao đường Kafka tới Kafka: producer idempotent, transaction, consumer `read_committed`.
- Ra ngoài Kafka (Debezium, replication slot, database đích) là ít nhất một lần khi có sự cố.
- Thực chất một lần = consumer idempotent, hoặc lưu kết quả và offset trong cùng một transaction.
- Kết quả và vị trí phải cùng thành hoặc cùng hỏng; khi đó chạy lại luôn bắt đầu đúng chỗ.

# EN

## Opening

"Turn on exactly-once and you are done" is the most-heard sentence about stream processing, and the easiest to misread. This lesson separates three different promises, then shows how to really keep Cargo Query's fee total right.

## Key idea

**Inside Kafka.** The Kafka docs describe the idempotent producer (the broker drops duplicate records when the producer resends, using a producer id and sequence numbers) and transactions (writes to several partitions where all succeed or none do). Combined with `read_committed` consumers, the path from Kafka to Kafka, as in Kafka Streams, reaches exactly-once. The docs also say other destination systems have to cooperate.

**Outside Kafka.** Debezium says that when things go wrong, applications may see events at least once. The PostgreSQL docs say that after a crash a replication slot may return to an earlier LSN and send changes again, and that clients must avoid the ill effects of handling one message more than once. No protocol over a network avoids both loss and duplicates when a machine can crash between two steps.

**Effectively once.** Two ways, both seen already: an idempotent consumer with a dedupe key (e-sm-l2-02), or saving the result **and** the offset in the same transaction of the target database, as in this lab. Then the result and the position never disagree, and a rerun always starts at the right place.

The figure at the end of this section puts the three promises side by side.

## Example

The current total and the saved position, before the batch is applied:

```sql
SELECT (SELECT total_vnd FROM revenue
        WHERE id = 1) AS total_vnd,
  (SELECT next_offset
     FROM consumer_offsets
    WHERE group_id = 'billing')
    AS next_offset;
```

What the at-least-once consumer received: offsets 2 and 3 arrived twice.

```sql
SELECT seq, msg_offset, fee_vnd
FROM received
ORDER BY seq;
```

## Common mistakes

Adding up everything received: offsets 2 and 3 are counted twice.

```sql
-- WRONG: counts redeliveries
SELECT sum(fee_vnd) AS batch_fee
FROM received;
```

```sql
-- FIX: one copy per offset
SELECT sum(fee_vnd) AS batch_fee
FROM (SELECT DISTINCT ON (msg_offset)
    msg_offset, fee_vnd
  FROM received
  ORDER BY msg_offset) r;
```

Deduplicating by amount instead of by offset: offsets 2 and 4 are both 40000, so one fee is lost.

```sql
-- WRONG: dedupe by value, not by key
SELECT sum(DISTINCT fee_vnd)
  AS batch_fee
FROM received;
```

```sql
-- FIX: dedupe by offset
SELECT sum(fee_vnd) AS batch_fee
FROM (SELECT DISTINCT ON (msg_offset)
    msg_offset, fee_vnd
  FROM received
  ORDER BY msg_offset) r;
```

## Recap

- Kafka's exactly-once covers the path from Kafka to Kafka: the idempotent producer, transactions, `read_committed` consumers.
- Outside Kafka (Debezium, a replication slot, the target database) delivery is at least once when things go wrong.
- Effectively once = an idempotent consumer, or the result and the offset saved in one transaction.
- The result and the position must succeed or fail together; then a rerun always starts at the right place.
