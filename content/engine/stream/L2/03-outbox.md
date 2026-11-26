---
id: e-sm-l2-03
engine: stream
level: L2
module: delivery
title: Mẫu outbox - đổi dữ liệu và gửi sự kiện cùng một transaction
title_en: The outbox pattern - change data and send the event in one transaction
kind: lab
runtime: browser
minutes: 25
figures: [{ name: sm-outbox, at: idea }]
objectives:
  - vi: Giải thích vì sao ghi database rồi gửi message bằng hai thao tác riêng có thể làm hai bên lệch nhau.
    en: Explain why writing the database and sending a message as two separate operations can leave them out of step.
  - vi: Ghi thay đổi và dòng outbox trong cùng một câu lệnh, tức cùng một transaction.
    en: Write the change and the outbox row in the same statement, that is, the same transaction.
  - vi: Đóng vai relay, đọc outbox theo thứ tự rồi đánh dấu đã gửi.
    en: Play the relay, reading the outbox in order and then marking rows as sent.
requires: [e-sm-l2-02]
sources:
  - { url: "https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html", title: "Debezium docs: Outbox Event Router" }
  - { url: "https://www.postgresql.org/docs/18/queries-with.html#QUERIES-WITH-MODIFYING", title: "PostgreSQL 18 docs: Data-modifying statements in WITH" }
  - { url: "https://www.postgresql.org/docs/18/functions-json.html", title: "PostgreSQL 18 docs: JSON functions and operators" }
lab:
  setup: |
    CREATE TABLE shipments (
      shipment_id text PRIMARY KEY,
      status text NOT NULL
    );
    INSERT INTO shipments VALUES
      ('SHP-101', 'in_transit'),
      ('SHP-102', 'picked_up'),
      ('SHP-103', 'booked');
    CREATE TABLE outbox (
      id int GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,
      aggregatetype text NOT NULL,
      aggregateid text NOT NULL,
      type text NOT NULL,
      payload jsonb NOT NULL,
      published boolean NOT NULL
        DEFAULT false
    );
    INSERT INTO outbox (aggregatetype,
      aggregateid, type, payload, published)
    VALUES
      ('shipment', 'SHP-101', 'StatusChanged',
       '{"status": "in_transit"}', true),
      ('shipment', 'SHP-102', 'StatusChanged',
       '{"status": "picked_up"}', false);
  steps:
    - task:
        vi: "Lô SHP-102 vừa giao xong. Trong một câu lệnh, đổi `status` của nó thành `delivered` và thêm một dòng outbox: `aggregatetype` = `shipment`, `aggregateid` = mã lô, `type` = `StatusChanged`, `payload` = `{\"status\": \"delivered\"}`."
        en: "Shipment SHP-102 was just delivered. In one statement, set its `status` to `delivered` and add an outbox row: `aggregatetype` = `shipment`, `aggregateid` = the shipment id, `type` = `StatusChanged`, `payload` = `{\"status\": \"delivered\"}`."
      solution: |
        WITH s AS (
          UPDATE shipments
          SET status = 'delivered'
          WHERE shipment_id = 'SHP-102'
          RETURNING shipment_id, status
        )
        INSERT INTO outbox (aggregatetype,
          aggregateid, type, payload)
        SELECT 'shipment', shipment_id,
          'StatusChanged',
          jsonb_build_object('status', status)
        FROM s
        RETURNING id, aggregateid
      after: SELECT o.id, o.aggregateid, o.payload->>'status' AS sent, s.status AS stored FROM outbox o JOIN shipments s ON s.shipment_id = o.aggregateid ORDER BY o.id
      check: rows
      ordered: true
      hint:
        vi: "`WITH s AS (UPDATE ... RETURNING ...)` rồi `INSERT INTO outbox ... SELECT ... FROM s`; `jsonb_build_object('status', status)` dựng payload."
        en: "`WITH s AS (UPDATE ... RETURNING ...)` then `INSERT INTO outbox ... SELECT ... FROM s`; `jsonb_build_object('status', status)` builds the payload."
    - task:
        vi: "Đóng vai relay: đọc các dòng outbox chưa gửi theo đúng thứ tự đã ghi. Trả `id`, `message_key` (= `aggregateid`), `type`, `status` (lấy từ `payload`)."
        en: "Play the relay: read the outbox rows not sent yet, in the order they were written. Return `id`, `message_key` (= `aggregateid`), `type`, `status` (taken from `payload`)."
      solution: |
        SELECT id, aggregateid AS message_key,
          type, payload->>'status' AS status
        FROM outbox
        WHERE NOT published
        ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`WHERE NOT published ORDER BY id`; `payload->>'status'` lấy chữ từ jsonb."
        en: "`WHERE NOT published ORDER BY id`; `payload->>'status'` takes the text out of the jsonb."
    - task:
        vi: "Relay đã gửi xong mọi dòng vừa đọc. Đánh dấu chúng là đã gửi và trả `id` của các dòng đổi."
        en: "The relay has sent every row it just read. Mark them as sent and return the `id` of the rows changed."
      solution: |
        UPDATE outbox SET published = true
        WHERE NOT published
        RETURNING id
      after: SELECT id, published FROM outbox ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Cùng điều kiện với bước đọc: `WHERE NOT published`."
        en: "The same condition as the read step: `WHERE NOT published`."
