---
id: e-sm-l2-02
engine: stream
level: L2
module: delivery
title: Consumer idempotent - khóa bỏ trùng và upsert có phiên bản
title_en: Idempotent consumers - dedupe keys and versioned upserts
kind: lab
runtime: browser
minutes: 25
figures: [{ name: sm-idempotent, at: idea }]
objectives:
  - vi: Dùng một bảng khóa bỏ trùng để chỉ tác động một lần cho mỗi sự kiện, kể cả khi sự kiện đến hai lần.
    en: Use a dedupe-key table so each event has its effect once, even when it arrives twice.
  - vi: Viết upsert chỉ ghi đè khi sự kiện mới hơn, để sự kiện đến muộn không kéo trạng thái lùi lại.
    en: Write an upsert that only overwrites with a newer event, so a late event cannot move state backwards.
  - vi: Gộp kiểm tra và tác động vào một câu lệnh, tức một transaction.
    en: Put the check and the effect in one statement, that is, one transaction.
requires: [e-sm-l2-01]
sources:
  - { url: "https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT", title: "PostgreSQL 18 docs: INSERT ... ON CONFLICT", title_vi: "INSERT … ON CONFLICT" }
  - { url: "https://www.postgresql.org/docs/18/queries-with.html#QUERIES-WITH-MODIFYING", title: "PostgreSQL 18 docs: Data-modifying statements in WITH", title_vi: "Câu lệnh ghi dữ liệu trong WITH" }
  - { url: "https://debezium.io/documentation/faq/", title: "Debezium FAQ (duplicates after failures)", title_vi: "Hỏi đáp Debezium (ít nhất một lần khi có lỗi)" }
lab:
  setup: |
    CREATE TABLE inbox_batch (
      seq int PRIMARY KEY,
      event_id text NOT NULL,
      shipment_id text NOT NULL,
      status text NOT NULL,
      version int NOT NULL,
      fee_vnd int NOT NULL
    );
    INSERT INTO inbox_batch VALUES
      (1, 'ev-4', 'SHP-101', 'in_transit', 3, 30000),
      (2, 'ev-3', 'SHP-102', 'picked_up', 2, 25000),
      (3, 'ev-4', 'SHP-101', 'in_transit', 3, 30000),
      (4, 'ev-5', 'SHP-103', 'booked', 1, 50000),
      (5, 'ev-2', 'SHP-101', 'picked_up', 2, 20000);
    CREATE TABLE processed_events (
      event_id text PRIMARY KEY
    );
    INSERT INTO processed_events VALUES
      ('ev-1'), ('ev-2'), ('ev-6');
    CREATE TABLE charges (
      event_id text NOT NULL,
      shipment_id text NOT NULL,
      fee_vnd int NOT NULL
    );
    INSERT INTO charges VALUES
      ('ev-1', 'SHP-102', 50000),
      ('ev-2', 'SHP-101', 20000),
      ('ev-6', 'SHP-102', 30000);
    CREATE TABLE shipment_status (
      shipment_id text PRIMARY KEY,
      status text NOT NULL,
      version int NOT NULL
    );
    INSERT INTO shipment_status VALUES
      ('SHP-101', 'picked_up', 2),
      ('SHP-102', 'in_transit', 3);
  steps:
    - task:
        vi: "Lô `inbox_batch` vừa đến, có sự kiện lặp. Sự kiện nào chưa từng được xử lý (không có trong `processed_events`)? Trả `event_id`, mỗi sự kiện một dòng."
        en: "Batch `inbox_batch` just arrived, with repeated events. Which events were never processed (not in `processed_events`)? Return `event_id`, one row per event."
      solution: |
        SELECT DISTINCT b.event_id
        FROM inbox_batch b
        WHERE NOT EXISTS (
          SELECT 1 FROM processed_events p
          WHERE p.event_id = b.event_id)
      check: rows
      hint:
        vi: "`NOT EXISTS` loại sự kiện đã xử lý; `DISTINCT` gộp hai bản của `ev-4`."
        en: "`NOT EXISTS` removes processed events; `DISTINCT` merges the two copies of `ev-4`."
    - task:
        vi: "Ghi phí cho đúng các sự kiện mới, trong một câu lệnh: chèn `event_id` vào `processed_events` (bỏ qua khóa đã có), và chỉ những sự kiện vừa chèn được mới được ghi vào `charges` (mỗi sự kiện một dòng)."
        en: "Charge fees for exactly the new events, in one statement: insert the `event_id` values into `processed_events` (skipping keys already there), and only the events just inserted get a row in `charges` (one row per event)."
      solution: |
        WITH fresh AS (
          INSERT INTO processed_events (event_id)
          SELECT DISTINCT event_id
          FROM inbox_batch
          ON CONFLICT DO NOTHING
          RETURNING event_id
        )
        INSERT INTO charges
          (event_id, shipment_id, fee_vnd)
        SELECT DISTINCT ON (b.event_id)
          b.event_id, b.shipment_id, b.fee_vnd
        FROM inbox_batch b
        JOIN fresh USING (event_id)
        ORDER BY b.event_id
        RETURNING event_id
      after: SELECT shipment_id, sum(fee_vnd) AS fee_vnd FROM charges GROUP BY shipment_id ORDER BY shipment_id
      check: rows
      ordered: true
      hint:
        vi: "`ON CONFLICT DO NOTHING ... RETURNING event_id` trả về đúng các khóa vừa chèn; nối `inbox_batch` với kết quả đó."
        en: "`ON CONFLICT DO NOTHING ... RETURNING event_id` returns exactly the keys just inserted; join `inbox_batch` to that result."
    - task:
        vi: "Cập nhật `shipment_status` từ lô: mỗi lô hàng lấy sự kiện có `version` lớn nhất trong lô, nhưng chỉ ghi đè khi phiên bản đó mới hơn phiên bản đang lưu."
        en: "Update `shipment_status` from the batch: each shipment takes the batch's event with the largest `version`, but only overwrites when that version is newer than the stored one."
      solution: |
        INSERT INTO shipment_status AS s
        SELECT DISTINCT ON (shipment_id)
          shipment_id, status, version
        FROM inbox_batch
        ORDER BY shipment_id, version DESC
        ON CONFLICT (shipment_id) DO UPDATE
        SET status = EXCLUDED.status,
          version = EXCLUDED.version
        WHERE s.version < EXCLUDED.version
        RETURNING shipment_id, status
      after: SELECT shipment_id, status, version FROM shipment_status ORDER BY shipment_id
      check: rows
      ordered: true
      hint:
        vi: "`ON CONFLICT ... DO UPDATE ... WHERE s.version < EXCLUDED.version`: không có `WHERE`, SHP-102 bị kéo lùi về `picked_up`."
        en: "`ON CONFLICT ... DO UPDATE ... WHERE s.version < EXCLUDED.version`: without the `WHERE`, SHP-102 is pulled back to `picked_up`."
