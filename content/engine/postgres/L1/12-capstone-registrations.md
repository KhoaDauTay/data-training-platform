---
id: e-pg-l1-12
engine: postgres
level: L1
module: capstone-l1
title: "Kiểm tra cấp L1: bảng đăng ký sự kiện"
title_en: "Level L1 check: the event sign-up table"
kind: capstone
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đưa một bảng đang chạy về trạng thái an toàn (ràng buộc, khóa ngoại) và nhanh (index) mà không làm mất dữ liệu.
    en: Bring a live table to a safe state (constraints, foreign key) and a fast one (index) without losing data.
  - vi: Thêm khóa duy nhất mà upsert cần, rồi ghi lại một lượt đăng ký bằng `ON CONFLICT ... DO UPDATE`.
    en: Add the unique key an upsert needs, then record a sign-up again with `ON CONFLICT ... DO UPDATE`.
  - vi: Viết câu đọc theo sự kiện mà vẫn đi qua index, không bọc cột trong phép ép kiểu.
    en: Write the per-event read so it still goes through an index, without wrapping the column in a cast.
requires: [e-pg-l1-11]
sources:
  - { url: https://www.postgresql.org/docs/18/ddl-constraints.html, title_vi: "Ràng buộc" }
  - { url: https://www.postgresql.org/docs/18/sql-createindex.html, title_vi: "CREATE INDEX" }
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
  - { url: https://www.postgresql.org/docs/18/tutorial-transactions.html, title_vi: "Hướng dẫn › transaction" }
  - { url: https://www.postgresql.org/docs/18/sql-insert.html, title_vi: "INSERT" }
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
    - task:
        vi: "Một người chỉ được đăng ký một sự kiện một lần. Thêm ràng buộc duy nhất tên `registrations_event_email_key` trên cặp `event_id, email`."
        en: "A person may sign up for an event only once. Add a unique constraint named `registrations_event_email_key` on the pair `event_id, email`."
      solution: ALTER TABLE registrations ADD CONSTRAINT registrations_event_email_key UNIQUE (event_id, email)
      check: catalog
      hint:
        vi: "`ALTER TABLE ... ADD CONSTRAINT name UNIQUE (event_id, email)`; dữ liệu hiện có không trùng nên câu chạy được."
        en: "`ALTER TABLE ... ADD CONSTRAINT name UNIQUE (event_id, email)`; the current data has no duplicates, so it succeeds."
    - task:
        vi: "Gửi lại biểu mẫu: `guest7@example.com` đổi thành 3 chỗ ở sự kiện 260, và `lan@example.com` đăng ký mới 2 chỗ ở sự kiện 42. Một câu: thêm nếu chưa có, có rồi thì sửa số chỗ. Trả về `event_id, email, seats`."
        en: "Forms sent again: `guest7@example.com` changes to 3 seats at event 260, and `lan@example.com` signs up for 2 seats at event 42. One statement: insert when missing, otherwise change the seats. Return `event_id, email, seats`."
      solution: INSERT INTO registrations (event_id, email, seats) VALUES (260, 'guest7@example.com', 3), (42, 'lan@example.com', 2) ON CONFLICT (event_id, email) DO UPDATE SET seats = EXCLUDED.seats RETURNING event_id, email, seats
      check: rows
      hint:
        vi: "`ON CONFLICT (event_id, email) DO UPDATE SET seats = EXCLUDED.seats`, dựa vào ràng buộc của bước trước."
        en: "`ON CONFLICT (event_id, email) DO UPDATE SET seats = EXCLUDED.seats`, relying on the previous step's constraint."
    - task:
        vi: "Trang của sự kiện 42 liệt kê `email, seats` của người đăng ký, xếp theo `email`. Câu phải đọc `registrations` qua một index."
        en: "The page of event 42 lists the sign-ups' `email, seats`, sorted by `email`. The query must read `registrations` through an index."
      solution: SELECT email, seats FROM registrations WHERE event_id = 42 ORDER BY email
      check: rows
      ordered: true
      perf: { table: registrations }
      slow: SELECT email, seats FROM registrations WHERE event_id::text = '42' ORDER BY email
      hint:
        vi: "So sánh cột `event_id` trực tiếp với số 42; ép kiểu cột (`event_id::text`) làm planner bỏ index."
        en: "Compare column `event_id` directly with the number 42; casting the column (`event_id::text`) makes the planner drop the index."
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
      vi: "Tạm bỏ ràng buộc nghe tiện vì file sẽ nạp không vấp lỗi, nhưng dòng sai sẽ lọt vào và việc thêm lại ràng buộc sẽ thất bại. 500 câu INSERT riêng lẻ thì mỗi câu tự commit, nên các dòng trước dòng sai đã được lưu: nhận một nửa. Một transaction là \"tất cả hoặc không gì\": một dòng vi phạm `CHECK` hay khóa ngoại làm cả transaction hỏng, và `ROLLBACK` bỏ mọi thứ đã ghi trong đó."
      en: "Dropping the constraints sounds handy because the file loads without errors, but the bad rows get in and adding the constraints back then fails. With 500 separate INSERTs each one commits on its own, so the rows before the bad one are already saved: half a load. A transaction is \"all or nothing\": one row breaking the `CHECK` or the foreign key breaks the whole transaction, and `ROLLBACK` discards everything written in it."
  - q:
      vi: "Sau khi có index, câu đếm tất cả lượt đăng ký có `seats >= 1` (mọi dòng) sẽ dùng kế hoạch nào?"
      en: "With the index in place, which plan will a count of all sign-ups with `seats >= 1` (every row) use?"
    options:
      - { vi: "Seq Scan, vì câu đọc gần như cả bảng", en: "Seq Scan, because the query reads nearly the whole table" }
      - { vi: "Index Scan dùng `registrations_event_idx`", en: "Index Scan using `registrations_event_idx`" }
      - { vi: "Index Scan dùng `registrations_pkey`, vì khóa chính có mặt ở mọi dòng", en: "Index Scan using `registrations_pkey`, because the primary key covers every row" }
    answer: 0
    why:
      vi: "Hai phương án index nghe hợp lý vì bảng vừa có index và câu đếm \"mọi dòng\" như thể chỉ cần một danh sách khóa. Nhưng index chỉ có lợi khi câu lấy một phần nhỏ của bảng, và ở đây điều kiện lại nằm trên `seats`, cột không có index. Đọc tuần tự cả bảng là rẻ nhất."
      en: "The two index options sound right because the table just got indexes and counting \"every row\" seems to need only a list of keys. But an index only pays off when a query reads a small part of the table, and here the filter is on `seats`, which has no index. Reading the whole table in order is cheapest."
  - q:
      vi: "Ban tổ chức muốn thêm index trên `seats` để báo cáo nhanh hơn. Câu duy nhất lọc theo `seats` là báo cáo đếm lượt có `seats >= 1` (tức mọi dòng); câu chạy nhiều nhất là trang của từng sự kiện. Có nên thêm không?"
      en: "The organisers want an index on `seats` to make the report faster. The only query that filters on `seats` is the report counting sign-ups with `seats >= 1` (that is, every row); the most frequent query is each event's page. Should you add it?"
    options:
      - { vi: "Có: mỗi cột hay lọc nên có index", en: "Yes: every column you filter on should have an index" }
      - { vi: "Không: báo cáo đọc mọi dòng nên planner vẫn chọn Seq Scan, và trang sự kiện đã có `registrations_event_idx`; index đó chỉ làm mỗi INSERT chậm thêm", en: "No: the report reads every row, so the planner still picks a Seq Scan, and the event page already has `registrations_event_idx`; that index would only slow down every INSERT" }
      - { vi: "Có, nhưng phải là index `UNIQUE`", en: "Yes, but it has to be a `UNIQUE` index" }
    answer: 1
    why:
      vi: "\"Có\" nghe hợp lý vì bước 4 vừa cho thấy index làm câu theo sự kiện đi nhanh. Nhưng ở đó mỗi sự kiện chỉ chiếm một phần nhỏ của 20.000 lượt; báo cáo thì cần cả 20.000 dòng, và đã thử trên lab: có index trên `seats`, câu đếm `seats >= 1` vẫn là Seq Scan. Index không được dùng vẫn phải cập nhật ở mỗi lần ghi. `UNIQUE` còn tệ hơn: nhiều lượt cùng số chỗ, nên index đó không tạo được."
      en: "\"Yes\" sounds right because step 4 just showed an index speeding up the per-event query. But there each event is a small part of the 20,000 sign-ups; the report needs all 20,000 rows, and on the lab data, with an index on `seats`, the `seats >= 1` count is still a Seq Scan. An index nobody uses still has to be updated on every write. `UNIQUE` is worse: many sign-ups share a seat count, so that index could not even be built."
  - q:
      vi: "Vì sao bước upsert phải đến sau bước thêm ràng buộc duy nhất?"
      en: "Why must the upsert step come after the unique constraint step?"
    options:
      - { vi: "`ON CONFLICT (event_id, email)` cần một ràng buộc hay index duy nhất trên đúng cặp cột đó; thiếu nó câu báo lỗi `42P10`", en: "`ON CONFLICT (event_id, email)` needs a unique constraint or index on exactly that pair; without it the statement fails with `42P10`" }
      - { vi: "Để upsert chạy nhanh hơn; về kết quả thì như nhau", en: "To make the upsert faster; the result is the same" }
      - { vi: "Không cần: index `registrations_event_idx` trên `event_id` là đủ", en: "It need not: index `registrations_event_idx` on `event_id` is enough" }
    answer: 0
    why:
      vi: "Đây không phải chuyện tốc độ: `ON CONFLICT (event_id, email)` chỉ nhận ra một dòng trùng nhờ một ràng buộc hay index duy nhất trên đúng cặp cột đó. Thiếu nó, Postgres không biết \"trùng\" là gì và báo lỗi `42P10`. Index thường trên `event_id` không cấm trùng gì, lại chỉ có một cột, nên không dùng được cho `ON CONFLICT`."
      en: "This is not about speed: `ON CONFLICT (event_id, email)` can only spot a duplicate through a unique constraint or index on exactly that pair. Without one, Postgres has no notion of \"duplicate\" and fails with `42P10`. The plain index on `event_id` forbids no duplicates and has only one column, so `ON CONFLICT` cannot use it."
---
## Mở bài

Bảng `registrations` đã chạy một thời gian mà không có luật nào ngoài khóa chính, người dùng gửi lại biểu mẫu thì sinh dòng trùng, và trang của mỗi sự kiện đang chậm. Việc của bạn: thêm luật để dữ liệu sai không lọt vào, cho phép gửi lại biểu mẫu mà không trùng, rồi làm trang sự kiện nhanh lên.

## Ý chính

Bài này gộp cả cấp L1: ràng buộc (`CHECK`, khóa ngoại, `UNIQUE`), index B-tree, đọc `EXPLAIN`, upsert bằng `ON CONFLICT`, và transaction ở câu hỏi kết luận.

Mỗi bước chạy trên bảng mà các bước trước đã sửa. Ràng buộc duy nhất ở bước 5 vừa chặn đăng ký trùng, vừa là thứ mà upsert ở bước 6 cần để biết thế nào là trùng. Bước 7 có thanh hiệu năng: câu trả đúng dòng mà không đi qua index vẫn chưa qua.

## Ví dụ

Một ràng buộc trên bảng `events`, không phải bảng của bài, rồi đọc lại nó trong catalog:

```sql
ALTER TABLE events ADD CONSTRAINT events_name_check CHECK (name <> '');
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conname = 'events_name_check';
```

## Lỗi hay gặp

Khi đã có ràng buộc, sự kiện không tên bị từ chối ngay lúc ghi:

```sql
-- ERROR 23514: new row for relation "events" violates check constraint "events_name_check"
INSERT INTO events VALUES (301, '', timestamptz '2027-01-01 09:00+07');
```

Đó là điều bạn muốn: lỗi `23514` đến sớm, lúc ghi, thay vì một dòng sai nằm im trong bảng.

## Thực hành

Bảy bước, mỗi bước một câu lệnh: thêm `CHECK` và khóa ngoại, tạo index cho trang sự kiện và kiểm tra kế hoạch, thêm khóa duy nhất cho cặp sự kiện và email, upsert hai biểu mẫu gửi lại, rồi viết câu đọc trang sự kiện qua index. Sau đó là bốn câu hỏi.

## Tóm tắt

- Ràng buộc `CHECK`, khóa ngoại và `UNIQUE` để database tự chặn dữ liệu sai lúc ghi.
- Index B-tree trên cột lọc làm trang của từng sự kiện nhanh; `EXPLAIN` cho biết kế hoạch có dùng nó.
- `ON CONFLICT ... DO UPDATE` cần một ràng buộc hay index duy nhất trên đúng các cột xung đột.
- So sánh cột trực tiếp với giá trị; ép kiểu cột làm planner bỏ index.

# EN

## Opening

Table `registrations` has been running for a while with no rules besides its primary key, forms sent twice create duplicate rows, and each event's page is slow. Your job: add rules so bad data can no longer get in, let a form be sent again without duplicates, then make the event page fast.

## Key idea

This lesson pulls level L1 together: constraints (`CHECK`, foreign key, `UNIQUE`), a B-tree index, reading `EXPLAIN`, upserts with `ON CONFLICT`, and transactions in the closing questions.

Each step runs on the table the earlier steps changed. The unique constraint of step 5 both blocks duplicate sign-ups and is what the upsert of step 6 needs to know what a duplicate is. Step 7 has a performance bar: a query that returns the right rows without going through an index does not pass yet.

## Example

A constraint on `events`, not the lesson's table, then read it back from the catalog:

```sql
ALTER TABLE events ADD CONSTRAINT events_name_check CHECK (name <> '');
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conname = 'events_name_check';
```

## Common mistakes

Once the constraint exists, an event with no name is rejected at write time:

```sql
-- ERROR 23514: new row for relation "events" violates check constraint "events_name_check"
INSERT INTO events VALUES (301, '', timestamptz '2027-01-01 09:00+07');
```

That is what you want: error `23514` comes early, at write time, instead of a bad row sitting quietly in the table.

## Practice

Seven steps, one statement each: add a `CHECK` and a foreign key, create an index for the event page and check its plan, add a unique key on the event and email pair, upsert two forms sent again, then write the event page read through an index. Then four questions.

## Recap

- `CHECK`, foreign key and `UNIQUE` constraints make the database itself block bad data at write time.
- A B-tree index on the filter column makes each event's page fast; `EXPLAIN` shows whether the plan uses it.
- `ON CONFLICT ... DO UPDATE` needs a unique constraint or index on exactly the conflict columns.
- Compare the column directly with the value; casting the column makes the planner drop the index.
