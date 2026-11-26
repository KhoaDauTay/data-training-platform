---
id: e-sm-l2-05
engine: stream
level: L2
module: cdc
title: Phong bì sự kiện Debezium - before, after, op
title_en: The Debezium event envelope - before, after, op
kind: lab
runtime: browser
minutes: 25
figures: [{ name: sm-envelope, at: idea }]
objectives:
  - vi: Đọc một sự kiện thay đổi của Debezium - `before`, `after`, `op`, `source`, `ts_ms`.
    en: Read a Debezium change event - `before`, `after`, `op`, `source`, `ts_ms`.
  - vi: Lấy đúng khóa của một sự kiện xóa và tìm lần sửa thật sự đổi một cột.
    en: Take the right key of a delete event and find updates that really changed a column.
  - vi: Dựng trạng thái hiện tại từ phong bì, kể cả snapshot `r` và xóa `d`.
    en: Build the current state from envelopes, snapshot `r` and delete `d` included.
requires: [e-sm-l2-04]
sources:
  - { url: "https://debezium.io/documentation/reference/stable/connectors/postgresql.html", title: "Debezium docs: PostgreSQL connector (change event values)" }
  - { url: "https://www.postgresql.org/docs/18/sql-altertable.html", title: "PostgreSQL 18 docs: ALTER TABLE (REPLICA IDENTITY)" }
  - { url: "https://www.postgresql.org/docs/18/functions-comparison.html", title: "PostgreSQL 18 docs: Comparison operators (IS DISTINCT FROM)" }
lab:
  setup: |
    CREATE TABLE change_log (
      lsn int PRIMARY KEY,
      op char(1) NOT NULL,
      before jsonb,
      after jsonb
    );
    INSERT INTO change_log VALUES
      (1, 'r', NULL, '{"shipment_id": "SHP-101",
        "status": "booked", "updated_by": "ops"}'),
      (2, 'r', NULL, '{"shipment_id": "SHP-102",
        "status": "booked", "updated_by": "ops"}'),
      (3, 'u', '{"shipment_id": "SHP-101",
        "status": "booked", "updated_by": "ops"}',
        '{"shipment_id": "SHP-101",
        "status": "picked_up", "updated_by": "ops"}'),
      (4, 'u', '{"shipment_id": "SHP-101",
        "status": "picked_up", "updated_by": "ops"}',
        '{"shipment_id": "SHP-101",
        "status": "picked_up", "updated_by": "billing"}'),
      (5, 'c', NULL, '{"shipment_id": "SHP-103",
        "status": "booked", "updated_by": "ops"}'),
      (6, 'd', '{"shipment_id": "SHP-102",
        "status": "booked", "updated_by": "ops"}', NULL),
      (7, 'u', '{"shipment_id": "SHP-103",
        "status": "booked", "updated_by": "ops"}',
        '{"shipment_id": "SHP-103",
        "status": "picked_up", "updated_by": "ops"}');
  steps:
    - task:
        vi: "Tìm các sự kiện xóa và lô hàng bị xóa: trả `lsn`, `shipment_id`."
        en: "Find the delete events and the shipment each one deleted: return `lsn`, `shipment_id`."
      solution: |
        SELECT lsn,
          before->>'shipment_id' AS shipment_id
        FROM change_log
        WHERE op = 'd'
      check: rows
      hint:
        vi: "Sự kiện `d` có `after` là NULL; khóa nằm trong `before`."
        en: "A `d` event has a NULL `after`; the key is in `before`."
    - task:
        vi: "Những lần sửa (`op` = `u`) thật sự đổi trạng thái: trả `lsn`, `shipment_id`, `old_status`, `new_status`."
        en: "The updates (`op` = `u`) that really changed the status: return `lsn`, `shipment_id`, `old_status`, `new_status`."
      solution: |
        SELECT lsn,
          after->>'shipment_id' AS shipment_id,
          before->>'status' AS old_status,
          after->>'status' AS new_status
        FROM change_log
        WHERE op = 'u'
          AND before->>'status'
            IS DISTINCT FROM after->>'status'
      check: rows
      hint:
        vi: "So `before->>'status'` với `after->>'status'`: sự kiện `lsn` 4 chỉ đổi `updated_by`."
        en: "Compare `before->>'status'` with `after->>'status'`: event `lsn` 4 only changed `updated_by`."
    - task:
        vi: "Dựng trạng thái hiện tại từ mọi phong bì: mỗi lô lấy sự kiện có `lsn` lớn nhất, lô có sự kiện cuối là xóa thì không hiện. Trả `shipment_id`, `status`."
        en: "Build the current state from all envelopes: each shipment takes its event with the largest `lsn`, and a shipment whose last event is a delete does not show. Return `shipment_id`, `status`."
      solution: |
        SELECT shipment_id, status
        FROM (
          SELECT DISTINCT ON (
              coalesce(after, before)
                ->>'shipment_id')
            coalesce(after, before)
              ->>'shipment_id' AS shipment_id,
            op, after->>'status' AS status
          FROM change_log
          ORDER BY coalesce(after, before)
              ->>'shipment_id', lsn DESC
        ) latest
        WHERE op <> 'd'
      check: rows
      hint:
        vi: "Khóa là `coalesce(after, before)->>'shipment_id'`; lấy sự kiện mới nhất trước, rồi mới bỏ `op` = `d` ở ngoài."
        en: "The key is `coalesce(after, before)->>'shipment_id'`; take the newest event first, then drop `op` = `d` outside."