quiz:
  - q:
      vi: "Consumer ghi phí rồi mới chèn `event_id` vào `processed_events`, bằng hai câu lệnh riêng. Máy sập giữa hai câu. Lần chạy lại thì sao?"
      en: "A consumer writes the fee, then inserts the `event_id` into `processed_events`, as two separate statements. The machine crashes between them. What happens on the rerun?"
    options:
      - { vi: "Không sao, `ON CONFLICT` chặn lần thứ hai", en: "Fine, `ON CONFLICT` blocks the second time" }
      - { vi: "Phí bị ghi hai lần vì khóa chưa được lưu", en: "The fee is written twice: the key was never saved" }
      - { vi: "Phí bị mất vì câu thứ hai không chạy", en: "The fee is lost because the second statement never ran" }
    answer: 1
    trap: 0
    why:
      vi: "`ON CONFLICT` chỉ chặn được khi khóa đã nằm trong `processed_events`, mà ở đây câu chèn khóa chưa kịp chạy thì máy đã sập. Lần chạy lại thấy sự kiện là mới và ghi phí lần nữa. Vì thế bước 2 gộp hai việc vào một câu lệnh: PostgreSQL chạy một câu lệnh trong một transaction, nên hoặc cả hai cùng có, hoặc không có gì."
      en: "`ON CONFLICT` can only block when the key is already in `processed_events`, and here the machine crashed before the key insert ran. The rerun sees the event as new and writes the fee again. That is why step 2 puts both in one statement: PostgreSQL runs one statement in one transaction, so either both happen or neither does."
  - q:
      vi: "Sự kiện `ev-3` (SHP-102, phiên bản 2) đến sau khi đã lưu phiên bản 3. Ghi đè thì sao?"
      en: "Event `ev-3` (SHP-102, version 2) arrives after version 3 was stored. What if it overwrites?"
    options:
      - { vi: "Không sao, sự kiện đến sau luôn là mới nhất", en: "Fine, the event that arrives last is always newest" }
      - { vi: "Upsert sẽ báo lỗi vì khóa đã tồn tại", en: "The upsert fails because the key already exists" }
      - { vi: "Trạng thái lùi về `picked_up`, sai với thực tế", en: "The status goes back to `picked_up`, which is wrong" }
    answer: 2
    trap: 0
    why:
      vi: "Đến sau không có nghĩa là xảy ra sau: sự kiện có thể được giao lại hay đi đường khác nên đến trễ. Upsert không báo lỗi; nó ghi đè và kéo SHP-102 từ `in_transit` về `picked_up`. So `version` (hay thời điểm của sự kiện) với giá trị đang lưu là cách chặn chuyện đó."
      en: "Arriving later does not mean happening later: an event can be redelivered or take another path and arrive late. The upsert does not fail; it overwrites and pulls SHP-102 from `in_transit` back to `picked_up`. Comparing `version` (or the event's timestamp) with the stored value is how to stop that."