quiz:
  - q:
      vi: "Dịch vụ cập nhật `shipments`, commit, rồi mới gửi message lên Kafka. Kafka đang bảo trì nên lần gửi thất bại. Hậu quả?"
      en: "A service updates `shipments`, commits, then sends a message to Kafka. Kafka is under maintenance and the send fails. The consequence?"
    options:
      - { vi: "Database đã đổi nhưng không ai nhận được sự kiện", en: "The database changed but nobody gets the event" }
      - { vi: "PostgreSQL tự hủy thay đổi vì message thất bại", en: "PostgreSQL undoes the change because the send failed" }
      - { vi: "Kafka sẽ tự lấy thay đổi khi chạy lại", en: "Kafka will pick up the change itself when it is back" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe như hai việc gắn với nhau, nhưng PostgreSQL không biết gì về lần gửi lên Kafka; transaction đã commit thì không bị hủy. Kafka cũng không tự đọc bảng của bạn. Kết quả là hai bên lệch nhau, và vì vậy outbox ghi sự kiện vào database trong cùng transaction với thay đổi."
      en: "It sounds as if the two are tied together, but PostgreSQL knows nothing about the send to Kafka; a committed transaction is not undone. Kafka does not read your tables by itself either. The two end up out of step, which is why the outbox writes the event into the database in the same transaction as the change."
  - q:
      vi: "Relay gửi xong ba dòng outbox thì sập trước khi kịp đánh dấu `published`. Khi chạy lại, nó làm gì?"
      en: "The relay sends three outbox rows, then crashes before marking them `published`. What does it do on restart?"
    options:
      - { vi: "Bỏ qua ba dòng vì Kafka đã nhận rồi", en: "Skip the three rows because Kafka already has them" }
      - { vi: "Xóa ba dòng để tránh gửi lại", en: "Delete the three rows to avoid sending again" }
      - { vi: "Gửi lại ba dòng: consumer phải bỏ trùng", en: "Send the three rows again: consumers must dedupe" }
    answer: 2
    trap: 0
    why:
      vi: "Relay không biết Kafka đã nhận hay chưa, vì nó chỉ dựa vào cột `published` mà cột này chưa đổi. Nên nó gửi lại, và outbox là ít nhất một lần. Consumer bỏ trùng bằng `id` của dòng outbox (khóa bỏ trùng của bài trước), nên gửi lại không làm sai kết quả."
      en: "The relay cannot know whether Kafka got them, because it only relies on the `published` column, which has not changed. So it sends them again, and the outbox is at least once. Consumers dedupe on the outbox row's `id` (the dedupe key from the previous lesson), so the resend does not make the result wrong."
---
## Mở bài

Khi một lô hàng được giao, dịch vụ giao vận của Cargo Query phải làm hai việc: đổi trạng thái trong PostgreSQL và báo cho các đội khác qua Kafka. Bài này cho thấy làm hai việc đó riêng rẽ thì hỏng ra sao, và mẫu outbox sửa nó thế nào.

## Ý chính

**Ghi hai nơi.** Database và Kafka là hai hệ thống, không có transaction chung. Nếu ghi database rồi gửi message, lần gửi có thể thất bại sau khi database đã commit; nếu gửi trước, database có thể thất bại sau khi message đã đi. Hai bên lệch nhau và không ai biết.

**Outbox.** Thay vì gửi thẳng, dịch vụ ghi sự kiện vào bảng `outbox` **trong cùng transaction** với thay đổi: hoặc cả hai cùng có, hoặc không gì cả. Ở đây một câu lệnh có `WITH` đủ làm việc đó. Một tiến trình riêng, gọi là relay, đọc `outbox` theo thứ tự rồi gửi lên Kafka.

**Relay.** Relay có thể là một tiến trình đọc bảng như ở lab, hoặc Debezium đọc thay đổi của bảng `outbox` (bài CDC kế tiếp). Bộ Outbox Event Router của Debezium mặc định đọc các cột `id`, `aggregatetype`, `aggregateid`, `type`, `payload`; topic là `outbox.event.` cộng với `aggregatetype`, và `aggregateid` là khóa của message, nên mọi sự kiện của một lô vào cùng partition. Relay có thể sập giữa lúc gửi và lúc đánh dấu, nên outbox là ít nhất một lần: consumer vẫn cần bỏ trùng.

Hình cuối mục cho thấy đường đi từ dịch vụ tới topic.

## Cú pháp

```sql
WITH s AS (
  UPDATE shipments
  SET status = 'delivered'
  WHERE shipment_id = 'SHP-102'
  RETURNING shipment_id, status)
INSERT INTO outbox (aggregatetype,
  aggregateid, type, payload)
SELECT 'shipment', shipment_id,
  'StatusChanged',
  jsonb_build_object('status', status)
FROM s;
```

Cấu hình mặc định của Outbox Event Router (chỉ để đọc):

```text
# topic   = outbox.event.<aggregatetype>
# key     = aggregateid
# payload = payload
```

- Một câu lệnh có `WITH` chạy trong một transaction: `UPDATE` và `INSERT` cùng thành hoặc cùng hỏng.
- `jsonb_build_object` dựng payload JSON từ cặp tên và giá trị.

## Ví dụ

Outbox hiện tại: một dòng đã gửi, một dòng chưa.

```sql
SELECT id, aggregateid, type,
  payload, published
FROM outbox
ORDER BY id;
```

Mỗi dòng outbox so với trạng thái đang lưu:

```sql
SELECT o.id, o.aggregateid,
  o.payload->>'status' AS sent,
  s.status AS stored
FROM outbox o
JOIN shipments s
  ON s.shipment_id = o.aggregateid
ORDER BY o.id;
```

## Lỗi hay gặp

Ghi hai lần riêng rẽ: `UPDATE` đã xong, `INSERT` vào outbox hỏng, nên SHP-103 đổi trạng thái mà không có sự kiện nào.

```sql
UPDATE shipments SET status = 'lost'
WHERE shipment_id = 'SHP-103';
-- ERROR 23502
INSERT INTO outbox (aggregatetype)
VALUES ('shipment');
```

```sql
SELECT shipment_id, status
FROM shipments
WHERE shipment_id = 'SHP-103';
```

Cùng lỗi đó trong một câu `WITH`: cả câu bị hủy, nên SHP-101 không đổi.

```sql
-- ERROR 23502
WITH s AS (
  UPDATE shipments SET status = 'lost'
  WHERE shipment_id = 'SHP-101'
  RETURNING shipment_id)
INSERT INTO outbox (aggregatetype)
SELECT 'shipment' FROM s;
```

```sql
SELECT shipment_id, status
FROM shipments
WHERE shipment_id = 'SHP-101';
```

## Thực hành

Ba bước: đổi trạng thái và ghi outbox trong một câu lệnh, đọc outbox như relay, rồi đánh dấu các dòng đã gửi.

## Tóm tắt

- Ghi database rồi gửi message riêng rẽ có thể làm hai bên lệch nhau.
- Outbox: ghi sự kiện vào bảng `outbox` trong cùng transaction với thay đổi.
- Relay (một tiến trình hay Debezium) đọc outbox theo thứ tự và gửi lên Kafka, khóa là `aggregateid`.
- Relay có thể gửi lại sau khi sập: outbox là ít nhất một lần, consumer vẫn phải bỏ trùng.

# EN

## Opening

When a shipment is delivered, Cargo Query's operations service has to do two things: change the status in PostgreSQL and tell other teams through Kafka. This lesson shows how doing them separately goes wrong, and how the outbox pattern fixes it.

## Key idea

**Writing to two places.** The database and Kafka are two systems with no shared transaction. If you write the database and then send the message, the send can fail after the database has committed; if you send first, the database can fail after the message is gone. The two end up out of step and nobody knows.

**The outbox.** Instead of sending directly, the service writes the event into an `outbox` table **in the same transaction** as the change: either both happen or neither does. Here one statement with `WITH` is enough for that. A separate process, the relay, reads `outbox` in order and sends to Kafka.

**The relay.** The relay can be a process that reads the table, as in the lab, or Debezium reading the changes of the `outbox` table (the next CDC lesson). Debezium's Outbox Event Router reads the columns `id`, `aggregatetype`, `aggregateid`, `type`, `payload` by default; the topic is `outbox.event.` followed by `aggregatetype`, and `aggregateid` is the message key, so every event of one shipment lands in the same partition. The relay can crash between sending and marking, so the outbox is at least once: consumers still need to dedupe.

The figure at the end of this section shows the path from the service to the topic.

## Syntax

```sql
WITH s AS (
  UPDATE shipments
  SET status = 'delivered'
  WHERE shipment_id = 'SHP-102'
  RETURNING shipment_id, status)
INSERT INTO outbox (aggregatetype,
  aggregateid, type, payload)
SELECT 'shipment', shipment_id,
  'StatusChanged',
  jsonb_build_object('status', status)
FROM s;
```

The Outbox Event Router's defaults (to read only):

```text
# topic   = outbox.event.<aggregatetype>
# key     = aggregateid
# payload = payload
```

- A statement with `WITH` runs in one transaction: the `UPDATE` and the `INSERT` succeed or fail together.
- `jsonb_build_object` builds a JSON payload from name and value pairs.

## Example

The outbox now: one row sent, one not yet.

```sql
SELECT id, aggregateid, type,
  payload, published
FROM outbox
ORDER BY id;
```

Each outbox row next to the stored status:

```sql
SELECT o.id, o.aggregateid,
  o.payload->>'status' AS sent,
  s.status AS stored
FROM outbox o
JOIN shipments s
  ON s.shipment_id = o.aggregateid
ORDER BY o.id;
```

## Common mistakes

Two separate writes: the `UPDATE` is done, the `INSERT` into the outbox fails, so SHP-103 changes status without any event.

```sql
UPDATE shipments SET status = 'lost'
WHERE shipment_id = 'SHP-103';
-- ERROR 23502
INSERT INTO outbox (aggregatetype)
VALUES ('shipment');
```

```sql
SELECT shipment_id, status
FROM shipments
WHERE shipment_id = 'SHP-103';
```

The same error in one `WITH` statement: the whole statement is undone, so SHP-101 does not change.

```sql
-- ERROR 23502
WITH s AS (
  UPDATE shipments SET status = 'lost'
  WHERE shipment_id = 'SHP-101'
  RETURNING shipment_id)
INSERT INTO outbox (aggregatetype)
SELECT 'shipment' FROM s;
```

```sql
SELECT shipment_id, status
FROM shipments
WHERE shipment_id = 'SHP-101';
```

## Practice

Three steps: change a status and write the outbox in one statement, read the outbox as the relay, then mark the rows as sent.

## Recap

- Writing the database and sending a message separately can leave the two out of step.
- The outbox: write the event into an `outbox` table in the same transaction as the change.
- A relay (a process or Debezium) reads the outbox in order and sends to Kafka, keyed by `aggregateid`.
- The relay can resend after a crash: the outbox is at least once, and consumers must still dedupe.