quiz:
  - q:
      vi: "Bảng `shipments` để `REPLICA IDENTITY` mặc định. Một sự kiện `u` đổi `status`. Trong `before` có gì?"
      en: "Table `shipments` keeps the default `REPLICA IDENTITY`. A `u` event changes `status`. What is in `before`?"
    options:
      - { vi: "Mọi cột của dòng trước khi sửa", en: "Every column of the row before the change" }
      - { vi: "Chỉ cột khóa chính, và chỉ khi khóa đổi", en: "Only primary key columns, and only if the key changed" }
      - { vi: "Đúng các cột đã đổi, với giá trị cũ", en: "Exactly the changed columns, with old values" }
    answer: 1
    trap: 0
    why:
      vi: "Thấy mọi cột trong `before` là điều ta mong, nhưng tài liệu Debezium nói với `REPLICA IDENTITY` mặc định, sự kiện sửa và xóa chỉ mang giá trị cũ của cột khóa chính, và sự kiện sửa chỉ có chúng khi khóa đổi. Muốn có trạng thái cũ để so như bước 2, bảng cần `REPLICA IDENTITY FULL`."
      en: "Seeing every column in `before` is what we hope for, but the Debezium docs say that with the default `REPLICA IDENTITY`, update and delete events only carry the old values of the primary key columns, and an update only has them when the key changed. To get the old status to compare, as in step 2, the table needs `REPLICA IDENTITY FULL`."
  - q:
      vi: "Sau một sự kiện `d` cho SHP-102, Debezium gửi thêm một message cùng khóa với giá trị null. Nó để làm gì?"
      en: "After a `d` event for SHP-102, Debezium sends one more message with the same key and a null value. What is it for?"
    options:
      - { vi: "Báo consumer rằng lần xóa bị lỗi", en: "To tell consumers the delete failed" }
      - { vi: "Đánh dấu hết transaction của lần xóa", en: "To mark the end of the delete's transaction" }
      - { vi: "Là tombstone, để nén topic bỏ được khóa", en: "It is a tombstone, so compaction can drop the key" }
    answer: 2
    trap: 1
    why:
      vi: "Nghe như một dấu kết thúc, nhưng ranh giới transaction không được báo theo cách đó. Tài liệu Debezium nói sự kiện xóa được theo sau bởi một tombstone cùng khóa với giá trị null, để log compaction của Kafka bỏ hết các message cũ của khóa đó, như bài e-sm-l1-04 đã mô phỏng."
      en: "It sounds like an end marker, but transaction boundaries are not signalled that way. The Debezium docs say a delete event is followed by a tombstone with the same key and a null value, so Kafka's log compaction can remove every older message of that key, as e-sm-l1-04 simulated."