---
## Mở bài

Vì giao nhận là ít nhất một lần, consumer tính phí của Cargo Query sẽ nhận lại sự kiện cũ, và đôi khi nhận sự kiện không đúng thứ tự. Bài này viết consumer sao cho nhận hai lần hay nhận lộn xộn vẫn ra cùng một kết quả.

## Ý chính

**Idempotent** nghĩa là làm lại một việc không đổi kết quả. Một consumer idempotent cần hai thứ.

**Khóa bỏ trùng (dedupe key).** Mỗi sự kiện có một id ổn định (ở đây `event_id`; với Kafka có thể là cặp partition và offset). Bảng `processed_events` có khóa chính là id đó. Chèn với `ON CONFLICT DO NOTHING ... RETURNING` trả về đúng những id mới, và chỉ chúng được tác động (ghi phí). Khóa và tác động phải nằm trong cùng một transaction: ở đây là một câu lệnh có `WITH`, vì PostgreSQL chạy mỗi câu lệnh trọn vẹn hoặc không gì cả.

**Phiên bản (version).** Bỏ trùng không xử lý được sự kiện đến sai thứ tự: `ev-3` là sự kiện mới, chưa xử lý, nhưng cũ hơn trạng thái đang lưu. Upsert với `WHERE s.version < EXCLUDED.version` chỉ ghi đè khi sự kiện mới hơn.

Trùng lặp ở tầng nạp dữ liệu đã gặp ở bài e-st-l1-03; bài này làm cùng việc ngay trong consumer. Hình cuối mục cho thấy lô năm dòng thành ba lần ghi phí.

## Cú pháp

```sql
WITH fresh AS (
  INSERT INTO processed_events
  SELECT DISTINCT event_id
  FROM inbox_batch
  ON CONFLICT DO NOTHING
  RETURNING event_id)
INSERT INTO charges ...
SELECT ... FROM inbox_batch b
JOIN fresh USING (event_id);

INSERT INTO shipment_status AS s ...
ON CONFLICT (shipment_id) DO UPDATE
SET status = EXCLUDED.status
WHERE s.version < EXCLUDED.version;
```

- `EXCLUDED`: dòng mà câu `INSERT` định chèn nhưng bị trùng khóa.
- `RETURNING` của một `INSERT ... ON CONFLICT DO NOTHING` không trả dòng bị bỏ qua.

## Ví dụ

Lô vừa đến: `ev-2` đã xử lý từ trước, `ev-4` đến hai lần.

```sql
SELECT seq, event_id, shipment_id,
  version, fee_vnd
FROM inbox_batch
ORDER BY seq;
```

Những khóa đã xử lý trước lần sập:

```sql
SELECT event_id
FROM processed_events
ORDER BY event_id;
```

Trạng thái đang lưu: SHP-102 đã ở phiên bản 3.

```sql
SELECT shipment_id, status, version
FROM shipment_status
ORDER BY shipment_id;
```

## Lỗi hay gặp

Chèn khóa mà không có `ON CONFLICT`: cả câu bị từ chối vì `ev-2` đã có, và không khóa nào được lưu.

```sql
-- ERROR 23505
INSERT INTO processed_events
SELECT DISTINCT event_id
FROM inbox_batch;
```

Lấy sự kiện đến sau cùng thay vì phiên bản lớn nhất:

