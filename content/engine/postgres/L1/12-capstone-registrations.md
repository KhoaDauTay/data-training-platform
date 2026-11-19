---
id: e-pg-l1-12
engine: postgres
level: L1
module: capstone-l1
title: "Kiểm tra cấp L1: bảng đăng ký sự kiện"
title_en: "Level L1 check: the event sign-up table"
kind: capstone
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Đưa một bảng đang chạy về trạng thái an toàn (ràng buộc, khóa ngoại) và nhanh (index) mà không làm mất dữ liệu.
    en: Bring a live table to a safe state (constraints, foreign key) and a fast one (index) without losing data.
requires: [e-pg-l1-11]
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/tutorial-transactions.html
lab:
  setup: |
    CREATE TABLE events (id int PRIMARY KEY, name text NOT NULL, starts_at timestamptz NOT NULL);
    INSERT INTO events
    SELECT g, 'Event ' || g, timestamptz '2026-12-01 09:00+07' + g * interval '1 day'
    FROM generate_series(1, 300) AS g;
    CREATE TABLE registrations (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_id int NOT NULL,
      email text NOT NULL,
      seats int NOT NULL
    );
    INSERT INTO registrations (event_id, email, seats)
    SELECT 1 + (g * 37) % 300, 'guest' || g || '@example.com', 1 + g % 4
    FROM generate_series(1, 20000) AS g;
    ANALYZE registrations;
  steps:
    - task:
        vi: "Mỗi lượt đăng ký giữ từ 1 tới 4 chỗ. Thêm ràng buộc tên `registrations_seats_check` để database tự bảo đảm điều đó."
        en: "Each sign-up holds 1 to 4 seats. Add a constraint named `registrations_seats_check` so the database enforces it."
      solution: ALTER TABLE registrations ADD CONSTRAINT registrations_seats_check CHECK (seats BETWEEN 1 AND 4)
      check: catalog
      hint:
        vi: "Một `CHECK` với `BETWEEN 1 AND 4` trên cột `seats`."
        en: "A `CHECK` with `BETWEEN 1 AND 4` on column `seats`."
    - task:
        vi: "Mỗi lượt đăng ký phải thuộc một sự kiện có thật. Thêm khóa ngoại tên `registrations_event_fk` từ `event_id` tới `events (id)`."
        en: "Every sign-up must belong to a real event. Add a foreign key named `registrations_event_fk` from `event_id` to `events (id)`."
      solution: ALTER TABLE registrations ADD CONSTRAINT registrations_event_fk FOREIGN KEY (event_id) REFERENCES events (id)
      check: catalog
      hint:
        vi: "`ADD CONSTRAINT ... FOREIGN KEY (event_id) REFERENCES events (id)`."
        en: "`ADD CONSTRAINT ... FOREIGN KEY (event_id) REFERENCES events (id)`."
    - task:
        vi: "Trang của mỗi sự kiện liệt kê người đăng ký của nó. Tạo index tên `registrations_event_idx` phục vụ việc tìm theo sự kiện."
        en: "Each event's page lists its sign-ups. Create an index named `registrations_event_idx` that serves lookups by event."
      solution: CREATE INDEX registrations_event_idx ON registrations (event_id)
      target: SELECT count(*), sum(seats) FROM registrations WHERE event_id = 7
      check: catalog
      hint:
        vi: Index B-tree trên cột dùng để lọc.
        en: A B-tree index on the column you filter by.
    - task:
        vi: Đếm số lượt đăng ký và tổng số chỗ của sự kiện 7. Kế hoạch phải đi qua index vừa tạo.
        en: Count the sign-ups and total seats of event 7. The plan must use the new index.
      solution: SELECT count(*), sum(seats) FROM registrations WHERE event_id = 7
      check: plan
      hint:
        vi: "`count(*)` và `sum(seats)` với `WHERE event_id = 7`."
        en: "`count(*)` and `sum(seats)` with `WHERE event_id = 7`."
