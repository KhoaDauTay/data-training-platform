---
id: e-sm-l2-04
engine: stream
level: L2
module: cdc
title: CDC - WAL, logical decoding và một bảng thay đổi mô phỏng
title_en: CDC - the WAL, logical decoding and a simulated change table
kind: lab
runtime: browser
minutes: 25
figures: [{ name: sm-cdc-trigger, at: idea }]
objectives:
  - vi: Kể đường đi của CDC thật trên PostgreSQL - WAL, logical decoding, replication slot, plugin xuất.
    en: Trace real CDC on PostgreSQL - the WAL, logical decoding, a replication slot, an output plugin.
  - vi: Nói thật vì sao lab dùng trigger thay cho replication slot, và hai cách khác nhau ở đâu.
    en: Say honestly why the lab uses a trigger instead of a replication slot, and where the two differ.
  - vi: Ghi thêm, sửa, xóa và đọc thay đổi theo thứ tự trong bảng thay đổi.
    en: Insert, update, delete and read the changes in order from the change table.
requires: [e-sm-l2-03]
sources:
  - { url: "https://www.postgresql.org/docs/18/logicaldecoding-explanation.html", title: "PostgreSQL 18 docs: Logical decoding concepts", title_vi: "Khái niệm logical decoding (thay đổi được gửi lại sau khi máy sập)" }
  - { url: "https://www.postgresql.org/docs/18/plpgsql-trigger.html", title: "PostgreSQL 18 docs: Trigger functions", title_vi: "Hàm trigger" }
  - { url: "https://debezium.io/documentation/reference/stable/connectors/postgresql.html", title: "Debezium docs: PostgreSQL connector", title_vi: "Tài liệu Debezium: connector PostgreSQL (giá trị của sự kiện thay đổi)" }
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
    CREATE TABLE change_log (
      lsn int GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,
      op char(1) NOT NULL,
      row_key text NOT NULL,
      before jsonb,
      after jsonb
    );
    CREATE FUNCTION capture() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO change_log (op, row_key, after)
        VALUES ('c', NEW.shipment_id, to_jsonb(NEW));
      ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO change_log
          (op, row_key, before, after)
        VALUES ('u', NEW.shipment_id,
          to_jsonb(OLD), to_jsonb(NEW));
      ELSE
        INSERT INTO change_log (op, row_key, before)
        VALUES ('d', OLD.shipment_id, to_jsonb(OLD));
      END IF;
      RETURN NULL;
    END $$;
    CREATE TRIGGER shipments_cdc
      AFTER INSERT OR UPDATE OR DELETE ON shipments
      FOR EACH ROW EXECUTE FUNCTION capture();
  steps:
    - task:
        vi: "Đặt chỗ lô mới SHP-104 với trạng thái `booked` trong `shipments`, trả lại dòng vừa thêm. Trigger sẽ ghi thay đổi `c` vào `change_log`."
        en: "Book a new shipment SHP-104 with status `booked` in `shipments`, returning the row added. The trigger will write a `c` change to `change_log`."
      solution: |
        INSERT INTO shipments
        VALUES ('SHP-104', 'booked')
        RETURNING shipment_id, status
      after: SELECT lsn, op, row_key, before->>'status' AS before_status, after->>'status' AS after_status FROM change_log ORDER BY lsn
      check: rows
      ordered: true
      hint:
        vi: "Ghi vào `shipments`, không ghi tay vào `change_log`: trigger làm việc đó."
        en: "Write to `shipments`, not by hand to `change_log`: the trigger does that."
    - task:
        vi: "Lô SHP-101 đã giao: đổi `status` thành `delivered` và trả lại dòng vừa đổi. Thay đổi `u` mang cả trạng thái cũ và mới."
        en: "Shipment SHP-101 was delivered: set its `status` to `delivered` and return the row changed. The `u` change carries both the old and the new status."
      solution: |
        UPDATE shipments
        SET status = 'delivered'
        WHERE shipment_id = 'SHP-101'
        RETURNING shipment_id, status
      after: SELECT lsn, op, row_key, before->>'status' AS before_status, after->>'status' AS after_status FROM change_log ORDER BY lsn
      check: rows
      ordered: true
      hint:
        vi: "`UPDATE ... WHERE shipment_id = 'SHP-101'`: không có `WHERE` thì mọi lô đều đổi, và `change_log` nhận ba thay đổi."
        en: "`UPDATE ... WHERE shipment_id = 'SHP-101'`: without the `WHERE` every shipment changes, and `change_log` gets three changes."
    - task:
        vi: "Lô SHP-103 bị hủy và xóa khỏi `shipments`. Xóa nó và trả `shipment_id` của dòng bị xóa."
        en: "Shipment SHP-103 was cancelled and is deleted from `shipments`. Delete it and return the `shipment_id` of the deleted row."
      solution: |
        DELETE FROM shipments
        WHERE shipment_id = 'SHP-103'
        RETURNING shipment_id
      after: SELECT lsn, op, row_key, before->>'status' AS before_status, after->>'status' AS after_status FROM change_log ORDER BY lsn
      check: rows
      ordered: true
      hint:
        vi: "Một lệnh `DELETE` thật cho ra thay đổi `d`; đổi trạng thái thành `cancelled` chỉ là một `u`."
        en: "A real `DELETE` gives a `d` change; setting the status to `cancelled` is only a `u`."
