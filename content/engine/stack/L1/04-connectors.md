---
id: e-st-l1-04
engine: stack
level: L1
module: ingest
title: Fivetran, Airbyte hay tự viết?
title_en: Fivetran, Airbyte or hand-rolled?
kind: concept
runtime: docs
minutes: 12
figures: [{ name: st-cdc-vs-full, at: idea }]
objectives:
  - vi: Phân biệt chép lại cả bảng, nạp tăng dần theo con trỏ và CDC, và biết cách nào thấy được dòng bị xóa.
    en: Tell full refresh, cursor-based incremental and CDC apart, and know which one sees deleted rows.
  - vi: Biết người phân tích nên hỏi gì khi một connector hỏng hoặc chậm.
    en: Know what an analyst should ask when a connector breaks or lags.
requires: [e-st-l1-03]
sources:
  - { url: "https://fivetran.com/docs/core-concepts/system-columns-and-tables", title: "Fivetran docs: System columns and tables" }
  - { url: "https://docs.airbyte.com/platform/using-airbyte/core-concepts/sync-modes", title: "Airbyte docs: Sync modes" }
  - https://www.postgresql.org/docs/18/logical-replication.html
demo_setup: |
  CREATE SCHEMA app;
  CREATE SCHEMA raw_shop;
  CREATE TABLE app.orders (
    id int, status text, updated_at timestamp
  );
  INSERT INTO app.orders VALUES
    (301, 'paid', '2026-10-30 20:00'),
    (302, 'shipped', '2026-10-31 08:00'),
    (304, 'paid', '2026-10-30 23:00'),
    (305, 'pending', '2026-10-31 09:30');
  CREATE TABLE raw_shop.orders (
    id int, status text, updated_at timestamp
  );
  INSERT INTO raw_shop.orders VALUES
    (301, 'paid', '2026-10-30 20:00'),
    (302, 'paid', '2026-10-30 21:00'),
    (303, 'paid', '2026-10-30 22:00');
  CREATE TABLE app.order_changes (
    id int, op char(1), at timestamp
  );
  INSERT INTO app.order_changes VALUES
    (302, 'u', '2026-10-31 08:00'),
    (303, 'd', '2026-10-31 08:15'),
    (304, 'i', '2026-10-30 23:00'),
    (305, 'i', '2026-10-31 09:30');