quiz:
  - q:
      vi: "Bạn cần nhập 500 lượt đăng ký từ một file, và hoặc nhận hết, hoặc không nhận lượt nào nếu có dòng sai. Làm thế nào?"
      en: "You must import 500 sign-ups from a file, and either accept all of them or none if any row is bad. How?"
    options:
      - { vi: "Chạy 500 câu INSERT riêng lẻ", en: "Run 500 separate INSERT statements" }
      - { vi: "Gói 500 câu INSERT trong một `BEGIN ... COMMIT`; lỗi thì `ROLLBACK`", en: "Wrap the 500 INSERTs in one `BEGIN ... COMMIT`; on error, `ROLLBACK`" }
      - { vi: "Tạm bỏ các ràng buộc rồi thêm lại sau", en: "Drop the constraints for a while and add them back later" }
    answer: 1
    why:
      vi: "Một transaction là \"tất cả hoặc không gì\": một dòng vi phạm `CHECK` hay khóa ngoại làm cả transaction hỏng, và `ROLLBACK` bỏ mọi thứ đã ghi trong đó."
      en: "A transaction is \"all or nothing\": one row breaking the `CHECK` or the foreign key breaks the whole transaction, and `ROLLBACK` discards everything written in it."
  - q:
      vi: "Sau khi có index, câu đếm tất cả lượt đăng ký có `seats >= 1` (mọi dòng) sẽ dùng kế hoạch nào?"
      en: "With the index in place, which plan will a count of all sign-ups with `seats >= 1` (every row) use?"
    options:
      - { vi: "Seq Scan, vì câu đọc gần như cả bảng", en: "Seq Scan, because the query reads nearly the whole table" }
      - { vi: "Index Scan dùng `registrations_event_idx`", en: "Index Scan using `registrations_event_idx`" }
    answer: 0
    why:
      vi: "Index chỉ có lợi khi câu lấy một phần nhỏ của bảng, và ở đây điều kiện lại nằm trên `seats`, cột không có index. Đọc tuần tự cả bảng là rẻ nhất."
      en: "An index only pays off when a query reads a small part of the table, and here the filter is on `seats`, which has no index. Reading the whole table in order is cheapest."
---
## Ý chính

Bảng `registrations` đã chạy một thời gian mà không có luật nào ngoài khóa chính, và trang của mỗi sự kiện đang chậm. Việc của bạn: thêm luật để dữ liệu sai không lọt vào nữa, rồi làm trang sự kiện nhanh lên.

Bài này gộp cả cấp L1: ràng buộc (`CHECK`, khóa ngoại), index B-tree, đọc `EXPLAIN`, và transaction ở câu hỏi kết luận.

## Ví dụ

```sql
-- ERROR: violates check constraint "registrations_seats_check"
ALTER TABLE registrations ADD CONSTRAINT registrations_seats_check CHECK (seats BETWEEN 1 AND 4);
INSERT INTO registrations (event_id, email, seats) VALUES (1, 'big@example.com', 9);
```

Khi đã có ràng buộc, lượt đăng ký 9 chỗ bị từ chối ngay lúc ghi.

## Thực hành

Bốn bước, mỗi bước một câu lệnh, rồi hai câu hỏi kết luận.

# EN

## Key idea

Table `registrations` has been running for a while with no rules besides its primary key, and each event's page is slow. Your job: add rules so bad data can no longer get in, then make the event page fast.

This lesson pulls level L1 together: constraints (`CHECK`, foreign key), a B-tree index, reading `EXPLAIN`, and transactions in the closing questions.

## Example

```sql
-- ERROR: violates check constraint "registrations_seats_check"
ALTER TABLE registrations ADD CONSTRAINT registrations_seats_check CHECK (seats BETWEEN 1 AND 4);
INSERT INTO registrations (event_id, email, seats) VALUES (1, 'big@example.com', 9);
```

Once the constraint exists, a 9-seat sign-up is rejected at write time.

## Practice

Four steps, one statement each, then two closing questions.
