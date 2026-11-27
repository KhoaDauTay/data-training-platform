---
id: e-sm-l1-04
engine: stream
level: L1
module: log
title: Nén nhật ký - giữ bản mới nhất của mỗi khóa
title_en: Log compaction - the latest value per key
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sm-compaction, at: idea }]
objectives:
  - vi: Phân biệt giữ theo thời hạn (retention) với nén theo khóa (compaction).
    en: Tell time-based retention from compaction by key.
  - vi: Đọc một topic đã nén thành trạng thái hiện tại, kể cả khi có tombstone.
    en: Read a compacted topic as current state, tombstones included.
  - vi: Mô phỏng một lần nén bằng một câu `DELETE` mà không đổi offset.
    en: Simulate one compaction pass with a `DELETE` that keeps offsets unchanged.
requires: [e-sm-l1-02]
sources:
  - { url: "https://kafka.apache.org/41/design/design/", title: "Kafka docs: Design (log compaction, tombstones)", title_vi: "Tài liệu Kafka: thiết kế (bảo đảm giao nhận, producer idempotent, transaction)" }
  - { url: "https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT", title: "PostgreSQL 18 docs: SELECT DISTINCT ON", title_vi: "SELECT DISTINCT ON" }
  - { url: "https://www.postgresql.org/docs/18/sql-delete.html", title: "PostgreSQL 18 docs: DELETE", title_vi: "DELETE" }
lab:
  setup: |
    CREATE TABLE status_log (
      msg_offset int PRIMARY KEY,
      shipment_id text NOT NULL,
      status text
    );
    INSERT INTO status_log VALUES
      (0, 'SHP-101', 'booked'),
      (1, 'SHP-102', 'booked'),
      (2, 'SHP-103', 'booked'),
      (3, 'SHP-101', 'picked_up'),
      (4, 'SHP-102', 'picked_up'),
      (5, 'SHP-101', 'in_transit'),
      (6, 'SHP-102', NULL),
      (7, 'SHP-103', 'picked_up');
  steps:
    - task:
        vi: "Topic `status_log` là topic nén: mỗi khóa chỉ cần bản mới nhất. Trả bản mới nhất của mỗi lô, giữ cả tombstone (`status` NULL): `msg_offset`, `shipment_id`, `status`."
        en: "Topic `status_log` is a compacted topic: each key only needs its latest value. Return each shipment's latest record, tombstones (`status` NULL) included: `msg_offset`, `shipment_id`, `status`."
      solution: |
        SELECT DISTINCT ON (shipment_id)
          msg_offset, shipment_id, status
        FROM status_log
        ORDER BY shipment_id, msg_offset DESC
      check: rows
      hint:
        vi: "`DISTINCT ON (shipment_id)` với `msg_offset DESC`: trong một partition, offset lớn hơn là bản ghi sau."
        en: "`DISTINCT ON (shipment_id)` with `msg_offset DESC`: within one partition, a larger offset is a later record."
    - task:
        vi: "Trạng thái hiện tại cho consumer: lô có bản mới nhất là tombstone đã bị xóa và không được hiện. Trả `shipment_id`, `status`."
        en: "The current state for a consumer: a shipment whose latest record is a tombstone has been deleted and must not show. Return `shipment_id`, `status`."
      solution: |
        SELECT shipment_id, status
        FROM (
          SELECT DISTINCT ON (shipment_id)
            shipment_id, status
          FROM status_log
          ORDER BY shipment_id, msg_offset DESC
        ) latest
        WHERE status IS NOT NULL
      check: rows
      hint:
        vi: "Lấy bản mới nhất trước (truy vấn con), rồi mới bỏ tombstone ở ngoài. Lọc NULL trước sẽ làm SHP-102 sống lại."
        en: "Take the latest record first (a subquery), then drop tombstones outside it. Filtering NULL first brings SHP-102 back to life."
    - task:
        vi: "Chạy một lần nén: xóa mọi bản ghi đã có bản mới hơn cùng khóa, trả `msg_offset` của các dòng bị xóa. Offset của các dòng còn lại không đổi."
        en: "Run one compaction pass: delete every record that has a newer one with the same key, returning the `msg_offset` of the deleted rows. The remaining rows keep their offsets."
      solution: |
        DELETE FROM status_log l
        WHERE EXISTS (
          SELECT 1 FROM status_log n
          WHERE n.shipment_id = l.shipment_id
            AND n.msg_offset > l.msg_offset)
        RETURNING l.msg_offset
      after: SELECT msg_offset, shipment_id, status FROM status_log ORDER BY msg_offset
      check: rows
      ordered: true
      hint:
        vi: "Một dòng bị xóa khi `EXISTS` một dòng cùng `shipment_id` có `msg_offset` lớn hơn."
        en: "A row is deleted when there `EXISTS` a row with the same `shipment_id` and a larger `msg_offset`."
