---
id: e-st-l3-03
engine: stack
level: L3
module: warehouse
title: "Time travel, clone và UNDROP"
title_en: "Time travel, clone and UNDROP"
kind: concept
runtime: docs
minutes: 15
figures: [{ name: st-time-travel, at: idea }]
objectives:
  - vi: Đọc `AT(OFFSET => …)`, `AT(TIMESTAMP => …)`, `BEFORE(STATEMENT => …)` và `UNDROP TABLE` của Snowflake, và biết giới hạn lưu (1 ngày mặc định, tới 90 ngày với Enterprise).
    en: Read Snowflake's `AT(OFFSET => …)`, `AT(TIMESTAMP => …)`, `BEFORE(STATEMENT => …)` and `UNDROP TABLE`, and know the retention limit (1 day by default, up to 90 days on Enterprise).
  - vi: Dùng clone để thử một thay đổi rủi ro mà không đụng bảng thật, và làm điều tương tự trong Postgres.
    en: Use a clone to try a risky change without touching the real table, and do the same in Postgres.
requires: [e-st-l3-01]
sources:
  - { url: "https://docs.snowflake.com/en/user-guide/data-time-travel", title: "Snowflake docs: Understanding & using Time Travel" }
  - { url: "https://docs.snowflake.com/en/user-guide/data-failsafe", title: "Snowflake docs: Understanding and viewing Fail-safe" }
  - { url: "https://docs.snowflake.com/en/user-guide/tables-storage-considerations", title: "Snowflake docs: Data storage considerations" }
  - https://www.postgresql.org/docs/18/sql-createtableas.html
demo_setup: |
  CREATE SCHEMA marts;
  CREATE TABLE marts.orders (
    order_id int, status text, amount_vnd int
  );
  INSERT INTO marts.orders VALUES
    (1001, 'paid', 300000),
    (1002, 'paid', 200000),
    (1003, 'pending', 400000),
    (1004, 'pending', 250000);
  CREATE TABLE marts.orders_history (
    order_id int, status text,
    valid_from timestamp, valid_to timestamp
  );
  INSERT INTO marts.orders_history VALUES
    (1001, 'pending', '2026-10-29 09:00', '2026-10-29 12:00'),
    (1001, 'paid', '2026-10-29 12:00', NULL),
    (1002, 'pending', '2026-10-29 15:00', '2026-10-30 08:00'),
    (1002, 'paid', '2026-10-30 08:00', NULL),
    (1003, 'pending', '2026-10-30 10:00', NULL),
    (1004, 'pending', '2026-10-30 11:00', NULL);
quiz:
  - q:
      vi: "Bản Standard, thời gian lưu mặc định. Một bảng bị xóa lúc 10:00 thứ Hai. `UNDROP TABLE` có cứu được lúc 09:00 thứ Ba không, và lúc 11:00 thứ Tư?"
      en: "Standard edition, default retention. A table is dropped at 10:00 on Monday. Can `UNDROP TABLE` save it at 09:00 on Tuesday, and at 11:00 on Wednesday?"
    options:
      - { vi: "Được cả hai, vì còn Fail-safe 7 ngày", en: "Both, because Fail-safe keeps it 7 days" }
      - { vi: "Thứ Ba được, thứ Tư không", en: "Tuesday yes, Wednesday no" }
      - { vi: "Không lần nào, UNDROP chỉ trong một giờ", en: "Neither, UNDROP works only within an hour" }
    answer: 1
    trap: 0
    why:
      vi: "Fail-safe 7 ngày nghe như còn cứu được, nhưng chỉ Snowflake khôi phục từ Fail-safe (phải mở yêu cầu với bộ phận hỗ trợ); bạn không `UNDROP` được từ đó. Thời gian lưu mặc định là 1 ngày (24 giờ): 10:00 thứ Hai tới 09:00 thứ Ba là 23 giờ, còn trong hạn; tới 11:00 thứ Tư là 49 giờ, đã quá. Không có giới hạn một giờ."
      en: "Fail-safe's 7 days sounds like a rescue, but only Snowflake recovers from Fail-safe (you open a case with Support); you cannot `UNDROP` from it. The default retention is 1 day (24 hours): 10:00 Monday to 09:00 Tuesday is 23 hours, still inside; to 11:00 Wednesday is 49 hours, past it. There is no one-hour limit."
  - q:
      vi: "Bạn clone một bảng 2 TB để thử một bản sửa, rồi bản sửa đổi khoảng 1% dữ liệu của clone. Clone tốn thêm bao nhiêu dung lượng?"
      en: "You clone a 2 TB table to test a fix, and the fix changes about 1% of the clone's data. How much extra storage does the clone use?"
    options:
      - { vi: "Cỡ 20 GB, chỉ phần đã đổi", en: "About 20 GB, only the changed part" }
      - { vi: "2 TB, vì clone là một bản sao", en: "2 TB, because a clone is a copy" }
      - { vi: "Không gì cả, mãi mãi", en: "Nothing at all, ever" }
    answer: 0
    trap: 1
    why:
      vi: "\"Bản sao\" nghe như chép cả 2 TB, nhưng clone của Snowflake dùng chung các micro-partition của bảng gốc nên lúc tạo không tốn thêm dung lượng. Mỗi thay đổi tạo micro-partition mới thuộc riêng clone: khoảng 1% × 2 TB = 20 GB (ước chừng, vì đổi theo cả micro-partition). \"Không gì cả\" chỉ đúng tới lần đổi đầu tiên."
      en: "\"A copy\" sounds like all 2 TB, but a Snowflake clone shares the original table's micro-partitions, so creating it uses no extra storage. Each change creates new micro-partitions owned by the clone: about 1% × 2 TB = 20 GB (roughly, since changes land in whole micro-partitions). \"Nothing at all\" is only true until the first change."
