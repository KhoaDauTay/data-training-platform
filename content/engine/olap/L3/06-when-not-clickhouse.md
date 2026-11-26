---
id: e-ol-l3-06
engine: olap
level: L3
module: clickhouse
title: "Khi nào không dùng ClickHouse"
title_en: "When not to use ClickHouse"
kind: concept
runtime: docs
minutes: 20
figures: [{ name: ol-fit, at: idea }]
objectives:
  - vi: Nhận ra các việc ClickHouse làm kém theo chính tài liệu của nó - sửa từng dòng thường xuyên, chèn từng dòng, ràng buộc khóa ngoại.
    en: Recognise the jobs ClickHouse does poorly by its own docs - frequent single-row changes, row-by-row inserts, foreign key constraints.
  - vi: Giữ phần giao dịch ở PostgreSQL và chỉ đưa phần phân tích sang kho lưu theo cột.
    en: Keep the transactional part in PostgreSQL and move only the analytics to a column store.
requires: [e-ol-l3-02, e-ol-l3-03]
sources:
  - { url: "https://clickhouse.com/docs/best-practices/avoid-mutations", title: "ClickHouse docs: Avoid mutations" }
  - { url: "https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy", title: "ClickHouse docs: Selecting an insert strategy" }
  - { url: "https://clickhouse.com/docs/data-modeling/schema-design", title: "ClickHouse docs: Schema design" }
  - { url: "https://www.postgresql.org/docs/18/ddl-constraints.html", title: "PostgreSQL 18 docs: Constraints" }
demo_setup: |
  CREATE TABLE customers (
    id int PRIMARY KEY, name text
  );
  INSERT INTO customers VALUES
    (1, 'Lan Silk'), (2, 'Minh Tea');
  CREATE TABLE bookings (
    id int PRIMARY KEY,
    customer_id int
      REFERENCES customers (id),
    status text
  );
  INSERT INTO bookings
  SELECT i, 1 + i % 2, 'booked'
  FROM generate_series(1, 50) AS i;
quiz:
  - q:
      vi: "Ứng dụng đặt chỗ đổi trạng thái một booking mỗi khi khách bấm, hàng trăm lần mỗi phút. Đặt bảng này ở đâu?"
      en: "The booking app changes one booking's status every time a customer clicks, hundreds of times a minute. Where should this table live?"
    options:
      - { vi: "ClickHouse, vì nó nhanh", en: "ClickHouse, since it is fast" }
      - { vi: "PostgreSQL, chép ra để báo cáo", en: "PostgreSQL, copied out for reports" }
      - { vi: "Bảng ReplacingMergeTree", en: "A ReplacingMergeTree table" }
    answer: 1
    trap: 0
    why:
      vi: "ClickHouse nhanh cho câu gộp, không cho sửa từng dòng: tài liệu ghi một mutation viết lại toàn bộ part bị ảnh hưởng, nên sửa một dòng có thể thành ghi lại rất nhiều, và khuyên tránh mutation thường xuyên. ReplacingMergeTree dồn việc sửa vào lúc gộp, nhưng mỗi lần bấm vẫn là một lần chèn nhỏ. Việc giao dịch để ở PostgreSQL; báo cáo đọc bản chép."
      en: "ClickHouse is fast for aggregates, not for changing single rows: the docs say a mutation rewrites every affected part, so updating one row can mean rewriting a lot, and advise avoiding frequent mutations. ReplacingMergeTree moves the change to merge time, but each click is still one tiny insert. Keep the transactional work in PostgreSQL; reports read a copy."
  - q:
      vi: "Một `booking` trỏ tới khách không tồn tại. PostgreSQL từ chối nhờ khóa ngoại. ClickHouse làm gì?"
      en: "A `booking` points to a customer that does not exist. PostgreSQL refuses it thanks to the foreign key. What does ClickHouse do?"
    options:
      - { vi: "Từ chối, như PostgreSQL", en: "Refuses it, like PostgreSQL" }
      - { vi: "Nhận dòng: không có khóa ngoại", en: "Accepts it: it has no foreign keys" }
      - { vi: "Tự tạo khách mới", en: "Creates the customer itself" }
    answer: 1
    trap: 0
    why:
      vi: "Dễ nghĩ cơ sở dữ liệu nào cũng kiểm khóa ngoại, nhưng tài liệu thiết kế lược đồ của ClickHouse ghi nó không có khái niệm khóa ngoại: tính toàn vẹn tham chiếu là việc của ứng dụng. Dòng sai được nhận và nằm đó. Không cơ sở dữ liệu nào tự tạo khách mới."
      en: "It is easy to assume every database checks foreign keys, but ClickHouse's schema design docs say it has no notion of foreign keys: referential integrity is up to the application. The bad row is accepted and stays. No database creates the customer by itself."