quiz:
  - q:
      vi: "Topic `shipment-status` được nén. Một consumer mới đọc từ đầu. Nó chắc chắn thấy gì?"
      en: "Topic `shipment-status` is compacted. A new consumer reads from the beginning. What is it sure to see?"
    options:
      - { vi: "Mọi lần đổi trạng thái của mọi lô", en: "Every status change of every shipment" }
      - { vi: "Ít nhất bản mới nhất của mỗi lô", en: "At least the latest value of each shipment" }
      - { vi: "Chỉ các sự kiện trong 7 ngày gần nhất", en: "Only the events of the last 7 days" }
    answer: 1
    trap: 0
    why:
      vi: "Đọc từ đầu nghe như sẽ thấy hết, nhưng nén đã bỏ các bản cũ có bản mới hơn cùng khóa. Tài liệu Kafka chỉ hứa giữ ít nhất giá trị cuối của mỗi khóa trong một partition; bản cũ chưa kịp nén thì có thể vẫn còn. Giới hạn theo số ngày là chuyện của retention, không phải compaction."
      en: "Reading from the beginning sounds like seeing everything, but compaction has removed old values that have a newer one with the same key. The Kafka docs only promise to keep at least the last known value for each key in a partition; older values not compacted yet may still be there. A limit in days is retention, not compaction."
  - q:
      vi: "Bản mới nhất của SHP-102 là tombstone (giá trị NULL). Consumer dựng trạng thái nên làm gì?"
      en: "SHP-102's latest record is a tombstone (a NULL value). What should a consumer building state do?"
    options:
      - { vi: "Bỏ qua nó và giữ trạng thái `picked_up` trước đó", en: "Skip it and keep the earlier `picked_up` status" }
      - { vi: "Ghi trạng thái của SHP-102 thành chữ NULL", en: "Write SHP-102's status as the text NULL" }
      - { vi: "Xóa SHP-102 khỏi trạng thái hiện tại", en: "Delete SHP-102 from the current state" }
    answer: 2
    trap: 0
    why:
      vi: "Bỏ qua dòng NULL nghe an toàn, nhưng như vậy SHP-102 sống lại với `picked_up`. Tài liệu Kafka coi một bản ghi có khóa và giá trị NULL là lệnh xóa khóa đó (tombstone). Consumer phải xóa khóa, và vì tombstone cũng bị dọn sau một thời gian, consumer chậm quá lâu có thể lỡ nó."
      en: "Skipping the NULL row sounds safe, but then SHP-102 comes back to life as `picked_up`. The Kafka docs treat a record with a key and a NULL value as a delete of that key (a tombstone). The consumer must delete the key, and since tombstones are also cleaned up after a while, a consumer that lags too long can miss it."
---
## Mở bài

Topic `shipment-status` chỉ cần trả lời "mỗi lô đang ở đâu", không cần giữ từng bước đi. Kafka có cách giữ topic gọn cho câu hỏi đó mà không vứt mất khóa nào: nén theo khóa.

## Ý chính

**Retention và compaction.** Mỗi topic chọn cách dọn. Retention bỏ sự kiện cũ theo thời gian hoặc dung lượng, bất kể khóa. Compaction (nén) giữ, theo lời tài liệu Kafka, ít nhất giá trị cuối đã biết của mỗi khóa trong một partition, và bỏ dần các giá trị cũ hơn. Nhờ đó consumer mới đọc từ đầu vẫn dựng lại được trạng thái hiện tại.

**Offset không đổi.** Nén chỉ xóa bản ghi, không đánh số lại: bản còn lại giữ nguyên offset. Sau khi nén, offset có lỗ hổng, và đó là bình thường.

**Tombstone.** Muốn xóa một khóa, producer ghi một bản ghi có khóa và giá trị NULL. Nén dùng nó để bỏ các bản trước của khóa đó; sau một thời gian (cấu hình `delete.retention.ms`) chính tombstone cũng bị bỏ. Consumer dựng trạng thái phải hiểu NULL là "xóa khóa này".

**Trong lab.** Bảng `status_log` là một partition. `DISTINCT ON` cho thấy những gì một topic đã nén chắc chắn còn giữ, và một câu `DELETE` mô phỏng một lần nén. Hình cuối mục cho thấy bốn bản ghi còn hai sau khi nén.

## Cú pháp

```sql
-- what a compacted topic keeps
SELECT DISTINCT ON (shipment_id) *
FROM status_log
ORDER BY shipment_id, msg_offset DESC;
-- a tombstone deletes the key
WHERE status IS NOT NULL -- after!
-- one compaction pass
DELETE FROM status_log l
WHERE EXISTS (SELECT 1
  FROM status_log n
  WHERE n.shipment_id = l.shipment_id
    AND n.msg_offset > l.msg_offset);
```

- Bỏ tombstone **sau** khi lấy bản mới nhất, không phải trước.
- `msg_offset` của dòng còn lại không đổi sau `DELETE`.

## Ví dụ

Cả nhật ký trước khi nén, kể cả tombstone ở offset 6:

```sql
SELECT msg_offset, shipment_id, status
FROM status_log
ORDER BY msg_offset;
```

Số bản ghi của mỗi khóa: nén sẽ chỉ giữ một.