---
## Mở bài

Sáng nay một câu `DELETE` thiếu điều kiện đã xóa các đơn đang chờ trong bảng mart của Chợ Lồng Đèn. Trên Snowflake bạn đọc lại bảng như năm phút trước; bài này đọc cách đó trong tài liệu và làm việc tương tự trong Postgres.

## Ý chính

**Time travel** của Snowflake giữ các phiên bản cũ của dữ liệu trong một thời gian lưu. Bạn đọc bảng tại một thời điểm (`AT(TIMESTAMP => …)`), cách đây một số giây (`AT(OFFSET => -300)`), hay ngay trước một câu lệnh (`BEFORE(STATEMENT => '<id>')`), và cứu bảng đã xóa bằng `UNDROP TABLE`. Thời gian lưu mặc định là 1 ngày; trên Enterprise trở lên, bảng thường đặt được tới 90 ngày.

Hết thời gian lưu, dữ liệu sang **Fail-safe** 7 ngày, nhưng chỉ Snowflake khôi phục được từ đó, qua yêu cầu hỗ trợ. **Clone** tạo một bảng mới dùng chung dữ liệu của bảng gốc (zero-copy), nên tạo ngay và không tốn dung lượng cho tới khi một bên đổi; nó còn nhận `AT`/`BEFORE` để clone đúng trạng thái cũ.

Postgres không có time travel. Muốn đọc quá khứ thì phải tự giữ lịch sử (như snapshot ở bài trước), và muốn thử an toàn thì chép bảng ra trước bằng `CREATE TABLE … AS TABLE …`, một bản chép thật, có tốn chỗ. Hình cuối mục đi theo câu `DELETE` nhầm và lần đọc lại bảng năm phút trước.

## Cú pháp

```text
-- Snowflake (read only)
SELECT * FROM orders
  AT(OFFSET => -60*5);
SELECT * FROM orders
  BEFORE(STATEMENT => '<query id>');
UNDROP TABLE orders;
CREATE TABLE orders_test
  CLONE orders AT(OFFSET => -3600);
```

```sql
-- PostgreSQL: a real copy first
CREATE TABLE marts.orders_clone
  AS TABLE marts.orders;
```

- Thời gian lưu: 1 ngày mặc định, tới 90 ngày (Enterprise, bảng thường); sau đó Fail-safe 7 ngày chỉ Snowflake dùng.
- Clone của Snowflake không chép dữ liệu lúc tạo; bản chép của Postgres thì có.

## Ví dụ

Bản Postgres của "đọc tại thời điểm": trạng thái các đơn lúc 18:00 ngày 29/10, từ bảng lịch sử tự giữ.

```sql
SELECT order_id, status
FROM marts.orders_history
WHERE valid_from <= '2026-10-29 18:00'
  AND (valid_to > '2026-10-29 18:00'
    OR valid_to IS NULL)
ORDER BY order_id;
```

Chép bảng trước khi thử một thay đổi rủi ro:

```sql
CREATE TABLE marts.orders_clone
  AS TABLE marts.orders;
SELECT count(*) AS cloned
FROM marts.orders_clone;
```

## Lỗi hay gặp

Gõ cú pháp time travel vào Postgres: không có, nên câu lỗi cú pháp.

```sql
-- ERROR 42601: no time travel here
SELECT * FROM marts.orders
  AT (OFFSET => -300);
```