---
## Mở bài

Sau vài bài về ClickHouse, Cargo Query muốn chuyển hết sang nó. Bài này đọc những gì chính tài liệu ClickHouse khuyên tránh, và chạy trên PostgreSQL các việc mà một kho giao dịch làm tốt hơn.

## Ý chính

**Sửa và xóa từng dòng.** Trong ClickHouse, `ALTER TABLE … UPDATE/DELETE` là **mutation**: một tiến trình nền viết lại toàn bộ part bị ảnh hưởng. Tài liệu ghi sửa một dòng cũng có thể gây ghi lại rất lớn, làm tăng vọt I/O, không hoàn tác được, và khuyên tránh mutation thường xuyên hoặc lớn.

**Chèn từng dòng.** Mỗi `INSERT` tạo một part; tài liệu khuyên lô ít nhất 1.000 dòng. Một ứng dụng ghi từng đơn một không hợp.

**Ràng buộc.** ClickHouse không có khái niệm khóa ngoại, và khóa chính không bắt buộc duy nhất. PostgreSQL kiểm cả hai ngay lúc ghi, trong một giao dịch.

Cách thường gặp: giữ phần giao dịch ở PostgreSQL, chép dữ liệu sang kho lưu theo cột cho báo cáo (xem bài `e-st-l3-01` về kho dữ liệu).

## Ví dụ

Đổi trạng thái một booking: một dòng, ngay lập tức, trong một giao dịch.

```sql
UPDATE bookings
SET status = 'cancelled'
WHERE id = 7
RETURNING id, status;
```

Mở một booking theo khóa: chỉ mục khóa chính, không quét bảng.

```sql
EXPLAIN (COSTS OFF)
SELECT status FROM bookings
WHERE id = 7;
```

## Lỗi hay gặp

Ghi một booking cho khách không tồn tại. PostgreSQL từ chối; ClickHouse sẽ nhận.

```sql
-- ERROR 23503: no such customer
INSERT INTO bookings
VALUES (51, 99, 'booked');
```

Ghi trùng mã booking. Khóa chính PostgreSQL là ràng buộc duy nhất; khóa chính ClickHouse thì không.

```sql
-- ERROR 23505: duplicate booking id
INSERT INTO bookings
VALUES (7, 1, 'booked');
```

## Tóm tắt

- Mutation của ClickHouse viết lại cả part: tránh sửa, xóa từng dòng thường xuyên.
- Chèn từng dòng tạo quá nhiều part: ClickHouse cần lô lớn.
- ClickHouse không có khóa ngoại và không ép khóa chính duy nhất.
- Giữ giao dịch ở PostgreSQL, đưa phân tích sang kho lưu theo cột.

# EN

## Opening

After a few lessons on ClickHouse, Cargo Query wants to move everything to it. This lesson reads what the ClickHouse docs themselves advise against, and runs on PostgreSQL the jobs a transactional database does better.

## Key idea

**Updating and deleting single rows.** In ClickHouse, `ALTER TABLE … UPDATE/DELETE` is a **mutation**: a background process rewrites every affected part. The docs say even updating one row can cause large rewrites, spike disk I/O, cannot be rolled back, and advise avoiding frequent or large mutations.

**Inserting row by row.** Every `INSERT` creates a part; the docs recommend batches of at least 1,000 rows. An app that writes one order at a time is a poor fit.

**Constraints.** ClickHouse has no notion of foreign keys, and its primary key does not have to be unique. PostgreSQL checks both at write time, inside a transaction.

The usual setup: keep the transactional part in PostgreSQL, copy data to a column store for reports (see lesson `e-st-l3-01` on warehouses).

## Example

Changing one booking's status: one row, at once, in a transaction.

```sql
UPDATE bookings
SET status = 'cancelled'
WHERE id = 7
RETURNING id, status;
```

Opening one booking by key: the primary key index, no table scan.

```sql
EXPLAIN (COSTS OFF)
SELECT status FROM bookings
WHERE id = 7;
```

## Common mistakes

Writing a booking for a customer that does not exist. PostgreSQL refuses; ClickHouse would accept it.

```sql
-- ERROR 23503: no such customer
INSERT INTO bookings
VALUES (51, 99, 'booked');
```

Writing a duplicate booking id. A PostgreSQL primary key is a unique constraint; a ClickHouse primary key is not.

```sql
-- ERROR 23505: duplicate booking id
INSERT INTO bookings
VALUES (7, 1, 'booked');
```

## Recap

- ClickHouse mutations rewrite whole parts: avoid frequent single-row updates and deletes.
- Row-by-row inserts create too many parts: ClickHouse needs large batches.
- ClickHouse has no foreign keys and does not enforce a unique primary key.
- Keep transactions in PostgreSQL, move analytics to a column store.