quiz:
  - q:
      vi: "Một transaction sửa SHP-102 rồi `ROLLBACK`. Consumer CDC (Debezium hay bảng thay đổi của lab) thấy gì?"
      en: "A transaction changes SHP-102 and then does `ROLLBACK`. What does a CDC consumer (Debezium or the lab's change table) see?"
    options:
      - { vi: "Hai thay đổi: lần sửa và lần hoàn tác", en: "Two changes: the edit and the undo" }
      - { vi: "Không có gì, vì transaction không commit", en: "Nothing, because the transaction never committed" }
      - { vi: "Một thay đổi `u` mang trạng thái tạm", en: "One `u` change with the temporary status" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như CDC ghi lại mọi việc từng xảy ra, nhưng logical decoding chỉ xuất các transaction đã commit. Trigger của lab cũng ghi `change_log` trong cùng transaction, nên `ROLLBACK` hủy luôn dòng thay đổi. Ví dụ thứ hai của bài cho thấy số dòng của `change_log` không đổi."
      en: "It sounds as if CDC records everything that ever happened, but logical decoding only emits committed transactions. The lab's trigger also writes `change_log` in the same transaction, so `ROLLBACK` undoes the change row too. The lesson's second example shows the row count of `change_log` does not change."
  - q:
      vi: "Debezium bắt đầu đọc slot hôm nay, trên một bảng đã có 10 000 dòng. Nó lấy 10 000 dòng cũ bằng cách nào?"
      en: "Debezium starts reading a slot today, on a table that already has 10,000 rows. How does it get the 10,000 old rows?"
    options:
      - { vi: "Đọc lại toàn bộ WAL từ ngày tạo bảng", en: "Replay the whole WAL since the table was created" }
      - { vi: "Không lấy: CDC chỉ có thay đổi từ giờ", en: "It does not: CDC only has changes from now on" }
      - { vi: "Chụp snapshot ban đầu, mỗi dòng một sự kiện `r`", en: "An initial snapshot, one `r` event per row" }
    answer: 2
    trap: 1
    why:
      vi: "Đúng là slot chỉ giữ thay đổi từ lúc nó được tạo, nên nghe như dòng cũ bị bỏ. Debezium xử lý bằng một snapshot ban đầu: đọc các dòng có sẵn và phát mỗi dòng một sự kiện với `op` = `r` (read), rồi mới đọc slot. WAL cũ thì đã bị dọn, không đọc lại được từ đầu."
      en: "It is true that a slot only keeps changes from when it was created, so the old rows seem lost. Debezium handles this with an initial snapshot: it reads the existing rows and emits one event per row with `op` = `r` (read), then starts on the slot. Old WAL has already been cleaned up and cannot be replayed from the start."
---
## Mở bài

Outbox bắt dịch vụ tự ghi sự kiện; CDC (change data capture) lấy thay đổi thẳng từ database mà không cần sửa dịch vụ. Bài này đi qua cách PostgreSQL làm việc đó, nói rõ phần nào lab không chạy được, rồi mô phỏng phần còn lại bằng trigger.

## Ý chính

**CDC thật.** Mỗi thay đổi được ghi vào WAL (write-ahead log) trước, như bài e-pg-l3-12 đã cho thấy. Logical decoding đọc WAL và đổi nó thành các thay đổi dễ hiểu theo dòng. Một replication slot giữ một luồng thay đổi theo đúng thứ tự commit, và giữ lại WAL cho tới khi consumer đọc xong. Một plugin xuất (ví dụ `pgoutput`, có sẵn từ PostgreSQL 10) định dạng thay đổi; Debezium đọc slot qua plugin đó. Bài e-pg-l5-13 đi sâu hơn về slot.

**Lab không chạy được phần đó.** PGlite trong trình duyệt chạy với `wal_level` = `replica`, và từ chối tạo logical slot (lỗi 55000, xem mục Lỗi hay gặp). Vì vậy lab mô phỏng: một trigger `AFTER ... FOR EACH ROW` ghi mỗi thay đổi vào `change_log` với `op` = `c`/`u`/`d`, dòng trước (`before`) và sau (`after`). Cột `lsn` chỉ là một số tăng dần, không phải LSN thật.

**Giống và khác.** Giống: chỉ thay đổi đã commit mới có mặt, theo thứ tự. Khác: trigger chạy trong transaction của người ghi nên làm mỗi lần ghi chậm thêm, còn logical decoding đọc WAL sau đó; và tài liệu PostgreSQL nói sau một lần sập, slot có thể gửi lại thay đổi, nên consumer phải bỏ trùng. Hình cuối mục đặt hai đường cạnh nhau.

## Cú pháp

```sql
CREATE TRIGGER shipments_cdc
  AFTER INSERT OR UPDATE OR DELETE
  ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION capture();
-- inside capture(): TG_OP, OLD, NEW
-- to_jsonb(OLD) AS before
-- to_jsonb(NEW) AS after
```

Đường CDC thật trên một server PostgreSQL (chỉ để đọc, không chạy trong PGlite):

```text
wal_level = logical
SELECT
  pg_create_logical_replication_slot(
    'cdc', 'pgoutput');
```

- `TG_OP`: `INSERT`, `UPDATE` hay `DELETE`; `OLD` là dòng trước, `NEW` là dòng sau.
- Một thay đổi `c` không có `before`; một thay đổi `d` không có `after`.

## Ví dụ

Mức WAL của PGlite: `replica`, chưa đủ cho logical decoding.

```sql
SHOW wal_level;
```

Một thay đổi bị `ROLLBACK` không để lại dòng nào trong `change_log`:

```sql
BEGIN;
UPDATE shipments SET status = 'lost'
WHERE shipment_id = 'SHP-102';
ROLLBACK;
SELECT count(*) AS changes
FROM change_log;
```

Một thay đổi đã commit được ghi với dòng trước và dòng sau:

```sql
UPDATE shipments
SET status = 'delivered'
WHERE shipment_id = 'SHP-102';
SELECT lsn, op, row_key, before, after
FROM change_log
ORDER BY lsn;
```

## Lỗi hay gặp

Tạo logical slot ngay trong PGlite: server từ chối vì `wal_level` chưa là `logical`.

```sql
-- ERROR 55000
SELECT
  pg_create_logical_replication_slot(
    'cdc', 'pgoutput');
```

Đếm lô hàng từ bảng thay đổi: các lô chưa từng đổi từ khi bật CDC không có mặt. Đó là lý do Debezium chụp snapshot ban đầu.

```sql
-- WRONG: only shipments that changed
SELECT count(DISTINCT row_key)
  AS shipments
FROM change_log;
```

```sql
-- FIX: the table itself
SELECT count(*) AS shipments
FROM shipments;
```

## Thực hành

Ba bước: thêm, sửa rồi xóa một lô hàng, và sau mỗi bước xem `change_log` nhận thay đổi `c`, `u`, `d` theo thứ tự.

## Tóm tắt

- CDC thật trên PostgreSQL: WAL, logical decoding, replication slot, plugin xuất như `pgoutput`, rồi Debezium.
- PGlite chạy `wal_level` = `replica` nên không tạo được logical slot; lab mô phỏng bằng trigger ghi `change_log`.
- Chỉ thay đổi đã commit mới có mặt, theo thứ tự; `ROLLBACK` không để lại gì.
- Slot có thể gửi lại sau khi sập, và thay đổi chỉ có từ lúc bật CDC: cần bỏ trùng và snapshot ban đầu.

# EN

## Opening

The outbox makes the service write its own events; CDC (change data capture) takes changes straight from the database without touching the service. This lesson walks through how PostgreSQL does it, says clearly which part the lab cannot run, then simulates the rest with a trigger.

## Key idea

**Real CDC.** Every change is written to the WAL (write-ahead log) first, as e-pg-l3-12 showed. Logical decoding reads the WAL and turns it into easy-to-read changes per row. A replication slot holds one stream of changes in commit order, and keeps the WAL until the consumer has read it. An output plugin (for example `pgoutput`, built in since PostgreSQL 10) formats the changes; Debezium reads the slot through that plugin. Lesson e-pg-l5-13 goes deeper into slots.

**The lab cannot run that part.** PGlite in the browser runs with `wal_level` = `replica`, and refuses to create a logical slot (error 55000, see Common mistakes). So the lab simulates: an `AFTER ... FOR EACH ROW` trigger writes each change to `change_log` with `op` = `c`/`u`/`d`, the row before (`before`) and after (`after`). The `lsn` column is only an increasing number, not a real LSN.

**Alike and different.** Alike: only committed changes appear, in order. Different: the trigger runs inside the writer's transaction, so it makes every write slower, while logical decoding reads the WAL afterwards; and the PostgreSQL docs say that after a crash a slot may send changes again, so consumers must dedupe. The figure at the end of this section puts the two paths side by side.

## Syntax

```sql
CREATE TRIGGER shipments_cdc
  AFTER INSERT OR UPDATE OR DELETE
  ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION capture();
-- inside capture(): TG_OP, OLD, NEW
-- to_jsonb(OLD) AS before
-- to_jsonb(NEW) AS after
```

The real CDC path on a PostgreSQL server (to read only, it does not run in PGlite):

```text
wal_level = logical
SELECT
  pg_create_logical_replication_slot(
    'cdc', 'pgoutput');
```

- `TG_OP`: `INSERT`, `UPDATE` or `DELETE`; `OLD` is the row before, `NEW` the row after.
- A `c` change has no `before`; a `d` change has no `after`.

## Example

PGlite's WAL level: `replica`, not enough for logical decoding.

```sql
SHOW wal_level;
```

A change undone with `ROLLBACK` leaves no row in `change_log`:

```sql
BEGIN;
UPDATE shipments SET status = 'lost'
WHERE shipment_id = 'SHP-102';
ROLLBACK;
SELECT count(*) AS changes
FROM change_log;
```

A committed change is recorded with the row before and the row after:

```sql
UPDATE shipments
SET status = 'delivered'
WHERE shipment_id = 'SHP-102';
SELECT lsn, op, row_key, before, after
FROM change_log
ORDER BY lsn;
```

## Common mistakes

Creating a logical slot in PGlite: the server refuses because `wal_level` is not `logical`.

```sql
-- ERROR 55000
SELECT
  pg_create_logical_replication_slot(
    'cdc', 'pgoutput');
```

Counting shipments from the change table: shipments that never changed since CDC was turned on are missing. That is why Debezium takes an initial snapshot.

```sql
-- WRONG: only shipments that changed
SELECT count(DISTINCT row_key)
  AS shipments
FROM change_log;
```

```sql
-- FIX: the table itself
SELECT count(*) AS shipments
FROM shipments;
```

## Practice

Three steps: insert, update and then delete a shipment, and after each one look at `change_log` receiving the `c`, `u`, `d` changes in order.

## Recap

- Real CDC on PostgreSQL: the WAL, logical decoding, a replication slot, an output plugin such as `pgoutput`, then Debezium.
- PGlite runs `wal_level` = `replica`, so it cannot create a logical slot; the lab simulates it with a trigger writing `change_log`.
- Only committed changes appear, in order; a `ROLLBACK` leaves nothing.
- A slot can resend after a crash, and changes only exist from when CDC was turned on: dedupe, and take an initial snapshot.