Sau một câu `DELETE` nhầm, tìm các đơn đã mất ngay trong bảng: chúng không còn đó.

```sql
-- WRONG: the table no longer has them
DELETE FROM marts.orders
WHERE status = 'pending';
SELECT count(*) AS restorable
FROM marts.orders
WHERE status = 'pending';
```

```sql
-- FIX: the copy made before
SELECT count(*) AS restorable
FROM marts.orders_clone
WHERE status = 'pending';
```

## Tóm tắt

- Time travel đọc bảng ở quá khứ bằng `AT` hay `BEFORE`; `UNDROP TABLE` cứu bảng đã xóa.
- Lưu 1 ngày mặc định, tới 90 ngày trên Enterprise; Fail-safe 7 ngày sau đó chỉ Snowflake khôi phục.
- Clone dùng chung dữ liệu, chỉ tốn chỗ cho phần đổi; dùng nó để thử thay đổi rủi ro.
- Postgres không có time travel: tự giữ lịch sử, và chép bảng trước khi thử.

# EN

## Opening

This morning a `DELETE` with a missing condition wiped the pending orders from a Lantern Market mart table. On Snowflake you read the table as it was five minutes ago; this lesson reads how in the docs and does the same kind of thing in Postgres.

## Key idea

Snowflake's **time travel** keeps old versions of data for a retention period. You read a table at a moment (`AT(TIMESTAMP => …)`), some seconds ago (`AT(OFFSET => -300)`), or just before a statement (`BEFORE(STATEMENT => '<id>')`), and you rescue a dropped table with `UNDROP TABLE`. The default retention is 1 day; on Enterprise and above, a permanent table can be set to up to 90 days.

After retention, data moves into **Fail-safe** for 7 days, but only Snowflake can recover from it, through a support case. A **clone** creates a new table sharing the original's data (zero-copy), so it is instant and uses no storage until one side changes; it also takes `AT`/`BEFORE` to clone an old state.

Postgres has no time travel. To read the past you keep history yourself (like the snapshot in an earlier lesson), and to experiment safely you copy the table first with `CREATE TABLE … AS TABLE …`, a real copy that takes space. The figure at the end of this section follows the mistaken `DELETE` and the read of the table five minutes earlier.

## Syntax

```text
-- Snowflake (read only)
SELECT * FROM orders
  AT(OFFSET => -60*5);
SELECT * FROM orders
  BEFORE(STATEMENT => '<query id>');
UNDROP TABLE orders;
CREATE TABLE orders_test
  CLONE orders AT(OFFSET => -3600);
```

```sql
-- PostgreSQL: a real copy first
CREATE TABLE marts.orders_clone
  AS TABLE marts.orders;
```

- Retention: 1 day by default, up to 90 days (Enterprise, permanent tables); then 7 days of Fail-safe that only Snowflake uses.
- A Snowflake clone copies no data when created; a Postgres copy does.

## Example

The Postgres form of "read at a moment": order statuses at 18:00 on 29 Oct, from a history table you keep.

```sql
SELECT order_id, status
FROM marts.orders_history
WHERE valid_from <= '2026-10-29 18:00'
  AND (valid_to > '2026-10-29 18:00'
    OR valid_to IS NULL)
ORDER BY order_id;
```

Copy the table before trying a risky change:

```sql
CREATE TABLE marts.orders_clone
  AS TABLE marts.orders;
SELECT count(*) AS cloned
FROM marts.orders_clone;
```

## Common mistakes

Typing time travel syntax into Postgres: it does not exist, so the query is a syntax error.

```sql
-- ERROR 42601: no time travel here
SELECT * FROM marts.orders
  AT (OFFSET => -300);
```

After a mistaken `DELETE`, looking for the lost orders in the table itself: they are not there.

```sql
-- WRONG: the table no longer has them
DELETE FROM marts.orders
WHERE status = 'pending';
SELECT count(*) AS restorable
FROM marts.orders
WHERE status = 'pending';
```

```sql
-- FIX: the copy made before
SELECT count(*) AS restorable
FROM marts.orders_clone
WHERE status = 'pending';
```

## Recap

- Time travel reads a table in the past with `AT` or `BEFORE`; `UNDROP TABLE` rescues a dropped table.
- Retention is 1 day by default, up to 90 days on Enterprise; the 7 days of Fail-safe after it are for Snowflake to recover.
- A clone shares data and only costs storage for what changes; use it to try risky changes.
- Postgres has no time travel: keep history yourself, and copy a table before experimenting.