```sql
-- WRONG: last arrival wins
SELECT DISTINCT ON (shipment_id)
  shipment_id, status, version
FROM inbox_batch
ORDER BY shipment_id, seq DESC;
```

```sql
-- FIX: the largest version wins
SELECT DISTINCT ON (shipment_id)
  shipment_id, status, version
FROM inbox_batch
ORDER BY shipment_id, version DESC;
```

## Thực hành

Ba bước: tìm các sự kiện mới trong lô, ghi phí chỉ cho chúng trong một câu lệnh, rồi cập nhật trạng thái mà không để sự kiện cũ ghi đè.

## Tóm tắt

- Idempotent: chạy lại một sự kiện không đổi kết quả.
- Một bảng khóa bỏ trùng với `ON CONFLICT DO NOTHING ... RETURNING` cho biết sự kiện nào thật sự mới.
- Khóa và tác động phải cùng một transaction; một câu lệnh có `WITH` là một transaction.
- Upsert chỉ ghi đè khi `version` mới hơn, để sự kiện đến muộn không kéo trạng thái lùi.

# EN

## Opening

Because delivery is at least once, Cargo Query's fee consumer will receive old events again, and sometimes receive events out of order. This lesson writes the consumer so that receiving twice or out of order still gives the same result.

## Key idea

**Idempotent** means doing something again does not change the result. An idempotent consumer needs two things.

**A dedupe key.** Each event has a stable id (here `event_id`; with Kafka it can be the partition and offset pair). The `processed_events` table has that id as its primary key. Inserting with `ON CONFLICT DO NOTHING ... RETURNING` returns exactly the new ids, and only they get the effect (the fee). The key and the effect must be in the same transaction: here one statement with `WITH`, because PostgreSQL runs each statement completely or not at all.

**A version.** Deduplication does not handle events that arrive out of order: `ev-3` is a new, unprocessed event, but it is older than the stored state. An upsert with `WHERE s.version < EXCLUDED.version` only overwrites when the event is newer.

Duplicates at the ingestion layer came up in e-st-l1-03; this lesson does the same job inside the consumer. The figure at the end of this section shows a five-row batch becoming three fee rows.

## Syntax

```sql
WITH fresh AS (
  INSERT INTO processed_events
  SELECT DISTINCT event_id
  FROM inbox_batch
  ON CONFLICT DO NOTHING
  RETURNING event_id)
INSERT INTO charges ...
SELECT ... FROM inbox_batch b
JOIN fresh USING (event_id);

INSERT INTO shipment_status AS s ...
ON CONFLICT (shipment_id) DO UPDATE
SET status = EXCLUDED.status
WHERE s.version < EXCLUDED.version;
```

- `EXCLUDED`: the row the `INSERT` tried to insert but whose key already existed.
- The `RETURNING` of an `INSERT ... ON CONFLICT DO NOTHING` does not return skipped rows.

## Example

The batch that just arrived: `ev-2` was processed before, `ev-4` arrives twice.

```sql
SELECT seq, event_id, shipment_id,
  version, fee_vnd
FROM inbox_batch
ORDER BY seq;
```

The keys processed before the crash:

```sql
SELECT event_id
FROM processed_events
ORDER BY event_id;
```

The stored state: SHP-102 is already at version 3.

```sql
SELECT shipment_id, status, version
FROM shipment_status
ORDER BY shipment_id;
```

## Common mistakes

Inserting the keys without `ON CONFLICT`: the whole statement is refused because `ev-2` exists, and no key is saved.

```sql
-- ERROR 23505
INSERT INTO processed_events
SELECT DISTINCT event_id
FROM inbox_batch;
```

Taking the event that arrived last instead of the largest version:

```sql
-- WRONG: last arrival wins
SELECT DISTINCT ON (shipment_id)
  shipment_id, status, version
FROM inbox_batch
ORDER BY shipment_id, seq DESC;
```

```sql
-- FIX: the largest version wins
SELECT DISTINCT ON (shipment_id)
  shipment_id, status, version
FROM inbox_batch
ORDER BY shipment_id, version DESC;
```

## Practice

Three steps: find the new events in the batch, charge fees for them alone in one statement, then update the state without letting an old event overwrite it.

## Recap

- Idempotent: running an event again does not change the result.
- A dedupe-key table with `ON CONFLICT DO NOTHING ... RETURNING` tells which events are really new.
- The key and the effect must share one transaction; a statement with `WITH` is one transaction.
- The upsert only overwrites with a newer `version`, so a late event cannot move state backwards.