quiz:
  - q:
      vi: "Connector nạp tăng dần theo cột `updated_at`. Một đơn bị xóa hẳn ở nguồn. Lần đồng bộ sau, bảng raw ra sao?"
      en: "A connector loads incrementally on column `updated_at`. An order is hard-deleted at the source. After the next sync, what does the raw table show?"
    options:
      - { vi: "Đơn vẫn nằm đó như chưa có gì xảy ra", en: "The order stays as if nothing happened" }
      - { vi: "Đơn được đánh dấu đã xóa ngay", en: "The order is flagged as deleted at once" }
      - { vi: "Cả bảng raw được chép lại từ đầu", en: "The whole raw table is copied again" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì Fivetran có cột xóa mềm, nhưng cột đó cần một nguồn báo được việc xóa (như CDC). Con trỏ chỉ hỏi \"dòng nào có `updated_at` mới hơn\"; dòng đã xóa không còn để trả lời, nên bảng raw giữ nó mãi."
      en: "It sounds right because Fivetran has a soft-delete column, but that column needs a source that reports deletes (such as CDC). A cursor only asks \"which rows have a newer `updated_at`\"; a deleted row is no longer there to answer, so the raw table keeps it forever."
  - q:
      vi: "Sáng nay doanh thu hôm qua thấp bất thường và bạn thấy lần đồng bộ cuối là từ chiều qua. Bạn làm gì trước?"
      en: "This morning yesterday's revenue is oddly low and you see the last sync was yesterday afternoon. What do you do first?"
    options:
      - { vi: "Viết một script tự chép dữ liệu bù vào kho", en: "Write a script that copies the missing data in" }
      - { vi: "Cộng thêm phần ước tính vào số trên dashboard", en: "Add an estimate to the dashboard's number" }
      - { vi: "Báo người lo connector và ghi chú độ trễ lên báo cáo", en: "Tell the connector's owner and note the lag on the report" }
    answer: 2
    trap: 0
    why:
      vi: "Tự chép bù nghe nhanh, nhưng tạo một đường ống thứ hai không ai lo và dễ chép trùng. Connector có người phụ trách: báo họ, và ghi rõ trên báo cáo rằng dữ liệu mới tới giờ đồng bộ cuối."
      en: "Copying it yourself sounds quick, but it creates a second pipeline nobody owns and easily duplicates rows. The connector has an owner: tell them, and state on the report that the data only runs to the last sync."
---
## Mở bài

Ở Chợ Lồng Đèn, không ai viết tay đoạn mã chép dữ liệu nữa: một connector làm việc đó theo lịch. Bài này đọc từ tài liệu của các hãng để hiểu connector chép thế nào, vì cách chép quyết định bảng raw có gì.

## Ý chính

Một **connector** biết cách đọc một loại nguồn (Postgres, một API thanh toán, một bảng tính) và ghi vào kho. Fivetran là dịch vụ có sẵn connector; Airbyte có bản mã nguồn mở tự chạy được; tự viết thì bạn tự lo lịch, lỗi và thay đổi của nguồn.

Có ba cách chép chính. **Chép lại cả bảng** (full refresh) đọc toàn bộ mỗi lần: đơn giản, đúng, nhưng tốn với bảng lớn. **Tăng dần theo con trỏ** (cursor) chỉ lấy dòng có `updated_at` mới hơn lần trước: rẻ, nhưng không thấy dòng bị xóa hẳn. **CDC** (change data capture) đọc nhật ký thay đổi của database, như logical replication của Postgres: thấy cả thêm, sửa và xóa, nên công cụ có thể đánh dấu xóa mềm.

Người phân tích không cần dựng connector, nhưng cần hỏi: bảng này nạp theo cách nào, bao lâu một lần, dòng xóa ở nguồn có hiện trong kho không, và ai nhận báo khi connector hỏng. Hình cuối mục đặt hai cách chép cạnh nhau.

## Ví dụ

Nạp theo con trỏ: chỉ những dòng có `updated_at` sau lần đồng bộ trước (23:00 ngày 30):

```sql
SELECT id, status, updated_at
FROM app.orders
WHERE updated_at
  > '2026-10-30 23:00'
ORDER BY id;
```

Dòng 303 đã bị xóa ở nguồn, nhưng con trỏ không bao giờ thấy, nên nó vẫn ở bảng raw:

```sql
SELECT r.id, r.status
FROM raw_shop.orders r
WHERE NOT EXISTS (
  SELECT 1 FROM app.orders a
  WHERE a.id = r.id);
```

CDC đọc nhật ký thay đổi, có cả thao tác xóa (`d`):

```sql
SELECT id, op, at
FROM app.order_changes
ORDER BY at;
```

## Lỗi hay gặp

Con trỏ dùng `>`: dòng 304 có `updated_at` đúng bằng mốc nhưng được ghi sau khi lần đồng bộ trước đã đọc, nên bị bỏ lỡ.

```sql
-- WRONG: strictly after the cursor
SELECT id FROM app.orders
WHERE updated_at
  > '2026-10-30 23:00'
ORDER BY id;
```

```sql
-- FIX: >= the cursor, dedupe by key
SELECT DISTINCT id FROM app.orders
WHERE updated_at
  >= '2026-10-30 23:00'
ORDER BY id;
```

Đếm đơn trên bảng raw nạp theo con trỏ: đơn đã xóa vẫn được đếm.

```sql
-- WRONG: 303 was deleted at the source
SELECT count(*) AS orders
FROM raw_shop.orders;
```

```sql
-- FIX: drop ids the change log deleted
SELECT count(*) AS orders
FROM raw_shop.orders r
WHERE NOT EXISTS (
  SELECT 1 FROM app.order_changes c
  WHERE c.id = r.id AND c.op = 'd');
```

## Tóm tắt

- Chép lại cả bảng: đúng nhưng tốn; con trỏ: rẻ nhưng không thấy xóa hẳn; CDC: thấy cả xóa.
- Mốc con trỏ nên dùng `>=` rồi bỏ trùng theo khóa.
- Hỏi người lo đường ống: cách nạp, lịch đồng bộ, xử lý xóa, ai nhận báo lỗi.
- Connector hỏng thì báo người phụ trách; đừng tự dựng đường ống thứ hai.

# EN

## Opening

At Lantern Market nobody hand-writes copy scripts any more: a connector does it on a schedule. This lesson reads the vendors' docs to see how connectors copy, because the way they copy decides what the raw table holds.

## Key idea

A **connector** knows how to read one kind of source (Postgres, a payment API, a spreadsheet) and write to the warehouse. Fivetran is a hosted service with ready-made connectors; Airbyte has an open-source edition you can run yourself; hand-rolling means you own the schedule, the failures and the source's changes.

There are three main ways to copy. **Full refresh** reads everything every time: simple and correct, but costly for big tables. **Cursor-based incremental** takes only rows whose `updated_at` is newer than last time: cheap, but blind to hard-deleted rows. **CDC** (change data capture) reads the database's change log, such as Postgres logical replication: it sees inserts, updates and deletes, so the tool can flag soft deletes.

An analyst does not need to build connectors, but should ask: how is this table loaded, how often, do rows deleted at the source show in the warehouse, and who gets the alert when the connector breaks. The figure at the end of this section puts two ways of copying side by side.

## Example

Cursor-based loading: only rows whose `updated_at` is after the previous sync (23:00 on 30 Oct):

```sql
SELECT id, status, updated_at
FROM app.orders
WHERE updated_at
  > '2026-10-30 23:00'
ORDER BY id;
```

Row 303 was deleted at the source, but the cursor never sees it, so it stays in the raw table:

```sql
SELECT r.id, r.status
FROM raw_shop.orders r
WHERE NOT EXISTS (
  SELECT 1 FROM app.orders a
  WHERE a.id = r.id);
```

CDC reads the change log, deletes (`d`) included:

```sql
SELECT id, op, at
FROM app.order_changes
ORDER BY at;
```

## Common mistakes

A cursor with `>`: row 304 has an `updated_at` exactly at the mark but was written after the previous sync had read, so it is missed.

```sql
-- WRONG: strictly after the cursor
SELECT id FROM app.orders
WHERE updated_at
  > '2026-10-30 23:00'
ORDER BY id;
```

```sql
-- FIX: >= the cursor, dedupe by key
SELECT DISTINCT id FROM app.orders
WHERE updated_at
  >= '2026-10-30 23:00'
ORDER BY id;
```

Counting orders on a cursor-loaded raw table: the deleted order still counts.

```sql
-- WRONG: 303 was deleted at the source
SELECT count(*) AS orders
FROM raw_shop.orders;
```

```sql
-- FIX: drop ids the change log deleted
SELECT count(*) AS orders
FROM raw_shop.orders r
WHERE NOT EXISTS (
  SELECT 1 FROM app.order_changes c
  WHERE c.id = r.id AND c.op = 'd');
```

## Recap

- Full refresh: correct but costly; cursor: cheap but blind to hard deletes; CDC: sees deletes too.
- Use `>=` on the cursor mark, then deduplicate by key.
- Ask the pipeline's owner: load method, sync schedule, delete handling, who gets failure alerts.
- When a connector breaks, tell its owner; do not build a second pipeline yourself.