```sql
SELECT shipment_id, count(*) AS records
FROM status_log
GROUP BY shipment_id
ORDER BY shipment_id;
```

## Lỗi hay gặp

Lọc tombstone trước khi lấy bản mới nhất làm khóa đã xóa sống lại:

```sql
-- WRONG: SHP-102 comes back
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM status_log
WHERE status IS NOT NULL
ORDER BY shipment_id, msg_offset DESC;
```

```sql
-- FIX: latest first, then drop
SELECT shipment_id, status
FROM (SELECT DISTINCT ON (shipment_id)
    shipment_id, status
  FROM status_log
  ORDER BY shipment_id,
    msg_offset DESC) latest
WHERE status IS NOT NULL;
```

Xếp offset tăng dần giữ lại bản **cũ nhất** của mỗi khóa:

```sql
-- WRONG: oldest per key
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM status_log
ORDER BY shipment_id, msg_offset;
```

```sql
-- FIX: newest per key
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM status_log
ORDER BY shipment_id, msg_offset DESC;
```

## Thực hành

Ba bước: đọc những gì topic nén chắc chắn giữ, dựng trạng thái hiện tại có xử lý tombstone, rồi chạy một lần nén bằng `DELETE`.

## Tóm tắt

- Retention bỏ theo thời gian hoặc dung lượng; compaction giữ ít nhất giá trị cuối của mỗi khóa.
- Nén không đánh số lại: offset còn lại giữ nguyên, có lỗ hổng.
- Tombstone (giá trị NULL) nghĩa là xóa khóa; bỏ nó sau khi đã lấy bản mới nhất.
- Consumer chậm quá `delete.retention.ms` có thể lỡ tombstone.

# EN

## Opening

Topic `shipment-status` only has to answer "where is each shipment now", not keep every step. Kafka has a way to keep a topic lean for that question without losing any key: compaction by key.

## Key idea

**Retention and compaction.** Each topic picks how it is cleaned. Retention drops old events by time or size, whatever their key. Compaction keeps, in the Kafka docs' words, at least the last known value for each key within a partition, and gradually drops older values. That way a new consumer reading from the beginning can still rebuild the current state.

**Offsets do not change.** Compaction only deletes records, it never renumbers: the records that stay keep their offsets. After compaction the offsets have gaps, and that is normal.

**Tombstones.** To delete a key, the producer writes a record with that key and a NULL value. Compaction uses it to drop the key's earlier records; after a while (setting `delete.retention.ms`) the tombstone itself is dropped too. A consumer building state must read NULL as "delete this key".

**In the lab.** The `status_log` table is one partition. `DISTINCT ON` shows what a compacted topic is sure to keep, and one `DELETE` simulates one compaction pass. The figure at the end of this section shows four records becoming two after compaction.

## Syntax

```sql
-- what a compacted topic keeps
SELECT DISTINCT ON (shipment_id) *
FROM status_log
ORDER BY shipment_id, msg_offset DESC;
-- a tombstone deletes the key
WHERE status IS NOT NULL -- after!
-- one compaction pass
DELETE FROM status_log l
WHERE EXISTS (SELECT 1
  FROM status_log n
  WHERE n.shipment_id = l.shipment_id
    AND n.msg_offset > l.msg_offset);
```

- Drop tombstones **after** taking the latest record, not before.
- The remaining rows' `msg_offset` does not change after the `DELETE`.

## Example

The whole log before compaction, including the tombstone at offset 6:

```sql
SELECT msg_offset, shipment_id, status
FROM status_log
ORDER BY msg_offset;
```

The number of records per key: compaction keeps only one.

```sql
SELECT shipment_id, count(*) AS records
FROM status_log
GROUP BY shipment_id
ORDER BY shipment_id;
```

## Common mistakes

Filtering tombstones before taking the latest record brings a deleted key back:

```sql
-- WRONG: SHP-102 comes back
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM status_log
WHERE status IS NOT NULL
ORDER BY shipment_id, msg_offset DESC;
```

```sql
-- FIX: latest first, then drop
SELECT shipment_id, status
FROM (SELECT DISTINCT ON (shipment_id)
    shipment_id, status
  FROM status_log
  ORDER BY shipment_id,
    msg_offset DESC) latest
WHERE status IS NOT NULL;
```

Sorting offsets ascending keeps the **oldest** record of each key:

```sql
-- WRONG: oldest per key
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM status_log
ORDER BY shipment_id, msg_offset;
```

```sql
-- FIX: newest per key
SELECT DISTINCT ON (shipment_id)
  shipment_id, status
FROM status_log
ORDER BY shipment_id, msg_offset DESC;
```

## Practice

Three steps: read what a compacted topic is sure to keep, build the current state with tombstones handled, then run one compaction pass with `DELETE`.

## Recap

- Retention drops by time or size; compaction keeps at least the last value of each key.
- Compaction never renumbers: remaining offsets stay, with gaps.
- A tombstone (a NULL value) means delete the key; drop it after taking the latest record.
- A consumer that lags more than `delete.retention.ms` can miss a tombstone.