---
## Mở bài

Debezium không gửi một dòng mà gửi một phong bì (envelope) cho mỗi thay đổi. Bài này đọc phong bì đó trong một bảng PostgreSQL mô phỏng, để biết lấy khóa ở đâu, so cái gì, và dựng trạng thái thế nào.

## Ý chính

**Các trường.** Theo tài liệu Debezium, giá trị của một sự kiện thay đổi có `before` (dòng trước, có thể không có), `after` (dòng sau, có thể không có), `source` (siêu dữ liệu, trong đó có vị trí trong nhật ký của database), `op` và `ts_ms`. `ts_ms` trong `source` là lúc thay đổi xảy ra ở database; `ts_ms` ở ngoài là lúc Debezium xử lý nó.

**`op`.** `c` là thêm, `u` là sửa, `d` là xóa, `r` là đọc trong snapshot ban đầu, `t` là truncate. Sự kiện `c` và `r` không có `before`; sự kiện `d` có `after` là null, nên khóa phải lấy từ `before`.

**REPLICA IDENTITY.** Với giá trị mặc định, `before` của sự kiện sửa và xóa chỉ mang cột khóa chính; `REPLICA IDENTITY FULL` cho mọi cột. Bảng `change_log` của lab giả định FULL, nên so được trạng thái cũ với mới.

**Tombstone.** Sau sự kiện xóa, Debezium gửi thêm một message cùng khóa, giá trị null, để topic nén bỏ được khóa đó.

Hình cuối mục là một phong bì `u` của lab.

## Cú pháp

```sql
-- the key of any event
coalesce(after, before)
  ->>'shipment_id'
-- a column really changed
before->>'status'
  IS DISTINCT FROM after->>'status'
-- old values of every column
ALTER TABLE shipments
  REPLICA IDENTITY FULL;
```

Một phong bì `c`, rút gọn (chỉ để đọc):

```text
{
  "before": null,
  "after": {
    "shipment_id": "SHP-103",
    "status": "booked"
  },
  "source": { "lsn": 24023128 },
  "op": "c",
  "ts_ms": 1793430000000
}
```

- `->>` lấy một trường jsonb ra dạng chữ.
- `IS DISTINCT FROM` coi NULL là một giá trị, nên so được cả khi một bên không có.

## Ví dụ

Mọi phong bì theo thứ tự, với trạng thái trước và sau:

```sql
SELECT lsn, op,
  before->>'status' AS before_status,
  after->>'status' AS after_status
FROM change_log
ORDER BY lsn;
```

Số sự kiện theo từng `op`:

```sql
SELECT op, count(*) AS events
FROM change_log
GROUP BY op
ORDER BY op;
```

## Lỗi hay gặp

Lấy khóa từ `after` cho mọi sự kiện: sự kiện xóa mất khóa.

```sql
-- WRONG: the delete has no key
SELECT lsn, op,
  after->>'shipment_id' AS shipment_id
FROM change_log
ORDER BY lsn;
```

```sql
-- FIX: after, else before
SELECT lsn, op,
  coalesce(after, before)
    ->>'shipment_id' AS shipment_id
FROM change_log
ORDER BY lsn;
```

So bằng `<>` thì sự kiện `c` và `r` (không có `before`) bị loại im lặng, vì so với NULL ra NULL.

```sql
-- WRONG: c and r events vanish
SELECT lsn, op FROM change_log
WHERE before->>'status'
  <> after->>'status'
ORDER BY lsn;
```

```sql
-- FIX: NULL counts as a value
SELECT lsn, op FROM change_log
WHERE before->>'status'
  IS DISTINCT FROM after->>'status'
ORDER BY lsn;
```

## Thực hành

Ba bước: tìm sự kiện xóa và khóa của chúng, tìm lần sửa thật sự đổi trạng thái, rồi dựng trạng thái hiện tại từ mọi phong bì.

## Tóm tắt

- Phong bì Debezium: `before`, `after`, `source`, `op`, `ts_ms`.
- `op`: `c` thêm, `u` sửa, `d` xóa, `r` snapshot, `t` truncate; khóa của `d` nằm trong `before`.
- `before` đủ mọi cột chỉ khi bảng có `REPLICA IDENTITY FULL`.
- Dựng trạng thái: sự kiện mới nhất của mỗi khóa trước, bỏ `d` sau.

# EN

## Opening

Debezium does not send a row but an envelope for each change. This lesson reads that envelope in a simulated PostgreSQL table, to learn where to take the key from, what to compare, and how to build state.

## Key idea

**The fields.** According to the Debezium docs, a change event's value has `before` (the row before, optional), `after` (the row after, optional), `source` (metadata, including the position in the database's log), `op` and `ts_ms`. The `ts_ms` inside `source` is when the change happened in the database; the outer `ts_ms` is when Debezium processed it.

**`op`.** `c` is create, `u` is update, `d` is delete, `r` is a read in the initial snapshot, `t` is truncate. `c` and `r` events have no `before`; a `d` event has a null `after`, so its key must come from `before`.

**REPLICA IDENTITY.** With the default setting, the `before` of update and delete events only carries the primary key columns; `REPLICA IDENTITY FULL` gives every column. The lab's `change_log` table assumes FULL, so old and new status can be compared.

**Tombstones.** After a delete event, Debezium sends one more message with the same key and a null value, so a compacted topic can drop that key.

The figure at the end of this section is one of the lab's `u` envelopes.

## Syntax

```sql
-- the key of any event
coalesce(after, before)
  ->>'shipment_id'
-- a column really changed
before->>'status'
  IS DISTINCT FROM after->>'status'
-- old values of every column
ALTER TABLE shipments
  REPLICA IDENTITY FULL;
```

A `c` envelope, shortened (to read only):

```text
{
  "before": null,
  "after": {
    "shipment_id": "SHP-103",
    "status": "booked"
  },
  "source": { "lsn": 24023128 },
  "op": "c",
  "ts_ms": 1793430000000
}
```

- `->>` takes a jsonb field out as text.
- `IS DISTINCT FROM` treats NULL as a value, so it compares even when one side is missing.

## Example

Every envelope in order, with the status before and after:

```sql
SELECT lsn, op,
  before->>'status' AS before_status,
  after->>'status' AS after_status
FROM change_log
ORDER BY lsn;
```

The number of events per `op`:

```sql
SELECT op, count(*) AS events
FROM change_log
GROUP BY op
ORDER BY op;
```

## Common mistakes

Taking the key from `after` for every event: the delete event loses its key.

```sql
-- WRONG: the delete has no key
SELECT lsn, op,
  after->>'shipment_id' AS shipment_id
FROM change_log
ORDER BY lsn;
```

```sql
-- FIX: after, else before
SELECT lsn, op,
  coalesce(after, before)
    ->>'shipment_id' AS shipment_id
FROM change_log
ORDER BY lsn;
```

Comparing with `<>` silently drops the `c` and `r` events (which have no `before`), because comparing with NULL gives NULL.

```sql
-- WRONG: c and r events vanish
SELECT lsn, op FROM change_log
WHERE before->>'status'
  <> after->>'status'
ORDER BY lsn;
```

```sql
-- FIX: NULL counts as a value
SELECT lsn, op FROM change_log
WHERE before->>'status'
  IS DISTINCT FROM after->>'status'
ORDER BY lsn;
```

## Practice

Three steps: find the delete events and their keys, find the updates that really changed the status, then build the current state from all envelopes.

## Recap

- A Debezium envelope: `before`, `after`, `source`, `op`, `ts_ms`.
- `op`: `c` create, `u` update, `d` delete, `r` snapshot, `t` truncate; a `d`'s key is in `before`.
- `before` holds every column only when the table has `REPLICA IDENTITY FULL`.
- Building state: the newest event per key first, drop `d` after.
